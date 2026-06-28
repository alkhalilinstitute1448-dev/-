const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });

const USE_SUPABASE = process.env.USE_SUPABASE === 'true' || !!process.env.SUPABASE_SERVICE_KEY;
const USE_POSTGRES = !USE_SUPABASE && !!process.env.DATABASE_URL;

let query, getClient, pool;

if (USE_SUPABASE) {
  const supabase = require('./db-supabase');
  query = supabase.query;
  getClient = supabase.getClient;
  pool = null;
} else if (USE_POSTGRES) {
  const { Pool } = require('pg');
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  });
  pool.on('error', (err) => console.error('PG pool error', err));
  query = async (text, params) => {
    const start = Date.now();
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    if (process.env.NODE_ENV !== 'production') {
      console.log('PG query', { text: text.substring(0, 80), duration, rows: res.rowCount });
    }
    return res;
  };
  getClient = async () => pool.connect();
} else {
  const initSqlJs = require('sql.js');
  let db;
  const DB_PATH = path.join(__dirname, '..', '..', 'data', 'academy.db');
  const fs = require('fs');

  async function getDb() {
    if (db) return db;
    const SQL = await initSqlJs();
    if (fs.existsSync(DB_PATH)) {
      const buf = fs.readFileSync(DB_PATH);
      db = new SQL.Database(buf);
    } else {
      db = new SQL.Database();
      const dir = path.dirname(DB_PATH);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    }
    db.run('PRAGMA journal_mode=WAL');
    db.run('PRAGMA foreign_keys=ON');
    return db;
  }

  function saveDb() {
    if (!db) return;
    const data = db.export();
    const buf = Buffer.from(data);
    fs.writeFileSync(DB_PATH, buf);
  }

  function toSqlite(sql) {
    return sql.replace(/\$(\d+)/g, () => '?');
  }

  query = async (sql, params) => {
    const d = await getDb();
    sql = toSqlite(sql);
    const isSelect = sql.trim().toUpperCase().startsWith('SELECT') || sql.includes('RETURNING');
    if (isSelect) {
      const stmt = d.prepare(sql);
      if (params) stmt.bind(params);
      const rows = [];
      while (stmt.step()) rows.push(stmt.getAsObject());
      stmt.free();
      return { rows, rowCount: rows.length };
    } else {
      d.run(sql, params);
      saveDb();
      const lastId = db.exec("SELECT last_insert_rowid() as id")[0]?.values[0]?.[0];
      return { rows: lastId ? [{ id: lastId }] : [], rowCount: 0 };
    }
  };

  getClient = async () => {
    const d = await getDb();
    return { query: (sql, params) => query(sql, params), release: () => {} };
  };
}

async function migrate() {
  if (USE_SUPABASE) {
    const m = require('./db-supabase');
    await m.migrate();
  } else if (USE_POSTGRES) {
    const m = require('./migrate-pg');
    await m.migrate();
  } else {
    const m = require('./migrate-sqlite');
    await m.migrate();
  }
}

module.exports = { query, getClient, pool, USE_POSTGRES, USE_SUPABASE, migrate };
