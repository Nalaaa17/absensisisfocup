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
import { useAuthStore } from '@/stores/authStore';

import { ProtectedRoute } from './components/ProtectedRoute';
import { InstallPrompt } from './components/InstallPrompt';

import { Trophy } from 'lucide-react';

// ABSENSI SISFO CUP Main Application Router

function AuthGate({ children }: { children: React.ReactNode }) {
  const isHydrated = useAuthStore((state) => state.isHydrated);

  if (!isHydrated) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-white via-neutral-50 to-gold-50/50 p-4 relative overflow-hidden">
        <div className="absolute top-[30%] right-[10%] w-32 h-32 border-2 border-gold-200/30 rounded-full animate-pulse"></div>
        <div className="absolute bottom-[20%] left-[15%] w-20 h-20 border border-gold-300/20 rounded-2xl rotate-45 animate-pulse"></div>
        
        <div className="w-20 h-20 gold-gradient rounded-3xl flex items-center justify-center mx-auto shadow-2xl shadow-gold-300/40 mb-6 animate-bounce">
          <Trophy className="text-white w-10 h-10" />
        </div>
        <h1 className="text-xl font-bold tracking-tight text-neutral-800 mb-2">
          SISFO <span className="gold-gradient-text">CUP</span>
        </h1>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 border-2 border-gold-400 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm font-medium text-neutral-500">Memuat sesi...</span>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

function App() {
  useEffect(() => {
    if (import.meta.env.VITE_ONESIGNAL_APP_ID) {
      OneSignal.init({
        appId: import.meta.env.VITE_ONESIGNAL_APP_ID,
        safari_web_id: import.meta.env.VITE_ONESIGNAL_SAFARI_WEB_ID,
        allowLocalhostAsSecureOrigin: true,
        notifyButton: {
          enable: true,
        } as any,
      });
    }
  }, []);

  return (
    <AuthGate>
      <Router>
        <Routes>
          <Route path="/" element={<Login />} />
          <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/absen" element={<ProtectedRoute><Absen /></ProtectedRoute>} />
          <Route path="/izin" element={<ProtectedRoute><FormIzin /></ProtectedRoute>} />
          <Route path="/admin/daftar-izin" element={<ProtectedRoute requireAdmin><DaftarIzin /></ProtectedRoute>} />
          <Route path="/admin/rekap-absensi" element={<ProtectedRoute requireAdmin><RekapAbsensi /></ProtectedRoute>} />
          <Route path="/admin/settings" element={<ProtectedRoute requireAdmin><AdminSettings /></ProtectedRoute>} />
          <Route path="/admin/anggota" element={<ProtectedRoute requireAdmin><KelolaAnggota /></ProtectedRoute>} />
          <Route path="/admin/shift" element={<ProtectedRoute requireAdmin><KelolaShift /></ProtectedRoute>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        <Toaster position="top-right" richColors />
        <InstallPrompt />
      </Router>
    </AuthGate>
  );
}

export default App;
