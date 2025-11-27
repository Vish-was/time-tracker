
import { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate, useLocation } from "react-router-dom";
import ScreenMonitor from "./componet/ScreenMonitor";
import ViewScreenshots from "./componet/VIewscrrenshot";
import AuthForm from "./componet/AuthFrom";

// Main App Component with Routing
function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}

// Actual App Content with Routing
function AppContent() {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();

  // Check if user is logged in from localStorage on component mount
  useEffect(() => {
    checkStoredAuth();
  }, []);

  const checkStoredAuth = () => {
    try {
      const userData = localStorage.getItem('userData');
      const authToken = localStorage.getItem('authToken');
      
      if (userData && authToken) {
        const parsedUser = JSON.parse(userData);
        setUser(parsedUser);
        console.log("User restored from localStorage:", parsedUser);
      }
    } catch (error) {
      console.error("Error restoring user from localStorage:", error);
      // Clear corrupted data
      localStorage.removeItem('userData');
      localStorage.removeItem('authToken');
      localStorage.removeItem('userRole');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle authentication
  const handleAuth = (userData) => {
    setUser(userData);
    
    // Save to localStorage
    localStorage.setItem('userData', JSON.stringify(userData));
    localStorage.setItem('authToken', userData.token || 'dummy-token');
    localStorage.setItem('userRole', userData.role || 'user');
    localStorage.setItem('isAuthenticated', 'true');
    
    // DON'T redirect - stay on current page
    console.log("User logged in, staying on current page");
  };

  // Handle logout
  const handleLogout = () => {
    setUser(null);

    // Clear localStorage
    localStorage.removeItem('userData');
    localStorage.removeItem('authToken');
    localStorage.removeItem('userRole');
    localStorage.removeItem('isAuthenticated');
     navigate('/');
    // Stay on current page after logout
    console.log("User logged out, staying on current page");
  };

  // Show loading while checking auth
  if (isLoading) {
    return (
      <div style={{
        minHeight: "100vh",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
        color: "white",
        fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif"
      }}>
        <div style={{
          background: "rgba(255, 255, 255, 0.1)",
          padding: "40px",
          borderRadius: "20px",
          backdropFilter: "blur(10px)",
          border: "1px solid rgba(255, 255, 255, 0.2)",
          textAlign: "center"
        }}>
          <div style={{ fontSize: "48px", marginBottom: "20px" }}>⏳</div>
          <h3 style={{ margin: "0 0 10px 0", fontSize: "24px" }}>Loading...</h3>
          <p style={{ margin: 0, opacity: 0.8 }}>Checking authentication</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ 
      padding: 0, 
      fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif", 
      position: "relative",
      minHeight: "100vh",
      background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
    }}>
      
      {/* LOGIN/LOGOUT BUTTON */}
      <div style={{
        position: "absolute",
        top: 20,
        right: 20,
        zIndex: 1000
      }}>
        {user ? (
          <button
            onClick={handleLogout}
            style={{
              padding: "12px 24px",
              borderRadius: "25px",
              background: "rgba(255, 0, 0, 0.2)",
              color: "white",
              border: "1px solid rgba(255, 255, 255, 0.3)",
              cursor: "pointer",
              fontSize: "14px",
              fontWeight: "600",
              backdropFilter: "blur(10px)",
              transition: "all 0.3s ease"
            }}
            onMouseOver={(e) => {
              e.target.style.background = "rgba(255, 0, 0, 0.3)";
              e.target.style.transform = "scale(1.05)";
            }}
            onMouseOut={(e) => {
              e.target.style.background = "rgba(255, 0, 0, 0.2)";
              e.target.style.transform = "scale(1)";
            }}
          >
            🚪 Logout ({user.name})
          </button>
        ) : (
    
          <>
          </>
        )}
      </div>

      {user && (
        <div style={{
          background: "rgba(255, 255, 255, 0.1)",
          padding: "20px",
          borderRadius: "0 0 20px 20px",
          backdropFilter: "blur(10px)",
          borderBottom: "1px solid rgba(255, 255, 255, 0.2)",
          textAlign: "center"
        }}>
          <h2 style={{ 
            margin: 0, 
            color: "white",
            fontSize: "28px",
            fontWeight: "300"
          }}>
            Welcome, <span style={{ fontWeight: "600" }}>{user.name}</span>
          </h2>
          <div style={{
            color: "rgba(255, 255, 255, 0.8)",
            fontSize: "14px",
            marginTop: "5px"
          }}>
            Role: <span style={{ 
              background: user.role === 'admin' ? "rgba(255, 0, 0, 0.3)" : "rgba(255, 255, 255, 0.2)",
              padding: "2px 12px",
              borderRadius: "12px",
              fontSize: "12px",
              fontWeight: "600"
            }}>{user.role}</span>
          </div>
        </div>
      )}

      <div style={{
        display: "flex",
        justifyContent: "center",
        gap: "15px",
        padding: "20px",
        flexWrap: "wrap"
      }}>
        <button
          onClick={() => navigate('/')}
          style={{
            padding: "12px 25px",
            borderRadius: "50px",
            backgroundColor: location.pathname === '/' ? "rgba(255, 255, 255, 0.3)" : "rgba(255, 255, 255, 0.15)",
            color: "white",
            border: "1px solid rgba(255, 255, 255, 0.3)",
            cursor: "pointer",
            fontSize: "14px",
            fontWeight: "600",
            backdropFilter: "blur(10px)",
            transition: "all 0.3s ease"
          }}
          onMouseOver={(e) => {
            if (location.pathname !== '/') {
              e.target.style.backgroundColor = "rgba(255, 255, 255, 0.25)";
              e.target.style.transform = "scale(1.05)";
            }
          }}
          onMouseOut={(e) => {
            if (location.pathname !== '/') {
              e.target.style.backgroundColor = "rgba(255, 255, 255, 0.15)";
              e.target.style.transform = "scale(1)";
            }
          }}
        >
          📱 Screen Monitor
        </button>

        {user?.role === "admin" && (
          <button
            onClick={() => navigate('/screenshots')}
            style={{
              padding: "12px 25px",
              borderRadius: "50px",
              backgroundColor: location.pathname === '/screenshots' ? "rgba(255, 255, 255, 0.3)" : "rgba(255, 255, 255, 0.15)",
              color: "white",
              border: "1px solid rgba(255, 255, 255, 0.3)",
              cursor: "pointer",
              fontSize: "14px",
              fontWeight: "600",
              backdropFilter: "blur(10px)",
              transition: "all 0.3s ease"
            }}
            onMouseOver={(e) => {
              if (location.pathname !== '/screenshots') {
                e.target.style.backgroundColor = "rgba(255, 255, 255, 0.25)";
                e.target.style.transform = "scale(1.05)";
              }
            }}
            onMouseOut={(e) => {
              if (location.pathname !== '/screenshots') {
                e.target.style.backgroundColor = "rgba(255, 255, 255, 0.15)";
                e.target.style.transform = "scale(1)";
              }
            }}
          >
            📸 View Screenshots
          </button>
        )}
      </div>

      <div style={{
        padding: "20px",
        minHeight: "calc(100vh - 120px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center"
      }}>
        <Routes>
          {/* Home Route - Screen Monitor (Accessible to all) */}
          <Route 
            path="/" 
            element={
              <div style={{ width: "100%", maxWidth: "70%",  }}>
                <ScreenMonitor userId={user?._id || "guest"} />
              </div>
            } 
          />

          <Route 
            path="/login" 
            element={
              user ? (
                <Navigate to={location.state?.from?.pathname || "/"} replace />
              ) : (
<div style={{width:"100%"}}>
                  <AuthForm
                  onAuth={handleAuth}
                  onBack={() => navigate('/')}
                />
</div>
              )
            } 
          />

          <Route 
            path="/screenshots" 
            element={
              user?.role === "admin" ? (
                <div style={{
                  width: "100%",
                  maxWidth: "1200px",
                  background: "rgba(255, 255, 255, 0.1)",
                  borderRadius: "20px",
                  backdropFilter: "blur(10px)",
                  border: "1px solid rgba(255, 255, 255, 0.2)",
                  overflow: "hidden"
                }}>
                  <ViewScreenshots />
                </div>
              ) : (
                <div style={{
                  padding: "40px",
                  background: "rgba(255, 255, 255, 0.1)",
                  borderRadius: "20px",
                  backdropFilter: "blur(10px)",
                  border: "1px solid rgba(255, 255, 255, 0.2)",
                  textAlign: "center",
                  color: "white"
                }}>
                  <div style={{ fontSize: "48px", marginBottom: "20px" }}>⛔</div>
                  <h3 style={{ margin: "0 0 10px 0", fontSize: "24px" }}>Admin Access Required</h3>
                  <p style={{ margin: 0, opacity: 0.8 }}>This page is only accessible to admin users</p>
                  {!user ? (
                    <button
                      onClick={() => navigate('/login')}
                      style={{
                        marginTop: "20px",
                        padding: "10px 20px",
                        borderRadius: "25px",
                        background: "rgba(76, 175, 80, 0.2)",
                        color: "white",
                        border: "1px solid rgba(255, 255, 255, 0.3)",
                        cursor: "pointer"
                      }}
                    >
                      🔑 Login as Admin
                    </button>
                  ) : (
                    <button
                      onClick={() => navigate('/')}
                      style={{
                        marginTop: "20px",
                        padding: "10px 20px",
                        borderRadius: "25px",
                        background: "rgba(255, 255, 255, 0.2)",
                        color: "white",
                        border: "1px solid rgba(255, 255, 255, 0.3)",
                        cursor: "pointer"
                      }}
                    >
                      ← Back to Home
                    </button>
                  )}
                </div>
              )
            } 
          />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </div>
  );
}

export default App;