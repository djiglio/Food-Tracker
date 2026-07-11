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
      // Evita zero iniziale multiplo
      if (value === '0' && key === '0') return;
      if (value === '0' && key !== '0') {
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
    <div className="grid grid-cols-3 gap-3 w-full max-w-xs mx-auto">
      {keys.map((k, i) => (
        <button
          key={i}
          onClick={() => handlePress(k)}
          className={cn(
            "h-14 rounded-2xl flex items-center justify-center text-2xl font-semibold transition-all active:scale-90",
            k === 'del' 
              ? "bg-zinc-800/50 text-red-400 hover:bg-zinc-800" 
              : "bg-zinc-900 border border-zinc-800 text-zinc-100 hover:bg-zinc-800"
          )}
        >
          {k === 'del' ? <Delete size={24} /> : k}
        </button>
      ))}
    </div>
  );
};

export default CustomNumpad;
