

import { useEffect, useState } from "react";

export default function ViewScreenshots() {
  const [data, setData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filter states
  const [userFilter, setUserFilter] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [osFilter, setOsFilter] = useState("");
  const [browserFilter, setBrowserFilter] = useState("");
  const [macFilter, setMacFilter] = useState("");

  // Fetch screenshots
  const fetchScreenshots = async () => {
    try {
      setLoading(true);
      const res = await fetch("https://screenshot-chapter.onrender.com/screenshots");
      const json = await res.json();
      setData(json.screenshots || []);
      setFilteredData(json.screenshots || []);
    } catch (error) {
      console.error("Error fetching screenshots:", error);
    } finally {
      setLoading(false);
    }
  };

  // Apply filters
  useEffect(() => {
    let filtered = data;

    if (userFilter) {
      filtered = filtered.filter(item =>
        item.userId.toLowerCase().includes(userFilter.toLowerCase())
      );
    }
    if (dateFilter) {
      filtered = filtered.filter(item => {
        const itemDate = new Date(item.createdAt).toLocaleDateString();
        return itemDate === dateFilter;
      });
    }
    if (osFilter) {
      filtered = filtered.filter(item =>
        item.deviceInfo?.os?.toLowerCase().includes(osFilter.toLowerCase())
      );
    }
    if (browserFilter) {
      filtered = filtered.filter(item =>
        item.deviceInfo?.browser?.toLowerCase().includes(browserFilter.toLowerCase())
      );
    }
    if (macFilter) {
      filtered = filtered.filter(item =>
        item.serverMac?.toLowerCase().includes(macFilter.toLowerCase())
      );
    }

    setFilteredData(filtered);
  }, [userFilter, dateFilter, osFilter, browserFilter, macFilter, data]);

  // Unique values for dropdowns
  const uniqueUsers = [...new Set(data.map(item => item.userId))];
  const uniqueOS = [...new Set(data.map(item => item.deviceInfo?.os).filter(Boolean))];
  const uniqueBrowsers = [...new Set(data.map(item => item.deviceInfo?.browser).filter(Boolean))];
  const uniqueDates = [...new Set(data.map(item => new Date(item.createdAt).toLocaleDateString()))];
  const uniqueMACs = [...new Set(data.map(item => item.serverMac).filter(Boolean))];

  const clearFilters = () => {
    setUserFilter("");
    setDateFilter("");
    setOsFilter("");
    setBrowserFilter("");
    setMacFilter("");
  };

  useEffect(() => {
    fetchScreenshots();
  }, []);

  if (loading) {
    return (
      <div style={{ padding: "20px", textAlign: "center" }}>
        <h2>Loading screenshots...</h2>
      </div>
    );
  }

  return (
    <div style={{ padding: "20px", maxWidth: "1400px", margin: "0 auto", fontFamily: "Arial, sans-serif" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "15px", marginBottom: "30px" }}>
        <div>
          <h1>📸 Screenshot Gallery</h1>
          <p>{filteredData.length} of {data.length} screenshots displayed</p>
        </div>
        <button onClick={fetchScreenshots} style={{ padding: "10px 20px", backgroundColor: "#3498db", color: "white", border: "none", borderRadius: "8px", cursor: "pointer" }}>🔄 Refresh</button>
      </div>

      {/* Filters */}
      <div style={{ backgroundColor: "#f8f9fa", padding: "20px", borderRadius: "12px", marginBottom: "30px", border: "1px solid #e9ecef" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "15px", flexWrap: "wrap", gap: "10px" }}>
          <h3>🔍 Filters</h3>
          <button onClick={clearFilters} style={{ padding: "6px 12px", backgroundColor: "#95a5a6", color: "white", border: "none", borderRadius: "6px", cursor: "pointer", fontSize: "12px" }}>Clear All</button>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "15px" }}>
          <div>
            <label>User</label>
            <select value={userFilter} onChange={(e) => setUserFilter(e.target.value)} style={{ width: "100%", padding: "8px", borderRadius: "6px" }}>
              <option value="">All Users</option>
              {uniqueUsers.map(u => <option key={u} value={u}>{u}</option>)}
            </select>
          </div>

          <div>
            <label>Date</label>
            <select value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} style={{ width: "100%", padding: "8px", borderRadius: "6px" }}>
              <option value="">All Dates</option>
              {uniqueDates.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>

          <div>
            <label>OS</label>
            <select value={osFilter} onChange={(e) => setOsFilter(e.target.value)} style={{ width: "100%", padding: "8px", borderRadius: "6px" }}>
              <option value="">All OS</option>
              {uniqueOS.map(os => <option key={os} value={os}>{os}</option>)}
            </select>
          </div>

          <div>
            <label>Browser</label>
            <select value={browserFilter} onChange={(e) => setBrowserFilter(e.target.value)} style={{ width: "100%", padding: "8px", borderRadius: "6px" }}>
              <option value="">All Browsers</option>
              {uniqueBrowsers.map(b => <option key={b} value={b}>{b}</option>)}
            </select>
          </div>

          <div>
            <label>Server MAC</label>
            <select value={macFilter} onChange={(e) => setMacFilter(e.target.value)} style={{ width: "100%", padding: "8px", borderRadius: "6px" }}>
              <option value="">All MACs</option>
              {uniqueMACs.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Screenshots Grid */}
      {filteredData.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 20px", color: "#7f8c8d" }}>
          <div style={{ fontSize: "48px", marginBottom: "20px" }}>📷</div>
          <h3>No screenshots found</h3>
          <p>Try adjusting your filters or upload new screenshots.</p>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(350px, 1fr))", gap: "25px" }}>
          {filteredData.map((item) => (
            <div key={item._id} style={{ border: "1px solid #e1e8ed", borderRadius: "16px", padding: "20px", background: "linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)" }}>
              <div style={{ borderRadius: "12px", overflow: "hidden", marginBottom: "15px" }}>
                              <a href={item.driveURL} target="_blank" rel="noreferrer" style={{ color: "blue" }}>View Full Image</a>

                {/* <img src={item.fileName} alt={item.fileName} style={{ width: "100%", height: "200px", objectFit: "cover" }} /> */}
              </div>
              <h4>User: {item.userId}</h4>
              <p><b>File:</b> {item.fileName}</p>
              <p><b>Date:</b> {new Date(item.createdAt).toLocaleString()}</p>
              {item.deviceInfo && (
                <div>
                  {item.deviceInfo.os && <p><b>OS:</b> {item.deviceInfo.os}</p>}
                  {item.deviceInfo.browser && <p><b>Browser:</b> {item.deviceInfo.browser}</p>}
                  {item.deviceInfo.cpuThreads && <p><b>CPU Threads:</b> {item.deviceInfo.cpuThreads}</p>}
                  {item.deviceInfo.language && <p><b>Language:</b> {item.deviceInfo.language}</p>}
                  {item.deviceInfo.timezone && <p><b>Timezone:</b> {item.deviceInfo.timezone}</p>}
                  {item.deviceInfo.deviceMemory && <p><b>Memory:</b> {item.deviceInfo.deviceMemory} GB</p>}
                  {item.deviceInfo.screenResolution && (
                    <p><b>Resolution:</b> {item.deviceInfo.screenResolution.width} × {item.deviceInfo.screenResolution.height}</p>
                  )}
                </div>
              )}
              <p><b>Server MAC:</b> {item.serverMac}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
