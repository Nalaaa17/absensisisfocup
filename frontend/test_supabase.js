import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://yjuwcvnafaisurvmfoeg.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlqdXdjdm5hZmFpc3Vydm1mb2VnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk0NjU4NzYsImV4cCI6MjA5NTA0MTg3Nn0.17NRdrr1BvDxtt2edNJ82tsCZRmvGVqROaOeKpxLIsg'
);

async function test() {
  const { data, error } = await supabase.rpc('login_user', { p_name: 'test' });
  console.log('Error:', error);
}

test();
