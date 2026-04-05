import express from "express";
import cors from "cors";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import crypto from "crypto";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const DATA_FILE = path.join(__dirname, "data", "store.json");

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(cors());
app.use(express.json({ limit: "2mb" }));

async function readDb() {
  try {
    const raw = await fs.readFile(DATA_FILE, "utf8");
    return JSON.parse(raw);
  } catch {
    return { students: [] };
  }
}

async function writeDb(db) {
  await fs.mkdir(path.dirname(DATA_FILE), { recursive: true });
  const tmp = `${DATA_FILE}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(db, null, 2), "utf8");
  await fs.rename(tmp, DATA_FILE);
}

function sortLeaderboard(students) {
  return [...students].sort((a, b) => b.level - a.level || b.xp - a.xp);
}

function publicStudent(s) {
  return {
    id: s.id,
    name: s.name,
    level: s.level ?? 1,
    xp: s.xp ?? 0,
    streak: s.streak ?? 0,
    sessions: s.sessions ?? 0
  };
}

app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

app.get("/api/students", async (_req, res) => {
  try {
    const db = await readDb();
    const students = sortLeaderboard(db.students || []).map(publicStudent);
    res.json({ students });
  } catch (e) {
    res.status(500).json({ error: String(e.message) });
  }
});

app.get("/api/students/:id", async (req, res) => {
  try {
    const db = await readDb();
    const s = (db.students || []).find((x) => x.id === req.params.id);
    if (!s) return res.status(404).json({ error: "Not found" });
    res.json({ student: s });
  } catch (e) {
    res.status(500).json({ error: String(e.message) });
  }
});

app.post("/api/students", async (req, res) => {
  try {
    const name = String(req.body?.name || "").trim();
    if (!name) return res.status(400).json({ error: "name required" });
    const email = String(req.body?.email || "").trim();
    const className = String(req.body?.className || "").trim();
    const db = await readDb();
    if (!Array.isArray(db.students)) db.students = [];
    const student = {
      id: crypto.randomUUID(),
      name,
      email,
      className,
      level: 1,
      xp: 0,
      streak: 0,
      sessions: 0,
      tasks: [],
      collapsed: false,
      timerMinutes: 25,
      timerRemaining: 25 * 60,
      timerRunning: false,
      quoteIndex: 0,
      customization: null
    };
    db.students.push(student);
    await writeDb(db);
    res.status(201).json({ student });
  } catch (e) {
    res.status(500).json({ error: String(e.message) });
  }
});

const ALLOWED_PUT = new Set([
  "name",
  "email",
  "className",
  "level",
  "xp",
  "streak",
  "sessions",
  "tasks",
  "collapsed",
  "timerMinutes",
  "timerRemaining",
  "timerRunning",
  "quoteIndex",
  "customization"
]);

app.put("/api/students/:id", async (req, res) => {
  try {
    const db = await readDb();
    const i = (db.students || []).findIndex((x) => x.id === req.params.id);
    if (i < 0) return res.status(404).json({ error: "Not found" });
    const cur = db.students[i];
    const body = req.body && typeof req.body === "object" ? req.body : {};
    for (const key of ALLOWED_PUT) {
      if (Object.prototype.hasOwnProperty.call(body, key)) {
        cur[key] = body[key];
      }
    }
    db.students[i] = cur;
    await writeDb(db);
    res.json({ student: cur });
  } catch (e) {
    res.status(500).json({ error: String(e.message) });
  }
});

app.delete("/api/students/:id", async (req, res) => {
  try {
    const db = await readDb();
    const before = (db.students || []).length;
    db.students = (db.students || []).filter((x) => x.id !== req.params.id);
    if (db.students.length === before) return res.status(404).json({ error: "Not found" });
    await writeDb(db);
    res.status(204).end();
  } catch (e) {
    res.status(500).json({ error: String(e.message) });
  }
});

app.use(express.static(ROOT));

app.listen(PORT, () => {
  console.log(`HabitQuest API + static  http://localhost:${PORT}`);
});
