import { AppLayout } from '@/components/layout/AppLayout';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Calendar, FileText, Settings, ShieldAlert, Clock, CheckCircle2, Clock3, MapPin, Loader2, Users, Lock, Shuffle } from 'lucide-react';
import { toast } from 'sonner';
import { useAuthStore } from '@/stores/authStore';
import { supabase } from '@/lib/supabase';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ConfirmModal } from '@/components/ui/ConfirmModal';

interface ShiftStat {
  shift_id: string | null;
  shift_name: string;
  total_members: number;
  total_hadir: number;
  total_izin: number;
}

interface Activity {
  id: string;
  type: string;
  user_name: string;
  user_divisi: string;
  activity_time: string;
  description: string;
}

interface ActivePermission {
  id: string;
  status: string;
  estimated_return: string;
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [stats, setStats] = useState({ hadir: 0, izin: 0, belum: 0 });
  const [shiftStats, setShiftStats] = useState<ShiftStat[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [myShift, setMyShift] = useState<{shift_name: string, start_time: string, end_time: string} | null>(null);
  const [activePermission, setActivePermission] = useState<ActivePermission | null>(null);
  const [isReturning, setIsReturning] = useState(false);
  const [serverDate, setServerDate] = useState('');
  
  const [shifts, setShifts] = useState<{id: string, name: string}[]>([]);
  const [shiftMembers, setShiftMembers] = useState<{id: string, name: string, divisi: string}[]>([]);
  const [activeShiftId, setActiveShiftId] = useState<string | null>(null);
  const [isLoadingShiftMembers, setIsLoadingShiftMembers] = useState(false);
  const [swapSource, setSwapSource] = useState<{id: string, name: string, shiftId: string} | null>(null);
  const [swapTarget, setSwapTarget] = useState<{id: string, name: string} | null>(null);
  const [isSwapping, setIsSwapping] = useState(false);
  useEffect(() => {
    if (!serverDate) {
      supabase.rpc('get_server_date').then(({ data }) => {
        if (data?.[0]) setServerDate(data[0].today);
      });
    }

    fetchUserShift();
    fetchAllShifts();
    if (user?.role === 'admin') {
      fetchAdminStats();
    }
    checkActivePermission();
    
    // Auto refresh data every 1 minute
    const interval = setInterval(() => {
      if (user?.role === 'admin') {
        fetchAdminStats();
      }
      checkActivePermission();
    }, 60000);
    
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, serverDate]);

  const fetchAllShifts = async () => {
    try {
      const { data, error } = await supabase.rpc('get_all_shifts');
      if (!error && data) {
        setShifts(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchShiftMembers = async (shiftId: string) => {
    setActiveShiftId(shiftId);
    setIsLoadingShiftMembers(true);
    try {
      const { data, error } = await supabase.rpc('get_users_by_shift', { p_shift_id: shiftId });
      if (!error && data) {
        setShiftMembers(data);
      } else {
        setShiftMembers([]);
      }
    } catch (e) {
      console.error(e);
      setShiftMembers([]);
    } finally {
      setIsLoadingShiftMembers(false);
    }
  };

  const handleSwapSourceSelect = (member: {id: string, name: string}) => {
    if (!activeShiftId) return;
    if (swapSource && swapSource.id === member.id) {
      setSwapSource(null);
      return;
    }
    setSwapSource({ ...member, shiftId: activeShiftId });
    const otherShift = shifts.find(s => s.id !== activeShiftId);
    if (otherShift) fetchShiftMembers(otherShift.id);
  };

  const handleSwapTargetSelect = (target: {id: string, name: string}) => {
    if (!swapSource) return;
    setSwapTarget(target);
  };

  const executeSwap = async () => {
    if (!user || !swapSource || !swapTarget) return;
    setIsSwapping(true);
    try {
      const { error } = await supabase.rpc('swap_user_shift', {
        p_admin_id: user.id,
        p_user1_id: swapSource.id,
        p_user2_id: swapTarget.id
      });
      if (error) throw error;
      toast.success(`Berhasil menukar ${swapSource.name} ↔ ${swapTarget.name}`);
      setSwapSource(null);
      setSwapTarget(null);
      if (activeShiftId) fetchShiftMembers(activeShiftId);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : typeof err === 'string' ? err : JSON.stringify(err);
      toast.error(`Gagal: ${msg}`);
    } finally {
      setIsSwapping(false);
    }
  };

  const checkActivePermission = async () => {
    if (!user) return;
    const today = serverDate || new Date().toISOString().split('T')[0];
    const { data: permData, error: permErr } = await supabase.rpc('get_user_active_permission', {
      p_user_id: user.id,
      p_date: today
    });
    if (!permErr && permData && permData.length > 0) {
      setActivePermission(permData[0]);
    } else {
      setActivePermission(null);
    }
  };

  const fetchUserShift = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase.rpc('get_user_shift_info', { p_user_id: user.id });
      if (!error && data && data.length > 0) {
        setMyShift(data[0]);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchAdminStats = async () => {
    if (!user) return;
    try {
      const today = serverDate || new Date().toISOString().split('T')[0];
      const { data: statsData, error: statsErr } = await supabase.rpc('get_admin_stats', {
        p_admin_id: user.id,
        p_date: today
      });

      if (!statsErr && statsData && typeof statsData === 'object') {
        const s = statsData as { hadir?: number; izin?: number };
        setStats(prev => ({
          ...prev,
          hadir: s.hadir ?? prev.hadir,
          izin: s.izin ?? prev.izin,
        }));
      }

      // Fetch per-shift stats
      const { data: ssData, error: ssErr } = await supabase.rpc('get_admin_shift_stats', {
        p_admin_id: user.id,
        p_date: today
      });
      if (!ssErr && ssData) {
        setShiftStats(ssData);
        let totalMembers = 0;
        ssData.forEach((s: ShiftStat) => totalMembers += Number(s.total_members || 0));
        setStats(prev => ({
          ...prev,
          belum: Math.max(0, totalMembers - prev.hadir - prev.izin)
        }));
      }

      // Fetch recent activities
      const { data: actData, error: actErr } = await supabase.rpc('get_recent_activities', {
        p_admin_id: user.id,
        p_limit: 5
      });
      if (!actErr && actData) {
        setActivities(actData);
      }
    } catch (err: unknown) {
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
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    } catch (e) {
      console.error(e);
      setIsReturning(false);
    }
  };



  const formatTime = (timeStr: string) => {
    if (!timeStr) return '-';
    try {
      const d = new Date(timeStr);
      return d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    } catch { return timeStr; }
  };

  const isAdmin = user?.role === 'admin';

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Welcome */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-neutral-800">
              Selamat datang, <span className="gold-text">{user?.name}</span>
            </h1>
            <p className="text-neutral-500 text-xs mt-0.5">Ringkasan absensi dan perizinan hari ini.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {myShift && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold bg-gold-50 text-gold-700 border border-gold-200">
                <Clock className="w-3 h-3" />
                {myShift.shift_name} — {myShift.end_time.substring(0, 5)}
              </span>
            )}
            {isAdmin && activePermission && (
              <>
                <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold border ${activePermission.status === 'menunggu' ? 'bg-gold-50 text-gold-700 border-gold-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'}`}>
                  {activePermission.status === 'menunggu' ? <Clock3 className="w-3 h-3" /> : <CheckCircle2 className="w-3 h-3" />}
                  Izin {activePermission.status === 'menunggu' ? 'Ditinjau' : 'Disetujui'}
                </span>
                {activePermission.status === 'disetujui' && (
                  <Button variant="gold-outline" size="sm" className="rounded-full h-7 text-[10px] px-2.5" onClick={handleReturnFromPermission} disabled={isReturning}>
                    <MapPin className="w-2.5 h-2.5 mr-1" />
                    Kembali
                  </Button>
                )}
              </>
            )}
          </div>
        </div>

        {/* Stats Grid - Admin Only */}
        {isAdmin && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="card-attendance p-4">
                <div className="flex items-center justify-between mb-1.5">
                  <p className="text-[11px] font-medium text-neutral-500 uppercase tracking-wider">Hadir</p>
                  <div className="w-7 h-7 rounded-lg bg-emerald-50 flex items-center justify-center">
                    <Calendar className="w-3.5 h-3.5 text-emerald-500" />
                  </div>
                </div>
                <p className="text-xl font-bold text-neutral-900">{stats.hadir}<span className="text-xs font-normal text-neutral-400 ml-1">org</span></p>
              </div>
              <div className="card-attendance p-4">
                <div className="flex items-center justify-between mb-1.5">
                  <p className="text-[11px] font-medium text-neutral-500 uppercase tracking-wider">Izin</p>
                  <div className="w-7 h-7 rounded-lg bg-gold-50 flex items-center justify-center">
                    <FileText className="w-3.5 h-3.5 text-gold-500" />
                  </div>
                </div>
                <p className="text-xl font-bold text-neutral-900">{stats.izin}<span className="text-xs font-normal text-neutral-400 ml-1">org</span></p>
              </div>
              <div className="card-attendance p-4">
                <div className="flex items-center justify-between mb-1.5">
                  <p className="text-[11px] font-medium text-neutral-500 uppercase tracking-wider">Belum</p>
                  <div className="w-7 h-7 rounded-lg bg-red-50 flex items-center justify-center">
                    <Clock className="w-3.5 h-3.5 text-red-400" />
                  </div>
                </div>
                <p className="text-xl font-bold text-neutral-900">{stats.belum}<span className="text-xs font-normal text-neutral-400 ml-1">org</span></p>
              </div>
            </div>

            {/* Statistik per Shift */}
            <div className="card-attendance overflow-hidden">
              <div className="px-5 py-3.5 border-b border-neutral-100">
                <h3 className="text-xs font-semibold text-neutral-500 uppercase tracking-wider flex items-center gap-2">
                  <Clock className="w-3.5 h-3.5" />
                  Statistik per Shift
                </h3>
              </div>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Shift</TableHead>
                      <TableHead className="text-center w-20">Total</TableHead>
                      <TableHead className="text-center w-20 text-emerald-600">Hadir</TableHead>
                      <TableHead className="text-center w-20 text-gold-600">Izin</TableHead>
                      <TableHead className="text-center w-20 text-red-400">Belum</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {shiftStats.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8 text-neutral-400 text-sm">Memuat data...</TableCell>
                      </TableRow>
                    ) : (
                      shiftStats.map(s => {
                        const belum = Math.max(0, Number(s.total_members) - Number(s.total_hadir) - Number(s.total_izin));
                        return (
                          <TableRow key={s.shift_id || 'none'}>
                            <TableCell className="font-medium text-neutral-800">{s.shift_name}</TableCell>
                            <TableCell className="text-center font-medium">{s.total_members}</TableCell>
                            <TableCell className="text-center text-emerald-600 font-semibold">{s.total_hadir}</TableCell>
                            <TableCell className="text-center text-gold-600 font-semibold">{s.total_izin}</TableCell>
                            <TableCell className="text-center text-red-400 font-semibold">{belum}</TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          </>
        )}

        {/* Content Area — dipisah admin vs non-admin */}
        {isAdmin ? (
          <>
            {/* Baris: Aktivitas Terkini + Panel Admin */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Aktivitas Terkini — 2/3 */}
              <div className="lg:col-span-2 card-attendance overflow-hidden">
                <div className="px-5 py-3.5 border-b border-neutral-100">
                  <h3 className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">Aktivitas Terkini</h3>
                </div>
                <div className="max-h-[360px] overflow-y-auto">
                  {activities.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-10 text-center">
                      <Calendar className="w-8 h-8 text-neutral-200 mb-2" />
                      <p className="text-sm text-neutral-400">Belum ada aktivitas hari ini.</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-neutral-50">
                      {activities.map((act) => (
                        <div key={act.id} className="flex items-start gap-3 px-5 py-3 hover:bg-neutral-50 transition-colors">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${act.type === 'absen' ? 'bg-emerald-50 text-emerald-500' : 'bg-gold-50 text-gold-500'}`}>
                            {act.type === 'absen' ? <Calendar className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-neutral-800 truncate">{act.user_name} <span className="text-neutral-400 font-normal text-xs">({act.user_divisi})</span></p>
                            <p className="text-xs text-neutral-400 mt-0.5">{act.description}</p>
                          </div>
                          <span className="text-xs text-neutral-400 shrink-0">{formatTime(act.activity_time)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Panel Admin — 1/3 */}
              <div className="card-attendance overflow-hidden">
                <div className="px-5 py-3.5 border-b border-neutral-100 flex items-center gap-2">
                  <ShieldAlert className="w-3.5 h-3.5 text-gold-500" />
                  <h3 className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">Panel Admin</h3>
                </div>
                <div className="p-4 space-y-5">
                  <div className="space-y-2">
                    <h4 className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider">Aksi Cepat</h4>
                    <Button variant="gold" className="w-full justify-start text-left h-9 rounded-lg text-sm" onClick={() => navigate('/absen')}>
                      <Calendar className="w-4 h-4 mr-2" />
                      Absen Masuk
                    </Button>
                    <Button variant="gold-outline" className="w-full justify-start text-left h-9 rounded-lg text-sm" onClick={() => navigate('/izin')}>
                      <FileText className="w-4 h-4 mr-2" />
                      Ajukan Izin
                    </Button>
                    <Button variant="outline" className="w-full justify-start text-left h-9 rounded-lg text-sm" onClick={() => navigate('/ubah-password')}>
                      <Lock className="w-4 h-4 mr-2" />
                      Ganti Password
                    </Button>
                  </div>
                  <div className="space-y-2">
                    <h4 className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider">Menu Admin</h4>
                    <div className="space-y-0.5">
                      {[
                        { label: 'Rekap Absensi', icon: Calendar, path: '/admin/rekap-absensi' },
                        { label: 'Daftar Perizinan', icon: FileText, path: '/admin/daftar-izin' },
                        { label: 'Kelola Anggota', icon: Users, path: '/admin/anggota' },
                        { label: 'Kelola Shift', icon: Clock, path: '/admin/shift' },
                        { label: 'Pengaturan', icon: Settings, path: '/admin/settings' },
                      ].map((item) => (
                        <Button key={item.path} className="w-full justify-start text-left font-medium text-neutral-600 hover:text-gold-600 hover:bg-gold-50/50 rounded-lg h-9 text-sm" variant="ghost" onClick={() => navigate(item.path)}>
                          <item.icon className="w-4 h-4 mr-2 text-gold-500" />
                          {item.label}
                        </Button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </>
        ) : (
          /* Non-Admin */
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-5">
              {activePermission && (
                <div className={`card-attendance p-5 border-l-4 ${activePermission.status === 'menunggu' ? 'border-l-gold-400' : 'border-l-emerald-400'}`}>
                  <div className="flex items-start gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${activePermission.status === 'menunggu' ? 'bg-gold-50 text-gold-500' : 'bg-emerald-50 text-emerald-500'}`}>
                      {activePermission.status === 'menunggu' ? <Clock3 className="w-5 h-5" /> : <CheckCircle2 className="w-5 h-5" />}
                    </div>
                    <div className="flex-1">
                      <h2 className="text-sm font-semibold text-neutral-800">
                        Status Izin: <span className={activePermission.status === 'menunggu' ? 'gold-text' : 'text-emerald-600'}>
                          {activePermission.status === 'menunggu' ? 'Sedang Ditinjau' : 'Disetujui'}
                        </span>
                      </h2>
                      <p className="text-neutral-500 text-xs mt-0.5">
                        {activePermission.status === 'menunggu'
                          ? 'Pengajuan izin Anda sedang menunggu persetujuan Admin.'
                          : `Kembali sebelum pukul ${formatTime(activePermission.estimated_return)}.`}
                      </p>
                      {activePermission.status === 'disetujui' && (
                        <Button onClick={handleReturnFromPermission} disabled={isReturning} variant="gold" className="mt-3 h-9 text-xs rounded-lg">
                          {isReturning ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <MapPin className="w-3.5 h-3.5 mr-1.5" />}
                          {isReturning ? 'Memeriksa GPS...' : 'Konfirmasi Kembali'}
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
            <div className="card-attendance overflow-hidden">
              <div className="px-5 py-3.5 border-b border-neutral-100">
                <h3 className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">Aksi Cepat</h3>
              </div>
              <div className="p-4 space-y-2">
                <Button variant="gold" className="w-full justify-start text-left h-10 rounded-lg text-sm" onClick={() => navigate('/absen')}>
                  <Calendar className="w-4 h-4 mr-2" /> Absen Masuk
                </Button>
                <Button variant="gold-outline" className="w-full justify-start text-left h-10 rounded-lg text-sm" onClick={() => navigate('/izin')}>
                  <FileText className="w-4 h-4 mr-2" /> Ajukan Izin
                </Button>
                <Button variant="outline" className="w-full justify-start text-left h-10 rounded-lg text-sm" onClick={() => navigate('/ubah-password')}>
                  <Lock className="w-4 h-4 mr-2" /> Ganti Password
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Daftar Anggota per Shift — untuk semua user */}
        <div className="card-attendance overflow-hidden">
          <div className="px-5 py-3.5 border-b border-neutral-100 flex items-center justify-between">
            <h3 className="text-xs font-semibold text-neutral-500 uppercase tracking-wider flex items-center gap-2">
              <Users className="w-4 h-4" />
              Daftar Anggota per Shift
            </h3>
            {isAdmin && swapSource && (
              <button
                onClick={() => setSwapSource(null)}
                className="text-xs text-red-500 hover:text-red-700 font-medium"
              >
                Batal Swap
              </button>
            )}
          </div>
          <div className="p-5 space-y-4">
            {/* Banner mode swap untuk admin */}
            {isAdmin && swapSource && (
              <div className="bg-gold-50 border border-gold-200 rounded-xl px-4 py-3 flex items-center gap-2 text-sm text-gold-800">
                <Shuffle className="w-4 h-4 shrink-0" />
                <span>
                  Pilih target tukar untuk <strong>{swapSource.name}</strong> ({shifts.find(s => s.id === swapSource.shiftId)?.name})
                </span>
              </div>
            )}

            <div className="flex flex-wrap gap-2">
              {shifts.map(s => (
                <Button 
                  key={s.id} 
                  variant={activeShiftId === s.id ? 'gold' : 'outline'} 
                  size="sm" 
                  className={`rounded-full text-xs ${swapSource && s.id !== swapSource.shiftId ? 'ring-2 ring-gold-300' : ''}`}
                  onClick={() => {
                    fetchShiftMembers(s.id);
                    if (swapSource && s.id === swapSource.shiftId) setSwapSource(null);
                  }}
                >
                  {s.name}
                  {swapSource && s.id !== swapSource.shiftId && ' ⇐ Pilih Target'}
                </Button>
              ))}
              {shifts.length === 0 && (
                <p className="text-xs text-neutral-400">Belum ada shift yang tersedia.</p>
              )}
            </div>
            {activeShiftId && (
              <div className="mt-4">
                <h4 className="text-sm font-semibold text-neutral-800 mb-3 border-b pb-2">
                  {shifts.find(s => s.id === activeShiftId)?.name}
                </h4>
                {isLoadingShiftMembers ? (
                  <div className="py-4 text-center">
                    <Loader2 className="w-5 h-5 animate-spin mx-auto text-neutral-400" />
                  </div>
                ) : shiftMembers.length > 0 ? (
                  <ul className="space-y-2">
                    {shiftMembers.map(m => {
                      const isSourceMember = swapSource?.id === m.id;
                      const isTargetMode = isAdmin && swapSource && activeShiftId !== swapSource.shiftId;
                      return (
                        <li key={m.id} className={`flex items-center gap-2 text-sm text-neutral-600 ${isTargetMode ? 'hover:bg-gold-50 rounded-lg px-2 -mx-2 transition-colors' : ''} ${isSourceMember ? 'bg-gold-50 rounded-lg px-2 -mx-2' : ''}`}>
                          <span className="w-1.5 h-1.5 rounded-full bg-gold-400 shrink-0"></span>
                          <span className="font-medium text-neutral-800 flex-1">
                            {m.name}
                            {isSourceMember && (
                              <span className="ml-2 text-[10px] text-gold-600 font-semibold">(Sumber Swap)</span>
                            )}
                          </span>
                          <span className="text-neutral-400 text-xs">{m.divisi}</span>

                          {/* Tombol swap untuk admin */}
                          {isAdmin && !swapSource && (
                            <button
                              onClick={() => handleSwapSourceSelect(m)}
                              className="ml-2 p-1 text-neutral-300 hover:text-gold-500 hover:bg-gold-50 rounded transition-colors"
                              title="Tukar shift"
                            >
                              <Shuffle className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {isTargetMode && !isSourceMember && (
                            <button
                              onClick={() => handleSwapTargetSelect(m)}
                              disabled={isSwapping}
                              className="ml-2 text-[11px] font-semibold px-2.5 py-1 rounded-lg bg-gold-100 text-gold-700 hover:bg-gold-200 transition-colors disabled:opacity-50"
                            >
                              {isSwapping ? '...' : 'Pilih'}
                            </button>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <p className="text-xs text-neutral-400 italic">
                    {swapSource && activeShiftId !== swapSource.shiftId
                      ? 'Tidak ada anggota di shift ini untuk dijadikan target tukar.'
                      : 'Tidak ada anggota di shift ini.'}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Modal Konfirmasi Swap */}
        <ConfirmModal
          isOpen={swapTarget !== null}
          title="Konfirmasi Tukar Shift"
          description={
            swapSource && swapTarget
              ? `Tukar posisi ${swapSource.name} (${shifts.find(s => s.id === swapSource.shiftId)?.name}) ↔ ${swapTarget.name} (${shifts.find(s => s.id === activeShiftId)?.name ?? 'Tanpa Shift'})?`
              : ''
          }
          onCancel={() => setSwapTarget(null)}
          onConfirm={executeSwap}
        />
      </div>
    </AppLayout>
  );
}
