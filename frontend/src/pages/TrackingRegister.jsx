import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import api from "../utils/api";

function TrackingRegister() {
  const [trackingNumber, setTrackingNumber] = useState("");
  const [pickupDate, setPickupDate] = useState("");
  const [sourceLocation, setSourceLocation] = useState("");
  const [destinationLocation, setDestinationLocation] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [registeredTracking, setRegisteredTracking] = useState([]);
  const [loadingList, setLoadingList] = useState(false);
  const [activeTab, setActiveTab] = useState("register"); // "register" or "view"
  const [availableLocations, setAvailableLocations] = useState([]);
  const [availableDestinations, setAvailableDestinations] = useState([]);
  
  // Admin authentication
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [adminUsername, setAdminUsername] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  
  const navigate = useNavigate();

  // Fetch available locations from routes
  useEffect(() => {
    const fetchLocations = async () => {
      try {
        const response = await api.get("/tracking/locations/all");
        setAvailableLocations(response.data);
      } catch (err) {
        console.error("Failed to fetch locations:", err);
      }
    };
    fetchLocations();
  }, []);

  // Fetch valid destinations when source location changes
  useEffect(() => {
    const fetchDestinations = async () => {
      if (!sourceLocation) {
        setAvailableDestinations([]);
        setDestinationLocation(""); // Clear destination when source changes
        return;
      }

      try {
        const response = await api.get(`/tracking/locations/destinations/${encodeURIComponent(sourceLocation)}`);
        setAvailableDestinations(response.data);
        
        // Clear destination if it's no longer valid
        if (destinationLocation && !response.data.includes(destinationLocation)) {
          setDestinationLocation("");
        }
      } catch (err) {
        console.error("Failed to fetch destinations:", err);
        setAvailableDestinations([]);
      }
    };
    fetchDestinations();
  }, [sourceLocation]);

  // Fetch registered tracking numbers on load
  useEffect(() => {
    if (isAuthenticated) {
      fetchRegisteredTracking();
    }
  }, [isAuthenticated]);

  const handleAdminLogin = (e) => {
    e.preventDefault();
    setLoginError("");
    
    // Hardcoded credentials
    if (adminUsername === "admin" && adminPassword === "admin") {
      setIsAuthenticated(true);
      setAdminUsername("");
      setAdminPassword("");
    } else {
      setLoginError("Invalid username or password");
    }
  };

  const fetchRegisteredTracking = async () => {
    setLoadingList(true);
    try {
      const response = await api.get("/tracking/");
      setRegisteredTracking(response.data);
    } catch (err) {
      console.error("Failed to fetch tracking numbers:", err);
    } finally {
      setLoadingList(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      // Register tracking info
      await api.post("/tracking/register", {
        tracking_number: trackingNumber,
        pickup_date: pickupDate,
        source_location: sourceLocation,
        destination_location: destinationLocation,
      });

      setSuccess(`Tracking number ${trackingNumber} registered successfully!`);
      
      // Reset form
      setTrackingNumber("");
      setPickupDate("");
      setSourceLocation("");
      setDestinationLocation("");
      
      // Refresh the list
      fetchRegisteredTracking();
    } catch (err) {
      setError(err.response?.data?.detail || "Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (trackingNum) => {
    if (!window.confirm(`Delete tracking number ${trackingNum}?`)) return;

    try {
      await api.delete(`/tracking/${trackingNum}`);
      setSuccess(`Tracking number ${trackingNum} deleted successfully!`);
      fetchRegisteredTracking();
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to delete tracking number.");
    }
  };

  // Show login screen if not authenticated
  if (!isAuthenticated) {
    return (
      <div style={{ minHeight: "100vh", background: "#f5f7fa", display: "flex", flexDirection: "column" }}>
        {/* Simple Header */}
        <div style={{
          background: "#ffffff",
          padding: "16px 32px",
          borderBottom: "1px solid #e5e7eb",
          boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div style={{
              width: "36px",
              height: "36px",
              background: "#5865f2",
              borderRadius: "8px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#ffffff",
              fontSize: "18px",
              fontWeight: "700"
            }}>
              U
            </div>
            <div>
              <h2 style={{ margin: 0, color: "#111827", fontSize: "16px", fontWeight: "600" }}>
                UPS Overgood Finder
              </h2>
              <p style={{ margin: 0, color: "#6b7280", fontSize: "12px" }}>
                Admin Panel
              </p>
            </div>
          </div>
        </div>

        {/* Login Form */}
        <div style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "32px"
        }}>
          <div style={{
            maxWidth: "400px",
            width: "100%",
            background: "#ffffff",
            borderRadius: "12px",
            padding: "40px",
            border: "1px solid #e5e7eb",
            boxShadow: "0 4px 6px rgba(0, 0, 0, 0.07)"
          }}>
            <div style={{ textAlign: "center", marginBottom: "32px" }}>
              <div style={{
                width: "64px",
                height: "64px",
                background: "#eef2ff",
                borderRadius: "12px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "32px",
                margin: "0 auto 20px"
              }}>
                🔐
              </div>
              <h1 style={{
                color: "#111827",
                fontSize: "24px",
                fontWeight: "700",
                margin: "0 0 8px 0"
              }}>
                Admin Login
              </h1>
              <p style={{
                color: "#6b7280",
                fontSize: "14px",
                margin: 0
              }}>
                Please enter your credentials to continue
              </p>
            </div>

            <form onSubmit={handleAdminLogin}>
              <div style={{ marginBottom: "16px" }}>
                <label style={{
                  display: "block",
                  color: "#374151",
                  fontSize: "14px",
                  fontWeight: "500",
                  marginBottom: "8px"
                }}>
                  Username
                </label>
                <input
                  type="text"
                  placeholder="Enter username"
                  value={adminUsername}
                  onChange={(e) => {
                    setAdminUsername(e.target.value);
                    setLoginError("");
                  }}
                  required
                  style={{
                    width: "100%",
                    padding: "12px 16px",
                    background: "#ffffff",
                    border: loginError ? "1px solid #ef4444" : "1px solid #d1d5db",
                    borderRadius: "8px",
                    fontSize: "14px",
                    color: "#111827",
                    boxSizing: "border-box",
                    outline: "none"
                  }}
                  onFocus={(e) => {
                    if (!loginError) {
                      e.target.style.borderColor = "#5865f2";
                      e.target.style.boxShadow = "0 0 0 3px rgba(88, 101, 242, 0.1)";
                    }
                  }}
                  onBlur={(e) => {
                    if (!loginError) {
                      e.target.style.borderColor = "#d1d5db";
                      e.target.style.boxShadow = "none";
                    }
                  }}
                />
              </div>

              <div style={{ marginBottom: "20px" }}>
                <label style={{
                  display: "block",
                  color: "#374151",
                  fontSize: "14px",
                  fontWeight: "500",
                  marginBottom: "8px"
                }}>
                  Password
                </label>
                <input
                  type="password"
                  placeholder="Enter password"
                  value={adminPassword}
                  onChange={(e) => {
                    setAdminPassword(e.target.value);
                    setLoginError("");
                  }}
                  required
                  style={{
                    width: "100%",
                    padding: "12px 16px",
                    background: "#ffffff",
                    border: loginError ? "1px solid #ef4444" : "1px solid #d1d5db",
                    borderRadius: "8px",
                    fontSize: "14px",
                    color: "#111827",
                    boxSizing: "border-box",
                    outline: "none"
                  }}
                  onFocus={(e) => {
                    if (!loginError) {
                      e.target.style.borderColor = "#5865f2";
                      e.target.style.boxShadow = "0 0 0 3px rgba(88, 101, 242, 0.1)";
                    }
                  }}
                  onBlur={(e) => {
                    if (!loginError) {
                      e.target.style.borderColor = "#d1d5db";
                      e.target.style.boxShadow = "none";
                    }
                  }}
                />
              </div>

              {loginError && (
                <div style={{
                  display: "flex",
                  alignItems: "start",
                  gap: "8px",
                  marginBottom: "16px",
                  padding: "10px 12px",
                  background: "#fef2f2",
                  borderRadius: "6px",
                  border: "1px solid #fecaca"
                }}>
                  <span style={{ fontSize: "16px" }}>⚠️</span>
                  <p style={{
                    color: "#dc2626",
                    fontSize: "13px",
                    margin: 0,
                    lineHeight: "1.5"
                  }}>
                    {loginError}
                  </p>
                </div>
              )}

              <button
                type="submit"
                style={{
                  width: "100%",
                  padding: "12px",
                  background: "#5865f2",
                  color: "white",
                  border: "none",
                  borderRadius: "8px",
                  fontSize: "14px",
                  fontWeight: "600",
                  cursor: "pointer",
                  transition: "all 0.2s"
                }}
                onMouseEnter={(e) => {
                  e.target.style.background = "#4f5bd5";
                }}
                onMouseLeave={(e) => {
                  e.target.style.background = "#5865f2";
                }}
              >
                Login
              </button>
            </form>

            <div style={{ textAlign: "center", marginTop: "24px" }}>
              <Link to="/" style={{
                color: "#6b7280",
                fontSize: "13px",
                textDecoration: "none"
              }}>
                ← Back to Home
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "#f5f7fa" }}>
      {/* Header with Navigation */}
      <div style={{
        background: "#ffffff",
        borderBottom: "1px solid #e5e7eb",
        boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)"
      }}>
        <div style={{
          padding: "16px 32px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            <div style={{
              width: "40px",
              height: "40px",
              background: "linear-gradient(135deg, #5865f2 0%, #7c3aed 100%)",
              borderRadius: "12px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "20px",
              fontWeight: "bold",
              cursor: "pointer"
            }}
            onClick={() => navigate("/")}
            >
              U
            </div>
            <div>
              <h2 style={{ margin: 0, color: "#ffffff", fontSize: "18px", fontWeight: "600" }}>
                UPS Overgood Finder
              </h2>
              <p style={{ margin: 0, color: "#a0a0b0", fontSize: "12px" }}>
                Admin Panel
              </p>
            </div>
          </div>
          
          <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
            <Link to="/" style={{
              padding: "8px 20px",
              background: "rgba(255, 255, 255, 0.05)",
              color: "#ffffff",
              border: "1px solid rgba(255, 255, 255, 0.1)",
              borderRadius: "10px",
              fontWeight: "600",
              fontSize: "14px",
              textDecoration: "none",
              transition: "all 0.2s"
            }}>
              Login
            </Link>
          </div>
        </div>
        
        {/* Navigation Tabs */}
        <div style={{
          display: "flex",
          gap: "0",
          padding: "0 32px",
          borderTop: "1px solid rgba(255, 255, 255, 0.05)"
        }}>
          <div 
            onClick={() => setActiveTab("register")}
            style={{
              padding: "16px 24px",
              color: activeTab === "register" ? "#5865f2" : "#a0a0b0",
              fontWeight: "600",
              fontSize: "14px",
              borderBottom: activeTab === "register" ? "2px solid #5865f2" : "2px solid transparent",
              cursor: "pointer",
              transition: "all 0.2s"
            }}
          >
            📝 Register New
          </div>
          <div 
            onClick={() => setActiveTab("view")}
            style={{
              padding: "16px 24px",
              color: activeTab === "view" ? "#5865f2" : "#a0a0b0",
              fontWeight: "600",
              fontSize: "14px",
              borderBottom: activeTab === "view" ? "2px solid #5865f2" : "2px solid transparent",
              cursor: "pointer",
              transition: "all 0.2s",
              display: "flex",
              alignItems: "center",
              gap: "8px"
            }}
          >
            📋 View All 
            {registeredTracking.length > 0 && (
              <span style={{
                background: "rgba(88, 101, 242, 0.2)",
                color: "#5865f2",
                padding: "2px 8px",
                borderRadius: "12px",
                fontSize: "12px",
                fontWeight: "700"
              }}>
                {registeredTracking.length}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === "register" ? (
        // Register Form
        <div className="upload-form">
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: "12px",
          marginBottom: "16px"
        }}>
          <div style={{
            width: "48px",
            height: "48px",
            background: "rgba(88, 101, 242, 0.2)",
            borderRadius: "12px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "24px"
          }}>
            📦
          </div>
          <div>
            <h2 style={{ 
              margin: 0,
              color: "#111827",
              fontSize: "20px",
              fontWeight: "700"
            }}>
              Register New Order
            </h2>
            <p style={{ 
              color: "#6b7280", 
              margin: 0,
              fontSize: "14px"
            }}>
              Add tracking details to the system
            </p>
          </div>
        </div>
        <p style={{ 
          color: "#1e40af", 
          marginBottom: "32px",
          lineHeight: "1.6",
          fontSize: "14px",
          padding: "16px",
          background: "#f0f9ff",
          borderRadius: "12px",
          border: "1px solid #bfdbfe"
        }}>
          💡 <strong>Quick Tip:</strong> Register tracking numbers so customers can search using just their tracking number. Use the courier Upload page to add found item details separately.
        </p>
        <form onSubmit={handleRegister}>
          <div className="form-group">
            <label>Tracking Number *</label>
            <input
              type="text"
              placeholder="e.g., 1Z999AA10123456784"
              value={trackingNumber}
              onChange={(e) => setTrackingNumber(e.target.value)}
              required
            />
          </div>
          
          <div className="form-group">
            <label>Pickup/Ship Date *</label>
            <input
              type="date"
              value={pickupDate}
              onChange={(e) => setPickupDate(e.target.value)}
              required
            />
          </div>
          
          <div className="form-group">
            <label>Source Location *</label>
            <select
              value={sourceLocation}
              onChange={(e) => setSourceLocation(e.target.value)}
              required
              style={{
                width: "100%",
                padding: "12px 16px",
                background: "#ffffff",
                border: "1px solid #d1d5db",
                borderRadius: "8px",
                fontSize: "14px",
                color: "#111827",
                cursor: "pointer",
                outline: "none"
              }}
            >
              <option value="">Select source location...</option>
              {availableLocations.map((location) => (
                <option key={location} value={location}>
                  {location}
                </option>
              ))}
            </select>
          </div>
          
          <div className="form-group">
            <label>Destination Location *</label>
            <select
              value={destinationLocation}
              onChange={(e) => setDestinationLocation(e.target.value)}
              required
              disabled={!sourceLocation}
              style={{
                width: "100%",
                padding: "12px 16px",
                background: sourceLocation ? "#ffffff" : "#f9fafb",
                border: "1px solid #d1d5db",
                borderRadius: "8px",
                fontSize: "14px",
                color: sourceLocation ? "#111827" : "#9ca3af",
                cursor: sourceLocation ? "pointer" : "not-allowed",
                outline: "none"
              }}
            >
              <option value="">
                {!sourceLocation 
                  ? "Select source location first..." 
                  : availableDestinations.length === 0
                  ? "No destinations available"
                  : "Select destination location..."}
              </option>
              {availableDestinations.map((location) => (
                <option key={location} value={location}>
                  {location}
                </option>
              ))}
            </select>
            {sourceLocation && availableDestinations.length > 0 && (
              <div style={{
                marginTop: "6px",
                fontSize: "12px",
                color: "#6b7280",
                display: "flex",
                alignItems: "center",
                gap: "4px"
              }}>
                <span>✓</span>
                <span>{availableDestinations.length} destination{availableDestinations.length !== 1 ? 's' : ''} available from {sourceLocation}</span>
              </div>
            )}
          </div>
          
          {error && <div className="error">{error}</div>}
          {success && <div className="success">{success}</div>}
          
          <button type="submit" className="btn" disabled={loading}>
            {loading ? "Registering..." : "Register Tracking Number"}
          </button>
        </form>
        
        <div style={{ 
          marginTop: "32px",
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
          gap: "16px"
        }}>
          <div style={{
            padding: "16px",
            background: "#f0fdf4",
            borderRadius: "12px",
            border: "1px solid #bbf7d0"
          }}>
            <div style={{ fontSize: "24px", marginBottom: "8px" }}>✓</div>
            <div style={{ color: "#15803d", fontSize: "14px", fontWeight: "700", marginBottom: "4px" }}>
              Quick Registration
            </div>
            <div style={{ color: "#4b5563", fontSize: "13px", lineHeight: "1.5" }}>
              Add orders in seconds with automatic date and route validation
            </div>
          </div>
          
          <div style={{
            padding: "16px",
            background: "#eff6ff",
            borderRadius: "12px",
            border: "1px solid #bfdbfe"
          }}>
            <div style={{ fontSize: "24px", marginBottom: "8px" }}>🔍</div>
            <div style={{ color: "#1e40af", fontSize: "14px", fontWeight: "700", marginBottom: "4px" }}>
              Customer Search
            </div>
            <div style={{ color: "#4b5563", fontSize: "13px", lineHeight: "1.5" }}>
              Customers only need tracking # to search - no extra details required
            </div>
          </div>
          
          <div style={{
            padding: "16px",
            background: "#faf5ff",
            borderRadius: "12px",
            border: "1px solid #e9d5ff"
          }}>
            <div style={{ fontSize: "24px", marginBottom: "8px" }}>🎯</div>
            <div style={{ color: "#7c3aed", fontSize: "14px", fontWeight: "700", marginBottom: "4px" }}>
              Smart Filtering
            </div>
            <div style={{ color: "#4b5563", fontSize: "13px", lineHeight: "1.5" }}>
              AI automatically filters by route and date for accurate results
            </div>
          </div>
        </div>
      </div>
      ) : (
        // View List
        <div className="upload-form">
        <div style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "24px",
          padding: "20px",
          background: "linear-gradient(135deg, #5865f2 0%, #7c3aed 100%)",
          borderRadius: "12px",
          boxShadow: "0 4px 6px rgba(88, 101, 242, 0.2)"
        }}>
          <div>
            <h2 style={{ 
              margin: 0,
              color: "#ffffff",
              fontSize: "20px",
              fontWeight: "700"
            }}>
              📋 Registered Tracking Numbers
            </h2>
            <p style={{ 
              color: "rgba(255, 255, 255, 0.9)", 
              margin: "4px 0 0 0",
              fontSize: "14px"
            }}>
              {registeredTracking.length} tracking number{registeredTracking.length !== 1 ? 's' : ''} in system
            </p>
          </div>
          <button
            onClick={fetchRegisteredTracking}
            disabled={loadingList}
            style={{
              padding: "10px 20px",
              background: "rgba(255, 255, 255, 0.2)",
              color: "#ffffff",
              border: "2px solid rgba(255, 255, 255, 0.3)",
              borderRadius: "8px",
              cursor: loadingList ? "not-allowed" : "pointer",
              fontWeight: "600",
              fontSize: "14px",
              transition: "all 0.2s",
              backdropFilter: "blur(10px)"
            }}
            onMouseEnter={(e) => {
              if (!loadingList) {
                e.target.style.background = "rgba(255, 255, 255, 0.3)";
                e.target.style.borderColor = "rgba(255, 255, 255, 0.5)";
              }
            }}
            onMouseLeave={(e) => {
              e.target.style.background = "rgba(255, 255, 255, 0.2)";
              e.target.style.borderColor = "rgba(255, 255, 255, 0.3)";
            }}
          >
            {loadingList ? "Refreshing..." : "🔄 Refresh"}
          </button>
        </div>

        {loadingList ? (
          <div style={{ 
            textAlign: "center", 
            padding: "60px",
            background: "#ffffff",
            borderRadius: "12px",
            border: "2px solid #e5e7eb"
          }}>
            <div style={{
              width: "48px",
              height: "48px",
              border: "4px solid #e5e7eb",
              borderTop: "4px solid #5865f2",
              borderRadius: "50%",
              animation: "spin 1s linear infinite",
              margin: "0 auto 16px"
            }}></div>
            <p style={{ color: "#6b7280", fontSize: "15px", fontWeight: "500" }}>
              Loading tracking numbers...
            </p>
          </div>
        ) : registeredTracking.length === 0 ? (
          <div style={{
            textAlign: "center",
            padding: "60px 20px",
            background: "#ffffff",
            borderRadius: "12px",
            border: "2px dashed #d1d5db"
          }}>
            <div style={{ fontSize: "64px", marginBottom: "16px" }}>📦</div>
            <h3 style={{ 
              color: "#111827", 
              marginBottom: "8px",
              fontSize: "18px",
              fontWeight: "700"
            }}>
              No Tracking Numbers Yet
            </h3>
            <p style={{ 
              color: "#6b7280", 
              fontSize: "14px",
              maxWidth: "400px",
              margin: "0 auto"
            }}>
              Register your first tracking number using the "Register New" tab above
            </p>
          </div>
        ) : (
          <div style={{
            display: "grid",
            gap: "16px"
          }}>
            {registeredTracking.map((tracking) => (
              <div
                key={tracking.id}
                style={{
                  background: "#ffffff",
                  border: "2px solid #e5e7eb",
                  borderRadius: "12px",
                  padding: "24px",
                  transition: "all 0.3s",
                  boxShadow: "0 2px 4px rgba(0, 0, 0, 0.05)"
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "translateY(-2px)";
                  e.currentTarget.style.borderColor = "#5865f2";
                  e.currentTarget.style.boxShadow = "0 8px 16px rgba(88, 101, 242, 0.15)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.borderColor = "#e5e7eb";
                  e.currentTarget.style.boxShadow = "0 2px 4px rgba(0, 0, 0, 0.05)";
                }}
              >
                <div style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "start"
                }}>
                  <div style={{ flex: 1 }}>
                    <div style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "12px",
                      marginBottom: "16px",
                      paddingBottom: "12px",
                      borderBottom: "1px solid #e5e7eb"
                    }}>
                      <span style={{
                        padding: "8px 16px",
                        background: "linear-gradient(135deg, #5865f2 0%, #7c3aed 100%)",
                        color: "white",
                        borderRadius: "8px",
                        fontWeight: "700",
                        fontSize: "15px",
                        fontFamily: "monospace",
                        boxShadow: "0 2px 4px rgba(88, 101, 242, 0.3)"
                      }}>
                        {tracking.tracking_number}
                      </span>
                      <span style={{
                        color: "#6b7280",
                        fontSize: "13px",
                        background: "#f3f4f6",
                        padding: "4px 10px",
                        borderRadius: "6px"
                      }}>
                        📅 {new Date(tracking.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    
                    <div style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                      gap: "16px"
                    }}>
                      <div style={{
                        padding: "12px",
                        background: "#f0f9ff",
                        borderRadius: "8px",
                        border: "1px solid #bfdbfe"
                      }}>
                        <div style={{ 
                          color: "#1e40af", 
                          fontSize: "11px",
                          fontWeight: "700",
                          marginBottom: "6px",
                          textTransform: "uppercase",
                          letterSpacing: "0.5px"
                        }}>
                          📅 Pickup Date
                        </div>
                        <div style={{ 
                          color: "#111827", 
                          fontSize: "15px",
                          fontWeight: "600"
                        }}>
                          {new Date(tracking.pickup_date).toLocaleDateString('en-US', { 
                            month: 'short', 
                            day: 'numeric', 
                            year: 'numeric' 
                          })}
                        </div>
                      </div>
                      
                      <div style={{
                        padding: "12px",
                        background: "#f0fdf4",
                        borderRadius: "8px",
                        border: "1px solid #bbf7d0"
                      }}>
                        <div style={{ 
                          color: "#15803d", 
                          fontSize: "11px",
                          fontWeight: "700",
                          marginBottom: "6px",
                          textTransform: "uppercase",
                          letterSpacing: "0.5px"
                        }}>
                          📍 Route
                        </div>
                        <div style={{ 
                          color: "#111827", 
                          fontSize: "14px",
                          fontWeight: "500",
                          display: "flex",
                          alignItems: "center",
                          gap: "8px"
                        }}>
                          <span>{tracking.source_location}</span>
                          <span style={{ color: "#5865f2", fontWeight: "700" }}>→</span>
                          <span>{tracking.destination_location}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <button
                    onClick={() => handleDelete(tracking.tracking_number)}
                    style={{
                      padding: "10px 16px",
                      background: "#fef2f2",
                      color: "#dc2626",
                      border: "2px solid #fecaca",
                      borderRadius: "8px",
                      cursor: "pointer",
                      fontSize: "13px",
                      fontWeight: "600",
                      transition: "all 0.2s",
                      marginLeft: "16px",
                      display: "flex",
                      alignItems: "center",
                      gap: "6px"
                    }}
                    onMouseEnter={(e) => {
                      e.target.style.background = "#fee2e2";
                      e.target.style.borderColor = "#dc2626";
                      e.target.style.transform = "scale(1.05)";
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.background = "#fef2f2";
                      e.target.style.borderColor = "#fecaca";
                      e.target.style.transform = "scale(1)";
                    }}
                  >
                    🗑️ Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      )}
      
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

export default TrackingRegister;

