require("dotenv").config();

const express = require("express");
const session = require("express-session");
const bcrypt = require("bcryptjs");
const mysql = require("mysql2/promise");
const path = require("path");

const app = express();
const PORT = Number(process.env.PORT || 3000);

const pool = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME || "cloud_attack_db",
  waitForConnections: true,
  connectionLimit: 10,
  dateStrings: true
});

app.use(express.json({ limit: "10mb" }));




app.use(express.urlencoded({ extended: true, limit: "10mb" }));

app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: false,
    sameSite: "lax"
  }
}));

app.use(express.static(path.join(__dirname, "public")));

function requireLogin(req, res, next) {
  if (!req.session || !req.session.user) {
    return res.status(401).json({
      error: "Please log in."
    });
  }

  next();
}

function requireAdmin(req, res, next) {
  if (!req.session || !req.session.user) {
    return res.status(401).json({
      error: "Please log in."
    });
  }

  if (req.session.user.role !== "ADMIN") {
    return res.status(403).json({
      error: "Administrator access required."
    });
  }

  next();
}

const FASTAPI_URL = process.env.FASTAPI_URL || "http://127.0.0.1:8010";

// Semantic search - Express to FastAPI to ChromaDB
app.post("/api/search", requireLogin, async (req, res) => {
  try {
    const { query, limit = 5 } = req.body || {};

    if (typeof query !== "string" || query.trim().length < 2) {
      return res.status(400).json({
        error: "Please enter a valid search query."
      });
    }

    const searchLimit = Number(limit);

    if (!Number.isInteger(searchLimit) || searchLimit < 1 || searchLimit > 20) {
      return res.status(400).json({
        error: "Search limit must be between 1 and 20."
      });
    }

    const response = await fetch(`${FASTAPI_URL}/search`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        query: query.trim(),
        limit: searchLimit
      }),
      signal: AbortSignal.timeout(15000)
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(502).json({
        error: data.detail || "Semantic search failed."
      });
    }

    return res.json(data);

  } catch (error) {
    console.error("Semantic search error:", error);

    return res.status(502).json({
      error: "Unable to connect to ChromaDB search service."
    });
  }
});

// Semantic search endpoint


app.get("/api/health", async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT 1 AS database_connected");
    res.json({ status: "ok", database: rows[0].database_connected === 1 });
  } catch (err) {
    res.status(500).json({ status: "error", message: "Database connection failed." });
  }
});


app.post("/api/login", async (req, res) => {
  
  try {
    const { username, password } = req.body || {};

    if (
      typeof username !== "string" ||
      typeof password !== "string"
    ) {
      return res.status(400).json({
        error: "Username and password are required."
      });
    }

    const [rows] = await pool.execute(
      `SELECT user_id, username, password_hash, app_role
       FROM app_users
       WHERE username = ?`,
      [username.trim()]
    );

    if (!rows.length) {
      return res.status(401).json({
        error: "Invalid username or password."
      });
    }

    const user = rows[0];

    if (
      !["ADMIN", "ANALYST"].includes(user.app_role) ||
      !(await bcrypt.compare(password, user.password_hash))
    ) {
      return res.status(401).json({
        error: "Invalid username or password."
      });
    }

    req.session.regenerate(err => {
      if (err) {
        console.error("Session regeneration failed:", err);
        return res.status(500).json({
          error: "Could not establish secure session."
        });
      }

      req.session.user = {
        id: user.user_id,
        username: user.username,
        role: user.app_role
      };

      req.session.save(err => {
        if (err) {
          console.error("Session save failed:", err);
          return res.status(500).json({
            error: "Could not save login session."
          });
        }

        return res.json({
          message: "Login successful.",
          user: req.session.user
        });
      });
    });

  } catch (err) {
    console.error("Login error:", err);

    res.status(500).json({
      error: "Login failed."
    });
  }
});


app.post("/api/logout", (req, res) => {
  req.session.destroy(err => {
    if (err) {
      return res.status(500).json({
        error: "Logout failed."
      });
    }

    res.clearCookie("connect.sid");
    res.json({ message: "Logged out successfully." });
  });
});

app.get("/api/me", requireLogin, (req, res) => {
  res.json({ user: req.session.user });
});

app.get("/api/dashboard", requireLogin, async (req, res) => {
  try {
    const [[events]] = await pool.query(
      "SELECT COUNT(*) AS total FROM audit_events"
    );

    const [[incidents]] = await pool.query(
      "SELECT COUNT(*) AS total FROM incidents"
    );

    const [[critical]] = await pool.query(
      "SELECT COUNT(*) AS total FROM incidents WHERE severity = 'CRITICAL'"
    );

    const [[notes]] = await pool.query(
      "SELECT COUNT(*) AS total FROM investigation_notes"
    );

    const [recentEvents] = await pool.query(
      "SELECT * FROM audit_events ORDER BY event_time DESC LIMIT 10"
    );

    res.json({
      metrics: {
        auditEvents: events.total,
        incidents: incidents.total,
        criticalIncidents: critical.total,
        notes: notes.total
      },
      recentEvents
    });
  } catch (err) {
    console.error("Dashboard error:", err);
    res.status(500).json({
      error: "Could not load dashboard."
    });
  }
});



app.get("/api/events", requireLogin, async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT event_id, dataset_name, source_event_id, event_time, provider,
       actor, source_ip, action_name, resource_name, outcome, severity, imported_at
       FROM audit_events ORDER BY imported_at DESC LIMIT 500`
    );
    res.json({ events: rows });
  } catch (err) {
    res.status(500).json({ error: "Could not load events." });
  }
});

app.get("/api/incidents", requireLogin, async (req, res) => {
  try {
    const [rows] = await pool.query(
      "SELECT * FROM v_incident_summary ORDER BY created_at DESC"
    );
    res.json({ incidents: rows });
  } catch (err) {
    res.status(500).json({ error: "Could not load incidents." });
  }
});

// Retrieve audit events linked to a specific incident
app.get("/api/incidents/:incidentId/events", requireLogin, async (req, res) => {
  try {
    const incidentId = Number(req.params.incidentId);

    if (!Number.isInteger(incidentId) || incidentId <= 0) {
      return res.status(400).json({
        error: "Invalid incident ID."
      });
    }

    const [rows] = await pool.execute(
      `SELECT
        ae.event_id,
        ae.event_time,
        ae.provider,
        ae.actor,
        ae.source_ip,
        ae.action_name,
        ae.resource_name,
        ae.outcome,
        ae.severity
       FROM incident_events ie
       JOIN audit_events ae
         ON ie.event_id = ae.event_id
       WHERE ie.incident_id = ?
       ORDER BY ae.event_time ASC`,
      [incidentId]
    );

    res.json({ events: rows });

  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: "Could not load incident evidence."
    });
  }
});


app.post("/api/incidents", requireLogin, async (req, res) => {
  try {
    const { title, description, severity } = req.body || {};
    const allowed = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];
    if (!title || !allowed.includes(severity)) {
      return res.status(400).json({ error: "A title and valid severity are required." });
    }

    const [result] = await pool.execute(
      "INSERT INTO incidents (title, description, severity, created_by) VALUES (?, ?, ?, ?)",
      [title, description || "", severity, req.session.user.id]
    );
    res.status(201).json({ message: "Incident created.", incidentId: result.insertId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Could not create incident." });
  }
});

app.get("/api/notes/:incidentId", requireLogin, async (req, res) => {
  try {
    const [rows] = await pool.execute(
      `SELECT n.note_id, n.note_text, n.created_at, u.username
       FROM investigation_notes n
       LEFT JOIN app_users u ON n.user_id = u.user_id
       WHERE n.incident_id = ? ORDER BY n.created_at DESC`,
      [req.params.incidentId]
    );
    res.json({ notes: rows });
  } catch (err) {
    res.status(500).json({ error: "Could not load notes." });
  }
});

app.post("/api/notes", requireLogin, async (req, res) => {
  try {
    const { incidentId, noteText } = req.body || {};
    if (!incidentId || !noteText || !noteText.trim()) {
      return res.status(400).json({ error: "Incident and note text are required." });
    }
    await pool.execute(
      "INSERT INTO investigation_notes (incident_id, user_id, note_text) VALUES (?, ?, ?)",
      [incidentId, req.session.user.id, noteText.trim()]
    );
    res.status(201).json({ message: "Investigation note saved." });
  } catch (err) {
    res.status(500).json({ error: "Could not save note. Check that the incident exists." });
  }
});

// Admin-only import. Accepts a JSON array of normalized audit-event objects.
app.post("/api/import", requireAdmin, async (req, res) => {
  const { datasetName, records } = req.body || {};
  if (!datasetName || !Array.isArray(records) || records.length === 0) {
    return res.status(400).json({ error: "Provide datasetName and a non-empty records array." });
  }
  if (records.length > 5000) {
    return res.status(400).json({ error: "Maximum 5000 records per import." });
  }

  const conn = await pool.getConnection();
  let inserted = 0;
  let skipped = 0;

  try {
    await conn.beginTransaction();
    for (const r of records) {
      if (!r || typeof r !== "object") {
        skipped++;
        continue;
      }

      const severity = ["LOW", "MEDIUM", "HIGH", "CRITICAL"].includes(
        String(r.severity || "").toUpperCase()
      ) ? String(r.severity).toUpperCase() : "MEDIUM";

      const [result] = await conn.execute(
        `INSERT IGNORE INTO audit_events
        (dataset_name, source_event_id, event_time, provider, actor, source_ip,
         action_name, resource_name, outcome, severity, raw_event)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CAST(? AS JSON))`,
        [
          datasetName,
          r.event_id || r.id || null,
          r.timestamp || r.event_time || null,
          r.provider || null,
          r.actor || r.user || null,
          r.source_ip || r.ip_address || null,
          r.action || r.action_name || null,
          r.resource || r.resource_name || null,
          r.outcome || r.status || null,
          severity,
          JSON.stringify(r)
        ]
      );

      if (result.affectedRows === 1) inserted++;
      else skipped++;
    }

    await conn.commit();
    res.json({ message: "Import completed.", inserted, skipped });
  } catch (err) {
    await conn.rollback();
    console.error(err);
    res.status(500).json({ error: "Import failed. Check the dataset fields and date formats." });
  } finally {
    conn.release();
  }
});


// Admin-only: retrieve registered users
app.get("/api/users", requireAdmin, async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT user_id, username, app_role, created_at
       FROM app_users
       ORDER BY user_id`
    );

    res.json({ users: rows });

  } catch (err) {
    console.error("User listing error:", err);

    res.status(500).json({
      error: "Could not retrieve users."
    });
  }
});

// Admin-only: create a new user
app.post("/api/users", requireAdmin, async (req, res) => {
  try {
    const { username, password, role } = req.body || {};

    if (
      typeof username !== "string" ||
      !/^[a-zA-Z0-9_.-]{3,80}$/.test(username.trim())
    ) {
      return res.status(400).json({
        error: "Username must be 3-80 characters and contain only letters, numbers, dots, underscores or hyphens."
      });
    }

    if (typeof password !== "string" || password.length < 12) {
      return res.status(400).json({
        error: "Password must contain at least 12 characters."
      });
    }

    if (!["ADMIN", "ANALYST"].includes(role)) {
      return res.status(400).json({
        error: "Role must be ADMIN or ANALYST."
      });
    }

    const hash = await bcrypt.hash(password, 12);

    const [result] = await pool.execute(
      `INSERT INTO app_users
       (username, password_hash, app_role)
       VALUES (?, ?, ?)`,
      [username.trim(), hash, role]
    );

    res.status(201).json({
      message: "User created successfully.",
      user: {
        id: result.insertId,
        username: username.trim(),
        role
      }
    });

  } catch (err) {
    if (err.code === "ER_DUP_ENTRY") {
      return res.status(409).json({
        error: "Username already exists."
      });
    }

    console.error("User creation error:", err);

    res.status(500).json({
      error: "Could not create user."
    });
  }
});

  

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: "Unexpected server error." });
});

async function start() {
  if (!process.env.SESSION_SECRET || !process.env.DB_USER || !process.env.DB_PASSWORD) {
    console.error("Missing configuration. Run scripts/setup.ps1 first.");
    process.exit(1);
  }
  await pool.query("SELECT 1");
  app.listen(PORT, () => {
    console.log(`Cloud Attack Reconstruction running at http://localhost:${PORT}`);
  });
}

start().catch(err => {
  console.error("Startup failed:", err.message);
  process.exit(1);
});