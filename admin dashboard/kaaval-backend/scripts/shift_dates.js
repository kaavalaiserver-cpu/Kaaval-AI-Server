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
  const res = await client.query("UPDATE violations SET created_at = created_at + interval '1 day' WHERE created_at >= '2026-06-12'");
  console.log('Shifted ' + res.rowCount + ' records to today');
  await client.end();
}
run();
