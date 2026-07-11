import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { X, Copy, Calendar } from 'lucide-react';
import { getDayRecord } from '@/services/db';

interface CopyMealModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetMealId: string;
  targetMealName: string;
  onConfirmCopy: (sourceDate: string, sourceMealId: string) => Promise<void>;
}

const MEAL_NAMES: Record<string, string> = {
  breakfast: 'Colazione',
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
  const [sourceDate, setSourceDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 1); // Di default, cerca di clonare da ieri
    return d.toISOString().split('T')[0];
  });
  
  const recentDays = generateRecentDays(14);
  
  const [availableMeals, setAvailableMeals] = useState<{id: string, name: string, itemCount: number}[]>([]);
  const [selectedMealId, setSelectedMealId] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);

  // Fetch dei pasti della data selezionata
  const handleDateChange = async (date: string) => {
    setSourceDate(date);
    setIsLoading(true);
    try {
      const record = await getDayRecord(date);
      if (record && record.meals) {
        // Estrapola solo i pasti che contengono elementi
        const meals = Object.entries(record.meals)
          .filter(([_, mealData]) => mealData.items.length > 0)
          .map(([id, mealData]) => ({
            id,
            name: MEAL_NAMES[id] || id, // Usa il mapping in italiano
            itemCount: mealData.items.length
          }));
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
  }, [isOpen]);

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

  return (
    <div className="fixed inset-0 z-[100] flex flex-col justify-end bg-black/60 backdrop-blur-sm">
      <div className="bg-zinc-950 rounded-t-3xl border-t border-zinc-800 p-6 pb-safe animate-in slide-in-from-bottom-full duration-300">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h3 className="text-xl font-bold">Clona in "{targetMealName}"</h3>
            <p className="text-sm text-zinc-400">Importa alimenti dallo storico.</p>
          </div>
          <button onClick={onClose} className="p-2 bg-zinc-900 rounded-full text-zinc-400 hover:text-white">
            <X size={20} />
          </button>
        </div>

        <div className="space-y-6">
          
          {/* Custom Date Picker Orizzontale */}
          <div className="space-y-3">
            <label className="text-xs font-semibold text-zinc-400 uppercase flex items-center gap-2">
              <Calendar size={14} /> Giorno Sorgente
            </label>
            <div className="flex gap-2 overflow-x-auto pb-2 -mx-2 px-2 snap-x scrollbar-hide">
              {recentDays.map((dayStr) => (
                <button
                  key={dayStr}
                  onClick={() => handleDateChange(dayStr)}
                  className={`snap-center shrink-0 min-w-[70px] flex flex-col items-center justify-center p-3 rounded-2xl border transition-all active:scale-95 ${
                    sourceDate === dayStr 
                      ? 'border-brand-primary bg-brand-primary/10 text-brand-primary' 
                      : 'border-zinc-800 bg-zinc-900/50 text-zinc-400 hover:bg-zinc-800/80'
                  }`}
                >
                  <span className="text-xs font-semibold uppercase">{getDayLabel(dayStr).split(' ')[0]}</span>
                  {getDayLabel(dayStr).split(' ')[1] && (
                    <span className="text-xl font-bold mt-1 text-white">{getDayLabel(dayStr).split(' ')[1]}</span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Selettore Pasto */}
          <div className="space-y-3">
            <label className="text-xs font-semibold text-zinc-400 uppercase">
              Seleziona Pasto
            </label>
            {isLoading ? (
              <div className="text-sm text-zinc-500 py-4 text-center">Ricerca nello storico...</div>
            ) : availableMeals.length === 0 ? (
              <div className="text-sm text-amber-500 bg-amber-950/30 border border-amber-900/50 p-4 rounded-xl text-center">
                Nessun alimento registrato in questa data.
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {availableMeals.map((meal) => (
                  <button
                    key={meal.id}
                    onClick={() => setSelectedMealId(meal.id)}
                    className={`p-3 rounded-2xl border text-left flex flex-col transition-all active:scale-95 ${
                      selectedMealId === meal.id 
                        ? 'border-brand-primary bg-brand-primary/10' 
                        : 'border-zinc-800 bg-zinc-900/50 hover:bg-zinc-800'
                    }`}
                  >
                    <span className="font-bold text-sm capitalize mb-1 text-zinc-100">{meal.name}</span>
                    <span className="text-[11px] text-brand-primary/80 font-medium">{meal.itemCount} alimenti</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          
          <Button 
            fullWidth 
            variant="primary" 
            disabled={!selectedMealId || availableMeals.length === 0}
            onClick={handleCopy}
            className="mt-4"
          >
            <Copy className="mr-2" size={18} /> Importa Alimenti
          </Button>
        </div>
      </div>
    </div>
  );
};
