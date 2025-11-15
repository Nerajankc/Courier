import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login.jsx";
import Register from "./pages/Register.jsx";
import Upload from "./pages/Upload.jsx";
import Search from "./pages/Search.jsx";
import TrackingRegister from "./pages/TrackingRegister.jsx";

function ProtectedRoute({ children, userType }) {
  const token = localStorage.getItem("token");
  const user = JSON.parse(localStorage.getItem("user") || "{}");

  if (!token) {
    return <Navigate to="/" replace />;
  }

  if (userType && user.type !== userType) {
    return <Navigate to={user.type === "courier" ? "/upload" : "/search"} replace />;
  }

  return children;
}

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/admin" element={<TrackingRegister />} />
        <Route
          path="/upload"
          element={
            <ProtectedRoute userType="courier">
              <Upload />
            </ProtectedRoute>
          }
        />
        <Route
          path="/search"
          element={
            <ProtectedRoute userType="find">
              <Search />
            </ProtectedRoute>
          }
        />
      </Routes>
    </Router>
  );
}

export default App;
