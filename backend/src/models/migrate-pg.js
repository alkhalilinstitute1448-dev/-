const bcrypt = require('bcryptjs');

function getQuery() {
  return require('./db').query;
}
const fs = require('fs');
const path = require('path');

const MIGRATIONS_TABLE = `
  CREATE TABLE IF NOT EXISTS _migrations (
    id SERIAL PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    applied_at TIMESTAMPTZ DEFAULT NOW()
  )
`;

const SCHEMA = `
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
`;

async function migrate() {
  const q = getQuery();
  await q(MIGRATIONS_TABLE);

  const { rows } = await q("SELECT name FROM _migrations ORDER BY name");
  const applied = rows.map(r => r.name);

  const migrations = [
    { name: '001_initial_schema', sql: SCHEMA },
    { name: '002_seed_admin', sql: null, seed: true },
    { name: '003_add_stage_column', sql: "ALTER TABLE students ADD COLUMN IF NOT EXISTS stage TEXT", },
  ];

  for (const m of migrations) {
    if (applied.includes(m.name)) continue;
    if (m.sql) {
      await q(m.sql);
    }
    if (m.seed) {
      const existing = await q("SELECT id FROM users WHERE username = 'admin'");
      if (existing.rows.length === 0) {
        const hash = bcrypt.hashSync('admin123', 10);
        await q(
          "INSERT INTO users (username, password_hash, role) VALUES ($1, $2, 'admin')",
          ['admin', hash]
        );
        console.log('Default admin created: admin / admin123');
      }
    }
    await q("INSERT INTO _migrations (name) VALUES ($1)", [m.name]);
    console.log(`Migration ${m.name} applied`);
  }

  console.log('All migrations applied successfully.');
}

module.exports = { migrate };
