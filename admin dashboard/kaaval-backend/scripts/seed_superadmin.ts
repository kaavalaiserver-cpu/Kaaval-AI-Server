import { Client } from 'pg';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load .env from backend root if it exists
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/kaaval';

async function seedSuperadmin() {
  console.log(`Connecting to database at ${DATABASE_URL.split('@')[1] || DATABASE_URL}...`);
  const client = new Client({
    connectionString: DATABASE_URL,
  });

  try {
    await client.connect();

    // Generate random 12-char password
    const rawPassword = crypto.randomBytes(9).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').slice(0, 12);
    
    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(rawPassword, salt);

    const username = 'superadmin';

    // Check if user exists
    const checkRes = await client.query('SELECT id FROM users WHERE username = $1', [username]);
    
    if (checkRes.rows.length > 0) {
      console.log(`\nUser '${username}' already exists.`);
      console.log('If you need to reset the password, please do so via the Admin Dashboard or database directly.');
      return;
    }

    // Insert user
    const insertQuery = `
      INSERT INTO users (
        username, 
        password_hash, 
        role, 
        full_name, 
        requires_password_change, 
        is_active, 
        created_at, 
        updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
      RETURNING id
    `;
    
    const values = [
      username,
      hashedPassword,
      'super_admin',
      'System Super Admin',
      true, // requires password change on first login
      true, // is_active
    ];

    await client.query(insertQuery, values);

    console.log('\n=========================================');
    console.log('✅ SUPERADMIN ACCOUNT CREATED SUCCESSFULLY');
    console.log('=========================================');
    console.log(`Username : ${username}`);
    console.log(`Password : ${rawPassword}`);
    console.log('-----------------------------------------');
    console.log('⚠️  IMPORTANT: Save this password now.');
    console.log('You will be required to change it on your first login.');
    console.log('=========================================\n');

  } catch (error) {
    console.error('Error seeding superadmin:', error);
  } finally {
    await client.end();
  }
}

seedSuperadmin();
