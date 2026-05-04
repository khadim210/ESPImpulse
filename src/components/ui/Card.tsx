import React from 'react';
import { cn } from '../../utils/cn';

interface CardProps {
  className?: string;
  children: React.ReactNode;
  onClick?: () => void;
}

export const Card = ({ className, children, onClick }: CardProps) => {
  return (
    <div
      className={cn('bg-white rounded-lg shadow-sm overflow-hidden', className)}
      onClick={onClick}
    >
      {children}
    </div>
  );
};

interface CardHeaderProps {
  className?: string;
  children: React.ReactNode;
}

export const CardHeader = ({ className, children }: CardHeaderProps) => {
  return (
    <div className={cn('px-6 py-4 border-b border-gray-200', className)}>
      {children}
    </div>
  );
};

interface CardTitleProps {
  className?: string;
  children: React.ReactNode;
}

export const CardTitle = ({ className, children }: CardTitleProps) => {
  return (
    <h3 className={cn('text-lg font-medium text-gray-900', className)}>
      {children}
    </h3>
  );
};

interface CardDescriptionProps {
  className?: string;
  children: React.ReactNode;
}

export const CardDescription = ({ className, children }: CardDescriptionProps) => {
  return (
    <p className={cn('mt-1 text-sm text-gray-500', className)}>
      {children}
    </p>
  );
};

interface CardContentProps {
  className?: string;
  children: React.ReactNode;
}

export const CardContent = ({ className, children }: CardContentProps) => {
  return (
    <div className={cn('px-6 py-4', className)}>
      {children}
    </div>
  );
};

interface CardFooterProps {
  className?: string;
  children: React.ReactNode;
}

export const CardFooter = ({ className, children }: CardFooterProps) => {
  return (
    <div className={cn('px-6 py-4 bg-gray-50 border-t border-gray-200', className)}>
      {children}
    </div>
  );
};