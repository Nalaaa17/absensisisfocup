import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/Spinner';
import { Pagination } from '@/components/ui/Pagination';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Users, Snowflake, Search, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import { PageLayout } from '@/components/layout/PageLayout';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface Member {
  id: string;
  name: string;
  divisi: string;
  role: string;
  frozen_until: string | null;
  pending_device_id: string | null;
}

export default function KelolaAnggota() {
  const { user } = useAuthStore();
  const [members, setMembers] = useState<Member[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  
  // States for Add Member
  const [addModal, setAddModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDivisi, setNewDivisi] = useState('');
  const [newRole, setNewRole] = useState('anggota');
  const [newPassword, setNewPassword] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  // States for Reset Password
  const [resetModal, setResetModal] = useState<Member | null>(null);
  const [resetPasswordText, setResetPasswordText] = useState('');
  const [isResetting, setIsResetting] = useState(false);
  
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [freezeDays, setFreezeDays] = useState(1);
  const [isFreezing, setIsFreezing] = useState(false);

  useEffect(() => {
    fetchMembers();
  }, [user]);

  const fetchMembers = async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const { data, error } = await supabase.rpc('get_members', { p_admin_id: user.id });
      if (error) throw error;
      if (data) setMembers(data);
    } catch (err: unknown) {
      if (err instanceof Error) {
        toast.error(`Gagal memuat data: ${err.message}`);
      } else {
        toast.error('Terjadi kesalahan yang tidak diketahui');
      }
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
    } catch (err: unknown) {
      if (err instanceof Error) {
        toast.error(`Gagal: ${err.message}`);
      } else {
        toast.error('Gagal membekukan anggota');
      }
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
    } catch (err: unknown) {
      if (err instanceof Error) {
        toast.error(`Gagal: ${err.message}`);
      } else {
        toast.error('Gagal mencabut pembekuan');
      }
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
    } catch (err: unknown) {
      if (err instanceof Error) {
        toast.error(`Gagal: ${err.message}`);
      } else {
        toast.error('Gagal menyetujui perangkat');
      }
    }
  };

  const handleRejectDevice = async (id: string, name: string) => {
    if (!user) return;
    try {
      const { error } = await supabase.rpc('reject_device_request', {
        p_admin_id: user.id,
        p_target_id: id
      });
      if (error) throw error;
      toast.success(`Permintaan ganti HP ditolak untuk ${name}`);
      fetchMembers();
    } catch (err: unknown) {
      if (err instanceof Error) {
        toast.error(`Gagal: ${err.message}`);
      } else {
        toast.error('Gagal menolak permintaan');
      }
    }
  };

  const handleAdd = () => {
    setAddModal(true);
  };

  const executeAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setIsAdding(true);
    try {
      const { error } = await supabase.rpc('create_member', {
        p_admin_id: user.id,
        p_name: newName.trim(),
        p_divisi: newDivisi.trim(),
        p_password: newPassword,
        p_role: newRole
      });
      if (error) throw error;
      toast.success('Anggota berhasil ditambahkan!');
      setAddModal(false);
      setNewName('');
      setNewDivisi('');
      setNewRole('anggota');
      setNewPassword('');
      fetchMembers();
    } catch (err: unknown) {
      if (err instanceof Error) {
        toast.error(`Gagal: ${err.message}`);
      } else {
        toast.error('Gagal menambah anggota');
      }
    } finally {
      setIsAdding(false);
    }
  };

  const executeResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !resetModal) return;
    setIsResetting(true);
    try {
      const { error } = await supabase.rpc('reset_password', {
        p_admin_id: user.id,
        p_target_id: resetModal.id,
        p_new_password: resetPasswordText
      });
      if (error) throw error;
      toast.success(`Password untuk ${resetModal.name} berhasil di-reset!`);
      setResetModal(null);
      setResetPasswordText('');
    } catch (err: unknown) {
      if (err instanceof Error) {
        toast.error(`Gagal: ${err.message}`);
      } else {
        toast.error('Gagal reset password');
      }
    } finally {
      setIsResetting(false);
    }
  };

  const filteredMembers = members.filter(m => m.name.toLowerCase().includes(search.toLowerCase()));
  
  // Pagination logic
  const totalPages = Math.ceil(filteredMembers.length / itemsPerPage);
  const paginatedMembers = filteredMembers.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  // Reset page when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [search]);

  return (
    <PageLayout 
      title="Kelola Anggota"
      actions={
        <Button variant="gold" onClick={handleAdd} className="text-xs sm:text-sm h-9 px-3 sm:px-4 rounded-lg">
          <Plus className="w-4 h-4 mr-1.5" />
          <span className="hidden sm:inline">Tambah Anggota</span>
          <span className="sm:hidden">Tambah</span>
        </Button>
      }
    >
      <div className="flex-1 w-full mx-auto space-y-5">
        
        {selectedMember && (
          <div className="card-attendance border-red-200 bg-red-50/30 p-5">
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
                  className="bg-white border-red-200 rounded-lg"
                />
              </div>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" className="border-red-200 text-red-600 hover:bg-red-100 rounded-lg" onClick={() => setSelectedMember(null)}>Batal</Button>
              <Button className="bg-red-500 hover:bg-red-600 text-white rounded-lg" onClick={handleFreeze} disabled={isFreezing}>
                {isFreezing ? 'Memproses...' : 'Terapkan'}
              </Button>
            </div>
          </div>
        )}

        <div className="card-attendance overflow-hidden">
          <div className="px-5 py-3.5 border-b border-neutral-100">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h3 className="text-xs font-semibold text-neutral-500 uppercase tracking-wider flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Daftar Anggota
                </h3>
                <p className="text-xs text-neutral-400 mt-0.5">Kelola status absensi seluruh panitia.</p>
              </div>
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-300" />
                <Input 
                  placeholder="Cari nama..." 
                  className="pl-9 w-full md:w-56"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>
          </div>
          <div>
            {isLoading ? (
              <div className="text-center py-12">
                <Spinner label="Memuat data..." />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[200px]">Nama</TableHead>
                      <TableHead>Divisi</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedMembers.map((m) => {
                      const isFrozen = m.frozen_until && new Date(m.frozen_until) > new Date();
                      return (
                        <TableRow key={m.id} className="hover:bg-neutral-50 transition-colors">
                          <TableCell className="font-medium text-neutral-800">
                            {m.name}
                            {m.pending_device_id && (
                              <div className="text-[10px] bg-gold-100 text-gold-700 px-2 py-0.5 mt-1 rounded-full inline-block font-semibold">
                                Minta Ganti HP
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="text-neutral-500">{m.divisi}</TableCell>
                          <TableCell>
                            {m.role === 'admin' ? (
                              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold bg-gold-50 text-gold-600 border border-gold-200">
                                Admin
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-600 border border-blue-200">
                                Anggota
                              </span>
                            )}
                          </TableCell>
                          <TableCell>
                            {isFrozen ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-red-50 text-red-600 border border-red-200">
                                <Snowflake className="w-3 h-3" /> Dibekukan
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-600 border border-emerald-200">
                                Aktif
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              {m.pending_device_id && (
                                <>
                                  <Button variant="gold-outline" size="sm" className="rounded-lg text-xs" onClick={() => handleApproveDevice(m.id, m.name)}>
                                    Izinkan HP
                                  </Button>
                                  <Button variant="outline" size="sm" className="text-red-500 border-red-200 hover:bg-red-50 rounded-lg text-xs" onClick={() => handleRejectDevice(m.id, m.name)}>
                                    Tolak
                                  </Button>
                                </>
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
                              <Button variant="outline" size="sm" className="text-neutral-600 border-neutral-200 hover:bg-neutral-50 rounded-lg text-xs" onClick={() => setResetModal(m)}>
                                Reset Password
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    {paginatedMembers.length === 0 && (
                      <TableRow><TableCell colSpan={5} className="text-center py-12 text-neutral-400">Anggota tidak ditemukan.</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
            
            {!isLoading && totalPages > 1 && (
              <div className="border-t border-neutral-100">
                <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal Tambah Anggota */}
      {addModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95">
            <div className="px-5 py-3.5 border-b border-neutral-100">
              <h3 className="font-bold text-neutral-800">Tambah Anggota Baru</h3>
            </div>
            <form onSubmit={executeAddMember} className="p-6 space-y-4">
              <div className="space-y-1.5">
                <Label>Nama Lengkap</Label>
                <Input required placeholder="Cth: Budi Santoso" value={newName} onChange={e => setNewName(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Divisi / Jabatan</Label>
                <Input required placeholder="Cth: Acara" value={newDivisi} onChange={e => setNewDivisi(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Role</Label>
                <select 
                  className="flex h-10 w-full rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm ring-offset-white file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-neutral-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-950 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  value={newRole}
                  onChange={e => setNewRole(e.target.value)}
                >
                  <option value="anggota">Anggota</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <Label>Password</Label>
                <Input required type="password" placeholder="Minimal 6 karakter" minLength={6} value={newPassword} onChange={e => setNewPassword(e.target.value)} />
              </div>
              <div className="flex gap-3 pt-2">
                <Button type="button" variant="outline" className="flex-1 rounded-lg" onClick={() => setAddModal(false)}>Batal</Button>
                <Button type="submit" variant="gold" className="flex-1 rounded-lg" disabled={isAdding}>
                  {isAdding ? 'Menyimpan...' : 'Simpan'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Reset Password */}
      {resetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden animate-in zoom-in-95">
            <div className="px-5 py-3.5 border-b border-neutral-100">
              <h3 className="font-bold text-neutral-800">Reset Password</h3>
              <p className="text-xs text-neutral-500 mt-1">Target: <strong>{resetModal.name}</strong></p>
            </div>
            <form onSubmit={executeResetPassword} className="p-6 space-y-4">
              <div className="space-y-1.5">
                <Label>Password Baru</Label>
                <Input required type="text" placeholder="Masukkan password baru" minLength={6} value={resetPasswordText} onChange={e => setResetPasswordText(e.target.value)} />
              </div>
              <div className="flex gap-3 pt-2">
                <Button type="button" variant="outline" className="flex-1 rounded-lg" onClick={() => setResetModal(null)}>Batal</Button>
                <Button type="submit" className="flex-1 bg-neutral-800 hover:bg-neutral-900 text-white rounded-lg" disabled={isResetting}>
                  {isResetting ? 'Meriset...' : 'Reset'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </PageLayout>
  );
}
