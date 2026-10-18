import React, { forwardRef } from 'react';
import { cn } from '@/core/utils';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

export const BaseInput = forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, label: _label, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-11 w-full rounded-xl border border-white/[0.06] bg-[#18181c] px-3.5 py-2 text-sm text-zinc-100 tabular-nums transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-zinc-500 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/25 disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
BaseInput.displayName = "BaseInput";
