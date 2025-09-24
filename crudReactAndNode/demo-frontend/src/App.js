// import logo from './logo.svg';
// import './App.css';

// function App() {
//   return (
//     <div className="App">
//       <header className="App-header">
//         <img src={logo} className="App-logo" alt="logo" />
//         <p>
//           Edit <code>src/App.js</code> and save to reload.
//         </p>
//         <a
//           className="App-link"
//           href="https://reactjs.org"
//           target="_blank"
//           rel="noopener noreferrer"
//         >
//           Learn React
//         </a>
//       </header>
//     </div>
//   );
// }

// export default App;


// App.js
import React, { useEffect, useState, useRef } from "react";
import Chart from "chart.js/auto";

const API_BASE = process.env.REACT_APP_API_BASE || "http://localhost:4000/api";

function App() {
  const [records, setRecords] = useState([]);
  const [device, setDevice] = useState("");
  const [value, setValue] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [externalSample, setExternalSample] = useState([]);
  const chartRef = useRef(null);
  const chartInstance = useRef(null);

  // load records
  const loadRecords = async () => {
    try {
      const r = await fetch(`${API_BASE}/device-usage`);
      const json = await r.json();
      setRecords(json);
    } catch (e) {
      console.error("loadRecords error", e);
    }
  };

  // create or update
  const submit = async (e) => {
    e.preventDefault();
    const payload = { device_name: device, value: parseFloat(value || 0) };
    try {
      if (editingId) {
        await fetch(`${API_BASE}/device-usage/${editingId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        setEditingId(null);
      } else {
        await fetch(`${API_BASE}/device-usage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }
      setDevice("");
      setValue("");
      loadRecords();
      loadReportAndDrawChart();
    } catch (err) {
      console.error(err);
    }
  };

  const edit = (r) => {
    setEditingId(r.id);
    setDevice(r.device_name);
    setValue(r.value);
  };

  const del = async (id) => {
    if (!window.confirm("Delete this record?")) return;
    await fetch(`${API_BASE}/device-usage/${id}`, { method: "DELETE" });
    loadRecords();
    loadReportAndDrawChart();
  };

  // fetch external API sample
  const fetchExternal = async () => {
    try {
      const r = await fetch(`${API_BASE}/external-posts`);
      const j = await r.json();
      setExternalSample(j.sample || []);
    } catch (e) {
      console.error("external fetch", e);
    }
  };

  // load aggregated report and draw chart
  const loadReportAndDrawChart = async () => {
    try {
      const r = await fetch(`${API_BASE}/report`);
      const j = await r.json(); // [{device_name, total}, ...]
      const labels = j.map((x) => x.device_name);
      const values = j.map((x) => x.total);

      const ctx = chartRef.current.getContext("2d");
      if (chartInstance.current) chartInstance.current.destroy();
      chartInstance.current = new Chart(ctx, {
        type: "bar",
        data: {
          labels,
          datasets: [
            {
              label: "Total value",
              data: values,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
        },
      });
    } catch (e) {
      console.error("chart error", e);
    }
  };

  useEffect(() => {
    loadRecords();
    loadReportAndDrawChart();
    // cleanup on unmount
    return () => {
      if (chartInstance.current) chartInstance.current.destroy();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div style={{ maxWidth: 900, margin: "20px auto", fontFamily: "Arial, sans-serif" }}>
      <h2>Simple Device Usage App (React + Node)</h2>

      <section style={{ border: "1px solid #ddd", padding: 12, marginBottom: 12 }}>
        <h3>{editingId ? "Edit record" : "Add record"}</h3>
        <form onSubmit={submit} style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <input
            required
            placeholder="Device name"
            value={device}
            onChange={(e) => setDevice(e.target.value)}
            style={{ padding: 8, flex: 2 }}
          />
          <input
            required
            placeholder="Value (e.g., kWh)"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            style={{ padding: 8, width: 140 }}
            type="number"
            step="any"
          />
          <button style={{ padding: "8px 12px" }}>{editingId ? "Update" : "Create"}</button>
          {editingId && <button onClick={() => { setEditingId(null); setDevice(""); setValue(""); }} type="button">Cancel</button>}
        </form>
      </section>

      <section style={{ display: "flex", gap: 12 }}>
        <div style={{ flex: 1 }}>
          <h3>Records</h3>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={{ borderBottom: "1px solid #ccc", textAlign: "left", padding: 6 }}>Device</th>
                <th style={{ borderBottom: "1px solid #ccc", textAlign: "right", padding: 6 }}>Value</th>
                <th style={{ borderBottom: "1px solid #ccc", padding: 6 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {records.map((r) => (
                <tr key={r.id}>
                  <td style={{ padding: 6 }}>{r.device_name}</td>
                  <td style={{ padding: 6, textAlign: "right" }}>{Number(r.value).toFixed(2)}</td>
                  <td style={{ padding: 6 }}>
                    <button onClick={() => edit(r)} style={{ marginRight: 8 }}>Edit</button>
                    <button onClick={() => del(r.id)}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div style={{ width: 420 }}>
          <h3>Report (bar chart)</h3>
          <div style={{ height: 260 }}>
            <canvas ref={chartRef}></canvas>
          </div>
          <div style={{ marginTop: 12 }}>
            <button onClick={loadReportAndDrawChart} style={{ marginRight: 8 }}>Refresh Chart</button>
            <button onClick={fetchExternal}>Fetch External Sample</button>
          </div>

          {externalSample.length > 0 && (
            <div style={{ marginTop: 10 }}>
              <h4>External API sample (titles)</h4>
              <ol>
                {externalSample.map((p) => <li key={p.id}>{p.title}</li>)}
              </ol>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

export default App;
