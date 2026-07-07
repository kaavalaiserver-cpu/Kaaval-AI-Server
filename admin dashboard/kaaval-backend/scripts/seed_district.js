// scripts/seed_district.js
// Run: node scripts/seed_district.js
// Idempotent — safe to re-run, will not duplicate records.
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const dbPath = path.resolve(__dirname, '../kaaval_local.db');
const db = new sqlite3.Database(dbPath);

function runQuery(query, params = []) {
  return new Promise((resolve, reject) => {
    db.all(query, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

function runRun(query, params = []) {
  return new Promise((resolve, reject) => {
    db.run(query, params, function (err) {
      if (err) reject(err);
      else resolve(this);
    });
  });
}

async function run() {
  console.log('✅ Connected to SQLite database:', dbPath);

  // ── 1. District ────────────────────────────────────────────────
  let districtId;
  const distRes = await runQuery(`SELECT id FROM districts WHERE district_name = ?`, ['Kanyakumari']);
  
  if (distRes.length === 0) {
    districtId = uuidv4();
    await runRun(
      `INSERT INTO districts (id, district_name, state, country, status) VALUES (?, ?, ?, ?, ?)`,
      [districtId, 'Kanyakumari', 'Tamil Nadu', 'India', 'ACTIVE']
    );
    console.log(`✅ Created district: Kanyakumari (${districtId})`);
  } else {
    districtId = distRes[0].id;
    console.log(`ℹ️  District already exists: Kanyakumari (${districtId})`);
  }

  // ── 2. Subdivisions ────────────────────────────────────────────
  const subdivisions = [
    { name: 'Nagercoil',        code: 'NGR', hq: 'Nagercoil' },
    { name: 'Colachel',         code: 'COL', hq: 'Colachel' },
    { name: 'Kanyakumari',      code: 'KNY', hq: 'Kanyakumari' },
    { name: 'Thuckalay',        code: 'THK', hq: 'Thuckalay' },
    { name: 'Marthandam',       code: 'MTM', hq: 'Marthandam' },
  ];

  for (const sub of subdivisions) {
    const existing = await runQuery(`SELECT id FROM subdivisions WHERE subdivision_code = ?`, [sub.code]);
    if (existing.length === 0) {
      const subId = uuidv4();
      await runRun(
        `INSERT INTO subdivisions (id, district_id, subdivision_name, subdivision_code, headquarters, status)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [subId, districtId, sub.name, sub.code, sub.hq, 'ACTIVE']
      );
      console.log(`✅ Created subdivision: ${sub.name} (${subId})`);
    } else {
      console.log(`ℹ️  Subdivision exists: ${sub.name}`);
    }
  }

  // ── 3. Violation Types ─────────────────────────────────────────
  const violationTypes = [
    {
      code:         'NO_HELMET_RIDER',
      name:         'No Helmet - Rider',
      description:  'Rider not wearing a helmet',
      defaultFine:  500,
      color:        '#FF4B4B',
      severity:     'HIGH',
    },
    {
      code:         'NO_HELMET_PILLION',
      name:         'No Helmet - Pillion Rider',
      description:  'Pillion rider not wearing a helmet',
      defaultFine:  500,
      color:        '#FF7B4B',
      severity:     'HIGH',
    },
    {
      code:         'TRIPLE_RIDING',
      name:         'Triple Riding',
      description:  'Three or more persons riding a two-wheeler',
      defaultFine:  1000,
      color:        '#C0392B',
      severity:     'CRITICAL',
    },
    {
      code:         'ONE_WAY',
      name:         'One Way Violation',
      description:  'Riding against the designated direction of traffic',
      defaultFine:  750,
      color:        '#E67E22',
      severity:     'HIGH',
    },
  ];

  for (const vt of violationTypes) {
    const existing = await runQuery(`SELECT id FROM violation_types WHERE violation_code = ?`, [vt.code]);
    if (existing.length === 0) {
      const vtId = uuidv4();
      await runRun(
        `INSERT INTO violation_types
           (id, violation_code, violation_name, description, default_fine, color, severity, is_active)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [vtId, vt.code, vt.name, vt.description, vt.defaultFine, vt.color, vt.severity, 1] // SQLite booleans are 0/1
      );
      console.log(`✅ Created violation type: ${vt.name}`);
    } else {
      console.log(`ℹ️  Violation type exists: ${vt.name}`);
    }
  }

  console.log('\n🎉 Seed complete!');
  console.log('   District: Kanyakumari');
  console.log('   Subdivisions: Nagercoil, Colachel, Kanyakumari, Thuckalay, Marthandam');
  console.log('   Violation Types: No Helmet (Rider), No Helmet (Pillion), Triple Riding, One Way');
  console.log('\n👉 Next: Use the Superadmin dashboard to add Junctions and Cameras');

  db.close();
}

run().catch((err) => {
  console.error('❌ Seed failed:', err.message);
  db.close();
  process.exit(1);
});
