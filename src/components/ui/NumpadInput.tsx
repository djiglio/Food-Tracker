import React, { useState, useEffect } from 'react';
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

      {isOpen && (
        <div className="fixed inset-0 z-[120] flex flex-col justify-end bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-zinc-950 rounded-t-3xl border-t border-zinc-800 p-6 pb-safe animate-in slide-in-from-bottom-full duration-300">
            
            <div className="flex justify-between items-start mb-6">
              <h3 className="text-xl font-bold text-white">{label || placeholder || 'Inserisci valore'}</h3>
              <button 
                onClick={() => setIsOpen(false)} 
                className="p-2 bg-zinc-900 rounded-full text-zinc-400 hover:text-white transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="bg-zinc-900/50 rounded-2xl p-4 mb-6 border border-zinc-800 flex items-center justify-center min-h-[100px]">
              <div className="text-5xl font-black text-brand-primary tracking-tight">
                {tempValue || '0'}
              </div>
            </div>

            <div className="mb-6">
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
              <Check className="mr-2" size={20} />
              Conferma
            </Button>
          </div>
        </div>
      )}
    </>
  );
};

export default NumpadInput;
