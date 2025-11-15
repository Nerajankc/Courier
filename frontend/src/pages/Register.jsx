import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import api from "../utils/api";

function Register() {
  const [fullname, setFullname] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [type, setType] = useState("find");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleRegister = async (e) => {
    e.preventDefault();
    setError("");

    try {
      const response = await api.post("/users/register", {
        fullname,
        email,
        password,
        type,
      });
      
      // Auto login after registration
      const loginResponse = await api.post("/users/login", { email, password });
      const { access_token, user } = loginResponse.data;
      
      localStorage.setItem("token", access_token);
      localStorage.setItem("user", JSON.stringify(user));
      
      // Redirect based on user type
      if (user.type === "courier") {
        navigate("/upload");
      } else {
        navigate("/search");
      }
    } catch (err) {
      setError(err.response?.data?.detail || "Registration failed. Please try again.");
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h1>Create Account</h1>
        <p className="subtitle">Join UPS Overgood Finder to get started</p>
        <form onSubmit={handleRegister}>
          <div className="form-group">
            <label>Full Name</label>
            <input
              type="text"
              placeholder="Enter your full name"
              value={fullname}
              onChange={(e) => setFullname(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label>Email</label>
            <input
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label>Account Type</label>
            <select value={type} onChange={(e) => setType(e.target.value)}>
              <option value="find">Customer - Search for my lost item</option>
              <option value="courier">UPS Staff - Upload found items (overgoods)</option>
            </select>
          </div>
          {error && <div className="error">{error}</div>}
          <button type="submit" className="btn">Register</button>
        </form>
        <div className="link">
          Already have an account? <Link to="/">Login here</Link>
        </div>
        <div className="link" style={{ marginTop: "12px", paddingTop: "12px", borderTop: "1px solid rgba(255, 255, 255, 0.1)" }}>
          <Link to="/admin" style={{ color: "#a0a0b0", fontSize: "13px" }}>
            🔧 Admin Panel
          </Link>
        </div>
      </div>
    </div>
  );
}

export default Register;

