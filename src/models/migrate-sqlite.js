const bcrypt = require('bcryptjs');

function getQuery() {
  return require('./db').query;
}

const MIGRATIONS_TABLE = `
  CREATE TABLE IF NOT EXISTS _migrations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    applied_at TEXT DEFAULT (datetime('now'))
  )
`;

const SCHEMA = `
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL CHECK(role IN ('admin', 'teacher', 'attendance_officer', 'student')),
    device_id TEXT,
    is_active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS batches (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    year INTEGER NOT NULL,
    name TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS stages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    batch_id INTEGER NOT NULL REFERENCES batches(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    level INTEGER NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS students (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    father_name TEXT NOT NULL,
    mother_name TEXT NOT NULL,
    father_status TEXT,
    mother_status TEXT,
    father_occupation TEXT,
    mother_occupation TEXT,
    student_phone TEXT,
    father_phone TEXT,
    mother_phone TEXT,
    primary_contact TEXT CHECK(primary_contact IN ('student', 'father', 'mother')),
    birth_year INTEGER,
    photo_url TEXT,
    batch_id INTEGER REFERENCES batches(id),
    stage_id INTEGER REFERENCES stages(id),
    stage TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS exams (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    stage_id INTEGER NOT NULL REFERENCES stages(id) ON DELETE CASCADE,
    subject TEXT,
    code TEXT UNIQUE,
    start_time TEXT,
    end_time TEXT,
    duration_minutes INTEGER,
    file_url TEXT,
    created_by INTEGER REFERENCES users(id),
    is_active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS exam_results (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    exam_id INTEGER NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
    student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    score REAL,
    total REAL,
    submitted_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS attendance (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    date TEXT NOT NULL,
    status TEXT NOT NULL CHECK(status IN ('present', 'absent', 'late', 'excused')),
    recorded_by INTEGER REFERENCES users(id),
    notes TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS grades (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    subject TEXT NOT NULL,
    grade REAL,
    term TEXT,
    created_by INTEGER REFERENCES users(id),
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS curriculum_files (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    stage_id INTEGER NOT NULL REFERENCES stages(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    file_url TEXT NOT NULL,
    file_type TEXT,
    uploaded_by INTEGER REFERENCES users(id),
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS books (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    book_name TEXT NOT NULL,
    received_date TEXT,
    returned_date TEXT,
    status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'received', 'returned')),
    created_at TEXT DEFAULT (datetime('now'))
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
    { name: '003_add_stage_column', sql: "ALTER TABLE students ADD COLUMN stage TEXT", },
    { name: '004_add_current_job', sql: "ALTER TABLE students ADD COLUMN current_job TEXT", },
    { name: '005_add_nationality', sql: "ALTER TABLE students ADD COLUMN nationality TEXT", },
    { name: '006_fix_admin_role', sql: "UPDATE users SET role = 'admin' WHERE username = 'admin' AND role != 'admin'", },
    { name: '007_clean_dup_students', sql: `
      DELETE FROM students WHERE id IN (
        SELECT id FROM (
          SELECT id, ROW_NUMBER() OVER (PARTITION BY student_phone ORDER BY created_at ASC, id ASC) AS rn
          FROM students WHERE student_phone IS NOT NULL
        ) dup WHERE dup.rn > 1
      );
      DELETE FROM users WHERE role = 'student' AND id NOT IN (SELECT user_id FROM students);
    `, },
    { name: '008_unique_student_phone', sql: "CREATE UNIQUE INDEX IF NOT EXISTS idx_students_student_phone ON students(student_phone)", },
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
          "INSERT INTO users (username, password_hash, role) VALUES (?, ?, 'admin')",
          ['admin', hash]
        );
        console.log('Default admin created: admin / admin123');
      }
    }
    await q("INSERT INTO _migrations (name) VALUES (?)", [m.name]);
    console.log(`Migration ${m.name} applied`);
  }

  console.log('All migrations applied successfully.');
}

module.exports = { migrate };
