import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { BaseInput } from './BaseInput';
import CustomNumpad from './CustomNumpad';
import { X, Check } from 'lucide-react';
import { Button } from './Button';

interface NumpadInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value'> {
  value: string | number;
  onChange: (val: string) => void;
  label?: string;
  allowDecimals?: boolean;
}

export const NumpadInput: React.FC<NumpadInputProps> = ({ 
  value, 
  onChange, 
  label, 
  allowDecimals = true,
  placeholder,
  className,
  ...rest
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [tempValue, setTempValue] = useState(value?.toString() || '');

  // Sincronizza il valore dal parent solo quando il tastierino è chiuso,
  // così possiamo mantenere stringhe temporanee come "70." o "" senza che il parent le distrugga con parseFloat
  useEffect(() => {
    if (!isOpen) {
      setTempValue(value?.toString() || '');
    }
  }, [value, isOpen]);

  const handleChange = (val: string) => {
    setTempValue(val);
    onChange(val); // FIRE LIVE! Aggiorna l'interfaccia dell'app in tempo reale
  };

  const handleConfirm = () => {
    setIsOpen(false);
  };

  return (
    <>
      <div 
        onClick={(e) => {
          e.preventDefault();
          setIsOpen(true);
        }}
        className="w-full relative cursor-pointer"
      >
        <BaseInput 
          {...rest}
          readOnly 
          inputMode="none"
          value={value} 
          placeholder={placeholder} 
          className={`cursor-pointer ${className || ''}`}
          // Impediamo il focus nativo per non far aprire la tastiera di sistema
          onFocus={(e) => {
            e.target.blur();
            setIsOpen(true);
          }}
        />
        <div className="absolute inset-0 bg-transparent z-10" />
      </div>

      {isOpen && createPortal(
        <div className="fixed inset-0 z-[120] flex flex-col justify-end bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#121215]/95 backdrop-blur-2xl rounded-t-3xl border-t border-white/[0.08] p-6 pb-safe-overlay animate-in slide-in-from-bottom-full duration-300 shadow-[0_-12px_40px_rgba(0,0,0,0.75)]">
            
            <div className="w-10 h-1 bg-zinc-700/80 rounded-full mx-auto -mt-2 mb-4" />

            <div className="flex justify-between items-center mb-4">
              <h3 className="text-base font-semibold tracking-tight text-zinc-100">{label || 'Inserisci valore'}</h3>
              <button 
                onClick={() => setIsOpen(false)} 
                className="w-8 h-8 rounded-xl bg-[#18181c] border border-white/[0.06] flex items-center justify-center text-zinc-400 hover:text-zinc-100 transition-colors"
              >
                <X size={17} strokeWidth={1.75} />
              </button>
            </div>

            <div className="bg-[#09090b] rounded-2xl p-4 mb-5 border border-white/[0.06] flex items-center justify-center min-h-[84px]">
              <div className="text-4xl font-semibold text-zinc-100 tracking-tight tabular-nums">
                {tempValue || '0'}
              </div>
            </div>

            <div className="mb-5">
              <CustomNumpad 
                value={tempValue} 
                onChange={handleChange} 
                maxLength={8} 
              />
            </div>

            <Button 
              variant="primary" 
              fullWidth 
              size="lg" 
              onClick={handleConfirm}
            >
              <Check className="mr-2" size={18} strokeWidth={2} />
              Conferma
            </Button>
          </div>
        </div>,
        document.body
      )}
    </>
  );
};

export default NumpadInput;
