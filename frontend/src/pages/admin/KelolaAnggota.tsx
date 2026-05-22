import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Users, Snowflake, Search } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';

interface Member {
  id: string;
  name: string;
  divisi: string;
  role: string;
  frozen_until: string | null;
  pending_device_id: string | null;
}

export default function KelolaAnggota() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [members, setMembers] = useState<Member[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [freezeDays, setFreezeDays] = useState(1);
  const [isFreezing, setIsFreezing] = useState(false);

  useEffect(() => {
    if (!user || (user.role !== 'admin' && user.role !== 'superadmin')) {
      navigate('/dashboard');
      return;
    }
    fetchMembers();
  }, [user]);

  const fetchMembers = async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const { data, error } = await supabase.rpc('get_members', { p_admin_id: user.id });
      if (error) throw error;
      if (data) setMembers(data);
    } catch (err: any) {
      toast.error(`Gagal memuat data: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFreeze = async () => {
    if (!selectedMember || !user) return;
    setIsFreezing(true);
    try {
      const { error } = await supabase.rpc('freeze_user', {
        p_admin_id: user.id,
        p_target_id: selectedMember.id,
        p_days: freezeDays
      });
      if (error) throw error;
      toast.success(`Berhasil membekukan ${selectedMember.name}`);
      setSelectedMember(null);
      fetchMembers();
    } catch (err: any) {
      toast.error(`Gagal: ${err.message}`);
    } finally {
      setIsFreezing(false);
    }
  };

  const handleUnfreeze = async (id: string, name: string) => {
    if (!user) return;
    try {
      const { error } = await supabase.rpc('unfreeze_user', {
        p_admin_id: user.id,
        p_target_id: id
      });
      if (error) throw error;
      toast.success(`Pembekuan dicabut untuk ${name}`);
      fetchMembers();
    } catch (err: any) {
      toast.error(`Gagal: ${err.message}`);
    }
  };

  const handleApproveDevice = async (id: string, name: string) => {
    if (!user) return;
    try {
      const { error } = await supabase.rpc('approve_device', {
        p_admin_id: user.id,
        p_target_id: id
      });
      if (error) throw error;
      toast.success(`Perangkat baru disetujui untuk ${name}`);
      fetchMembers();
    } catch (err: any) {
      toast.error(`Gagal: ${err.message}`);
    }
  };

  const filteredMembers = members.filter(m => m.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="page-body pb-12">
      <header className="page-header p-4">
        <div className="max-w-5xl mx-auto flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard')} className="shrink-0 rounded-full hover:bg-gold-50">
            <ArrowLeft className="w-5 h-5 text-neutral-500" />
          </Button>
          <h1 className="font-bold text-lg text-neutral-800">Kelola Anggota</h1>
        </div>
      </header>

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 py-6 space-y-5">
        
        {selectedMember && (
          <div className="card-elegant border-red-200 bg-red-50/30 p-6 animate-in fade-in slide-in-from-top-4">
            <div className="flex items-center gap-2 mb-4">
              <Snowflake className="w-5 h-5 text-red-400" />
              <h3 className="font-bold text-red-700 text-sm">Bekukan Absensi</h3>
            </div>
            <p className="text-sm text-red-600 mb-4">
              Target: <strong>{selectedMember.name} ({selectedMember.divisi})</strong>
            </p>
            <div className="flex items-end gap-4 mb-4">
              <div className="flex-1 space-y-1">
                <Label className="text-red-700 text-xs uppercase tracking-wider font-semibold">Durasi (Hari)</Label>
                <Input 
                  type="number" min="1" max="365" 
                  value={freezeDays} 
                  onChange={(e) => setFreezeDays(Number(e.target.value))} 
                  className="bg-white border-red-200 rounded-xl"
                />
              </div>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" className="border-red-200 text-red-600 hover:bg-red-100 rounded-xl" onClick={() => setSelectedMember(null)}>Batal</Button>
              <Button className="bg-red-500 hover:bg-red-600 text-white rounded-xl" onClick={handleFreeze} disabled={isFreezing}>
                {isFreezing ? 'Memproses...' : 'Terapkan'}
              </Button>
            </div>
          </div>
        )}

        <div className="card-elegant overflow-hidden">
          <div className="px-6 py-4 border-b border-neutral-100 bg-gradient-to-r from-white to-gold-50/30">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h3 className="text-sm font-bold text-neutral-700 uppercase tracking-wider flex items-center gap-2">
                  <Users className="w-4 h-4 text-gold-500" />
                  Daftar Anggota
                </h3>
                <p className="text-xs text-neutral-400 mt-1">Kelola status absensi seluruh panitia.</p>
              </div>
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-300" />
                <Input 
                  placeholder="Cari nama..." 
                  className="pl-9 w-full md:w-56 input-elegant"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>
          </div>
          <div>
            {isLoading ? (
              <div className="text-center py-12 text-neutral-400">
                <div className="w-6 h-6 border-2 border-gold-300 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                Memuat data...
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="table-header-gold">
                    <tr>
                      <th className="px-5 py-3">Nama</th>
                      <th className="px-5 py-3">Divisi</th>
                      <th className="px-5 py-3">Status</th>
                      <th className="px-5 py-3 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100 bg-white">
                    {filteredMembers.map((m) => {
                      const isFrozen = m.frozen_until && new Date(m.frozen_until) > new Date();
                      return (
                        <tr key={m.id} className="hover:bg-gold-50/20 transition-colors">
                          <td className="px-5 py-3.5 font-medium text-neutral-800">
                            {m.name}
                            {m.pending_device_id && (
                              <div className="text-[10px] bg-gold-100 text-gold-700 px-2 py-0.5 mt-1 rounded-full inline-block font-semibold">
                                Minta Ganti HP
                              </div>
                            )}
                          </td>
                          <td className="px-5 py-3.5 text-neutral-500">{m.divisi}</td>
                          <td className="px-5 py-3.5">
                            {isFrozen ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-red-50 text-red-600 border border-red-200">
                                <Snowflake className="w-3 h-3" /> Dibekukan
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-600 border border-emerald-200">
                                Aktif
                              </span>
                            )}
                          </td>
                          <td className="px-5 py-3.5 text-right">
                            <div className="flex justify-end gap-2">
                              {m.pending_device_id && (
                                <Button variant="outline" size="sm" className="badge-gold hover:bg-gold-100 rounded-lg text-xs" onClick={() => handleApproveDevice(m.id, m.name)}>
                                  Izinkan HP
                                </Button>
                              )}
                              {isFrozen ? (
                                <Button variant="outline" size="sm" className="text-emerald-600 border-emerald-200 hover:bg-emerald-50 rounded-lg text-xs" onClick={() => handleUnfreeze(m.id, m.name)}>
                                  Cabut Beku
                                </Button>
                              ) : (
                                <Button variant="outline" size="sm" className="text-red-500 border-red-200 hover:bg-red-50 rounded-lg text-xs" onClick={() => setSelectedMember(m)}>
                                  Bekukan
                                </Button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                    {filteredMembers.length === 0 && (
                      <tr><td colSpan={4} className="px-5 py-12 text-center text-neutral-400">Anggota tidak ditemukan.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
