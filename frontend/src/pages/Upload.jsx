import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../utils/api";

function Upload() {
  const [courierDescription, setCourierDescription] = useState("");
  const [productImage, setProductImage] = useState(null);
  const [productName, setProductName] = useState("");
  const [productCategory, setProductCategory] = useState("");
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

    if (!productImage) {
      setError("Please select an image");
      setLoading(false);
      return;
    }

    try {
      const formData = new FormData();
      formData.append("courier_description_user", courierDescription);
      formData.append("product_image", productImage);
      formData.append("product_name", productName);
      formData.append("product_category", productCategory);

      const response = await api.post("/couriers/upload", formData);

      setSuccess("Product uploaded successfully! AI description generated.");
      
      // Reset form
      setCourierDescription("");
      setProductName("");
      setProductCategory("");
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
    <div className="container">
      <div className="navbar">
        <div className="navbar-content">
          <h2>Courier Finder - Upload Product</h2>
          <div className="navbar-actions">
            <span>Welcome, {user.fullname}</span>
            <button className="btn" onClick={handleLogout} style={{ width: "auto", padding: "8px 20px" }}>
              Logout
            </button>
          </div>
        </div>
      </div>

      <div className="upload-form">
        <h2>Upload Found Product</h2>
        <form onSubmit={handleUpload}>
          <div className="form-group">
            <label>Product Name</label>
            <input
              type="text"
              placeholder="e.g., Black iPhone 13"
              value={productName}
              onChange={(e) => setProductName(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label>Product Category</label>
            <input
              type="text"
              placeholder="e.g., Electronics, Clothing, Accessories"
              value={productCategory}
              onChange={(e) => setProductCategory(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label>Your Description</label>
            <textarea
              placeholder="Describe the product as you found it..."
              value={courierDescription}
              onChange={(e) => setCourierDescription(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label>Product Image</label>
            <input
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              required
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
            {loading ? "Uploading..." : "Upload Product"}
          </button>
        </form>
        <p style={{ marginTop: "20px", color: "#666", fontSize: "14px" }}>
          Note: The image will be analyzed using AI to generate a detailed description automatically.
        </p>
      </div>
    </div>
  );
}

export default Upload;
