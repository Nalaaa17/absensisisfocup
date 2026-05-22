import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Clock, Plus, Trash2, Users, Search } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';

interface Shift {
  id: string;
  name: string;
  start_time: string;
  end_time: string;
}

interface Member {
  id: string;
  name: string;
  divisi: string;
  shift_id: string | null;
  shift_name: string | null;
}

export default function KelolaShift() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  const [newShiftName, setNewShiftName] = useState('');
  const [newStartTime, setNewStartTime] = useState('');
  const [newEndTime, setNewEndTime] = useState('');

  useEffect(() => {
    if (!user || (user.role !== 'admin' && user.role !== 'superadmin')) {
      navigate('/dashboard');
      return;
    }
    fetchData();
  }, [user]);

  const fetchData = async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const { data: shiftData, error: shiftErr } = await supabase.rpc('get_shifts', { p_admin_id: user.id });
      if (shiftErr) throw shiftErr;
      if (shiftData) setShifts(shiftData);

      const { data: memberData, error: memErr } = await supabase.rpc('get_members', { p_admin_id: user.id });
      if (memErr) throw memErr;
      if (memberData) setMembers(memberData);
    } catch (err: any) {
      toast.error(`Gagal memuat data: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateShift = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!newShiftName || !newStartTime || !newEndTime) {
      toast.error('Harap lengkapi semua kolom!');
      return;
    }
    try {
      const { error } = await supabase.rpc('create_shift', {
        p_admin_id: user.id,
        p_name: newShiftName,
        p_start_time: newStartTime,
        p_end_time: newEndTime
      });
      if (error) throw error;
      toast.success('Shift berhasil dibuat!');
      setNewShiftName('');
      setNewStartTime('');
      setNewEndTime('');
      fetchData();
    } catch (err: any) {
      toast.error(`Gagal: ${err.message}`);
    }
  };

  const handleDeleteShift = async (id: string) => {
    if (!user) return;
    if (!confirm('Hapus shift ini?')) return;
    try {
      const { error } = await supabase.rpc('delete_shift', { p_admin_id: user.id, p_shift_id: id });
      if (error) throw error;
      toast.success('Shift dihapus!');
      fetchData();
    } catch (err: any) {
      toast.error(`Gagal: ${err.message}`);
    }
  };

  const handleAssignShift = async (userId: string, shiftId: string) => {
    if (!user) return;
    try {
      const { error } = await supabase.rpc('assign_user_shift', {
        p_admin_id: user.id,
        p_target_user_id: userId,
        p_shift_id: shiftId === 'none' ? null : shiftId
      });
      if (error) throw error;
      toast.success('Shift diperbarui!');
      fetchData();
    } catch (err: any) {
      toast.error(`Gagal: ${err.message}`);
    }
  };

  const formatTime = (timeStr: string) => timeStr.substring(0, 5);

  const filteredMembers = members.filter(m => 
    m.name.toLowerCase().includes(search.toLowerCase()) || 
    m.divisi.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="page-body pb-12">
      <header className="page-header p-4">
        <div className="max-w-5xl mx-auto flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard')} className="shrink-0 rounded-full hover:bg-gold-50">
            <ArrowLeft className="w-5 h-5 text-neutral-500" />
          </Button>
          <h1 className="font-bold text-lg text-neutral-800">Kelola Shift</h1>
        </div>
      </header>

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 py-6 space-y-6">
        
        {/* Create Shift */}
        <div className="card-elegant overflow-hidden">
          <div className="px-6 py-4 border-b border-neutral-100 bg-gradient-to-r from-white to-gold-50/30">
            <h3 className="text-sm font-bold text-neutral-700 uppercase tracking-wider flex items-center gap-2">
              <Clock className="w-4 h-4 text-gold-500" />
              Daftar Shift
            </h3>
            <p className="text-xs text-neutral-400 mt-1">Buat shift dan tentukan batas jam telat.</p>
          </div>
          <div className="p-6 space-y-5">
            <form onSubmit={handleCreateShift} className="bg-neutral-50 p-4 rounded-2xl border border-neutral-100 flex flex-col md:flex-row gap-4 items-end">
              <div className="w-full space-y-1">
                <Label className="text-neutral-600 font-semibold text-xs uppercase tracking-wider">Nama Shift</Label>
                <Input value={newShiftName} onChange={e => setNewShiftName(e.target.value)} placeholder="Shift Pagi" className="input-elegant" />
              </div>
              <div className="w-full space-y-1">
                <Label className="text-neutral-600 font-semibold text-xs uppercase tracking-wider">Jam Mulai</Label>
                <Input type="time" value={newStartTime} onChange={e => setNewStartTime(e.target.value)} className="input-elegant" />
              </div>
              <div className="w-full space-y-1">
                <Label className="text-neutral-600 font-semibold text-xs uppercase tracking-wider">Batas Telat</Label>
                <Input type="time" value={newEndTime} onChange={e => setNewEndTime(e.target.value)} className="input-elegant" />
              </div>
              <Button type="submit" className="w-full md:w-auto shrink-0 btn-gold rounded-xl">
                <Plus className="w-4 h-4 mr-1" /> Buat
              </Button>
            </form>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {shifts.map(shift => (
                <div key={shift.id} className="border border-neutral-100 rounded-2xl p-4 bg-white hover:shadow-md transition-shadow flex flex-col justify-between">
                  <div>
                    <h3 className="font-bold text-neutral-800 text-sm">{shift.name}</h3>
                    <p className="text-xs text-neutral-400 mt-1 font-mono">
                      {formatTime(shift.start_time)} – {formatTime(shift.end_time)}
                    </p>
                    <p className="text-[10px] text-gold-600 mt-1 italic">
                      *Lewat {formatTime(shift.end_time)} = telat
                    </p>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => handleDeleteShift(shift.id)} className="text-red-400 hover:text-red-600 hover:bg-red-50 mt-3 self-end rounded-lg text-xs">
                    <Trash2 className="w-3.5 h-3.5 mr-1" /> Hapus
                  </Button>
                </div>
              ))}
              {shifts.length === 0 && !isLoading && (
                <div className="col-span-full text-center py-8 text-neutral-300 border-2 border-dashed border-neutral-200 rounded-2xl text-sm">
                  Belum ada shift.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Assign Shift */}
        <div className="card-elegant overflow-hidden">
          <div className="px-6 py-4 border-b border-neutral-100 bg-gradient-to-r from-white to-gold-50/30">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h3 className="text-sm font-bold text-neutral-700 uppercase tracking-wider flex items-center gap-2">
                  <Users className="w-4 h-4 text-gold-500" />
                  Penugasan Shift
                </h3>
                <p className="text-xs text-neutral-400 mt-1">Pilih shift untuk masing-masing anggota.</p>
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
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="table-header-gold">
                <tr>
                  <th className="px-5 py-3">Nama</th>
                  <th className="px-5 py-3">Divisi</th>
                  <th className="px-5 py-3">Shift Saat Ini</th>
                  <th className="px-5 py-3 text-right">Ubah Shift</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 bg-white">
                {filteredMembers.map(member => (
                  <tr key={member.id} className="hover:bg-gold-50/20 transition-colors">
                    <td className="px-5 py-3.5 font-medium text-neutral-800">{member.name}</td>
                    <td className="px-5 py-3.5 text-neutral-500">{member.divisi}</td>
                    <td className="px-5 py-3.5">
                      {member.shift_name ? (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold badge-gold">
                          {member.shift_name}
                        </span>
                      ) : (
                        <span className="text-neutral-300 italic text-xs">Tidak ada</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <select 
                        className="text-sm border border-neutral-200 rounded-xl bg-neutral-50 p-2 focus:ring-gold-400 focus:border-gold-400 transition-colors"
                        value={member.shift_id || 'none'}
                        onChange={(e) => handleAssignShift(member.id, e.target.value)}
                      >
                        <option value="none">-- Tanpa Shift --</option>
                        {shifts.map(s => (
                          <option key={s.id} value={s.id}>{s.name}</option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))}
                {filteredMembers.length === 0 && !isLoading && (
                  <tr><td colSpan={4} className="px-5 py-12 text-center text-neutral-400">Anggota tidak ditemukan.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
