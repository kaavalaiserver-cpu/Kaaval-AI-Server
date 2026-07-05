const { Client } = require('pg');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const DATABASE_URL = 'postgresql://postgres:Sj%4025802580@localhost:5432/kaaval_ai';

async function seedDeveloper() {
  const client = new Client({ connectionString: DATABASE_URL });
  
  try {
    await client.connect();
    console.log("Connected to database...");
    
    // Check for developer role, if not exists, create it
    let roleRes = await client.query('SELECT id FROM roles WHERE role_code = $1', ['developer']);
    let roleId;
    if (roleRes.rows.length === 0) {
      console.log('Role "developer" not found. Creating...');
      const roleIdStr = crypto.randomUUID();
      const insertRole = `
        INSERT INTO roles (id, role_code, display_name, hierarchy_level, description, is_system_role, created_at) 
        VALUES ($1, $2, $3, $4, $5, $6, NOW()) RETURNING id
      `;
      const res = await client.query(insertRole, [roleIdStr, 'developer', 'System Developer', 1, 'System Developer', true]);
      roleId = res.rows[0].id;
    } else {
      roleId = roleRes.rows[0].id;
    }

    const username = 'developer';
    const password = 'kaaval@123';
    
    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    
    // Check if user exists
    const checkRes = await client.query('SELECT id FROM users WHERE username = $1', [username]);
    if (checkRes.rows.length > 0) {
      console.log(`User '${username}' already exists. Updating password and role_id...`);
      await client.query('UPDATE users SET password_hash = $1, role_id = $2 WHERE username = $3', [hashedPassword, roleId, username]);
      console.log('Password updated successfully!');
      return;
    }
    
    // Insert user
    const insertQuery = `
      INSERT INTO users (
        username, 
        password_hash, 
        role_id,
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
      roleId,
      'System Developer',
      false, // requires password change
      true, // is_active
    ];
    
    await client.query(insertQuery, values);
    console.log(`✅ ${username} account created successfully! Password: ${password}`);
    
  } catch (error) {
    console.error('Error seeding developer:', error);
  } finally {
    await client.end();
  }
}

seedDeveloper();
