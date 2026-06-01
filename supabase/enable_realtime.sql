-- ==========================================
-- ENABLE REALTIME PUBLICATION FOR users TABLE
-- ==========================================
-- Jalankan query ini di Supabase SQL Editor
-- (cukup sekali, tidak perlu dijalankan ulang)

ALTER PUBLICATION supabase_realtime ADD TABLE users;
