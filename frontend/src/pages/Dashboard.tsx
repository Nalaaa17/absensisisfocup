import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LogOut, LayoutDashboard, Calendar, FileText, Settings, ShieldAlert, Clock, Info, CheckCircle2, Clock3, MapPin, Loader2, Users, Trophy } from 'lucide-react';
import { toast } from 'sonner';
import { useAuthStore } from '@/stores/authStore';
import { supabase } from '@/lib/supabase';

export default function Dashboard() {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const [stats, setStats] = useState({ hadir: 0, izin: 0, belum: 28 });
  const [shiftStats, setShiftStats] = useState<any[]>([]);
  const [activities, setActivities] = useState<any[]>([]);
  const [myShift, setMyShift] = useState<{shift_name: string, start_time: string, end_time: string} | null>(null);
  const [activePermission, setActivePermission] = useState<any>(null);
  const [isReturning, setIsReturning] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate('/');
      return;
    }
    
    fetchUserShift();
    if (user.role === 'admin' || user.role === 'superadmin') {
      fetchAdminStats();
    }
  }, [user, navigate]);

  const fetchUserShift = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase.rpc('get_user_shift_info', { p_user_id: user.id });
      if (!error && data && data.length > 0) {
        setMyShift(data[0]);
      }

      // Fetch active permission
      const today = new Date().toISOString().split('T')[0];
      const { data: permData, error: permErr } = await supabase.rpc('get_user_active_permission', {
        p_user_id: user.id,
        p_date: today
      });
      if (!permErr && permData && permData.length > 0) {
        setActivePermission(permData[0]);
      } else {
        setActivePermission(null);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchAdminStats = async () => {
    if (!user) return;
    try {
      const today = new Date().toISOString().split('T')[0];
      const { data: statsData, error: statsErr } = await supabase.rpc('get_daily_stats', {
        p_admin_id: user.id,
        p_date: today
      });

      if (!statsErr && statsData && statsData.length > 0) {
        setStats(statsData[0]);
      }

      // Fetch per-shift stats
      const { data: ssData, error: ssErr } = await supabase.rpc('get_shift_stats', {
        p_admin_id: user.id,
        p_date: today
      });
      if (!ssErr && ssData) {
        setShiftStats(ssData);
      }

      // Fetch recent activities
      const { data: actData, error: actErr } = await supabase.rpc('get_recent_activities', {
        p_admin_id: user.id,
        p_date: today
      });
      if (!actErr && actData) {
        setActivities(actData);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleReturnFromPermission = async () => {
    if (!user || !activePermission) return;
    setIsReturning(true);

    try {
      if (!navigator.geolocation) {
        toast.error('GPS tidak didukung browser Anda.');
        setIsReturning(false);
        return;
      }

      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const { latitude, longitude } = pos.coords;
          
          // Get admin settings for geofence
          const { data: setArr, error: setErr } = await supabase.rpc('get_settings');
          if (setErr || !setArr || setArr.length === 0) {
            toast.error('Gagal mengambil pengaturan lokasi dari server.');
            setIsReturning(false);
            return;
          }
          
          const settings = setArr[0];
          const radius = settings.geofence_radius || 100;
          const centerLat = settings.geofence_lat;
          const centerLng = settings.geofence_lng;

          if (!centerLat || !centerLng) {
            toast.error('Lokasi pusat belum diatur oleh admin.');
            setIsReturning(false);
            return;
          }

          const toRad = (value: number) => value * Math.PI / 180;
          const R = 6371e3;
          const dLat = toRad(centerLat - latitude);
          const dLon = toRad(centerLng - longitude);
          const lat1 = toRad(latitude);
          const lat2 = toRad(centerLat);
          const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                    Math.sin(dLon/2) * Math.sin(dLon/2) * Math.cos(lat1) * Math.cos(lat2); 
          const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
          const distance = Math.round(R * c);

          if (distance > radius) {
            toast.error(`Anda berada di luar radius! (Jarak: ${distance}m, Maks: ${radius}m). Silakan mendekat ke lokasi kerja.`);
            setIsReturning(false);
            return;
          }

          // If within radius, call RPC
          const { error: rpcErr } = await supabase.rpc('return_from_permission', {
            p_user_id: user.id,
            p_permission_id: activePermission.id
          });

          if (rpcErr) {
            toast.error(`Gagal konfirmasi: ${rpcErr.message}`);
          } else {
            toast.success('Berhasil! Anda sudah tercatat kembali.');
            fetchUserShift();
          }
          setIsReturning(false);
        },
        (err) => {
          toast.error(`Gagal mendapatkan lokasi GPS: ${err.message}`);
          setIsReturning(false);
        },
        { enableHighAccuracy: true }
      );
    } catch (e) {
      console.error(e);
      setIsReturning(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const formatTime = (timeStr: string) => {
    if (!timeStr) return '-';
    try {
      const d = new Date(timeStr);
      return d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    } catch { return timeStr; }
  };

  const isAdmin = user?.role === 'admin' || user?.role === 'superadmin';

  return (
    <div className="page-body pb-12">
      {/* Navbar */}
      <header className="page-header">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 gold-gradient rounded-xl flex items-center justify-center shadow-md shadow-gold-300/30">
                <Trophy className="text-white w-5 h-5" />
              </div>
              <span className="font-bold text-xl tracking-tight gold-gradient-text">SISFO CUP</span>
            </div>
            <Button variant="ghost" onClick={handleLogout} className="text-neutral-500 hover:text-red-600 hover:bg-red-50 rounded-xl">
              <LogOut className="w-4 h-4 mr-2" />
              Keluar
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-neutral-900">
            Selamat datang, <span className="gold-gradient-text">{user?.name}</span> 👋
          </h1>
          <p className="text-neutral-400 mt-1 text-sm">Ringkasan absensi dan perizinan hari ini.</p>
        </div>

        {/* Stats Grid - Admin Only */}
        {isAdmin && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
              <div className="card-elegant p-5 border-l-4 border-l-emerald-400">
                <p className="text-[11px] font-semibold text-neutral-400 uppercase tracking-widest mb-2">Total Hadir</p>
                <p className="text-3xl font-bold text-neutral-900">{stats.hadir}<span className="text-sm font-normal text-neutral-300 ml-1">org</span></p>
              </div>
              <div className="card-elegant p-5 border-l-4 border-l-gold-400">
                <p className="text-[11px] font-semibold text-neutral-400 uppercase tracking-widest mb-2">Sedang Izin</p>
                <p className="text-3xl font-bold text-neutral-900">{stats.izin}<span className="text-sm font-normal text-neutral-300 ml-1">org</span></p>
              </div>
              <div className="card-elegant p-5 border-l-4 border-l-red-300">
                <p className="text-[11px] font-semibold text-neutral-400 uppercase tracking-widest mb-2">Belum Absen</p>
                <p className="text-3xl font-bold text-neutral-900">{stats.belum}<span className="text-sm font-normal text-neutral-300 ml-1">org</span></p>
              </div>
            </div>

            {/* Statistik per Shift */}
            <div className="mb-8">
              <h2 className="text-sm font-bold text-neutral-700 mb-4 flex items-center gap-2 uppercase tracking-wider">
                <Clock className="w-4 h-4 text-gold-500" />
                Statistik per Shift
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {shiftStats.map((s, idx) => (
                  <div key={idx} className="card-elegant overflow-hidden">
                    <div className="px-4 py-3 bg-gradient-to-r from-neutral-50 to-gold-50/40 border-b border-neutral-100">
                      <h3 className="text-sm font-bold text-neutral-800 truncate">{s.shift_name}</h3>
                    </div>
                    <div className="p-4 space-y-2.5">
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-neutral-400">Total</span>
                        <span className="font-semibold text-neutral-700 text-xs bg-neutral-100 px-2 py-0.5 rounded-full">{s.total_members}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-emerald-500">Hadir</span>
                        <span className="font-semibold text-emerald-700 text-xs bg-emerald-50 px-2 py-0.5 rounded-full">{s.total_hadir}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-gold-600">Izin</span>
                        <span className="font-semibold text-gold-700 text-xs bg-gold-50 px-2 py-0.5 rounded-full">{s.total_izin}</span>
                      </div>
                    </div>
                  </div>
                ))}
                {shiftStats.length === 0 && (
                  <div className="col-span-full p-6 border-2 border-dashed border-neutral-200 rounded-2xl text-center text-neutral-400 text-sm">
                    Memuat data statistik shift...
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {/* Content Area */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">

            {/* Status Izin - All Users */}
            {activePermission && (
              <div className={`card-elegant p-6 border-l-4 ${activePermission.status === 'menunggu' ? 'border-l-gold-400 bg-gold-50/30' : 'border-l-emerald-400 bg-emerald-50/30'}`}>
                <div className="flex items-start gap-4">
                  <div className={`w-11 h-11 rounded-full flex items-center justify-center shrink-0 ${activePermission.status === 'menunggu' ? 'bg-gold-100 text-gold-600' : 'bg-emerald-100 text-emerald-600'}`}>
                    {activePermission.status === 'menunggu' ? <Clock3 className="w-5 h-5" /> : <CheckCircle2 className="w-5 h-5" />}
                  </div>
                  <div className="flex-1">
                    <h2 className="text-base font-bold text-neutral-800">
                      Status Izin: <span className={activePermission.status === 'menunggu' ? 'text-gold-600' : 'text-emerald-600'}>
                        {activePermission.status === 'menunggu' ? 'Sedang Ditinjau' : 'Disetujui'}
                      </span>
                    </h2>
                    <p className="text-neutral-500 text-sm mt-1">
                      {activePermission.status === 'menunggu' ? (
                        'Pengajuan izin Anda sedang menunggu persetujuan Admin.'
                      ) : (
                        `Izin disetujui! Kembali sebelum pukul ${formatTime(activePermission.estimated_return)}.`
                      )}
                    </p>
                    
                    {activePermission.status === 'disetujui' && (
                      <Button 
                        onClick={handleReturnFromPermission}
                        disabled={isReturning}
                        className="mt-3 btn-gold rounded-xl h-10"
                      >
                        {isReturning ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <MapPin className="w-4 h-4 mr-2" />}
                        {isReturning ? 'Memeriksa GPS...' : 'Konfirmasi Kembali'}
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Shift Info - All Users */}
            <div className="card-elegant p-6 border-l-4 border-l-gold-300 shimmer">
              <div className="flex items-start gap-4">
                <div className="w-11 h-11 rounded-full bg-gold-100 flex items-center justify-center shrink-0 text-gold-600">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-neutral-800">Informasi Shift Anda</h2>
                  {myShift ? (
                    <>
                      <p className="text-neutral-500 text-sm mt-1">
                        Ditugaskan pada <strong className="text-neutral-700">{myShift.shift_name}</strong>
                      </p>
                      <div className="mt-3 flex items-center gap-2 text-xs text-gold-700 bg-gold-50 px-3 py-2 rounded-lg border border-gold-200 w-fit">
                        <Info className="w-3.5 h-3.5" />
                        <span>Absen sebelum pukul <strong>{myShift.end_time.substring(0, 5)}</strong></span>
                      </div>
                    </>
                  ) : (
                    <p className="text-neutral-400 text-sm mt-1">
                      Belum ada shift. Absensi dicatat sebagai <em>Hadir</em>.
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Admin Activities */}
            {isAdmin && (
              <div className="card-elegant overflow-hidden">
                <div className="px-6 py-4 border-b border-neutral-100 bg-gradient-to-r from-white to-gold-50/30">
                  <h3 className="text-sm font-bold text-neutral-700 uppercase tracking-wider">Aktivitas Terkini</h3>
                </div>
                <div className="p-4">
                  {activities.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <div className="w-14 h-14 bg-neutral-100 rounded-full flex items-center justify-center mb-3">
                        <Calendar className="w-6 h-6 text-neutral-300" />
                      </div>
                      <h3 className="text-sm font-medium text-neutral-600">Belum ada aktivitas</h3>
                      <p className="text-xs text-neutral-400 mt-1">Data hari ini akan muncul di sini.</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {activities.map((act) => (
                        <div key={act.id} className="flex items-start gap-3 p-3 rounded-xl hover:bg-neutral-50 transition-colors">
                          <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${act.type === 'absen' ? 'bg-emerald-50 text-emerald-500' : 'bg-gold-50 text-gold-600'}`}>
                            {act.type === 'absen' ? <Calendar className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-neutral-800 truncate">{act.user_name} <span className="text-neutral-400 font-normal">({act.user_divisi})</span></p>
                            <p className="text-xs text-neutral-400 mt-0.5">{act.description}</p>
                          </div>
                          <span className="text-[11px] font-medium text-neutral-300 shrink-0">
                            {formatTime(act.activity_time)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
          
          {/* Sidebar Actions */}
          <div className="space-y-5">
            <div className="card-elegant overflow-hidden">
              <div className="px-5 py-4 border-b border-neutral-100">
                <h3 className="text-sm font-bold text-neutral-700 uppercase tracking-wider">Aksi Cepat</h3>
              </div>
              <div className="p-4 space-y-2.5">
                <Button 
                  className="w-full justify-start text-left font-medium btn-gold rounded-xl h-11" 
                  onClick={() => navigate('/absen')}
                >
                  <Calendar className="w-4 h-4 mr-2" />
                  Absen Masuk
                </Button>
                <Button 
                  className="w-full justify-start text-left font-medium btn-gold-outline rounded-xl h-11" 
                  variant="outline"
                  onClick={() => navigate('/izin')}
                >
                  <FileText className="w-4 h-4 mr-2" />
                  Ajukan Izin
                </Button>
              </div>
            </div>

            {isAdmin && (
              <div className="card-elegant overflow-hidden">
                <div className="px-5 py-4 border-b border-neutral-100 flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-gold-500" />
                  <h3 className="text-sm font-bold text-neutral-700 uppercase tracking-wider">Menu Admin</h3>
                </div>
                <div className="p-4 space-y-1.5">
                  {[
                    { label: 'Rekap Absensi', icon: Calendar, path: '/admin/rekap-absensi' },
                    { label: 'Daftar Perizinan', icon: FileText, path: '/admin/daftar-izin' },
                    { label: 'Kelola Anggota', icon: Users, path: '/admin/anggota' },
                    { label: 'Kelola Shift', icon: Clock, path: '/admin/shift' },
                    { label: 'Pengaturan', icon: Settings, path: '/admin/settings' },
                  ].map((item) => (
                    <Button 
                      key={item.path}
                      className="w-full justify-start text-left font-medium text-neutral-600 hover:text-gold-700 hover:bg-gold-50/50 rounded-xl h-10" 
                      variant="ghost"
                      onClick={() => navigate(item.path)}
                    >
                      <item.icon className="w-4 h-4 mr-2 text-gold-500" />
                      {item.label}
                    </Button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
