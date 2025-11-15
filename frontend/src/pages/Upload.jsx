import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../utils/api";

function Upload() {
  const [courierDescription, setCourierDescription] = useState("");
  const [productImage, setProductImage] = useState(null);
  const [productName, setProductName] = useState("");
  const [productCategory, setProductCategory] = useState("");
  const [trackingNumber, setTrackingNumber] = useState("");
  const [pickupDate, setPickupDate] = useState("");
  const [sourceLocation, setSourceLocation] = useState("");
  const [destinationLocation, setDestinationLocation] = useState("");
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    if (!localStorage.getItem("token") || user.type !== "courier") {
      navigate("/");
    }
  }, [navigate]);

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
      if (trackingNumber) formData.append("tracking_number", trackingNumber);
      if (pickupDate) formData.append("pickup_date", pickupDate);
      if (sourceLocation) formData.append("source_location", sourceLocation);
      if (destinationLocation) formData.append("destination_location", destinationLocation);

      const response = await api.post("/couriers/upload", formData);

      setSuccess(productImage ? "Overgood uploaded successfully! AI description generated." : "Overgood uploaded successfully!");
      
      // Reset form
      setCourierDescription("");
      setProductName("");
      setProductCategory("");
      setTrackingNumber("");
      setPickupDate("");
      setSourceLocation("");
      setDestinationLocation("");
      setProductImage(null);
      setPreview(null);
      e.target.reset();
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
    <div style={{ minHeight: "100vh", background: "#0f0f0f" }}>
      <div style={{
        background: "rgba(26, 26, 46, 0.95)",
        backdropFilter: "blur(20px)",
        padding: "16px 32px",
        borderBottom: "1px solid rgba(255,255,255,0.1)",
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
            fontWeight: "bold"
          }}>
            U
          </div>
          <div>
            <h2 style={{ margin: 0, color: "#ffffff", fontSize: "18px", fontWeight: "600" }}>
              UPS Overgood Finder
            </h2>
            <p style={{ margin: 0, color: "#a0a0b0", fontSize: "12px" }}>
              Upload Found Items
            </p>
          </div>
        </div>
        <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
          <span style={{ color: "#a0a0b0", fontSize: "14px" }}>
            Welcome, {user.fullname}
          </span>
          <button
            onClick={() => navigate("/admin")}
            style={{
              padding: "8px 20px",
              background: "rgba(88, 101, 242, 0.2)",
              color: "#5865f2",
              border: "1px solid rgba(88, 101, 242, 0.3)",
              borderRadius: "10px",
              cursor: "pointer",
              fontWeight: "600",
              fontSize: "14px",
              transition: "all 0.2s"
            }}
          >
            Admin Panel
          </button>
          <button
            onClick={handleLogout}
            style={{
              padding: "8px 20px",
              background: "rgba(255, 255, 255, 0.05)",
              color: "#ffffff",
              border: "1px solid rgba(255, 255, 255, 0.1)",
              borderRadius: "10px",
              cursor: "pointer",
              fontWeight: "600",
              fontSize: "14px",
              transition: "all 0.2s"
            }}
          >
            Logout
          </button>
        </div>
      </div>

      <div className="upload-form">
        <h2>Upload Found Overgood (UPS Item)</h2>
        <form onSubmit={handleUpload}>
          <div className="form-group">
            <label>Tracking Number (if available)</label>
            <input
              type="text"
              placeholder="e.g., 1Z999AA10123456784"
              value={trackingNumber}
              onChange={(e) => setTrackingNumber(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label>Pickup/Ship Date</label>
            <input
              type="date"
              value={pickupDate}
              onChange={(e) => setPickupDate(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label>Source Location</label>
            <input
              type="text"
              placeholder="e.g., Los Angeles, CA"
              value={sourceLocation}
              onChange={(e) => setSourceLocation(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label>Destination Location</label>
            <input
              type="text"
              placeholder="e.g., Seattle, WA"
              value={destinationLocation}
              onChange={(e) => setDestinationLocation(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label>Item Name</label>
            <input
              type="text"
              placeholder="e.g., Black iPhone 13"
              value={productName}
              onChange={(e) => setProductName(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label>Item Category</label>
            <input
              type="text"
              placeholder="e.g., Electronics, Clothing, Accessories"
              value={productCategory}
              onChange={(e) => setProductCategory(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label>Your Description (Optional)</label>
            <textarea
              placeholder="Describe the item as you found it... (AI will analyze image if provided)"
              value={courierDescription}
              onChange={(e) => setCourierDescription(e.target.value)}
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
              <div className="upload-preview">
                <img src={preview} alt="Preview" />
              </div>
            )}
          </div>
          {error && <div className="error">{error}</div>}
          {success && <div className="success">{success}</div>}
          <button type="submit" className="btn" disabled={loading}>
            {loading ? "Uploading..." : "Upload Overgood"}
          </button>
        </form>
        <p style={{ 
          marginTop: "24px", 
          color: "#a0a0b0", 
          fontSize: "14px",
          lineHeight: "1.6",
          padding: "16px",
          background: "rgba(88, 101, 242, 0.1)",
          borderRadius: "12px",
          border: "1px solid rgba(88, 101, 242, 0.2)"
        }}>
          💡 <strong style={{ color: "#d1d1d6" }}>Quick Entry:</strong> You can now upload items with just the name and category! 
          Add descriptions and images later if available. AI will analyze images automatically when provided. 
          <strong style={{ display: "block", marginTop: "8px" }}>Tracking info helps customers find items faster.</strong>
        </p>
      </div>
    </div>
  );
}

export default Upload;
