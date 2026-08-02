const bcrypt = require('bcryptjs');

function getQuery() {
  return require('./db').query;
}

const DROP_OLD_TABLES = `
  DROP TABLE IF EXISTS books;
  DROP TABLE IF EXISTS curriculum_files;
  DROP TABLE IF EXISTS grades;
  DROP TABLE IF EXISTS attendance;
  DROP TABLE IF EXISTS exam_results;
  DROP TABLE IF EXISTS exams;
  DROP TABLE IF EXISTS students;
  DROP TABLE IF EXISTS stages;
  DROP TABLE IF EXISTS batches;
  DROP TABLE IF EXISTS users;
  DROP TABLE IF EXISTS tasks;
  DROP TABLE IF EXISTS lessons;
  DROP TABLE IF EXISTS captions;
  DROP TABLE IF EXISTS activities;
  DROP TABLE IF EXISTS archives;
`;

const SCHEMA = `
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    username TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('admin','user')),
    permissions TEXT NOT NULL DEFAULT '[]',
    active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT DEFAULT '',
    assigned_to INTEGER REFERENCES users(id) ON DELETE SET NULL,
    priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low','medium','high')),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','in_progress','completed','cancelled')),
    due_date TEXT,
    notes TEXT DEFAULT '',
    created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS lessons (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT DEFAULT '',
    type TEXT NOT NULL DEFAULT 'recorded' CHECK (type IN ('recorded','live')),
    presenter TEXT DEFAULT '',
    date TEXT,
    duration TEXT DEFAULT '',
    materials TEXT DEFAULT '',
    notes TEXT DEFAULT '',
    status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled','done','cancelled')),
    created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS attendance (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    date TEXT NOT NULL,
    check_in TEXT,
    check_out TEXT,
    status TEXT NOT NULL DEFAULT 'present' CHECK (status IN ('present','absent','late','leave')),
    notes TEXT DEFAULT '',
    UNIQUE (user_id, date)
  );
  CREATE TABLE IF NOT EXISTS captions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    platform TEXT NOT NULL DEFAULT 'facebook',
    name TEXT NOT NULL,
    text TEXT NOT NULL,
    tags TEXT NOT NULL DEFAULT '[]',
    created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS activities (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    entity TEXT,
    details TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS archives (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT DEFAULT '',
    type TEXT NOT NULL DEFAULT 'other' CHECK (type IN ('post','video','design','article','other')),
    url TEXT DEFAULT '',
    date TEXT,
    created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
`;

const MIGRATIONS_TABLE = `
  CREATE TABLE IF NOT EXISTS _migrations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    applied_at TEXT DEFAULT (datetime('now'))
  )
`;

async function migrate() {
  const q = getQuery();
  await q(MIGRATIONS_TABLE);

  const { rows } = await q("SELECT name FROM _migrations ORDER BY name");
  const applied = rows.map(r => r.name);

  const migrations = [
    { name: '000_clean_slate', sql: DROP_OLD_TABLES },
    { name: '001_schema', sql: SCHEMA },
    {
      name: '002_seed_admin',
      fn: async () => {
        const existing = await q("SELECT COUNT(*) AS c FROM users WHERE username = 'admin'");
        if (existing.rows[0]?.c === 0) {
          const hash = await bcrypt.hash('admin123', 10);
          await q(
            `INSERT INTO users (name, username, password_hash, role, permissions)
             VALUES (?, ?, ?, ?, ?)`,
            ['مدير النظام', 'admin', hash, 'admin', '[]']
          );
        }
      },
    },
  ];

  for (const m of migrations) {
    if (applied.includes(m.name)) continue;
    if (m.sql) {
      try {
        await q(m.sql);
      } catch (err) {
        console.log(`Migration ${m.name}: ${err.message}`);
      }
    }
    if (m.fn) {
      try {
        await m.fn();
      } catch (err) {
        console.log(`Migration ${m.name}: ${err.message}`);
      }
    }
    await q("INSERT INTO _migrations (name) VALUES (?)", [m.name]);
    console.log(`Migration ${m.name} applied`);
  }

  const healthy = await q('SELECT 1 AS ok');
  if (healthy.rows[0]?.ok === 1) {
    console.log('Database connection verified.');
  }
}

module.exports = { migrate };
