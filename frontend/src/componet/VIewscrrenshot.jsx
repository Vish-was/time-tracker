

import { useEffect, useState } from "react";

const API_BASE = "https://screenshot-chapter.onrender.com";
// const API_BASE = "http://localhost:5000";

async function updateMacNameOnServer(serverMac, macname) {
  try {
    const res = await fetch(`${API_BASE}/update/macname`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ serverMac, macname }),
    });

    if (!res.ok) {
      console.error("Failed to update macname on server:", await res.text());
    }
  } catch (err) {
    console.error("Error calling /update/macname:", err);
  }
}

async function clearMacNameOnServer(serverMac) {
  try {
    const res = await fetch(`${API_BASE}/clear/macname`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ serverMac }),
    });

    if (!res.ok) {
      console.error("Failed to clear macname on server:", await res.text());
    }
  } catch (err) {
    console.error("Error calling /clear/macname:", err);
  }
}

async function updateDeviceUUIDNameOnServer(deviceUUID, deviceUUIDname) {
  try {
    const res = await fetch(`${API_BASE}/Deviceupdate/deviceUUID`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ deviceUUID, deviceUUIDname }),
    });

    if (!res.ok) {
      console.error("Failed to update deviceUUID name on server:", await res.text());
    }
  } catch (err) {
    console.error("Error calling /Deviceupdate/deviceUUID:", err);
  }
}

async function clearDeviceUUIDNameOnServer(deviceUUID) {
  try {
    const res = await fetch(`${API_BASE}/Deviceclear/deviceUUID`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ deviceUUID }),
    });

    if (!res.ok) {
      console.error("Failed to clear deviceUUID name on server:", await res.text());
    }
  } catch (err) {
    console.error("Error calling /Deviceclear/deviceUUID:", err);
  }
}

export default function ViewScreenshots() {
  const [data, setData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState(null);

  const [dateFilter, setDateFilter] = useState("");
  const [osFilter, setOsFilter] = useState("");
  const [browserFilter, setBrowserFilter] = useState("");
  const [macFilter, setMacFilter] = useState("");
  const [uuidFilter, setUuidFilter] = useState("");
  const [macNames, setMacNames] = useState({});
  const [deviceUUIDNames, setDeviceUUIDNames] = useState({});
  const [showMacManager, setShowMacManager] = useState(false);
  const [showDeviceManager, setShowDeviceManager] = useState(false);
  const [selectDeviceUUIDForEdit, setSelectDeviceUUIDForEdit] = useState("");
  const [selectedMacForEdit, setSelectedMacForEdit] = useState("");

  useEffect(() => {
    try {
      const storedMacNames = localStorage.getItem("macNames");
      if (storedMacNames) {
        setMacNames(JSON.parse(storedMacNames));
      }
      
      const storedDeviceNames = localStorage.getItem("deviceUUIDNames");
      if (storedDeviceNames) {
        setDeviceUUIDNames(JSON.parse(storedDeviceNames));
      }
    } catch (err) {
      console.error("Error reading names from localStorage:", err);
    }
  }, []);

  const persistMacNames = (updated) => {
    setMacNames(updated);
    try {
      localStorage.setItem("macNames", JSON.stringify(updated));
    } catch (err) {
      console.error("Error saving macNames to localStorage:", err);
    }
  };

  const persistDeviceUUIDNames = (updated) => {
    setDeviceUUIDNames(updated);
    try {
      localStorage.setItem("deviceUUIDNames", JSON.stringify(updated));
    } catch (err) {
      console.error("Error saving deviceUUIDNames to localStorage:", err);
    }
  };

  const getMacLabel = (mac, screenshotData) => {
    if (!mac) return "";
    if (screenshotData && screenshotData.macname) {
      return screenshotData.macname;
    }
    
    return macNames[mac] || "";
  };

  const getDeviceUUIDLabel = (uuid, screenshotData) => {
    if (!uuid) return "";
    
    if (screenshotData && screenshotData.deviceUUIDname) {
      return screenshotData.deviceUUIDname;
    }
    
    return deviceUUIDNames[uuid] || "";
  };

  const fetchScreenshots = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/screenshots`);
      const json = await res.json();
      const list = (json.screenshots || []).slice().sort((a, b) => {
        const da = new Date(a.createdAt).getTime();
        const db = new Date(b.createdAt).getTime();
        return db - da; 
      });
      
      const newMacNames = { ...macNames };
      const newDeviceUUIDNames = { ...deviceUUIDNames };
      
      list.forEach(item => {
        if (item.serverMac && item.macname) {
          newMacNames[item.serverMac] = item.macname;
        }
        if (item.deviceUUID && item.deviceUUIDname) {
          newDeviceUUIDNames[item.deviceUUID] = item.deviceUUIDname;
        }
      });
      
      // Update states
      setMacNames(newMacNames);
      setDeviceUUIDNames(newDeviceUUIDNames);
      
      // Save to localStorage
      try {
        localStorage.setItem("macNames", JSON.stringify(newMacNames));
        localStorage.setItem("deviceUUIDNames", JSON.stringify(newDeviceUUIDNames));
      } catch (err) {
        console.error("Error saving to localStorage:", err);
      }
      
      setData(list);
      setFilteredData(list);
    } catch (error) {
      console.error("Error fetching screenshots:", error);
    } finally {
      setLoading(false);
    }
  };

  const getEmbeddedImageUrl = (driveUrl) => {
    if (!driveUrl) return null;

    if (driveUrl.includes("drive.google.com")) {
      const fileId = driveUrl.split("id=")[1];
      if (fileId) {
        return `https://lh3.googleusercontent.com/d/${fileId}`;
      }
    }
    return driveUrl;
  };

  // Apply filters
  useEffect(() => {
    let filtered = data;

    if (dateFilter) {
      filtered = filtered.filter((item) => {
        const itemDate = new Date(item.createdAt).toLocaleDateString();
        return itemDate === dateFilter;
      });
    }
    if (osFilter) {
      filtered = filtered.filter((item) =>
        item.deviceInfo?.os?.toLowerCase().includes(osFilter.toLowerCase())
      );
    }
    if (browserFilter) {
      filtered = filtered.filter((item) =>
        item.deviceInfo?.browser?.toLowerCase().includes(browserFilter.toLowerCase())
      );
    }
    if (macFilter) {
      filtered = filtered.filter((item) =>
        item.serverMac?.toLowerCase().includes(macFilter.toLowerCase())
      );
    }
    if (uuidFilter) {
      filtered = filtered.filter((item) =>
        item.deviceUUID?.toLowerCase().includes(uuidFilter.toLowerCase())
      );
    }

    setFilteredData(filtered);
  }, [dateFilter, osFilter, browserFilter, macFilter, uuidFilter, data]);

  // Unique values for dropdowns with names
  const uniqueOS = [...new Set(data.map((item) => item.deviceInfo?.os).filter(Boolean))];
  const uniqueDates = [
    ...new Set(data.map((item) => new Date(item.createdAt).toLocaleDateString())),
  ];

  const getUniqueUUIDsWithNames = () => {
    const uuidMap = new Map();
    data.forEach(item => {
      if (item.deviceUUID) {
        const name = item.deviceUUIDname || deviceUUIDNames[item.deviceUUID] || "";
        uuidMap.set(item.deviceUUID, name);
      }
    });
    return Array.from(uuidMap.entries()).map(([uuid, name]) => ({ uuid, name }));
  };

  const getUniqueMACsWithNames = () => {
    const macMap = new Map();
    data.forEach(item => {
      if (item.serverMac) {
        const name = item.macname || macNames[item.serverMac] || "";
        macMap.set(item.serverMac, name);
      }
    });
    return Array.from(macMap.entries()).map(([mac, name]) => ({ mac, name }));
  };

  const uniqueUUIDsWithNames = getUniqueUUIDsWithNames();
  const uniqueMACsWithNames = getUniqueMACsWithNames();

  const clearFilters = () => {
    setDateFilter("");
    setOsFilter("");
    setBrowserFilter("");
    setMacFilter("");
    setUuidFilter("");
  };

  useEffect(() => {
    fetchScreenshots();
  }, []);

  // Image Preview Modal
  const ImagePreviewModal = () => {
    if (!selectedImage) return null;

    return (
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          backgroundColor: "rgba(0,0,0,0.9)",
          display: "flex",
          justifyContent: "center",
          zIndex: 1000,
          backdropFilter: "blur(5px)",
        }}
        onClick={() => setSelectedImage(null)}
      >
        <div
          style={{
            position: "relative",
            maxWidth: "95%",
            maxHeight: "95%",
            height: "800px",
            backgroundColor: "white",
            marginTop: "20px",
            marginLeft:"16px",
            marginRight:"16px",
            borderRadius: "12px",
            padding: "20px",
            boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => setSelectedImage(null)}
            style={{
              position: "absolute",
              top: "-15px",
              right: "-15px",
              background: "#ff4757",
              color: "white",
              border: "none",
              borderRadius: "50%",
              width: "35px",
              height: "35px",
              cursor: "pointer",
              fontSize: "18px",
              fontWeight: "bold",
              zIndex: 1001,
            }}
          >
            ×
          </button>
          <img
            src={selectedImage}
            alt="Screenshot Preview"
            style={{
              maxWidth: "100%",
              maxHeight: "85vh",
              borderRadius: "8px",
              display: "block",
            }}
          />
          <div
            style={{
              marginTop: "15px",
              textAlign: "center",
              display: "flex",
              gap: "10px",
              justifyContent: "center",
            }}
          >
            <button
              onClick={() => window.open(selectedImage, "_blank")}
              style={{
                padding: "10px 20px",
                background: "#3498db",
                color: "white",
                border: "none",
                borderRadius: "8px",
                cursor: "pointer",
                fontWeight: "bold",
              }}
            >
              📁 Open in New Tab
            </button>
            <button
              onClick={() => setSelectedImage(null)}
              style={{
                padding: "10px 20px",
                background: "#95a5a6",
                color: "white",
                border: "none",
                borderRadius: "8px",
                cursor: "pointer",
                fontWeight: "bold",
              }}
            >
              ❌ Close
            </button>
          </div>
        </div>
      </div>
    );
  };

  const MacNameManager = () => {
    const [search, setSearch] = useState(selectedMacForEdit || "");
    const [localNames, setLocalNames] = useState(macNames || {});

    useEffect(() => {
      setLocalNames(macNames || {});
    }, [macNames]);

    const filteredMacs = uniqueMACsWithNames
      .filter(({ mac }) => mac.toLowerCase().includes(search.toLowerCase()))
      .sort((a, b) => a.mac.localeCompare(b.mac));

    const handleChange = (mac, value) => {
      setLocalNames((prev) => ({
        ...prev,
        [mac]: value,
      }));
    };

    const handleSaveAll = async () => {
      persistMacNames(localNames);

      const entries = Object.entries(localNames);

      await Promise.all(
        entries.map(([mac, name]) => {
          const trimmed = (name || "").trim();
          if (trimmed) {
            return updateMacNameOnServer(mac, trimmed);
          } else {
            return clearMacNameOnServer(mac);
          }
        })
      );

      setShowMacManager(false);
      setSelectedMacForEdit("");
      fetchScreenshots();
    };

    return (
      <div
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.65)",
          display: "flex",
          paddingTop: "30px",
          justifyContent: "center",
          zIndex: 1200,
        }}
        onClick={() => setShowMacManager(false)}
      >
        <div
          style={{
            width: "95%",
            maxWidth: "800px",
            maxHeight: "80vh",
            background: "white",
            borderRadius: "18px",
            padding: "24px 24px 18px",
            boxShadow: "0 20px 60px rgba(0,0,0,0.35)",
            display: "flex",
            flexDirection: "column",
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "16px",
            }}
          >
            <div>
              <h2
                style={{
                  margin: 0,
                  fontSize: "1.6rem",
                  color: "#2c3e50",
                }}
              >
                🧾 MAC Address Name Manager
              </h2>
            </div>
            <button
              onClick={() => {
                setShowMacManager(false);
                setSelectedMacForEdit("");
              }}
              style={{
                border: "none",
                background: "#e74c3c",
                color: "white",
                borderRadius: "50%",
                width: "36px",
                height: "36px",
                fontSize: "18px",
                cursor: "pointer",
                fontWeight: "bold",
              }}
            >
              ×
            </button>
          </div>

          <div
            style={{
              marginBottom: "14px",
              display: "flex",
              gap: "10px",
              alignItems: "center",
              flexWrap: "wrap",
            }}
          >
            <select
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                flex: 1,
                minWidth: "220px",
                padding: "10px 12px",
                borderRadius: "10px",
                border: "2px solid #e9ecef",
                fontSize: "0.9rem",
                background: "white",
              }}
            >
              <option value="">🔍 All MAC addresses</option>
              {uniqueMACsWithNames
                .slice()
                .sort((a, b) => a.mac.localeCompare(b.mac))
                .map(({ mac, name }) => (
                  <option key={mac} value={mac}>
                    {name ? `${name} (${mac})` : mac}
                  </option>
                ))}
            </select>

            <button
              onClick={handleSaveAll}
              style={{
                padding: "10px 18px",
                borderRadius: "10px",
                border: "none",
                background: "#27ae60",
                color: "white",
                fontWeight: "bold",
                cursor: "pointer",
              }}
            >
              💾 Save All
            </button>
          </div>

          <div
            style={{
              flex: 1,
              overflowY: "auto",
              borderRadius: "12px",
              border: "1px solid #ecf0f1",
              padding: "10px",
              background: "#f8f9fa",
            }}
          >
            {filteredMacs.length === 0 ? (
              <div
                style={{
                  textAlign: "center",
                  padding: "30px 10px",
                  color: "#7f8c8d",
                  fontSize: "0.95rem",
                }}
              >
                No MAC addresses found. Wait for screenshots to load.
              </div>
            ) : (
              filteredMacs.map(({ mac }) => {
                const nameFromDB = data.find(item => item.serverMac === mac)?.macname;
                const displayName = localNames[mac] || nameFromDB || "";
                return (
                  <div
                    key={mac}
                    style={{
                      background: "white",
                      borderRadius: "10px",
                      padding: "10px 12px",
                      marginBottom: "8px",
                      display: "flex",
                      flexDirection: "column",
                      gap: "6px",
                      boxShadow: "0 2px 6px rgba(0,0,0,0.04)",
                    }}
                  >
                    <div
                      style={{
                        fontSize: "0.85rem",
                        color: "#7f8c8d",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        gap: "10px",
                        flexWrap: "wrap",
                      }}
                    >
                      <span>
                        <b>MAC:</b> {mac}
                      </span>
                      {displayName && (
                        <span style={{ color: "#27ae60", fontWeight: "bold" }}>
                          Name: {displayName}
                        </span>
                      )}
                    </div>
                    <div
                      style={{
                        display: "flex",
                        gap: "8px",
                        flexWrap: "wrap",
                      }}
                    >
                      <input
                        type="text"
                        placeholder="Eg: QA Server, Dev Machine, Srajan Laptop..."
                        value={localNames[mac] || ""}
                        onChange={(e) => handleChange(mac, e.target.value)}
                        style={{
                          flex: 1,
                          minWidth: "180px",
                          padding: "8px 10px",
                          borderRadius: "8px",
                          border: "1px solid #dfe4ea",
                          fontSize: "0.9rem",
                        }}
                      />
                      <button
                        onClick={async (e) => {
                          e.stopPropagation();
                          const updated = {
                            ...localNames,
                            [mac]: "",
                          };
                          handleChange(mac, "");
                          persistMacNames(updated);
                          await clearMacNameOnServer(mac);
                          fetchScreenshots(); 
                        }}
                        style={{
                          border: "none",
                          background: "#e0e0e0",
                          borderRadius: "8px",
                          padding: "6px 10px",
                          fontSize: "0.8rem",
                          cursor: "pointer",
                        }}
                      >
                        Clear
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    );
  };

  const DeviceUUIDNameManager = () => {
    const [search, setSearch] = useState(selectDeviceUUIDForEdit || "");
    const [localNames, setLocalNames] = useState(deviceUUIDNames || {});

    useEffect(() => {
      setLocalNames(deviceUUIDNames || {});
    }, [deviceUUIDNames]);

    const filteredUUIDs = uniqueUUIDsWithNames
      .filter(({ uuid }) => uuid.toLowerCase().includes(search.toLowerCase()))
      .sort((a, b) => a.uuid.localeCompare(b.uuid));

    const handleChange = (uuid, value) => {
      setLocalNames((prev) => ({
        ...prev,
        [uuid]: value,
      }));
    };

    const handleSaveAll = async () => {
      persistDeviceUUIDNames(localNames);

      const entries = Object.entries(localNames);

      await Promise.all(
        entries.map(([uuid, name]) => {
          const trimmed = (name || "").trim();
          if (trimmed) {
            return updateDeviceUUIDNameOnServer(uuid, trimmed);
          } else {
            return clearDeviceUUIDNameOnServer(uuid);
          }
        })
      );

      setShowDeviceManager(false);
      setSelectDeviceUUIDForEdit("");
      fetchScreenshots(); 
    };

    return (
      <div
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.65)",
          display: "flex",
          paddingTop: "30px",
          justifyContent: "center",
          zIndex: 1200,
        }}
        onClick={() => setShowDeviceManager(false)}
      >
        <div
          style={{
            width: "95%",
            maxWidth: "800px",
            maxHeight: "80vh",
            background: "white",
            borderRadius: "18px",
            padding: "24px 24px 18px",
            boxShadow: "0 20px 60px rgba(0,0,0,0.35)",
            display: "flex",
            flexDirection: "column",
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "16px",
            }}
          >
            <div>
              <h2
                style={{
                  margin: 0,
                  fontSize: "1.6rem",
                  color: "#2c3e50",
                }}
              >
                📱 Device UUID Name Manager
              </h2>
            </div>
            <button
              onClick={() => {
                setShowDeviceManager(false);
                setSelectDeviceUUIDForEdit("");
              }}
              style={{
                border: "none",
                background: "#e74c3c",
                color: "white",
                borderRadius: "50%",
                width: "36px",
                height: "36px",
                fontSize: "18px",
                cursor: "pointer",
                fontWeight: "bold",
              }}
            >
              ×
            </button>
          </div>

          <div
            style={{
              marginBottom: "14px",
              display: "flex",
              gap: "10px",
              alignItems: "center",
              flexWrap: "wrap",
            }}
          >
            <select
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                flex: 1,
                minWidth: "220px",
                padding: "10px 12px",
                borderRadius: "10px",
                border: "2px solid #e9ecef",
                fontSize: "0.9rem",
                background: "white",
              }}
            >
              <option value="">🔍 All Device UUIDs</option>
              {uniqueUUIDsWithNames
                .slice()
                .sort((a, b) => a.uuid.localeCompare(b.uuid))
                .map(({ uuid, name }) => (
                  <option key={uuid} value={uuid}>
                    {name ? `${name} (${uuid})` : uuid}
                  </option>
                ))}
            </select>

            <button
              onClick={handleSaveAll}
              style={{
                padding: "10px 18px",
                borderRadius: "10px",
                border: "none",
                background: "#27ae60",
                color: "white",
                fontWeight: "bold",
                cursor: "pointer",
              }}
            >
              💾 Save All
            </button>
          </div>

          <div
            style={{
              flex: 1,
              overflowY: "auto",
              borderRadius: "12px",
              border: "1px solid #ecf0f1",
              padding: "10px",
              background: "#f8f9fa",
            }}
          >
            {filteredUUIDs.length === 0 ? (
              <div
                style={{
                  textAlign: "center",
                  padding: "30px 10px",
                  color: "#7f8c8d",
                  fontSize: "0.95rem",
                }}
              >
                No Device UUIDs found. Wait for screenshots to load.
              </div>
            ) : (
              filteredUUIDs.map(({ uuid }) => {
                const nameFromDB = data.find(item => item.deviceUUID === uuid)?.deviceUUIDname;
                const displayName = localNames[uuid] || nameFromDB || "";
                
                return (
                  <div
                    key={uuid}
                    style={{
                      background: "white",
                      borderRadius: "10px",
                      padding: "10px 12px",
                      marginBottom: "8px",
                      display: "flex",
                      flexDirection: "column",
                      gap: "6px",
                      boxShadow: "0 2px 6px rgba(0,0,0,0.04)",
                    }}
                  >
                    <div
                      style={{
                        fontSize: "0.85rem",
                        color: "#7f8c8d",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        gap: "10px",
                        flexWrap: "wrap",
                      }}
                    >
                      <span>
                        <b>Device UUID:</b> {uuid}
                      </span>
                      {displayName && (
                        <span style={{ color: "#27ae60", fontWeight: "bold" }}>
                          Name: {displayName}
                        </span>
                      )}
                    </div>
                    <div
                      style={{
                        display: "flex",
                        gap: "8px",
                        flexWrap: "wrap",
                      }}
                    >
                      <input
                        type="text"
                        placeholder="Eg: John's Laptop, Office PC, QA Machine..."
                        value={localNames[uuid] || ""}
                        onChange={(e) => handleChange(uuid, e.target.value)}
                        style={{
                          flex: 1,
                          minWidth: "180px",
                          padding: "8px 10px",
                          borderRadius: "8px",
                          border: "1px solid #dfe4ea",
                          fontSize: "0.9rem",
                        }}
                      />
                      <button
                        onClick={async (e) => {
                          e.stopPropagation();
                          const updated = {
                            ...localNames,
                            [uuid]: "",
                          };
                          handleChange(uuid, "");
                          persistDeviceUUIDNames(updated);
                          await clearDeviceUUIDNameOnServer(uuid);
                          fetchScreenshots(); // Refresh data
                        }}
                        style={{
                          border: "none",
                          background: "#e0e0e0",
                          borderRadius: "8px",
                          padding: "6px 10px",
                          fontSize: "0.8rem",
                          cursor: "pointer",
                        }}
                      >
                        Clear
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div
        style={{
          padding: "20px",
          textAlign: "center",
          background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
          minHeight: "100vh",
          color: "white",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "column",
        }}
      >
        <div style={{ fontSize: "48px", marginBottom: "20px" }}>⏳</div>
        <h2>Loading screenshots...</h2>
        <p>Please wait while we fetch your screenshots</p>
      </div>
    );
  }

  return (
    <>
      <div
        style={{
          padding: "20px",
          maxWidth: "1400px",
          margin: "0 auto",
          fontFamily: "Arial, sans-serif",
          minHeight: "100vh",
          background: "linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "15px",
            marginBottom: "30px",
          }}
        >
          <div>
            <h1
              style={{
                color: "#2c3e50",
                margin: 0,
                fontSize: "2.5rem",
                background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              📸 Screenshot Gallery
            </h1>
            <p style={{ color: "#7f8c8d", fontSize: "1.1rem", margin: "5px 0 0 0" }}>
              {filteredData.length} of {data.length} screenshots displayed
            </p>
          </div>
          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
            <button
              onClick={() => {
                setShowDeviceManager(true);
                setSelectDeviceUUIDForEdit("");
              }}
              style={{
                padding: "10px 18px",
                backgroundColor: "#51a730",
                color: "white",
                border: "none",
                borderRadius: "10px",
                cursor: "pointer",
                fontWeight: "bold",
                fontSize: "0.95rem",
                boxShadow: "0 4px 15px rgba(81, 167, 48, 0.3)",
                transition: "all 0.3s ease",
              }}
              onMouseOver={(e) => {
                e.target.style.transform = "translateY(-2px)";
                e.target.style.boxShadow = "0 6px 20px rgba(81, 167, 48, 0.4)";
              }}
              onMouseOut={(e) => {
                e.target.style.transform = "translateY(0)";
                e.target.style.boxShadow = "0 4px 15px rgba(81, 167, 48, 0.3)";
              }}
            >
              📱 Manage Device UUID Names
            </button>
           
            <button
              onClick={() => {
                setShowMacManager(true);
                setSelectedMacForEdit("");
              }}
              style={{
                padding: "10px 18px",
                backgroundColor: "#9b59b6",
                color: "white",
                border: "none",
                borderRadius: "10px",
                cursor: "pointer",
                fontWeight: "bold",
                fontSize: "0.95rem",
                boxShadow: "0 4px 15px rgba(155, 89, 182, 0.3)",
                transition: "all 0.3s ease",
              }}
              onMouseOver={(e) => {
                e.target.style.transform = "translateY(-2px)";
                e.target.style.boxShadow = "0 6px 20px rgba(155, 89, 182, 0.4)";
              }}
              onMouseOut={(e) => {
                e.target.style.transform = "translateY(0)";
                e.target.style.boxShadow = "0 4px 15px rgba(155, 89, 182, 0.3)";
              }}
            >
              🧾 Manage MAC Names
            </button>
            <button
              onClick={fetchScreenshots}
              style={{
                padding: "12px 24px",
                backgroundColor: "#3498db",
                color: "white",
                border: "none",
                borderRadius: "10px",
                cursor: "pointer",
                fontWeight: "bold",
                fontSize: "1rem",
                boxShadow: "0 4px 15px rgba(52, 152, 219, 0.3)",
                transition: "all 0.3s ease",
              }}
              onMouseOver={(e) => {
                e.target.style.transform = "translateY(-2px)";
                e.target.style.boxShadow = "0 6px 20px rgba(52, 152, 219, 0.4)";
              }}
              onMouseOut={(e) => {
                e.target.style.transform = "translateY(0)";
                e.target.style.boxShadow = "0 4px 15px rgba(52, 152, 219, 0.3)";
              }}
            >
              🔄 Refresh
            </button>
          </div>
        </div>

        {/* Filters */}
        <div
          style={{
            backgroundColor: "rgba(255, 255, 255, 0.9)",
            padding: "25px",
            borderRadius: "16px",
            marginBottom: "30px",
            border: "1px solid #e9ecef",
            backdropFilter: "blur(10px)",
            boxShadow: "0 8px 32px rgba(0,0,0,0.1)",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "20px",
              flexWrap: "wrap",
              gap: "10px",
            }}
          >
            <h3 style={{ color: "#2c3e50", margin: 0 }}>🔍 Filters</h3>
            <button
              onClick={clearFilters}
              style={{
                padding: "8px 16px",
                backgroundColor: "#95a5a6",
                color: "white",
                border: "none",
                borderRadius: "8px",
                cursor: "pointer",
                fontSize: "14px",
                fontWeight: "bold",
              }}
            >
              Clear All
            </button>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
              gap: "20px",
            }}
          >
            <div>
              <label
                style={{
                  display: "block",
                  marginBottom: "8px",
                  fontWeight: "bold",
                  color: "#34495e",
                }}
              >
                📅 Date
              </label>
              <select
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                style={{
                  width: "100%",
                  padding: "10px",
                  borderRadius: "8px",
                  border: "2px solid #e9ecef",
                  backgroundColor: "white",
                  fontSize: "14px",
                }}
              >
                <option value="">All Dates</option>
                {uniqueDates.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                style={{
                  display: "block",
                  marginBottom: "8px",
                  fontWeight: "bold",
                  color: "#34495e",
                }}
              >
                💻 OS
              </label>
              <select
                value={osFilter}
                onChange={(e) => setOsFilter(e.target.value)}
                style={{
                  width: "100%",
                  padding: "10px",
                  borderRadius: "8px",
                  border: "2px solid #e9ecef",
                  backgroundColor: "white",
                  fontSize: "14px",
                }}
              >
                <option value="">All OS</option>
                {uniqueOS.map((os) => (
                  <option key={os} value={os}>
                    {os}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                style={{
                  display: "block",
                  marginBottom: "8px",
                  fontWeight: "bold",
                  color: "#34495e",
                }}
              >
                🆔 Device UUID
              </label>
              <select
                value={uuidFilter}
                onChange={(e) => setUuidFilter(e.target.value)}
                style={{
                  width: "100%",
                  padding: "10px",
                  borderRadius: "8px",
                  border: "2px solid #e9ecef",
                  backgroundColor: "white",
                  fontSize: "14px",
                }}
              >
                <option value="">All UUIDs</option>
                {uniqueUUIDsWithNames.map(({ uuid, name }) => (
                  <option key={uuid} value={uuid}>
                    {name ? `${name} (${uuid})` : uuid}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                style={{
                  display: "block",
                  marginBottom: "8px",
                  fontWeight: "bold",
                  color: "#34495e",
                }}
              >
                🔗 Server MAC
              </label>
              <select
                value={macFilter}
                onChange={(e) => setMacFilter(e.target.value)}
                style={{
                  width: "100%",
                  padding: "10px",
                  borderRadius: "8px",
                  border: "2px solid #e9ecef",
                  backgroundColor: "white",
                  fontSize: "14px",
                }}
              >
                <option value="">All MACs</option>
                {uniqueMACsWithNames.map(({ mac, name }) => (
                  <option key={mac} value={mac}>
                    {name ? `${name} (${mac})` : mac}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Screenshots Grid */}
        {filteredData.length === 0 ? (
          <div
            style={{
              textAlign: "center",
              padding: "80px 20px",
              color: "#7f8c8d",
              backgroundColor: "rgba(255, 255, 255, 0.8)",
              borderRadius: "16px",
              backdropFilter: "blur(10px)",
            }}
          >
            <div style={{ fontSize: "64px", marginBottom: "20px" }}>📷</div>
            <h3 style={{ color: "#2c3e50", marginBottom: "10px" }}>
              No screenshots found
            </h3>
            <p style={{ fontSize: "1.1rem" }}>
              Try adjusting your filters or upload new screenshots.
            </p>
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(380px, 1fr))",
              gap: "25px",
            }}
          >
            {filteredData.map((item) => {
              const imageUrl = getEmbeddedImageUrl(item.driveURL);
              const macLabel = getMacLabel(item.serverMac, item);
              const deviceUUIDLabel = getDeviceUUIDLabel(item.deviceUUID, item);

              return (
                <div
                  key={item._id}
                  style={{
                    border: "1px solid #e1e8ed",
                    borderRadius: "20px",
                    padding: "20px",
                    background: "linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)",
                    boxShadow: "0 10px 30px rgba(0,0,0,0.1)",
                    transition: "all 0.3s ease",
                    cursor: "pointer",
                  }}
                  onClick={() => imageUrl && setSelectedImage(imageUrl)}
                  onMouseOver={(e) => {
                    e.currentTarget.style.transform = "translateY(-5px)";
                    e.currentTarget.style.boxShadow =
                      "0 15px 40px rgba(0,0,0,0.15)";
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.transform = "translateY(0)";
                    e.currentTarget.style.boxShadow =
                      "0 10px 30px rgba(0,0,0,0.1)";
                  }}
                >
                  {/* Image Preview */}
                  {imageUrl && (
                    <div
                      style={{
                        borderRadius: "12px",
                        overflow: "hidden",
                        marginBottom: "15px",
                        border: "2px solid #e9ecef",
                      }}
                    >
                      <img
                        src={imageUrl}
                        alt="Screenshot"
                        style={{
                          width: "100%",
                          height: "200px",
                          objectFit: "cover",
                          display: "block",
                          transition: "transform 0.3s ease",
                        }}
                        onMouseOver={(e) => {
                          e.target.style.transform = "scale(1.05)";
                        }}
                        onMouseOut={(e) => {
                          e.target.style.transform = "scale(1)";
                        }}
                      />
                      <div
                        style={{
                          backgroundColor: "rgba(52, 152, 219, 0.9)",
                          color: "white",
                          padding: "8px 12px",
                          textAlign: "center",
                          fontSize: "12px",
                          fontWeight: "bold",
                        }}
                      >
                        🖱️ Click to view full image
                      </div>
                    </div>
                  )}

                  {/* File Info */}
                  <p style={{ margin: "8px 0", fontSize: "14px" }}>
                    <b>📄 File:</b> {item.fileName}
                  </p>
                  <p style={{ margin: "8px 0", fontSize: "14px" }}>
                    <b>📅 Date:</b> {new Date(item.createdAt).toLocaleString()}
                  </p>

                  {/* Device UUID Info */}
                  {item.deviceUUID && (
                    <p style={{ margin: "8px 0", fontSize: "14px" }}>
                      <b>📱 Device:</b>{" "}
                      {deviceUUIDLabel ? (
                        <>
                          <span style={{ color: "#27ae60", fontWeight: "bold" }}>
                            {deviceUUIDLabel}
                          </span>
                          <span style={{ color: "#7f8c8d" }}> ({item.deviceUUID})</span>
                        </>
                      ) : (
                        item.deviceUUID
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectDeviceUUIDForEdit(item.deviceUUID);
                          setShowDeviceManager(true);
                        }}
                        style={{
                          marginLeft: "10px",
                          padding: "4px 8px",
                          fontSize: "12px",
                          borderRadius: "8px",
                          border: "none",
                          cursor: "pointer",
                          background: "#51a730",
                          color: "white",
                          fontWeight: "bold",
                        }}
                      >
                        ✏️ Edit name
                      </button>
                    </p>
                  )}

                  {/* Device Info */}
                  {item.deviceInfo && (
                    <div style={{ marginTop: "10px" }}>
                      {item.deviceInfo.os && (
                        <p style={{ margin: "6px 0", fontSize: "14px" }}>
                          <b>💻 OS:</b> {item.deviceInfo.os}
                        </p>
                      )}
                      {item.deviceInfo.browser && (
                        <p style={{ margin: "6px 0", fontSize: "14px" }}>
                          <b>🌐 Browser:</b> {item.deviceInfo.browser}
                        </p>
                      )}
                      {item.deviceInfo.timezone && (
                        <p style={{ margin: "6px 0", fontSize: "14px" }}>
                          <b>🌍 Timezone:</b> {item.deviceInfo.timezone}
                        </p>
                      )}
                      {item.deviceInfo.ip && (
                        <p style={{ margin: "6px 0", fontSize: "14px" }}>
                          <b>📍 IP:</b> {item.deviceInfo.ip}
                        </p>
                      )}
                    </div>
                  )}

                  {item.serverMac && (
                    <p style={{ margin: "8px 0", fontSize: "14px" }}>
                      <b>🔗 Server:</b>{" "}
                      {macLabel ? (
                        <>
                          <span style={{ color: "#27ae60", fontWeight: "bold" }}>
                            {macLabel}
                          </span>
                          <span style={{ color: "#7f8c8d" }}> ({item.serverMac})</span>
                        </>
                      ) : (
                        item.serverMac
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedMacForEdit(item.serverMac);
                          setShowMacManager(true);
                        }}
                        style={{
                          marginLeft: "10px",
                          padding: "4px 8px",
                          fontSize: "12px",
                          borderRadius: "8px",
                          border: "none",
                          cursor: "pointer",
                          background: "#8e44ad",
                          color: "white",
                          fontWeight: "bold",
                        }}
                      >
                        ✏️ Edit name
                      </button>
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Image Preview Modal */}
      <ImagePreviewModal />

      {/* MAC Name Manager Page/Overlay */}
      {showMacManager && <MacNameManager />}
      
      {/* Device UUID Name Manager Page/Overlay */}
      {showDeviceManager && <DeviceUUIDNameManager />}
    </>
  );
}