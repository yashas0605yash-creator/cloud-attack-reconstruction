const $ = id => document.getElementById(id);
function on(id, event, handler) {
  const element = $(id);

  if (!element) {
    console.warn(`HTML element #${id} was not found.`);
    return;
  }

  element.addEventListener(event, handler);
}

async function api(url, options = {}) {
  const response = await fetch(url, {
    credentials: "same-origin",
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    ...options
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "Request failed");
  return data;
}

function table(headers, rows) {
  if (!rows.length) return "<p class='muted'>No records available.</p>";
  return `<div style="overflow-x:auto"><table><thead><tr>${headers.map(h => `<th>${h}</th>`).join("")}</tr></thead><tbody>${
    rows.map(row => `<tr>${row.map(v => `<td>${escapeHtml(v ?? "")}</td>`).join("")}</tr>`).join("")
  }</tbody></table></div>`;
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, c => ({
    "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;"
  }[c]));
}

function showPage(name) {
  document.querySelectorAll("#appPanel .page").forEach(page => {
    page.hidden = page.id !== name;
  });

  document.querySelectorAll("#appPanel nav button").forEach(button => {
    button.classList.toggle(
      "active",
      button.dataset.page === name
    );
  });
}

async function refreshDashboard() {
  const d = await api("/api/dashboard");
  $("metricEvents").textContent = d.metrics.auditEvents;
  $("metricIncidents").textContent = d.metrics.incidents;
  $("metricCritical").textContent = d.metrics.criticalIncidents;
  $("metricNotes").textContent = d.metrics.notes;
  $("recentEvents").innerHTML = table(
    ["ID","Time","Provider","Actor","Action","Severity"],
    d.recentEvents.map(e => [e.event_id,e.event_time,e.provider,e.actor,e.action_name,e.severity])
  );
}

async function refreshEvents() {
  const d = await api("/api/events");
  $("eventsTable").innerHTML = table(
    ["ID","Dataset","Source ID","Time","Provider","Actor","IP","Action","Resource","Outcome","Severity"],
    d.events.map(e => [e.event_id,e.dataset_name,e.source_event_id,e.event_time,e.provider,e.actor,e.source_ip,e.action_name,e.resource_name,e.outcome,e.severity])
  );
}

async function searchAuditEvents(query, limit) {
  const resultsContainer = $("searchResults");
  resultsContainer.innerHTML = "";

  const data = await api("/api/search", {
    method: "POST",
    body: JSON.stringify({
      query,
      limit
    })
  });

  const results = data.results || [];

  $("searchMessage").textContent =
    `Found ${results.length} matching events.`;

  if (!results.length) {
    resultsContainer.textContent =
      data.message || "No matching events found.";
    return;
  }

  resultsContainer.innerHTML = results.map(result => `
    <article class="panel">
      <h3>Event ID: ${escapeHtml(result.event_id)}</h3>

      <p>${escapeHtml(result.document)}</p>

      <p>
        <strong>Cosine distance:</strong>
        ${Number(result.distance).toFixed(4)}
      </p>

      <p>
        <strong>Metadata:</strong>
        ${escapeHtml(JSON.stringify(result.metadata || {}))}
      </p>
    </article>
  `).join("");
}

on("searchForm", "submit", async event => {
  event.preventDefault();

  const query = $("searchQuery").value.trim();
  const limit = Number($("searchLimit").value);

  if (query.length < 2) {
    $("searchMessage").textContent =
      "Enter at least two characters.";
    return;
  }

  $("searchButton").disabled = true;
  $("searchButton").textContent = "Searching...";
  $("searchMessage").textContent = "Searching audit events...";

  try {
    await searchAuditEvents(query, limit);
  } catch (error) {
    $("searchMessage").textContent =
      error.message || "Search failed.";

  } finally {
    $("searchButton").disabled = false;
    $("searchButton").textContent = "Search Events";
  }
});

async function refreshIncidents() {
  const d = await api("/api/incidents");
  $("incidentsTable").innerHTML = table(
    ["ID","Title","Severity","Status","Linked events","Created"],
    d.incidents.map(i => [i.incident_id,i.title,i.severity,i.status,i.linked_event_count,i.created_at])
  );
}


async function refreshIncidentEvidence(incidentId) {
  const d = await api(`/api/incidents/${incidentId}/events`);

  const container = $("incidentEvidence");

  container.innerHTML = table(
    [
      "Event ID",
      "Time",
      "Provider",
      "Action",
      "Actor",
      "Source IP",
      "Severity"
    ],
    d.events.map(e => [
      e.event_id,
      e.event_time,
      e.provider,
      e.action_name,
      e.actor,
      e.source_ip,
      e.severity
    ])
  );
}


async function enterApp(user) {
  try {
    if (!user || !user.id || !user.role) {
      throw new Error("Invalid user session. Please log in again.");
    }

    const isAdmin = user.role === "ADMIN";

    // Display application
    $("loginPanel").hidden = true;
    $("appPanel").hidden = false;

    $("userArea").innerHTML =
      `${escapeHtml(user.username)} (${escapeHtml(user.role)})
       <button id="logoutButton">Logout</button>`;

    // Logout
    $("logoutButton").onclick = async () => {
      try {
        await api("/api/logout", {
          method: "POST",
          body: "{}"
        });
        location.reload();
      } catch (error) {
        alert(error.message);
      }
    };

    // Role-based navigation
    $("usersNav").hidden = !isAdmin;
    $("users").hidden = true;

    document.querySelector('[data-page="import"]').hidden = !isAdmin;
    $("import").hidden = !isAdmin;

    // Navigation handlers
    document.querySelectorAll("nav button").forEach(button => {
      button.onclick = async () => {
        const page = button.dataset.page;

        if (
          (page === "users" || page === "import") &&
          !isAdmin
        ) {
          return;
        }

        showPage(page);

        try {
          if (page === "dashboard") await refreshDashboard();
          if (page === "events") await refreshEvents();
          if (page === "incidents") await refreshIncidents();
          if (page === "users") {
            $("users").hidden = false;
            await refreshUsers();
            }
        } catch (error) {
          console.error("Page loading error:", error);
          alert("Could not load " + page + ": " + error.message);
        }
      };
    });

    // Show dashboard BEFORE loading dashboard data
    showPage("dashboard");

    try {
      await refreshDashboard();
    } catch (error) {
      console.error("Dashboard loading error:", error);

      const dashboard = $("dashboard");
      if (dashboard) {
        dashboard.insertAdjacentHTML(
          "beforeend",
          `<p class="message">Dashboard data could not load: ${escapeHtml(error.message)}</p>`
        );
      }
    }

  } catch (error) {
    console.error("Application initialization error:", error);
    alert(error.message);
  }
}




on("loginForm", "submit", async e => {
  e.preventDefault();

  const message = $("loginMessage");
  if (message) message.textContent = "";

  try {
    const username = $("username")?.value.trim();
    const password = $("password")?.value;

    if (!username || !password) {
      throw new Error("Enter your username and password.");
    }

    const data = await api("/api/login", {
      method: "POST",
      body: JSON.stringify({ username, password })
    });

    await enterApp(data.user);

  } catch (error) {
    console.error("Login error:", error);

    if (message) {
      message.textContent = error.message;
    } else {
      alert(error.message);
    }
  }
});


on("incidentForm", "submit", async e => {
  e.preventDefault();
  try {
    await api("/api/incidents", {
      method:"POST",
      body:JSON.stringify({
        title:$("incidentTitle").value,
        severity:$("incidentSeverity").value,
        description:$("incidentDescription").value
      })
    });
    $("incidentForm").reset();
    $("incidentMessage").textContent = "Incident created.";
    await refreshIncidents();
    await refreshDashboard();
  } catch (err) { $("incidentMessage").textContent = err.message; }
});

on("noteForm", "submit", async e => {
  e.preventDefault();
  try {
    await api("/api/notes", {
      method:"POST",
      body:JSON.stringify({
        incidentId:$("noteIncidentId").value,
        noteText:$("noteText").value
      })
    });
    $("incidentMessage").textContent = "Note saved.";
    $("noteForm").reset();
    await refreshDashboard();
  } catch (err) { $("incidentMessage").textContent = err.message; }
});

on("importButton", "click", async () => {
  const file = $("jsonFile").files[0];
  if (!file || !$("datasetName").value.trim()) {
    $("importMessage").textContent = "Enter a dataset name and choose a JSON file.";
    return;
  }
  try {
    const records = JSON.parse(await file.text());
    const result = await api("/api/import", {
      method:"POST",
      body:JSON.stringify({ datasetName:$("datasetName").value.trim(), records })
    });
    $("importMessage").textContent = `Import complete. Inserted: ${result.inserted}; skipped: ${result.skipped}.`;
    await refreshDashboard();
  } catch (err) { $("importMessage").textContent = err.message; }
});

(async () => {
  try {
    const d = await api("/api/me");
    await enterApp(d.user);
  } catch (_) {
    $("loginPanel").hidden = false;
    $("appPanel").hidden = true;
  }
})();

on("loadEvidenceButton", "click", async () => {
  try {
    const incidentId = $("evidenceIncidentId").value;

    await refreshIncidentEvidence(incidentId);
  } catch (err) {
    $("incidentEvidence").textContent = err.message;
  }
});


async function refreshUsers() {
  const container = $("usersTable");
  const message = $("userMessage");

  container.innerHTML = "<p>Loading users...</p>";

  try {
    const data = await api("/api/users");

    if (!data.users || data.users.length === 0) {
      container.innerHTML =
        "<p class='muted'>No registered users found.</p>";
      return;
    }

    container.innerHTML = table(
      ["ID", "Username", "Role", "Created"],
      data.users.map(user => [
        user.user_id,
        user.username,
        user.app_role,
        user.created_at
      ])
    );

    if (message) message.textContent = "";

  } catch (error) {
    container.innerHTML =
      `<p class="message">${escapeHtml(error.message)}</p>`;

    console.error("User loading failed:", error);
  }
}


on("userForm", "submit", async event => {
  event.preventDefault();

  const message = $("userMessage");

  try {
    const result = await api("/api/users", {
      method: "POST",
      body: JSON.stringify({
        username: $("newUsername").value.trim(),
        password: $("newPassword").value,
        role: $("newRole").value
      })
    });

    message.textContent = result.message;

    $("userForm").reset();

    await refreshUsers();

  } catch (error) {
    message.textContent = error.message;
  }
});