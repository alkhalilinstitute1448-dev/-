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
    await q("INSERT INTO _migrations (name) VALUES (?)", [m.name]);
    console.log(`Migration ${m.name} applied`);
  }

  const healthy = await q('SELECT 1 AS ok');
  if (healthy.rows[0]?.ok === 1) {
    console.log('Database connection verified.');
  }
}

module.exports = { migrate };
