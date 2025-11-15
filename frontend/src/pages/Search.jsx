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
  const messagesEndRef = useRef(null);
  const navigate = useNavigate();

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

  const handleStartChat = () => {
    setTrackingError("");
    
    if (!trackingNumber.trim()) {
      setTrackingError("Please enter your tracking number to continue");
      return;
    }
    
    if (trackingNumber.trim().length < 5) {
      setTrackingError("Tracking number must be at least 5 characters");
      return;
    }
    
    // Start the chat with a welcome message
    setChatStarted(true);
    setMessages([
      {
        role: "assistant",
        content: `Great! I have your tracking number: ${trackingNumber}. Now, please describe what your package looks like or what's inside it so I can search our found items database.`
      }
    ]);
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!inputMessage.trim() || loading) return;

    const userMessage = inputMessage.trim();
    setInputMessage("");
    
    // Add user message to chat
    setMessages(prev => [...prev, { role: "user", content: userMessage }]);
    setLoading(true);

    try {
      const response = await api.post("/requests/chat", {
        message: userMessage,
        conversation_history: messages,
        tracking_number: trackingNumber || null,
        pickup_date: null,
        source_location: null,
        destination_location: null,
      });

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
      setMessages(prev => [...prev, { 
        role: "assistant", 
        content: "I apologize, but I'm having trouble processing your request. Please try again." 
      }]);
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const user = JSON.parse(localStorage.getItem("user") || "{}");

  // Show welcome screen if chat hasn't started
  if (!chatStarted) {
    return (
      <div style={{ minHeight: "100vh", background: "#0f0f0f", display: "flex", flexDirection: "column" }}>
        {/* Navbar */}
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
                Find Your Missing Package
              </p>
            </div>
          </div>
          <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
            <span style={{ color: "#a0a0b0", fontSize: "14px" }}>
              {user.fullname}
            </span>
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

        {/* Welcome Screen */}
        <div style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "32px"
        }}>
          <div style={{
            maxWidth: "600px",
            width: "100%",
            background: "rgba(26, 26, 46, 0.6)",
            backdropFilter: "blur(20px)",
            borderRadius: "24px",
            padding: "48px",
            border: "1px solid rgba(255, 255, 255, 0.1)",
            boxShadow: "0 20px 60px rgba(0, 0, 0, 0.4)"
          }}>
            {/* Icon and Title */}
            <div style={{ textAlign: "center", marginBottom: "32px" }}>
              <div style={{
                width: "80px",
                height: "80px",
                background: "linear-gradient(135deg, #5865f2 0%, #7c3aed 100%)",
                borderRadius: "20px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "40px",
                margin: "0 auto 24px"
              }}>
                📦
              </div>
              <h1 style={{
                color: "#ffffff",
                fontSize: "32px",
                fontWeight: "700",
                margin: "0 0 12px 0"
              }}>
                Find Your Missing Package
              </h1>
              <p style={{
                color: "#a0a0b0",
                fontSize: "16px",
                lineHeight: "1.6",
                margin: 0
              }}>
                Enter your tracking number to search our database of found items
              </p>
            </div>

            {/* Tracking Number Input */}
            <div style={{ marginBottom: "24px" }}>
              <label style={{
                display: "block",
                color: "#d1d1d6",
                fontSize: "14px",
                fontWeight: "600",
                marginBottom: "8px"
              }}>
                Tracking Number *
              </label>
              <input
                type="text"
                placeholder="Enter your tracking number (e.g., ABC123, 1Z999AA10123456784)"
                value={trackingNumber}
                onChange={(e) => {
                  setTrackingNumber(e.target.value);
                  setTrackingError("");
                }}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    handleStartChat();
                  }
                }}
                style={{
                  width: "100%",
                  padding: "16px 20px",
                  background: "rgba(255, 255, 255, 0.05)",
                  border: trackingError ? "2px solid rgba(239, 68, 68, 0.5)" : "2px solid rgba(255, 255, 255, 0.1)",
                  borderRadius: "12px",
                  fontSize: "16px",
                  color: "#ffffff",
                  transition: "all 0.2s",
                  fontWeight: "500",
                  boxSizing: "border-box"
                }}
                onFocus={(e) => {
                  if (!trackingError) {
                    e.target.style.borderColor = "rgba(88, 101, 242, 0.5)";
                  }
                  e.target.style.background = "rgba(255, 255, 255, 0.08)";
                }}
                onBlur={(e) => {
                  if (!trackingError) {
                    e.target.style.borderColor = "rgba(255, 255, 255, 0.1)";
                  }
                  e.target.style.background = "rgba(255, 255, 255, 0.05)";
                }}
              />
              {trackingError && (
                <p style={{
                  color: "#fca5a5",
                  fontSize: "13px",
                  marginTop: "8px",
                  marginBottom: 0
                }}>
                  {trackingError}
                </p>
              )}
            </div>

            {/* Start Button */}
            <button
              onClick={handleStartChat}
              style={{
                width: "100%",
                padding: "16px",
                background: "linear-gradient(135deg, #5865f2 0%, #7c3aed 100%)",
                color: "white",
                border: "none",
                borderRadius: "12px",
                fontSize: "16px",
                fontWeight: "700",
                cursor: "pointer",
                transition: "all 0.2s",
                boxShadow: "0 4px 12px rgba(88, 101, 242, 0.4)"
              }}
              onMouseEnter={(e) => {
                e.target.style.transform = "translateY(-2px)";
                e.target.style.boxShadow = "0 6px 20px rgba(88, 101, 242, 0.5)";
              }}
              onMouseLeave={(e) => {
                e.target.style.transform = "translateY(0)";
                e.target.style.boxShadow = "0 4px 12px rgba(88, 101, 242, 0.4)";
              }}
            >
              Start Search
            </button>

            {/* Info Box */}
            <div style={{
              marginTop: "24px",
              padding: "16px",
              background: "rgba(88, 101, 242, 0.1)",
              borderRadius: "12px",
              border: "1px solid rgba(88, 101, 242, 0.2)"
            }}>
              <p style={{
                color: "#a0a0b0",
                fontSize: "13px",
                lineHeight: "1.6",
                margin: 0
              }}>
                💡 <strong style={{ color: "#d1d1d6" }}>Tip:</strong> After entering your tracking number, you'll be able to describe your package to help us find it in our database of found items.
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
      background: "#0f0f0f" 
    }}>
      {/* Header */}
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
              Find Your Missing Package
            </p>
          </div>
        </div>
        <div style={{ display: "flex", gap: "16px", alignItems: "center" }}>
          <div style={{ 
            display: "flex", 
            alignItems: "center", 
            gap: "8px",
            background: "rgba(34, 197, 94, 0.15)",
            padding: "8px 16px",
            borderRadius: "12px",
            border: "1px solid rgba(34, 197, 94, 0.3)"
          }}>
            <span style={{ fontSize: "16px" }}>✓</span>
            <span style={{ 
              color: "#86efac", 
              fontSize: "13px",
              fontWeight: "600"
            }}>
              Tracking #: <span style={{ color: "#d1d1d6", fontWeight: "700" }}>{trackingNumber}</span>
            </span>
          </div>
          <span style={{ color: "#a0a0b0", fontSize: "14px" }}>
            {user.fullname}
          </span>
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
            onMouseEnter={(e) => {
              e.target.style.background = "rgba(255, 255, 255, 0.1)";
            }}
            onMouseLeave={(e) => {
              e.target.style.background = "rgba(255, 255, 255, 0.05)";
            }}
          >
            Logout
          </button>
        </div>
      </div>

      {/* Chat Messages */}
      <div style={{
        flex: 1,
        overflowY: "auto",
        padding: "32px",
        display: "flex",
        flexDirection: "column",
        gap: "24px",
        maxWidth: "900px",
        margin: "0 auto",
        width: "100%"
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
                ? "linear-gradient(135deg, #5865f2 0%, #7c3aed 100%)"
                : "rgba(255, 255, 255, 0.1)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              fontSize: "16px",
              fontWeight: "600",
              color: "#ffffff",
              border: msg.role === "assistant" ? "2px solid rgba(255, 255, 255, 0.2)" : "none"
            }}>
              {msg.role === "user" ? user.fullname?.charAt(0).toUpperCase() : "U"}
            </div>
            
            {/* Message Content */}
            <div style={{
              flex: 1,
              color: "#ffffff",
              lineHeight: "1.7",
              fontSize: "15px",
              whiteSpace: "pre-wrap",
              wordBreak: "break-word"
            }}>
              <div style={{
                fontWeight: "600",
                marginBottom: "8px",
                color: msg.role === "user" ? "#ffffff" : "#a0a0b0",
                fontSize: "14px"
              }}>
                {msg.role === "user" ? "You" : "UPS Assistant"}
              </div>
              <div style={{
                color: "#ececec",
                opacity: 0.95
              }}>
                {msg.content}
              </div>
            </div>
          </div>
        ))}
        
        {loading && (
          <div style={{ display: "flex", gap: "16px", alignItems: "flex-start" }}>
            <div style={{
              width: "36px",
              height: "36px",
              borderRadius: "50%",
              background: "rgba(255, 255, 255, 0.1)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              fontSize: "16px",
              fontWeight: "600",
              color: "#ffffff",
              border: "2px solid rgba(255, 255, 255, 0.2)"
            }}>
              U
            </div>
            <div style={{
              flex: 1,
              padding: "12px 0"
            }}>
              <div style={{
                fontWeight: "600",
                marginBottom: "8px",
                color: "#a0a0b0",
                fontSize: "14px"
              }}>
                UPS Assistant
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

      {/* Matches Display */}
      {matches.length > 0 && (
        <div style={{
          background: "rgba(26, 26, 46, 0.95)",
          backdropFilter: "blur(20px)",
          borderTop: "2px solid rgba(88, 101, 242, 0.5)",
          padding: "24px 32px",
          maxHeight: "40vh",
          overflowY: "auto",
          boxShadow: "0 -10px 30px rgba(0, 0, 0, 0.3)"
        }}>
          <h3 style={{ 
            margin: "0 0 20px 0", 
            color: "#ffffff",
            fontSize: "18px",
            fontWeight: "600",
            display: "flex",
            alignItems: "center",
            gap: "10px"
          }}>
            <span style={{
              background: "linear-gradient(135deg, #5865f2 0%, #7c3aed 100%)",
              padding: "6px 12px",
              borderRadius: "8px",
              fontSize: "14px"
            }}>
              {matches.length}
            </span>
            Potential Match{matches.length !== 1 ? "es" : ""} Found
          </h3>
          <div style={{ display: "grid", gap: "16px" }}>
            {matches.map((match) => (
              <div
                key={match.product_id}
                style={{
                  background: "rgba(255, 255, 255, 0.05)",
                  border: "1px solid rgba(255, 255, 255, 0.1)",
                  borderRadius: "16px",
                  padding: "20px",
                  display: "flex",
                  gap: "20px",
                  alignItems: "start",
                  transition: "all 0.3s",
                  cursor: "pointer"
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "rgba(255, 255, 255, 0.08)";
                  e.currentTarget.style.borderColor = "rgba(88, 101, 242, 0.5)";
                  e.currentTarget.style.transform = "translateY(-2px)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "rgba(255, 255, 255, 0.05)";
                  e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.1)";
                  e.currentTarget.style.transform = "translateY(0)";
                }}
              >
                {match.product.product_image && match.product.product_image !== "no_image.jpg" ? (
                  <img
                    src={`http://localhost:8000/${match.product.product_image}`}
                    alt={match.product.product_name}
                    style={{
                      width: "140px",
                      height: "140px",
                      objectFit: "cover",
                      borderRadius: "12px",
                      flexShrink: 0,
                      border: "2px solid rgba(255, 255, 255, 0.1)"
                    }}
                  />
                ) : (
                  <div style={{
                    width: "140px",
                    height: "140px",
                    borderRadius: "12px",
                    flexShrink: 0,
                    border: "2px solid rgba(255, 255, 255, 0.1)",
                    background: "rgba(255, 255, 255, 0.05)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "48px"
                  }}>
                    📦
                  </div>
                )}
                <div style={{ flex: 1 }}>
                  <div style={{ 
                    display: "flex", 
                    justifyContent: "space-between", 
                    alignItems: "start", 
                    marginBottom: "12px" 
                  }}>
                    <h4 style={{ margin: 0, color: "#ffffff", fontSize: "18px", fontWeight: "600" }}>
                      {match.product.product_name}
                    </h4>
                    <span style={{
                      background: match.match_score >= 80 
                        ? "linear-gradient(135deg, #10b981 0%, #059669 100%)"
                        : match.match_score >= 60 
                        ? "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)"
                        : "linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)",
                      color: "white",
                      padding: "6px 14px",
                      borderRadius: "20px",
                      fontWeight: "700",
                      fontSize: "13px",
                      boxShadow: "0 2px 8px rgba(0, 0, 0, 0.2)"
                    }}>
                      {match.match_score}% Match
                    </span>
                  </div>
                  <p style={{ 
                    margin: "6px 0", 
                    color: "#a0a0b0", 
                    fontSize: "13px",
                    display: "flex",
                    gap: "8px",
                    alignItems: "center"
                  }}>
                    <span style={{ fontWeight: "600" }}>Category:</span>
                    <span style={{
                      background: "rgba(88, 101, 242, 0.2)",
                      padding: "2px 10px",
                      borderRadius: "6px",
                      color: "#a5b4fc"
                    }}>
                      {match.product.product_category}
                    </span>
                  </p>
                  {match.product.tracking_number && (
                    <p style={{ margin: "6px 0", color: "#a0a0b0", fontSize: "13px" }}>
                      <span style={{ fontWeight: "600" }}>Tracking:</span> {match.product.tracking_number}
                    </p>
                  )}
                  {match.product.source_location && match.product.destination_location && (
                    <p style={{ margin: "6px 0", color: "#a0a0b0", fontSize: "13px" }}>
                      <span style={{ fontWeight: "600" }}>Route:</span> {match.product.source_location} → {match.product.destination_location}
                    </p>
                  )}
                  {match.product.courier_description_user && (
                    <p style={{ 
                      margin: "12px 0", 
                      color: "#d1d1d6", 
                      fontSize: "14px",
                      lineHeight: "1.6"
                    }}>
                      {match.product.courier_description_user}
                    </p>
                  )}
                  <div style={{
                    marginTop: "12px",
                    padding: "12px 16px",
                    background: "rgba(88, 101, 242, 0.1)",
                    borderRadius: "10px",
                    borderLeft: "3px solid #5865f2"
                  }}>
                    <p style={{ 
                      margin: 0, 
                      color: "#d1d1d6", 
                      fontSize: "13px",
                      lineHeight: "1.6"
                    }}>
                      <span style={{ fontWeight: "600", color: "#a5b4fc" }}>Why this matches:</span> {match.reason}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Input Area */}
      <form onSubmit={handleSendMessage} style={{
        background: "rgba(26, 26, 46, 0.95)",
        backdropFilter: "blur(20px)",
        padding: "20px 32px",
        borderTop: "1px solid rgba(255, 255, 255, 0.1)",
        maxWidth: "900px",
        margin: "0 auto",
        width: "100%"
      }}>
        <div style={{
          display: "flex",
          gap: "12px",
          alignItems: "center",
          background: "rgba(255, 255, 255, 0.05)",
          borderRadius: "16px",
          padding: "8px 8px 8px 20px",
          border: "1px solid rgba(255, 255, 255, 0.1)",
          transition: "all 0.3s"
        }}>
          <input
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            placeholder="Describe your lost item or provide tracking information..."
            disabled={loading}
            style={{
              flex: 1,
              padding: "12px 0",
              background: "transparent",
              border: "none",
              fontSize: "15px",
              color: "#ffffff",
              outline: "none"
            }}
          />
          <button
            type="submit"
            disabled={loading || !inputMessage.trim()}
            style={{
              padding: "12px 24px",
              background: loading || !inputMessage.trim() 
                ? "rgba(255, 255, 255, 0.1)" 
                : "linear-gradient(135deg, #5865f2 0%, #7c3aed 100%)",
              color: loading || !inputMessage.trim() ? "#666" : "white",
              border: "none",
              borderRadius: "12px",
              fontSize: "14px",
              fontWeight: "600",
              cursor: loading || !inputMessage.trim() ? "not-allowed" : "pointer",
              transition: "all 0.3s",
              display: "flex",
              alignItems: "center",
              gap: "8px"
            }}
          >
            {loading ? "Sending..." : "Send"}
            {!loading && <span>↑</span>}
          </button>
        </div>
      </form>

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
          width: 8px;
          height: 8px;
        }
        
        ::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.02);
        }
        
        ::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 4px;
        }
        
        ::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.15);
        }
      `}</style>
    </div>
  );
}

export default Search;
