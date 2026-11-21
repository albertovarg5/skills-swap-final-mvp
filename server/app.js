import crypto from "node:crypto";
import express from "express";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { categories } from "../src/data/sampleSkills.js";

const COOKIE = "token";
const SESSION_SECONDS = 60 * 60; // tokens expire after 1 hour
// A real hash used to keep login timing the same when the email does not exist.
const DUMMY_HASH = bcrypt.hashSync("not-a-real-password", 10);

function getSecret() {
  const secret = process.env.JWT_SECRET;
  if (secret && secret.length >= 32) return secret;
  if (process.env.NODE_ENV === "production") throw new Error("JWT_SECRET (32+ chars) is required in production");
  return (getSecret.devSecret ??= crypto.randomBytes(32).toString("hex")); // dev only: sessions reset on restart
}

const isProd = () => process.env.NODE_ENV === "production";
const cookieOptions = () => ({ httpOnly: true, secure: isProd(), sameSite: "strict", path: "/" });

export function validateRegistration({ name, email, password }) {
  if (typeof name !== "string" || name.trim().length < 2 || name.trim().length > 50) return "Name must be 2 to 50 characters.";
  if (typeof email !== "string" || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return "Please enter a valid email address.";
  if (typeof password !== "string" || password.length < 8 || password.length > 72) return "Password must be 8 to 72 characters.";
  if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) return "Password must contain a letter and a number.";
  return null;
}

export function validateSkill({ title, category, price, description }) {
  if (typeof title !== "string" || !title.trim() || typeof description !== "string" || !description.trim()) return "Please enter a title and a description.";
  if (title.trim().length > 80) return "Title must be 80 characters or less.";
  if (description.trim().length > 500) return "Description must be 500 characters or less.";
  if (!categories.includes(category)) return "Please choose a valid category.";
  if (!Number.isInteger(price) || price < 0 || price > 1000) return "Price must be a whole number from 0 to 1000.";
  return null;
}

const toSkill = (r, mine) => ({
  id: r.id, title: r.title, category: r.category, owner: r.owner_name,
  price: r.price, topic: r.topic, description: r.description, mine,
});

export function createApp(db, { loginLimit = 10 } = {}) {
  const app = express();
  app.set("trust proxy", 1); // Vercel sits behind one proxy; needed for correct client IPs
  app.disable("x-powered-by");
  app.use(helmet());
  // No CORS headers on purpose: the API is same-origin only (the React app and API share one domain).
  app.use(express.json({ limit: "10kb" }));
  app.use(cookieParser());

  // CSRF layer 1: reject state-changing requests that come from another origin.
  app.use((req, res, next) => {
    if (["GET", "HEAD", "OPTIONS"].includes(req.method)) return next();
    const origin = req.get("origin");
    const allowed = process.env.ALLOWED_ORIGIN || `${req.protocol}://${req.get("host")}`;
    if (origin && origin !== allowed) return res.status(403).json({ error: "Request blocked: bad origin." });
    next();
  });

  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: loginLimit,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Too many attempts. Please try again in 15 minutes." },
  });

  function startSession(res, user) {
    const csrf = crypto.randomBytes(24).toString("hex");
    const token = jwt.sign({ sub: String(user.id), name: user.name, email: user.email, csrf }, getSecret(), {
      algorithm: "HS256",
      expiresIn: SESSION_SECONDS,
    });
    res.cookie(COOKIE, token, { ...cookieOptions(), maxAge: SESSION_SECONDS * 1000 });
    return { user: { id: user.id, name: user.name, email: user.email }, csrfToken: csrf };
  }

  function readToken(req) {
    const token = req.cookies[COOKIE];
    if (!token) return null;
    try {
      return jwt.verify(token, getSecret(), { algorithms: ["HS256"] });
    } catch {
      return null;
    }
  }

  function requireAuth(req, res, next) {
    const payload = readToken(req);
    if (!payload) {
      res.clearCookie(COOKIE, cookieOptions());
      return res.status(401).json({ error: "Please log in again. Your session is missing or expired." });
    }
    req.auth = { id: Number(payload.sub), name: payload.name, email: payload.email, csrf: payload.csrf };
    next();
  }

  // CSRF layer 2: the header must match the secret inside the JWT. Other sites cannot read it.
  function requireCsrf(req, res, next) {
    const sent = Buffer.from(String(req.get("x-csrf-token") || ""));
    const expected = Buffer.from(req.auth.csrf);
    if (sent.length !== expected.length || !crypto.timingSafeEqual(sent, expected)) {
      return res.status(403).json({ error: "Invalid CSRF token." });
    }
    next();
  }

  const api = express.Router();

  api.post("/auth/register", authLimiter, async (req, res) => {
    const body = req.body ?? {};
    const problem = validateRegistration(body);
    if (problem) return res.status(400).json({ error: problem });
    const hash = await bcrypt.hash(body.password, 10);
    const { rows } = await db.query(
      "INSERT INTO users (email, name, password_hash) VALUES ($1,$2,$3) ON CONFLICT (email) DO NOTHING RETURNING id, name, email",
      [body.email.trim().toLowerCase(), body.name.trim(), hash]
    );
    if (rows.length === 0) return res.status(409).json({ error: "An account with this email already exists." });
    res.status(201).json(startSession(res, rows[0]));
  });

  api.post("/auth/login", authLimiter, async (req, res) => {
    const { email, password } = req.body ?? {};
    if (typeof email !== "string" || typeof password !== "string" || !email || !password) {
      return res.status(400).json({ error: "Please enter your email and password." });
    }
    const { rows } = await db.query("SELECT id, name, email, password_hash FROM users WHERE email = $1", [email.trim().toLowerCase()]);
    const ok = await bcrypt.compare(password, rows[0]?.password_hash ?? DUMMY_HASH);
    if (!rows[0] || !ok) return res.status(401).json({ error: "Incorrect email or password." });
    res.json(startSession(res, rows[0]));
  });

  api.post("/auth/logout", (req, res) => {
    res.clearCookie(COOKIE, cookieOptions());
    res.json({ ok: true });
  });

  // Used on page load to restore the session (and to learn the CSRF token).
  api.get("/auth/me", requireAuth, (req, res) => {
    const { id, name, email, csrf } = req.auth;
    res.json({ user: { id, name, email }, csrfToken: csrf });
  });

  // Public: anyone can browse. "mine" is only true for the logged-in owner.
  api.get("/skills", async (req, res) => {
    const me = readToken(req)?.sub;
    const { rows } = await db.query("SELECT * FROM skills ORDER BY id DESC");
    res.json(rows.map((r) => toSkill(r, me !== undefined && r.owner_id !== null && String(r.owner_id) === me)));
  });

  api.post("/skills", requireAuth, requireCsrf, async (req, res) => {
    const body = req.body ?? {};
    const problem = validateSkill(body);
    if (problem) return res.status(400).json({ error: problem });
    const title = body.title.trim();
    const { rows } = await db.query(
      `INSERT INTO skills (owner_id, owner_name, title, category, price, topic, description)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [req.auth.id, req.auth.name, title, body.category, body.price, title, body.description.trim()]
    );
    res.status(201).json(toSkill(rows[0], true));
  });

  api.get("/saved", requireAuth, async (req, res) => {
    const { rows } = await db.query("SELECT skill_id FROM saved WHERE user_id = $1 ORDER BY skill_id", [req.auth.id]);
    res.json(rows.map((r) => r.skill_id));
  });

  api.put("/saved/:id", requireAuth, requireCsrf, async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id > 2147483647) return res.status(400).json({ error: "Invalid skill id." });
    const found = await db.query("SELECT 1 FROM skills WHERE id = $1", [id]);
    if (found.rows.length === 0) return res.status(404).json({ error: "Skill not found." });
    await db.query("INSERT INTO saved (user_id, skill_id) VALUES ($1,$2) ON CONFLICT DO NOTHING", [req.auth.id, id]);
    res.json({ ok: true });
  });

  api.delete("/saved/:id", requireAuth, requireCsrf, async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id > 2147483647) return res.status(400).json({ error: "Invalid skill id." });
    await db.query("DELETE FROM saved WHERE user_id = $1 AND skill_id = $2", [req.auth.id, id]);
    res.json({ ok: true });
  });

  app.use("/api", api);
  app.use("/api", (req, res) => res.status(404).json({ error: "Not found." }));

  // Security-conscious errors: log details on the server, send a generic message.
  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => {
    if (err.type === "entity.parse.failed") return res.status(400).json({ error: "Invalid request body." });
    if (err.type === "entity.too.large") return res.status(413).json({ error: "Request is too large." });
    console.error(err);
    res.status(500).json({ error: "Something went wrong. Please try again." });
  });

  return app;
}
