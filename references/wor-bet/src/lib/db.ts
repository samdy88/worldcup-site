import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const DB_PATH = path.join(process.cwd(), 'data', 'worldcup.db');

let db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (!db) {
    return initDB();
  }
  return db;
}

export function initDB(): Database.Database {
  const dataDir = path.dirname(DB_PATH);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  // Keep WAL bounded automatically; live deployments still checkpoint before DB backup/copy.
  db.pragma('wal_autocheckpoint = 1000');

  db.exec(`
    CREATE TABLE IF NOT EXISTS tournaments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      slug TEXT UNIQUE NOT NULL,
      icon TEXT DEFAULT '🏆',
      sport TEXT DEFAULT 'football',
      start_date TEXT,
      end_date TEXT,
      status TEXT DEFAULT 'upcoming',
      sort_order INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      balance REAL DEFAULT 100.0,
      is_admin INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS matches (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tournament_id INTEGER,
      home_team TEXT NOT NULL,
      away_team TEXT NOT NULL,
      round_name TEXT,
      kickoff_time TEXT NOT NULL,
      status TEXT DEFAULT 'upcoming',
      result_home INTEGER,
      result_away INTEGER,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (tournament_id) REFERENCES tournaments(id)
    );

    CREATE TABLE IF NOT EXISTS markets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      match_id INTEGER NOT NULL,
      market_type TEXT NOT NULL,
      description TEXT,
      settled INTEGER DEFAULT 0,
      winning_option TEXT,
      FOREIGN KEY (match_id) REFERENCES matches(id)
    );

    CREATE TABLE IF NOT EXISTS market_options (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      market_id INTEGER NOT NULL,
      label TEXT NOT NULL,
      price REAL NOT NULL DEFAULT 0.33,
      sort_order INTEGER DEFAULT 0,
      FOREIGN KEY (market_id) REFERENCES markets(id)
    );

    CREATE TABLE IF NOT EXISTS bets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      market_option_id INTEGER NOT NULL,
      amount REAL NOT NULL,
      shares REAL NOT NULL,
      price_at_bet REAL NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (market_option_id) REFERENCES market_options(id)
    );

    CREATE TABLE IF NOT EXISTS transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      type TEXT NOT NULL,
      amount REAL NOT NULL,
      ref_id INTEGER,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id)
    );
  `);

  // Safe migration: add tournament_id column if missing
  try {
    db.exec('ALTER TABLE matches ADD COLUMN tournament_id INTEGER REFERENCES tournaments(id)');
  } catch (e: any) {
    if (!e.message?.includes('duplicate column')) throw e;
  }

  return db;
}
