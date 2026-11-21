// @vitest-environment node
import fs from "node:fs";
import http from "node:http";
import request from "supertest";
import handler from "../api/index.js";

process.env.JWT_SECRET = "test-secret-test-secret-test-secret-123";
const config = JSON.parse(fs.readFileSync("vercel.json", "utf8"));

// Same matching Vercel does: first rewrite whose source regex matches the path wins.
const toRegex = (src) => new RegExp("^" + src.replace("/:path*", "(?:/.*)?") + "$");
const route = (path) => config.rewrites.find((r) => toRegex(r.source).test(path))?.destination;

describe("vercel.json routing (regression: nested /api/auth/* returned Vercel NOT_FOUND)", () => {
  it("the function file is a plain api/index.js, not a [...catch-all]", () => {
    expect(fs.existsSync("api/index.js")).toBe(true);
    expect(fs.readdirSync("api").filter((f) => f.includes("["))).toEqual([]);
  });

  it.each(["/api", "/api/skills", "/api/auth/login", "/api/auth/register", "/api/auth/me", "/api/auth/logout", "/api/saved/3"])(
    "%s goes to the API function, not the React app", (path) => expect(route(path)).toBe("/api"));

  it.each(["/", "/login", "/saved", "/skills/1", "/apiary"])("%s still goes to the React app", (path) =>
    expect(route(path)).toBe("/index.html"));
});

describe("api/index.js entry point serves nested URLs", () => {
  it("handles register, me, logout and unknown nested paths", async () => {
    const server = http.createServer(handler);
    const agent = request.agent(server);
    const reg = await agent.post("/api/auth/register").send({ name: "Ana Lopez", email: "route@example.com", password: "password123" });
    expect(reg.status).toBe(201);
    expect((await agent.get("/api/auth/me")).status).toBe(200);
    expect((await agent.post("/api/auth/login").send({ email: "route@example.com", password: "password123" })).status).toBe(200);
    expect((await agent.post("/api/auth/logout")).status).toBe(200);
    expect((await agent.get("/api/auth/me")).status).toBe(401);
    expect((await agent.get("/api/skills")).body).toHaveLength(6);
    expect((await agent.get("/api/auth/nope")).body.error).toBe("Not found.");
  });
});
