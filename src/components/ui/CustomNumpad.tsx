import React from 'react';
import { Delete } from 'lucide-react';
import { cn } from '@/core/utils';

interface CustomNumpadProps {
  value: string;
  onChange: (val: string) => void;
  maxLength?: number;
}

export const CustomNumpad: React.FC<CustomNumpadProps> = ({ value, onChange, maxLength = 4 }) => {
  const handlePress = (key: string) => {
    if (key === 'del') {
      onChange(value.slice(0, -1));
    } else {
      if (key === '.') {
        if (value.includes('.')) return;
        if (value === '' || value === '0') {
          onChange('0.');
          return;
        }
      }
      // Evita zero iniziale multiplo
      if (value === '0' && key === '0') return;
      if (value === '0' && key !== '.') {
        onChange(key);
        return;
      }
      if (value.length < maxLength) {
        onChange(value + key);
      }
    }
  };

  const keys = [
    '1', '2', '3',
    '4', '5', '6',
    '7', '8', '9',
    '.', '0', 'del'
  ];

  return (
    <div className="grid grid-cols-3 gap-2.5 w-full max-w-xs mx-auto tabular-nums">
      {keys.map((k, i) => (
        <button
          key={i}
          onPointerDown={(e) => {
            e.preventDefault();
            handlePress(k);
          }}
          className={cn(
            "h-13 py-3 rounded-2xl flex items-center justify-center text-xl font-medium transition-all active:scale-95 border",
            k === 'del' 
              ? "bg-rose-500/10 border-rose-500/20 text-rose-400 hover:bg-rose-500/15" 
              : "bg-[#18181c] border-white/[0.06] text-zinc-100 hover:bg-zinc-800/80 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)]"
          )}
        >
          {k === 'del' ? <Delete size={20} strokeWidth={1.75} /> : k}
        </button>
      ))}
    </div>
  );
};

export default CustomNumpad;
