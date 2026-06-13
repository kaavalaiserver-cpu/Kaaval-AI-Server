const Database = require('better-sqlite3');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const dbPath = path.join(__dirname, 'kaaval_local.db');
const db = new Database(dbPath);

const VIOLATION_TYPES = ['NO_HELMET', 'TRIPLE_RIDING', 'NO_SEATBELT', 'RED_LIGHT_JUMP', 'OVER_SPEEDING'];
const CAMERA_ID = 'CAM-001';
const LOCATION = 'Collectorate Roundana';
const LAT = 8.1833;
const LNG = 77.4119;
const STATUSES = ['PENDING', 'MANUAL_REVIEW'];

const stmt = db.prepare(`
  INSERT INTO violations (
    id, created_at, updated_at, image_url, vehicle_number, violation_type, 
    confidence_score, status, location_lat, location_lng, camera_id
  ) VALUES (
    ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
  )
`);

db.transaction(() => {
  for (let i = 0; i < 50; i++) {
    const id = uuidv4();
    // Generate dates within the last 30 days
    const date = new Date(Date.now() - Math.floor(Math.random() * 30 * 24 * 60 * 60 * 1000)).toISOString();
    const type = VIOLATION_TYPES[Math.floor(Math.random() * VIOLATION_TYPES.length)];
    const status = STATUSES[Math.floor(Math.random() * STATUSES.length)];
    const confidence = 0.5 + Math.random() * 0.49; // 0.5 to 0.99
    
    // Random TN plate
    const num1 = String(Math.floor(Math.random() * 99)).padStart(2, '0');
    const letters = String.fromCharCode(65 + Math.floor(Math.random() * 26)) + String.fromCharCode(65 + Math.floor(Math.random() * 26));
    const num2 = String(Math.floor(Math.random() * 9999)).padStart(4, '0');
    const vehicleNumber = `TN ${num1} ${letters} ${num2}`;

    stmt.run(
      id,
      date,
      date,
      'https://via.placeholder.com/800x600.png?text=Violation+Mock',
      vehicleNumber,
      type,
      confidence,
      status,
      LAT,
      LNG,
      CAMERA_ID
    );
  }
})();

console.log('Successfully seeded 50 mock violations!');
db.close();
