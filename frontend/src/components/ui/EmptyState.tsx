import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
}

export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center border-2 border-dashed border-neutral-200 rounded-xl px-6">
      {Icon && (
        <div className="w-12 h-12 bg-neutral-100 rounded-full flex items-center justify-center mb-3">
          <Icon className="w-6 h-6 text-neutral-300" />
        </div>
      )}
      <h3 className="text-sm font-medium text-neutral-600">{title}</h3>
      {description && <p className="text-xs text-neutral-400 mt-1 max-w-xs">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
