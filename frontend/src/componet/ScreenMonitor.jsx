
import React, { useEffect, useState, useRef } from "react";
import html2canvas from "html2canvas";
import { v4 as uuidv4 } from "uuid";
export default function ScreenMonitor() {
  const [isStarted, setIsStarted] = useState(false);
  const [deviceInfo, setDeviceInfo] = useState({});
  const [driveConnected, setDriveConnected] = useState(false);
  const [driveConnecting, setDriveConnecting] = useState(false);
  const [lastCaptureTime, setLastCaptureTime] = useState(null);
  const [captureCount, setCaptureCount] = useState(0);
  const [timerValue, setTimerValue] = useState(0);
  const [hasScreenAccess, setHasScreenAccess] = useState(false);
  const [screenError, setScreenError] = useState("");
  const [isInitializingCapture, setIsInitializingCapture] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  const screenStreamRef = useRef(null);
  const screenVideoRef = useRef(null);
  const cachedDeviceInfoRef = React.useRef(null);
  const timerRef = useRef(null);

  // Timer persistence keys
  const TIMER_STORAGE_KEY = "screenMonitor_timer";
  const TIMER_START_DATE_KEY = "screenMonitor_startDate";
  const TIMER_STARTED_KEY = "screenMonitor_started";

  // Load timer from localStorage on component mount - SIMPLIFIED
  useEffect(() => {
    const savedTimerValue = localStorage.getItem(TIMER_STORAGE_KEY);
    const savedStartDate = localStorage.getItem(TIMER_START_DATE_KEY);
    const savedIsStarted = localStorage.getItem(TIMER_STARTED_KEY);

    // Check if date has changed
    const currentDate = new Date().toDateString();
    const hasDateChanged = savedStartDate && savedStartDate !== currentDate;

    if (hasDateChanged) {
      // Date changed - reset timer
      resetTimerStorage();
      setTimerValue(0);
    } else if (savedIsStarted === "true" && savedTimerValue) {
      // Same date - load saved timer value
      const timerValue = parseInt(savedTimerValue, 10);
   
      setTimerValue(timerValue);
  
    }

    checkAdminStatus();
    
    const interval = setInterval(checkAdminStatus, 5000);
    return () => {
      clearInterval(interval);
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // Save timer to localStorage
  const saveTimerToStorage = (value, isStartedFlag) => {
    try {
      localStorage.setItem(TIMER_STORAGE_KEY, value.toString());
      localStorage.setItem(TIMER_STARTED_KEY, isStartedFlag.toString());
      
      const currentDate = new Date().toDateString();
      const existingDate = localStorage.getItem(TIMER_START_DATE_KEY);
      
      if (!existingDate) {
        localStorage.setItem(TIMER_START_DATE_KEY, currentDate);
      }
    } catch (error) {
      console.error("Error saving timer to storage:", error);
    }
  };

  // Reset timer storage
  const resetTimerStorage = () => {
    try {
      localStorage.removeItem(TIMER_STORAGE_KEY);
      localStorage.removeItem(TIMER_START_DATE_KEY);
      localStorage.removeItem(TIMER_STARTED_KEY);
    } catch (error) {
      console.error("Error resetting timer storage:", error);
    }
  };


  useEffect(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    if (isStarted && !isAdmin) {
      
      timerRef.current = setInterval(() => {
        setTimerValue(prev => {
          const newValue = prev + 1;
          saveTimerToStorage(newValue, true);
          return newValue;
        });
      }, 1000);
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [isStarted, isAdmin]);

function getOrCreateUUID() {
  let uid = localStorage.getItem("deviceUUID");
  
  if (!uid) {
    uid = uuidv4();
    localStorage.setItem("deviceUUID", uid);

    document.cookie = `deviceUUID=${uid}; path=/; max-age=${60 * 60 * 24 * 365}`;
  }

  return uid;
}

  useEffect(() => {
    if (!isStarted || isAdmin) return;
    if (timerValue === 0) return;
    
    // Capture every 15 minutes (900 seconds)
    if (timerValue % 900 === 0 ) {
      const captureAndUpload = async () => {
        try {
          let img;
          if (hasScreenAccess) {
            img = await captureFullWindow();
          } else {
            img = await capturePage();
          }
          await uploadToBackend(img);
        } catch (err) {
          console.error("Capture failed:", err);
        }
      };
  const uuid = getOrCreateUUID();

      captureAndUpload();
    }
  }, [timerValue, isStarted, isAdmin, hasScreenAccess]);

  // Check admin status
  const checkAdminStatus = () => {
    try {
      const userRole = localStorage.getItem('userRole');
      const userData = localStorage.getItem('userData');
      const token = localStorage.getItem('authToken');

      if (userRole === 'admin') {
        setIsAdmin(true);
        stopScreenCapture();
        return;
      }

      if (userData) {
        const parsedData = JSON.parse(userData);
        if (parsedData.role === 'admin' || parsedData.isAdmin === true) {
          setIsAdmin(true);
          stopScreenCapture();
          return;
        }
      }

      if (token) {
        try {
          const payload = JSON.parse(atob(token.split('.')[1]));
          if (payload.role === 'admin' || payload.isAdmin === true) {
            setIsAdmin(true);
            stopScreenCapture();
            return;
          }
        } catch (e) {
          // Ignore token errors
        }
      }

      setIsAdmin(false);
    } catch (error) {
      console.error('Admin check error:', error);
      setIsAdmin(false);
    }
  };

  // Function to completely stop screen capture
  const stopScreenCapture = () => {
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach((track) => track.stop());
      screenStreamRef.current = null;
    }
    screenVideoRef.current = null;
    
    setHasScreenAccess(false);
    setIsStarted(false);
    setScreenError("Screen capture disabled for admin users");
    resetTimerStorage();
  };

  // Format timer to show hours, minutes, seconds
  const formatTimer = (totalSeconds) => {
    const hrs = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;

    return `${hrs.toString().padStart(2, '0')}:${mins
      .toString()
      .padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Calculate next capture time
  const nextCaptureIn = () => {
    const nextCaptureSeconds = 900 - (timerValue % 900);
    const minutes = Math.floor(nextCaptureSeconds / 60);
    const seconds = nextCaptureSeconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  // Rest of your existing functions
  const getDeviceDetails = async () => {
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

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      const ipData = await fetch("https://api.ipify.org?format=json", {
        signal: controller.signal
      }).then(res => res.json());
      clearTimeout(timeoutId);
      info.ip = ipData.ip || "Unavailable";
    } catch (err) {
      info.ip = "Unavailable";
    }

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
        info.city = "Unavailable";
        info.region = "Unavailable";
        info.country = "Unavailable";
      }
    } else {
      info.city = "Unavailable";
      info.region = "Unavailable";
      info.country = "Unavailable";
    }

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

  const captureFullWindow = async () => {
    try {
      const video = await ensureScreenVideo();
      const width = video.videoWidth || window.screen.width;
      const height = video.videoHeight || window.screen.height;

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(video, 0, 0, width, height);
      return canvas.toDataURL("image/png");
    } catch (err) {
      setScreenError(err.message);
      return capturePage();
    }
  };

  const stopScreenStream = () => {
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach((track) => track.stop());
      screenStreamRef.current = null;
    }
    screenVideoRef.current = null;
    setHasScreenAccess(false);
  };

  const ensureScreenVideo = async () => {
    if (isAdmin) {
      throw new Error("Screen capture not available for admin users");
    }

    if (
      screenStreamRef.current &&
      screenVideoRef.current &&
      !screenStreamRef.current.getVideoTracks()[0]?.ended
    ) {
      return screenVideoRef.current;
    }

    if (!navigator.mediaDevices?.getDisplayMedia) {
      throw new Error("Full window capture is not supported in this browser");
    }

    const stream = await navigator.mediaDevices.getDisplayMedia({
      video: {
        displaySurface: "monitor",
        logicalSurface: true,
        preferCurrentTab: false,
      },
      audio: false,
    });

    const [track] = stream.getVideoTracks();
    track.addEventListener("ended", stopScreenStream);

    const videoEl = document.createElement("video");
    videoEl.srcObject = stream;
    videoEl.muted = true;
    videoEl.playsInline = true;

    await new Promise((resolve, reject) => {
      videoEl.onloadedmetadata = () => {
        videoEl
          .play()
          .then(resolve)
          .catch(reject);
      };
      videoEl.onerror = reject;
    });

    screenStreamRef.current = stream;
    screenVideoRef.current = videoEl;
    setHasScreenAccess(true);
    setScreenError("");

    return videoEl;
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
      formData.append("deviceUUID", localStorage.getItem("deviceUUID"));

      const response = await fetch("https://screenshot-chapter.onrender.com/upload-screenshot", {
              // const response = await fetch("http://localhost:5000/upload-screenshot", {
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
        showCapturePopup();
      } else {
        console.error("Upload failed:", result.error);
      }

      setDeviceInfo(info);
    } catch (err) {
      console.error("Upload error:", err.message);
    }
  };

  const showCapturePopup = () => {
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
    
    setTimeout(() => {
      popup.style.animation = 'slideOut 0.3s ease-in';
      setTimeout(() => {
        if (popup.parentNode) {
          popup.parentNode.removeChild(popup);
        }
      }, 300);
    }, 3000);
  };

  const handleStart = async () => {
    if (isAdmin) {
      setScreenError("Screen capture is not available for admin users");
      return;
    }

    setIsInitializingCapture(true);
    setScreenError("");
    
    try {
      // First get screen access
      await ensureScreenVideo();
      
      
      setIsStarted(true);
      saveTimerToStorage(timerValue, true);
      
      
    } catch (err) {
      console.error("❌ Start failed:", err);
      setScreenError(err.message || "Screen capture failed");
      setIsStarted(false);
    } finally {
      setIsInitializingCapture(false);
    }
  };

  // Add stop function to reset timer
  const handleStop = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    stopScreenStream();
    setIsStarted(false);
    setTimerValue(0);
    resetTimerStorage();
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      stopScreenStream();
    };
  }, []);

  if (isAdmin) {
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
        <div style={{ 
          background: "rgba(255, 255, 255, 0.1)",
          padding: 30,
          borderRadius: 15,
          backdropFilter: "blur(10px)",
          border: "1px solid rgba(255, 255, 255, 0.2)",
          maxWidth: 500,
          width: "100%"
        }}>
          <div style={{ fontSize: 48, marginBottom: 15 }}>👑</div>
          <h1 style={{ margin: "0 0 10px 0", fontSize: 24 }}>Admin Access Detected</h1>
          <p style={{ margin: 0, opacity: 0.9, fontSize: 16 }}>
            Screen capture is automatically disabled for admin users for security reasons.
          </p>
        </div>
      </div>
    );
  }

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
        {/* Show saved timer state when not started */}
        {!isStarted && localStorage.getItem(TIMER_STARTED_KEY) === "true" && (
          <div style={{
            background: "rgba(255, 255, 255, 0.1)",
            padding: "20px",
            borderRadius: "15px",
            marginBottom: "20px",
            border: "1px solid rgba(255, 255, 255, 0.2)",
            backdropFilter: "blur(10px)"
          }}>
            <h3 style={{ margin: "0 0 10px 0", fontSize: "14px", opacity: 0.8 }}>
              READY TO RESUME
            </h3>
            <div style={{ 
              fontSize: "36px", 
              fontWeight: "bold",
              fontFamily: "'Courier New', monospace",
              textShadow: "0 2px 10px rgba(0,0,0,0.3)",
              marginBottom: "10px"
            }}>
              {formatTimer(parseInt(localStorage.getItem(TIMER_STORAGE_KEY) || "0"))}
            </div>
            <div style={{ 
              fontSize: "12px", 
              opacity: 0.7,
              marginBottom: "10px"
            }}>
              {/* Next screenshot in: {nextCaptureIn()} */}
            </div>
            <div style={{ 
              fontSize: "12px", 
              opacity: 0.6 
            }}>
              Click "Resume Screenshot" to continue from saved time
            </div>
          </div>
        )}

        {/* Active Timer Display - SIMPLIFIED: Show when isStarted is true */}
        {isStarted && (
          <div style={{
            background: "rgba(255, 255, 255, 0.1)",
            padding: "20px",
            borderRadius: "15px",
            marginBottom: "20px",
            border: "1px solid rgba(255, 255, 255, 0.2)",
            backdropFilter: "blur(10px)"
          }}>
            <h3 style={{ margin: "0 0 10px 0", fontSize: "14px", opacity: 0.8 }}>
              {hasScreenAccess ? "ACTIVE TIMER" : "TIMER RUNNING"}
            </h3>
            <div style={{ 
              fontSize: "48px", 
              fontWeight: "bold",
              fontFamily: "'Courier New', monospace",
              textShadow: "0 2px 10px rgba(0,0,0,0.3)"
            }}>
              {formatTimer(timerValue)}
            </div>
            <div style={{ 
              marginTop: "10px", 
              fontSize: "12px", 
              opacity: 0.7 
            }}>
              {/* Next screenshot in: {nextCaptureIn()} */}
            </div>
            <div style={{ 
              marginTop: "5px", 
              fontSize: "12px", 
              opacity: 0.7 
            }}>
            </div>
            {/* {hasScreenAccess ? (
              <div style={{ 
                marginTop: "10px", 
                fontSize: "12px", 
                color: "#90EE90",
                opacity: 0.8 
              }}>
                ✅ Screen access active
              </div>
            ) : (
              <div style={{ 
                marginTop: "10px", 
                fontSize: "12px", 
                color: "#FFB6C1",
                opacity: 0.8 
              }}>
                ⚠️ Screen access needed for full window capture
              </div>
            )} */}
            
          </div>
        )}

        {/* Start Button Section */}
        {!isStarted ? (
          <div style={{ 
            background: "rgba(255, 255, 255, 0.1)",
            padding: 30,
            borderRadius: 15,
            backdropFilter: "blur(10px)",
            border: "1px solid rgba(255, 255, 255, 0.2)",
            marginBottom: 20
          }}>
            {/* <div style={{ fontSize: 48, marginBottom: 15 }}>📸</div> */}
            {/* <h1 style={{ margin: "0 0 10px 0", fontSize: 24 }}>Screen Capture</h1> */}
            {/* <p style={{ margin: "0 0 20px 0", opacity: 0.9, fontSize: 16 }}>
              {localStorage.getItem(TIMER_STARTED_KEY) === "true" 
                ? "Resume automatic screenshots from saved time"
                : "Start automatic full window screenshots every 15 minutes"
              }
            </p>
             */}
            <button
              onClick={handleStart}
              disabled={isInitializingCapture}
              style={{
                padding: "12px 24px",
                background: isInitializingCapture ? "rgba(255,255,255,0.3)" : "white",
                color: isInitializingCapture ? "white" : "#764ba2",
                border: "none",
                borderRadius: 6,
                cursor: isInitializingCapture ? "not-allowed" : "pointer",
                fontSize: 16,
                fontWeight: "bold",
                width: "100%",
                textTransform: "uppercase",
                letterSpacing: 1,
              }}
            >
              {isInitializingCapture 
                ? "Requesting Screen Access..." 
                : localStorage.getItem(TIMER_STARTED_KEY) === "true" 
                  ? "Resume Your Day" 
                  : "Start Your Day"
              }
            </button>
            {screenError && (
              <p style={{ marginTop: 10, fontSize: 12, color: "#ffb3b3" }}>
                {screenError}
              </p>
            )}
          </div>
        ) : (
          // <div style={{ 
          //   background: "rgba(255, 255, 255, 0.1)",
          //   padding: 30,
          //   borderRadius: 15,
          //   backdropFilter: "blur(10px)",
          //   border: "1px solid rgba(255, 255, 255, 0.2)",
          //   marginBottom: 20
          // }}>
          //   {/* <div style={{ fontSize: 48, marginBottom: 15 }}>✅</div> */}
          //   <h1 style={{ margin: "0 0 10px 0", fontSize: 24 }}>
          //     {/* {hasScreenAccess ? "Screen Capture Active" : "Timer Running"} */}
          //   </h1>
          //   <p style={{ margin: 0, opacity: 0.9, fontSize: 16 }}>
          //     {/* {hasScreenAccess 
          //       ? "Full window screenshots are being automatically captured every 15 minutes"
          //       : "Timer is running but screen access is needed for full window capture"
          //     } */}
          //   </p>
            
          //   {lastCaptureTime && (
          //     <div style={{ 
          //       marginTop: 15, 
          //       padding: 10,
          //       background: "rgba(255, 255, 255, 0.2)",
          //       borderRadius: 8,
          //       fontSize: 14
          //     }}>
          //       {/* <div>Last capture: {lastCaptureTime.toLocaleTimeString()}</div> */}
          //       {/* <div>Total captures: {captureCount}</div> */}
          //     </div>
          //   )}
          // </div>
          <></>
        )}
      </div>
    </div>
  );
}