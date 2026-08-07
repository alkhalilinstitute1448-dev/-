const bcrypt = require('bcryptjs');

function getQuery() {
  return require('./db').query;
}

const DROP_OLD_TABLES = `
  DROP TABLE IF EXISTS books CASCADE;
  DROP TABLE IF EXISTS curriculum_files CASCADE;
  DROP TABLE IF EXISTS grades CASCADE;
  DROP TABLE IF EXISTS attendance CASCADE;
  DROP TABLE IF EXISTS exam_results CASCADE;
  DROP TABLE IF EXISTS exams CASCADE;
  DROP TABLE IF EXISTS students CASCADE;
  DROP TABLE IF EXISTS stages CASCADE;
  DROP TABLE IF EXISTS batches CASCADE;
  DROP TABLE IF EXISTS users CASCADE;
  DROP TABLE IF EXISTS tasks CASCADE;
  DROP TABLE IF EXISTS lessons CASCADE;
  DROP TABLE IF EXISTS captions CASCADE;
  DROP TABLE IF EXISTS activities CASCADE;
  DROP TABLE IF EXISTS archives CASCADE;
`;

const SCHEMA = `
  CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    username TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('admin','user')),
    permissions JSONB NOT NULL DEFAULT '[]'::jsonb,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    last_seen TIMESTAMPTZ,
    last_lat DOUBLE PRECISION,
    last_lng DOUBLE PRECISION,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );
  CREATE TABLE IF NOT EXISTS tasks (
    id SERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT DEFAULT '',
    assigned_to INTEGER REFERENCES users(id) ON DELETE SET NULL,
    priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low','medium','high')),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','in_progress','completed','cancelled')),
    due_date DATE,
    notes TEXT DEFAULT '',
    created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );
  CREATE TABLE IF NOT EXISTS lessons (
    id SERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT DEFAULT '',
    type TEXT NOT NULL DEFAULT 'recorded' CHECK (type IN ('recorded','live')),
    presenter TEXT DEFAULT '',
    date DATE,
    duration TEXT DEFAULT '',
    materials TEXT DEFAULT '',
    notes TEXT DEFAULT '',
    status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled','done','cancelled')),
    created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );
  CREATE TABLE IF NOT EXISTS attendance (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    check_in TIME,
    check_out TIME,
    status TEXT NOT NULL DEFAULT 'present' CHECK (status IN ('present','absent','late','leave')),
    notes TEXT DEFAULT '',
    outside_since TIMESTAMPTZ,
    check_in_lat DOUBLE PRECISION,
    check_in_lng DOUBLE PRECISION,
    UNIQUE (user_id, date)
  );
  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL
  );
  INSERT INTO settings (key, value) VALUES ('geo', '{"name":"جامع إبراهيم الخليل – مساكن برزة","lat":33.538,"lng":36.321,"radius":100,"margin":20,"grace_minutes":2}'::jsonb)
  ON CONFLICT (key) DO NOTHING;
  CREATE TABLE IF NOT EXISTS captions (
    id SERIAL PRIMARY KEY,
    platform TEXT NOT NULL DEFAULT 'facebook',
    name TEXT NOT NULL,
    text TEXT NOT NULL,
    tags JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );
  CREATE TABLE IF NOT EXISTS activities (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    entity TEXT,
    details TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );
  CREATE TABLE IF NOT EXISTS archives (
    id SERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT DEFAULT '',
    type TEXT NOT NULL DEFAULT 'other' CHECK (type IN ('post','video','design','article','other')),
    url TEXT DEFAULT '',
    date DATE,
    created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );
`;

const MIGRATIONS_TABLE = `
  CREATE TABLE IF NOT EXISTS _migrations (
    id SERIAL PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    applied_at TIMESTAMPTZ DEFAULT NOW()
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
        const existing = await q("SELECT COUNT(*)::int AS c FROM users WHERE username = 'admin'");
        if (existing.rows[0]?.c === 0) {
          const hash = await bcrypt.hash('admin123', 10);
          await q(
            `INSERT INTO users (name, username, password_hash, role, permissions)
             VALUES ($1, $2, $3, $4, $5::jsonb)`,
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
            value JSONB NOT NULL
          )`
        );
        await q(
          `INSERT INTO settings (key, value) VALUES ($1, $2::jsonb)
           ON CONFLICT (key) DO NOTHING`,
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
      sql: `
        ALTER TABLE users ADD COLUMN IF NOT EXISTS last_seen TIMESTAMPTZ;
        ALTER TABLE users ADD COLUMN IF NOT EXISTS last_lat DOUBLE PRECISION;
        ALTER TABLE users ADD COLUMN IF NOT EXISTS last_lng DOUBLE PRECISION;
        ALTER TABLE attendance ADD COLUMN IF NOT EXISTS outside_since TIMESTAMPTZ;
        ALTER TABLE attendance ADD COLUMN IF NOT EXISTS check_in_lat DOUBLE PRECISION;
        ALTER TABLE attendance ADD COLUMN IF NOT EXISTS check_in_lng DOUBLE PRECISION;
      `,
    },
    {
      name: '005_session_timestamps',
      sql: `
        ALTER TABLE attendance ADD COLUMN IF NOT EXISTS session_start TIMESTAMPTZ;
        ALTER TABLE attendance ADD COLUMN IF NOT EXISTS session_end TIMESTAMPTZ;
      `,
    },
    {
      name: '006_registration_tables',
      sql: `
        ALTER TABLE users ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN NOT NULL DEFAULT FALSE;
        CREATE TABLE IF NOT EXISTS registration_links (
          id SERIAL PRIMARY KEY,
          token TEXT NOT NULL UNIQUE,
          active BOOLEAN NOT NULL DEFAULT TRUE,
          created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
        CREATE TABLE IF NOT EXISTS registration_requests (
          id SERIAL PRIMARY KEY,
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
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
      `,
    },
    {
      name: '014_team_items',
      sql: `
        CREATE TABLE IF NOT EXISTS team_items (
          id SERIAL PRIMARY KEY,
          name TEXT NOT NULL,
          photo TEXT,
          description TEXT DEFAULT '',
          created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
        CREATE INDEX IF NOT EXISTS idx_team_items_name ON team_items(name);
      `,
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
    await q("INSERT INTO _migrations (name) VALUES ($1)", [m.name]);
    console.log(`Migration ${m.name} applied`);
  }

  const healthy = await q('SELECT 1 AS ok');
  if (healthy.rows[0]?.ok === 1) {
    console.log('Database connection verified.');
  }
}

module.exports = { migrate };
