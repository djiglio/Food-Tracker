import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useUserStore } from '@/store/userStore';
import { useDiaryStore } from '@/store/diaryStore';
import { getMacroTargetForDate } from '@/core/metabolism';
import { ChevronLeft, ChevronRight, Plus, Droplet, Scale, Copy, Trash2 } from 'lucide-react';
import { NumpadInput } from '@/components/ui/NumpadInput';
import { CopyMealModal } from './CopyMealModal';
import { getWeightLogs, saveWeightLog } from '@/services/db';

export const DiaryDashboard: React.FC = () => {
  const navigate = useNavigate();
  const profile = useUserStore((state) => state.profile);
  const getActiveTarget = useUserStore((state) => state.getActiveTarget);
  
  const currentDate = useDiaryStore((state) => state.currentDate);
  const setCurrentDate = useDiaryStore((state) => state.setCurrentDate);
  const loadDay = useDiaryStore((state) => state.loadDay);
  const dayRecord = useDiaryStore((state) => state.dayRecord);
  const isLoading = useDiaryStore((state) => state.isLoading);
  const addWater = useDiaryStore((state) => state.addWater);
  const removeFoodFromMeal = useDiaryStore((state) => state.removeFoodFromMeal);
  const copyMealFromHistory = useDiaryStore((state) => state.copyMealFromHistory);

  // Modal State
  const [copyModalOpen, setCopyModalOpen] = useState(false);
  const [copyTargetMeal, setCopyTargetMeal] = useState<{id: string, name: string} | null>(null);

  // Weight State
  const [dayWeight, setDayWeight] = useState<number | null>(null);
  const [isLoggingWeight, setIsLoggingWeight] = useState(false);
  const [newWeightStr, setNewWeightStr] = useState('');

  // Ottieni il target storico valido per il giorno visualizzato
  const activeTarget = getActiveTarget(currentDate);

  const fetchWeight = async (dateStr: string) => {
    const logs = await getWeightLogs();
    const log = logs.find(l => l.date === dateStr);
    setDayWeight(log ? log.weightKg : null);
  };

  useEffect(() => {
    if (profile && activeTarget) {
      loadDay(currentDate, activeTarget.id);
      fetchWeight(currentDate);
      setIsLoggingWeight(false);
      setNewWeightStr('');
    }
  }, [currentDate, profile, activeTarget, loadDay]);

  const handleSaveWeight = async () => {
    const w = parseFloat(newWeightStr);
    if (w > 0) {
      await saveWeightLog(currentDate, w);
      setDayWeight(w);
      setIsLoggingWeight(false);
    }
  };

  if (!profile || !activeTarget) {
    return (
      <div className="flex items-center justify-center h-full p-4 text-center">
        <p className="text-zinc-500">Completa il setup del profilo per sbloccare il diario.</p>
      </div>
    );
  }

  // --- Date Navigation ---
  const handlePrevDay = () => {
    const d = new Date(currentDate);
    d.setDate(d.getDate() - 1);
    setCurrentDate(d.toISOString().split('T')[0]);
  };

  const handleNextDay = () => {
    const d = new Date(currentDate);
    d.setDate(d.getDate() + 1);
    setCurrentDate(d.toISOString().split('T')[0]);
  };

  // --- Calcolo Compliance ---
  let consumedKcal = 0;
  let consumedPro = 0;
  let consumedCarb = 0;
  let consumedFat = 0;

  if (dayRecord) {
    Object.values(dayRecord.meals).forEach(meal => {
      meal.items.forEach(item => {
        consumedKcal += item.macros.kcal;
        consumedPro += item.macros.proteinG;
        consumedCarb += item.macros.carbsG;
        consumedFat += item.macros.fatG;
      });
    });
  }

  const { meals } = activeTarget;
  const dailyTarget = getMacroTargetForDate(activeTarget, currentDate);

  // --- Rendering ---
  return (
    <div className="flex flex-col space-y-6">
      
      {/* Header Fissato: Selettore Data */}
      <div className="sticky top-0 z-40 bg-zinc-950/80 backdrop-blur-xl border-b border-zinc-900 px-4 pb-3 flex justify-between items-center" style={{ paddingTop: 'max(env(safe-area-inset-top), 16px)' }}>
        <button onClick={handlePrevDay} className="p-2 text-zinc-400 hover:text-white active:scale-95 bg-zinc-900 rounded-full">
          <ChevronLeft size={20} />
        </button>
        <div className="font-bold text-lg text-white">
          {new Date(currentDate).toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' })}
        </div>
        <button 
          onClick={handleNextDay} 
          disabled={currentDate >= new Date().toISOString().split('T')[0]} 
          className="p-2 text-zinc-400 hover:text-white active:scale-95 bg-zinc-900 rounded-full disabled:opacity-30 disabled:pointer-events-none"
        >
          <ChevronRight size={20} />
        </button>
      </div>

      <div className="px-4 space-y-6 pb-6">
        
        {/* Loader visivo morbido */}
        {isLoading && <div className="h-1 bg-brand-primary/20 rounded overflow-hidden"><div className="h-full bg-brand-primary animate-pulse w-1/3"></div></div>}

        {/* Dashboard Compliance Kcal & Macros */}
        <Card className="border-zinc-800/80 bg-zinc-900/60 shadow-lg relative overflow-hidden">
          <CardContent className="p-6">
            <div className="flex justify-between items-end mb-6">
              <div>
                <div className="text-sm font-semibold text-zinc-400 uppercase tracking-widest mb-1">Calorie (Kcal)</div>
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-black text-white">{Math.round(consumedKcal)}</span>
                  <span className="text-zinc-500 font-medium">/ {dailyTarget.kcal}</span>
                </div>
              </div>
              <div className="text-right">
                <div className="text-xs text-zinc-500 mb-1">Rimanenti</div>
                <div className={`text-xl font-bold ${dailyTarget.kcal - consumedKcal < 0 ? 'text-red-500' : 'text-brand-primary'}`}>
                  {Math.round(dailyTarget.kcal - consumedKcal)}
                </div>
              </div>
            </div>

            {/* Macro Bars */}
            <div className="space-y-4">
              <MacroBar label="Proteine" color="bg-violet-500" consumed={consumedPro} target={dailyTarget.proteinG} />
              <MacroBar label="Carboidrati" color="bg-amber-500" consumed={consumedCarb} target={dailyTarget.carbsG} />
              <MacroBar label="Grassi" color="bg-rose-500" consumed={consumedFat} target={dailyTarget.fatG} />
            </div>
          </CardContent>
        </Card>

        {/* Water & Weight Tracker */}
        <div className="grid grid-cols-2 gap-3">
          {/* Water Tracker */}
          <Card className="border-blue-900/30 bg-blue-950/10">
            <CardContent className="p-3">
              <div className="flex items-center gap-2 mb-3">
                <div className="bg-blue-500/20 p-2 rounded-full text-blue-500">
                  <Droplet size={16} />
                </div>
                <div>
                  <div className="text-[10px] text-blue-400/70 font-semibold uppercase tracking-wider">Idratazione</div>
                  <div className="text-lg font-bold text-white leading-none">{dayRecord?.waterConsumedMl || 0} <span className="text-xs text-zinc-500">ml</span></div>
                </div>
              </div>
              <div className="flex gap-1">
                <button onClick={() => addWater(250)} className="flex-1 bg-blue-900/50 hover:bg-blue-800 border border-blue-800 text-blue-300 font-bold py-1.5 rounded-lg text-xs active:scale-95 transition-all">+250</button>
                <button onClick={() => addWater(500)} className="flex-1 bg-blue-900/50 hover:bg-blue-800 border border-blue-800 text-blue-300 font-bold py-1.5 rounded-lg text-xs active:scale-95 transition-all">+500</button>
              </div>
            </CardContent>
          </Card>

          {/* Weight Tracker */}
          <Card className="border-brand-primary/30 bg-brand-primary/5">
            <CardContent className="p-3">
              <div className="flex items-center gap-2 mb-3">
                <div className="bg-brand-primary/20 p-2 rounded-full text-brand-primary">
                  <Scale size={16} />
                </div>
                <div>
                  <div className="text-[10px] text-brand-primary/70 font-semibold uppercase tracking-wider">Peso</div>
                  <div className="text-lg font-bold text-white leading-none">
                    {dayWeight ? dayWeight : '--'} <span className="text-xs text-zinc-500">kg</span>
                  </div>
                </div>
              </div>
              
              {!isLoggingWeight ? (
                <button 
                  onClick={() => setIsLoggingWeight(true)} 
                  className="w-full bg-brand-primary/20 hover:bg-brand-primary/30 border border-brand-primary/50 text-brand-primary font-bold py-1.5 rounded-lg text-xs active:scale-95 transition-all"
                >
                  Modifica
                </button>
              ) : (
                <div className="flex gap-1">
                  <NumpadInput 
                    value={newWeightStr}
                    onChange={(val) => setNewWeightStr(val)}
                    placeholder="kg"
                    className="w-14 bg-zinc-900 border border-zinc-700 text-white text-xs px-1 py-1 rounded-lg text-center"
                  />
                  <button 
                    onClick={handleSaveWeight} 
                    disabled={!newWeightStr}
                    className="flex-1 bg-brand-primary text-black font-bold py-1 rounded-lg text-xs active:scale-95 transition-all"
                  >
                    OK
                  </button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Lista Pasti */}
        <div className="space-y-4">
          {meals.map((mealConfig) => {
            const mealTargetKcal = Math.round(dailyTarget.kcal * mealConfig.percentage);
            const mealData = dayRecord?.meals[mealConfig.id];
            const items = mealData?.items || [];
            const mealKcal = items.reduce((acc, item) => acc + item.macros.kcal, 0);

            return (
              <Card key={mealConfig.id} className="border-zinc-800/80 bg-zinc-900/40">
                <CardContent className="p-0">
                  {/* Header Pasto */}
                  <div className="p-4 flex justify-between items-center border-b border-zinc-800/50">
                    <div>
                      <h3 className="font-bold text-lg">{mealConfig.name}</h3>
                      <div className="text-xs text-zinc-500 font-medium">Target: {mealTargetKcal} kcal</div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-white">{Math.round(mealKcal)} kcal</div>
                    </div>
                  </div>

                  {/* Lista Alimenti */}
                  <div className="p-2 space-y-1">
                    {items.length === 0 ? (
                      <div className="p-4 text-center text-sm text-zinc-600 italic">Nessun alimento.</div>
                    ) : (
                      items.map(item => (
                        <div key={item.id} className="flex justify-between items-center p-3 hover:bg-zinc-800/30 rounded-xl transition-colors group">
                          <div>
                            <div className="font-medium text-sm text-zinc-200">{item.name}</div>
                            <div className="text-[11px] text-zinc-500">{item.amount}{item.unit} • P: {item.macros.proteinG}g C: {item.macros.carbsG}g F: {item.macros.fatG}g</div>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="font-semibold text-sm">{Math.round(item.macros.kcal)}</span>
                            <button 
                              onClick={() => removeFoodFromMeal(mealConfig.id, item.id)}
                              className="text-zinc-600 hover:text-red-500 p-1 rounded-md"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Azioni Pasto */}
                  <div className="p-2 flex gap-2">
                    <Button 
                      variant="ghost" 
                      className="flex-1 text-brand-primary hover:text-brand-primary bg-brand-primary/5 hover:bg-brand-primary/10"
                      onClick={() => navigate(`/search?meal=${mealConfig.id}`)}
                    >
                      <Plus size={16} className="mr-2" /> Aggiungi
                    </Button>
                    <Button 
                      variant="ghost" 
                      className="flex-1 text-zinc-400 bg-zinc-800/30 hover:bg-zinc-800"
                      onClick={() => { setCopyTargetMeal({ id: mealConfig.id, name: mealConfig.name }); setCopyModalOpen(true); }}
                    >
                      <Copy size={16} className="mr-2" /> Clona Pasto
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Copy Modal */}
      {copyTargetMeal && (
        <CopyMealModal 
          isOpen={copyModalOpen}
          onClose={() => setCopyModalOpen(false)}
          targetMealId={copyTargetMeal.id}
          targetMealName={copyTargetMeal.name}
          onConfirmCopy={async (date, sourceId) => {
            await copyMealFromHistory(date, sourceId, copyTargetMeal.id);
          }}
        />
      )}

    </div>
  );
};

// --- Componente Utility: Barra Macro ---
const MacroBar = ({ label, color, consumed, target }: { label: string, color: string, consumed: number, target: number }) => {
  const percentage = Math.min(100, Math.max(0, (consumed / target) * 100)) || 0;
  const isOver = consumed > target;

  return (
    <div>
      <div className="flex justify-between text-[11px] font-semibold tracking-wider uppercase mb-1.5">
        <span className="text-zinc-400">{label}</span>
        <span className={isOver ? 'text-red-400' : 'text-zinc-300'}>
          {Math.round(consumed)} / {target}g
        </span>
      </div>
      <div className="h-2 w-full bg-zinc-800/80 rounded-full overflow-hidden">
        <div 
          className={`h-full rounded-full transition-all duration-500 ease-out ${isOver ? 'bg-red-500' : color}`} 
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
};

export default DiaryDashboard;
