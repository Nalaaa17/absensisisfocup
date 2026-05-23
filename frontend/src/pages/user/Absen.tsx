import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft, MapPin, Clock, AlertTriangle, Snowflake } from 'lucide-react';
import { toast } from 'sonner';
import { MapContainer, TileLayer, Marker, Popup, Circle } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { useAuthStore } from '@/stores/authStore';
import { supabase } from '@/lib/supabase';

const MapContainerEl = MapContainer as any;
const CircleEl = Circle as any;

// Fix leaflet icon issue in react
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

export default function Absen() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [position, setPosition] = useState<[number, number] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isDataLoading, setIsDataLoading] = useState(true);

  // Settings
  const [geofenceCenter, setGeofenceCenter] = useState<[number, number] | null>(null);
  const [geofenceRadius, setGeofenceRadius] = useState<number>(100);
  
  // Validation
  const [distance, setDistance] = useState<number | null>(null);
  const [frozenUntil, setFrozenUntil] = useState<Date | null>(null);

  useEffect(() => {
    if (!user) {
      navigate('/');
      return;
    }

    const loadData = async () => {
      try {
        const { data: userDataArr, error: userErr } = await supabase.rpc('login_user', { p_name: user.name });

        if (userErr) throw userErr;
        const userData = userDataArr && userDataArr.length > 0 ? userDataArr[0] : null;
        if (userData?.frozen_until) {
          setFrozenUntil(new Date(userData.frozen_until));
        }

        const { data: setObjArr, error: setErr } = await supabase.rpc('get_settings');

        const setObj = setObjArr && setObjArr.length > 0 ? setObjArr[0] : null;
        if (!setErr && setObj) {
          if (setObj.geofence_lat && setObj.geofence_lng) {
            setGeofenceCenter([setObj.geofence_lat, setObj.geofence_lng]);
          }
          if (setObj.geofence_radius) {
            setGeofenceRadius(setObj.geofence_radius);
          }
        }
      } catch (err) {
        console.error(err);
      } finally {
        setIsDataLoading(false);
      }
    };

    loadData();

    let watchId: number;
    if ('geolocation' in navigator) {
      watchId = navigator.geolocation.watchPosition(
        (pos) => {
          setPosition([pos.coords.latitude, pos.coords.longitude]);
          setError(null);
        },
        (err) => {
          setError(err.message);
          if (err.code !== 3) { // code 3 is timeout, keep trying without annoying user
            toast.error(`Gagal mendapatkan lokasi: ${err.message}`);
          }
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    } else {
      setError('Geolokasi tidak didukung oleh browser Anda.');
    }

    return () => {
      if (watchId) navigator.geolocation.clearWatch(watchId);
    };
  }, [user, navigate]);

  useEffect(() => {
    if (position && geofenceCenter) {
      const userL = L.latLng(position[0], position[1]);
      const centerL = L.latLng(geofenceCenter[0], geofenceCenter[1]);
      const dist = Math.round(userL.distanceTo(centerL));
      setDistance(dist);
    }
  }, [position, geofenceCenter]);

  const isFrozen = frozenUntil && frozenUntil > new Date();
  const isOutOfRange = distance !== null && distance > geofenceRadius;

  const handleCheckIn = async () => {
    if (!position || !geofenceCenter) {
      toast.error('Lokasi belum ditemukan, harap tunggu.');
      return;
    }
    
    if (!user) return;
    
    setIsLoading(true);
    
    try {
      const today = new Date().toISOString().split('T')[0];
      
      const { error } = await supabase.rpc('record_attendance', {
        p_user_id: user.id,
        p_name: user.name,
        p_divisi: user.divisi,
        p_date: today,
        p_lat: position[0],
        p_lng: position[1]
      });
        
      if (error) {
        if (error.code === '23505' || error.code === '23503') {
          toast.error('Anda sudah absen hari ini.');
        } else {
          toast.error(`Gagal absen: ${error.message}`);
        }
        setIsLoading(false);
        return;
      }
      
      toast.success('Berhasil Absen Masuk!');
      navigate('/dashboard');
    } catch (err: any) {
      toast.error('Terjadi kesalahan koneksi.');
    } finally {
      setIsLoading(false);
    }
  };

  if (isDataLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-gold-400 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-neutral-400 text-sm">Memuat data...</p>
        </div>
      </div>
    );
  }

  if (isFrozen) {
    return (
      <div className="page-body items-center justify-center p-4">
        <div className="card-elegant w-full max-w-md p-8 text-center">
          <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <Snowflake className="w-8 h-8 text-red-400" />
          </div>
          <h2 className="text-xl font-bold text-neutral-800 mb-2">Akun Dibekukan</h2>
          <p className="text-neutral-500 text-sm mb-1">Akses absensi Anda dibekukan hingga:</p>
          <p className="text-red-500 font-bold text-lg mb-4">{frozenUntil?.toLocaleString()}</p>
          <p className="text-xs text-neutral-400 mb-6">Hubungi Admin jika ini adalah kesalahan.</p>
          <Button className="w-full btn-gold-outline rounded-xl" variant="outline" onClick={() => navigate('/dashboard')}>
            Kembali ke Dashboard
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="page-body pb-12">
      <header className="page-header p-4">
        <div className="max-w-3xl mx-auto flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard')} className="shrink-0 rounded-full hover:bg-gold-50">
            <ArrowLeft className="w-5 h-5 text-neutral-500" />
          </Button>
          <h1 className="font-bold text-lg text-neutral-800">Absensi Harian</h1>
        </div>
      </header>

      <main className="flex-1 max-w-3xl w-full mx-auto px-4 py-6 space-y-6">
        <div className="card-elegant overflow-hidden">
          <div className="bg-gradient-to-r from-gold-50 to-white px-6 py-4 border-b border-gold-100 flex items-center justify-between">
            <div className="flex items-center gap-2 text-gold-700">
              <Clock className="w-4 h-4" />
              <span className="font-medium text-xs uppercase tracking-wider">Waktu Server</span>
            </div>
            <div className="text-xl font-bold text-neutral-800 tracking-tight">
              {new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} <span className="text-xs font-medium text-gold-600">WIB</span>
            </div>
          </div>
          <div className="p-6">
            <div className="mb-4">
              <h2 className="text-base font-bold text-neutral-800 mb-1">Lokasi Anda</h2>
              <p className="text-xs text-neutral-400">
                Pastikan berada dalam radius {geofenceRadius}m dari pusat acara.
              </p>
            </div>
            
            <div className="h-[300px] w-full rounded-2xl overflow-hidden border border-neutral-200 relative bg-neutral-50">
              {position && geofenceCenter ? (
                <MapContainerEl center={geofenceCenter} zoom={16} scrollWheelZoom={false} className="h-full w-full">
                  <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                  <CircleEl center={geofenceCenter} radius={geofenceRadius} pathOptions={{ color: '#ca8a04', fillColor: '#facc15', fillOpacity: 0.15 }} />
                  <Marker position={position}>
                    <Popup>Posisi Anda</Popup>
                  </Marker>
                </MapContainerEl>
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-neutral-400">
                  {error ? (
                    <p className="text-red-400 text-sm text-center px-4">{error}</p>
                  ) : (
                    <>
                      <div className="w-8 h-8 border-2 border-gold-400 border-t-transparent rounded-full animate-spin mb-3"></div>
                      <p className="text-xs font-medium">Mencari lokasi GPS...</p>
                    </>
                  )}
                </div>
              )}
            </div>

            {distance !== null && (
              <div className={`mt-5 flex items-start gap-3 p-4 rounded-xl border ${isOutOfRange ? 'bg-red-50/50 border-red-200' : 'bg-emerald-50/50 border-emerald-200'}`}>
                {isOutOfRange ? (
                  <AlertTriangle className="w-5 h-5 text-red-400 mt-0.5 shrink-0" />
                ) : (
                  <MapPin className="w-5 h-5 text-emerald-500 mt-0.5 shrink-0" />
                )}
                <div>
                  <p className={`text-sm font-bold ${isOutOfRange ? 'text-red-700' : 'text-emerald-700'}`}>
                    Validasi Lokasi ({distance}m)
                  </p>
                  <p className={`text-xs mt-0.5 ${isOutOfRange ? 'text-red-500' : 'text-emerald-500'}`}>
                    {isOutOfRange 
                      ? `Di LUAR radius (Maks ${geofenceRadius}m). Dekati lokasi acara.`
                      : 'Posisi Anda VALID untuk absensi.'}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        <Button 
          size="lg" 
          className={`w-full h-14 text-base font-bold rounded-xl shadow-xl transition-all active:scale-[0.98] ${
            isOutOfRange || !position 
            ? 'bg-neutral-200 text-neutral-400 cursor-not-allowed shadow-none'
            : 'btn-gold'
          }`}
          onClick={handleCheckIn}
          disabled={!position || isLoading || isOutOfRange}
        >
          {isLoading ? 'Memproses...' : 'Absen Masuk Sekarang'}
        </Button>
      </main>
    </div>
  );
}
