import { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import OneSignal from 'react-onesignal';
import { Toaster } from '@/components/ui/sonner';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Absen from './pages/user/Absen';
import FormIzin from './pages/user/FormIzin';
import DaftarIzin from './pages/admin/DaftarIzin';
import RekapAbsensi from './pages/admin/RekapAbsensi';
import AdminSettings from './pages/admin/AdminSettings';
import KelolaAnggota from './pages/admin/KelolaAnggota';
import KelolaShift from './pages/admin/KelolaShift';

function App() {
  useEffect(() => {
    if (import.meta.env.VITE_ONESIGNAL_APP_ID) {
      OneSignal.init({
        appId: import.meta.env.VITE_ONESIGNAL_APP_ID,
        safari_web_id: import.meta.env.VITE_ONESIGNAL_SAFARI_WEB_ID,
        allowLocalhostAsSecureOrigin: true,
        notifyButton: {
          enable: true,
        },
      });
    }
  }, []);

  return (
    <Router>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/absen" element={<Absen />} />
        <Route path="/izin" element={<FormIzin />} />
        <Route path="/admin/daftar-izin" element={<DaftarIzin />} />
        <Route path="/admin/rekap-absensi" element={<RekapAbsensi />} />
        <Route path="/admin/settings" element={<AdminSettings />} />
        <Route path="/admin/anggota" element={<KelolaAnggota />} />
        <Route path="/admin/shift" element={<KelolaShift />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <Toaster position="top-right" richColors />
    </Router>
  );
}

export default App;
