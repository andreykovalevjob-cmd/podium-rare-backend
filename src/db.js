const { createClient } = require("@libsql/client");
const path = require("path");
const fs = require("fs");

// DB_PATH можно переопределить через env (по умолчанию — рядом с src/)
const dbPath = process.env.DB_PATH || path.resolve(__dirname, "../podium.db");

// Создаём папку если не существует
const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });

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
      email TEXT,
      phone TEXT,
      website TEXT,
      keywords TEXT,
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
      email TEXT,
      phone TEXT,
      city TEXT,
      logo_url TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS magic_tokens (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      token TEXT NOT NULL UNIQUE,
      user_id INTEGER NOT NULL,
      role TEXT NOT NULL,
      used INTEGER NOT NULL DEFAULT 0,
      expires_at TEXT NOT NULL,
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

  await db.execute(`
    CREATE TABLE IF NOT EXISTS registrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      kind TEXT NOT NULL,           -- creator | brand
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      phone TEXT,
      instagram TEXT,
      website TEXT,
      city TEXT,
      type TEXT,
      bio TEXT,
      status TEXT NOT NULL DEFAULT 'new',  -- new | approved | rejected
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);

  // migrations: add columns if they don't exist yet
  try { await db.execute("ALTER TABLE creators ADD COLUMN email TEXT"); } catch (_) {}
  try { await db.execute("ALTER TABLE creators ADD COLUMN phone TEXT"); } catch (_) {}
  try { await db.execute("ALTER TABLE creators ADD COLUMN website TEXT"); } catch (_) {}
  try { await db.execute("ALTER TABLE creators ADD COLUMN keywords TEXT"); } catch (_) {}
  try { await db.execute("ALTER TABLE registrations ADD COLUMN avatar_url TEXT"); } catch (_) {}
  try { await db.execute("ALTER TABLE brands ADD COLUMN email TEXT"); } catch (_) {}
  try { await db.execute("ALTER TABLE brands ADD COLUMN phone TEXT"); } catch (_) {}
  try { await db.execute("ALTER TABLE brands ADD COLUMN city TEXT"); } catch (_) {}
}

module.exports = { db, init };
