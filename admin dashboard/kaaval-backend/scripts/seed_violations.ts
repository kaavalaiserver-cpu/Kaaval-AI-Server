import Database from 'better-sqlite3';
import { Client } from 'pg';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load env vars
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const DB_TYPE = process.env.DB_TYPE || 'sqlite';
const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/kaaval';

// Helper to generate UUID v4
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// Subdivisions & Locations data
interface LocationConfig {
  name: string;
  subdivision: string;
  lat: number;
  lng: number;
}

const LOCATIONS: LocationConfig[] = [
  // Nagercoil
  { name: 'Ramanputhur Junction', subdivision: 'Nagercoil', lat: 8.1784, lng: 77.4320 },
  { name: 'Collectorate Roundana', subdivision: 'Nagercoil', lat: 8.1825, lng: 77.4190 },
  { name: 'Vadasery Bus Stand Road', subdivision: 'Nagercoil', lat: 8.1930, lng: 77.4395 },
  // Colachel
  { name: 'Colachel Port Entrance Road', subdivision: 'Colachel', lat: 8.1220, lng: 77.2510 },
  { name: 'Colachel Bus Stand Junction', subdivision: 'Colachel', lat: 8.1310, lng: 77.2580 },
  // Marthandam
  { name: 'Marthandam Flyover North', subdivision: 'Marthandam', lat: 8.3020, lng: 77.2210 },
  { name: 'Marthandam Bus Station Road', subdivision: 'Marthandam', lat: 8.3065, lng: 77.2170 },
  // Kanyakumari
  { name: 'Kanyakumari Beach Road', subdivision: 'Kanyakumari', lat: 8.0810, lng: 77.5420 },
  { name: 'Sunset Point Bypass', subdivision: 'Kanyakumari', lat: 8.0890, lng: 77.5310 },
  // Thuckalay
  { name: 'Thuckalay Town Junction', subdivision: 'Thuckalay', lat: 8.2450, lng: 77.2910 },
  { name: 'Padmanabhapuram Palace Arch', subdivision: 'Thuckalay', lat: 8.2510, lng: 77.3240 },
];

const VIOLATION_TYPES = [
  'NO_HELMET',
  'TRIPLE_RIDING',
  'NO_SEATBELT',
  'RED_LIGHT_JUMP',
  'OVER_SPEEDING',
];

const STATUSES = [
  'PENDING',
  'READY',
  'MANUAL_REVIEW',
  'CHALLAN_ISSUED',
  'VERIFIED',
  'REJECTED',
];

const VEHICLE_PLATES = [
  'TN-74-A-1234', 'TN-74-H-9876', 'TN-01-AB-4567', 'TN-75-XYZ-9911',
  'KL-01-CC-1212', 'TN-74-T-8877', 'TN-74-M-3322', 'TN-74-Q-9090',
  'TN-74-K-4455', 'TN-75-L-8765', 'TN-74-F-3421', 'TN-74-Z-0007',
  'KL-11-F-5555', 'TN-02-D-9988', 'TN-74-R-2345', 'TN-74-P-8765',
];

// High-quality mock evidence photos (mixture of bikes, cars, traffic, and random picsum placeholders)
const MOCK_IMAGES = [
  'https://images.unsplash.com/photo-1558981806-ec527fa84c39?w=800&q=80', // Motorcycle
  'https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?w=800&q=80', // SUV
  'https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=800&q=80', // Porsche Car
  'https://images.unsplash.com/photo-1485965120184-e220f721d03e?w=800&q=80', // Bicycle/Bike
  'https://images.unsplash.com/photo-1609630875171-b1321377ee65?w=800&q=80', // Rider
  'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=800&q=80', // Car Interior
  'https://images.unsplash.com/photo-1494976388531-d1058494cdd8?w=800&q=80', // Sports Car
  'https://images.unsplash.com/photo-1579758629938-03607ccdbaba?w=800&q=80', // Traffic
  'https://images.unsplash.com/photo-1511919884226-fd3cad34687c?w=800&q=80', // Car wheel/road
  'https://images.unsplash.com/photo-1599819811279-d5ad9cccf838?w=800&q=80', // Helmet
];

async function seed() {
  console.log(`Starting mock violations seeding...`);
  console.log(`Detected DB Type: ${DB_TYPE}`);

  // Generate 30 mock violations
  const mockViolations: any[] = [];
  const now = new Date();

  for (let i = 0; i < 30; i++) {
    const id = generateUUID();
    const loc = LOCATIONS[i % LOCATIONS.length];
    const violationType = VIOLATION_TYPES[i % VIOLATION_TYPES.length];
    const status = STATUSES[i % STATUSES.length];
    
    // Distribute timestamps over the last 7 days
    const createdAt = new Date(now.getTime() - i * 6 * 60 * 60 * 1000); // 6 hours interval
    const updatedAt = new Date(createdAt.getTime() + 10 * 60 * 1000); // 10 mins later
    
    const confidenceScore = parseFloat((0.65 + Math.random() * 0.33).toFixed(2));
    const vehicleNumber = VEHICLE_PLATES[i % VEHICLE_PLATES.length];

    // Alternating between unsplash list and Picsum randomized URLs
    const imageUrl = i % 2 === 0 
      ? MOCK_IMAGES[(i / 2) % MOCK_IMAGES.length]
      : `https://picsum.photos/id/${(i * 5) % 100 + 10}/800/600`;
    
    const proofImgUrl = imageUrl; // Use same image for simplicity
    
    const cameraId = `CAM-00${(i % 5) + 1}`;
    
    let challanAmount = null;
    let challanStatus = null;
    let challanIssuedAt = null;

    if (status === 'CHALLAN_ISSUED' || status === 'VERIFIED') {
      challanAmount = 500 + (i % 3) * 500; // 500, 1000, 1500
      challanStatus = 'ISSUED';
      challanIssuedAt = new Date(createdAt.getTime() + 2 * 60 * 60 * 1000).toISOString();
    }

    const metadata = JSON.stringify({
      location: loc.name,
      subdivision: loc.subdivision,
      speed_detected: violationType === 'OVER_SPEEDING' ? Math.round(75 + Math.random() * 30) : undefined,
      helmet_detected: violationType === 'NO_HELMET' ? false : undefined,
    });

    const isDeleted = 0;

    mockViolations.push({
      id,
      created_at: createdAt.toISOString(),
      updated_at: updatedAt.toISOString(),
      image_url: imageUrl,
      proof_img_url: proofImgUrl,
      full_preview_url: imageUrl,
      cropped_preview_url: proofImgUrl,
      detections: '{}',
      vehicle_number: vehicleNumber,
      violation_type: violationType,
      confidence_score: confidenceScore,
      challan_status: challanStatus,
      challan_amount: challanAmount,
      challan_issued_at: challanIssuedAt,
      status,
      location_lat: loc.lat,
      location_lng: loc.lng,
      metadata,
      reviewed_by: status !== 'PENDING' ? 'system_seeder' : null,
      reviewed_at: status !== 'PENDING' ? updatedAt.toISOString() : null,
      review_notes: status !== 'PENDING' ? 'Mock verification status generated by seeder' : null,
      camera_id: cameraId,
      vehicle_detection_id: `DET-${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
      is_deleted: isDeleted
    });
  }

  if (DB_TYPE === 'sqlite') {
    const dbPath = path.resolve(__dirname, '../kaaval_local.db');
    console.log(`Connecting to local SQLite database at: ${dbPath}`);
    const db = new Database(dbPath);

    try {
      // Clear existing records
      db.prepare('DELETE FROM violations').run();
      console.log(`Cleared existing violations from SQLite.`);

      // Insert mock violations
      const insert = db.prepare(`
        INSERT INTO violations (
          id, created_at, updated_at, image_url, proof_img_url, 
          full_preview_url, cropped_preview_url, detections, 
          vehicle_number, violation_type, confidence_score, 
          challan_status, challan_amount, challan_issued_at, 
          status, location_lat, location_lng, metadata, 
          reviewed_by, reviewed_at, review_notes, camera_id, 
          vehicle_detection_id, is_deleted
        ) VALUES (
          @id, @created_at, @updated_at, @image_url, @proof_img_url,
          @full_preview_url, @cropped_preview_url, @detections,
          @vehicle_number, @violation_type, @confidence_score,
          @challan_status, @challan_amount, @challan_issued_at,
          @status, @location_lat, @location_lng, @metadata,
          @reviewed_by, @reviewed_at, @review_notes, @camera_id,
          @vehicle_detection_id, @is_deleted
        )
      `);

      const insertMany = db.transaction((violations: any[]) => {
        for (const v of violations) insert.run(v);
      });

      insertMany(mockViolations);
      console.log(`🎉 Successfully seeded 30 mock violations in local SQLite!`);
    } catch (e) {
      console.error('Error during SQLite insert:', e);
    } finally {
      db.close();
    }

  } else {
    console.log(`Connecting to PostgreSQL database...`);
    const client = new Client({
      connectionString: DATABASE_URL,
    });

    try {
      await client.connect();
      // Clear existing records
      await client.query('DELETE FROM violations');
      console.log(`Cleared existing violations from PostgreSQL.`);

      // Insert mock violations
      const insertQuery = `
        INSERT INTO violations (
          id, created_at, updated_at, image_url, proof_img_url, 
          full_preview_url, cropped_preview_url, detections, 
          vehicle_number, violation_type, confidence_score, 
          challan_status, challan_amount, challan_issued_at, 
          status, location_lat, location_lng, metadata, 
          reviewed_by, reviewed_at, review_notes, camera_id, 
          vehicle_detection_id, is_deleted
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14,
          $15, $16, $17, $18, $19, $20, $21, $22, $23, $24
        )
      `;

      for (const v of mockViolations) {
        await client.query(insertQuery, [
          v.id, v.created_at, v.updated_at, v.image_url, v.proof_img_url,
          v.full_preview_url, v.cropped_preview_url, v.detections,
          v.vehicle_number, v.violation_type, v.confidence_score,
          v.challan_status, v.challan_amount, v.challan_issued_at,
          v.status, v.location_lat, v.location_lng, v.metadata,
          v.reviewed_by, v.reviewed_at, v.review_notes, v.camera_id,
          v.vehicle_detection_id, v.is_deleted === 1
        ]);
      }
      console.log(`🎉 Successfully seeded 30 mock violations in PostgreSQL!`);
    } catch (e) {
      console.error('Error during PostgreSQL insert:', e);
    } finally {
      await client.end();
    }
  }
}

seed();
