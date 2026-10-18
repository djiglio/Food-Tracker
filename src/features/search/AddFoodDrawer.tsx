import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Button } from '@/components/ui/Button';
import { X, Check } from 'lucide-react';
import { FoodEntity, FoodLogItem } from '@/services/db';
import CustomNumpad from '@/components/ui/CustomNumpad';
import { useDiaryStore } from '@/store/diaryStore';
import { useNavigate } from 'react-router-dom';

interface AddFoodDrawerProps {
  food: FoodEntity | null;
  targetMealId: string | null;
  onClose: () => void;
}

export const AddFoodDrawer: React.FC<AddFoodDrawerProps> = ({ food, targetMealId, onClose }) => {
  const [amountStr, setAmountStr] = useState('100');
  const [isPortionMode, setIsPortionMode] = useState(false);
  
  const addFoodToMeal = useDiaryStore(state => state.addFoodToMeal);
  const navigate = useNavigate();

  const hasPortion = food?.defaultUnit && food.defaultUnit !== 'g' && food.defaultUnitAmount;

  // Reset al mount o al cambio modalità
  useEffect(() => {
    if (food) {
      if (isPortionMode && hasPortion) {
        setAmountStr('1');
      } else {
        setAmountStr(hasPortion ? food.defaultUnitAmount!.toString() : '100');
      }
    }
  }, [food, isPortionMode]);

  if (!food) return null;

  const inputValue = parseFloat(amountStr) || 0;
  
  // Calcolo dei grammi effettivi
  const actualGrams = (isPortionMode && hasPortion) 
    ? inputValue * food.defaultUnitAmount! 
    : inputValue;

  const ratio = actualGrams / 100;

  const currentKcal = food.kcalPer100 * ratio;
  const currentPro = food.proteinPer100 * ratio;
  const currentCarbs = food.carbsPer100 * ratio;
  const currentFat = food.fatPer100 * ratio;

  const handleAdd = async () => {
    if (!targetMealId || actualGrams <= 0) return;

    const newItem: FoodLogItem = {
      id: crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(),
      foodId: food.id,
      name: food.name,
      amount: isPortionMode ? inputValue : actualGrams,
      unit: (isPortionMode && hasPortion ? food.defaultUnit! : 'g') as 'g' | 'unit',
      macros: {
        kcal: currentKcal,
        proteinG: Math.round(currentPro * 10) / 10,
        carbsG: Math.round(currentCarbs * 10) / 10,
        fatG: Math.round(currentFat * 10) / 10,
      }
    };

    await addFoodToMeal(targetMealId, newItem);
    onClose();
    navigate('/'); // Ritorna al diario
  };

  return createPortal(
    <div className="fixed inset-0 z-[100] flex flex-col justify-end bg-black/70 backdrop-blur-sm">
      <div className="bg-[#121215]/95 backdrop-blur-2xl rounded-t-3xl border-t border-white/[0.08] p-6 pb-safe-overlay animate-in slide-in-from-bottom-full duration-300 shadow-[0_-12px_40px_rgba(0,0,0,0.75)] tabular-nums">
        
        <div className="w-10 h-1 bg-zinc-700/80 rounded-full mx-auto -mt-2 mb-4" />

        {/* Header */}
        <div className="flex justify-between items-start mb-4">
          <div className="min-w-0 pr-3">
            <h3 className="text-lg font-semibold tracking-tight text-zinc-100 leading-snug truncate">{food.name}</h3>
            {food.brand && <p className="text-xs text-zinc-400 mt-0.5">{food.brand}</p>}
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 bg-[#18181c] border border-white/[0.06] rounded-xl flex items-center justify-center text-zinc-400 hover:text-zinc-100 shrink-0 transition-colors"
          >
            <X size={17} strokeWidth={1.75} />
          </button>
        </div>

        {/* Toggle Porzione se disponibile */}
        {hasPortion && (
          <div className="flex bg-[#09090b] rounded-xl p-1 mb-5 border border-white/[0.06]">
            <button 
              className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition-all ${!isPortionMode ? 'bg-zinc-100 text-zinc-950 font-semibold shadow-sm' : 'text-zinc-400 hover:text-zinc-200'}`}
              onClick={() => setIsPortionMode(false)}
            >
              Grammi
            </button>
            <button 
              className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition-all ${isPortionMode ? 'bg-zinc-100 text-zinc-950 font-semibold shadow-sm' : 'text-zinc-400 hover:text-zinc-200'}`}
              onClick={() => setIsPortionMode(true)}
            >
              Porzione ({food.defaultUnit})
            </button>
          </div>
        )}

        {/* Display Live Macros */}
        <div className="bg-[#18181c] rounded-2xl p-4 mb-5 border border-white/[0.06]">
          <div className="flex items-end justify-between mb-3.5 border-b border-white/[0.05] pb-3.5">
            <div>
              <div className="text-xs text-zinc-400 font-medium mb-0.5">Quantità</div>
              <div className="text-3xl font-semibold tracking-tight text-zinc-100 flex items-baseline gap-1">
                {amountStr || '0'} <span className="text-sm text-zinc-500 font-normal">{isPortionMode && hasPortion ? food.defaultUnit : 'g'}</span>
              </div>
              {isPortionMode && hasPortion && (
                <div className="text-xs text-zinc-500 mt-0.5">({Math.round(actualGrams)}g totali)</div>
              )}
            </div>
            <div className="text-right">
              <div className="text-xs text-zinc-400 font-medium mb-0.5">Energia</div>
              <div className="text-2xl font-semibold tracking-tight text-zinc-100">
                {Math.round(currentKcal)} <span className="text-xs text-zinc-500 font-normal">kcal</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2.5">
            <div className="bg-[#121215] border border-white/[0.05] rounded-xl p-2.5">
              <div className="flex items-center gap-1.5 mb-1">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                <span className="text-xs text-zinc-400 font-medium">Proteine</span>
              </div>
              <div className="text-sm font-semibold text-zinc-100">{Math.round(currentPro * 10) / 10}g</div>
            </div>
            <div className="bg-[#121215] border border-white/[0.05] rounded-xl p-2.5">
              <div className="flex items-center gap-1.5 mb-1">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                <span className="text-xs text-zinc-400 font-medium">Carbo</span>
              </div>
              <div className="text-sm font-semibold text-zinc-100">{Math.round(currentCarbs * 10) / 10}g</div>
            </div>
            <div className="bg-[#121215] border border-white/[0.05] rounded-xl p-2.5">
              <div className="flex items-center gap-1.5 mb-1">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                <span className="text-xs text-zinc-400 font-medium">Grassi</span>
              </div>
              <div className="text-sm font-semibold text-zinc-100">{Math.round(currentFat * 10) / 10}g</div>
            </div>
          </div>
        </div>

        {/* Numpad */}
        <div className="mb-5">
          <CustomNumpad value={amountStr} onChange={setAmountStr} maxLength={5} />
        </div>

        {/* Azione */}
        <Button 
          fullWidth 
          variant="primary" 
          size="lg" 
          onClick={handleAdd}
          disabled={actualGrams <= 0 || !targetMealId}
        >
          <Check className="mr-2" size={18} strokeWidth={2} />
          Aggiungi al diario
        </Button>
      </div>
    </div>,
    document.body
  );
};

export default AddFoodDrawer;
