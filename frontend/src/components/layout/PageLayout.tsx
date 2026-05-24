import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

interface PageLayoutProps {
  title: string;
  children: ReactNode;
  actions?: ReactNode;
}

export function PageLayout({ title, children, actions }: PageLayoutProps) {
  const navigate = useNavigate();

  return (
    <div className="page-body">
      <header className="page-header px-6 py-3">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard')} className="rounded-lg hover:bg-neutral-100 h-8 w-8">
              <ArrowLeft className="w-4 h-4 text-neutral-500" />
            </Button>
            <h1 className="font-bold text-base text-neutral-800">{title}</h1>
          </div>
          {actions && (
            <div>{actions}</div>
          )}
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-8">
        {children}
      </main>
    </div>
  );
}
