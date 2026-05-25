interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  label?: string;
  className?: string;
}

export function Spinner({ size = 'md', label, className }: SpinnerProps) {
  const sizeMap = { sm: 'w-4 h-4', md: 'w-6 h-6', lg: 'w-8 h-8' };
  return (
    <div className={`flex items-center gap-2 ${className || ''}`}>
      <div className={`${sizeMap[size]} border-2 border-gold-200 border-t-gold-600 rounded-full animate-spin`} />
      {label && <span className="text-sm text-neutral-400">{label}</span>}
    </div>
  );
}
