// @vitest-environment node
import request from "supertest";
import { vi } from "vitest";
import jwt from "jsonwebtoken";
import { createApp } from "./app.js";
import { createDb } from "./db.js";

process.env.JWT_SECRET = "test-secret-test-secret-test-secret-123";
const user = { name: "Ana Lopez", email: "ana@example.com", password: "password123" };
let app;

beforeAll(async () => {
  app = createApp(await createDb(), { loginLimit: 1000 });
});

// Registers a new user and returns an agent (cookie jar) plus the CSRF token.
async function signUp(email) {
  const agent = request.agent(app);
  const res = await agent.post("/api/auth/register").send({ ...user, email });
  return { agent, csrf: res.body.csrfToken, res };
}

describe("registration", () => {
  it("creates an account, sets an HttpOnly cookie, and never returns the password", async () => {
    const { res } = await signUp("new1@example.com");
    expect(res.status).toBe(201);
    expect(res.body.user.email).toBe("new1@example.com");
    expect(JSON.stringify(res.body)).not.toMatch(/password|hash/i);
    const cookie = res.headers["set-cookie"][0];
    expect(cookie).toMatch(/HttpOnly/);
    expect(cookie).toMatch(/SameSite=Strict/);
  });

  it("stores a bcrypt hash, not the password", async () => {
    const db = await createDb();
    const local = createApp(db);
    await request(local).post("/api/auth/register").send({ ...user, email: "hash@example.com" });
    const { rows } = await db.query("SELECT password_hash FROM users");
    expect(rows[0].password_hash).toMatch(/^\$2[aby]\$/);
    expect(rows[0].password_hash).not.toContain(user.password);
  });

  it.each([
    [{ name: "A" }, /Name/],
    [{ email: "not-an-email" }, /email/],
    [{ password: "short1" }, /8 to 72/],
    [{ password: "onlyletters" }, /letter and a number/],
  ])("rejects invalid input %j", async (bad, message) => {
    const res = await request(app).post("/api/auth/register").send({ ...user, email: "v@example.com", ...bad });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(message);
  });

  it("rejects a duplicate email (case-insensitive)", async () => {
    await signUp("dup@example.com");
    const res = await request(app).post("/api/auth/register").send({ ...user, email: "DUP@example.com" });
    expect(res.status).toBe(409);
  });
});

describe("login, logout and JWT verification", () => {
  it("logs in with correct credentials and restores the session with /me", async () => {
    await signUp("login@example.com");
    const agent = request.agent(app);
    const res = await agent.post("/api/auth/login").send({ email: "login@example.com", password: user.password });
    expect(res.status).toBe(200);
    const me = await agent.get("/api/auth/me");
    expect(me.body.user.email).toBe("login@example.com");
  });

  it("rejects a wrong password and an unknown email with the same message", async () => {
    await signUp("wrong@example.com");
    const a = await request(app).post("/api/auth/login").send({ email: "wrong@example.com", password: "badpassword1" });
    const b = await request(app).post("/api/auth/login").send({ email: "nobody@example.com", password: "badpassword1" });
    expect(a.status).toBe(401);
    expect(b.status).toBe(401);
    expect(a.body.error).toBe(b.body.error);
  });

  it("logout clears the cookie", async () => {
    const { agent } = await signUp("logout@example.com");
    const res = await agent.post("/api/auth/logout");
    expect(res.headers["set-cookie"][0]).toMatch(/token=;/);
    expect((await agent.get("/api/auth/me")).status).toBe(401);
  });

  it("rejects requests with no token", async () => {
    expect((await request(app).get("/api/saved")).status).toBe(401);
    expect((await request(app).post("/api/skills").send({})).status).toBe(401);
  });

  it("rejects an expired token", async () => {
    const token = jwt.sign({ sub: "1", name: "x", email: "x@x.com", csrf: "c" }, process.env.JWT_SECRET, { expiresIn: -10 });
    const res = await request(app).get("/api/auth/me").set("Cookie", `token=${token}`);
    expect(res.status).toBe(401);
  });

  it("rejects a token signed with the wrong secret and an unsigned (alg none) token", async () => {
    const forged = jwt.sign({ sub: "1", csrf: "c" }, "another-secret-another-secret-12345");
    const none = jwt.sign({ sub: "1", csrf: "c" }, "", { algorithm: "none" });
    expect((await request(app).get("/api/auth/me").set("Cookie", `token=${forged}`)).status).toBe(401);
    expect((await request(app).get("/api/auth/me").set("Cookie", `token=${none}`)).status).toBe(401);
  });

  it("rate limits repeated login attempts", async () => {
    const limited = createApp(await createDb(), { loginLimit: 3 });
    const statuses = [];
    for (let i = 0; i < 4; i++) {
      statuses.push((await request(limited).post("/api/auth/login").send({ email: "a@b.com", password: "x" })).status);
    }
    expect(statuses).toEqual([401, 401, 401, 429]);
  });
});

describe("skills and saved skills", () => {
  const skill = { title: "Chess", category: "Other", price: 0, description: "Learn openings." };

  it("lets anyone browse the seeded skills", async () => {
    const res = await request(app).get("/api/skills");
    expect(res.status).toBe(200);
    expect(res.body.map((s) => s.title)).toContain("JavaScript Help");
  });

  it("adds a skill and marks it as mine only for its owner", async () => {
    const { agent, csrf } = await signUp("owner@example.com");
    const created = await agent.post("/api/skills").set("X-CSRF-Token", csrf).send(skill);
    expect(created.status).toBe(201);
    expect(created.body.mine).toBe(true);
    const mine = (await agent.get("/api/skills")).body.filter((s) => s.mine);
    expect(mine.map((s) => s.title)).toEqual(["Chess"]);
    const other = await signUp("other@example.com");
    expect((await other.agent.get("/api/skills")).body.some((s) => s.mine)).toBe(false);
  });

  it("validates skill input on the server", async () => {
    const { agent, csrf } = await signUp("val@example.com");
    for (const bad of [{ title: "" }, { category: "Hack" }, { price: -1 }, { price: 1.5 }, { title: "x".repeat(81) }]) {
      const res = await agent.post("/api/skills").set("X-CSRF-Token", csrf).send({ ...skill, ...bad });
      expect(res.status).toBe(400);
    }
  });

  it("stores script text as plain text (React escapes it when shown)", async () => {
    const { agent, csrf } = await signUp("xss@example.com");
    const title = "<img src=x onerror=alert(1)>";
    const res = await agent.post("/api/skills").set("X-CSRF-Token", csrf).send({ ...skill, title });
    expect(res.status).toBe(201);
    expect(res.body.title).toBe(title);
    expect(res.headers["content-type"]).toMatch(/application\/json/);
  });

  it("saves and unsaves per user", async () => {
    const a = await signUp("sa@example.com");
    const b = await signUp("sb@example.com");
    expect((await a.agent.put("/api/saved/1").set("X-CSRF-Token", a.csrf)).status).toBe(200);
    expect((await a.agent.put("/api/saved/1").set("X-CSRF-Token", a.csrf)).status).toBe(200); // idempotent
    expect((await a.agent.get("/api/saved")).body).toEqual([1]);
    expect((await b.agent.get("/api/saved")).body).toEqual([]);
    await a.agent.delete("/api/saved/1").set("X-CSRF-Token", a.csrf);
    expect((await a.agent.get("/api/saved")).body).toEqual([]);
  });

  it("returns 404 for a missing skill and 400 for a bad id", async () => {
    const { agent, csrf } = await signUp("miss@example.com");
    expect((await agent.put("/api/saved/99999").set("X-CSRF-Token", csrf)).status).toBe(404);
    expect((await agent.put("/api/saved/abc").set("X-CSRF-Token", csrf)).status).toBe(400);
  });
});

describe("CSRF protection", () => {
  it("rejects a state-changing request without the CSRF header", async () => {
    const { agent } = await signUp("csrf1@example.com");
    const res = await agent.put("/api/saved/1");
    expect(res.status).toBe(403);
  });

  it("rejects a wrong CSRF token", async () => {
    const { agent } = await signUp("csrf2@example.com");
    const res = await agent.put("/api/saved/1").set("X-CSRF-Token", "wrong");
    expect(res.status).toBe(403);
  });

  it("rejects a request from another origin even with a valid token", async () => {
    const { agent, csrf } = await signUp("csrf3@example.com");
    const res = await agent.put("/api/saved/1").set("X-CSRF-Token", csrf).set("Origin", "https://evil.example");
    expect(res.status).toBe(403);
  });

  it("does not send CORS headers", async () => {
    const res = await request(app).get("/api/skills").set("Origin", "https://evil.example");
    expect(res.headers["access-control-allow-origin"]).toBeUndefined();
  });
});

describe("error handling", () => {
  it("returns JSON 404 for unknown API routes and 400 for bad JSON without leaking details", async () => {
    expect((await request(app).get("/api/nope")).body.error).toBe("Not found.");
    const res = await request(app).post("/api/auth/login").set("Content-Type", "application/json").send("{bad");
    expect(res.status).toBe(400);
    expect(res.text).not.toMatch(/SyntaxError|at /);
  });
});

describe("production config (regression: register/login returned 500 on Vercel)", () => {
  const saved = { env: process.env.NODE_ENV, secret: process.env.JWT_SECRET };
  afterEach(() => {
    process.env.NODE_ENV = saved.env;
    process.env.JWT_SECRET = saved.secret;
    vi.restoreAllMocks();
  });

  it.each([["missing", undefined], ["too short", "short"]])("%s JWT_SECRET: fails clearly, logs why, creates no account", async (_, secret) => {
    const db = await createDb(); // (DATABASE_URL is checked separately; PGlite stands in for Neon here)
    process.env.NODE_ENV = "production";
    if (secret === undefined) delete process.env.JWT_SECRET; else process.env.JWT_SECRET = secret;
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    const local = createApp(db);
    const res = await request(local).post("/api/auth/register").send({ ...user, email: "prod@example.com" });
    expect(res.status).toBe(500);
    expect((await db.query("SELECT 1 FROM users")).rows).toHaveLength(0);
    const logged = log.mock.calls.flat().join(" ");
    expect(logged).toMatch(/JWT_SECRET/);
    expect(logged).not.toContain(user.password);
    expect((await request(local).post("/api/auth/login").send(user)).status).toBe(500);
  });

  it("valid JWT_SECRET in production: register, login and a Secure cookie work", async () => {
    const db = await createDb();
    process.env.NODE_ENV = "production";
    process.env.JWT_SECRET = "p".repeat(40);
    const local = createApp(db);
    const reg = await request(local).post("/api/auth/register").send({ ...user, email: "ok@example.com" });
    expect(reg.status).toBe(201);
    expect(reg.headers["set-cookie"][0]).toMatch(/Secure/);
    expect((await request(local).post("/api/auth/login").send({ email: "ok@example.com", password: user.password })).status).toBe(200);
  });

  it("accepts a same-host POST on a preview domain (Origin check)", async () => {
    const local = createApp(await createDb());
    const res = await request(local).post("/api/auth/register").set("Host", "my-app-git-x.vercel.app")
      .set("Origin", "http://my-app-git-x.vercel.app").send({ ...user, email: "pv@example.com" });
    expect(res.status).toBe(201);
  });
});
