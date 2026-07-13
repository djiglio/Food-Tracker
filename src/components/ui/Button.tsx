import React, { forwardRef } from 'react';
import { cn } from '@/core/utils';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', fullWidth, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center rounded-xl font-medium transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-900 disabled:pointer-events-none disabled:opacity-50 hover:scale-[1.02] active:scale-[0.98]",
          {
            'bg-brand-primary text-zinc-950 hover:bg-emerald-400 glow-primary hover:shadow-[0_0_25px_-3px_rgba(16,185,129,0.6)]': variant === 'primary',
            'glass hover:bg-zinc-800/80 text-zinc-50 border border-white/5': variant === 'secondary',
            'bg-brand-danger/10 text-brand-danger hover:bg-brand-danger/20 hover:shadow-[0_0_15px_-3px_rgba(239,68,68,0.3)]': variant === 'danger',
            'hover:bg-zinc-800/50 text-zinc-300 hover:text-zinc-50': variant === 'ghost',
            'h-9 px-4 text-sm': size === 'sm',
            'h-12 px-6 text-base': size === 'md',
            'h-14 px-8 text-lg': size === 'lg',
            'w-full': fullWidth,
          },
          className
        )}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button };
