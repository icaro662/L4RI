import Database from 'better-sqlite3';

const db = new Database('./message.db');

db.exec(`
  CREATE TABLE IF NOT EXISTS media  (
    id TEXT PRIMARY KEY,
    username TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  )
`);

export default db;