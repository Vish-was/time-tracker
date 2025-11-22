
import { useState } from "react";
import ScreenMonitor from "./componet/ScreenMonitor";
import ViewScreenshots from "./componet/VIewscrrenshot";
import AuthForm from "./componet/AuthFrom";

function App() {
  const [user, setUser] = useState(null);
  const [showView, setShowView] = useState(false);
  const [openLogin, setOpenLogin] = useState(false);

  if (openLogin && !user) {
    return (
      <AuthForm
        onAuth={(u) => {
          setUser(u);
          setOpenLogin(false);
        }}
        onBack={() => setOpenLogin(false)}
      />
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
      
      {/* 🔵 LOGIN BUTTON */}
      {!user && (
        <button
          onClick={() => setOpenLogin(true)}
          style={{
            position: "absolute",
            top: 20,
            right: 20,
            padding: "12px 24px",
            borderRadius: "25px",
            background: "rgba(255, 255, 255, 0.2)",
            color: "white",
            border: "1px solid rgba(255, 255, 255, 0.3)",
            cursor: "pointer",
            fontSize: "14px",
            fontWeight: "600",
            backdropFilter: "blur(10px)",
            transition: "all 0.3s ease",
            zIndex: 1000
          }}
          onMouseEnter={(e) => {
            e.target.style.background = "rgba(255, 255, 255, 0.3)";
            e.target.style.transform = "translateY(-2px)";
          }}
          onMouseLeave={(e) => {
            e.target.style.background = "rgba(255, 255, 255, 0.2)";
            e.target.style.transform = "translateY(0)";
          }}
        >
          🔐 Login
        </button>
      )}

      {/* Welcome message */}
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
              background: "rgba(255, 255, 255, 0.2)",
              padding: "2px 8px",
              borderRadius: "12px",
              fontSize: "12px"
            }}>{user.role}</span>
          </div>
        </div>
      )}

      {/* ADMIN BUTTON */}
      {user?.role === "admin" && (
        <div style={{
          display: "flex",
          justifyContent: "center",
          padding: "20px"
        }}>
          <button
            onClick={() => setShowView(!showView)}
            style={{
              padding: "15px 30px",
              borderRadius: "50px",
              backgroundColor: "rgba(255, 255, 255, 0.15)",
              color: "white",
              border: "1px solid rgba(255, 255, 255, 0.3)",
              cursor: "pointer",
              fontSize: "16px",
              fontWeight: "600",
              backdropFilter: "blur(10px)",
              transition: "all 0.3s ease",
              display: "flex",
              alignItems: "center",
              gap: "10px"
            }}
            onMouseEnter={(e) => {
              e.target.style.background = "rgba(255, 255, 255, 0.25)";
              e.target.style.transform = "translateY(-2px)";
              e.target.style.boxShadow = "0 8px 25px rgba(0,0,0,0.2)";
            }}
            onMouseLeave={(e) => {
              e.target.style.background = "rgba(255, 255, 255, 0.15)";
              e.target.style.transform = "translateY(0)";
              e.target.style.boxShadow = "none";
            }}
          >
            {showView ? (
              <>
                📱 Back to Monitor
              </>
            ) : (
              <>
                📸 View All Screenshots
              </>
            )}
          </button>
        </div>
      )}

      {/* MAIN CONTENT */}
      <div style={{
        padding: "20px",
        minHeight: "calc(100vh - 120px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center"
      }}>
        {showView ? (
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
              <h3 style={{ margin: "0 0 10px 0", fontSize: "24px" }}>Access Denied</h3>
              <p style={{ margin: 0, opacity: 0.8 }}>You don't have permission to view this page</p>
            </div>
          )
        ) : (
          <div style={{
            width: "100%",
            maxWidth: "800px"
          }}>
            <ScreenMonitor userId={user?._id || "guest"} />
          </div>
        )}
      </div>
    </div>
  );
}

export default App;