import pg from 'pg';
const { Pool } = pg;
export const pool = new Pool({ connectionString: process.env.DATABASE_URL });
export async function withTenant<T>(gymId: string, fn: (client: pg.PoolClient) => Promise<T>) {
  const client = await pool.connect();
  try { await client.query('BEGIN'); await client.query('select set_config($1, $2, true)', ['app.current_gym_id', gymId]); const result = await fn(client); await client.query('COMMIT'); return result; }
  catch (error) { await client.query('ROLLBACK'); throw error; } finally { client.release(); }
}
