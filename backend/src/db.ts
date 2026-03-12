import Database from 'better-sqlite3';
import path from 'path';

const DB_PATH = process.env.DB_PATH ?? path.join(process.cwd(), 'game.db');

export const db = new Database(DB_PATH);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id          TEXT PRIMARY KEY,
    name        TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    created_at  TEXT NOT NULL,
    last_seen_at TEXT NOT NULL
  );

  -- Предметы и подарки в инвентаре игрока (уже раскрытые)
  CREATE TABLE IF NOT EXISTS inventory (
    instance_id   TEXT PRIMARY KEY,
    owner_id      TEXT NOT NULL,
    catalog_id    TEXT NOT NULL,
    type          TEXT NOT NULL CHECK (type IN ('item', 'gift')),
    from_user_id  TEXT,
    from_user_name TEXT,
    is_anonymous  INTEGER NOT NULL DEFAULT 0,
    message       TEXT,
    received_at   TEXT NOT NULL
  );

  -- Нераскрытые подарки
  CREATE TABLE IF NOT EXISTS wrapped_gifts (
    instance_id   TEXT PRIMARY KEY,
    owner_id      TEXT NOT NULL,
    catalog_id    TEXT NOT NULL,
    from_user_id  TEXT,
    from_user_name TEXT,
    is_anonymous  INTEGER NOT NULL DEFAULT 0,
    message       TEXT,
    received_at   TEXT NOT NULL
  );

  -- Предметы на сцене (глобальный пул)
  CREATE TABLE IF NOT EXISTS scene_items (
    instance_id       TEXT PRIMARY KEY,
    catalog_id        TEXT NOT NULL,
    spawn_point_index INTEGER NOT NULL,
    spawned_at        TEXT NOT NULL
  );

  -- Личные тройки целей
  CREATE TABLE IF NOT EXISTS personal_goals (
    user_id         TEXT PRIMARY KEY,
    catalog_id_1    TEXT NOT NULL,
    catalog_id_2    TEXT NOT NULL,
    catalog_id_3    TEXT NOT NULL,
    collected_1     INTEGER NOT NULL DEFAULT 0,
    collected_2     INTEGER NOT NULL DEFAULT 0,
    collected_3     INTEGER NOT NULL DEFAULT 0,
    completed_count INTEGER NOT NULL DEFAULT 0
  );

  -- Коллективная цель (singleton, id всегда = 1)
  CREATE TABLE IF NOT EXISTS collective_goal (
    id             INTEGER PRIMARY KEY CHECK (id = 1),
    current        INTEGER NOT NULL DEFAULT 0,
    target         INTEGER NOT NULL DEFAULT 300,
    last_recalc_at TEXT NOT NULL
  );
`);

// Миграции: добавляем колонки если их ещё нет
try {
  db.exec(`ALTER TABLE inventory ADD COLUMN source TEXT NOT NULL DEFAULT 'scene'`);
} catch { /* колонка уже есть */ }

try {
  db.exec(`ALTER TABLE inventory ADD COLUMN hourly_notified INTEGER NOT NULL DEFAULT 0`);
} catch { /* колонка уже есть */ }

try {
  db.exec(`ALTER TABLE inventory ADD COLUMN result_catalog_id TEXT`);
} catch { /* колонка уже есть */ }

// Инициализация коллективной цели если её ещё нет
const goalExists = db
  .prepare('SELECT id FROM collective_goal WHERE id = 1')
  .get();

if (!goalExists) {
  db.prepare(
    'INSERT INTO collective_goal (id, current, target, last_recalc_at) VALUES (1, 0, 300, ?)',
  ).run(new Date().toISOString());
}
