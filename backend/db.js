const Database = require('better-sqlite3');
const path = require('path');
const { dbPath, nodeEnv } = require('./config');

const resolvedPath = nodeEnv === 'test' ? ':memory:' : path.resolve(dbPath);

const db = new Database(resolvedPath);
db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS expenses (
    id              TEXT PRIMARY KEY,
    amount_paise    INTEGER NOT NULL CHECK(amount_paise > 0),
    category        TEXT    NOT NULL,
    description     TEXT    NOT NULL DEFAULT '',
    date            TEXT    NOT NULL,
    idempotency_key TEXT    UNIQUE NOT NULL,
    created_at      TEXT    NOT NULL
  )
`);

module.exports = db;
