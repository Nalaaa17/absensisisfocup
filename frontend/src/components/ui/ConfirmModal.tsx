import { Button } from './button';
import { AlertTriangle, X } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  description: string;
  onConfirm: () => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export function ConfirmModal({ isOpen, title, description, onConfirm, onCancel, isLoading }: ConfirmModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden flex flex-col p-6 animate-in zoom-in-95">
        <div className="flex justify-between items-start mb-4">
          <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center text-red-500">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <button onClick={onCancel} className="text-neutral-400 hover:text-neutral-600 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <h2 className="font-bold text-lg text-neutral-800 mb-2">{title}</h2>
        <p className="text-sm text-neutral-500 mb-6">{description}</p>
        
        <div className="flex gap-3 justify-end">
          <Button variant="outline" onClick={onCancel} disabled={isLoading} className="rounded-xl border-neutral-200">
            Batal
          </Button>
          <Button variant="destructive" onClick={onConfirm} disabled={isLoading} className="rounded-xl bg-red-500 hover:bg-red-600">
            {isLoading ? 'Memproses...' : 'Ya, Lanjutkan'}
          </Button>
        </div>
      </div>
    </div>
  );
}
