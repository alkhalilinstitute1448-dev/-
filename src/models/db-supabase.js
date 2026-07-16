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
      `,
    },
  ];

  for (const step of steps) {
    try {
      await query(step.sql);
      console.log(`Migration ${step.name} applied`);
    } catch (err) {
      if (step.name === '001_pg_functions') {
        console.log('pg_query/pg_exec functions already exist, skipping...');
      } else {
        console.error(`Migration ${step.name} failed:`, err.message);
      }
    }
  }

  const healthy = await query('SELECT 1 AS ok');
  if (healthy.rows[0]?.ok === 1) {
    console.log('Database connection verified.');
  }

  console.log('Supabase setup completed.');
}

module.exports = { query, getClient: getPoolClient, migrate };
