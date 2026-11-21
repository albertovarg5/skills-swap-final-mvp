// Vercel serverless entry. vercel.json rewrites /api/* here.
import { createApp } from "../server/app.js";
import { createDb } from "../server/db.js";

let appPromise;
export default async function handler(req, res) {
  appPromise ??= createDb().then((db) => createApp(db)).catch((e) => { appPromise = undefined; throw e; });
  const app = await appPromise;
  return app(req, res);
}
