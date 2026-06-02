-- Kaaval AI Database Indexes & Setup
-- Run this on your PostgreSQL database to optimize queries for the new FastAPI backend

-- 1. Create essential indexes for analytics and searches
CREATE INDEX IF NOT EXISTS idx_camera_date ON violations(camera_id, created_at);
CREATE INDEX IF NOT EXISTS idx_vehicle_date ON violations(vehicle_number, created_at);
CREATE INDEX IF NOT EXISTS idx_status ON violations(status);
CREATE INDEX IF NOT EXISTS idx_violation_type ON violations(violation_type);

-- 2. Create the subdivisions table for future mapping
CREATE TABLE IF NOT EXISTS subdivisions (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. (Optional) Insert some default subdivisions if empty
INSERT INTO subdivisions (name)
SELECT 'Colachel'
WHERE NOT EXISTS (SELECT 1 FROM subdivisions WHERE name = 'Colachel');

INSERT INTO subdivisions (name)
SELECT 'Marthandam'
WHERE NOT EXISTS (SELECT 1 FROM subdivisions WHERE name = 'Marthandam');

INSERT INTO subdivisions (name)
SELECT 'Nagercoil'
WHERE NOT EXISTS (SELECT 1 FROM subdivisions WHERE name = 'Nagercoil');

INSERT INTO subdivisions (name)
SELECT 'Kanyakumari'
WHERE NOT EXISTS (SELECT 1 FROM subdivisions WHERE name = 'Kanyakumari');

INSERT INTO subdivisions (name)
SELECT 'Thuckalay'
WHERE NOT EXISTS (SELECT 1 FROM subdivisions WHERE name = 'Thuckalay');

-- 4. Create Audit Logs table for compliance
CREATE TABLE IF NOT EXISTS audit_logs (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(100),
    action VARCHAR(100) NOT NULL,
    violation_id VARCHAR(100),
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    ip_address VARCHAR(50),
    details JSONB
);

CREATE INDEX IF NOT EXISTS idx_audit_violation ON audit_logs(violation_id);
CREATE INDEX IF NOT EXISTS idx_audit_timestamp ON audit_logs(timestamp);

-- 5. Add Soft Delete Columns to violations table
ALTER TABLE violations ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE;
ALTER TABLE violations ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE violations ADD COLUMN IF NOT EXISTS deleted_by VARCHAR(100);

-- Update existing records to not be deleted
UPDATE violations SET is_deleted = FALSE WHERE is_deleted IS NULL;
