import React, { useState, useEffect } from 'react';
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

  return (
    <div className="fixed inset-0 z-[100] flex flex-col justify-end bg-black/60 backdrop-blur-sm">
      <div className="bg-zinc-950 rounded-t-3xl border-t border-zinc-800 p-6 pb-safe animate-in slide-in-from-bottom-full duration-300">
        
        {/* Header */}
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="text-xl font-bold text-white leading-tight pr-4">{food.name}</h3>
            {food.brand && <p className="text-sm text-brand-primary">{food.brand}</p>}
          </div>
          <button onClick={onClose} className="p-2 bg-zinc-900 rounded-full text-zinc-400 hover:text-white shrink-0">
            <X size={20} />
          </button>
        </div>

        {/* Toggle Porzione se disponibile */}
        {hasPortion && (
          <div className="flex bg-zinc-900 rounded-xl p-1 mb-6 border border-zinc-800">
            <button 
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${!isPortionMode ? 'bg-zinc-800 text-white shadow' : 'text-zinc-500 hover:text-zinc-300'}`}
              onClick={() => setIsPortionMode(false)}
            >
              Grammi
            </button>
            <button 
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${isPortionMode ? 'bg-zinc-800 text-white shadow' : 'text-zinc-500 hover:text-zinc-300'}`}
              onClick={() => setIsPortionMode(true)}
            >
              A Pezzi ({food.defaultUnit})
            </button>
          </div>
        )}

        {/* Display Live Macros */}
        <div className="bg-zinc-900/50 rounded-2xl p-4 mb-6 border border-zinc-800">
          <div className="flex items-end justify-between mb-4 border-b border-zinc-800/50 pb-4">
            <div>
              <div className="text-xs text-zinc-500 uppercase tracking-widest font-semibold mb-1">Quantità</div>
              <div className="text-3xl font-black text-white flex items-baseline gap-1">
                {amountStr || '0'} <span className="text-lg text-zinc-500 font-medium">{isPortionMode && hasPortion ? food.defaultUnit : 'g'}</span>
              </div>
              {isPortionMode && hasPortion && (
                <div className="text-xs text-zinc-500 mt-1 font-semibold">({Math.round(actualGrams)}g totali)</div>
              )}
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-brand-primary">{Math.round(currentKcal)} <span className="text-sm">kcal</span></div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 text-center">
            <div>
              <div className="text-[10px] text-violet-400 font-bold uppercase tracking-wider mb-1">Proteine</div>
              <div className="font-semibold text-white">{Math.round(currentPro * 10) / 10}g</div>
            </div>
            <div>
              <div className="text-[10px] text-amber-400 font-bold uppercase tracking-wider mb-1">Carbo</div>
              <div className="font-semibold text-white">{Math.round(currentCarbs * 10) / 10}g</div>
            </div>
            <div>
              <div className="text-[10px] text-rose-400 font-bold uppercase tracking-wider mb-1">Grassi</div>
              <div className="font-semibold text-white">{Math.round(currentFat * 10) / 10}g</div>
            </div>
          </div>
        </div>

        {/* Numpad */}
        <div className="mb-6">
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
          <Check className="mr-2" size={20} />
          Aggiungi al Diario
        </Button>
      </div>
    </div>
  );
};

export default AddFoodDrawer;
