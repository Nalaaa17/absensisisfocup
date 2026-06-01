import { type ReactNode, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { LogOut, Smartphone } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { supabase } from '@/lib/supabase';

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const [pendingCount, setPendingCount] = useState(0);

  // Polling badge count untuk admin
  useEffect(() => {
    if (user?.role !== 'admin') return;

    let isMounted = true;
    const check = async () => {
      try {
        const { data } = await supabase.rpc('get_pending_device_count', {
          p_admin_id: user.id,
        });
        if (!isMounted) return;
        setPendingCount(data !== null && data !== undefined ? Number(data) : 0);
      } catch {
        // silent
      }
    };

    check();
    const interval = setInterval(check, 15000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [user]);

  const handleLogout = async () => {
    const deviceId = localStorage.getItem('device_id');
    if (user && deviceId) {
      try {
        await supabase.rpc('logout_user', { p_name: user.name, p_device_id: deviceId });
      } catch (e) {
        console.error(e);
      }
    }
    logout();
    navigate('/');
  };

  return (
    <div className="page-body pb-12">
      <header className="page-header">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center gap-2.5">
              <img src="/logo.png" alt="SISFO CUP" className="w-10 h-10 object-contain" />
              <span className="font-bold text-lg text-neutral-800">SISFO CUP</span>
            </div>
            <div className="flex items-center gap-1">
              {user?.role === 'admin' && pendingCount > 0 && (
                <button
                  onClick={() => navigate('/admin/anggota')}
                  className="relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-red-50 text-red-600 hover:bg-red-100 transition-colors mr-2"
                  title={`${pendingCount} permintaan ganti HP`}
                >
                  <Smartphone className="w-3.5 h-3.5" />
                  <span>{pendingCount}</span>
                </button>
              )}
              <Button variant="ghost" onClick={handleLogout} className="text-neutral-500 hover:text-red-600 hover:bg-red-50 rounded-xl">
                <LogOut className="w-4 h-4 mr-2" />
                Keluar
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  );
}
