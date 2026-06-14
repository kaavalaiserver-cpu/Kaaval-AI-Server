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
  const res = await client.query('SELECT id FROM violations');
  let count = 0;
  await client.query('BEGIN');
  for (const row of res.rows) {
    const r = Math.random();
    let t = 'NO_HELMET';
    if (r < 0.1) t = 'TRIPLE_RIDING';
    else if (r < 0.25) t = 'RED_LIGHT_JUMP';
    else if (r < 0.35) t = 'NO_SEATBELT';
    else if (r < 0.40) t = 'OVER_SPEEDING';
    
    await client.query('UPDATE violations SET violation_type = $1 WHERE id = $2', [t, row.id]);
    count++;
  }
  await client.query('COMMIT');
  console.log('Re-distributed types for ' + count + ' records');
  await client.end();
}
run();
