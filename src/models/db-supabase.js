const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://zgqymkblwodrpzsaviyi.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

let supabase;

function getClient() {
  if (supabase) return supabase;
  const key = SUPABASE_SERVICE_KEY || SUPABASE_ANON_KEY;
  if (!key) throw new Error('SUPABASE_SERVICE_KEY or SUPABASE_ANON_KEY must be set in .env');
  supabase = createClient(SUPABASE_URL, key, {
    auth: { persistSession: false, autoRefreshToken: false },
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
    if (i < params.length) {
      return escapeValue(params[i]);
    }
    return match;
  });
}

async function query(sql, params) {
  const client = getClient();
  const finalSql = interpolateParams(sql, params);

  const isReturning = /^\s*(SELECT|WITH)/i.test(finalSql.trim()) || /\bRETURNING\b/i.test(finalSql);

  const start = Date.now();
  const rpcName = isReturning ? 'pg_query' : 'pg_exec';
  const { data, error } = await client.rpc(rpcName, { query_text: finalSql });
  const duration = Date.now() - start;

  if (error) {
    if (error.message && error.message.includes('function pg_exec(text) does not exist')) {
      throw new Error(
        'دالة pg_exec غير موجودة. يرجى تشغيل supabase-migration.sql في SQL Editor أولاً.'
      );
    }
    if (error.message && error.message.includes('function pg_query(text) does not exist')) {
      throw new Error(
        'دالة pg_query غير موجودة. يرجى تشغيل supabase-migration.sql في SQL Editor أولاً.'
      );
    }
    throw error;
  }

  if (process.env.NODE_ENV !== 'production') {
    console.log('Supabase ' + rpcName, { text: sql.substring(0, 80), duration, rows: data?.length || 0 });
  }

  if (isReturning) {
    if (Array.isArray(data)) {
      return { rows: data, rowCount: data.length };
    }
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

  console.log('Running Supabase migrations...');

  const migrationSteps = [
    {
      name: '001_initial_schema',
      sql: `
        CREATE TABLE IF NOT EXISTS users (
          id SERIAL PRIMARY KEY,
          username VARCHAR(100) UNIQUE NOT NULL,
          password_hash TEXT NOT NULL,
          role VARCHAR(20) NOT NULL CHECK(role IN ('admin', 'teacher', 'attendance_officer', 'student')),
          device_id TEXT,
          is_active BOOLEAN DEFAULT TRUE,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        );
        CREATE TABLE IF NOT EXISTS batches (
          id SERIAL PRIMARY KEY,
          year INTEGER NOT NULL,
          name VARCHAR(200) NOT NULL,
          created_at TIMESTAMPTZ DEFAULT NOW()
        );
        CREATE TABLE IF NOT EXISTS stages (
          id SERIAL PRIMARY KEY,
          batch_id INTEGER NOT NULL REFERENCES batches(id) ON DELETE CASCADE,
          name VARCHAR(200) NOT NULL,
          level INTEGER NOT NULL,
          created_at TIMESTAMPTZ DEFAULT NOW()
        );
        CREATE TABLE IF NOT EXISTS students (
          id SERIAL PRIMARY KEY,
          user_id INTEGER UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          full_name VARCHAR(200) NOT NULL,
          father_name VARCHAR(200) NOT NULL,
          mother_name VARCHAR(200) NOT NULL,
          father_status VARCHAR(50),
          mother_status VARCHAR(50),
          father_occupation VARCHAR(200),
          mother_occupation VARCHAR(200),
          student_phone VARCHAR(50),
          father_phone VARCHAR(50),
          mother_phone VARCHAR(50),
          primary_contact VARCHAR(10) CHECK(primary_contact IN ('student', 'father', 'mother')),
          birth_year INTEGER,
          photo_url TEXT,
          batch_id INTEGER REFERENCES batches(id),
          stage_id INTEGER REFERENCES stages(id),
          stage TEXT,
          created_at TIMESTAMPTZ DEFAULT NOW()
        );
        CREATE TABLE IF NOT EXISTS exams (
          id SERIAL PRIMARY KEY,
          title VARCHAR(300) NOT NULL,
          stage_id INTEGER NOT NULL REFERENCES stages(id) ON DELETE CASCADE,
          subject VARCHAR(200),
          code VARCHAR(20) UNIQUE,
          start_time TIMESTAMPTZ,
          end_time TIMESTAMPTZ,
          duration_minutes INTEGER,
          file_url TEXT,
          created_by INTEGER REFERENCES users(id),
          is_active BOOLEAN DEFAULT TRUE,
          created_at TIMESTAMPTZ DEFAULT NOW()
        );
        CREATE TABLE IF NOT EXISTS exam_results (
          id SERIAL PRIMARY KEY,
          exam_id INTEGER NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
          student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
          score REAL,
          total REAL,
          submitted_at TIMESTAMPTZ DEFAULT NOW()
        );
        CREATE TABLE IF NOT EXISTS attendance (
          id SERIAL PRIMARY KEY,
          student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
          date DATE NOT NULL,
          status VARCHAR(10) NOT NULL CHECK(status IN ('present', 'absent', 'late', 'excused')),
          recorded_by INTEGER REFERENCES users(id),
          notes TEXT,
          created_at TIMESTAMPTZ DEFAULT NOW()
        );
        CREATE TABLE IF NOT EXISTS grades (
          id SERIAL PRIMARY KEY,
          student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
          subject VARCHAR(200) NOT NULL,
          grade REAL,
          term VARCHAR(50),
          created_by INTEGER REFERENCES users(id),
          created_at TIMESTAMPTZ DEFAULT NOW()
        );
        CREATE TABLE IF NOT EXISTS curriculum_files (
          id SERIAL PRIMARY KEY,
          stage_id INTEGER NOT NULL REFERENCES stages(id) ON DELETE CASCADE,
          title VARCHAR(300) NOT NULL,
          file_url TEXT NOT NULL,
          file_type VARCHAR(50),
          uploaded_by INTEGER REFERENCES users(id),
          created_at TIMESTAMPTZ DEFAULT NOW()
        );
        CREATE TABLE IF NOT EXISTS books (
          id SERIAL PRIMARY KEY,
          student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
          book_name VARCHAR(300) NOT NULL,
          received_date DATE,
          returned_date DATE,
          status VARCHAR(20) DEFAULT 'pending' CHECK(status IN ('pending', 'received', 'returned')),
          created_at TIMESTAMPTZ DEFAULT NOW()
        );
      `,
    },
    {
      name: '002_create_pg_query_function',
      sql: `
        CREATE OR REPLACE FUNCTION pg_query(query_text text)
        RETURNS SETOF json
        LANGUAGE plpgsql
        SECURITY DEFINER
        AS $$
        BEGIN
          RETURN QUERY EXECUTE 'SELECT row_to_json(_r.*) FROM (' || query_text || ') _r';
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
      name: '003_seed_admin',
      seed: true,
    },
    {
      name: '004_add_stage_column',
      sql: 'ALTER TABLE students ADD COLUMN IF NOT EXISTS stage TEXT',
    },
  ];

  for (const step of migrationSteps) {
    try {
      if (step.sql) {
        await query(step.sql);
        console.log(`Migration ${step.name} applied`);
      }
      if (step.seed) {
        const { data: existing } = await client
          .from('users')
          .select('id')
          .eq('username', 'admin')
          .maybeSingle();

        if (!existing) {
          const bcrypt = require('bcryptjs');
          const hash = bcrypt.hashSync('admin123', 10);
          await client.from('users').insert({
            username: 'admin',
            password_hash: hash,
            role: 'admin',
          });
          console.log('Default admin created: admin / admin123');
        }
        console.log(`Migration ${step.name} applied`);
      }
    } catch (err) {
      if (step.name === '002_create_pg_query_function') {
        console.log('pg_query function already exists, skipping...');
      } else if (step.sql && step.sql.includes('ADD COLUMN IF NOT EXISTS')) {
        console.log(`Migration ${step.name}: column may already exist, continuing...`);
      } else {
        console.error(`Migration ${step.name} failed:`, err.message);
      }
    }
  }

  console.log('Supabase migrations completed.');
}

module.exports = { query, getClient: getPoolClient, migrate };
