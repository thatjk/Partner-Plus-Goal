"use strict";

const http = require("http");
const fs = require("fs");
const path = require("path");
const { URL } = require("url");

const PORT = Number(process.env.PORT || 8408);
const BUILD = "1.0.3";

const DEFAULT_CHANNEL = "powergpu";
const DEFAULT_CHANNEL_ID = "54276431";

const CLIENT_ID = "kimne78kx3ncx6brgo4mv6wki5h1ko";
const GQL_URL = "https://gql.twitch.tv/gql";
const USER_HASH = "bf6c594605caa0c63522f690156aa04bd434870bf963deb76668c381d16fcaa5";
const PLUS_HASH = "47af8e6f5ca964540743363dcd5c38e79b1a4375e42ba14b9a69b199c7302cee";

const CACHE_TTL = 60_000;
const UPSTREAM_TIMEOUT = 10_000;

const overlayPath = path.join(__dirname, "overlay.html");
const overlayTemplate = fs.readFileSync(overlayPath, "utf8");

const cache = new Map();
const inflight = new Map();
const rateLimits = new Map();
const startTime = Date.now();

// --------------------------------------------------
// GENERAL HELPERS
// --------------------------------------------------

function validLogin(login) {
  return typeof login === "string" &&
    /^[A-Za-z0-9_]{3,25}$/.test(login);
}

function send(res, status, body, contentType = "application/json; charset=utf-8", headers = {}) {
  const payload = typeof body === "string"
    ? body
    : JSON.stringify(body, null, 2);

  res.writeHead(status, {
    "Content-Type": contentType,
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
    ...headers
  });

  res.end(payload);
}

function pruneCache() {
  const now = Date.now();

  for (const [key, entry] of cache) {
    if (entry.expiresAt <= now) {
      cache.delete(key);
    }
  }
}

function clientIp(req) {
  return req.socket.remoteAddress || "unknown";
}

function allowRequest(ip) {
  const now = Date.now();
  let events = rateLimits.get(ip) || [];

  while (events.length && events[0] <= now - 60_000) {
    events.shift();
  }

  if (events.length >= 120) {
    rateLimits.set(ip, events);
    return false;
  }

  events.push(now);
  rateLimits.set(ip, events);

  if (rateLimits.size > 2000) {
    for (const [key, times] of rateLimits) {
      while (times.length && times[0] <= now - 60_000) {
        times.shift();
      }

      if (!times.length) {
        rateLimits.delete(key);
      }
    }
  }

  return true;
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[char]);
}

// --------------------------------------------------
// DASHBOARD
// --------------------------------------------------

function dashboardHtml() {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Twitch Plus Goal</title>

<style>
:root {
  color-scheme: dark;
  --bg: #090b12;
  --panel: #111522;
  --panel2: #171d2c;
  --border: #252d40;
  --text: #f0f2fa;
  --muted: #929bb0;
  --accent: #a970ff;
  --success: #42d69b;
}

* {
  box-sizing: border-box;
}

body {
  margin: 0;
  min-height: 100vh;
  padding: 45px 18px;
  background:
    radial-gradient(ellipse at 50% -15%, #302052 0%, transparent 55%),
    var(--bg);
  color: var(--text);
  font-family: Inter, "Segoe UI", Arial, sans-serif;
}

.container {
  width: 100%;
  max-width: 760px;
  margin: auto;
}

.header {
  text-align: center;
  margin-bottom: 30px;
}

.logo {
  width: 58px;
  height: 58px;
  border-radius: 18px;
  margin: 0 auto 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #b77aff, #7041d5);
  font-size: 28px;
  font-weight: 900;
  box-shadow: 0 10px 35px #8952e844;
}

h1 {
  font-size: 30px;
  margin: 0 0 9px;
  letter-spacing: -1px;
}

.subtitle {
  color: var(--muted);
  font-size: 14px;
  line-height: 1.6;
}

.panel {
  background: rgba(17, 21, 34, .96);
  border: 1px solid var(--border);
  border-radius: 17px;
  padding: 25px;
  box-shadow: 0 20px 70px #00000040;
}

.field {
  margin-bottom: 20px;
}

label {
  display: block;
  font-size: 12px;
  font-weight: 700;
  color: #c2c9da;
  margin-bottom: 9px;
  letter-spacing: .5px;
  text-transform: uppercase;
}

input, select {
  width: 100%;
  height: 46px;
  background: var(--panel2);
  color: var(--text);
  border: 1px solid var(--border);
  border-radius: 9px;
  padding: 0 13px;
  font-size: 14px;
  outline: none;
}

input:focus, select:focus {
  border-color: var(--accent);
  box-shadow: 0 0 0 3px #a970ff20;
}

select {
  cursor: pointer;
}

.row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 15px;
}

.output-box {
  background: #0b0e17;
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 15px;
  margin-top: 5px;
}

.output-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
  margin-bottom: 12px;
}

.output-header label {
  margin: 0;
}

.status {
  font-size: 11px;
  color: var(--success);
  font-weight: 800;
}

.url {
  width: 100%;
  min-height: 45px;
  padding: 12px;
  overflow-wrap: anywhere;
  word-break: break-all;
  line-height: 1.5;
  color: #c6a7ff;
  font-family: Consolas, monospace;
  font-size: 12px;
  background: #141a29;
  border: 1px solid #252d40;
  border-radius: 7px;
}

.actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  margin-top: 13px;
}

button {
  border: 0;
  border-radius: 8px;
  height: 44px;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  transition: .15s ease;
}

button:hover {
  transform: translateY(-1px);
  filter: brightness(1.1);
}

.primary {
  color: white;
  background: linear-gradient(135deg, #a970ff, #7544db);
}

.secondary {
  color: #e4e7f2;
  background: #252d40;
  border: 1px solid #343d52;
}

.preview-section {
  margin-top: 22px;
}

.preview-frame-wrap {
  background:
    radial-gradient(ellipse at center, #30364d 0%, #090b12 100%);
  border: 1px solid #252d40;
  border-radius: 12px;
  overflow: hidden;
  min-height: 260px;
}

#previewFrame {
  display: block;
  width: 100%;
  height: 260px;
  border: 0;
}

.info {
  margin-top: 22px;
  padding: 15px;
  background: #151b2a;
  border-radius: 9px;
  border: 1px solid #252d40;
}

.info-title {
  font-size: 12px;
  font-weight: 700;
  margin-bottom: 8px;
}

.info p {
  color: var(--muted);
  font-size: 12px;
  line-height: 1.6;
  margin: 0;
}

.footer {
  text-align: center;
  color: #687188;
  font-size: 11px;
  margin-top: 23px;
}

.hidden {
  display: none !important;
}

@media (max-width: 560px) {
  body {
    padding: 30px 13px;
  }

  .panel {
    padding: 18px;
  }

  .row {
    grid-template-columns: 1fr;
    gap: 0;
  }

  h1 {
    font-size: 26px;
  }
}
</style>
</head>

<body>
<div class="container">

  <div class="header">
    <div class="logo">+</div>
    <h1>Twitch Plus Goal</h1>
    <div class="subtitle">
      Generate API endpoints and OBS overlays for Twitch Partner Plus Goals.
    </div>
  </div>

  <div class="panel">

    <div class="field">
      <label for="channel">Twitch Channel</label>
      <input
        id="channel"
        type="text"
        placeholder="Enter Twitch username"
        value="powergpu"
        autocomplete="off"
        spellcheck="false"
      >
    </div>

    <div class="row">
      <div class="field">
        <label for="outputType">Output Type</label>
        <select id="outputType">
          <option value="api">API (JSON)</option>
          <option value="text">Plain Text</option>
          <option value="overlay" selected>OBS Overlay</option>
        </select>
      </div>

      <div class="field" id="styleField">
        <label for="style">Display Style</label>
        <select id="style">
          <option value="text">Text</option>
          <option value="compact" selected>Compact</option>
          <option value="full">Full</option>
          <option value="ticker">Ticker</option>
          <option value="hero">Hero</option>
          <option value="ring">Ring</option>
          <option value="banner">Banner</option>
          <option value="pill">Pill</option>
        </select>
      </div>
    </div>

    <div class="field" id="themeField">
      <label for="theme">Color Theme</label>
      <select id="theme">
        <option value="mono">Mono</option>
        <option value="grape" selected>Grape</option>
        <option value="mint">Mint</option>
        <option value="gold">Gold</option>
        <option value="ocean">Ocean</option>
        <option value="sunset">Sunset</option>
        <option value="rose">Rose</option>
        <option value="neon">Neon</option>
      </select>
    </div>

    <div class="output-box">
      <div class="output-header">
        <label>Generated URL</label>
        <span class="status" id="status">READY</span>
      </div>

      <div class="url" id="generatedUrl"></div>

      <div class="actions">
        <button class="primary" id="copyButton">Copy URL</button>
        <button class="secondary" id="openButton">Open URL</button>
      </div>
    </div>

    <div class="preview-section" id="previewSection">
      <div class="output-header">
        <label>Live Overlay Preview</label>
        <span class="status">LIVE PREVIEW</span>
      </div>

      <div class="preview-frame-wrap">
        <iframe
          id="previewFrame"
          title="Plus Goal Overlay Preview"
          allow="autoplay"
        ></iframe>
      </div>
    </div>

    <div class="info">
      <div class="info-title">OBS Browser Source</div>
      <p>
        Select OBS Overlay, choose a display style and color theme,
        then copy the generated URL into an OBS Browser Source.
        The overlay automatically retrieves the latest Plus Goal data.
      </p>
    </div>

  </div>

  <div class="footer">
    Twitch Plus Goal API &bull; Build ${BUILD}
  </div>

</div>

<script>
const channelInput = document.getElementById("channel");
const outputType = document.getElementById("outputType");
const styleSelect = document.getElementById("style");
const themeSelect = document.getElementById("theme");

const styleField = document.getElementById("styleField");
const themeField = document.getElementById("themeField");
const previewSection = document.getElementById("previewSection");

const generatedUrl = document.getElementById("generatedUrl");
const status = document.getElementById("status");
const previewFrame = document.getElementById("previewFrame");

function generateUrl() {
  const channel = channelInput.value.trim();
  const type = outputType.value;
  const style = styleSelect.value;
  const theme = themeSelect.value;

  if (!channel) {
    generatedUrl.textContent = "Enter a Twitch channel username.";
    status.textContent = "WAITING";
    previewFrame.src = "about:blank";
    return "";
  }

  if (!/^[A-Za-z0-9_]{3,25}$/.test(channel)) {
    generatedUrl.textContent = "Invalid Twitch username.";
    status.textContent = "INVALID";
    previewFrame.src = "about:blank";
    return "";
  }

  let relativeUrl;

  if (type === "api") {
    relativeUrl = "/plusgoal=" + encodeURIComponent(channel);
  } else if (type === "text") {
    relativeUrl = "/plusgoal=" + encodeURIComponent(channel) + "?format=text";
  } else {
    const params = new URLSearchParams({
      style: style,
      theme: theme
    });

    relativeUrl =
      "/overlay=" + encodeURIComponent(channel) +
      "?" + params.toString();
  }

  const fullUrl = window.location.origin + relativeUrl;

  generatedUrl.textContent = fullUrl;
  status.textContent = "READY";

  const isOverlay = type === "overlay";

  styleField.classList.toggle("hidden", !isOverlay);
  themeField.classList.toggle("hidden", !isOverlay);
  previewSection.classList.toggle("hidden", !isOverlay);

  if (isOverlay) {
    const previewUrl = new URL(relativeUrl, window.location.origin);
    previewUrl.searchParams.set("stage", "1");
    previewUrl.searchParams.set("_preview", Date.now().toString());

    const nextPreview = previewUrl.toString();

    if (previewFrame.dataset.currentUrl !== nextPreview) {
      previewFrame.dataset.currentUrl = nextPreview;
      previewFrame.src = nextPreview;
    }
  } else {
    previewFrame.src = "about:blank";
    previewFrame.dataset.currentUrl = "";
  }

  return fullUrl;
}

channelInput.addEventListener("input", generateUrl);
outputType.addEventListener("change", generateUrl);
styleSelect.addEventListener("change", generateUrl);
themeSelect.addEventListener("change", generateUrl);

document.getElementById("copyButton").addEventListener("click", async () => {
  const url = generateUrl();
  if (!url) return;

  const button = document.getElementById("copyButton");

  try {
    await navigator.clipboard.writeText(url);
  } catch {
    const temp = document.createElement("textarea");
    temp.value = url;
    document.body.appendChild(temp);
    temp.select();
    document.execCommand("copy");
    temp.remove();
  }

  button.textContent = "Copied!";
  setTimeout(() => button.textContent = "Copy URL", 1500);
});

document.getElementById("openButton").addEventListener("click", () => {
  const url = generateUrl();

  if (url) {
    window.open(url, "_blank", "noopener");
  }
});

channelInput.addEventListener("keydown", event => {
  if (event.key === "Enter") {
    const url = generateUrl();

    if (url) {
      window.open(url, "_blank", "noopener");
    }
  }
});

generateUrl();
</script>

</body>
</html>`;
}

// --------------------------------------------------
// TWITCH GRAPHQL
// --------------------------------------------------

async function gql(body) {
  const response = await fetch(GQL_URL, {
    method: "POST",
    headers: {
      "Client-ID": CLIENT_ID,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(UPSTREAM_TIMEOUT)
  });

  const raw = await response.text();

  let parsed;

  try {
    parsed = JSON.parse(raw);
  } catch {
    parsed = { raw };
  }

  return {
    status: response.status,
    raw,
    data: parsed
  };
}

function persistedBody(operationName, variables, hash) {
  return {
    operationName,
    variables,
    extensions: {
      persistedQuery: {
        version: 1,
        sha256Hash: hash
      }
    }
  };
}

async function resolveChannel(login) {
  if (login.toLowerCase() === DEFAULT_CHANNEL) {
    return DEFAULT_CHANNEL_ID;
  }

  const body = persistedBody(
    "GetUserID",
    {
      login,
      lookupType: "ACTIVE"
    },
    USER_HASH
  );

  const result = await gql(body);

  const id =
    result.data &&
    result.data.data &&
    result.data.data.user &&
    result.data.data.user.id;

  if (
    !result.status ||
    result.status >= 500 ||
    result.data.errors ||
    !id
  ) {
    const err = new Error("channel_lookup_failed");
    err.kind = result.data.errors ? "upstream" : "not_found";
    throw err;
  }

  return String(id);
}

// --------------------------------------------------
// PLUS GOAL DATA
// --------------------------------------------------

function normalizeLevel(value) {
  if (value === "LEVEL_1") return 1;
  if (value === "LEVEL_2") return 2;
  return null;
}

function monthKey(year, month) {
  return (
    String(year).padStart(4, "0") +
    "-" +
    String(month).padStart(2, "0")
  );
}

function monthName(key, short = false) {
  const [year, month] = key.split("-").map(Number);

  const name = new Date(Date.UTC(year, month - 1, 1))
    .toLocaleString("en-US", {
      month: short ? "short" : "long",
      timeZone: "UTC"
    });

  return name + (short ? " " + year : "");
}

function derive(login, channelId, program, fetchedAt, cached = false) {
  if (
    !program ||
    !Array.isArray(program.subPoints) ||
    program.subPoints.length === 0
  ) {
    const err = new Error("no_points_data");
    err.kind = "not_found";
    throw err;
  }

  const entries = program.subPoints
    .filter(p =>
      Number.isFinite(Number(p.year)) &&
      Number.isFinite(Number(p.month)) &&
      Number.isFinite(Number(p.count))
    )
    .map(p => ({
      month: monthKey(p.year, p.month),
      count: Number(p.count)
    }))
    .sort((a, b) => b.month.localeCompare(a.month));

  if (!entries.length) {
    const err = new Error("no_points_data");
    err.kind = "not_found";
    throw err;
  }

  const currentEntry = entries[0];
  const previousEntry = entries[1] || null;

  const l1 = Number(program.l1Threshold ?? 100);
  const l2 = Number(program.l2Threshold ?? 300);

  const widgetSetting = program.widgetSetting || "OFF";

  const displayed =
    widgetSetting === "LEVEL_1" ||
    widgetSetting === "LEVEL_2";

  const programLevel = normalizeLevel(program.level) || 0;
  const widgetLevel = normalizeLevel(widgetSetting);

  let goalLevel;
  let goalSource;

  if (widgetLevel) {
    goalLevel = widgetLevel;
    goalSource = "widget";
  } else if (previousEntry && previousEntry.count >= l2) {
    goalLevel = 2;
    goalSource = "previous_month";
  } else if (programLevel) {
    goalLevel = programLevel;
    goalSource = "program_level";
  } else {
    goalLevel = 1;
    goalSource = "default";
  }

  const target = goalLevel === 2 ? 300 : 100;
  const remaining = Math.max(0, target - currentEntry.count);
  const percent = Math.round((currentEntry.count / target) * 1000) / 10;

  const latestSix = entries.slice(0, 6);

  const history = latestSix
    .slice()
    .reverse()
    .map(p => ({
      month: p.month,
      count: p.count
    }));

  const qualificationMonths = latestSix.map(p => ({
    month: p.month,
    label: monthName(p.month, true),
    count: p.count,
    level_1: p.count >= l1,
    level_2: p.count >= l2
  }));

  function streak(threshold) {
    let index = 0;
    let count = 0;

    if (entries[0] && entries[0].count < threshold) {
      index = 1;
    }

    for (; index < entries.length; index++) {
      if (entries[index].count >= threshold) {
        count++;
      } else {
        break;
      }
    }

    return {
      threshold,
      required: 3,
      streak: count,
      qualified: count >= 3,
      current_month_met: currentEntry.count >= threshold
    };
  }

  return {
    username: login,
    channel_id: String(channelId),
    displayed,
    widget_setting: widgetSetting,
    program_level: programLevel,
    goal_level: goalLevel,
    goal_source: goalSource,
    goal_wording:
      programLevel === goalLevel
        ? "maintain Plus Level " + goalLevel
        : "reach Plus Level " + goalLevel,
    previous_month: previousEntry
      ? {
          month: previousEntry.month,
          count: previousEntry.count
        }
      : null,
    month: currentEntry.month,
    month_label: monthName(currentEntry.month),
    current: currentEntry.count,
    target,
    l1_threshold: l1,
    l2_threshold: l2,
    remaining,
    percent,
    history,
    qualification: {
      current_month: currentEntry.month,
      months: qualificationMonths,
      level_1: streak(l1),
      level_2: streak(l2)
    },
    tier_estimate: {
      tier_1: Math.ceil(remaining / 1),
      tier_2: Math.ceil(remaining / 2),
      tier_3: Math.ceil(remaining / 6)
    },
    cached,
    fetched_at: fetchedAt
  };
}

async function fetchPlus(login) {
  pruneCache();

  const existing = cache.get(login);

  if (existing && existing.expiresAt > Date.now()) {
    return {
      ...existing.value,
      cached: true
    };
  }

  if (inflight.has(login)) {
    return inflight.get(login);
  }

  const task = (async () => {
    let channelId;

    try {
      channelId = await resolveChannel(login);
    } catch (error) {
      if (error.kind === "not_found") {
        const e = new Error("channel_not_found");
        e.kind = "not_found";
        throw e;
      }

      const e = new Error("channel_lookup_failed");
      e.kind = "upstream";
      throw e;
    }

    const body = persistedBody(
      "PartnerPlusPublicQuery",
      { channelID: String(channelId) },
      PLUS_HASH
    );

    let lastError;

    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const result = await gql(body);
        const root = result.data && result.data.data;

        if (
          result.status >= 500 ||
          result.data.errors ||
          !root
        ) {
          lastError = new Error("plus_query_failed");
          continue;
        }

        const program =
          root.plusStatus &&
          root.plusStatus.partnerPlusProgram;

        if (!program) {
          const e = new Error("no_plus_program");
          e.kind = "not_found";
          throw e;
        }

        const fetchedAt = new Date().toISOString();

        const value = derive(
          login,
          channelId,
          program,
          fetchedAt,
          false
        );

        cache.set(login, {
          value,
          expiresAt: Date.now() + CACHE_TTL
        });

        return value;
      } catch (error) {
        if (error.kind === "not_found") {
          throw error;
        }

        lastError = error;
      }
    }

    const err = new Error(
      lastError ? lastError.message : "plus_query_failed"
    );

    err.kind = "upstream";
    throw err;
  })().finally(() => {
    inflight.delete(login);
  });

  inflight.set(login, task);
  return task;
}

// --------------------------------------------------
// OVERLAY HELPERS
// --------------------------------------------------

function overlayHtml(channel) {
  const safe = JSON.stringify(channel)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026");

  return overlayTemplate.replace(
    "</head>",
    `<script>window.__PLUS_CHANNEL=${safe};</script></head>`
  );
}

function getLoginFromPath(pathname, prefix) {
  const equalsPrefix = prefix + "=";
  const slashPrefix = prefix + "/";

  let value = null;

  if (pathname.startsWith(equalsPrefix)) {
    value = pathname.slice(equalsPrefix.length);
  } else if (pathname.startsWith(slashPrefix)) {
    value = pathname.slice(slashPrefix.length);
  }

  if (value && value.includes("/")) {
    return null;
  }

  return value;
}

// --------------------------------------------------
// HTTP SERVER
// --------------------------------------------------

const server = http.createServer(async (req, res) => {
  const started = Date.now();
  let status = 500;

  const finish = (code, body, type, headers) => {
    status = code;
    send(res, code, body, type, headers);
  };

  try {
    const url = new URL(
      req.url,
      "http://" + (req.headers.host || "localhost")
    );

    const pathname = decodeURIComponent(url.pathname);

    if (!allowRequest(clientIp(req))) {
      finish(429, { error: "rate_limit_exceeded" });
      return;
    }

    // DASHBOARD
    if (pathname === "/") {
      finish(200, dashboardHtml(), "text/html; charset=utf-8");
      return;
    }

    // HEALTH
    if (pathname === "/health") {
      finish(200, {
        status: "ok",
        build: BUILD,
        uptime_seconds: Math.floor((Date.now() - startTime) / 1000)
      });
      return;
    }

    // RAW OVERLAY TEMPLATE
    if (pathname === "/overlay" || pathname === "/overlay.html") {
      finish(200, overlayTemplate, "text/html; charset=utf-8");
      return;
    }

    // OBS OVERLAY
    if (pathname.startsWith("/overlay=")) {
      const login = pathname
        .slice("/overlay=".length)
        .toLowerCase();

      if (!validLogin(login)) {
        finish(400, { error: "invalid_login" });
        return;
      }

      finish(
        200,
        overlayHtml(login),
        "text/html; charset=utf-8"
      );
      return;
    }

    // PLUS GOAL API
    if (
      pathname.startsWith("/plusgoal=") ||
      pathname.startsWith("/plusgoal/")
    ) {
      const loginRaw = getLoginFromPath(pathname, "/plusgoal");
      const login = loginRaw && loginRaw.toLowerCase();

      if (!validLogin(login)) {
        finish(400, { error: "invalid_login" });
        return;
      }

      let data;

      try {
        data = await fetchPlus(login);
      } catch (error) {
        if (error.kind === "not_found") {
          finish(404, {
            found: false,
            username: login,
            error: error.message === "channel_not_found"
              ? "channel_not_found"
              : "no_plus_points_data"
          });
        } else {
          finish(502, {
            found: false,
            username: login,
            error: "twitch_upstream_error"
          });
        }

        return;
      }

      if (url.searchParams.get("format") === "text") {
        const label = url.searchParams.get("label") === "1"
          ? "Level " + data.goal_level + ": "
          : "";

        finish(
          200,
          label + data.current + " / " + data.target,
          "text/plain; charset=utf-8"
        );
      } else if ((req.headers.accept || "").includes("text/html")) {
        const html = `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width">
<title>${escapeHtml(login)} - TwitchPlusGoal</title>
<style>
body {
  margin: 0;
  padding: 2rem;
  background: #0b0d14;
  color: #e9eaf2;
  font: 14px ui-monospace, monospace;
}
pre {
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  background: #141824;
  padding: 1rem;
  border-radius: 12px;
}
</style>
</head>
<body>
<h1>${escapeHtml(login)} - TwitchPlusGoal</h1>
<pre>${escapeHtml(JSON.stringify(data, null, 2))}</pre>
</body>
</html>`;

        finish(200, html, "text/html; charset=utf-8");
      } else {
        finish(200, data);
      }

      return;
    }

    // TWITCH GRAPHQL DEBUG
    if (pathname.startsWith("/gqldebug=")) {
      const login = pathname
        .slice("/gqldebug=".length)
        .toLowerCase();

      if (!validLogin(login)) {
        finish(400, { error: "invalid_login" });
        return;
      }

      let channelId;

      try {
        channelId = await resolveChannel(login);
      } catch {
        finish(404, {
          found: false,
          error: "channel_lookup_failed"
        });
        return;
      }

      const body = persistedBody(
        "PartnerPlusPublicQuery",
        { channelID: String(channelId) },
        PLUS_HASH
      );

      try {
        const result = await gql(body);

        finish(200, {
          request: body,
          upstream_status: result.status,
          response: result.data
        });
      } catch {
        finish(502, {
          error: "twitch_upstream_error",
          request: body
        });
      }

      return;
    }

    finish(404, { error: "not_found" });

  } catch (error) {
    finish(400, {
      error: "bad_request"
    });
  } finally {
    const elapsed = Date.now() - started;
    const urlPath = (req.url || "/").split("?")[0];

    process.stdout.write(
      new Date().toISOString() + " " +
      req.method + " " +
      urlPath + " " +
      status + " " +
      elapsed + "ms\n"
    );
  }
});

server.listen(PORT, "0.0.0.0", () => {
  process.stdout.write(
    "Twitch Plus Goal API Build " + BUILD +
    " listening on port " + PORT + "\n"
  );
});