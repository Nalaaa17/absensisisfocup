import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { LogIn } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import OneSignal from 'react-onesignal';

export default function Login() {
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const loginStore = useAuthStore((state) => state.login);
  const user = useAuthStore((state) => state.user);

  useEffect(() => {
    if (user) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  const getDeviceId = () => {
    let deviceId = localStorage.getItem('device_id');
    if (!deviceId) {
      deviceId = crypto.randomUUID();
      localStorage.setItem('device_id', deviceId);
    }
    return deviceId;
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !password) {
      toast.error('Harap isi nama dan password Anda.');
      return;
    }
    
    setIsLoading(true);
    
    try {
      const trimmedName = name.trim();
      const { data: pwValid, error: pwErr } = await supabase.rpc('verify_password', {
        p_name: trimmedName,
        p_password: password
      });

      if (pwErr || !pwValid) {
        toast.error('Nama atau Password salah!');
        setIsLoading(false);
        return;
      }

      const deviceId = getDeviceId();
      const { data, error } = await supabase.rpc('login_user', { p_name: trimmedName, p_device_id: deviceId });
        
      if (error) {
        if (error.message.includes('DEVICE_LOCKED')) {
          toast.error('Gagal masuk: Anda mencoba masuk dari perangkat baru. Menunggu persetujuan Admin.');
        } else {
          toast.error(`Error: ${error.message}`);
        }
        setIsLoading(false);
        return;
      }
      
      if (!data || data.length === 0) {
        toast.error('Pengguna tidak ditemukan.');
        setIsLoading(false);
        return;
      }
      
      const userData = data[0];
      
      if (!userData.is_active) {
        toast.error('Akun Anda dinonaktifkan.');
        setIsLoading(false);
        return;
      }

      loginStore({
        id: userData.id,
        name: userData.name,
        divisi: userData.divisi,
        role: userData.role,
      });
      
      try {
        if (import.meta.env.VITE_ONESIGNAL_APP_ID) {
          await OneSignal.login(userData.id);
          OneSignal.User.addTags({ role: userData.role });
          await OneSignal.Slidedown.promptPush();
        }
      } catch (err) {
        console.error('Failed to register with OneSignal', err);
      }
      
      toast.success('Login berhasil!');
      navigate('/dashboard');
    } catch (err: unknown) {
      toast.error('Gagal terhubung ke server.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8f9fa] flex items-center justify-center p-4">
      <Card className="w-full max-w-sm shadow-sm border-neutral-200/60 bg-white rounded-xl">
        <CardHeader className="text-center pb-4 pt-8">
          <img src="/logo.png" alt="SISFO CUP" className="w-24 h-24 mx-auto mb-4 object-contain" />
          <CardTitle className="text-xl font-bold text-neutral-800">
            SISFO CUP
          </CardTitle>
          <CardDescription className="text-neutral-500 text-xs mt-1">
            Sistem Absensi & Perizinan Kepanitiaan
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="name" className="text-neutral-500 text-xs font-medium">Nama Lengkap</Label>
              <Input 
                id="name" 
                placeholder="Masukkan nama" 
                className="h-10 text-sm"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-neutral-500 text-xs font-medium">Password</Label>
              <Input 
                id="password" 
                type="password" 
                placeholder="••••••••" 
                className="h-10 text-sm"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <Button 
              type="submit" 
              variant="gold"
              className="w-full h-10 rounded-lg text-sm"
              disabled={isLoading}
            >
              {isLoading ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Memproses...</span>
                </div>
              ) : (
                <div className="flex items-center justify-center gap-2">
                  <LogIn className="w-4 h-4" />
                  <span>Masuk Sistem</span>
                </div>
              )}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="justify-center pb-7 text-center">
          <p className="text-xs text-neutral-400">
            Belum punya akun? <span className="font-medium text-neutral-600">Hubungi Admin.</span>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
