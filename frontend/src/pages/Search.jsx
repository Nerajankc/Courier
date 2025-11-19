import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../utils/api";

function Search() {
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [trackingNumber, setTrackingNumber] = useState("");
  const [matches, setMatches] = useState([]);
  const [chatStarted, setChatStarted] = useState(false);
  const [trackingError, setTrackingError] = useState("");
  const [uploadedImage, setUploadedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [itemClaimed, setItemClaimed] = useState(false);
  const [rejectedProductIds, setRejectedProductIds] = useState([]);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("user") || "{}");

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/");
  };

  const handleStartChat = async () => {
    setTrackingError("");
    setLoading(true);
    
    if (!trackingNumber.trim()) {
      setTrackingError("Please enter your tracking number to continue");
      setLoading(false);
      return;
    }
    
    // Validate tracking number exists in database
    try {
      const response = await api.get(`/tracking/${trackingNumber.trim()}`);
      
      // If we get here, tracking number exists
      setChatStarted(true);
      setMessages([
        {
          role: "assistant",
          content: `Great! I found your tracking number: ${trackingNumber}. Your package was shipped from ${response.data.source_location} to ${response.data.destination_location} on ${new Date(response.data.pickup_date).toLocaleDateString()}.\n\nNow, please describe what your package looks like or what's inside it. You can also upload an image to help us identify it better!`
        }
      ]);
    } catch (err) {
      if (err.response?.status === 404) {
        setTrackingError("This tracking number is not in our system. Please check and try again, or contact support.");
      } else {
        setTrackingError("Unable to validate tracking number. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleImageSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      setUploadedImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveImage = () => {
    setUploadedImage(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleClaim = async (productId) => {
    try {
      const response = await api.post(`/requests/claim/${productId}`);
      
      // Close the modal
      setMatches([]);
      
      // Mark item as claimed
      setItemClaimed(true);
      
      // Add success message to chat
      setMessages(prev => [
        ...prev,
        {
          role: "assistant",
          content: `🎉 Fantastic! We're glad you found your item!\n\nYour claim has been successfully submitted. Our admin team will contact you shortly at ${user.email} with instructions on how to retrieve your package.\n\nThank you for using UPS Overgood Finder!`
        }
      ]);
      
      // Clear input
      setInputMessage("");
    } catch (error) {
      console.error("Failed to claim item:", error);
      
      // Close modal on error too
      setMatches([]);
      
      setMessages(prev => [
        ...prev,
        {
          role: "assistant",
          content: `Sorry, there was an error processing your claim. ${error.response?.data?.detail || "Please try again or contact support."}`
        }
      ]);
    }
  };

  const handleNotMyItem = (productId) => {
    // Add to rejected list and remove from current matches
    setRejectedProductIds(prev => [...prev, productId]);
    setMatches(prev => prev.filter(match => match.product_id !== productId));
  };

  const handleNoneOfThese = () => {
    // Add all current matches to rejected list
    const currentMatchIds = matches.map(m => m.product_id);
    setRejectedProductIds(prev => [...prev, ...currentMatchIds]);
    
    // Clear all matches
    setMatches([]);
    setMessages(prev => [
      ...prev,
      {
        role: "assistant",
        content: "I understand none of these match your item. Please provide more details about what you're looking for, and I'll search again for you."
      }
    ]);
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if ((!inputMessage.trim() && !uploadedImage) || loading || itemClaimed) return;

    const userMessage = inputMessage.trim() || (uploadedImage ? "[Image uploaded]" : "");
    const hasImage = uploadedImage !== null;
    
    // Clear matches when user continues conversation
    if (matches.length > 0) {
      setMatches([]);
    }
    
    setInputMessage("");
    
    // Add user message to chat (with image preview if present)
    const messageContent = uploadedImage 
      ? `${userMessage}${userMessage ? "\n\n" : ""}[Image attached]`
      : userMessage;
    
    const currentImagePreview = imagePreview;
    
    setMessages(prev => [...prev, {
      role: "user",
      content: messageContent,
      imagePreview: currentImagePreview
    }]);
    
    // Clear image preview and uploaded image immediately after sending
    setImagePreview(null);
    setUploadedImage(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    setLoading(true);

    try {
      let response;
      
      if (hasImage) {
        // Use FormData for image upload
        const formData = new FormData();
        formData.append("message", userMessage);
        formData.append("tracking_number", trackingNumber || "");
        formData.append("conversation_history", JSON.stringify(messages));
        formData.append("rejected_product_ids", JSON.stringify(rejectedProductIds));
        formData.append("search_image", uploadedImage);
        
        response = await api.post("/requests/chat-with-image", formData, {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        });
      } else {
        // Use JSON for text-only
        response = await api.post("/requests/chat", {
          message: userMessage,
          conversation_history: messages,
          tracking_number: trackingNumber || null,
          pickup_date: null,
          source_location: null,
          destination_location: null,
          rejected_product_ids: rejectedProductIds,
        });
      }

      // Clear image after sending
      handleRemoveImage();

      // Add assistant response
      setMessages(prev => [...prev, { 
        role: "assistant", 
        content: response.data.message 
      }]);

      // If we have matches, display them
      if (response.data.has_results && response.data.matches) {
        setMatches(response.data.matches);
      } else {
        setMatches([]);
      }

    } catch (err) {
      // Clear image on error too
      handleRemoveImage();
      
      setMessages(prev => [...prev, { 
        role: "assistant", 
        content: "I apologize, but I'm having trouble processing your request. Please try again." 
      }]);
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Show welcome screen if chat hasn't started
  if (!chatStarted) {
    return (
      <div style={{ 
        minHeight: "100vh", 
        background: "#f5f7fa", 
        display: "flex", 
        flexDirection: "column"
      }}>
        {/* Navbar */}
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
                Find Your Missing Package
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

        {/* Welcome Screen */}
        <div style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "32px"
        }}>
          <div style={{
            maxWidth: "500px",
            width: "100%",
            background: "#ffffff",
            borderRadius: "12px",
            padding: "40px",
            border: "1px solid #e5e7eb",
            boxShadow: "0 4px 6px rgba(0, 0, 0, 0.07)"
          }}>
            {/* Icon and Title */}
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
                📦
              </div>
              <h1 style={{
                color: "#111827",
                fontSize: "24px",
                fontWeight: "700",
                margin: "0 0 8px 0"
              }}>
                Find Your Missing Package
              </h1>
              <p style={{
                color: "#6b7280",
                fontSize: "14px",
                lineHeight: "1.5",
                margin: 0
              }}>
                Enter your tracking number to search our database
              </p>
            </div>

            {/* Tracking Number Input */}
            <div style={{ marginBottom: "20px" }}>
              <label style={{
                display: "block",
                color: "#374151",
                fontSize: "14px",
                fontWeight: "500",
                marginBottom: "8px"
              }}>
                Tracking Number *
              </label>
              <input
                type="text"
                placeholder="Enter your tracking number (e.g., ABC123)"
                value={trackingNumber}
                onChange={(e) => {
                  setTrackingNumber(e.target.value);
                  setTrackingError("");
                }}
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && !loading) {
                    handleStartChat();
                  }
                }}
                disabled={loading}
                style={{
                  width: "100%",
                  padding: "12px 16px",
                  background: "#ffffff",
                  border: trackingError ? "1px solid #ef4444" : "1px solid #d1d5db",
                  borderRadius: "8px",
                  fontSize: "14px",
                  color: "#111827",
                  transition: "all 0.2s",
                  boxSizing: "border-box",
                  outline: "none"
                }}
                onFocus={(e) => {
                  if (!trackingError && !loading) {
                    e.target.style.borderColor = "#5865f2";
                    e.target.style.boxShadow = "0 0 0 3px rgba(88, 101, 242, 0.1)";
                  }
                }}
                onBlur={(e) => {
                  if (!trackingError) {
                    e.target.style.borderColor = "#d1d5db";
                    e.target.style.boxShadow = "none";
                  }
                }}
              />
              {trackingError && (
                <div style={{
                  display: "flex",
                  alignItems: "start",
                  gap: "8px",
                  marginTop: "8px",
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
                    {trackingError}
                  </p>
                </div>
              )}
            </div>

            {/* Start Button */}
            <button
              onClick={handleStartChat}
              disabled={loading || !trackingNumber.trim()}
              style={{
                width: "100%",
                padding: "12px",
                background: (loading || !trackingNumber.trim()) ? "#d1d5db" : "#5865f2",
                color: "white",
                border: "none",
                borderRadius: "8px",
                fontSize: "14px",
                fontWeight: "600",
                cursor: (loading || !trackingNumber.trim()) ? "not-allowed" : "pointer",
                transition: "all 0.2s"
              }}
              onMouseEnter={(e) => {
                if (!loading && trackingNumber.trim()) {
                  e.target.style.background = "#4f5bd5";
                }
              }}
              onMouseLeave={(e) => {
                if (!loading && trackingNumber.trim()) {
                  e.target.style.background = "#5865f2";
                }
              }}
            >
              {loading ? (
                <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
                  <span className="spinner"></span>
                  Validating...
                </span>
              ) : (
                "Start Search"
              )}
            </button>

            {/* Info Box */}
            <div style={{
              marginTop: "20px",
              padding: "12px 16px",
              background: "#f0f9ff",
              borderRadius: "8px",
              border: "1px solid #bfdbfe"
            }}>
              <p style={{
                color: "#1e40af",
                fontSize: "13px",
                lineHeight: "1.6",
                margin: 0
              }}>
                <strong style={{ fontWeight: "600" }}>💡 Tip:</strong> After entering your tracking number, you can describe your package or upload an image to help us find it.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Chat interface (existing code)
  return (
    <div style={{ 
      height: "100vh", 
      display: "flex", 
      flexDirection: "column", 
      background: "#f9fafb"
    }}>
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
              Find Your Missing Package
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

      {/* Chat Container */}
      <div style={{
        flex: 1,
        padding: "20px",
        display: "flex",
        justifyContent: "center",
        alignItems: "flex-start",
        overflow: "hidden"
      }}>
        <div style={{
          width: "100%",
          maxWidth: "900px",
          height: "100%",
          background: "#ffffff",
          borderRadius: "12px",
          border: "1px solid #e5e7eb",
          boxShadow: "0 2px 8px rgba(0, 0, 0, 0.08)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden"
        }}>
          {/* Chat Header */}
          <div style={{
            padding: "16px 20px",
            borderBottom: "1px solid #e5e7eb",
            background: "#fafbfc"
          }}>
            <h3 style={{
              margin: 0,
              fontSize: "15px",
              fontWeight: "600",
              color: "#374151",
              display: "flex",
              alignItems: "center",
              gap: "8px"
            }}>
              <span style={{
                width: "8px",
                height: "8px",
                borderRadius: "50%",
                background: "#10b981",
                display: "inline-block"
              }}></span>
              Conversation about Tracking ID - {trackingNumber}
            </h3>
          </div>

          {/* Chat Messages */}
          <div style={{
            flex: 1,
            overflowY: "auto",
            padding: "20px",
            display: "flex",
            flexDirection: "column",
            gap: "16px"
          }}>
        {messages.map((msg, index) => (
          <div
            key={index}
            style={{
              display: "flex",
              gap: "16px",
              animation: "fadeInUp 0.4s ease",
              alignItems: "flex-start"
            }}
          >
            {/* Avatar */}
            <div style={{
              width: "36px",
              height: "36px",
              borderRadius: "50%",
              background: msg.role === "user" 
                ? "#5865f2"
                : "#f3f4f6",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              fontSize: "16px",
              fontWeight: "600",
              color: msg.role === "user" ? "#ffffff" : "#6b7280",
              border: msg.role === "assistant" ? "1px solid #e5e7eb" : "none"
            }}>
              {msg.role === "user" ? user.fullname?.charAt(0).toUpperCase() : "U"}
            </div>
            
            {/* Message Content */}
            <div style={{
              flex: 1,
              background: msg.role === "user" ? "#ffffff" : "#f9fafb",
              padding: "14px 16px",
              borderRadius: "12px",
              border: "1px solid #e5e7eb"
            }}>
              <div style={{
                fontWeight: "600",
                marginBottom: "6px",
                color: msg.role === "user" ? "#5865f2" : "#6b7280",
                fontSize: "13px"
              }}>
                {msg.role === "user" ? "You" : "Assistant"}
              </div>
              <div style={{
                color: "#111827",
                lineHeight: "1.6",
                fontSize: "14px",
                whiteSpace: "pre-wrap",
                wordBreak: "break-word"
              }}>
                {msg.content}
              </div>
              {msg.imagePreview && (
                <div style={{ marginTop: "10px" }}>
                  <img
                    src={msg.imagePreview}
                    alt="Uploaded"
                    style={{
                      maxWidth: "250px",
                      maxHeight: "250px",
                      borderRadius: "8px",
                      border: "1px solid #d1d5db"
                    }}
                  />
                </div>
              )}
            </div>
          </div>
        ))}
        
        {loading && (
          <div style={{ display: "flex", gap: "16px", alignItems: "flex-start" }}>
            <div style={{
              width: "36px",
              height: "36px",
              borderRadius: "50%",
              background: "#f3f4f6",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              fontSize: "16px",
              fontWeight: "600",
              color: "#6b7280",
              border: "1px solid #e5e7eb"
            }}>
              U
            </div>
            <div style={{
              flex: 1,
              background: "#f9fafb",
              padding: "14px 16px",
              borderRadius: "12px",
              border: "1px solid #e5e7eb"
            }}>
              <div style={{
                fontWeight: "600",
                marginBottom: "8px",
                color: "#6b7280",
                fontSize: "13px"
              }}>
                Assistant
              </div>
              <div className="typing-indicator">
                <span></span>
                <span></span>
                <span></span>
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
          </div>
        </div>
      </div>

      {/* Matches Modal */}
      {matches.length > 0 && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: "rgba(0, 0, 0, 0.7)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 1000,
          padding: "20px",
          backdropFilter: "blur(4px)"
        }}>
          <div style={{
            background: "#ffffff",
            borderRadius: "16px",
            maxWidth: "1200px",
            width: "100%",
            maxHeight: "90vh",
            display: "flex",
            flexDirection: "column",
            boxShadow: "0 20px 60px rgba(0, 0, 0, 0.3)"
          }}>
            {/* Modal Header */}
            <div style={{
              background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
              padding: "24px 32px",
              borderTopLeftRadius: "16px",
              borderTopRightRadius: "16px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center"
            }}>
              <div>
                <h2 style={{
                  margin: 0,
                  color: "#ffffff",
                  fontSize: "24px",
                  fontWeight: "700",
                  marginBottom: "4px"
                }}>
                  🎯 Potential Matches Found
                </h2>
                <p style={{
                  margin: 0,
                  color: "#dcfce7",
                  fontSize: "14px"
                }}>
                  We found {matches.length} item{matches.length !== 1 ? 's' : ''} that might match your description
                </p>
              </div>
              <button
                onClick={handleNoneOfThese}
                style={{
                  padding: "12px 24px",
                  background: "#ffffff",
                  color: "#dc2626",
                  border: "2px solid #fecaca",
                  borderRadius: "10px",
                  fontSize: "15px",
                  fontWeight: "700",
                  cursor: "pointer",
                  transition: "all 0.2s",
                  boxShadow: "0 2px 8px rgba(220, 38, 38, 0.2)",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px"
                }}
                onMouseEnter={(e) => {
                  e.target.style.background = "#dc2626";
                  e.target.style.color = "#ffffff";
                  e.target.style.borderColor = "#dc2626";
                  e.target.style.transform = "translateY(-2px)";
                  e.target.style.boxShadow = "0 6px 16px rgba(220, 38, 38, 0.4)";
                }}
                onMouseLeave={(e) => {
                  e.target.style.background = "#ffffff";
                  e.target.style.color = "#dc2626";
                  e.target.style.borderColor = "#fecaca";
                  e.target.style.transform = "translateY(0)";
                  e.target.style.boxShadow = "0 2px 8px rgba(220, 38, 38, 0.2)";
                }}
              >
                <span style={{ fontSize: "18px" }}>✕</span>
                None of these - Keep searching
              </button>
            </div>

            {/* Modal Content - Scrollable */}
            <div style={{
              flex: 1,
              overflowY: "auto",
              padding: "32px"
            }}>
              <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(360px, 1fr))",
                gap: "24px"
              }}>
              {matches.map((match) => (
                <div
                  key={match.product_id}
                  style={{
                    background: "#ffffff",
                    border: "1px solid #e5e7eb",
                    borderRadius: "12px",
                    overflow: "hidden",
                    transition: "all 0.2s",
                    boxShadow: "0 2px 8px rgba(0, 0, 0, 0.06)",
                    display: "flex",
                    flexDirection: "column"
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.boxShadow = "0 8px 24px rgba(0, 0, 0, 0.12)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.boxShadow = "0 2px 8px rgba(0, 0, 0, 0.06)";
                  }}
                >
                  {/* Image Section */}
                  {match.product.product_image && match.product.product_image !== "no_image.jpg" ? (
                    <img
                      src={`http://localhost:8000/${match.product.product_image}`}
                      alt={match.product.product_name}
                      style={{
                        width: "100%",
                        height: "220px",
                        objectFit: "cover"
                      }}
                    />
                  ) : (
                    <div style={{
                      width: "100%",
                      height: "220px",
                      background: "linear-gradient(135deg, #e0e7ff 0%, #dbeafe 100%)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "64px"
                    }}>
                      📦
                    </div>
                  )}

                  {/* Content Section */}
                  <div style={{ padding: "24px" }}>
                  <div style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "start",
                    marginBottom: "12px"
                  }}>
                    <h4 style={{ 
                      margin: 0, 
                      color: "#111827", 
                      fontSize: "18px", 
                      fontWeight: "700",
                      lineHeight: "1.3"
                    }}>
                      {match.product.product_name}
                    </h4>
                    <span style={{
                      background: match.match_score >= 80
                        ? "linear-gradient(135deg, #10b981 0%, #059669 100%)"
                        : match.match_score >= 60
                        ? "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)"
                        : "linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)",
                      color: "white",
                      padding: "6px 12px",
                      borderRadius: "8px",
                      fontWeight: "700",
                      fontSize: "13px",
                      flexShrink: 0,
                      marginLeft: "16px",
                      boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)"
                    }}>
                      {match.match_score}%
                    </span>
                  </div>
                  <p style={{ 
                    margin: "4px 0", 
                    color: "#6b7280", 
                    fontSize: "13px",
                    display: "flex",
                    gap: "6px",
                    alignItems: "center"
                  }}>
                    <span style={{ fontWeight: "500" }}>Category:</span>
                    <span style={{
                      background: "#eef2ff",
                      padding: "2px 8px",
                      borderRadius: "4px",
                      color: "#5865f2",
                      fontSize: "12px",
                      fontWeight: "500"
                    }}>
                      {match.product.product_category}
                    </span>
                  </p>
                  {match.product.tracking_number && (
                    <p style={{ margin: "4px 0", color: "#6b7280", fontSize: "13px" }}>
                      <span style={{ fontWeight: "500" }}>Tracking:</span> {match.product.tracking_number}
                    </p>
                  )}
                  {match.product.source_location && match.product.destination_location && (
                    <p style={{ margin: "4px 0", color: "#6b7280", fontSize: "13px" }}>
                      <span style={{ fontWeight: "500" }}>Route:</span> {match.product.source_location} → {match.product.destination_location}
                    </p>
                  )}
                  {match.product.courier_description_user && (
                    <p style={{ 
                      margin: "8px 0", 
                      color: "#374151", 
                      fontSize: "13px",
                      lineHeight: "1.5"
                    }}>
                      {match.product.courier_description_user}
                    </p>
                  )}
                  <div style={{
                    marginTop: "12px",
                    padding: "12px 16px",
                    background: "linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)",
                    borderRadius: "10px",
                    borderLeft: "4px solid #3b82f6",
                    boxShadow: "0 1px 3px rgba(0, 0, 0, 0.05)"
                  }}>
                    <p style={{
                      margin: 0,
                      color: "#1e3a8a",
                      fontSize: "13px",
                      lineHeight: "1.6"
                    }}>
                      <span style={{ fontWeight: "700", display: "block", marginBottom: "4px" }}>
                        💡 Why this matches:
                      </span>
                      {match.reason}
                    </p>
                  </div>
                  
                  {/* Action Button */}
                  <div style={{ marginTop: "20px" }}>
                    {match.product.claimed === "unclaimed" ? (
                      <button
                        onClick={() => handleClaim(match.product_id)}
                        style={{
                          width: "100%",
                          padding: "16px",
                          background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                          color: "white",
                          border: "none",
                          borderRadius: "10px",
                          fontSize: "16px",
                          fontWeight: "700",
                          cursor: "pointer",
                          transition: "all 0.3s",
                          boxShadow: "0 4px 12px rgba(16, 185, 129, 0.3)"
                        }}
                        onMouseEnter={(e) => {
                          e.target.style.transform = "translateY(-2px)";
                          e.target.style.boxShadow = "0 8px 20px rgba(16, 185, 129, 0.4)";
                        }}
                        onMouseLeave={(e) => {
                          e.target.style.transform = "translateY(0)";
                          e.target.style.boxShadow = "0 4px 12px rgba(16, 185, 129, 0.3)";
                        }}
                      >
                        ✓ This is My Item - Claim It!
                      </button>
                    ) : (
                      <div style={{
                        width: "100%",
                        padding: "16px",
                        background: "#f3f4f6",
                        color: "#6b7280",
                        border: "2px solid #d1d5db",
                        borderRadius: "10px",
                        fontSize: "14px",
                        fontWeight: "600",
                        textAlign: "center"
                      }}>
                        ✓ Already Claimed
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Input Area */}
      <div style={{
        background: "#ffffff",
        borderTop: "1px solid #e5e7eb",
        padding: "16px 24px",
        boxShadow: "0 -2px 8px rgba(0, 0, 0, 0.05)",
        opacity: itemClaimed ? 0.6 : 1,
        pointerEvents: itemClaimed ? "none" : "auto"
      }}>
      {itemClaimed && (
        <div style={{
          maxWidth: "900px",
          margin: "0 auto 12px",
          padding: "12px 16px",
          background: "#f0fdf4",
          border: "1px solid #86efac",
          borderRadius: "8px",
          color: "#166534",
          fontSize: "14px",
          fontWeight: "600",
          textAlign: "center"
        }}>
          ✓ Claim submitted! Our team will contact you soon.
        </div>
      )}
      <form onSubmit={handleSendMessage} style={{
        maxWidth: "900px",
        margin: "0 auto",
        width: "100%"
      }}>
        {/* Image Preview */}
        {imagePreview && (
          <div style={{
            marginBottom: "12px",
            position: "relative",
            display: "inline-block"
          }}>
            <img
              src={imagePreview}
              alt="Preview"
              style={{
                maxWidth: "150px",
                maxHeight: "150px",
                borderRadius: "12px",
                border: "2px solid #5865f2",
                boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)"
              }}
            />
            <button
              type="button"
              onClick={handleRemoveImage}
              style={{
                position: "absolute",
                top: "-8px",
                right: "-8px",
                width: "28px",
                height: "28px",
                borderRadius: "50%",
                background: "#ef4444",
                color: "white",
                border: "2px solid #ffffff",
                cursor: "pointer",
                fontSize: "16px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: "bold",
                boxShadow: "0 2px 4px rgba(0, 0, 0, 0.2)"
              }}
            >
              ×
            </button>
          </div>
        )}
        
        <div style={{
          display: "flex",
          gap: "12px",
          alignItems: "center",
          background: "#f9fafb",
          borderRadius: "12px",
          padding: "8px 12px",
          border: "2px solid #e5e7eb",
          transition: "all 0.2s"
        }}>
          <input
            type="file"
            ref={fileInputRef}
            accept="image/*"
            onChange={handleImageSelect}
            style={{ display: "none" }}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={loading || itemClaimed}
            style={{
              padding: "8px 12px",
              background: (loading || itemClaimed) ? "#f9fafb" : "#f3f4f6",
              color: "#6b7280",
              border: "1px solid #d1d5db",
              borderRadius: "8px",
              cursor: (loading || itemClaimed) ? "not-allowed" : "pointer",
              fontSize: "18px",
              fontWeight: "600",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transition: "all 0.2s"
            }}
            onMouseEnter={(e) => {
              if (!loading && !itemClaimed) {
                e.target.style.background = "#e5e7eb";
                e.target.style.borderColor = "#5865f2";
                e.target.style.color = "#5865f2";
              }
            }}
            onMouseLeave={(e) => {
              if (!loading && !itemClaimed) {
                e.target.style.background = "#f3f4f6";
                e.target.style.borderColor = "#d1d5db";
                e.target.style.color = "#6b7280";
              }
            }}
            title="Upload an image of your item"
          >
            +
          </button>
          <input
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            placeholder={itemClaimed ? "Claim submitted successfully" : "Describe your lost item or upload an image..."}
            disabled={loading || itemClaimed}
            style={{
              flex: 1,
              padding: "12px 8px",
              background: "transparent",
              border: "none",
              fontSize: "14px",
              color: "#111827",
              outline: "none",
              cursor: itemClaimed ? "not-allowed" : "text"
            }}
          />
          <button
            type="submit"
            disabled={loading || (!inputMessage.trim() && !uploadedImage) || itemClaimed}
            style={{
              padding: "10px 20px",
              background: (loading || (!inputMessage.trim() && !uploadedImage) || itemClaimed)
                ? "#d1d5db" 
                : "#5865f2",
              color: "white",
              border: "none",
              borderRadius: "8px",
              fontSize: "14px",
              fontWeight: "600",
              cursor: (loading || (!inputMessage.trim() && !uploadedImage) || itemClaimed) ? "not-allowed" : "pointer",
              transition: "all 0.2s",
              display: "flex",
              alignItems: "center",
              gap: "8px"
            }}
            onMouseEnter={(e) => {
              if (!loading && (inputMessage.trim() || uploadedImage) && !itemClaimed) {
                e.target.style.background = "#4f5bd5";
              }
            }}
            onMouseLeave={(e) => {
              if (!loading && (inputMessage.trim() || uploadedImage) && !itemClaimed) {
                e.target.style.background = "#5865f2";
              }
            }}
          >
            {loading ? "Sending..." : "Send"}
            {!loading && <span>↑</span>}
          </button>
        </div>
      </form>
      </div>

      <style>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(40px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        @keyframes float {
          0%, 100% {
            transform: translate(0, 0) scale(1);
          }
          33% {
            transform: translate(30px, -30px) scale(1.1);
          }
          66% {
            transform: translate(-20px, 20px) scale(0.9);
          }
        }
        
        @keyframes pulse {
          0%, 100% {
            box-shadow: 0 10px 40px rgba(88, 101, 242, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.1) inset;
          }
          50% {
            box-shadow: 0 15px 60px rgba(88, 101, 242, 0.6), 0 0 0 1px rgba(255, 255, 255, 0.15) inset;
          }
        }
        
        @keyframes bounce {
          0%, 100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-5px);
          }
        }
        
        @keyframes shimmer {
          0% {
            transform: translateX(-100%);
          }
          100% {
            transform: translateX(100%);
          }
        }
        
        @keyframes shake {
          0%, 100% {
            transform: translateX(0);
          }
          25% {
            transform: translateX(-10px);
          }
          75% {
            transform: translateX(10px);
          }
        }
        
        .spinner {
          width: 16px;
          height: 16px;
          border: 2px solid rgba(255, 255, 255, 0.3);
          border-top-color: white;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }
        
        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }
        
        .typing-indicator {
          display: flex;
          gap: 4px;
          align-items: center;
        }
        
        .typing-indicator span {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background-color: #5865f2;
          animation: typing 1.4s infinite;
        }
        
        .typing-indicator span:nth-child(2) {
          animation-delay: 0.2s;
        }
        
        .typing-indicator span:nth-child(3) {
          animation-delay: 0.4s;
        }
        
        @keyframes typing {
          0%, 60%, 100% {
            opacity: 0.3;
            transform: translateY(0);
          }
          30% {
            opacity: 1;
            transform: translateY(-10px);
          }
        }
        
        /* Scrollbar styling */
        ::-webkit-scrollbar {
          width: 10px;
          height: 10px;
        }
        
        ::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.02);
        }
        
        ::-webkit-scrollbar-thumb {
          background: linear-gradient(135deg, rgba(88, 101, 242, 0.3), rgba(124, 58, 237, 0.3));
          border-radius: 5px;
          border: 2px solid rgba(26, 26, 46, 0.8);
        }
        
        ::-webkit-scrollbar-thumb:hover {
          background: linear-gradient(135deg, rgba(88, 101, 242, 0.5), rgba(124, 58, 237, 0.5));
        }
      `}</style>
    </div>
  );
}

export default Search;
