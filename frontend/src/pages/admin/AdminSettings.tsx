import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Save, MapPin } from 'lucide-react';
import { Spinner } from '@/components/ui/Spinner';
import { toast } from 'sonner';
import { MapContainer, TileLayer, Marker, useMapEvents, Circle } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
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

interface LocationMarkerProps {
  position: [number, number] | null;
  setPosition: React.Dispatch<React.SetStateAction<[number, number] | null>>;
  radius: number;
}

// Fix leaflet icon
delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

function LocationMarker({ position, setPosition, radius }: LocationMarkerProps) {
  useMapEvents({
    click(e) {
      setPosition([e.latlng.lat, e.latlng.lng]);
    },
  });

  return position === null ? null : (
    <>
      <Marker position={position}></Marker>
      <CircleEl center={position} radius={radius} pathOptions={{ color: '#ca8a04', fillColor: '#facc15', fillOpacity: 0.15 }} />
    </>
  );
}

export default function AdminSettings() {
  const { user } = useAuthStore();
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  
  const [position, setPosition] = useState<[number, number] | null>([-6.200000, 106.816666]);
  const [radius, setRadius] = useState<number>(100);
  const [settingsId, setSettingsId] = useState<string | null>(null);

  useEffect(() => {
    fetchSettings();
  }, [user]);

  const fetchSettings = async () => {
    try {
      const { data: dataArr, error } = await supabase.rpc('get_settings');
      if (error) throw error;
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
    } catch (err: unknown) {
      if (err instanceof Error) {
        toast.error(`Gagal: ${err.message}`);
      } else {
        toast.error('Gagal menyimpan pengaturan');
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (isFetching) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <Spinner />
      </div>
    );
  }

  return (
    <PageLayout title="Pengaturan Absensi">
      <div className="card-attendance overflow-hidden">
        <div className="px-5 py-3.5 border-b border-neutral-100">
          <h3 className="text-xs font-semibold text-neutral-500 uppercase tracking-wider flex items-center gap-2">
            <MapPin className="w-3.5 h-3.5" />
            Lokasi & Radius (Geofence)
          </h3>
          <p className="text-xs text-neutral-400 mt-0.5">
            Klik peta untuk menentukan titik pusat, lalu atur radius.
          </p>
        </div>
        <div className="p-5 space-y-5">
          <div className="h-[400px] w-full rounded-xl overflow-hidden border border-neutral-200 relative bg-neutral-50 z-0">
            {position && (
              <MapContainerEl center={position} zoom={15} scrollWheelZoom={true} className="h-full w-full">
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                <LocationMarker position={position} setPosition={setPosition} radius={radius} />
              </MapContainerEl>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-neutral-600 font-semibold text-xs uppercase tracking-wider">Koordinat (Lat, Lng)</Label>
              <div className="flex gap-2">
                <Input readOnly value={position ? position[0].toFixed(6) : ''} className="bg-neutral-50 rounded-lg font-mono text-xs" />
                <Input readOnly value={position ? position[1].toFixed(6) : ''} className="bg-neutral-50 rounded-lg font-mono text-xs" />
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
              />
            </div>
          </div>

          <Button 
            variant="gold"
            className="w-full rounded-lg h-12 text-base" 
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
    </PageLayout>
  );
}
