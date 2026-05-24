const fs = require('fs');

let rpc = fs.readFileSync('d:/absensisisfo/supabase/schema_rpc.sql', 'utf8');
rpc = rpc.replace(/NOT IN \('admin', 'superadmin'\)/g, "!= 'admin'");
rpc = rpc.replace(/IF v_admin_role = 'admin' AND p_role != 'anggota' THEN[\s\S]*?END IF;/g, '');
fs.writeFileSync('d:/absensisisfo/supabase/schema_rpc.sql', rpc);

let schema = fs.readFileSync('d:/absensisisfo/supabase/schema.sql', 'utf8');
schema = schema.replace(/IN \('superadmin', 'admin', 'anggota'\)/g, "IN ('admin', 'anggota')");
schema = schema.replace(/IN \('admin', 'superadmin'\)/g, "= 'admin'");
fs.writeFileSync('d:/absensisisfo/supabase/schema.sql', schema);
