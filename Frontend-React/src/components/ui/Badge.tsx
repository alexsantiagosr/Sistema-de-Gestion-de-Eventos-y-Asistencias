import { cn } from '@/lib/utils';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'success' | 'error' | 'warning' | 'info' | 'presencial' | 'virtual' | 'hibrido';
  className?: string;
}

export default function Badge({ children, variant = 'default', className }: BadgeProps) {
  const variants = {
    default: 'bg-gray-100 text-gray-800',
    success: 'bg-success/10 text-success',
    error: 'bg-error/10 text-error',
    warning: 'bg-warning/10 text-warning',
    info: 'bg-primary/10 text-primary',
    presencial: 'bg-orange-100 text-orange-800',
    virtual: 'bg-indigo-100 text-indigo-800',
    hibrido: 'bg-cyan-100 text-cyan-800',
  };

  return (
    <span className={cn('inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium', variants[variant], className)}>
      {children}
    </span>
  );
}
