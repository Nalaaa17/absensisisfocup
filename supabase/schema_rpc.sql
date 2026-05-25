-- KUMPULAN FUNGSI (RPC) UNTUK BYPASS RLS (SECURITY DEFINER)
-- Buka Supabase SQL Editor, paste semua kode ini, lalu klik RUN.

ALTER TABLE users ADD COLUMN IF NOT EXISTS device_id TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS pending_device_id TEXT;

-- 1. Fungsi Login (Bypass RLS untuk baca data user spesifik)
DROP FUNCTION IF EXISTS login_user(TEXT);
DROP FUNCTION IF EXISTS login_user(TEXT, TEXT);

CREATE OR REPLACE FUNCTION login_user(p_name TEXT, p_device_id TEXT)
RETURNS TABLE (
    id UUID, name TEXT, divisi TEXT, role TEXT, is_active BOOLEAN, frozen_until TIMESTAMPTZ, device_id TEXT, pending_device_id TEXT
) 
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_user RECORD;
BEGIN
    SELECT u.id, u.name, u.divisi, u.role, u.is_active, u.frozen_until, u.device_id, u.pending_device_id
    INTO v_user
    FROM users u WHERE u.name ILIKE p_name LIMIT 1;

    IF v_user IS NULL THEN
        RETURN;
    END IF;

    IF v_user.role = 'anggota' AND p_device_id IS NOT NULL AND p_device_id != '' THEN
        IF v_user.device_id IS NULL THEN
            UPDATE users SET device_id = p_device_id WHERE users.id = v_user.id;
            v_user.device_id := p_device_id;
        ELSIF v_user.device_id != p_device_id THEN
            IF v_user.pending_device_id IS DISTINCT FROM p_device_id THEN
                UPDATE users SET pending_device_id = p_device_id WHERE users.id = v_user.id;
            END IF;
            RAISE EXCEPTION 'DEVICE_LOCKED';
        END IF;
    END IF;

    RETURN QUERY SELECT v_user.id, v_user.name, v_user.divisi, v_user.role, v_user.is_active, v_user.frozen_until, v_user.device_id, v_user.pending_device_id;
END;
$$;

-- 2. Fungsi Get Settings (Bypass RLS untuk ambil pengaturan geofence)
CREATE OR REPLACE FUNCTION get_settings()
RETURNS TABLE (
    id UUID, geofence_lat DECIMAL, geofence_lng DECIMAL, geofence_radius INT
) 
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    RETURN QUERY SELECT s.id, s.geofence_lat, s.geofence_lng, s.geofence_radius 
    FROM settings s LIMIT 1;
END;
$$;

-- 3. Fungsi Update Settings (Hanya untuk Admin)
CREATE OR REPLACE FUNCTION update_settings(p_admin_id UUID, p_settings_id UUID, p_lat DECIMAL, p_lng DECIMAL, p_radius INT)
RETURNS VOID 
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_role TEXT;
BEGIN
    -- Cek apakah pemanggil adalah admin
    SELECT role INTO v_role FROM users WHERE id = p_admin_id;
    IF v_role != 'admin' THEN
        RAISE EXCEPTION 'Akses Ditolak: Bukan Admin';
    END IF;

    IF p_settings_id IS NULL THEN
        INSERT INTO settings (geofence_lat, geofence_lng, geofence_radius) 
        VALUES (p_lat, p_lng, p_radius);
    ELSE
        UPDATE settings 
        SET geofence_lat = p_lat, geofence_lng = p_lng, geofence_radius = p_radius, updated_at = NOW() 
        WHERE id = p_settings_id;
    END IF;
END;
$$;

-- 4. Fungsi Ambil Statistik Admin (Total Hadir, Izin, dsb)
CREATE OR REPLACE FUNCTION get_admin_stats(p_admin_id UUID, p_date DATE)
RETURNS JSON 
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_role TEXT;
    v_hadir INT;
    v_izin INT;
BEGIN
    -- Cek Admin
    SELECT role INTO v_role FROM users WHERE id = p_admin_id;
    IF v_role != 'admin' THEN
        RAISE EXCEPTION 'Akses Ditolak: Bukan Admin';
    END IF;

    -- Hitung Hadir
    SELECT COUNT(*) INTO v_hadir FROM attendance WHERE date = p_date AND status IN ('hadir', 'terlambat');
    -- Hitung Izin
    SELECT COUNT(*) INTO v_izin FROM permissions WHERE date = p_date AND status IN ('menunggu', 'disetujui', 'kembali', 'terlambat_kembali');

    RETURN json_build_object('hadir', COALESCE(v_hadir, 0), 'izin', COALESCE(v_izin, 0));
END;
$$;

-- 5. Fungsi Ambil Daftar Anggota (Untuk Admin)
DROP FUNCTION IF EXISTS get_members(UUID);

CREATE OR REPLACE FUNCTION get_members(p_admin_id UUID)
RETURNS TABLE (
    id UUID, name TEXT, divisi TEXT, role TEXT, frozen_until TIMESTAMPTZ, shift_id UUID, shift_name TEXT, device_id TEXT, pending_device_id TEXT
) 
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_role TEXT;
BEGIN
    SELECT u.role INTO v_role FROM users u WHERE u.id = p_admin_id;
    IF v_role != 'admin' THEN
        RAISE EXCEPTION 'Akses Ditolak: Bukan Admin';
    END IF;

    RETURN QUERY 
    SELECT u.id, u.name, u.divisi, u.role, u.frozen_until, u.shift_id, s.name as shift_name, u.device_id, u.pending_device_id
    FROM users u 
    LEFT JOIN shifts s ON u.shift_id = s.id
    ORDER BY u.created_at DESC;
END;
$$;

-- 6. Fungsi Bekukan Anggota (Admin)
CREATE OR REPLACE FUNCTION freeze_user(p_admin_id UUID, p_target_id UUID, p_days INT)
RETURNS VOID 
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_role TEXT;
BEGIN
    -- Cek Admin
    SELECT role INTO v_role FROM users WHERE id = p_admin_id;
    IF v_role != 'admin' THEN
        RAISE EXCEPTION 'Akses Ditolak: Bukan Admin';
    END IF;

    UPDATE users SET frozen_until = NOW() + (p_days || ' days')::INTERVAL WHERE id = p_target_id;
END;
$$;

-- 7. Fungsi Cabut Pembekuan (Admin)
CREATE OR REPLACE FUNCTION unfreeze_user(p_admin_id UUID, p_target_id UUID)
RETURNS VOID 
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_role TEXT;
BEGIN
    -- Cek Admin
    SELECT role INTO v_role FROM users WHERE id = p_admin_id;
    IF v_role != 'admin' THEN
        RAISE EXCEPTION 'Akses Ditolak: Bukan Admin';
    END IF;

    UPDATE users SET frozen_until = NULL WHERE id = p_target_id;
END;
$$;

-- 8. Fungsi Absen Masuk (Bypass RLS untuk Insert Attendance)
CREATE OR REPLACE FUNCTION record_attendance(p_user_id UUID, p_name TEXT, p_divisi TEXT, p_date DATE, p_lat DECIMAL, p_lng DECIMAL)
RETURNS VOID 
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_frozen TIMESTAMPTZ;
    v_shift_id UUID;
    v_end_time TIME;
    v_status TEXT;
    v_geo_lat DECIMAL;
    v_geo_lng DECIMAL;
    v_geo_radius INT;
    v_distance FLOAT;
BEGIN
    -- Validasi Geofence Server-side
    SELECT geofence_lat, geofence_lng, geofence_radius INTO v_geo_lat, v_geo_lng, v_geo_radius 
    FROM settings LIMIT 1;

    IF v_geo_lat IS NOT NULL AND v_geo_lng IS NOT NULL AND v_geo_radius IS NOT NULL THEN
        -- Formula Haversine
        v_distance := 6371000 * 2 * ASIN(SQRT(
            POWER(SIN((v_geo_lat - p_lat) * PI() / 180 / 2), 2) +
            COS(v_geo_lat * PI() / 180) * COS(p_lat * PI() / 180) *
            POWER(SIN((v_geo_lng - p_lng) * PI() / 180 / 2), 2)
        ));

        IF v_distance > v_geo_radius THEN
            RAISE EXCEPTION 'Di luar radius geofence (Jarak: %m, Maks: %m)', ROUND(v_distance::NUMERIC, 0), v_geo_radius;
        END IF;
    END IF;

    -- Cek apakah dibekukan dan ambil shift_id
    SELECT frozen_until, shift_id INTO v_frozen, v_shift_id FROM users WHERE id = p_user_id;
    IF v_frozen IS NOT NULL AND v_frozen > NOW() THEN
        RAISE EXCEPTION 'Akun Dibekukan';
    END IF;

    -- Tentukan status keterlambatan berdasarkan shift
    v_status := 'hadir';
    IF v_shift_id IS NOT NULL THEN
        SELECT end_time INTO v_end_time FROM shifts WHERE id = v_shift_id;
        IF NOW()::time > v_end_time THEN
            v_status := 'terlambat';
        END IF;
    END IF;

    -- Lakukan Insert
    INSERT INTO attendance (user_id, user_name, user_divisi, date, location_lat, location_lng, status)
    VALUES (p_user_id, p_name, p_divisi, p_date, p_lat, p_lng, v_status);
END;
$$;

-- 9. Fungsi Ambil Semua Absensi (Admin)
CREATE OR REPLACE FUNCTION get_all_attendance(p_admin_id UUID, p_date DATE)
RETURNS TABLE (
    id UUID, user_name TEXT, user_divisi TEXT, check_in_time TIMESTAMPTZ, location_lat DECIMAL, location_lng DECIMAL, status TEXT
) 
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_role TEXT;
BEGIN
    SELECT role INTO v_role FROM users u WHERE u.id = p_admin_id;
    IF v_role != 'admin' THEN
        RAISE EXCEPTION 'Akses Ditolak: Bukan Admin';
    END IF;

    IF p_date IS NULL THEN
        RETURN QUERY SELECT a.id, a.user_name, a.user_divisi, a.check_in_time, a.location_lat, a.location_lng, a.status 
        FROM attendance a ORDER BY a.check_in_time DESC;
    ELSE
        RETURN QUERY SELECT a.id, a.user_name, a.user_divisi, a.check_in_time, a.location_lat, a.location_lng, a.status 
        FROM attendance a WHERE a.date = p_date ORDER BY a.check_in_time DESC;
    END IF;
END;
$$;

-- 10. Fungsi Ambil Semua Izin (Admin)
DROP FUNCTION IF EXISTS get_all_permissions(UUID, DATE);

CREATE OR REPLACE FUNCTION get_all_permissions(p_admin_id UUID, p_date DATE)
RETURNS TABLE (
    id UUID, user_name TEXT, user_divisi TEXT, destination TEXT, reason TEXT, estimated_return TIMESTAMPTZ, actual_return TIMESTAMPTZ, status TEXT, created_at TIMESTAMPTZ, proof_photo_url TEXT
) 
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_role TEXT;
BEGIN
    SELECT u.role INTO v_role FROM users u WHERE u.id = p_admin_id;
    IF v_role != 'admin' THEN
        RAISE EXCEPTION 'Akses Ditolak: Bukan Admin';
    END IF;

    IF p_date IS NULL THEN
        RETURN QUERY SELECT p.id, p.user_name, p.user_divisi, p.destination, p.reason, p.estimated_return, p.actual_return, p.status, p.created_at, p.proof_photo_url 
        FROM permissions p ORDER BY p.created_at DESC;
    ELSE
        RETURN QUERY SELECT p.id, p.user_name, p.user_divisi, p.destination, p.reason, p.estimated_return, p.actual_return, p.status, p.created_at, p.proof_photo_url 
        FROM permissions p WHERE p.date = p_date ORDER BY p.created_at DESC;
    END IF;
END;
$$;

-- 11. Fungsi Update Status Izin (Admin)
CREATE OR REPLACE FUNCTION update_permission_status(p_admin_id UUID, p_permission_id UUID, p_status TEXT)
RETURNS VOID 
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_role TEXT;
BEGIN
    SELECT role INTO v_role FROM users WHERE id = p_admin_id;
    IF v_role != 'admin' THEN
        RAISE EXCEPTION 'Akses Ditolak: Bukan Admin';
    END IF;

    IF p_status = 'kembali' OR p_status = 'terlambat_kembali' THEN
        UPDATE permissions SET status = p_status, actual_return = NOW() WHERE id = p_permission_id;
    ELSE
        UPDATE permissions SET status = p_status WHERE id = p_permission_id;
    END IF;
END;
$$;

-- 12. Fungsi Pengajuan Izin (Bypass RLS)
CREATE OR REPLACE FUNCTION request_permission(
    p_user_id UUID, p_name TEXT, p_divisi TEXT, p_date DATE, 
    p_destination TEXT, p_reason TEXT, p_estimated_return TIMESTAMPTZ, 
    p_photo_url TEXT
)
RETURNS VOID 
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    INSERT INTO permissions (
        user_id, user_name, user_divisi, date, destination, reason, estimated_return, proof_photo_url, status
    ) VALUES (
        p_user_id, p_name, p_divisi, p_date, p_destination, p_reason, p_estimated_return, p_photo_url, 'menunggu'
    );
END;
$$;

-- 13. Fungsi Hapus Absensi (Admin)
CREATE OR REPLACE FUNCTION delete_attendance(p_admin_id UUID, p_attendance_id UUID)
RETURNS VOID 
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_role TEXT;
BEGIN
    SELECT u.role INTO v_role FROM users u WHERE u.id = p_admin_id;
    IF v_role != 'admin' THEN
        RAISE EXCEPTION 'Akses Ditolak: Bukan Admin';
    END IF;

    DELETE FROM attendance WHERE id = p_attendance_id;
END;
$$;

-- 14. Fungsi Ambil Aktivitas Terkini (Admin)
CREATE OR REPLACE FUNCTION get_recent_activities(p_admin_id UUID, p_limit INT DEFAULT 5)
RETURNS TABLE (
    id UUID,
    type TEXT,
    user_name TEXT,
    user_divisi TEXT,
    activity_time TIMESTAMPTZ,
    description TEXT
) 
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_role TEXT;
BEGIN
    SELECT u.role INTO v_role FROM users u WHERE u.id = p_admin_id;
    IF v_role != 'admin' THEN
        RAISE EXCEPTION 'Akses Ditolak: Bukan Admin';
    END IF;

    RETURN QUERY 
    SELECT * FROM (
        SELECT 
            a.id, 
            'absen'::TEXT AS type, 
            a.user_name, 
            a.user_divisi, 
            a.check_in_time AS activity_time, 
            'Melakukan absensi ' || a.status || COALESCE(' (' || s.name || ')', '') AS description
        FROM attendance a
        JOIN users u ON a.user_id = u.id
        LEFT JOIN shifts s ON u.shift_id = s.id
        UNION ALL
        SELECT 
            p.id, 
            'izin'::TEXT AS type, 
            p.user_name, 
            p.user_divisi, 
            p.created_at AS activity_time, 
            'Mengajukan izin (' || p.status || ')' || COALESCE(' - ' || s.name, '') AS description
        FROM permissions p
        JOIN users u ON p.user_id = u.id
        LEFT JOIN shifts s ON u.shift_id = s.id
    ) t
    ORDER BY activity_time DESC
    LIMIT p_limit;
END;
$$;

-- ==========================================
-- UPDATE CONSTRAINT UNTUK STATUS IZIN
-- ==========================================
ALTER TABLE permissions DROP CONSTRAINT IF EXISTS permissions_status_check;
ALTER TABLE permissions ADD CONSTRAINT permissions_status_check CHECK (status IN ('menunggu', 'disetujui', 'kembali', 'terlambat_kembali', 'ditolak'));

-- ==========================================
-- SHIFTS & DELETE PERMISSION
-- ==========================================
CREATE TABLE IF NOT EXISTS shifts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE users ADD COLUMN IF NOT EXISTS shift_id UUID REFERENCES shifts(id) ON DELETE SET NULL;

-- 15. Hapus Izin
CREATE OR REPLACE FUNCTION delete_permission(p_admin_id UUID, p_permission_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_role TEXT;
BEGIN
    SELECT role INTO v_role FROM users WHERE id = p_admin_id;
    IF v_role != 'admin' THEN RAISE EXCEPTION 'Akses Ditolak'; END IF;
    DELETE FROM permissions WHERE id = p_permission_id;
END;
$$;

-- 16. CRUD Shift
CREATE OR REPLACE FUNCTION create_shift(p_admin_id UUID, p_name TEXT, p_start_time TIME, p_end_time TIME)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_role TEXT;
BEGIN
    SELECT role INTO v_role FROM users WHERE id = p_admin_id;
    IF v_role != 'admin' THEN RAISE EXCEPTION 'Akses Ditolak'; END IF;
    INSERT INTO shifts (name, start_time, end_time) VALUES (p_name, p_start_time, p_end_time);
END;
$$;

CREATE OR REPLACE FUNCTION delete_shift(p_admin_id UUID, p_shift_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_role TEXT;
BEGIN
    SELECT role INTO v_role FROM users WHERE id = p_admin_id;
    IF v_role != 'admin' THEN RAISE EXCEPTION 'Akses Ditolak'; END IF;
    DELETE FROM shifts WHERE id = p_shift_id;
END;
$$;

CREATE OR REPLACE FUNCTION get_shifts(p_admin_id UUID)
RETURNS TABLE (id UUID, name TEXT, start_time TIME, end_time TIME, created_at TIMESTAMPTZ)
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_role TEXT;
BEGIN
    SELECT role INTO v_role FROM users u WHERE u.id = p_admin_id;
    IF v_role != 'admin' THEN RAISE EXCEPTION 'Akses Ditolak'; END IF;
    RETURN QUERY SELECT s.id, s.name, s.start_time, s.end_time, s.created_at FROM shifts s ORDER BY s.created_at DESC;
END;
$$;

CREATE OR REPLACE FUNCTION assign_user_shift(p_admin_id UUID, p_target_user_id UUID, p_shift_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_role TEXT;
BEGIN
    SELECT role INTO v_role FROM users WHERE id = p_admin_id;
    IF v_role != 'admin' THEN RAISE EXCEPTION 'Akses Ditolak'; END IF;
    UPDATE users SET shift_id = p_shift_id WHERE id = p_target_user_id;
END;
$$;

-- 17. Fungsi Ambil Info Shift Sendiri (Untuk Anggota)
CREATE OR REPLACE FUNCTION get_user_shift_info(p_user_id UUID)
RETURNS TABLE (shift_name TEXT, start_time TIME, end_time TIME)
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    RETURN QUERY 
    SELECT s.name, s.start_time, s.end_time 
    FROM users u 
    JOIN shifts s ON u.shift_id = s.id 
    WHERE u.id = p_user_id;
END;
$$;
-- 18. Fungsi Ambil Izin Aktif Hari Ini (Untuk Anggota)
DROP FUNCTION IF EXISTS get_user_active_permission(UUID, DATE);

CREATE OR REPLACE FUNCTION get_user_active_permission(p_user_id UUID, p_date DATE)
RETURNS TABLE (
    id UUID, 
    reason TEXT, 
    status TEXT, 
    estimated_return TIMESTAMPTZ, 
    created_at TIMESTAMPTZ
)
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    RETURN QUERY 
    SELECT p.id, p.reason, p.status, p.estimated_return, p.created_at
    FROM permissions p
    WHERE p.user_id = p_user_id 
      AND p.date = p_date 
      AND p.status IN ('menunggu', 'disetujui')
    ORDER BY p.created_at DESC
    LIMIT 1;
END;
$$;

-- 19. Fungsi Konfirmasi Kembali dari Izin (Dengan pengecekan telat)
CREATE OR REPLACE FUNCTION return_from_permission(p_user_id UUID, p_permission_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_est_return TIMESTAMPTZ;
    v_status TEXT;
BEGIN
    SELECT estimated_return, status INTO v_est_return, v_status 
    FROM permissions 
    WHERE id = p_permission_id AND user_id = p_user_id;

    IF v_status != 'disetujui' THEN
        RAISE EXCEPTION 'Izin belum disetujui atau sudah selesai.';
    END IF;

    IF NOW() > v_est_return THEN
        UPDATE permissions SET status = 'terlambat_kembali', actual_return = NOW() WHERE id = p_permission_id;
    ELSE
        UPDATE permissions SET status = 'kembali', actual_return = NOW() WHERE id = p_permission_id;
    END IF;
END;
$$;

-- 20. Fungsi Ambil Statistik per Shift (Admin)
CREATE OR REPLACE FUNCTION get_admin_shift_stats(p_admin_id UUID, p_date DATE)
RETURNS TABLE (
    shift_id UUID,
    shift_name TEXT,
    total_members BIGINT,
    total_hadir BIGINT,
    total_izin BIGINT
)
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_role TEXT;
BEGIN
    SELECT role INTO v_role FROM users WHERE id = p_admin_id;
    IF v_role != 'admin' THEN RAISE EXCEPTION 'Akses Ditolak'; END IF;

    RETURN QUERY
    WITH shift_list AS (
        SELECT id, name FROM shifts
        UNION ALL
        SELECT NULL::UUID as id, 'Tanpa Shift'::TEXT as name
    ),
    member_counts AS (
        SELECT u.shift_id as sid, COUNT(*) as cnt
        FROM users u
        GROUP BY u.shift_id
    ),
    hadir_counts AS (
        SELECT u.shift_id as sid, COUNT(*) as cnt
        FROM attendance a
        JOIN users u ON a.user_id = u.id
        WHERE a.date = p_date AND a.status IN ('hadir', 'terlambat')
        GROUP BY u.shift_id
    ),
    izin_counts AS (
        SELECT u.shift_id as sid, COUNT(*) as cnt
        FROM permissions p
        JOIN users u ON p.user_id = u.id
        WHERE p.date = p_date AND p.status IN ('menunggu', 'disetujui', 'kembali', 'terlambat_kembali')
        GROUP BY u.shift_id
    )
    SELECT 
        sl.id,
        sl.name,
        COALESCE(mc.cnt, 0) as total_members,
        COALESCE(hc.cnt, 0) as total_hadir,
        COALESCE(ic.cnt, 0) as total_izin
    FROM shift_list sl
    LEFT JOIN member_counts mc ON (sl.id = mc.sid OR (sl.id IS NULL AND mc.sid IS NULL))
    LEFT JOIN hadir_counts hc ON (sl.id = hc.sid OR (sl.id IS NULL AND hc.sid IS NULL))
    LEFT JOIN izin_counts ic ON (sl.id = ic.sid OR (sl.id IS NULL AND ic.sid IS NULL))
    ORDER BY sl.name;
END;
$$;

-- 21. Fungsi Setujui Perangkat Baru (Admin)
CREATE OR REPLACE FUNCTION approve_device(p_admin_id UUID, p_target_id UUID)
RETURNS VOID 
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_role TEXT;
BEGIN
    SELECT role INTO v_role FROM users WHERE id = p_admin_id;
    IF v_role != 'admin' THEN
        RAISE EXCEPTION 'Akses Ditolak: Bukan Admin';
    END IF;

    UPDATE users 
    SET device_id = pending_device_id, pending_device_id = NULL 
    WHERE id = p_target_id AND pending_device_id IS NOT NULL;
END;
$$;

-- 22. Fungsi Logout (Hapus device_id)
CREATE OR REPLACE FUNCTION logout_user(p_name TEXT, p_device_id TEXT)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    UPDATE users 
    SET device_id = NULL, pending_device_id = NULL 
    WHERE name ILIKE p_name AND device_id = p_device_id;
END;
$$;

-- 23. Fungsi Verifikasi Password (dengan pgcrypto & auto-migration)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE OR REPLACE FUNCTION verify_password(p_name TEXT, p_password TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_hash TEXT;
BEGIN
    SELECT password_hash INTO v_hash FROM users WHERE name ILIKE p_name;
    
    IF v_hash IS NULL THEN
        RETURN FALSE;
    END IF;

    -- Auto-migration: Jika password masih plain text
    IF v_hash = p_password THEN
        UPDATE users SET password_hash = crypt(p_password, gen_salt('bf')) WHERE name ILIKE p_name;
        RETURN TRUE;
    -- Verifikasi hash
    ELSIF v_hash = crypt(p_password, v_hash) THEN
        RETURN TRUE;
    END IF;

    RETURN FALSE;
END;
$$;

-- 24. Fungsi Buat Anggota Baru (Admin)
CREATE OR REPLACE FUNCTION create_member(p_admin_id UUID, p_name TEXT, p_divisi TEXT, p_password TEXT, p_role TEXT DEFAULT 'anggota')
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_admin_role TEXT;
BEGIN
    SELECT role INTO v_admin_role FROM users WHERE id = p_admin_id;
    IF v_admin_role != 'admin' THEN
        RAISE EXCEPTION 'Akses Ditolak: Bukan Admin';
    END IF;

    

    INSERT INTO users (name, divisi, role, password_hash)
    VALUES (p_name, p_divisi, p_role, crypt(p_password, gen_salt('bf')));
END;
$$;

-- 25. Fungsi Reset Password Anggota (Admin)
CREATE OR REPLACE FUNCTION reset_password(p_admin_id UUID, p_target_id UUID, p_new_password TEXT)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_role TEXT;
BEGIN
    SELECT role INTO v_role FROM users WHERE id = p_admin_id;
    IF v_role != 'admin' THEN
        RAISE EXCEPTION 'Akses Ditolak: Bukan Admin';
    END IF;

    UPDATE users SET password_hash = crypt(p_new_password, gen_salt('bf'))
    WHERE id = p_target_id;
END;
$$;

-- 26. Fungsi Ganti Password Sendiri (Semua User)
CREATE OR REPLACE FUNCTION change_password(p_user_id UUID, p_old_password TEXT, p_new_password TEXT)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_current_hash TEXT;
BEGIN
    IF p_new_password IS NULL OR length(p_new_password) < 6 THEN
        RAISE EXCEPTION 'Password baru minimal 6 karakter';
    END IF;

    SELECT password_hash INTO v_current_hash FROM users WHERE id = p_user_id;

    IF v_current_hash IS NULL THEN
        RAISE EXCEPTION 'Pengguna tidak ditemukan';
    END IF;

    IF v_current_hash != crypt(p_old_password, v_current_hash) THEN
        RAISE EXCEPTION 'Password lama salah';
    END IF;

    UPDATE users
    SET password_hash = crypt(p_new_password, gen_salt('bf')),
        updated_at = NOW()
    WHERE id = p_user_id;
END;
$$;

-- Fungsi khusus ambil status user, TANPA device lock logic
CREATE OR REPLACE FUNCTION get_user_status(p_user_id UUID)
RETURNS TABLE (frozen_until TIMESTAMPTZ)
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    RETURN QUERY SELECT u.frozen_until FROM users u WHERE u.id = p_user_id;
END;
$$;

-- Fungsi untuk mendapatkan tanggal server
CREATE OR REPLACE FUNCTION get_server_date()
RETURNS TABLE(today DATE)
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    RETURN QUERY SELECT CURRENT_DATE;
END;
$$;

-- 26. Fungsi Tolak Perangkat Baru (Admin)
CREATE OR REPLACE FUNCTION reject_device_request(p_admin_id UUID, p_target_id UUID)
RETURNS VOID 
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_role TEXT;
BEGIN
    SELECT role INTO v_role FROM users WHERE id = p_admin_id;
    IF v_role != 'admin' THEN
        RAISE EXCEPTION 'Akses Ditolak: Bukan Admin';
    END IF;

    UPDATE users 
    SET pending_device_id = NULL 
    WHERE id = p_target_id AND pending_device_id IS NOT NULL;
END;
$$;

-- 27. Fungsi Ambil Anggota per Shift
CREATE OR REPLACE FUNCTION get_users_by_shift(p_shift_id UUID)
RETURNS TABLE (id UUID, name TEXT, divisi TEXT)
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    RETURN QUERY 
    SELECT u.id, u.name, u.divisi 
    FROM users u 
    WHERE u.shift_id = p_shift_id
    ORDER BY u.name;
END;
$$;

-- 28. Fungsi Ambil Semua Shift
CREATE OR REPLACE FUNCTION get_all_shifts()
RETURNS TABLE (id UUID, name TEXT)
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    RETURN QUERY 
    SELECT s.id, s.name 
    FROM shifts s 
    ORDER BY s.name;
END;
$$;
