// server.js
// Simple Express backend with SQLite, CRUD, third-party fetch, and aggregation.
// Run: node server.js
const express = require("express");
const sqlite = require("sqlite3").verbose();
const path = require("path");
const cors = require("cors");
const axios = require("axios");

const app = express();
app.use(express.json());
app.use(cors());

// Simple SQLite DB file in the same folder
const DB_FILE = path.join(__dirname, "data.db");
const db = new sqlite.Database(DB_FILE);

// Create table if not exists
db.serialize(() => {
  db.run(
    `CREATE TABLE IF NOT EXISTS device_usage (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      device_name TEXT NOT NULL,
      value REAL NOT NULL,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    )`
  );
});

// --- CRUD Endpoints ---

// Create
app.post("/api/device-usage", (req, res) => {
  const { device_name, value } = req.body;
  if (!device_name || value === undefined) {
    return res.status(400).json({ error: "device_name and value required" });
  }
  const stmt = db.prepare("INSERT INTO device_usage (device_name, value) VALUES (?, ?)");
  stmt.run(device_name, value, function (err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ id: this.lastID, device_name, value });
  });
  stmt.finalize();
});

// Read all
app.get("/api/device-usage", (req, res) => {
  db.all("SELECT * FROM device_usage ORDER BY timestamp DESC", (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// Read single
app.get("/api/device-usage/:id", (req, res) => {
  db.get("SELECT * FROM device_usage WHERE id = ?", [req.params.id], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.status(404).json({ error: "Not found" });
    res.json(row);
  });
});

// Update
app.put("/api/device-usage/:id", (req, res) => {
  const { device_name, value } = req.body;
  db.run(
    "UPDATE device_usage SET device_name = ?, value = ? WHERE id = ?",
    [device_name, value, req.params.id],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      if (this.changes === 0) return res.status(404).json({ error: "Not found" });
      res.json({ id: +req.params.id, device_name, value });
    }
  );
});

// Delete
app.delete("/api/device-usage/:id", (req, res) => {
  db.run("DELETE FROM device_usage WHERE id = ?", [req.params.id], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    if (this.changes === 0) return res.status(404).json({ error: "Not found" });
    res.json({ deleted: +req.params.id });
  });
});

// --- Aggregation endpoint for charting ---
app.get("/api/report", (req, res) => {
  // sum values grouped by device_name
  db.all(
    "SELECT device_name, SUM(value) as total FROM device_usage GROUP BY device_name ORDER BY total DESC",
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows); // [{device_name, total}, ...]
    }
  );
});

// --- Third-party API integration example ---
app.get("/api/external-posts", async (req, res) => {
  try {
    // example: JSONPlaceholder posts (public)
    const r = await axios.get("https://jsonplaceholder.typicode.com/posts");
    // return first 5 titles only
    const sample = (r.data || []).slice(0, 5).map((p) => ({ id: p.id, title: p.title }));
    res.json({ count: r.data.length, sample });
  } catch (err) {
    res.status(502).json({ error: "Failed to fetch external posts", details: err.message });
  }
});

// Health
app.get("/api/health", (req, res) => res.json({ status: "ok" }));

// Start
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
