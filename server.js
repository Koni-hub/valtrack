const fs = require("fs");
const path = require("path");
const express = require("express");
const { Server } = require("socket.io");
const { execSync } = require("child_process");

// ===== CONFIG =====
const VALO_CONFIG_PATH = path.join(
  process.env.LOCALAPPDATA || "C:\\Users\\Default\\AppData\\Local",
  "VALORANT\\Saved\\Config\\WindowsClient\\RiotLocalMachine.ini",
);

const RIOT_PRIVATE_SETTINGS_PATH = path.join(
  process.env.LOCALAPPDATA || "C:\\Users\\Default\\AppData\\Local",
  "Riot Games\\Riot Client\\Data\\RiotGamesPrivateSettings.yaml",
);

const TRACKED_ACCOUNTS = [
  { name: "\u4f9d\u795e \u7d2b\u82d1", tag: "yuji" },
  { name: "\u30b3\u30cb\u5148\u8f29", tag: "6969" },
];

const POLL_INTERVAL = 2000;
const API_KEY = "HDEV-abd6660c-62d7-4c2b-9139-51c64f681645";

// ===== STATE =====
let detectedAccount = null;
let gameState = null;
let io = null;
let trackedPuuidMap = {};

// ===== LOG SYSTEM =====
const logs = [];

function log(level, message) {
  const entry = { level, message, timestamp: Date.now() };
  logs.push(entry);
  if (logs.length > 200) logs.shift();
  const prefix =
    {
      info: "[INFO]",
      ok: "[OK]",
      warn: "[WARN]",
      error: "[ERR]",
      detect: "[DETECT]",
      play: "[PLAY]",
    }[level] || "[INFO]";
  console.log(prefix, message);
  if (io) io.emit("log", entry);
}

// ===== RIOT CLIENT RUNNING CHECK =====
function isRiotClientRunning() {
  try {
    const stdout = execSync(
      'tasklist /NH /FI "IMAGENAME eq RiotClientServices.exe"',
      { encoding: "utf8", timeout: 3000 },
    );
    return stdout.includes("RiotClientServices.exe");
  } catch {
    return false;
  }
}

// ===== VALORANT CONFIG READER (PUUID) =====
function readValorantPuuid() {
  try {
    if (!fs.existsSync(VALO_CONFIG_PATH)) {
      return null;
    }
    const raw = fs.readFileSync(VALO_CONFIG_PATH, "utf-8");
    const match = raw.match(/LastKnownUser\s*=\s*([a-f0-9-]+)/i);
    if (match) {
      return match[1].toLowerCase();
    }
  } catch (e) {
    log("error", "Valorant config read error: " + e.message);
  }
  return null;
}

// ===== SSID JWT READER (real-time PUUID from Riot Client session) =====
function readSsidPuuid() {
  try {
    if (!fs.existsSync(RIOT_PRIVATE_SETTINGS_PATH)) {
      return null;
    }
    const raw = fs.readFileSync(RIOT_PRIVATE_SETTINGS_PATH, "utf-8");
    const lines = raw.split("\n");
    let foundSsid = false;
    for (const line of lines) {
      const t = line.trim();
      if (t === 'name: "ssid"') {
        foundSsid = true;
        continue;
      }
      if (foundSsid && t.startsWith("value: ")) {
        const jwt = t.replace("value: ", "").replace(/"/g, "").trim();
        const parts = jwt.split(".");
        if (parts.length >= 2) {
          const payload = Buffer.from(parts[1], "base64").toString("utf-8");
          const data = JSON.parse(payload);
          if (data.sub) return data.sub.toLowerCase();
        }
        break;
      }
    }
  } catch (e) {
    log("error", "SSID JWT read error: " + e.message);
  }
  return null;
}

// ===== VALORANT.EXE DETECTION =====
function isValorantRunning() {
  try {
    const stdout = execSync(
      'tasklist /NH /FI "IMAGENAME eq VALORANT.exe"',
      { encoding: "utf8", timeout: 3000 },
    );
    return stdout.includes("VALORANT.exe");
  } catch {
    return false;
  }
}

// ===== PRE-FETCH TRACKED ACCOUNT PUUIDS =====
async function refreshTrackedPuuidMap() {
  const newMap = {};
  for (const a of TRACKED_ACCOUNTS) {
    try {
      const n = encodeURIComponent(a.name);
      const t = encodeURIComponent(a.tag);
      const res = await fetch(
        `https://api.henrikdev.xyz/valorant/v1/account/${n}/${t}?api_key=${encodeURIComponent(API_KEY)}`,
      );
      if (res.ok) {
        const json = await res.json();
        if (json?.data?.puuid) {
          newMap[json.data.puuid.toLowerCase()] = { name: a.name, tag: a.tag };
        }
      }
    } catch (e) {
      log("error", `Failed to fetch PUUID for ${a.name} #${a.tag}: ${e.message}`);
    }
  }
  trackedPuuidMap = newMap;
  log("info", `Tracked PUUIDs loaded: ${Object.keys(trackedPuuidMap).length} accounts`);
}

// ===== POLL =====
async function pollValorant() {
  if (!isRiotClientRunning()) {
    if (detectedAccount !== null || gameState !== null) {
      log("warn", "Riot Client closed — clearing detection");
    }
    detectedAccount = null;
    gameState = null;
    if (io) io.emit("valo-detect", { account: null });
    return;
  }

  const puuid = readSsidPuuid() || readValorantPuuid();

  if (puuid && trackedPuuidMap[puuid]) {
    const { name, tag } = trackedPuuidMap[puuid];
    if (
      !detectedAccount ||
      detectedAccount.name !== name ||
      detectedAccount.tag !== tag
    ) {
      log("detect", "Tracked account detected: " + name + " #" + tag);
    }
    detectedAccount = { name, tag };
    gameState = "menu";
  } else {
    if (detectedAccount)
      log("info", "Non-tracked account or unknown — clearing detection");
    detectedAccount = null;
    gameState = null;

    if (puuid && Object.keys(trackedPuuidMap).length > 0) {
      log(
        "info",
        "Logged-in PUUID does not match any tracked account: " + puuid,
      );
    }
  }

  if (io)
    io.emit("valo-detect", {
      account: detectedAccount,
      gameState: detectedAccount ? gameState : null,
    });
}

// ===== EXPRESS + SOCKET.IO =====
const app = express();
const server = http.createServer(app);
io = new Server(server, { cors: { origin: "*" } });

app.use(express.static(__dirname));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "valorant-track-acc.html"));
});

io.on("connection", (socket) => {
  log("info", "Client connected: " + socket.id.slice(0, 8) + "...");

  // Send existing logs to new client
  logs.forEach((entry) => socket.emit("log", entry));

  socket.emit("valo-detect", {
    account: detectedAccount,
    gameState,
  });
});

setInterval(() => pollValorant(), POLL_INTERVAL);

// Refresh PUUID map on startup and every 5 minutes
refreshTrackedPuuidMap();
setInterval(() => refreshTrackedPuuidMap(), 300000);

const PORT = process.env.PORT || 3000;
if (require.main === module || !process.versions.electron) {
  server.listen(PORT, () => {
    log("ok", "Server started on http://localhost:" + PORT);
  });
} else {
  server.listen(PORT);
}

module.exports = server;
