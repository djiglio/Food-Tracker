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
          "inline-flex items-center justify-center rounded-xl font-semibold tracking-tight transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950 disabled:pointer-events-none disabled:opacity-40 active:scale-[0.98]",
          {
            'bg-zinc-100 text-zinc-950 hover:bg-white shadow-sm': variant === 'primary',
            'bg-[#18181c] hover:bg-zinc-800 text-zinc-100 border border-white/[0.08]': variant === 'secondary',
            'bg-rose-500/10 text-rose-400 border border-rose-500/20 hover:bg-rose-500/20': variant === 'danger',
            'hover:bg-zinc-800/60 text-zinc-300 hover:text-zinc-100': variant === 'ghost',
            'h-9 px-3.5 text-xs': size === 'sm',
            'h-11 px-5 text-sm': size === 'md',
            'h-12 px-6 text-base': size === 'lg',
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
