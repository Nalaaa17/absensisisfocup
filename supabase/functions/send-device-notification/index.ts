import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  try {
    const { userName } = await req.json()
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)
    
    const { data: admins } = await supabase
      .from('users')
      .select('onesignal_player_id')
      .eq('role', 'admin')
      .not('onesignal_player_id', 'is', null)
    
    if (!admins || admins.length === 0) {
      return new Response(JSON.stringify({ ok: true }))
    }
    
    const playerIds = admins
      .map(a => a.onesignal_player_id)
      .filter((id): id is string => id !== null)
    
    if (playerIds.length === 0) {
      return new Response(JSON.stringify({ ok: true }))
    }
    
    const oneSignalRes = await fetch('https://api.onesignal.com/notifications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${Deno.env.get('ONESIGNAL_REST_API_KEY')}`,
      },
      body: JSON.stringify({
        app_id: Deno.env.get('ONESIGNAL_APP_ID'),
        include_player_ids: playerIds,
        headings: { en: 'Permintaan Ganti HP', id: 'Permintaan Ganti HP' },
        contents: {
          en: `${userName} mencoba login dari perangkat baru`,
          id: `${userName} mencoba login dari perangkat baru`,
        },
        url: 'https://[domain]/admin/anggota',
      }),
    })
    
    const result = await oneSignalRes.json()
    return new Response(JSON.stringify({ ok: true, result }))
  } catch (e) {
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : 'Unknown error' }),
      { status: 500 }
    )
  }
})
