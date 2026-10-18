import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Button } from '@/components/ui/Button';
import { X, Copy, Calendar } from 'lucide-react';
import { getDayRecord } from '@/services/db';
import { useUserStore } from '@/store/userStore';

interface CopyMealModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetMealId: string;
  targetMealName: string;
  onConfirmCopy: (sourceDate: string, sourceMealId: string) => Promise<void>;
}

const FALLBACK_MEAL_NAMES: Record<string, string> = {
  breakfast: 'Colazione',
  snack: 'Spuntino',
  snack1: 'Spuntino 1',
  lunch: 'Pranzo',
  snack2: 'Spuntino 2',
  dinner: 'Cena'
};

const generateRecentDays = (count = 14) => {
  const days = [];
  for (let i = 0; i < count; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push(d.toISOString().split('T')[0]);
  }
  return days;
};

export const CopyMealModal: React.FC<CopyMealModalProps> = ({ 
  isOpen, onClose, targetMealId, targetMealName, onConfirmCopy 
}) => {
  const getActiveTarget = useUserStore((state) => state.getActiveTarget);
  const targetHistory = useUserStore((state) => state.targetHistory);

  const [sourceDate, setSourceDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 1); // Di default, cerca di clonare da ieri
    return d.toISOString().split('T')[0];
  });
  
  const recentDays = generateRecentDays(14);
  
  const [availableMeals, setAvailableMeals] = useState<{id: string, name: string, itemCount: number}[]>([]);
  const [selectedMealId, setSelectedMealId] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);

  const resolveMealName = (mealId: string, date: string): string => {
    // 1. Cerca nel target attivo di oggi (per usare i nomi più aggiornati scelti dall'utente)
    const todayStr = new Date().toISOString().split('T')[0];
    const currentTarget = getActiveTarget(todayStr);
    const inCurrent = currentTarget?.meals.find((m) => m.id === mealId);
    if (inCurrent) return inCurrent.name;

    // 2. Cerca nel target attivo della data sorgente
    const dateTarget = getActiveTarget(date);
    const inDateTarget = dateTarget?.meals.find((m) => m.id === mealId);
    if (inDateTarget) return inDateTarget.name;

    // 3. Cerca in tutto lo storico dei target (dal più recente al più vecchio)
    for (let i = targetHistory.length - 1; i >= 0; i--) {
      const found = targetHistory[i].meals.find((m) => m.id === mealId);
      if (found) return found.name;
    }

    // 4. Fallback
    return FALLBACK_MEAL_NAMES[mealId] || mealId;
  };

  // Fetch dei pasti della data selezionata
  const handleDateChange = async (date: string) => {
    setSourceDate(date);
    setIsLoading(true);
    try {
      const record = await getDayRecord(date);
      if (record && record.meals) {
        const todayStr = new Date().toISOString().split('T')[0];
        const referenceMeals = getActiveTarget(todayStr)?.meals || getActiveTarget(date)?.meals || [];
        const orderMap = new Map(referenceMeals.map((m, idx) => [m.id, idx]));

        // Estrapola solo i pasti che contengono elementi e ordinali secondo la configurazione utente
        const meals = Object.entries(record.meals)
          .filter(([_, mealData]) => mealData.items.length > 0)
          .map(([id, mealData]) => ({
            id,
            name: resolveMealName(id, date),
            itemCount: mealData.items.length
          }))
          .sort((a, b) => {
            const orderA = orderMap.has(a.id) ? orderMap.get(a.id)! : 999;
            const orderB = orderMap.has(b.id) ? orderMap.get(b.id)! : 999;
            return orderA - orderB;
          });

        setAvailableMeals(meals);
        
        // Se c'è lo stesso pasto nel giorno sorgente, lo pre-seleziona in automatico
        if (meals.find(m => m.id === targetMealId)) {
          setSelectedMealId(targetMealId);
        } else if (meals.length > 0) {
          setSelectedMealId(meals[0].id);
        } else {
          setSelectedMealId('');
        }
      } else {
        setAvailableMeals([]);
        setSelectedMealId('');
      }
    } catch (e) {
      console.error(e);
      setAvailableMeals([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      handleDateChange(sourceDate);
    }
  }, [isOpen, targetHistory]);

  if (!isOpen) return null;

  const handleCopy = async () => {
    if (!selectedMealId) return;
    await onConfirmCopy(sourceDate, selectedMealId);
    onClose();
  };

  const getDayLabel = (dateStr: string) => {
    const date = new Date(dateStr);
    const todayStr = new Date().toISOString().split('T')[0];
    
    const d = new Date();
    d.setDate(d.getDate() - 1);
    const yesterdayStr = d.toISOString().split('T')[0];
    
    if (dateStr === todayStr) return "Oggi";
    if (dateStr === yesterdayStr) return "Ieri";
    return date.toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric' });
  };

  return createPortal(
    <div className="fixed inset-0 z-[100] flex flex-col justify-end bg-black/70 backdrop-blur-sm">
      <div className="bg-[#121215]/95 backdrop-blur-2xl rounded-t-3xl border-t border-white/[0.08] p-6 pb-safe-overlay animate-in slide-in-from-bottom-full duration-300 shadow-[0_-12px_40px_rgba(0,0,0,0.75)] tabular-nums">
        <div className="w-10 h-1 bg-zinc-700/80 rounded-full mx-auto -mt-2 mb-4" />

        <div className="flex justify-between items-start mb-5">
          <div>
            <h3 className="text-lg font-semibold tracking-tight text-zinc-100">Clona in "{targetMealName}"</h3>
            <p className="text-xs text-zinc-500 mt-0.5">Importa gli alimenti registrati in un altro pasto</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 bg-[#18181c] border border-white/[0.06] rounded-xl flex items-center justify-center text-zinc-400 hover:text-zinc-100 transition-colors"
          >
            <X size={17} strokeWidth={1.75} />
          </button>
        </div>

        <div className="space-y-5">
          
          {/* Custom Date Picker Orizzontale */}
          <div className="space-y-2.5">
            <label className="text-xs font-medium text-zinc-400 flex items-center gap-1.5">
              <Calendar size={13.5} strokeWidth={1.75} className="text-zinc-500" /> Giorno sorgente
            </label>
            <div className="flex gap-2 overflow-x-auto pb-1 -mx-2 px-2 snap-x scrollbar-hide">
              {recentDays.map((dayStr) => {
                const isSelected = sourceDate === dayStr;
                const parts = getDayLabel(dayStr).split(' ');
                return (
                  <button
                    key={dayStr}
                    onClick={() => handleDateChange(dayStr)}
                    className={`snap-center shrink-0 min-w-[66px] flex flex-col items-center justify-center py-2.5 px-3 rounded-xl border transition-all active:scale-95 ${
                      isSelected 
                        ? 'border-zinc-100 bg-zinc-100 text-zinc-950 shadow-sm' 
                        : 'border-white/[0.06] bg-[#18181c] text-zinc-400 hover:bg-white/[0.06] hover:text-zinc-200'
                    }`}
                  >
                    <span className={`text-[11px] font-medium capitalize ${isSelected ? 'text-zinc-700' : 'text-zinc-400'}`}>
                      {parts[0]}
                    </span>
                    {parts[1] && (
                      <span className={`text-base font-semibold mt-0.5 ${isSelected ? 'text-zinc-950' : 'text-zinc-100'}`}>
                        {parts[1]}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Selettore Pasto */}
          <div className="space-y-2.5">
            <label className="text-xs font-medium text-zinc-400 block">
              Seleziona pasto da copiare
            </label>
            {isLoading ? (
              <div className="text-xs text-zinc-500 py-5 text-center">Ricerca nello storico...</div>
            ) : availableMeals.length === 0 ? (
              <div className="text-xs text-zinc-400 bg-[#18181c] border border-white/[0.06] p-4 rounded-xl text-center">
                Nessun alimento registrato in questa data.
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {availableMeals.map((meal) => {
                  const isSelected = selectedMealId === meal.id;
                  return (
                    <button
                      key={meal.id}
                      onClick={() => setSelectedMealId(meal.id)}
                      className={`p-3 rounded-xl border text-left flex flex-col transition-all active:scale-95 ${
                        isSelected 
                          ? 'border-white/[0.25] bg-white/[0.08]' 
                          : 'border-white/[0.06] bg-[#18181c] hover:bg-white/[0.04]'
                      }`}
                    >
                      <span className="font-medium text-sm text-zinc-100 mb-0.5 truncate">{meal.name}</span>
                      <span className="text-xs text-zinc-400">{meal.itemCount} {meal.itemCount === 1 ? 'alimento' : 'alimenti'}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
          
          <Button 
            fullWidth 
            variant="primary" 
            size="lg"
            disabled={!selectedMealId || availableMeals.length === 0}
            onClick={handleCopy}
          >
            <Copy className="mr-2" size={16} strokeWidth={2} /> Importa alimenti
          </Button>
        </div>
      </div>
    </div>,
    document.body
  );
};
