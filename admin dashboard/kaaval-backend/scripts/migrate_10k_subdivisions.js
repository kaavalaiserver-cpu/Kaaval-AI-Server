const { Client } = require('pg');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const LOCATIONS = [
  { name: 'Ramanputhur Junction', subdivision: 'Nagercoil', lat: 8.1784, lng: 77.4320 },
  { name: 'Collectorate Roundana', subdivision: 'Nagercoil', lat: 8.1825, lng: 77.4190 },
  { name: 'Colachel Port Entrance Road', subdivision: 'Colachel', lat: 8.1220, lng: 77.2510 },
  { name: 'Colachel Bus Stand Junction', subdivision: 'Colachel', lat: 8.1310, lng: 77.2580 },
  { name: 'Marthandam Flyover North', subdivision: 'Marthandam', lat: 8.3020, lng: 77.2210 },
  { name: 'Marthandam Bus Station Road', subdivision: 'Marthandam', lat: 8.3065, lng: 77.2170 },
  { name: 'Kanyakumari Beach Road', subdivision: 'Kanyakumari', lat: 8.0810, lng: 77.5420 },
  { name: 'Sunset Point Bypass', subdivision: 'Kanyakumari', lat: 8.0890, lng: 77.5310 },
  { name: 'Thuckalay Town Junction', subdivision: 'Thuckalay', lat: 8.2450, lng: 77.2910 },
  { name: 'Padmanabhapuram Palace Arch', subdivision: 'Thuckalay', lat: 8.2510, lng: 77.3240 },
];

async function migrate() {
  console.log('Connecting to PostgreSQL database to migrate 10k records...');
  
  const client = new Client({
    user: process.env.DB_USERNAME || 'kaaval',
    password: process.env.DB_PASSWORD || 'kaaval@123',
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'kaaval_ai',
  });

  try {
    await client.connect();
    console.log('Connected.');

    // Fetch all violation IDs
    const res = await client.query('SELECT id, metadata FROM violations');
    console.log(`Found ${res.rows.length} violations in the database.`);

    let updateCount = 0;
    
    // Begin transaction for safe updates
    await client.query('BEGIN');

    for (let i = 0; i < res.rows.length; i++) {
      const row = res.rows[i];
      const loc = LOCATIONS[i % LOCATIONS.length]; // Distribute evenly
      
      let metadata = row.metadata;
      if (typeof metadata === 'string') {
        try { metadata = JSON.parse(metadata); } catch(e) { metadata = {}; }
      }
      if (!metadata) metadata = {};
      
      metadata.subdivision = loc.subdivision;
      metadata.location = loc.name;

      await client.query(
        'UPDATE violations SET location_lat = $1, location_lng = $2, metadata = $3 WHERE id = $4',
        [loc.lat, loc.lng, JSON.stringify(metadata), row.id]
      );
      updateCount++;

      if (updateCount % 1000 === 0) {
        console.log(`Migrated ${updateCount} records...`);
      }
    }

    await client.query('COMMIT');
    console.log(`✅ Successfully migrated all ${updateCount} records to the new subdivisions!`);

  } catch (e) {
    await client.query('ROLLBACK');
    console.error('Migration failed:', e);
  } finally {
    await client.end();
  }
}

migrate();
