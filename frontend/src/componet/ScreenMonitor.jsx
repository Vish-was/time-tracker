import React, {
  useEffect,
  useState,
  useRef,
  useCallback
} from "react";
import html2canvas from "html2canvas";
import FingerprintJS from "@fingerprintjs/fingerprintjs";
import { v4 as uuidv4 } from "uuid";

export default function ScreenMonitor() {
  const [isStarted, setIsStarted] = useState(false);
  const [deviceInfo, setDeviceInfo] = useState({});
  const [lastCaptureTime, setLastCaptureTime] = useState(null);
  const [captureCount, setCaptureCount] = useState(0);
  const [timerValue, setTimerValue] = useState(0);
  const [hasScreenAccess, setHasScreenAccess] = useState(false);
  const [screenError, setScreenError] = useState("");
  const [isInitializingCapture, setIsInitializingCapture] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [visitorId, setVisitorId] = useState(null);
  const [fpLoaded, setFpLoaded] = useState(false);

  const screenStreamRef = useRef(null);
  const screenVideoRef = useRef(null);
  const cachedDeviceInfoRef = useRef(null);
  const timerRef = useRef(null);
  const fpAgent = useRef(null);
  const lastCaptureRef = useRef(0);
  const screenTrackRef = useRef(null);
  const stopNotificationRef = useRef(null);
  const isBrowserPopupStop = useRef(false);
  const browserName = useRef("");

  const TIMER_STORAGE_KEY = "screenMonitor_timer";
  const TIMER_START_DATE_KEY = "screenMonitor_startDate";
  const TIMER_STARTED_KEY = "screenMonitor_started";
  const LAST_CAPTURE_TIME_KEY = "screenMonitor_lastCapture";
  const CAPTURE_COUNT_KEY = "screenMonitor_captureCount";

  const [multipleInstanceError, setMultipleInstanceError] = useState("");
  const BACKUP_COOKIE_NAME = "screenMonitorBackup";

  // ⏱ backup cookie save
  const saveBackupToCookie = (overrides = {}) => {
    try {
      const data = {
        timerValue: parseInt(
          localStorage.getItem(TIMER_STORAGE_KEY) || "0",
          10
        ),
        isStarted: localStorage.getItem(TIMER_STARTED_KEY) === "true",
        date:
          localStorage.getItem(TIMER_START_DATE_KEY) ||
          new Date().toDateString(),
        captureCount: parseInt(
          localStorage.getItem(CAPTURE_COUNT_KEY) || "0",
          10
        ),
        lastCaptureTime:
          localStorage.getItem(LAST_CAPTURE_TIME_KEY) || null,
        ...overrides,
      };

      const encoded = btoa(JSON.stringify(data));
      document.cookie = `${BACKUP_COOKIE_NAME}=${encoded}; path=/; max-age=${
        60 * 60 * 24 * 30
      }`;
    } catch (e) {
      console.error("Failed to save backup cookie:", e);
    }
  };

  const readBackupFromCookie = () => {
    try {
      const cookie = document.cookie
        .split("; ")
        .find((c) => c.startsWith(BACKUP_COOKIE_NAME + "="));
      if (!cookie) return null;

      const value = cookie.split("=")[1];
      return JSON.parse(atob(value));
    } catch (e) {
      console.error("Failed to read backup cookie:", e);
      return null;
    }
  };

  // 🔎 Browser detection + single-tab check
  useEffect(() => {
    const detectBrowser = () => {
      const userAgent = navigator.userAgent.toLowerCase();
      if (userAgent.includes("firefox")) {
        browserName.current = "firefox";
      } else if (userAgent.includes("chrome") && !userAgent.includes("edg")) {
        browserName.current = "chrome";
      } else if (userAgent.includes("safari") && !userAgent.includes("chrome")) {
        browserName.current = "safari";
      } else if (userAgent.includes("edg")) {
        browserName.current = "edge";
      } else {
        browserName.current = "other";
      }
    };

    detectBrowser();

    const thisTabId = `screenMonitor_${Date.now()}_${Math.random()
      .toString(36)
      .substr(2, 9)}`;
    const activeTabKey = "screenMonitor_activeTab";

    const existingActiveTab = localStorage.getItem(activeTabKey);
    if (existingActiveTab && existingActiveTab !== thisTabId) {
      setMultipleInstanceError("use only one Screen");
      return;
    }

    localStorage.setItem(activeTabKey, thisTabId);

    window.addEventListener("beforeunload", () => {
      const currentActive = localStorage.getItem(activeTabKey);
      if (currentActive === thisTabId) {
        localStorage.removeItem(activeTabKey);
      }
    });

    const checkActiveInstance = setInterval(() => {
      const currentActive = localStorage.getItem(activeTabKey);
      if (currentActive !== thisTabId && currentActive) {
        setMultipleInstanceError("use only one Screen");
      } else {
        setMultipleInstanceError("");
      }
    }, 2000);

    return () => {
      clearInterval(checkActiveInstance);
      const currentActive = localStorage.getItem(activeTabKey);
      if (currentActive === thisTabId) {
        localStorage.removeItem(activeTabKey);
      }
    };
  }, []);

  // 🔐 Fallback ID generation
  const generateFallbackId = () => {
    const components = [
      navigator.userAgent,
      navigator.hardwareConcurrency,
      navigator.platform,
      Intl.DateTimeFormat().resolvedOptions().timeZone,
      navigator.language,
      window.screen.width + "x" + window.screen.height,
    ];
    return btoa(components.join("|")).substring(0, 32);
  };

  // FingerprintJS
  useEffect(() => {
    const initializeFingerprint = async () => {
      try {
        fpAgent.current = await FingerprintJS.load({ monitoring: false });
        const result = await fpAgent.current.get();
        setVisitorId(result.visitorId);
        setFpLoaded(true);
        localStorage.setItem("deviceVisitorId", result.visitorId);
      } catch (error) {
        console.error("FingerprintJS initialization failed:", error);
        const fallbackId = generateFallbackId();
        setVisitorId(fallbackId);
        setFpLoaded(true);
        localStorage.setItem("deviceVisitorId", fallbackId);
      }
    };

    initializeFingerprint();
  }, []);

  // UUID for device
  const getOrCreateUUID = useCallback(() => {
    let existing = localStorage.getItem("deviceUUID");
    if (existing) {
      document.cookie = `deviceUUID=${existing}; path=/; max-age=${
        60 * 60 * 24 * 365
      }`;
      return existing;
    }

    const newId = uuidv4();
    localStorage.setItem("deviceUUID", newId);
    document.cookie = `deviceUUID=${newId}; path=/; max-age=${
      60 * 60 * 24 * 365
    }`;
    return newId;
  }, []);

  // ⏱ init timer (localStorage + cookie restore)
  useEffect(() => {
    const initFromStorageOrBackup = () => {
      const currentDate = new Date().toDateString();

      let savedTimerValue = localStorage.getItem(TIMER_STORAGE_KEY);
      let savedStartDate = localStorage.getItem(TIMER_START_DATE_KEY);
      let savedIsStarted = localStorage.getItem(TIMER_STARTED_KEY);
      let savedLastCapture = localStorage.getItem(LAST_CAPTURE_TIME_KEY);
      let savedCaptureCount = localStorage.getItem(CAPTURE_COUNT_KEY);

      // 1) localStorage khali hai → cookie se restore try karo
      if (!savedTimerValue && !savedStartDate && !savedIsStarted) {
        const backup = readBackupFromCookie();
        if (backup) {
          if (backup.date === currentDate) {

            savedTimerValue =
              backup.timerValue != null ? String(backup.timerValue) : null;
            savedStartDate = backup.date;
            savedIsStarted = backup.isStarted ? "true" : "false";
            savedCaptureCount =
              backup.captureCount != null ? String(backup.captureCount) : null;
            savedLastCapture = backup.lastCaptureTime || null;

            if (savedTimerValue) {
              localStorage.setItem(TIMER_STORAGE_KEY, savedTimerValue);
            }
            if (savedStartDate) {
              localStorage.setItem(TIMER_START_DATE_KEY, savedStartDate);
            }
            if (savedCaptureCount) {
              localStorage.setItem(CAPTURE_COUNT_KEY, savedCaptureCount);
            }
            if (savedLastCapture) {
              localStorage.setItem(LAST_CAPTURE_TIME_KEY, savedLastCapture);
            }
            localStorage.setItem(TIMER_STARTED_KEY, "false");
          } else {
            document.cookie = `${BACKUP_COOKIE_NAME}=; path=/; max-age=0`;
          }
        }
      }

      const currentTimer = savedTimerValue
        ? parseInt(savedTimerValue, 10) || 0
        : 0;

      if (savedStartDate && savedStartDate !== currentDate) {
        resetTimerStorage();
        setTimerValue(0);
        setCaptureCount(0);
        setLastCaptureTime(null);
        setIsStarted(false);
      } else if (currentTimer > 0) {
        setTimerValue(currentTimer);
        setIsStarted(false);

        if (savedCaptureCount) {
          setCaptureCount(parseInt(savedCaptureCount, 10) || 0);
        }

        if (savedLastCapture) {
          setLastCaptureTime(new Date(savedLastCapture));
        }
      } else {
        setTimerValue(0);
        setIsStarted(false);
      }
    };
    initFromStorageOrBackup();

    checkAdminStatus();
    const interval = setInterval(checkAdminStatus, 5000);

    return () => {
      clearInterval(interval);
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const saveTimerToStorage = (value, isStartedFlag) => {
    try {
      localStorage.setItem(TIMER_STORAGE_KEY, value.toString());
      localStorage.setItem(TIMER_STARTED_KEY, isStartedFlag.toString());

      if (!localStorage.getItem(TIMER_START_DATE_KEY)) {
        const currentDate = new Date().toDateString();
        localStorage.setItem(TIMER_START_DATE_KEY, currentDate);
      }
      saveBackupToCookie({
        timerValue: value,
        isStarted: isStartedFlag,
      });
    } catch (error) {
      console.error("Error saving timer to storage:", error);
    }
  };

  const resetTimerStorage = () => {
    try {
      localStorage.removeItem(TIMER_STORAGE_KEY);
      localStorage.removeItem(TIMER_START_DATE_KEY);
      localStorage.removeItem(TIMER_STARTED_KEY);
      localStorage.removeItem(LAST_CAPTURE_TIME_KEY);
      localStorage.removeItem(CAPTURE_COUNT_KEY);
      document.cookie = `${BACKUP_COOKIE_NAME}=; path=/; max-age=0`;
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
        setTimerValue((prev) => {
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


  useEffect(() => {
    if (!isStarted || isAdmin) return;
    if (timerValue === 0) return;

    const CAPTURE_INTERVAL = 900;

    if (timerValue > 0 && timerValue % CAPTURE_INTERVAL === 0) {
      if (lastCaptureRef.current === timerValue) return;


      lastCaptureRef.current = timerValue;

      const captureAndUpload = async () => {
        try {
          let img;

          try {
            img = await captureFullWindow();
          } catch (fullScreenError) {
            img = await capturePage();
          }

          await uploadToBackend(img);

          const now = new Date();
          setLastCaptureTime(now);
          localStorage.setItem(LAST_CAPTURE_TIME_KEY, now.toISOString());

          const newCount = captureCount + 1;
          setCaptureCount(newCount);
          localStorage.setItem(CAPTURE_COUNT_KEY, newCount.toString());

          saveBackupToCookie({
            captureCount: newCount,
            lastCaptureTime: now.toISOString(),
          });
        } catch (err) {
          console.error("❌ Capture failed:", err);
        }
      };

      setTimeout(() => {
        captureAndUpload();
      }, 500);
    }
  }, [timerValue, isStarted, isAdmin, hasScreenAccess, getOrCreateUUID, captureCount]);

  const checkAdminStatus = () => {
    try {
      const userRole = localStorage.getItem("userRole");
      const userData = localStorage.getItem("userData");
      const token = localStorage.getItem("authToken");

      if (userRole === "admin") {
        setIsAdmin(true);
        stopScreenCapture();
        return;
      }

      if (userData) {
        const parsedData = JSON.parse(userData);
        if (parsedData.role === "admin" || parsedData.isAdmin === true) {
          setIsAdmin(true);
          stopScreenCapture();
          return;
        }
      }

      if (token) {
        try {
          const payload = JSON.parse(atob(token.split(".")[1]));
          if (payload.role === "admin" || payload.isAdmin === true) {
            setIsAdmin(true);
            stopScreenCapture();
            return;
          }
        } catch (e) {
          console.error("Token parsing error:", e);
        }
      }

      setIsAdmin(false);
    } catch (error) {
      console.error("Admin check error:", error);
      setIsAdmin(false);
    }
  };

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

  const formatTimer = (totalSeconds) => {
    const hrs = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;

    return `${hrs.toString().padStart(2, "0")}:${mins
      .toString()
      .padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const getDeviceDetails = async () => {
    const cachedKey = "deviceInfo_cache";
    try {
      const cached = sessionStorage.getItem(cachedKey);
      if (cached) {
        const parsed = JSON.parse(cached);
        cachedDeviceInfoRef.current = parsed;
        return parsed;
      }
    } catch { }

    if (cachedDeviceInfoRef.current) {
      return cachedDeviceInfoRef.current;
    }

    const info = {
      os: navigator.platform,
      userAgent: navigator.userAgent,
      cpuThreads: navigator.hardwareConcurrency,
      screenResolution: {
        width: window.screen.width,
        height: window.screen.height,
      },
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      language: navigator.language,
      colorDepth: window.screen.colorDepth,
      pixelDepth: window.screen.pixelDepth,
      availableResolution: {
        width: window.screen.availWidth,
        height: window.screen.availHeight,
      },
      deviceMemory: navigator.deviceMemory,
      hardwareConcurrency: navigator.hardwareConcurrency,
      maxTouchPoints: navigator.maxTouchPoints,
      timerValue: timerValue,
      captureTime: new Date().toISOString(),
      browser: browserName.current,
    };

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      const ipData = await fetch("https://api.ipify.org?format=json", {
        signal: controller.signal,
      }).then((res) => res.json());
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
          mode: "cors",
          signal: controller.signal,
        }).then((res) => {
          if (res.status === 429) {
            sessionStorage.setItem(rateLimitKey, "true");
            setTimeout(
              () => sessionStorage.removeItem(rateLimitKey),
              3600000
            );
            throw new Error("Rate limited");
          }
          return res.json();
        });
        clearTimeout(timeoutId);
        info.city = locData.city || "Unavailable";
        info.region = locData.region || "Unavailable";
        info.country = locData.country_name || "Unavailable";
      } catch {
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
    } catch { }

    return info;
  };

  const capturePage = async () => {
    const canvas = await html2canvas(document.body);
    return canvas.toDataURL("image/png");
  };

  const stopScreenStream = () => {
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach((track) => {
        track.stop();
      });
      screenStreamRef.current = null;
    }

    if (screenTrackRef.current) {
      screenTrackRef.current.stop();
      screenTrackRef.current = null;
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
      throw new Error("Screen capture is not supported in this browser");
    }


    try {
      let stream;
      let track;

      if (browserName.current === "chrome" || browserName.current === "edge") {

        const constraints = {
          video: {
            displaySurface: "monitor",
            cursor: "always"
          },
          audio: false,
          preferCurrentTab: false,
          surfaceSwitching: "include",
        };


        try {
          stream = await navigator.mediaDevices.getDisplayMedia(constraints);
        } catch (advancedError) {
          stream = await navigator.mediaDevices.getDisplayMedia({
            video: true,
            audio: false,
          });
        }

      } else if (browserName.current === "firefox") {
        stream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: false,
        });
      } else {
        stream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: false,
        });
      }

      track = stream.getVideoTracks()[0];
      screenTrackRef.current = track;

      let isEntireScreen = false;
      let detectedSurface = "unknown";

      if (browserName.current === "firefox") {
        const screenWidth = window.screen.width;
        const screenHeight = window.screen.height;
        const captureWidth = track.getSettings().width;
        const captureHeight = track.getSettings().height;


        const widthDiff = Math.abs(screenWidth - captureWidth);
        const heightDiff = Math.abs(screenHeight - captureHeight);

        if (widthDiff <= 50 && heightDiff <= 50) {
          isEntireScreen = true;
          detectedSurface = "monitor";
        } else {
          isEntireScreen = false;
          detectedSurface = "window";
        }

      } else {
        const displaySurface = track.getSettings().displaySurface;
        detectedSurface = displaySurface || "unknown";

        if (displaySurface === "monitor") {
          isEntireScreen = true;
        } else {
          isEntireScreen = false;
        }
      }

      if (!isEntireScreen) {

        track.stop();
        stream.getTracks().forEach((t) => t.stop());

        let errorMessage = "";
        if (browserName.current === "firefox") {
          errorMessage = "Please select 'Entire Screen' NOT 'Window' or 'Tab'. Timer will NOT start.";
        } else if (browserName.current === "chrome" || browserName.current === "edge") {
          if (detectedSurface === "window") { 
            errorMessage = "❌ You selected 'Application Window'. This is NOT allowed.\n\n";
            errorMessage += "✅ SOLUTION: Close this popup and click 'Start Your Day' again.\n";
            errorMessage += "👉 In the Chrome popup, make sure 'Entire Screen' is selected (NOT Chrome Tab or Application Window).\n";
            errorMessage += "📌 If 'Entire Screen' is not showing, click on 'See all screens' option.";
          } else if (detectedSurface === "browser") {
            errorMessage = "❌ You selected 'Chrome Tab'. This is NOT allowed.\n\n";
            errorMessage += "✅ SOLUTION: Close this popup and click 'Start Your Day' again.\n";
            errorMessage += "👉 In the Chrome popup, select 'Entire Screen' option.\n";
            errorMessage += "📌 If 'Entire Screen' is not showing, click on 'See all screens' option.";
          } else {
            errorMessage = `❌ You selected '${detectedSurface}'. Please select 'Entire Screen' to start timer.\n\n`;
            errorMessage += "📌 TIP: In Chrome, you might need to click 'See all screens' to find 'Entire Screen' option.";
          }
        } else {
          if (detectedSurface === "window") {
            errorMessage = "Please select 'Entire Screen' NOT 'Application Window'. Timer will NOT start.";
          } else if (detectedSurface === "browser") {
            errorMessage = "Please select 'Entire Screen' NOT 'Browser Tab'. Timer will NOT start.";
          } else {
            errorMessage = "Please select 'Entire Screen' option only. Other options will cancel timer.";
          }
        }

        throw new Error(errorMessage);
      }
      const handleTrackEnded = () => {

        handleBrowserPopupStop();
      };

      track.addEventListener("ended", handleTrackEnded);
      track.onended = handleTrackEnded;

      const videoEl = document.createElement("video");
      videoEl.srcObject = stream;
      videoEl.muted = true;
      videoEl.playsInline = true;
      videoEl.style.cssText = "position: fixed; top: -9999px; left: -9999px; width: 1px; height: 1px;";

      await new Promise((resolve, reject) => {
        videoEl.onloadedmetadata = () => {
          videoEl
            .play()
            .then(resolve)
            .catch(reject);
        };
        videoEl.onerror = reject;
        setTimeout(() => reject(new Error("Video load timeout")), 5000);
      });

      screenStreamRef.current = stream;
      screenVideoRef.current = videoEl;
      setHasScreenAccess(true);
      setScreenError("");


      return videoEl;

    } catch (error) {
      console.error("❌ Screen capture failed:", error);

      // Specific error messages
      if (error.message.includes("Entire Screen") ||
        error.message.includes("Application Window") ||
        error.message.includes("Browser Tab") ||
        error.message.includes("Window") ||
        error.message.includes("Tab") ||
        error.message.includes("Chrome Tab")) {
        throw new Error(error.message);
      }

      // Generic browser errors
      if (error.name === "NotAllowedError" || error.name === "PermissionDeniedError") {
        throw new Error("Screen capture permission denied.");
      } else if (error.name === "NotFoundError") {
        throw new Error("No screen source available.");
      } else if (error.name === "NotReadableError") {
        throw new Error("Screen could not be captured. Please try again.");
      } else if (error.message.includes("timeout")) {
        throw new Error("Screen capture timed out.");
      } else {
        throw new Error("Screen capture cancelled. Please select 'Entire Screen'.");
      }
    }
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
      console.error("❌ Entire screen capture failed:", err.message);
      setScreenError(err.message);

      // Fallback to page capture

      return await capturePage();
    }
  };

  const uploadToBackend = async (base64Image) => {
    try {
      const info = await getDeviceDetails();
      const deviceUUID = getOrCreateUUID();

      const base64Data = base64Image.split(";base64,").pop();
      const byteChars = atob(base64Data);
      const byteNumbers = Array.from(byteChars, (c) => c.charCodeAt(0));
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: "image/png" });

      const formData = new FormData();
      formData.append("image", blob, `screenshot_${Date.now()}.png`);
      formData.append("deviceInfo", JSON.stringify(info));
      formData.append("deviceUUID", deviceUUID);
      formData.append("visitorId", visitorId || "");
      formData.append("timerValue", timerValue.toString());
      formData.append("captureCount", captureCount.toString());
      formData.append("isFullScreen", hasScreenAccess.toString());
      formData.append("browser", browserName.current);


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
        showCapturePopup();

        if (result.deviceUUID && result.deviceUUID !== deviceUUID) {
          localStorage.setItem("deviceUUID", result.deviceUUID);
          document.cookie = `deviceUUID=${result.deviceUUID}; path=/; max-age=${60 * 60 * 24 * 365
          }`;
        }
      } else {
        console.error("Upload failed:", result.error);
      }

      setDeviceInfo(info);
    } catch (err) {
      console.error("Upload error:", err.message);
    }
  };

  const showCapturePopup = () => {
    const existingPopup = document.getElementById("capturePopup");
    if (existingPopup) {
      existingPopup.remove();
    }

    const popup = document.createElement("div");
    popup.id = "capturePopup";
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
      max-width: 350px;
      display: flex;
      flex-direction: column;
      gap: 8px;
    `;

    const style = document.createElement("style");
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
        <div style="flex: 1;">
          <strong>Screenshot Captured!</strong>
          <div style="font-size: 12px; opacity: 0.9;">${new Date().toLocaleTimeString()}</div>
          <div style="font-size: 11px; opacity: 0.8; margin-top: 3px;">
            Timer: ${formatTimer(timerValue)} | Capture #${captureCount}
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(popup);

    setTimeout(() => {
      popup.style.animation = "slideOut 0.3s ease-in";
      setTimeout(() => {
        if (popup.parentNode) {
          popup.parentNode.removeChild(popup);
        }
      }, 300);
    }, 5000);
  };

  const handleBrowserPopupStop = () => {

    isBrowserPopupStop.current = true;

    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    stopScreenStream();

    setIsStarted(false);

    saveTimerToStorage(timerValue, false);


    showStopNotification();
  };

  const showStopNotification = () => {
    if (stopNotificationRef.current) {
      stopNotificationRef.current.remove();
    }

    const notification = document.createElement("div");
    notification.id = "stopNotification";
    stopNotificationRef.current = notification;

    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #f44336;
      color: white;
      padding: 15px 20px;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      z-index: 10001;
      font-family: Arial, sans-serif;
      font-size: 14px;
      animation: slideIn 0.3s ease-out;
      max-width: 350px;
    `;

    notification.innerHTML = `
      <div style="display: flex; align-items: center; gap: 10px;">
        <span style="font-size: 18px;">⏹️</span>
        <div>
          <strong>Timer Paused</strong>
          <div style="font-size: 10px; opacity: 0.7; margin-top: 2px;">
            Click "Resume Your Day" to continue 
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(notification);

    setTimeout(() => {
      notification.style.animation = "slideOut 0.3s ease-in";
      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification);
          stopNotificationRef.current = null;
        }
      }, 300);
    }, 5000);
  };

  const handleStart = async () => {
    if (isAdmin) {
      setScreenError("Screen capture is not available for admin users");
      return;
    }

    if (!fpLoaded) {
      setScreenError("Device identification initializing... Please wait");
      return;
    }

    setIsInitializingCapture(true);
    setScreenError("");

    try {
      if (browserName.current === "chrome" || browserName.current === "edge") {
        setScreenError("⏳ Preparing Chrome screen capture... Please wait");
      }

      isBrowserPopupStop.current = false;

      await ensureScreenVideo();
      setIsStarted(true);

      saveTimerToStorage(timerValue, true);

      setScreenError("");

    } catch (err) {
      setScreenError(err.message || "Screen capture failed");
      setIsStarted(false);
    } finally {
      setIsInitializingCapture(false);
    }
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

  useEffect(() => {

    const now = new Date();


    const nextMidnight = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() + 1,
      0, 0, 0, 0
    );


    const msUntilMidnight = nextMidnight - now;
    const timeout = setTimeout(() => {
      resetTimerStorage();
      setTimerValue(0);
      setCaptureCount(0);
      setLastCaptureTime(null);
      setIsStarted(false);

      window.location.reload();
    }, msUntilMidnight);

    return () => clearTimeout(timeout);
  }, []);

  if (isAdmin) {
    return (
      <div
        style={{
          padding: 20,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "100vh",
          textAlign: "center",
          background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
          color: "white",
        }}
      >
        <div
          style={{
            background: "rgba(255, 255, 255, 0.1)",
            padding: 30,
            borderRadius: 15,
            backdropFilter: "blur(10px)",
            border: "1px solid rgba(255, 255, 255, 0.2)",
            maxWidth: 500,
            width: "100%",
          }}
        >
          <div style={{ fontSize: 48, marginBottom: 15 }}>👑</div>
          <h1 style={{ margin: "0 0 10px 0", fontSize: 24 }}>
            Admin Access Detected
          </h1>
          <p
            style={{
              margin: 0,
              opacity: 0.9,
              fontSize: 16,
            }}
          >
            Screen capture is automatically disabled for admin users for
            security reasons.
          </p>
        </div>
      </div>
    );
  }

  if (multipleInstanceError) {
    return (
      <div
        style={{
          padding: 20,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "100vh",
          textAlign: "center",
          background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
          color: "white",
        }}
      >
        <div
          style={{
            background: "rgba(255, 255, 255, 0.1)",
            padding: 30,
            borderRadius: 15,
            backdropFilter: "blur(10px)",
            border: "1px solid rgba(255, 255, 255, 0.2)",
            maxWidth: 500,
            width: "100%",
          }}
        >
          <div style={{ fontSize: 48, marginBottom: 15 }}>⚠️</div>
          <h1 style={{ margin: "0 0 10px 0", fontSize: 24 }}>
            Multiple Tabs Detected
          </h1>
          <p
            style={{
              margin: 0,
              opacity: 0.9,
              fontSize: 16,
              lineHeight: 1.4,
            }}
          >
            {multipleInstanceError}
          </p>
          <div style={{
              fontSize: 14,
              marginTop: 15,
              opacity: 0.7,
              padding: "10px",
              background: "rgba(255, 255, 255, 0.1)",
            borderRadius: "8px"
          }}>
            <strong>Solution:</strong> Close this tab and use only one Screen Monitor instance
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        padding: 20,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
        textAlign: "center",
        background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
        color: "white",
      }}
    >
      <div style={{ maxWidth: 500, width: "100%" }}>
        {isStarted && (
          <div
            style={{
              background: "rgba(255, 255, 255, 0.1)",
              padding: "20px",
              borderRadius: "15px",
              marginBottom: "20px",
              border: "1px solid rgba(255, 255, 255, 0.2)",
              backdropFilter: "blur(10px)",
            }}
          >
            <h3
              style={{
                margin: "0 0 10px 0",
                fontSize: "14px",
                opacity: 0.8,
              }}
            >
              TIMER RUNNING - ENTIRE SCREEN ACTIVE
            </h3>
            <div
              style={{
                fontSize: "48px",
                fontWeight: "bold",
                fontFamily: "'Courier New', monospace",
                textShadow: "0 2px 10px rgba(0,0,0,0.3)",
              }}
            >
              {formatTimer(timerValue)}
            </div>
            <div style={{ fontSize: "12px", marginTop: "10px", opacity: 0.7 }}>
              Next capture in: {900 - (timerValue % 900)} seconds
            </div>
            <div style={{ fontSize: "11px", marginTop: "15px", opacity: 0.6, fontStyle: "italic" }}>
              ⓘ Use browser's "Stop sharing" button to pause timer
            </div>
          </div>
        )}

        {!isStarted && (
          <div
            style={{
              background: "rgba(255, 255, 255, 0.1)",
              padding: 30,
              borderRadius: 15,
              backdropFilter: "blur(10px)",
              border: "1px solid rgba(255, 255, 255, 0.2)",
              marginBottom: 20,
            }}
          >
            {localStorage.getItem(TIMER_STARTED_KEY) === "true" && (
              <div style={{ marginBottom: "20px" }}>
                <h3
                  style={{
                    margin: "0 0 10px 0",
                    fontSize: "14px",
                    opacity: 0.8,
                  }}
                >
                  LAST SESSION TIME
                </h3>
                <div
                  style={{
                    fontSize: "36px",
                    fontWeight: "bold",
                    fontFamily: "'Courier New', monospace",
                    textShadow: "0 2px 10px rgba(0,0,0,0.3)",
                    marginBottom: "10px",
                  }}
                >
                  {formatTimer(
                    parseInt(
                      localStorage.getItem(TIMER_STORAGE_KEY) || "0",
                      10
                    )
                  )}
                </div>
                <div style={{ fontSize: "12px", opacity: 0.6, marginBottom: "5px" }}>
                  Ready to resume from this time
                </div>
                <div style={{ fontSize: "11px", opacity: 0.5 }}>
                  (Timer preserved after browser popup stop)
                </div>
              </div>
            )}

            <button
              onClick={handleStart}
              disabled={isInitializingCapture || !fpLoaded}
              style={{
                padding: "12px 24px",
                background:
                  isInitializingCapture || !fpLoaded
                    ? "rgba(255,255,255,0.3)"
                    : "white",
                color:
                  isInitializingCapture || !fpLoaded
                    ? "white"
                    : "#764ba2",
                border: "none",
                borderRadius: 6,
                cursor:
                  isInitializingCapture || !fpLoaded
                    ? "not-allowed"
                    : "pointer",
                fontSize: 16,
                fontWeight: "bold",
                width: "100%",
                textTransform: "uppercase",
                letterSpacing: 1,
              }}
            >
              {!fpLoaded
                ? "Initializing Device ID..."
                : isInitializingCapture
                ? `Verifying Entire Screen Access...`
                : localStorage.getItem(TIMER_STARTED_KEY) === "true"
                    ? `Resume Your Day (${formatTimer(parseInt(localStorage.getItem(TIMER_STORAGE_KEY) || "0", 10))})`
                : "Start Your Day"}
            </button>

            <div style={{
                marginTop: "15px",
                padding: "10px",
                background: "rgba(162, 204, 211, 0.1)",
                borderRadius: "6px",
                fontSize: "12px",
                textAlign: "left",
              border: "1px solid rgba(235, 202, 191, 0.3)"
            }}>
              <div style={{ fontWeight: "bold", marginBottom: "5px", color: "#ffff" }}>
                STRICT REQUIREMENT FOR ALL BROWSERS:
              </div>


              <div>• Select <strong style={{ color: "#ffff" }}>"Entire Screen"</strong> ONLY</div>
              <div>• <strong style={{ color: "#ffff" }}>DO NOT</strong> select "Window" or "Application"</div>
              <div>• <strong style={{ color: "#ffff" }}>DO NOT</strong> select "Browser Tab"</div>
              <div>• Wrong selection = Timer will NOT start</div>

              <div style={{
                  marginTop: "8px",
                  fontSize: "11px",
                  opacity: 0.7,
                  borderTop: "1px solid rgba(255,87,34,0.2)",
                paddingTop: "5px"
              }}>
                Current Browser: <strong>{browserName.current.toUpperCase()}</strong>
                {browserName.current === "chrome" && (
                  <span style={{ marginLeft: "10px", color: "#e2dfd7ff" }}>
                    Requires manual "Entire Screen" selection
                  </span>
                )}
              </div>
            </div>

            {screenError && (
              <p
                style={{
                  marginTop: 10,
                  fontSize: 12,
                  color: "#ffb3b3",
                  whiteSpace: "pre-line",
                }}
              >
                {screenError}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
