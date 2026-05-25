import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Lock, Save, Eye, EyeOff } from 'lucide-react';
import { PageLayout } from '@/components/layout/PageLayout';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';

export default function UbahPassword() {
  const { user } = useAuthStore();
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showOld, setShowOld] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const resetForm = () => {
    setOldPassword('');
    setNewPassword('');
    setConfirmPassword('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!oldPassword || !newPassword || !confirmPassword) {
      toast.error('Harap isi semua kolom');
      return;
    }

    if (newPassword.length < 6) {
      toast.error('Password baru minimal 6 karakter');
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error('Konfirmasi password baru tidak cocok');
      return;
    }

    if (oldPassword === newPassword) {
      toast.error('Password baru harus berbeda dari password lama');
      return;
    }

    if (!user) {
      toast.error('Sesi tidak ditemukan. Silakan login ulang.');
      return;
    }

    setIsLoading(true);

    try {
      const { error } = await supabase.rpc('change_password', {
        p_user_id: user.id,
        p_old_password: oldPassword,
        p_new_password: newPassword,
      });

      if (error) {
        toast.error(error.message);
        return;
      }

      toast.success('Password berhasil diubah!');
      resetForm();
    } catch {
      toast.error('Gagal terhubung ke server.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <PageLayout title="Ganti Password">
      <div className="max-w-md mx-auto">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="card-attendance overflow-hidden">
            <div className="px-5 py-3.5 border-b border-neutral-100">
              <h3 className="text-xs font-semibold text-neutral-500 uppercase tracking-wider flex items-center gap-2">
                <Lock className="w-3.5 h-3.5" />
                Keamanan Akun
              </h3>
            </div>
            <div className="p-5 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="old" className="text-neutral-600 font-semibold text-xs uppercase tracking-wider">
                  Password Saat Ini
                </Label>
                <div className="relative">
                  <Input
                    id="old"
                    type={showOld ? 'text' : 'password'}
                    value={oldPassword}
                    onChange={(e) => setOldPassword(e.target.value)}
                    placeholder="Masukkan password saat ini"
                    className="h-11 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowOld(!showOld)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 transition-colors"
                  >
                    {showOld ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="new" className="text-neutral-600 font-semibold text-xs uppercase tracking-wider">
                  Password Baru
                </Label>
                <div className="relative">
                  <Input
                    id="new"
                    type={showNew ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Minimal 6 karakter"
                    className="h-11 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNew(!showNew)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 transition-colors"
                  >
                    {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirm" className="text-neutral-600 font-semibold text-xs uppercase tracking-wider">
                  Konfirmasi Password Baru
                </Label>
                <Input
                  id="confirm"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Ketik ulang password baru"
                  className="h-11"
                />
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
            {isLoading ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Memproses...
              </div>
            ) : (
              <span className="flex items-center">
                <Save className="mr-2 w-5 h-5" />
                Simpan Password
              </span>
            )}
          </Button>
        </form>
      </div>
    </PageLayout>
  );
}
