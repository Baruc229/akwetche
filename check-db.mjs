import pg from 'pg';
const { Pool } = pg;

const url = process.env.DATABASE_URL;
const pool = new Pool({ connectionString: url });

try {
  // Check _prisma_migrations
  const migs = await pool.query(`SELECT * FROM "_prisma_migrations" ORDER BY started_at`);
  console.log('Migrations:', JSON.stringify(migs.rows.map(r => ({ id: r.id.substring(0,12), name: r.migration_name, rolled_back: r.rolled_back_at })), null, 2));
  
  // Check User count with exact query
  const users = await pool.query(`SELECT count(*) as cnt FROM "User"`);
  console.log('User count:', users.rows[0].cnt);
  
  // Get all users
  const allUsers = await pool.query(`SELECT id, email, role FROM "User"`);
  console.log('All users:', JSON.stringify(allUsers.rows, null, 2));
  
  // Check other tables
  for (const tbl of ['Category', 'Transaction', 'Product', 'Sale']) {
    const r = await pool.query(`SELECT count(*) as cnt FROM "${tbl}"`);
    console.log(`${tbl}: ${r.rows[0].cnt} rows`);
  }
} catch(e) {
  console.error('Error:', e.message);
}
finally { await pool.end(); }
