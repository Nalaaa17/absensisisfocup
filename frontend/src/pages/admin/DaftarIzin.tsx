import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Search, Download, CheckCircle, XCircle, Image as ImageIcon, X, Trash2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import { toast } from 'sonner';

interface Permission {
  id: string;
  user_name: string;
  user_divisi: string;
  destination: string;
  reason: string;
  estimated_return: string;
  actual_return: string | null;
  status: string;
  created_at: string;
  proof_photo_url: string;
}

export default function DaftarIzin() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  
  const [data, setData] = useState<Permission[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedPermission, setSelectedPermission] = useState<Permission | null>(null);

  useEffect(() => {
    if (!user || (user.role !== 'admin' && user.role !== 'superadmin')) {
      navigate('/dashboard');
      return;
    }
    fetchPermissions();
  }, [user]);

  const fetchPermissions = async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      const { data: permData, error } = await supabase.rpc('get_all_permissions', {
        p_admin_id: user.id,
        p_date: today
      });
      if (error) throw error;
      if (permData) setData(permData);
    } catch (err: any) {
      toast.error(`Gagal memuat daftar izin: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateStatus = async (id: string, newStatus: string) => {
    if (!user) return;
    try {
      const { error } = await supabase.rpc('update_permission_status', {
        p_admin_id: user.id,
        p_permission_id: id,
        p_status: newStatus
      });
      if (error) throw error;
      toast.success('Status izin berhasil diperbarui');
      fetchPermissions();
    } catch (err: any) {
      toast.error(`Gagal mengubah status: ${err.message}`);
    }
  };

  const filteredData = data.filter(item => 
    item.user_name.toLowerCase().includes(search.toLowerCase()) ||
    item.user_divisi.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="page-body pb-12 relative">
      <header className="page-header p-4">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard')} className="rounded-full hover:bg-gold-50">
              <ArrowLeft className="w-5 h-5 text-neutral-500" />
            </Button>
            <h1 className="font-bold text-lg text-neutral-800">Daftar Perizinan</h1>
          </div>
          <Button variant="outline" size="sm" className="hidden sm:flex btn-gold-outline rounded-xl text-xs">
            <Download className="w-3.5 h-3.5 mr-1.5" />
            Export
          </Button>
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-8">
        <div className="card-elegant overflow-hidden">
          <div className="p-4 border-b border-neutral-100 flex flex-col sm:flex-row gap-4 justify-between items-center bg-gradient-to-r from-neutral-50 to-gold-50/30">
            <div className="relative w-full sm:max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-300 w-4 h-4" />
              <Input 
                placeholder="Cari nama atau divisi..." 
                className="pl-9 input-elegant" 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="table-header-gold">
                  <TableHead className="w-[180px]">Nama</TableHead>
                  <TableHead>Divisi</TableHead>
                  <TableHead>Tujuan & Alasan</TableHead>
                  <TableHead>Estimasi</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-12 text-neutral-400">
                      <div className="w-6 h-6 border-2 border-gold-300 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                      Memuat data...
                    </TableCell>
                  </TableRow>
                ) : filteredData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-12 text-neutral-400">Tidak ada perizinan hari ini.</TableCell>
                  </TableRow>
                ) : (
                  filteredData.map((item) => (
                    <TableRow key={item.id} className="hover:bg-gold-50/20 transition-colors">
                      <TableCell className="font-medium text-neutral-800">{item.user_name}</TableCell>
                      <TableCell className="text-neutral-500 text-sm">{item.user_divisi}</TableCell>
                      <TableCell>
                        <div className="font-medium text-neutral-700 text-sm">{item.destination}</div>
                        <div className="text-xs text-neutral-400 line-clamp-1">{item.reason}</div>
                        <Button 
                          variant="link" 
                          className="h-auto p-0 text-[11px] text-gold-600 mt-0.5 font-semibold"
                          onClick={() => setSelectedPermission(item)}
                        >
                          Lihat Detail
                        </Button>
                      </TableCell>
                      <TableCell>
                        <div className="text-[11px] text-neutral-400">Keluar: {new Date(item.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</div>
                        <div className="text-sm font-medium text-neutral-700">Kembali: {new Date(item.estimated_return).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</div>
                      </TableCell>
                      <TableCell>
                        {item.status === 'menunggu' && <Badge className="badge-gold text-[11px]">Menunggu</Badge>}
                        {item.status === 'disetujui' && <Badge className="bg-blue-50 text-blue-700 border border-blue-200 text-[11px]">Izin</Badge>}
                        {item.status === 'kembali' && <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px]">Kembali</Badge>}
                        {item.status === 'terlambat_kembali' && <Badge variant="destructive" className="text-[11px]">Terlambat</Badge>}
                        {item.status === 'ditolak' && <Badge className="bg-red-50 text-red-700 border border-red-200 text-[11px]">Ditolak</Badge>}
                      </TableCell>
                      <TableCell className="text-right space-x-2 whitespace-nowrap">
                        {item.status === 'menunggu' && (
                          <>
                            <Button size="sm" onClick={() => handleUpdateStatus(item.id, 'disetujui')} className="btn-gold rounded-lg text-xs mr-1">
                              Setujui
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => handleUpdateStatus(item.id, 'ditolak')} className="text-red-500 border-red-200 hover:bg-red-50 rounded-lg text-xs">
                              Tolak
                            </Button>
                          </>
                        )}
                        {item.status === 'disetujui' && (
                          <Button size="sm" onClick={() => handleUpdateStatus(item.id, 'kembali')} className="bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-xs">
                            <CheckCircle className="w-3.5 h-3.5 mr-1" /> Tiba
                          </Button>
                        )}
                        {(item.status === 'kembali' || item.status === 'terlambat_kembali' || item.status === 'ditolak') && (
                          <span className="text-[11px] text-neutral-300 italic">Selesai</span>
                        )}
                        
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => {
                            if (confirm('Hapus perizinan ini?')) {
                              supabase.rpc('delete_permission', {
                                p_admin_id: user!.id,
                                p_permission_id: item.id
                              }).then(({ error }) => {
                                if (error) toast.error(`Gagal: ${error.message}`);
                                else { toast.success('Dihapus'); fetchPermissions(); }
                              });
                            }
                          }}
                          className="text-red-300 hover:text-red-500 hover:bg-red-50 h-8 w-8 ml-1 rounded-lg"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </main>

      {/* Modal */}
      {selectedPermission && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-neutral-100 flex justify-between items-center bg-gradient-to-r from-white to-gold-50/30">
              <h2 className="font-bold text-base text-neutral-800">Detail Perizinan</h2>
              <Button variant="ghost" size="icon" onClick={() => setSelectedPermission(null)} className="rounded-full h-8 w-8 hover:bg-gold-50">
                <X className="w-4 h-4 text-neutral-400" />
              </Button>
            </div>
            
            <div className="p-6 overflow-y-auto space-y-5">
              <div>
                <h3 className="text-[11px] font-semibold text-neutral-400 uppercase tracking-widest mb-2">Anggota</h3>
                <div className="flex justify-between items-center bg-neutral-50 p-3.5 rounded-xl border border-neutral-100">
                  <div>
                    <div className="font-bold text-neutral-800 text-sm">{selectedPermission.user_name}</div>
                    <div className="text-xs text-neutral-400">{selectedPermission.user_divisi}</div>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-[11px] font-semibold text-neutral-400 uppercase tracking-widest mb-2">Tujuan & Alasan</h3>
                <div className="bg-neutral-50 p-3.5 rounded-xl border border-neutral-100 space-y-2">
                  <div>
                    <span className="text-[10px] text-neutral-400 uppercase tracking-wider">Tujuan</span>
                    <span className="block font-medium text-neutral-800 text-sm">{selectedPermission.destination}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-neutral-400 uppercase tracking-wider">Alasan</span>
                    <span className="block text-sm text-neutral-600">{selectedPermission.reason}</span>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-[11px] font-semibold text-neutral-400 uppercase tracking-widest mb-2">Foto Bukti</h3>
                <div className="bg-neutral-50 rounded-xl overflow-hidden border border-neutral-200 min-h-[200px] flex items-center justify-center">
                  {selectedPermission.proof_photo_url ? (
                    <img src={selectedPermission.proof_photo_url} alt="Bukti" className="w-full h-auto object-contain max-h-[400px]" />
                  ) : (
                    <div className="text-neutral-300 flex flex-col items-center py-8">
                      <ImageIcon className="w-8 h-8 mb-2 opacity-50" />
                      <span className="text-xs">Tidak ada foto</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-neutral-100 flex justify-end">
              <Button onClick={() => setSelectedPermission(null)} className="btn-gold-outline rounded-xl text-sm" variant="outline">
                Tutup
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
