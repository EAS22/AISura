import type { ReactNode } from 'react';

interface BadgeProps {
  children: ReactNode;
  variant?: 'default' | 'accent' | 'success' | 'warning' | 'danger';
  className?: string;
}

const variants = {
  default: 'bg-[var(--color-surface-secondary)] text-[var(--color-text-secondary)] border-[var(--color-border)]',
  accent: 'bg-[var(--color-accent-light)] text-[var(--color-accent)] border-[var(--color-accent)]/20',
  success: 'bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800',
  warning: 'bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-400 dark:border-yellow-800',
  danger: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800',
};

export function Badge({ children, variant = 'default', className = '' }: BadgeProps) {
  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 text-xs font-medium rounded border ${variants[variant]} ${className}`}>
      {children}
    </span>
  );
}
