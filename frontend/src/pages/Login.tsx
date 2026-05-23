import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { LogIn, Trophy } from 'lucide-react';
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
      const deviceId = getDeviceId();
      const { data, error } = await supabase.rpc('login_user', { p_name: name, p_device_id: deviceId });
        
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
      
      if (userData.password_hash !== password) {
        toast.error('Password salah!');
        setIsLoading(false);
        return;
      }
      
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
    } catch (err: any) {
      toast.error('Gagal terhubung ke server.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-white via-neutral-50 to-gold-50/50 p-4 relative overflow-hidden">
      {/* Decorative elements */}
      <div className="absolute top-[-15%] left-[-10%] w-[500px] h-[500px] bg-gold-200/20 rounded-full blur-3xl"></div>
      <div className="absolute bottom-[-20%] right-[-10%] w-[400px] h-[400px] bg-gold-300/15 rounded-full blur-3xl"></div>
      <div className="absolute top-[30%] right-[10%] w-32 h-32 border-2 border-gold-200/30 rounded-full"></div>
      <div className="absolute bottom-[20%] left-[15%] w-20 h-20 border border-gold-300/20 rounded-2xl rotate-45"></div>

      <Card className="w-full max-w-md shadow-2xl shadow-gold-200/20 border-neutral-100 bg-white/90 backdrop-blur-xl relative z-10 rounded-3xl">
        <CardHeader className="space-y-4 text-center pb-6 pt-8">
          <div className="w-16 h-16 gold-gradient rounded-2xl flex items-center justify-center mx-auto shadow-lg shadow-gold-300/30 transform -rotate-3 hover:rotate-0 transition-transform duration-300">
            <Trophy className="text-white w-9 h-9" />
          </div>
          <CardTitle className="text-3xl font-bold tracking-tight gold-gradient-text">
            SISFO CUP
          </CardTitle>
          <CardDescription className="text-neutral-400 font-medium text-sm">
            Sistem Absensi & Perizinan Kepanitiaan
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-neutral-600 font-semibold text-xs uppercase tracking-wider">Nama Lengkap</Label>
              <Input 
                id="name" 
                placeholder="Misal: Budi Santoso" 
                className="input-elegant h-12 text-sm"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-neutral-600 font-semibold text-xs uppercase tracking-wider">Password</Label>
                <a href="#" className="text-[11px] text-gold-600 font-semibold hover:text-gold-800 transition-colors">Lupa Password?</a>
              </div>
              <Input 
                id="password" 
                type="password" 
                placeholder="••••••••" 
                className="input-elegant h-12 text-sm"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <Button 
              type="submit" 
              className="w-full h-12 rounded-xl btn-gold text-base"
              disabled={isLoading}
            >
              {isLoading ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Memproses...</span>
                </div>
              ) : (
                <div className="flex items-center justify-center gap-2">
                  <LogIn className="w-5 h-5" />
                  <span>Masuk Sistem</span>
                </div>
              )}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="justify-center pt-2 pb-7">
          <p className="text-xs text-neutral-400">
            Belum punya akun? Hubungi Admin.
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
