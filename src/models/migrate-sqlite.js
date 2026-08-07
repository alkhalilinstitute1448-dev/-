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
    last_seen TEXT,
    last_lat REAL,
    last_lng REAL,
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
    outside_since TEXT,
    check_in_lat REAL,
    check_in_lng REAL,
    UNIQUE (user_id, date)
  );
  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );
  INSERT OR IGNORE INTO settings (key, value) VALUES ('geo', '{"name":"جامع إبراهيم الخليل – مساكن برزة","lat":33.538,"lng":36.321,"radius":100,"margin":20,"grace_minutes":2}');
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
    {
      name: '003_geo_settings',
      fn: async () => {
        await q(
          `CREATE TABLE IF NOT EXISTS settings (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL
          )`
        );
        await q(
          `INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)`,
          [
            'geo',
            JSON.stringify({
              name: 'جامع إبراهيم الخليل – مساكن برزة',
              lat: 33.538,
              lng: 36.321,
              radius: 100,
              margin: 20,
              grace_minutes: 2,
            }),
          ]
        );
      },
    },
    {
      name: '004_presence_columns',
      fn: async () => {
        const cols = ['last_seen', 'last_lat', 'last_lng'];
        for (const c of cols) {
          await q(`ALTER TABLE users ADD COLUMN ${c} TEXT`);
        }
        for (const c of ['outside_since', 'check_in_lat', 'check_in_lng', 'session_start', 'session_end']) {
          await q(`ALTER TABLE attendance ADD COLUMN ${c} TEXT`);
        }
      },
    },
    {
      name: '005_registration_tables',
      fn: async () => {
        try {
          await q(`ALTER TABLE users ADD COLUMN must_change_password INTEGER NOT NULL DEFAULT 0`);
        } catch (err) {
          console.log('must_change_password column:', err.message);
        }
        await q(`
          CREATE TABLE IF NOT EXISTS registration_links (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            token TEXT NOT NULL UNIQUE,
            active INTEGER NOT NULL DEFAULT 1,
            created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
            created_at TEXT NOT NULL DEFAULT (datetime('now'))
          )
        `);
        await q(`
          CREATE TABLE IF NOT EXISTS registration_requests (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            link_token TEXT NOT NULL,
            first_name TEXT NOT NULL,
            nickname TEXT NOT NULL,
            father_name TEXT NOT NULL,
            mother_name TEXT NOT NULL,
            father_status TEXT NOT NULL,
            father_job TEXT NOT NULL,
            mother_status TEXT NOT NULL,
            mother_job TEXT NOT NULL,
            phone TEXT NOT NULL,
            photo TEXT,
            status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
            username TEXT,
            approved_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
            created_at TEXT NOT NULL DEFAULT (datetime('now'))
          )
        `);
      },
    },
    {
      name: '006_user_profile_fields',
      fn: async () => {
        const cols = [
          'photo',
          'first_name',
          'nickname',
          'father_name',
          'father_status',
          'father_job',
          'mother_name',
          'mother_status',
          'mother_job',
          'phone',
          'dob',
          'gender',
          'joined_at',
          'admin_notes',
        ];
        for (const c of cols) {
          try {
            await q(`ALTER TABLE users ADD COLUMN ${c} TEXT`);
          } catch (err) {
            console.log(`006 profile column ${c}:`, err.message);
          }
        }
        try {
          const { rows } = await q(
            `SELECT u.id, r.photo, r.first_name, r.nickname, r.father_name, r.father_status, r.father_job,
                    r.mother_name, r.mother_status, r.mother_job, r.phone
             FROM registration_requests r
             JOIN users u ON u.username = r.username
             WHERE r.status = 'approved'`
          );
          for (const r of rows) {
            await q(
              `UPDATE users SET photo=?, first_name=?, nickname=?, father_name=?, father_status=?, father_job=?, mother_name=?, mother_status=?, mother_job=?, phone=? WHERE id=?`,
              [r.photo, r.first_name, r.nickname, r.father_name, r.father_status, r.father_job, r.mother_name, r.mother_status, r.mother_job, r.phone, r.id]
            );
          }
        } catch (err) {
          console.log('006 backfill:', err.message);
        }
        await q('UPDATE users SET joined_at = COALESCE(joined_at, created_at) WHERE joined_at IS NULL');
      },
    },
    {
      name: '007_task_requests',
      fn: async () => {
        await q(`
          CREATE TABLE IF NOT EXISTS task_requests (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            description TEXT DEFAULT '',
            type TEXT NOT NULL DEFAULT 'other',
            priority TEXT NOT NULL DEFAULT 'normal',
            status TEXT NOT NULL DEFAULT 'new',
            due_date TEXT,
            assigned_to INTEGER REFERENCES users(id) ON DELETE SET NULL,
            created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
            delivery_note TEXT DEFAULT '',
            delivery_attachment TEXT DEFAULT '',
            created_at TEXT NOT NULL DEFAULT (datetime('now')),
            updated_at TEXT NOT NULL DEFAULT (datetime('now')),
            updated_by INTEGER REFERENCES users(id) ON DELETE SET NULL
          )
        `);
        await q(`
          CREATE TABLE IF NOT EXISTS notifications (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            title TEXT NOT NULL,
            body TEXT DEFAULT '',
            type TEXT NOT NULL DEFAULT 'task_request',
            read INTEGER NOT NULL DEFAULT 0,
            link TEXT DEFAULT '',
            created_at TEXT NOT NULL DEFAULT (datetime('now'))
          )
        `);
      },
    },
    {
      name: '008_admin_only_assignment',
      fn: async () => {
        try {
          await q('ALTER TABLE users ADD COLUMN admin_only_assignment INTEGER NOT NULL DEFAULT 0');
        } catch (err) {
          console.log('admin_only_assignment column:', err.message);
        }
      },
    },
    {
      name: '009_team_items',
      fn: async () => {
        await q(`
          CREATE TABLE IF NOT EXISTS team_items (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            photo TEXT,
            description TEXT DEFAULT '',
            created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
            created_at TEXT NOT NULL DEFAULT (datetime('now')),
            updated_at TEXT NOT NULL DEFAULT (datetime('now'))
          )
        `);
        await q('CREATE INDEX IF NOT EXISTS idx_team_items_name ON team_items(name)');
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
