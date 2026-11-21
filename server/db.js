import { sampleSkills } from "../src/data/sampleSkills.js";

// Returns { query(text, params) } backed by Postgres.
// DATABASE_URL set -> real Postgres (Neon, Supabase...). Not set -> PGlite (local, in-memory or PGLITE_DIR).
export async function createDb() {
  let db;
  if (process.env.DATABASE_URL) {
    const { default: pg } = await import("pg");
    db = new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 3 });
  } else if (process.env.NODE_ENV === "production") {
    throw new Error("DATABASE_URL is required in production");
  } else {
    const { PGlite } = await import("@electric-sql/pglite");
    db = new PGlite(process.env.PGLITE_DIR || undefined);
  }
  // One statement per query (PGlite does not allow several at once).
  const tables = [`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT now()
    )`, `
    CREATE TABLE IF NOT EXISTS skills (
      id SERIAL PRIMARY KEY,
      owner_id INT REFERENCES users(id) ON DELETE CASCADE,
      owner_name TEXT NOT NULL,
      title TEXT NOT NULL,
      category TEXT NOT NULL,
      price INT NOT NULL DEFAULT 0,
      topic TEXT NOT NULL,
      description TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT now()
    )`, `
    CREATE TABLE IF NOT EXISTS saved (
      user_id INT REFERENCES users(id) ON DELETE CASCADE,
      skill_id INT REFERENCES skills(id) ON DELETE CASCADE,
      PRIMARY KEY (user_id, skill_id)
    )`];
  for (const sql of tables) await db.query(sql);
  // Seed the sample skills once (ids 1-6, no owner account).
  for (const s of sampleSkills) {
    await db.query(
      `INSERT INTO skills (id, owner_name, title, category, price, topic, description)
       VALUES ($1,$2,$3,$4,$5,$6,$7) ON CONFLICT (id) DO NOTHING`,
      [s.id, s.owner, s.title, s.category, s.price, s.topic, s.description]
    );
  }
  await db.query(`SELECT setval(pg_get_serial_sequence('skills','id'), GREATEST((SELECT MAX(id) FROM skills), 1))`);
  return db;
}
