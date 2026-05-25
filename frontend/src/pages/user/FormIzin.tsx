import React, { useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Camera, Upload, Image as ImageIcon, Send } from 'lucide-react';
import { PageLayout } from '@/components/layout/PageLayout';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { compressImage } from '@/lib/compressImage';
import { useAuthStore } from '@/stores/authStore';

export default function FormIzin() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);

  const [tujuan, setTujuan] = useState('');
  const [alasan, setAlasan] = useState('');
  const [estimasi, setEstimasi] = useState('');
  const [serverDate, setServerDate] = useState('');

  React.useEffect(() => {
    supabase.rpc('get_server_date').then(({ data }) => {
      if (data?.[0]) setServerDate(data[0].today);
    });
  }, []);

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
      setIsCameraActive(true);
    } catch (err) {
      toast.error('Gagal mengakses kamera. Periksa izin browser Anda.');
    }
  };

  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setIsCameraActive(false);
  }, [stream]);

  const capturePhoto = async () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
        const compressed = await compressImage(dataUrl);
        setPhotoUrl(compressed);
        stopCamera();
      }
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const compressed = await compressImage(file);
        setPhotoUrl(compressed);
      } catch {
        toast.error('Gagal membaca file foto');
      }
    }
  };

  const retakePhoto = () => {
    setPhotoUrl(null);
    startCamera();
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    
    if (!photoUrl) {
      toast.error('Harap ambil foto bukti terlebih dahulu!');
      return;
    }
    
    if (!user) {
      toast.error('Data pengguna tidak ditemukan. Silakan login kembali.');
      return;
    }

    if (!tujuan || !alasan || !estimasi) {
      toast.error('Harap lengkapi semua kolom formulir.');
      return;
    }

    setIsLoading(true);
    
    try {
      const today = serverDate || new Date().toISOString().split('T')[0];
      const estimatedDateTime = new Date(`${today}T${estimasi}:00`).toISOString();

      let finalPhotoUrl = photoUrl;

      // Upload to Supabase Storage if it's a data URL
      if (photoUrl.startsWith('data:')) {
        try {
          const res = await fetch(photoUrl);
          const blob = await res.blob();
          const fileExt = blob.type.split('/')[1] || 'jpg';
          const fileName = `${user.id}_${Date.now()}.${fileExt}`;
          
          const { error: uploadError } = await supabase.storage
            .from('proofs')
            .upload(fileName, blob, {
              contentType: blob.type,
            });
            
          if (uploadError) {
            throw new Error(`Gagal mengunggah foto: ${uploadError.message}`);
          }
          
          const { data: { publicUrl } } = supabase.storage
            .from('proofs')
            .getPublicUrl(fileName);
            
          finalPhotoUrl = publicUrl;
        } catch (uploadErr: unknown) {
          if (uploadErr instanceof Error) {
            throw new Error(`Gagal mengunggah foto: ${uploadErr.message}`);
          }
          throw new Error('Gagal mengunggah foto');
        }
      }

      const { error } = await supabase.rpc('request_permission', {
        p_user_id: user.id,
        p_name: user.name,
        p_divisi: user.divisi,
        p_date: today,
        p_destination: tujuan,
        p_reason: alasan,
        p_estimated_return: estimatedDateTime,
        p_photo_url: finalPhotoUrl
      });

      if (error) {
        if (error.code === '23505') {
          throw new Error('Anda sudah mengajukan izin hari ini.');
        }
        throw new Error(error.message);
      }

      toast.success('Berhasil!', {
        description: 'Pengajuan izin telah dikirim dan menunggu persetujuan.',
      });
      navigate('/dashboard');
    } catch (err: unknown) {
      if (err instanceof Error) {
        toast.error(`Gagal mengajukan izin: ${err.message}`);
      } else {
        toast.error('Terjadi kesalahan yang tidak diketahui.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  React.useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [stream]);

  return (
    <PageLayout title="Pengajuan Izin">
      <div className="max-w-xl mx-auto">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="card-attendance overflow-hidden">
            <div className="px-5 py-3.5 border-b border-neutral-100">
              <h3 className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">Formulir Detail</h3>
            </div>
            <div className="p-5 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="tujuan" className="text-neutral-600 font-semibold text-xs uppercase tracking-wider">Tujuan Izin</Label>
                <Input 
                  id="tujuan" 
                  value={tujuan}
                  onChange={(e) => setTujuan(e.target.value)}
                  placeholder="Misal: Indomaret terdekat" 
                  className="h-11" 
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="alasan" className="text-neutral-600 font-semibold text-xs uppercase tracking-wider">Alasan Keluar</Label>
                <textarea 
                  id="alasan" 
                  value={alasan}
                  onChange={(e) => setAlasan(e.target.value)}
                  className="flex min-h-[80px] w-full rounded-xl border border-neutral-200 bg-neutral-50/50 px-3 py-2 text-sm placeholder:text-neutral-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-400/30 focus-visible:border-gold-400 transition-all"
                  placeholder="Misal: Membeli konsumsi panitia"
                ></textarea>
              </div>
              <div className="space-y-2">
                <Label htmlFor="estimasi" className="text-neutral-600 font-semibold text-xs uppercase tracking-wider">Estimasi Kembali</Label>
                <Input 
                  id="estimasi" 
                  type="time" 
                  value={estimasi}
                  onChange={(e) => setEstimasi(e.target.value)}
                  className="h-11 w-full" 
                />
              </div>
            </div>
          </div>

          <div className="card-attendance overflow-hidden">
            <div className="px-5 py-3.5 border-b border-neutral-100">
              <h3 className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">Foto Bukti</h3>
            </div>
            <div className="p-6">
              <div className="bg-neutral-50 rounded-2xl overflow-hidden border-2 border-dashed border-neutral-200 relative min-h-[280px] flex flex-col items-center justify-center">
                
                {!isCameraActive && !photoUrl && (
                  <div className="text-center p-6 space-y-4">
                    <div className="w-14 h-14 bg-white rounded-full flex items-center justify-center mx-auto shadow-sm border border-neutral-100">
                      <ImageIcon className="w-7 h-7 text-neutral-300" />
                    </div>
                    <p className="text-xs text-neutral-400 max-w-[250px] mx-auto">
                      Ambil foto langsung atau unggah dari galeri.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-3 justify-center">
                      <Button type="button" variant="gold" onClick={startCamera} className="rounded-lg">
                        <Camera className="w-4 h-4 mr-2" /> Buka Kamera
                      </Button>
                      <div className="relative">
                        <Input 
                          type="file" 
                          accept="image/*" 
                          onChange={handleFileUpload} 
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        />
                        <Button type="button" variant="gold-outline" className="w-full rounded-lg">
                          <Upload className="w-4 h-4 mr-2" /> Dari Galeri
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

                {isCameraActive && (
                  <div className="absolute inset-0 bg-black flex flex-col">
                    <video 
                      ref={videoRef} 
                      autoPlay 
                      playsInline 
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute bottom-6 left-0 right-0 flex justify-center gap-4 px-4">
                      <Button type="button" variant="destructive" onClick={stopCamera} className="rounded-lg">Batal</Button>
                      <Button type="button" variant="gold" onClick={capturePhoto} className="rounded-lg px-8">Ambil Foto</Button>
                    </div>
                  </div>
                )}

                {photoUrl && !isCameraActive && (
                  <div className="absolute inset-0 bg-black flex flex-col">
                    <img src={photoUrl} alt="Bukti" className="w-full h-full object-contain" />
                    <div className="absolute bottom-6 left-0 right-0 flex justify-center px-4">
                      <Button type="button" onClick={retakePhoto} variant="secondary" className="shadow-lg rounded-xl">
                        <Camera className="w-4 h-4 mr-2" /> Foto Ulang
                      </Button>
                    </div>
                  </div>
                )}
                
                <canvas ref={canvasRef} className="hidden" />
              </div>
            </div>
          </div>

          <Button 
            type="submit" 
            size="lg" 
            variant="gold"
            className="w-full h-14 text-base font-bold rounded-xl"
            disabled={isLoading}
          >
            {isLoading ? 'Mengirim Data...' : (
              <span className="flex items-center">
                Ajukan Izin <Send className="ml-2 w-5 h-5" />
              </span>
            )}
          </Button>
        </form>
      </div>
    </PageLayout>
  );
}
