

import React, { useEffect, useState, useRef } from "react";
import html2canvas from "html2canvas";

export default function ScreenMonitor() {
  const [isStarted, setIsStarted] = useState(true); 
  const [deviceInfo, setDeviceInfo] = useState({});
  const [driveConnected, setDriveConnected] = useState(false);
  const [driveConnecting, setDriveConnecting] = useState(false);
  const [lastCaptureTime, setLastCaptureTime] = useState(null);
  const [captureCount, setCaptureCount] = useState(0);
  
  // Cache device details to avoid repeated API calls
  const cachedDeviceInfoRef = React.useRef(null);

  const getDeviceDetails = async () => {
    // Check sessionStorage first (persists across remounts)
    const cachedKey = "deviceInfo_cache";
    try {
      const cached = sessionStorage.getItem(cachedKey);
      if (cached) {
        const parsed = JSON.parse(cached);
        cachedDeviceInfoRef.current = parsed;
        return parsed;
      }
    } catch (e) {
      // Ignore sessionStorage errors
    }

    // Return ref cache if available
    if (cachedDeviceInfoRef.current) {
      return cachedDeviceInfoRef.current;
    }

    const info = {
      os: navigator.platform,
      userAgent: navigator.userAgent,
      cpuThreads: navigator.hardwareConcurrency,
      screenResolution: { width: window.screen.width, height: window.screen.height },
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      language: navigator.language,
    };

    // Fetch IP only once (with timeout)
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
      const ipData = await fetch("https://api.ipify.org?format=json", {
        signal: controller.signal
      }).then(res => res.json());
      clearTimeout(timeoutId);
      info.ip = ipData.ip || "Unavailable";
    } catch (err) {
      info.ip = "Unavailable";
    }

    // Fetch location only once (with error handling for rate limits)
    // Skip if we've been rate limited recently
    const rateLimitKey = "ipapi_rate_limited";
    const wasRateLimited = sessionStorage.getItem(rateLimitKey);
    
    if (!wasRateLimited) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);
        const locData = await fetch("https://ipapi.co/json/", {
          mode: 'cors',
          signal: controller.signal
        }).then(res => {
          if (res.status === 429) {
            // Mark as rate limited for 1 hour
            sessionStorage.setItem(rateLimitKey, "true");
            setTimeout(() => sessionStorage.removeItem(rateLimitKey), 3600000);
            throw new Error("Rate limited");
          }
          return res.json();
        });
        clearTimeout(timeoutId);
        info.city = locData.city || "Unavailable";
        info.region = locData.region || "Unavailable";
        info.country = locData.country_name || "Unavailable";
      } catch (err) {
        // If rate limited or fails, set defaults
        info.city = "Unavailable";
        info.region = "Unavailable";
        info.country = "Unavailable";
      }
    } else {
      // Already rate limited, use defaults
      info.city = "Unavailable";
      info.region = "Unavailable";
      info.country = "Unavailable";
    }

    // Cache the result in both ref and sessionStorage
    cachedDeviceInfoRef.current = info;
    try {
      sessionStorage.setItem(cachedKey, JSON.stringify(info));
    } catch (e) {
      // Ignore sessionStorage errors
    }
    
    return info;
  };

  const capturePage = async () => {
    const canvas = await html2canvas(document.body);
    return canvas.toDataURL("image/png");
  };

  const uploadToBackend = async (base64Image) => {
    try {
      const info = await getDeviceDetails();

      const base64Data = base64Image.split(";base64,").pop();
      const byteChars = atob(base64Data);
      const byteNumbers = Array.from(byteChars, (c) => c.charCodeAt(0));
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: "image/png" });

      const formData = new FormData();
      formData.append("image", blob, `screenshot_${Date.now()}.png`);
      formData.append("deviceInfo", JSON.stringify(info));
      formData.append("userId", "1233");

      const response = await fetch("https://screenshot-chapter.onrender.com/upload-screenshot", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error("Upload failed:", errorData.error || response.statusText);
        return;
      }

      const result = await response.json();
      if (result.success) {
        console.log("✅ Screenshot uploaded successfully");
        setLastCaptureTime(new Date());
        setCaptureCount(prev => prev + 1);
        
        // Show popup notification
        showCapturePopup();
      } else {
        console.error("Upload failed:", result.error);
      }

      setDeviceInfo(info);
    } catch (err) {
      if (err.message.includes("Failed to fetch") || err.message.includes("ERR_CONNECTION_REFUSED")) {
        console.error("❌ Backend server is not running. Please start the server on port 5000");
      } else {
        console.error("Upload error:", err.message);
      }
    }
  };

  // Show popup notification for screenshot capture
  const showCapturePopup = () => {
    // Create popup element
    const popup = document.createElement('div');
    popup.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #4caf50;
      color: white;
      padding: 15px 20px;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      z-index: 10000;
      font-family: Arial, sans-serif;
      font-size: 14px;
      animation: slideIn 0.3s ease-out;
      max-width: 300px;
    `;
    
    // Add CSS animation
    const style = document.createElement('style');
    style.textContent = `
      @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
      }
      @keyframes slideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
      }
    `;
    document.head.appendChild(style);
    
    popup.innerHTML = `
      <div style="display: flex; align-items: center; gap: 10px;">
        <span style="font-size: 18px;">📸</span>
        <div>
          <strong>Screenshot Captured!</strong>
          <div style="font-size: 12px; opacity: 0.9;">${new Date().toLocaleTimeString()}</div>
        </div>
      </div>
    `;
    
    document.body.appendChild(popup);
    
    // Remove popup after 3 seconds
    setTimeout(() => {
      popup.style.animation = 'slideOut 0.3s ease-in';
      setTimeout(() => {
        if (popup.parentNode) {
          popup.parentNode.removeChild(popup);
        }
      }, 300);
    }, 3000);
  };

  // Check Google Drive connection status
  const checkDriveStatus = async () => {
    try {
      const response = await fetch("https://screenshot-chapter.onrender.com/api/drive/status");
      const data = await response.json();
      if (data.success) {
        setDriveConnected(data.connected);
        
        // Auto-start if drive is connected
        if (data.connected && !isStarted) {
          setIsStarted(true);
        }
      }
    } catch (err) {
      console.error("Failed to check Drive status:", err);
      setDriveConnected(false);
    }
  };

  // Connect to Google Drive
  const connectGoogleDrive = async () => {
    try {
      setDriveConnecting(true);
      const response = await fetch("https://screenshot-chapter.onrender.com/api/drive/auth-url");
      const data = await response.json();
      
      if (data.success && data.authUrl) {
        // Open OAuth URL in new window
        const authWindow = window.open(
          data.authUrl,
          "Google Drive Authorization",
          "width=600,height=700,scrollbars=yes"
        );

        // Poll for window closure (user completed auth)
        const pollTimer = setInterval(() => {
          if (authWindow.closed) {
            clearInterval(pollTimer);
            setDriveConnecting(false);
            // Check status after a short delay
            setTimeout(checkDriveStatus, 1000);
          }
        }, 500);
      } else {
        alert("Failed to get authorization URL: " + (data.error || "Unknown error"));
        setDriveConnecting(false);
      }
    } catch (err) {
      console.error("Failed to connect Google Drive:", err);
      alert("Failed to connect Google Drive. Please make sure the backend server is running.");
      setDriveConnecting(false);
    }
  };

  // Check drive status on mount and auto-start if connected
  useEffect(() => {
    checkDriveStatus();
  }, []);

  useEffect(() => {
    if (!isStarted) return;

    const interval = setInterval(async () => {
      const img = await capturePage();
      uploadToBackend(img);
    },15 * 60 * 1000); 

    return () => clearInterval(interval);
  }, [isStarted]);

  return (
    <div style={{ 
      padding: 20, 
      display: "flex", 
      flexDirection: "column", 
      alignItems: "center", 
      justifyContent: "center", 
      minHeight: "100vh",
      textAlign: "center",
      background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
      color: "white"
    }}>
      <div style={{ maxWidth: 500, width: "100%" }}>
        {/* Main Message */}
        <div style={{ 
          background: "rgba(255, 255, 255, 0.1)",
          padding: 30,
          borderRadius: 15,
          backdropFilter: "blur(10px)",
          border: "1px solid rgba(255, 255, 255, 0.2)",
          marginBottom: 20
        }}>
          <div style={{ fontSize: 48, marginBottom: 15 }}>📸</div>
          <h1 style={{ margin: "0 0 10px 0", fontSize: 24 }}>Screen Capture Active</h1>
          <p style={{ margin: 0, opacity: 0.9, fontSize: 16 }}>
            Screenshots are being automatically captured every 15 minutes
          </p>
          
          {lastCaptureTime && (
            <div style={{ 
              marginTop: 15, 
              padding: 10,
              background: "rgba(255, 255, 255, 0.2)",
              borderRadius: 8,
              fontSize: 14
            }}>
              <div>Last capture: {lastCaptureTime.toLocaleTimeString()}</div>
              <div>Total captures: {captureCount}</div>
            </div>
          )}
        </div>

        {/* Connection Status (Minimal) */}
        {!driveConnected && (
          <div style={{ 
            background: "rgba(255, 255, 255, 0.1)",
            padding: 20,
            borderRadius: 10,
            border: "1px solid rgba(255, 255, 255, 0.2)"
          }}>
            <p style={{ margin: "0 0 15px 0", fontSize: 14 }}>
              Connect to Google Drive to enable automatic saving
            </p>
            <button
              onClick={connectGoogleDrive}
              disabled={driveConnecting}
              style={{
                padding: "12px 24px",
                background: driveConnecting ? "rgba(255,255,255,0.3)" : "white",
                color: driveConnecting ? "white" : "#667eea",
                border: "none",
                borderRadius: 6,
                cursor: driveConnecting ? "not-allowed" : "pointer",
                fontSize: 14,
                fontWeight: "bold",
                width: "100%"
              }}
            >
              {driveConnecting ? "Connecting to Google Drive..." : "Connect Google Drive"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}