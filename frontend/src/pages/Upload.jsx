import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../utils/api";

function Upload() {
  const [courierDescription, setCourierDescription] = useState("");
  const [productImage, setProductImage] = useState(null);
  const [productName, setProductName] = useState("");
  const [productCategory, setProductCategory] = useState("");
  const [dateFound, setDateFound] = useState("");
  const [locationFound, setLocationFound] = useState("");
  const [routeInfo, setRouteInfo] = useState("");
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [activeTab, setActiveTab] = useState("upload");
  const [myItems, setMyItems] = useState([]);
  const [loadingItems, setLoadingItems] = useState(false);
  const [expandedDescriptions, setExpandedDescriptions] = useState({});
  const navigate = useNavigate();

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    if (!localStorage.getItem("token") || user.type !== "courier") {
      navigate("/");
    } else {
      // Fetch items on mount to show count in tab badge
      fetchMyItems();
    }
  }, [navigate]);

  useEffect(() => {
    if (activeTab === "myitems") {
      // Refresh items when switching to My Items tab
      fetchMyItems();
    }
  }, [activeTab]);

  const fetchMyItems = async () => {
    setLoadingItems(true);
    try {
      const response = await api.get("/couriers/my-products");
      setMyItems(response.data);
    } catch (err) {
      console.error("Failed to fetch items:", err);
    } finally {
      setLoadingItems(false);
    }
  };

  const handleDeleteItem = async (itemId) => {
    if (!window.confirm("Are you sure you want to delete this item?")) {
      return;
    }

    try {
      await api.delete(`/couriers/products/${itemId}`);
      // Refresh items list
      fetchMyItems();
      setSuccess("Item deleted successfully!");
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError("Failed to delete item. Please try again.");
      setTimeout(() => setError(""), 3000);
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

  const handleUpload = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      const formData = new FormData();
      formData.append("courier_description_user", courierDescription || "");
      if (productImage) {
        formData.append("product_image", productImage);
      }
      formData.append("product_name", productName);
      formData.append("product_category", productCategory);
      // Couriers report when/where they found the item, not tracking info
      if (dateFound) formData.append("pickup_date", dateFound);  // backend still uses pickup_date field
      if (locationFound) formData.append("source_location", locationFound);  // backend uses source_location
      if (routeInfo) formData.append("destination_location", routeInfo);  // backend uses destination_location

      const response = await api.post("/couriers/upload", formData);

      setSuccess(productImage ? "Item uploaded successfully! AI description generated." : "Item uploaded successfully!");
      
      // Reset form
      setCourierDescription("");
      setProductName("");
      setProductCategory("");
      setDateFound("");
      setLocationFound("");
      setRouteInfo("");
      setProductImage(null);
      setPreview(null);
      e.target.reset();
      
      // Refresh items list to update count badge
      fetchMyItems();
    } catch (err) {
      setError(err.response?.data?.detail || "Upload failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/");
  };

  const user = JSON.parse(localStorage.getItem("user") || "{}");

  return (
    <div style={{ minHeight: "100vh", background: "#f5f7fa" }}>
      {/* Header */}
      <div style={{
        background: "#ffffff",
        padding: "16px 32px",
        borderBottom: "1px solid #e5e7eb",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
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
              Upload Found Items
            </p>
          </div>
        </div>
        <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            padding: "6px 12px",
            background: "#f9fafb",
            borderRadius: "8px",
            border: "1px solid #e5e7eb"
          }}>
            <div style={{
              width: "32px",
              height: "32px",
              borderRadius: "50%",
              background: "linear-gradient(135deg, #5865f2 0%, #7c3aed 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#ffffff",
              fontWeight: "700",
              fontSize: "14px"
            }}>
              {user.fullname?.charAt(0).toUpperCase() || "U"}
            </div>
            <span style={{ color: "#111827", fontSize: "14px", fontWeight: "500" }}>
              {user.fullname}
            </span>
          </div>
          <button
            onClick={handleLogout}
            style={{
              padding: "8px 16px",
              background: "#ffffff",
              color: "#374151",
              border: "1px solid #d1d5db",
              borderRadius: "6px",
              cursor: "pointer",
              fontWeight: "500",
              fontSize: "14px",
              transition: "all 0.2s"
            }}
            onMouseEnter={(e) => {
              e.target.style.background = "#f9fafb";
            }}
            onMouseLeave={(e) => {
              e.target.style.background = "#ffffff";
            }}
          >
            Logout
          </button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div style={{
        background: "#ffffff",
        borderBottom: "1px solid #e5e7eb"
      }}>
        <div style={{
          maxWidth: "900px",
          margin: "0 auto",
          padding: "0 24px",
          display: "flex",
          gap: "0"
        }}>
          <button
            onClick={() => setActiveTab("upload")}
            style={{
              padding: "16px 24px",
              background: "transparent",
              border: "none",
              borderBottom: activeTab === "upload" ? "2px solid #5865f2" : "2px solid transparent",
              color: activeTab === "upload" ? "#5865f2" : "#6b7280",
              fontWeight: "600",
              fontSize: "14px",
              cursor: "pointer",
              transition: "all 0.2s"
            }}
          >
            📝 Report an Item
          </button>
          <button
            onClick={() => setActiveTab("myitems")}
            style={{
              padding: "16px 24px",
              background: "transparent",
              border: "none",
              borderBottom: activeTab === "myitems" ? "2px solid #5865f2" : "2px solid transparent",
              color: activeTab === "myitems" ? "#5865f2" : "#6b7280",
              fontWeight: "600",
              fontSize: "14px",
              cursor: "pointer",
              transition: "all 0.2s",
              display: "flex",
              alignItems: "center",
              gap: "8px"
            }}
          >
            📋 Previously Reported Items
            {myItems.length > 0 && (
              <span style={{
                background: "#eef2ff",
                color: "#5865f2",
                padding: "2px 8px",
                borderRadius: "12px",
                fontSize: "12px",
                fontWeight: "700"
              }}>
                {myItems.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div style={{
        maxWidth: "900px",
        margin: "0 auto",
        padding: "32px 24px"
      }}>
        {activeTab === "upload" ? (
          <div style={{
            background: "#ffffff",
            borderRadius: "12px",
            padding: "32px",
            border: "1px solid #e5e7eb",
            boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)"
          }}>
            {/* Header */}
            <div style={{ marginBottom: "24px" }}>
              <h2 style={{ 
                margin: "0 0 8px 0", 
                color: "#111827", 
                fontSize: "20px", 
                fontWeight: "700" 
              }}>
                Upload Found Item
              </h2>
              <p style={{
                margin: 0,
                color: "#6b7280",
                fontSize: "14px",
                lineHeight: "1.5"
              }}>
                Add details about the found item to help customers locate their packages
              </p>
            </div>

            <form onSubmit={handleUpload}>
            {/* Tracking Number Field */}
            {/* When/Where Item Was Found */}
            <div style={{ marginBottom: "16px" }}>
              <label style={{
                display: "block",
                color: "#374151",
                fontSize: "14px",
                fontWeight: "500",
                marginBottom: "6px"
              }}>
                Date Found (Optional)
              </label>
              <input
                type="date"
                value={dateFound}
                onChange={(e) => setDateFound(e.target.value)}
                style={{
                  width: "100%",
                  padding: "10px 14px",
                  background: "#ffffff",
                  border: "1px solid #d1d5db",
                  borderRadius: "8px",
                  fontSize: "14px",
                  color: "#111827",
                  boxSizing: "border-box",
                  outline: "none",
                  transition: "all 0.2s"
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = "#5865f2";
                  e.target.style.boxShadow = "0 0 0 3px rgba(88, 101, 242, 0.1)";
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = "#d1d5db";
                  e.target.style.boxShadow = "none";
                }}
              />
            </div>

            <div style={{ marginBottom: "16px" }}>
              <label style={{
                display: "block",
                color: "#374151",
                fontSize: "14px",
                fontWeight: "500",
                marginBottom: "6px"
              }}>
                Location Found (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g., New York, NY or Warehouse B"
                value={locationFound}
                onChange={(e) => setLocationFound(e.target.value)}
                style={{
                  width: "100%",
                  padding: "10px 14px",
                  background: "#ffffff",
                  border: "1px solid #d1d5db",
                  borderRadius: "8px",
                  fontSize: "14px",
                  color: "#111827",
                  boxSizing: "border-box",
                  outline: "none",
                  transition: "all 0.2s"
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = "#5865f2";
                  e.target.style.boxShadow = "0 0 0 3px rgba(88, 101, 242, 0.1)";
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = "#d1d5db";
                  e.target.style.boxShadow = "none";
                }}
              />
            </div>

            <div style={{ marginBottom: "16px" }}>
              <label style={{
                display: "block",
                color: "#374151",
                fontSize: "14px",
                fontWeight: "500",
                marginBottom: "6px"
              }}>
                Route Information (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g., Route 66 or NY to LA"
                value={routeInfo}
                onChange={(e) => setRouteInfo(e.target.value)}
                style={{
                  width: "100%",
                  padding: "10px 14px",
                  background: "#ffffff",
                  border: "1px solid #d1d5db",
                  borderRadius: "8px",
                  fontSize: "14px",
                  color: "#111827",
                  boxSizing: "border-box",
                  outline: "none",
                  transition: "all 0.2s"
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = "#5865f2";
                  e.target.style.boxShadow = "0 0 0 3px rgba(88, 101, 242, 0.1)";
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = "#d1d5db";
                  e.target.style.boxShadow = "none";
                }}
              />
            </div>

            {/* Item Name and Category */}
            <div style={{ 
              display: "grid", 
              gridTemplateColumns: "repeat(2, 1fr)", 
              gap: "16px",
              marginBottom: "16px"
            }}>
              <div>
                <label style={{
                  display: "block",
                  color: "#374151",
                  fontSize: "14px",
                  fontWeight: "500",
                  marginBottom: "6px"
                }}>
                  Item Name *
                </label>
                <input
                  type="text"
                  placeholder="e.g., Black iPhone 13"
                  value={productName}
                  onChange={(e) => setProductName(e.target.value)}
                  required
                  style={{
                    width: "100%",
                    padding: "10px 14px",
                    background: "#ffffff",
                    border: "1px solid #d1d5db",
                    borderRadius: "8px",
                    fontSize: "14px",
                    color: "#111827",
                    boxSizing: "border-box",
                    outline: "none",
                    cursor: "text"
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = "#5865f2";
                    e.target.style.boxShadow = "0 0 0 3px rgba(88, 101, 242, 0.1)";
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = "#d1d5db";
                    e.target.style.boxShadow = "none";
                  }}
                />
              </div>

              <div>
                <label style={{
                  display: "block",
                  color: "#374151",
                  fontSize: "14px",
                  fontWeight: "500",
                  marginBottom: "6px"
                }}>
                  Item Category *
                </label>
                <input
                  type="text"
                  placeholder="e.g., Electronics, Clothing"
                  value={productCategory}
                  onChange={(e) => setProductCategory(e.target.value)}
                  required
                  style={{
                    width: "100%",
                    padding: "10px 14px",
                    background: "#ffffff",
                    border: "1px solid #d1d5db",
                    borderRadius: "8px",
                    fontSize: "14px",
                    color: "#111827",
                    boxSizing: "border-box",
                    outline: "none",
                    cursor: "text"
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = "#5865f2";
                    e.target.style.boxShadow = "0 0 0 3px rgba(88, 101, 242, 0.1)";
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = "#d1d5db";
                    e.target.style.boxShadow = "none";
                  }}
                />
              </div>
            </div>

            {/* Description */}
            <div style={{ marginBottom: "16px" }}>
              <label style={{
                display: "block",
                color: "#374151",
                fontSize: "14px",
                fontWeight: "500",
                marginBottom: "6px"
              }}>
                Your Description
              </label>
              <textarea
                placeholder="Describe the item... (AI will analyze image if provided)"
                value={courierDescription}
                onChange={(e) => setCourierDescription(e.target.value)}
                style={{
                  width: "100%",
                  padding: "10px 14px",
                  background: "#ffffff",
                  border: "1px solid #d1d5db",
                  borderRadius: "8px",
                  fontSize: "14px",
                  color: "#111827",
                  boxSizing: "border-box",
                  outline: "none",
                  minHeight: "100px",
                  resize: "vertical",
                  fontFamily: "inherit",
                  cursor: "text"
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = "#5865f2";
                  e.target.style.boxShadow = "0 0 0 3px rgba(88, 101, 242, 0.1)";
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = "#d1d5db";
                  e.target.style.boxShadow = "none";
                }}
              />
            </div>

            {/* Image Upload */}
            <div style={{ marginBottom: "20px" }}>
              <label style={{
                display: "block",
                color: "#374151",
                fontSize: "14px",
                fontWeight: "500",
                marginBottom: "6px"
              }}>
                Item Image
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                style={{
                  width: "100%",
                  padding: "10px 14px",
                  background: "#ffffff",
                  border: "1px solid #d1d5db",
                  borderRadius: "8px",
                  fontSize: "14px",
                  color: "#111827",
                  cursor: "pointer",
                  boxSizing: "border-box"
                }}
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
                      maxWidth: "300px",
                      maxHeight: "300px",
                      borderRadius: "8px",
                      border: "1px solid #e5e7eb"
                    }}
                  />
                </div>
              )}
            </div>

            {/* Error and Success Messages */}
            {error && (
              <div style={{
                padding: "12px 16px",
                background: "#fef2f2",
                borderRadius: "8px",
                border: "1px solid #fecaca",
                marginBottom: "16px"
              }}>
                <p style={{
                  color: "#dc2626",
                  fontSize: "14px",
                  margin: 0
                }}>
                  ⚠️ {error}
                </p>
              </div>
            )}

            {success && (
              <div style={{
                padding: "12px 16px",
                background: "#f0fdf4",
                borderRadius: "8px",
                border: "1px solid #bbf7d0",
                marginBottom: "16px"
              }}>
                <p style={{
                  color: "#16a34a",
                  fontSize: "14px",
                  margin: 0
                }}>
                  ✓ {success}
                </p>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              style={{
                width: "100%",
                padding: "12px",
                background: loading ? "#d1d5db" : "#5865f2",
                color: "white",
                border: "none",
                borderRadius: "8px",
                fontSize: "14px",
                fontWeight: "600",
                cursor: loading ? "not-allowed" : "pointer",
                transition: "all 0.2s"
              }}
              onMouseEnter={(e) => {
                if (!loading) {
                  e.target.style.background = "#4f5bd5";
                }
              }}
              onMouseLeave={(e) => {
                if (!loading) {
                  e.target.style.background = "#5865f2";
                }
              }}
            >
              {loading ? "Uploading..." : "Upload Found Item"}
            </button>
          </form>

        </div>
        ) : (
          // My Items Tab
          <div>
            {loadingItems ? (
              <div style={{
                background: "#ffffff",
                borderRadius: "12px",
                padding: "60px",
                border: "1px solid #e5e7eb",
                textAlign: "center"
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
                  Loading your items...
                </p>
              </div>
            ) : myItems.length === 0 ? (
              <div style={{
                background: "#ffffff",
                borderRadius: "12px",
                padding: "60px 20px",
                border: "2px dashed #d1d5db",
                textAlign: "center"
              }}>
                <div style={{ fontSize: "64px", marginBottom: "16px" }}>📦</div>
                <h3 style={{ color: "#111827", marginBottom: "8px", fontSize: "18px", fontWeight: "700" }}>
                  No Items Yet
                </h3>
                <p style={{ color: "#6b7280", fontSize: "14px", maxWidth: "400px", margin: "0 auto 20px" }}>
                  You haven't uploaded any found items yet. Click "Upload Item" tab to add your first item.
                </p>
              </div>
            ) : (
              <div style={{ display: "grid", gap: "16px" }}>
                {myItems.map((item) => (
                  <div
                    key={item.id}
                    style={{
                      background: "#ffffff",
                      border: "2px solid #e5e7eb",
                      borderRadius: "16px",
                      padding: "20px",
                      transition: "all 0.3s",
                      boxShadow: "0 2px 4px rgba(0, 0, 0, 0.05)"
                    }}
                  >
                    <div style={{ display: "flex", gap: "20px", alignItems: "start", position: "relative" }}>
                      {/* Delete Button - Top Left */}
                      <button
                        onClick={() => handleDeleteItem(item.id)}
                        style={{
                          position: "absolute",
                          top: "-8px",
                          left: "-8px",
                          width: "32px",
                          height: "32px",
                          borderRadius: "50%",
                          background: "#fef2f2",
                          color: "#dc2626",
                          border: "2px solid #fecaca",
                          cursor: "pointer",
                          fontSize: "16px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontWeight: "bold",
                          transition: "all 0.2s",
                          boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
                          zIndex: 10
                        }}
                        onMouseEnter={(e) => {
                          e.target.style.background = "#dc2626";
                          e.target.style.color = "#ffffff";
                          e.target.style.transform = "scale(1.1)";
                        }}
                        onMouseLeave={(e) => {
                          e.target.style.background = "#fef2f2";
                          e.target.style.color = "#dc2626";
                          e.target.style.transform = "scale(1)";
                        }}
                        title="Delete item"
                      >
                        ×
                      </button>

                      {item.product_image && item.product_image !== "no_image.jpg" ? (
                        <img
                          src={`http://localhost:8000/${item.product_image}`}
                          alt={item.product_name}
                          style={{
                            width: "140px",
                            height: "140px",
                            objectFit: "cover",
                            borderRadius: "12px",
                            flexShrink: 0,
                            border: "2px solid #e5e7eb",
                            boxShadow: "0 2px 4px rgba(0, 0, 0, 0.05)"
                          }}
                        />
                      ) : (
                        <div style={{
                          width: "140px",
                          height: "140px",
                          borderRadius: "12px",
                          flexShrink: 0,
                          border: "2px solid #e5e7eb",
                          background: "linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: "48px"
                        }}>
                          📦
                        </div>
                      )}
                      <div style={{ flex: 1 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: "12px" }}>
                          <h3 style={{ margin: 0, color: "#111827", fontSize: "18px", fontWeight: "700" }}>
                            {item.product_name}
                          </h3>
                          <span style={{
                            background: item.claimed === "claimed" ? "#10b981" : "#f59e0b",
                            color: "white",
                            padding: "6px 12px",
                            borderRadius: "8px",
                            fontWeight: "700",
                            fontSize: "12px",
                            flexShrink: 0,
                            marginLeft: "16px"
                          }}>
                            {item.claimed === "claimed" ? "✓ Claimed" : "📌 Unclaimed"}
                          </span>
                        </div>
                        <p style={{ margin: "4px 0", color: "#6b7280", fontSize: "13px" }}>
                          <span style={{ fontWeight: "500" }}>Category:</span>{" "}
                          <span style={{
                            background: "#eef2ff",
                            padding: "2px 8px",
                            borderRadius: "4px",
                            color: "#5865f2",
                            fontSize: "12px",
                            fontWeight: "500"
                          }}>
                            {item.product_category}
                          </span>
                        </p>
                        {item.tracking_number && (
                          <p style={{ margin: "4px 0", color: "#6b7280", fontSize: "13px" }}>
                            <span style={{ fontWeight: "500" }}>Tracking:</span> {item.tracking_number}
                          </p>
                        )}
                        {item.source_location && item.destination_location && (
                          <p style={{ margin: "4px 0", color: "#6b7280", fontSize: "13px" }}>
                            <span style={{ fontWeight: "500" }}>Route:</span> {item.source_location} → {item.destination_location}
                          </p>
                        )}
                        {item.courier_description_user && (
                          <p style={{ margin: "8px 0", color: "#374151", fontSize: "13px", lineHeight: "1.5" }}>
                            <span style={{ fontWeight: "600" }}>Your Description:</span> {item.courier_description_user}
                          </p>
                        )}
                        {item.courier_description_ai && (
                          <div style={{ marginTop: "10px", padding: "10px 12px", background: "#f0f9ff", borderRadius: "6px", borderLeft: "3px solid #3b82f6" }}>
                            <p style={{ margin: 0, color: "#1e40af", fontSize: "12px", lineHeight: "1.5" }}>
                              <span style={{ fontWeight: "600" }}>🤖 AI Description:</span>{" "}
                              {expandedDescriptions[item.id] 
                                ? item.courier_description_ai
                                : `${item.courier_description_ai.substring(0, 100)}${item.courier_description_ai.length > 100 ? '...' : ''}`
                              }
                            </p>
                            {item.courier_description_ai.length > 100 && (
                              <button
                                onClick={() => setExpandedDescriptions(prev => ({
                                  ...prev,
                                  [item.id]: !prev[item.id]
                                }))}
                                style={{
                                  marginTop: "6px",
                                  padding: "4px 8px",
                                  background: "transparent",
                                  color: "#2563eb",
                                  border: "1px solid #93c5fd",
                                  borderRadius: "4px",
                                  fontSize: "11px",
                                  fontWeight: "600",
                                  cursor: "pointer",
                                  transition: "all 0.2s"
                                }}
                                onMouseEnter={(e) => {
                                  e.target.style.background = "#dbeafe";
                                }}
                                onMouseLeave={(e) => {
                                  e.target.style.background = "transparent";
                                }}
                              >
                                {expandedDescriptions[item.id] ? "Show less ▲" : "Show more ▼"}
                              </button>
                            )}
                          </div>
                        )}
                        {item.claimed === "claimed" && item.claimed_by && (
                          <div style={{ marginTop: "10px", padding: "12px", background: "#f0fdf4", borderRadius: "8px", border: "1px solid #bbf7d0" }}>
                            <p style={{ margin: 0, color: "#15803d", fontSize: "13px", fontWeight: "600", marginBottom: "4px" }}>
                              ✓ Claimed by Customer
                            </p>
                            <p style={{ margin: 0, color: "#166534", fontSize: "12px" }}>
                              <strong>Name:</strong> {item.claimed_by.fullname}
                            </p>
                            <p style={{ margin: 0, color: "#166534", fontSize: "12px" }}>
                              <strong>Email:</strong> {item.claimed_by.email}
                            </p>
                            <p style={{ margin: 0, color: "#166534", fontSize: "11px", marginTop: "4px" }}>
                              Claimed on: {new Date(item.claimed_at).toLocaleString()}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

export default Upload;
