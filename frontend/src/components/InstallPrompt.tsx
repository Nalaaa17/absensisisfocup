import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Download, X } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowPrompt(true);
    };

    window.addEventListener('beforeinstallprompt', handler);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      setShowPrompt(false);
    }
    setDeferredPrompt(null);
  };

  if (!showPrompt) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 md:bottom-8 md:left-auto md:right-8 md:w-96 animate-in slide-in-from-bottom-5">
      <div className="bg-white rounded-2xl shadow-xl border border-gold-200 p-4 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-1 h-full bg-gold-400"></div>
        <button 
          onClick={() => setShowPrompt(false)} 
          className="absolute top-3 right-3 text-neutral-400 hover:text-neutral-600 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
        
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-gold-50 flex items-center justify-center shrink-0 text-gold-600">
            <Download className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-neutral-800 text-sm">Install Aplikasi</h3>
            <p className="text-xs text-neutral-500 mt-0.5 mb-3">Install aplikasi Absensi Sisfo Cup ke beranda Anda untuk akses lebih cepat.</p>
            <div className="flex gap-2">
              <Button onClick={handleInstallClick} variant="gold" className="rounded-lg h-8 text-xs px-4">
                Install Sekarang
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
