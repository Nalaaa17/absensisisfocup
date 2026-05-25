import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/Spinner';
import { MapPin, Clock, AlertTriangle, Snowflake } from 'lucide-react';
import { toast } from 'sonner';
import { MapContainer, TileLayer, Marker, Popup, Circle } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { useAuthStore } from '@/stores/authStore';
import { supabase } from '@/lib/supabase';
import { PageLayout } from '@/components/layout/PageLayout';

const MapContainerEl = MapContainer as unknown as React.FC<{
  center: [number, number];
  zoom: number;
  scrollWheelZoom: boolean;
  className?: string;
  children?: React.ReactNode;
}>;

const CircleEl = Circle as unknown as React.FC<{
  center: [number, number];
  radius: number;
  pathOptions?: Record<string, any>;
}>;

import iconRetina from 'leaflet/dist/images/marker-icon-2x.png';
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

// Fix for default marker icon in react-leaflet
delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl;

L.Icon.Default.mergeOptions({
  iconRetinaUrl: iconRetina,
  iconUrl: icon,
  shadowUrl: iconShadow,
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
  const [serverDate, setServerDate] = useState<string>('');

  useEffect(() => {
    const loadData = async () => {
      try {
        const { data: serverDateArr } = await supabase.rpc('get_server_date');
        if (serverDateArr && serverDateArr.length > 0) {
          setServerDate(serverDateArr[0].today);
        }

        const { data: userDataArr, error: userErr } = await supabase.rpc('get_user_status', { 
          p_user_id: user.id
        });

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
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 5000 }
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
    if (!position) {
      toast.error('Lokasi Anda belum ditemukan, harap tunggu.');
      return;
    }
    if (!geofenceCenter) {
      toast.error('Admin belum mengatur lokasi presensi.');
      return;
    }
    
    if (!user) return;
    
    setIsLoading(true);
    
    try {
      const today = serverDate || new Date().toISOString().split('T')[0];
      
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
    } catch (err: unknown) {
      toast.error('Terjadi kesalahan koneksi.');
    } finally {
      setIsLoading(false);
    }
  };

  if (isDataLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <Spinner label="Memuat data..." />
      </div>
    );
  }

  if (isFrozen) {
    return (
      <div className="page-body items-center justify-center p-4">
        <div className="card-attendance w-full max-w-md p-8 text-center">
          <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <Snowflake className="w-8 h-8 text-red-400" />
          </div>
          <h2 className="text-xl font-bold text-neutral-800 mb-2">Akun Dibekukan</h2>
          <p className="text-neutral-500 text-sm mb-1">Akses absensi Anda dibekukan hingga:</p>
          <p className="text-red-500 font-bold text-lg mb-4">{frozenUntil?.toLocaleString()}</p>
          <p className="text-xs text-neutral-400 mb-6">Hubungi Admin jika ini adalah kesalahan.</p>
          <Button variant="gold-outline" className="w-full rounded-lg" onClick={() => navigate('/dashboard')}>
            Kembali ke Dashboard
          </Button>
        </div>
      </div>
    );
  }

  return (
    <PageLayout title="Absensi Harian">
      <div className="max-w-3xl w-full mx-auto space-y-6">
        <div className="card-attendance overflow-hidden">
          <div className="px-5 py-3.5 border-b border-neutral-100 flex items-center justify-between">
            <div className="flex items-center gap-2 text-neutral-500">
              <Clock className="w-4 h-4" />
              <span className="font-medium text-xs uppercase tracking-wider">Waktu Server</span>
            </div>
            <div className="text-lg font-bold text-neutral-800 tabular-nums tracking-tight">
              {new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} <span className="text-xs font-medium text-gold-500">WIB</span>
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
              {position ? (
                <MapContainerEl center={position} zoom={16} scrollWheelZoom={false} className="h-full w-full">
                  <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                  {geofenceCenter && (
                    <CircleEl center={geofenceCenter} radius={geofenceRadius} pathOptions={{ color: '#7A1C1C', fillColor: '#e97878', fillOpacity: 0.15 }} />
                  )}
                  <Marker position={position}>
                    <Popup>Posisi Anda</Popup>
                  </Marker>
                </MapContainerEl>
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-neutral-400">
                    {error ? (
                      <p className="text-red-400 text-sm text-center px-4">{error} (Sedang mencoba ulang...)</p>
                    ) : (
                      <Spinner label="Mencari lokasi GPS..." />
                    )}
                </div>
              )}
            </div>

            {!geofenceCenter && position && (
              <div className="mt-5 flex items-start gap-3 p-4 rounded-xl border bg-gold-50/50 border-gold-200">
                <AlertTriangle className="w-5 h-5 text-gold-500 mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-bold text-gold-700">Pusat Lokasi Belum Diatur</p>
                  <p className="text-xs mt-0.5 text-gold-600">Admin belum mengatur lokasi presensi. Silakan hubungi Admin.</p>
                </div>
              </div>
            )}

            {distance !== null && geofenceCenter && (
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
          variant="gold"
          className="w-full h-14 text-base font-bold rounded-xl shadow-lg"
          onClick={handleCheckIn}
          disabled={!position || isLoading || isOutOfRange || !geofenceCenter}
        >
          {isLoading ? 'Memproses...' : 'Absen Masuk Sekarang'}
        </Button>
      </div>
    </PageLayout>
  );
}
