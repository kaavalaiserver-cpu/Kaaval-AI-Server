const { Client } = require('pg');
const bcrypt = require('bcryptjs');

const DATABASE_URL = 'postgresql://postgres:Sj%4025802580@localhost:5432/kaaval_ai';

async function checkHash() {
  const client = new Client({ connectionString: DATABASE_URL });
  try {
    await client.connect();
    const res = await client.query("SELECT password_hash FROM users WHERE username = 'superadmin'");
    if (res.rows.length > 0) {
      const hash = res.rows[0].password_hash;
      console.log('Hash from DB:', hash);
      const isMatch = await bcrypt.compare('Kk@7200599700', hash);
      console.log('Match with Kk@7200599700:', isMatch);
    } else {
      console.log('superadmin not found in DB!');
    }
  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}

checkHash();
