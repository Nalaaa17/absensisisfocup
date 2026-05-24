import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/Spinner';
import { Pagination } from '@/components/ui/Pagination';
import { Search, Download, Trash2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { exportToCSV } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import { toast } from 'sonner';
import { PageLayout } from '@/components/layout/PageLayout';
import { ConfirmModal } from '@/components/ui/ConfirmModal';

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
  const { user } = useAuthStore();
  
  const [data, setData] = useState<Attendance[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  
  const [deleteModal, setDeleteModal] = useState<{isOpen: boolean, id: string | null}>({isOpen: false, id: null});

  useEffect(() => {
    supabase.rpc('get_server_date').then(({ data }) => {
      if (data?.[0]) setSelectedDate(data[0].today);
    });
  }, []);

  useEffect(() => {
    if (selectedDate) fetchAttendance();
  }, [user, selectedDate]);

  const fetchAttendance = async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const { data: attData, error } = await supabase.rpc('get_all_attendance', {
        p_admin_id: user.id,
        p_date: selectedDate
      });
      if (error) throw error;
      if (attData) setData(attData);
    } catch (err: unknown) {
      if (err instanceof Error) {
        toast.error(`Gagal memuat data absensi: ${err.message}`);
      } else {
        toast.error('Gagal memuat data absensi');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const executeDelete = async (id: string) => {
    if (!user) return;
    try {
      const { error } = await supabase.rpc('delete_attendance', {
        p_admin_id: user.id,
        p_attendance_id: id
      });
      if (error) throw error;
      toast.success('Data absensi dihapus');
      fetchAttendance();
    } catch (err: unknown) {
      if (err instanceof Error) {
        toast.error(`Gagal menghapus: ${err.message}`);
      } else {
        toast.error('Gagal menghapus data absensi');
      }
    }
  };

  const handleDelete = (id: string) => {
    setDeleteModal({isOpen: true, id});
  };

  const filteredData = data.filter(item => 
    item.user_name.toLowerCase().includes(search.toLowerCase()) ||
    item.user_divisi.toLowerCase().includes(search.toLowerCase())
  );

  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const paginatedData = filteredData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, selectedDate]);

  const handleExport = () => {
    if (filteredData.length === 0) {
      toast.error('Tidak ada data untuk diexport');
      return;
    }
    const exportData = filteredData.map(item => ({
      Nama: item.user_name,
      Divisi: item.user_divisi,
      Jam_Masuk: new Date(item.check_in_time).toLocaleString('id-ID'),
      Lat: item.location_lat,
      Lng: item.location_lng,
      Status: item.status
    }));
    exportToCSV(exportData, `Rekap_Absensi_${new Date().toISOString().split('T')[0]}`);
    toast.success('Data berhasil diexport');
  };

  return (
    <PageLayout 
      title="Rekap Absensi"
      actions={
        <Button variant="gold-outline" size="sm" onClick={handleExport} className="hidden sm:flex rounded-lg text-xs">
          <Download className="w-3.5 h-3.5 mr-1.5" />
          Export
        </Button>
      }
    >
      <div className="card-attendance overflow-hidden">
        <div className="p-4 border-b border-neutral-100 flex flex-col sm:flex-row gap-4 justify-between items-center">
            <div className="flex w-full gap-2 sm:max-w-md">
              <div className="relative flex-1 sm:max-w-xs">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-300 w-4 h-4" />
                <Input 
                  placeholder="Cari nama atau divisi..." 
                  className="pl-9" 
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <Input 
                type="date" 
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="sm:max-w-[150px]"
              />
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
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
                    <TableCell colSpan={6} className="text-center py-12">
                      <Spinner label="Memuat data..." />
                    </TableCell>
                  </TableRow>
                ) : paginatedData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-12 text-neutral-400">Tidak ada data absensi.</TableCell>
                  </TableRow>
                ) : (
                  paginatedData.map((item) => (
                    <TableRow key={item.id} className="hover:bg-neutral-50 transition-colors">
                      <TableCell className="font-medium text-neutral-800">{item.user_name}</TableCell>
                      <TableCell className="text-neutral-500 text-sm">{item.user_divisi}</TableCell>
                      <TableCell className="font-medium text-neutral-700">
                        {new Date(item.check_in_time).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                      </TableCell>
                      <TableCell className="text-neutral-400 text-xs font-mono">
                        {item.location_lat != null && item.location_lng != null 
                          ? `${item.location_lat.toFixed(4)}, ${item.location_lng.toFixed(4)}`
                          : '-'}
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
            
            {!isLoading && totalPages > 1 && (
              <div className="border-t border-neutral-100">
                <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
              </div>
            )}
          </div>
        </div>
        
      <ConfirmModal
        isOpen={deleteModal.isOpen}
        title="Hapus Data Absensi"
        description="Apakah Anda yakin ingin menghapus data absensi ini? Tindakan ini tidak dapat dibatalkan."
        onCancel={() => setDeleteModal({isOpen: false, id: null})}
        onConfirm={() => {
          if (deleteModal.id) {
            executeDelete(deleteModal.id);
            setDeleteModal({isOpen: false, id: null});
          }
        }}
      />
    </PageLayout>
  );
}
