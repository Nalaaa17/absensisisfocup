-- Enable pgcrypto for UUIDs
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1. Tabel users
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  divisi TEXT NOT NULL,
  phone TEXT,
  role TEXT NOT NULL CHECK (role IN ('admin', 'anggota')),
  password_hash TEXT NOT NULL,
  onesignal_player_id TEXT, -- OneSignal Player ID untuk push notif
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index untuk pencarian cepat
CREATE INDEX idx_users_name ON users(name);
CREATE INDEX idx_users_divisi ON users(divisi);
CREATE INDEX idx_users_role ON users(role);


-- 2. Tabel attendance
CREATE TABLE attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  user_name TEXT NOT NULL, -- Denormalized untuk query cepat
  user_divisi TEXT NOT NULL, -- Denormalized
  date DATE NOT NULL,
  check_in_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  location_lat DECIMAL(10,8),
  location_lng DECIMAL(11,8),
  location_name TEXT,
  status TEXT NOT NULL CHECK (status IN ('hadir', 'terlambat', 'tidak_hadir')),
  device_info TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- CONSTRAINT: 1 absen per user per hari
  UNIQUE(user_id, date)
);

CREATE INDEX idx_attendance_date ON attendance(date);
CREATE INDEX idx_attendance_user_date ON attendance(user_id, date);
CREATE INDEX idx_attendance_status ON attendance(status);


-- 3. Tabel permissions (Izin)
CREATE TABLE permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  user_name TEXT NOT NULL, -- Denormalized
  user_divisi TEXT NOT NULL, -- Denormalized
  date DATE NOT NULL,
  destination TEXT NOT NULL,
  reason TEXT NOT NULL,
  estimated_return TIMESTAMPTZ NOT NULL,
  actual_return TIMESTAMPTZ,
  proof_photo_url TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'disetujui' CHECK (status IN ('menunggu', 'disetujui', 'kembali', 'terlambat_kembali', 'ditolak')),
  is_late_return BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  returned_at TIMESTAMPTZ,
  
  -- CONSTRAINT: hanya 1 izin aktif per user per hari
  UNIQUE(user_id, date)
);

CREATE INDEX idx_permissions_date ON permissions(date);
CREATE INDEX idx_permissions_user ON permissions(user_id);
CREATE INDEX idx_permissions_status ON permissions(status);



-- 5. Tabel settings
CREATE TABLE settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_name TEXT,
  event_start_date DATE,
  event_end_date DATE,
  check_in_start TIME DEFAULT '06:00',
  check_in_end TIME DEFAULT '09:00',
  geofence_lat DECIMAL(10,8),
  geofence_lng DECIMAL(11,8),
  geofence_radius INT DEFAULT 100, -- meter
  late_tolerance INT DEFAULT 0, -- menit
  return_tolerance INT DEFAULT 30, -- menit
  created_by UUID REFERENCES users(id),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);


-- ==========================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==========================================

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE permissions ENABLE ROW LEVEL SECURITY;

-- Users: anggota hanya lihat data sendiri, admin & superadmin lihat semua
CREATE POLICY "users_access" ON users
FOR SELECT USING (
  auth.uid() = id
  OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
);

-- Attendance: anggota lihat sendiri, admin lihat semua
CREATE POLICY "attendance_access" ON attendance
FOR SELECT USING (
  user_id = auth.uid()
  OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
);

-- Permissions: sama
CREATE POLICY "permissions_access" ON permissions
FOR SELECT USING (
  user_id = auth.uid()
  OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
);


