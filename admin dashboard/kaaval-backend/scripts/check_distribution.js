const { Client } = require('pg');
const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const client = new Client({
  user: process.env.DB_USERNAME || 'kaaval',
  password: process.env.DB_PASSWORD || 'kaaval@123',
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'kaaval_ai',
});

async function run() {
  await client.connect();
  console.log('--- STATUSES ---');
  const statuses = await client.query('SELECT status, COUNT(*) FROM violations GROUP BY status');
  console.table(statuses.rows);

  console.log('--- DATES ---');
  const dates = await client.query('SELECT DATE(created_at) as date, COUNT(*) FROM violations GROUP BY DATE(created_at) ORDER BY date DESC LIMIT 10');
  console.table(dates.rows);

  console.log('--- TYPES ---');
  const types = await client.query('SELECT violation_type, COUNT(*) FROM violations GROUP BY violation_type');
  console.table(types.rows);
  
  await client.end();
}
run();
