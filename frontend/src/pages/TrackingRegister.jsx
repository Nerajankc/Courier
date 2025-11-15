import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import api from "../utils/api";

function TrackingRegister() {
  const [trackingNumber, setTrackingNumber] = useState("");
  const [pickupDate, setPickupDate] = useState("");
  const [sourceLocation, setSourceLocation] = useState("");
  const [destinationLocation, setDestinationLocation] = useState("");
  const [productName, setProductName] = useState("");
  const [productCategory, setProductCategory] = useState("");
  const [itemDescription, setItemDescription] = useState("");
  const [productImage, setProductImage] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [registeredTracking, setRegisteredTracking] = useState([]);
  const [loadingList, setLoadingList] = useState(false);
  const [activeTab, setActiveTab] = useState("register"); // "register" or "view"
  const navigate = useNavigate();

  // Fetch registered tracking numbers on load
  useEffect(() => {
    fetchRegisteredTracking();
  }, []);

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

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setProductImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      // First register tracking info
      await api.post("/tracking/register", {
        tracking_number: trackingNumber,
        pickup_date: pickupDate,
        source_location: sourceLocation,
        destination_location: destinationLocation,
      });

      // If item details provided, also upload item
      if (productName && productCategory) {
        const formData = new FormData();
        formData.append("product_name", productName);
        formData.append("product_category", productCategory);
        formData.append("courier_description_user", itemDescription || "");
        formData.append("tracking_number", trackingNumber);
        formData.append("pickup_date", pickupDate);
        formData.append("source_location", sourceLocation);
        formData.append("destination_location", destinationLocation);
        if (productImage) {
          formData.append("product_image", productImage);
        }

        // Use public endpoint for admin uploads
        await api.post("/couriers/upload-public", formData);
        setSuccess(`Tracking number ${trackingNumber} registered and item uploaded successfully!`);
      } else {
        setSuccess(`Tracking number ${trackingNumber} registered successfully!`);
      }
      
      // Reset form
      setTrackingNumber("");
      setPickupDate("");
      setSourceLocation("");
      setDestinationLocation("");
      setProductName("");
      setProductCategory("");
      setItemDescription("");
      setProductImage(null);
      setPreview(null);
      
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

  return (
    <div style={{ minHeight: "100vh", background: "#0f0f0f" }}>
      {/* Header with Navigation */}
      <div style={{
        background: "rgba(26, 26, 46, 0.95)",
        backdropFilter: "blur(20px)",
        borderBottom: "1px solid rgba(255,255,255,0.1)",
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
            <h2 style={{ margin: 0 }}>Register New Order</h2>
            <p style={{ 
              color: "#a0a0b0", 
              margin: 0,
              fontSize: "14px"
            }}>
              Add tracking details to the system
            </p>
          </div>
        </div>
        <p style={{ 
          color: "#a0a0b0", 
          marginBottom: "32px",
          lineHeight: "1.6",
          fontSize: "14px",
          padding: "16px",
          background: "rgba(88, 101, 242, 0.1)",
          borderRadius: "12px",
          border: "1px solid rgba(88, 101, 242, 0.2)"
        }}>
          💡 Register tracking numbers so customers can search using just their tracking number.
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
            <input
              type="text"
              placeholder="e.g., Los Angeles, CA"
              value={sourceLocation}
              onChange={(e) => setSourceLocation(e.target.value)}
              required
            />
          </div>
          
          <div className="form-group">
            <label>Destination Location *</label>
            <input
              type="text"
              placeholder="e.g., Seattle, WA"
              value={destinationLocation}
              onChange={(e) => setDestinationLocation(e.target.value)}
              required
            />
          </div>

          {/* Item Details Section (Optional) */}
          <div style={{
            marginTop: "32px",
            paddingTop: "32px",
            borderTop: "2px solid rgba(255, 255, 255, 0.1)"
          }}>
            <h3 style={{
              color: "#ffffff",
              fontSize: "18px",
              marginBottom: "16px",
              display: "flex",
              alignItems: "center",
              gap: "8px"
            }}>
              📦 Found Item Details (Optional)
            </h3>
            <p style={{
              color: "#a0a0b0",
              fontSize: "13px",
              marginBottom: "24px",
              lineHeight: "1.6"
            }}>
              If you have the item, you can add details now. Otherwise, you can add them later from the Upload page.
            </p>

            <div className="form-group">
              <label>Item Name</label>
              <input
                type="text"
                placeholder="e.g., Black iPhone 13 (optional)"
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label>Item Category</label>
              <input
                type="text"
                placeholder="e.g., Electronics, Clothing (optional)"
                value={productCategory}
                onChange={(e) => setProductCategory(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label>Item Description (Optional)</label>
              <textarea
                placeholder="Describe the found item..."
                value={itemDescription}
                onChange={(e) => setItemDescription(e.target.value)}
                style={{ minHeight: "100px" }}
              />
            </div>

            <div className="form-group">
              <label>Item Image (Optional)</label>
              <input
                type="file"
                accept="image/*"
                onChange={handleImageChange}
              />
              {preview && (
                <div style={{
                  marginTop: "12px",
                  display: "flex",
                  justifyContent: "center"
                }}>
                  <img
                    src={preview}
                    alt="Preview"
                    style={{
                      maxWidth: "200px",
                      maxHeight: "200px",
                      borderRadius: "12px",
                      border: "2px solid rgba(255, 255, 255, 0.1)"
                    }}
                  />
                </div>
              )}
            </div>
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
            background: "rgba(34, 197, 94, 0.1)",
            borderRadius: "12px",
            border: "1px solid rgba(34, 197, 94, 0.2)"
          }}>
            <div style={{ fontSize: "20px", marginBottom: "8px" }}>✓</div>
            <div style={{ color: "#86efac", fontSize: "14px", fontWeight: "600", marginBottom: "4px" }}>
              Quick Registration
            </div>
            <div style={{ color: "#a0a0b0", fontSize: "13px", lineHeight: "1.5" }}>
              Add orders in seconds with automatic date and route validation
            </div>
          </div>
          
          <div style={{
            padding: "16px",
            background: "rgba(88, 101, 242, 0.1)",
            borderRadius: "12px",
            border: "1px solid rgba(88, 101, 242, 0.2)"
          }}>
            <div style={{ fontSize: "20px", marginBottom: "8px" }}>🔍</div>
            <div style={{ color: "#a5b4fc", fontSize: "14px", fontWeight: "600", marginBottom: "4px" }}>
              Customer Search
            </div>
            <div style={{ color: "#a0a0b0", fontSize: "13px", lineHeight: "1.5" }}>
              Customers only need tracking # to search - no extra details required
            </div>
          </div>
          
          <div style={{
            padding: "16px",
            background: "rgba(139, 92, 246, 0.1)",
            borderRadius: "12px",
            border: "1px solid rgba(139, 92, 246, 0.2)"
          }}>
            <div style={{ fontSize: "20px", marginBottom: "8px" }}>🎯</div>
            <div style={{ color: "#c4b5fd", fontSize: "14px", fontWeight: "600", marginBottom: "4px" }}>
              Smart Filtering
            </div>
            <div style={{ color: "#a0a0b0", fontSize: "13px", lineHeight: "1.5" }}>
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
          marginBottom: "24px"
        }}>
          <div>
            <h2 style={{ margin: 0 }}>Registered Tracking Numbers</h2>
            <p style={{ 
              color: "#a0a0b0", 
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
              padding: "8px 16px",
              background: "rgba(88, 101, 242, 0.2)",
              color: "#5865f2",
              border: "1px solid rgba(88, 101, 242, 0.3)",
              borderRadius: "8px",
              cursor: loadingList ? "not-allowed" : "pointer",
              fontWeight: "600",
              fontSize: "14px",
              transition: "all 0.2s"
            }}
          >
            {loadingList ? "Refreshing..." : "🔄 Refresh"}
          </button>
        </div>

        {loadingList ? (
          <div style={{ 
            textAlign: "center", 
            padding: "40px",
            color: "#a0a0b0"
          }}>
            Loading tracking numbers...
          </div>
        ) : registeredTracking.length === 0 ? (
          <div style={{
            textAlign: "center",
            padding: "60px 20px",
            background: "rgba(255, 255, 255, 0.02)",
            borderRadius: "12px",
            border: "2px dashed rgba(255, 255, 255, 0.1)"
          }}>
            <div style={{ fontSize: "48px", marginBottom: "16px" }}>📦</div>
            <h3 style={{ color: "#d1d1d6", marginBottom: "8px" }}>No Tracking Numbers Yet</h3>
            <p style={{ color: "#a0a0b0", fontSize: "14px" }}>
              Register your first tracking number using the form above
            </p>
          </div>
        ) : (
          <div style={{
            display: "grid",
            gap: "12px"
          }}>
            {registeredTracking.map((tracking) => (
              <div
                key={tracking.id}
                style={{
                  background: "rgba(255, 255, 255, 0.05)",
                  border: "1px solid rgba(255, 255, 255, 0.1)",
                  borderRadius: "12px",
                  padding: "20px",
                  transition: "all 0.2s"
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "rgba(255, 255, 255, 0.08)";
                  e.currentTarget.style.borderColor = "rgba(88, 101, 242, 0.3)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "rgba(255, 255, 255, 0.05)";
                  e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.1)";
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
                      marginBottom: "12px"
                    }}>
                      <span style={{
                        padding: "6px 12px",
                        background: "linear-gradient(135deg, #5865f2 0%, #7c3aed 100%)",
                        color: "white",
                        borderRadius: "8px",
                        fontWeight: "700",
                        fontSize: "14px",
                        fontFamily: "monospace"
                      }}>
                        {tracking.tracking_number}
                      </span>
                      <span style={{
                        color: "#a0a0b0",
                        fontSize: "12px"
                      }}>
                        Registered: {new Date(tracking.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    
                    <div style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                      gap: "12px",
                      marginBottom: "8px"
                    }}>
                      <div>
                        <div style={{ 
                          color: "#a0a0b0", 
                          fontSize: "12px",
                          fontWeight: "600",
                          marginBottom: "4px"
                        }}>
                          📅 PICKUP DATE
                        </div>
                        <div style={{ color: "#d1d1d6", fontSize: "14px" }}>
                          {new Date(tracking.pickup_date).toLocaleDateString()}
                        </div>
                      </div>
                      
                      <div>
                        <div style={{ 
                          color: "#a0a0b0", 
                          fontSize: "12px",
                          fontWeight: "600",
                          marginBottom: "4px"
                        }}>
                          📍 ROUTE
                        </div>
                        <div style={{ 
                          color: "#d1d1d6", 
                          fontSize: "14px",
                          display: "flex",
                          alignItems: "center",
                          gap: "8px"
                        }}>
                          <span>{tracking.source_location}</span>
                          <span style={{ color: "#5865f2" }}>→</span>
                          <span>{tracking.destination_location}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <button
                    onClick={() => handleDelete(tracking.tracking_number)}
                    style={{
                      padding: "8px 12px",
                      background: "rgba(239, 68, 68, 0.1)",
                      color: "#fca5a5",
                      border: "1px solid rgba(239, 68, 68, 0.3)",
                      borderRadius: "8px",
                      cursor: "pointer",
                      fontSize: "12px",
                      fontWeight: "600",
                      transition: "all 0.2s",
                      marginLeft: "16px"
                    }}
                    onMouseEnter={(e) => {
                      e.target.style.background = "rgba(239, 68, 68, 0.2)";
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.background = "rgba(239, 68, 68, 0.1)";
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
    </div>
  );
}

export default TrackingRegister;

