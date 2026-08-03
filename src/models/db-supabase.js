const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

let supabase;

function getClient() {
  if (supabase) return supabase;
  const key = SUPABASE_SERVICE_KEY || SUPABASE_ANON_KEY;
  if (!key) throw new Error('SUPABASE_SERVICE_KEY or SUPABASE_ANON_KEY must be set in .env');
  supabase = createClient(SUPABASE_URL, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (url, opts) => {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 5000);
        return fetch(url, { ...opts, signal: controller.signal }).finally(() => clearTimeout(timer));
      },
    },
  });
  return supabase;
}

function escapeValue(val) {
  if (val === null || val === undefined) return 'NULL';
  if (typeof val === 'number') return String(val);
  if (typeof val === 'boolean') return val ? 'TRUE' : 'FALSE';
  const escaped = String(val).replace(/'/g, "''");
  return `'${escaped}'`;
}

function interpolateParams(sql, params) {
  if (!params || params.length === 0) return sql;
  let idx = 0;
  return sql.replace(/\$(\d+)/g, (match, num) => {
    const i = parseInt(num, 10) - 1;
    if (i < params.length) return escapeValue(params[i]);
    return match;
  });
}

async function query(sql, params) {
  const client = getClient();
  const finalSql = interpolateParams(sql, params);
  const isReturning = /^\s*(SELECT|WITH)/i.test(finalSql.trim()) || /\bRETURNING\b/i.test(finalSql);
  const rpcName = isReturning ? 'pg_query' : 'pg_exec';
  const { data, error } = await client.rpc(rpcName, { query_text: finalSql });
  if (error) {
    if (error.message && error.message.includes('function pg_exec(text) does not exist')) {
      throw new Error('pg_exec function not found. Run supabase-migration.sql in SQL Editor first.');
    }
    if (error.message && error.message.includes('function pg_query(text) does not exist')) {
      throw new Error('pg_query function not found. Run supabase-migration.sql in SQL Editor first.');
    }
    throw error;
  }
  if (isReturning) {
    if (Array.isArray(data)) return { rows: data, rowCount: data.length };
    return { rows: data ? [data] : [], rowCount: data ? 1 : 0 };
  }
  return { rows: [], rowCount: 0 };
}

async function getPoolClient() {
  return {
    query: async (text, params) => query(text, params),
    release: () => {},
  };
}

async function migrate() {
  const client = getClient();
  console.log('Running Supabase setup...');

  const steps = [
    {
      name: '001_pg_functions',
      sql: `
        CREATE TABLE IF NOT EXISTS _migrations (
          name TEXT PRIMARY KEY,
          applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
        CREATE OR REPLACE FUNCTION pg_query(query_text text)
        RETURNS SETOF json
        LANGUAGE plpgsql
        SECURITY DEFINER
        AS $$
        BEGIN
          RETURN QUERY EXECUTE 'WITH _cte AS (' || query_text || ') SELECT row_to_json(_r.*) FROM _cte _r';
        EXCEPTION
          WHEN OTHERS THEN
            EXECUTE query_text;
            RETURN;
        END;
        $$;
        CREATE OR REPLACE FUNCTION pg_exec(query_text text)
        RETURNS void
        LANGUAGE plpgsql
        SECURITY DEFINER
        AS $$
        BEGIN
          EXECUTE query_text;
        END;
        $$;
      `,
    },
    {
      name: '002_clean_slate',
      sql: `
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
      `,
    },
    {
      name: '003_media_schema',
      sql: `
        CREATE TABLE IF NOT EXISTS users (
          id SERIAL PRIMARY KEY,
          name TEXT NOT NULL,
          username TEXT NOT NULL UNIQUE,
          password_hash TEXT NOT NULL,
          role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('admin','user')),
          permissions JSONB NOT NULL DEFAULT '[]'::jsonb,
          active BOOLEAN NOT NULL DEFAULT TRUE,
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
          UNIQUE (user_id, date)
        );
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
      `,
    },
    {
      name: '004_seed_admin',
      sql: `
        INSERT INTO users (name, username, password_hash, role, permissions)
        SELECT 'مدير النظام', 'admin', '$2a$10$LR4aMRJ7NbcNovruiVFW9.pBFyc60jgL9vhZGPh46oaubpzh4r7Aa', 'admin', '[]'::jsonb
        WHERE NOT EXISTS (SELECT 1 FROM users WHERE username = 'admin');
      `,
    },
    {
      name: '005_geo_settings',
      sql: `
        CREATE TABLE IF NOT EXISTS settings (
          key TEXT PRIMARY KEY,
          value JSONB NOT NULL
        );
        INSERT INTO settings (key, value)
        SELECT 'geo', '{"name":"جامع إبراهيم الخليل – مساكن برزة","lat":33.538,"lng":36.321,"radius":100,"margin":20,"grace_minutes":2}'::jsonb
        WHERE NOT EXISTS (SELECT 1 FROM settings WHERE key = 'geo');
      `,
    },
    {
      name: '006_presence_columns',
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
      name: '007_session_timestamps',
      sql: `
        ALTER TABLE attendance ADD COLUMN IF NOT EXISTS session_start TIMESTAMPTZ;
        ALTER TABLE attendance ADD COLUMN IF NOT EXISTS session_end TIMESTAMPTZ;
      `,
    },
    {
      name: '008_must_change_password',
      sql: `ALTER TABLE users ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN NOT NULL DEFAULT FALSE;`,
    },
    {
      name: '009_registration_links',
      sql: `
        CREATE TABLE IF NOT EXISTS registration_links (
          id SERIAL PRIMARY KEY,
          token TEXT NOT NULL UNIQUE,
          active BOOLEAN NOT NULL DEFAULT TRUE,
          created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
      `,
    },
    {
      name: '010_registration_requests',
      sql: `
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
  ];

  const isNetworkErr = (err) =>
    err?.message?.includes('fetch failed') ||
    err?.code === 'ECONNRESET' ||
    err?.name === 'AbortError' ||
    err?.message?.includes('timed out');

  let applied = [];
  try {
    const res = await query('SELECT name FROM _migrations');
    applied = res.rows.map((r) => r.name);
  } catch (err) {
    if (isNetworkErr(err)) {
      console.log('Supabase unreachable — skipping migrations.');
      try {
        await query('SELECT 1 AS ok');
      } catch (_) {}
      return;
    }
  }

  for (const step of steps) {
    if (applied.includes(step.name)) continue;
    try {
      await query(step.sql);
      await query('INSERT INTO _migrations (name) VALUES ($1)', [step.name]);
      console.log(`Migration ${step.name} applied`);
    } catch (err) {
      if (isNetworkErr(err)) {
        console.log('Supabase unreachable — skipping remaining migrations.');
        break;
      }
      console.error(`Migration ${step.name} failed:`, err.message);
    }
  }

  try {
    const healthy = await query('SELECT 1 AS ok');
    if (healthy.rows[0]?.ok === 1) {
      console.log('Database connection verified.');
    }
  } catch (err) {
    console.log('Database health check failed:', err.message);
  }

  console.log('Supabase setup completed.');
}

module.exports = { query, getClient: getPoolClient, migrate };
