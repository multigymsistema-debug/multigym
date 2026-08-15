import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { pool } from './db.js';

export async function migrate() {
  await pool.query('CREATE TABLE IF NOT EXISTS schema_migrations (name text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())');
  for (const name of ['001_initial_schema.sql', '002_auth_schema.sql']) {
    const done = await pool.query('SELECT 1 FROM schema_migrations WHERE name=$1', [name]);
    if (done.rowCount) continue;
    const sql = await readFile(join(process.cwd(), 'schema', name), 'utf8');
    await pool.query(sql);
    await pool.query('INSERT INTO schema_migrations (name) VALUES ($1)', [name]);
  }
}
