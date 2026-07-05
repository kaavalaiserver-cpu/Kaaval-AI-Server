import { Client } from 'pg';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load env vars
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:Sj@25802580@localhost:5432/kaaval_ai';

// Helper to generate UUID v4
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// Subdivisions & Locations data
const LOCATIONS = [
  { name: 'Ramanputhur Junction', subdivision: 'Nagercoil', lat: 8.1784, lng: 77.4320 },
  { name: 'Collectorate Roundana', subdivision: 'Nagercoil', lat: 8.1825, lng: 77.4190 },
  { name: 'Colachel Port Entrance Road', subdivision: 'Colachel', lat: 8.1220, lng: 77.2510 },
  { name: 'Marthandam Flyover North', subdivision: 'Marthandam', lat: 8.3020, lng: 77.2210 },
  { name: 'Kanyakumari Beach Road', subdivision: 'Kanyakumari', lat: 8.0810, lng: 77.5420 },
  { name: 'Thuckalay Town Junction', subdivision: 'Thuckalay', lat: 8.2450, lng: 77.2910 },
];

const VIOLATION_TYPES = [
  { code: 'NO_HELMET', name: 'Riding without Helmet', fine: 1000 },
  { code: 'TRIPLE_RIDING', name: 'Triple Riding on Two Wheeler', fine: 1000 },
  { code: 'NO_SEATBELT', name: 'Driving without Seatbelt', fine: 1000 },
  { code: 'RED_LIGHT_JUMP', name: 'Jumping Red Traffic Light', fine: 5000 },
  { code: 'OVER_SPEEDING', name: 'Over Speeding', fine: 2000 },
];

const STATUSES = [
  'PENDING', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'PENDING', 'APPROVED'
];

const VEHICLE_PLATES = [
  'TN-74-A-1234', 'TN-74-H-9876', 'TN-01-AB-4567', 'TN-75-XYZ-9911',
  'KL-01-CC-1212', 'TN-74-T-8877', 'TN-74-M-3322', 'TN-74-Q-9090',
];

const MOCK_IMAGES = [
  'https://images.unsplash.com/photo-1558981806-ec527fa84c39?w=800&q=80',
  'https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?w=800&q=80',
  'https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=800&q=80',
  'https://images.unsplash.com/photo-1485965120184-e220f721d03e?w=800&q=80',
  'https://images.unsplash.com/photo-1609630875171-b1321377ee65?w=800&q=80',
];

async function seed() {
  console.log(`Connecting to PostgreSQL database at ${DATABASE_URL}...`);
  const client = new Client({ connectionString: DATABASE_URL });

  try {
    await client.connect();

    // Clear existing mock records safely
    await client.query('DELETE FROM evidence');
    await client.query('DELETE FROM violations');
    await client.query('DELETE FROM vehicles');
    await client.query('DELETE FROM violation_types');
    console.log(`Cleared existing data.`);

    // 1. Seed Violation Types
    const typeIds: Record<string, string> = {};
    for (const vt of VIOLATION_TYPES) {
      const id = generateUUID();
      typeIds[vt.code] = id;
      await client.query(`
        INSERT INTO violation_types (id, violation_code, violation_name, default_fine)
        VALUES ($1, $2, $3, $4)
      `, [id, vt.code, vt.name, vt.fine]);
    }
    console.log('Seeded Violation Types.');

    // 2. Seed Vehicles
    const vehicleIds: string[] = [];
    for (const plate of VEHICLE_PLATES) {
      const id = generateUUID();
      vehicleIds.push(id);
      await client.query(`
        INSERT INTO vehicles (id, registration_number)
        VALUES ($1, $2)
      `, [id, plate]);
    }
    console.log('Seeded Vehicles.');

    // 2.5 Seed a Junction and Cameras if missing
    let camsRes = await client.query('SELECT id, camera_name FROM cameras LIMIT 5');
    if (camsRes.rows.length === 0) {
      console.log('No cameras found. Seeding default junction and 5 cameras...');
      
      const subRes = await client.query('SELECT id FROM subdivisions LIMIT 1');
      if (subRes.rows.length === 0) {
        throw new Error('No subdivisions found. Please run the main app seeder first to populate core master data.');
      }
      const subId = subRes.rows[0].id;

      const jId = generateUUID();
      await client.query(`
        INSERT INTO junctions (id, junction_name, latitude, longitude, subdivision_id)
        VALUES ($1, $2, $3, $4, $5)
      `, [jId, 'Central Nagercoil Junction', 8.18, 77.41, subId]);

      for (let i = 1; i <= 5; i++) {
        await client.query(`
          INSERT INTO cameras (id, camera_name, camera_code, camera_direction, status, junction_id)
          VALUES ($1, $2, $3, $4, $5, $6)
        `, [generateUUID(), `Test Camera ${i}`, `KAI-CAM-00${i}`, 'NORTH', 'ONLINE', jId]);
      }
      camsRes = await client.query('SELECT id, camera_name FROM cameras LIMIT 5');
    }

    // 3. Select existing cameras
    const cameraIds = camsRes.rows.map(r => r.id);

    // 4. Generate 30 mock violations
    let evidenceCount = 0;
    const now = new Date();

    for (let i = 0; i < 30; i++) {
      const id = generateUUID();
      const loc = LOCATIONS[i % LOCATIONS.length];
      const vtCode = VIOLATION_TYPES[i % VIOLATION_TYPES.length].code;
      const status = STATUSES[i % STATUSES.length];
      const vehicleId = vehicleIds[i % vehicleIds.length];
      const camId = cameraIds.length > 0 ? cameraIds[i % cameraIds.length] : null;
      
      const createdAt = new Date(now.getTime() - i * 6 * 60 * 60 * 1000); 
      const updatedAt = new Date(createdAt.getTime() + 10 * 60 * 1000); 
      
      const confidence = parseFloat((0.65 + Math.random() * 0.33).toFixed(2));
      
      let challanStatus = 'NOT_GENERATED';
      let challanRef = null;

      if (status === 'APPROVED') {
        challanStatus = 'GENERATED';
        challanRef = `CH-${generateUUID().substring(0,8).toUpperCase()}`;
      }

      await client.query(`
        INSERT INTO violations (
          id, camera_id, vehicle_id, violation_type_id, confidence,
          violation_timestamp, status, challan_status, challan_reference,
          created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11
        )
      `, [
        id, camId, vehicleId, typeIds[vtCode], confidence,
        createdAt.toISOString(), status, challanStatus, challanRef,
        createdAt.toISOString(), updatedAt.toISOString()
      ]);

      // 5. Seed Evidence for this violation
      const imageUrl = i % 2 === 0 
        ? MOCK_IMAGES[(i / 2) % MOCK_IMAGES.length]
        : `https://picsum.photos/id/${(i * 5) % 100 + 10}/800/600`;

      await client.query(`
        INSERT INTO evidence (
          id, violation_id, evidence_type, file_path, uploaded_at
        ) VALUES (
          $1, $2, $3, $4, $5
        )
      `, [
        generateUUID(), id, 'RAW_IMAGE', imageUrl, createdAt.toISOString()
      ]);
      
      await client.query(`
        INSERT INTO evidence (
          id, violation_id, evidence_type, file_path, uploaded_at
        ) VALUES (
          $1, $2, $3, $4, $5
        )
      `, [
        generateUUID(), id, 'PLATE_CROP', imageUrl, createdAt.toISOString()
      ]);
      
      evidenceCount += 2;
    }

    console.log(`🎉 Successfully seeded 30 mock violations and ${evidenceCount} evidence files in PostgreSQL!`);
  } catch (e) {
    console.error('Error during PostgreSQL seed:', e);
  } finally {
    await client.end();
  }
}

seed();
