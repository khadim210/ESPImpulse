import React from 'react';
import { cn } from '../../utils/cn';

type BadgeVariant = 'default' | 'primary' | 'secondary' | 'accent' | 'success' | 'warning' | 'error' | 'outline';

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  className?: string;
}

const Badge = ({ children, variant = 'default', className }: BadgeProps) => {
  const variantClasses = {
    default: 'bg-gray-100 text-gray-800 border border-gray-200',
    primary: 'bg-primary-100 text-primary-800 border border-primary-200',
    secondary: 'bg-secondary-100 text-secondary-800 border border-secondary-200',
    accent: 'bg-accent-100 text-accent-800 border border-accent-200',
    success: 'bg-success-100 text-success-800 border border-success-200',
    warning: 'bg-warning-100 text-warning-800 border border-warning-200',
    error: 'bg-error-100 text-error-800 border border-error-200',
    outline: 'bg-transparent border border-gray-300 text-gray-700',
  };

  return (
    <span className={cn(
      'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors',
      variantClasses[variant],
      className
    )}>
      {children}
    </span>
  );
};

export default Badge;