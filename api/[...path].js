// Vercel serverless entry. Catch-all: Vercel sends every /api/* request here.
import { createApp } from "../server/app.js";
import { createDb } from "../server/db.js";

let appPromise;
export default async function handler(req, res) {
  try {
    appPromise ??= createDb().then((db) => createApp(db)).catch((e) => { appPromise = undefined; throw e; });
    const app = await appPromise;
    return app(req, res);
  } catch (e) {
    console.error(`[api] startup failed: ${e.name} ${e.code ?? ""} ${e.message}`);
    res.status(500).json({ error: "Something went wrong. Please try again." });
  }
}
