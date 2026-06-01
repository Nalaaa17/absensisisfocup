import { useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

export function usePendingDevicePolling(
  adminId: string | undefined,
  onCountChange?: (count: number) => void,
  intervalMs = 15000
) {
  const prevCountRef = useRef(0);

  useEffect(() => {
    if (!adminId) return;

    let isMounted = true;

    const check = async () => {
      try {
        const { data, error } = await supabase.rpc('get_pending_device_count', {
          p_admin_id: adminId,
        });
        if (error || data === null || data === undefined) return;
        if (!isMounted) return;

        const count = Number(data);

        if (prevCountRef.current === 0 && count > 0) {
          toast.warning(
            `Ada ${count} anggota yang meminta ganti HP. Cek Kelola Anggota.`,
            { duration: 6000 }
          );
        }

        prevCountRef.current = count;
        onCountChange?.(count);
      } catch {
        // silent
      }
    };

    check();
    const interval = setInterval(check, intervalMs);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [adminId, intervalMs, onCountChange]);
}
