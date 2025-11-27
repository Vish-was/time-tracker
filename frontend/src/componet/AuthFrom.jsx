
import { useState } from "react";

export default function AuthForm({ onAuth, onBack }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch("https://screenshot-chapter.onrender.com/api/auth/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });

      const data = await res.json();

      if (data.success) {
        // Save user data  localStorage
        localStorage.setItem('authToken', data.token || data.user.token);
        localStorage.setItem('userData', JSON.stringify(data.user));
        localStorage.setItem('userRole', data.user.role || 'user');
        localStorage.setItem('isAuthenticated', 'true');

        // Also set a timestamp for session management
        localStorage.setItem('loginTime', new Date().toISOString());

        console.log("User data saved to localStorage:", data.user);
        
        onAuth(data.user);
      } else {
        setError(data.message || "Authentication failed");
      }
    } catch (err) {
      setError("Server error");
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        background: "#7678d3ff",
        fontFamily: "Arial",
        position: "relative",
      margin:"0% 15% 0% 15%",
      padding:"0% 15% 0% 15%",
         borderRadius: "10px",
    
      }}
    >
      {/* 🔙 BACK BUTTON */}
      <button
        onClick={onBack}
        style={{
          position: "absolute",
          top: "20px",
          left: "20px",
          padding: "8px 16px",
          borderRadius: "6px",
          backgroundColor: "#555",
          color: "#fff",
          border: "none",
          cursor: "pointer",
          fontSize: "14px",
        }}
      >
        ⬅ Back to Home
      </button>

      <div
        style={{
          width: "100%",
          height:"400px",
         padding:"2px 40px 0px 10px",
          background: "#fff",
          borderRadius: "14px",
          boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
        }}
      >
        <h2 style={{ textAlign: "center", marginBottom: "20px" }}>
          Login 
        </h2>

        <form onSubmit={handleSubmit}>
          <input
            type="text"
            placeholder="Name (if new user)"
            value={name}
            onChange={(e) => setName(e.target.value)}
            style={{
              width: "100%",
              padding: "14px",
              marginBottom: "30px",
              borderRadius: "6px",
              border: "1px solid #ccc",
            }}
          />

          <input
            type="email"
            placeholder="Email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={{
              width: "100%",
              padding: "14px",
             marginBottom: "30px",
              borderRadius: "6px",
              border: "1px solid #ccc",
            }}
          />

          <input
            type="password"
            placeholder="Password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{
              width: "100%",
              padding: "13px",
            marginBottom: "30px",
              borderRadius: "6px",
              border: "1px solid #ccc",
            }}
          />

          <button
            type="submit"
            style={{
              width: "100%",
              padding: "14px",
        
              borderRadius: "6px",
              backgroundColor: "#4CAF50",
              color: "#fff",
              border: "none",
              cursor: "pointer",
              fontSize: "16px",
            }}
          >
            Submit
          </button>
        </form>

        {error && (
          <p style={{ color: "red", marginTop: "10px", textAlign: "center" }}>
            {error}
          </p>
        )}
      </div>
    </div>
  );
}
