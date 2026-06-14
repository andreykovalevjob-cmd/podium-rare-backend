const { createClient } = require("@libsql/client");
const path = require("path");

// DB_PATH можно переопределить через env (по умолчанию — рядом с src/)
const dbPath = process.env.DB_PATH || path.resolve(__dirname, "../podium.db");

const db = createClient({
  url: `file:${dbPath}`,
});

async function init() {
  await db.execute(`
    CREATE TABLE IF NOT EXISTS creators (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      bio TEXT,
      type TEXT NOT NULL,           -- ugc | photo | video | model | art_director
      cities TEXT NOT NULL,         -- JSON array ["NYC","Paris"]
      price_min INTEGER,
      price_max INTEGER,
      instagram TEXT,
      avatar_url TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS brands (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      bio TEXT,
      website TEXT,
      instagram TEXT,
      logo_url TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS works (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      creator_id INTEGER NOT NULL REFERENCES creators(id),
      url TEXT NOT NULL,            -- Cloudinary URL
      public_id TEXT,               -- Cloudinary public_id
      type TEXT NOT NULL DEFAULT 'photo',  -- photo | video
      caption TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);
}

module.exports = { db, init };
