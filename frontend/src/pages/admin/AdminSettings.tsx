import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Save, MapPin } from 'lucide-react';
import { toast } from 'sonner';
import { MapContainer, TileLayer, Marker, useMapEvents, Circle } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';

// Fix leaflet icon
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

function LocationMarker({ position, setPosition, radius }: any) {
  useMapEvents({
    click(e) {
      setPosition([e.latlng.lat, e.latlng.lng]);
    },
  });

  return position === null ? null : (
    <>
      <Marker position={position}></Marker>
      <Circle center={position} radius={radius} pathOptions={{ color: '#ca8a04', fillColor: '#facc15', fillOpacity: 0.15 }} />
    </>
  );
}

export default function AdminSettings() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  
  const [position, setPosition] = useState<[number, number] | null>([-6.200000, 106.816666]);
  const [radius, setRadius] = useState<number>(100);
  const [settingsId, setSettingsId] = useState<string | null>(null);

  useEffect(() => {
    if (!user || (user.role !== 'admin' && user.role !== 'superadmin')) {
      navigate('/dashboard');
      return;
    }
    fetchSettings();
  }, [user]);

  const fetchSettings = async () => {
    try {
      const { data: dataArr, error } = await supabase.rpc('get_settings');
      const data = dataArr && dataArr.length > 0 ? dataArr[0] : null;  
      if (data) {
        setSettingsId(data.id);
        if (data.geofence_lat && data.geofence_lng) {
          setPosition([data.geofence_lat, data.geofence_lng]);
        }
        if (data.geofence_radius) {
          setRadius(data.geofence_radius);
        }
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsFetching(false);
    }
  };

  const handleSave = async () => {
    if (!position) {
      toast.error('Pilih lokasi di peta terlebih dahulu');
      return;
    }
    if (!user) return;
    
    setIsLoading(true);
    try {
      const { error } = await supabase.rpc('update_settings', {
        p_admin_id: user.id,
        p_settings_id: settingsId || null,
        p_lat: position[0],
        p_lng: position[1],
        p_radius: radius
      });
      if (error) throw error;
      toast.success('Pengaturan disimpan!');
    } catch (err: any) {
      toast.error(`Gagal: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  if (isFetching) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-gold-400 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-neutral-400 text-sm">Memuat pengaturan...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page-body pb-12">
      <header className="page-header p-4">
        <div className="max-w-4xl mx-auto flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard')} className="shrink-0 rounded-full hover:bg-gold-50">
            <ArrowLeft className="w-5 h-5 text-neutral-500" />
          </Button>
          <h1 className="font-bold text-lg text-neutral-800">Pengaturan Absensi</h1>
        </div>
      </header>

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-6 space-y-5">
        <div className="card-elegant overflow-hidden">
          <div className="px-6 py-4 border-b border-neutral-100 bg-gradient-to-r from-white to-gold-50/30">
            <h3 className="text-sm font-bold text-neutral-700 uppercase tracking-wider flex items-center gap-2">
              <MapPin className="w-4 h-4 text-gold-500" />
              Lokasi & Radius (Geofence)
            </h3>
            <p className="text-xs text-neutral-400 mt-1">
              Klik peta untuk menentukan titik pusat, lalu atur radius.
            </p>
          </div>
          <div className="p-6 space-y-5">
            <div className="h-[400px] w-full rounded-2xl overflow-hidden border border-neutral-200 relative bg-neutral-50 z-0">
              {position && (
                <MapContainer center={position} zoom={15} scrollWheelZoom={true} className="h-full w-full">
                  <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                  <LocationMarker position={position} setPosition={setPosition} radius={radius} />
                </MapContainer>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-neutral-600 font-semibold text-xs uppercase tracking-wider">Koordinat (Lat, Lng)</Label>
                <div className="flex gap-2">
                  <Input readOnly value={position ? position[0].toFixed(6) : ''} className="bg-neutral-50 rounded-xl font-mono text-xs" />
                  <Input readOnly value={position ? position[1].toFixed(6) : ''} className="bg-neutral-50 rounded-xl font-mono text-xs" />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="radius" className="text-neutral-600 font-semibold text-xs uppercase tracking-wider">Radius (Meter)</Label>
                <Input 
                  id="radius" 
                  type="number" 
                  min="10"
                  value={radius}
                  onChange={(e) => setRadius(Number(e.target.value))}
                  className="input-elegant"
                />
              </div>
            </div>

            <Button 
              className="w-full btn-gold rounded-xl h-12 text-base" 
              onClick={handleSave}
              disabled={isLoading}
            >
              {isLoading ? 'Menyimpan...' : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Simpan Pengaturan
                </>
              )}
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}
