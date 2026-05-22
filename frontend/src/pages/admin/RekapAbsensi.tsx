import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Search, Download, Filter, Trash2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import { toast } from 'sonner';

interface Attendance {
  id: string;
  user_name: string;
  user_divisi: string;
  check_in_time: string;
  location_lat: number;
  location_lng: number;
  status: string;
}

export default function RekapAbsensi() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  
  const [data, setData] = useState<Attendance[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!user || (user.role !== 'admin' && user.role !== 'superadmin')) {
      navigate('/dashboard');
      return;
    }
    fetchAttendance();
  }, [user]);

  const fetchAttendance = async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      const { data: attData, error } = await supabase.rpc('get_all_attendance', {
        p_admin_id: user.id,
        p_date: today
      });
      if (error) throw error;
      if (attData) setData(attData);
    } catch (err: any) {
      toast.error(`Gagal memuat data absensi: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!user) return;
    if (!confirm('Hapus data absensi ini?')) return;
    try {
      const { error } = await supabase.rpc('delete_attendance', {
        p_admin_id: user.id,
        p_attendance_id: id
      });
      if (error) throw error;
      toast.success('Data absensi dihapus');
      fetchAttendance();
    } catch (err: any) {
      toast.error(`Gagal menghapus: ${err.message}`);
    }
  };

  const filteredData = data.filter(item => 
    item.user_name.toLowerCase().includes(search.toLowerCase()) ||
    item.user_divisi.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="page-body">
      <header className="page-header p-4">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard')} className="rounded-full hover:bg-gold-50">
              <ArrowLeft className="w-5 h-5 text-neutral-500" />
            </Button>
            <h1 className="font-bold text-lg text-neutral-800">Rekap Absensi</h1>
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
            <div className="flex w-full gap-2 sm:max-w-md">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-300 w-4 h-4" />
                <Input 
                  placeholder="Cari nama atau divisi..." 
                  className="pl-9 input-elegant" 
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="table-header-gold">
                  <TableHead className="w-[200px]">Nama</TableHead>
                  <TableHead>Divisi</TableHead>
                  <TableHead>Jam Masuk</TableHead>
                  <TableHead>Lokasi</TableHead>
                  <TableHead className="text-right">Status</TableHead>
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
                    <TableCell colSpan={6} className="text-center py-12 text-neutral-400">Tidak ada data absensi.</TableCell>
                  </TableRow>
                ) : (
                  filteredData.map((item) => (
                    <TableRow key={item.id} className="hover:bg-gold-50/20 transition-colors">
                      <TableCell className="font-medium text-neutral-800">{item.user_name}</TableCell>
                      <TableCell className="text-neutral-500 text-sm">{item.user_divisi}</TableCell>
                      <TableCell className="font-medium text-neutral-700">
                        {new Date(item.check_in_time).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                      </TableCell>
                      <TableCell className="text-neutral-400 text-xs font-mono">
                        {item.location_lat.toFixed(4)}, {item.location_lng.toFixed(4)}
                      </TableCell>
                      <TableCell className="text-right">
                        {item.status === 'hadir' && <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px]">Hadir</Badge>}
                        {item.status === 'terlambat' && <Badge className="bg-red-50 text-red-700 border border-red-200 text-[11px]">Terlambat</Badge>}
                        {item.status === 'tidak_hadir' && <Badge variant="outline" className="text-neutral-400 border-neutral-200 text-[11px]">Belum</Badge>}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => handleDelete(item.id)}
                          className="text-red-300 hover:text-red-500 hover:bg-red-50 h-8 w-8 rounded-lg"
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
    </div>
  );
}
