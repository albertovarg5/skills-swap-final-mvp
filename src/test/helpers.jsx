import { render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import http from "node:http";
import App from "../App";
import { AuthProvider } from "../context/AuthContext";
import { SkillsProvider } from "../context/SkillsContext";
import { createApp } from "../../server/app.js";
import { createDb } from "../../server/db.js";

process.env.JWT_SECRET = "test-secret-test-secret-test-secret-123";

// Starts the REAL Express API (with an in-memory database) and points fetch("/api/...") at it.
// A tiny cookie jar stands in for the browser, so HttpOnly cookies work like in production.
export async function startTestApi() {
  const server = http.createServer(createApp(await createDb(), { loginLimit: 1000 }));
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  const realFetch = globalThis.fetch;
  const api = { jar: {}, failNext: 0, calls: [] };

  globalThis.fetch = async (url, options = {}) => {
    if (!String(url).startsWith("/api")) return realFetch(url, options); // anything else is a bug in a test
    api.calls.push(`${options.method || "GET"} ${url}`);
    if (api.failNext > 0) {
      api.failNext--;
      throw new TypeError("network down");
    }
    const cookie = Object.entries(api.jar).map(([k, v]) => `${k}=${v}`).join("; ");
    const res = await realFetch(base + url, { ...options, headers: { ...options.headers, ...(cookie && { Cookie: cookie }) } });
    for (const line of res.headers.getSetCookie()) {
      const [pair] = line.split(";");
      const [name, ...rest] = pair.split("=");
      if (rest.join("=") === "") delete api.jar[name]; // cookie cleared by the server
      else api.jar[name] = rest.join("=");
    }
    return res;
  };

  api.reset = () => { api.jar = {}; api.failNext = 0; api.calls = []; };
  api.stop = () => { globalThis.fetch = realFetch; server.close(); };
  return api;
}

let counter = 0;
export const uniqueEmail = () => `student${Date.now()}${counter++}@example.com`;

// Creates an account straight through the API so the cookie jar holds a valid session.
export async function signUpViaApi(name = "Test Student", email = uniqueEmail()) {
  const res = await fetch("/api/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, email, password: "password123" }),
  });
  return { ...(await res.json()), email };
}

export function renderApp(path = "/") {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AuthProvider>
        <SkillsProvider>
          <App />
        </SkillsProvider>
      </AuthProvider>
    </MemoryRouter>
  );
}
