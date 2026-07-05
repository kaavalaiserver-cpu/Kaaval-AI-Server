const { Client } = require('pg');
const bcrypt = require('bcryptjs');

async function run() {
  const client = new Client('postgresql://postgres:Sj%4025802580@localhost:5432/kaaval_ai');
  await client.connect();
  const hash = await bcrypt.hash('Kk@7200599700', 10);
  await client.query('UPDATE users SET password_hash=$1 WHERE username=$2', [hash, 'superadmin']);
  console.log('Password updated successfully');
  await client.end();
}
run();
