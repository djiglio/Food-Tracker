import React, { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useUserStore } from '@/store/userStore';
import { useDiaryStore } from '@/store/diaryStore';
import { getMacroTargetForDate } from '@/core/metabolism';
import { ChevronLeft, ChevronRight, Plus, Copy, Trash2, Calendar, X, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import CustomNumpad from '@/components/ui/CustomNumpad';
import { CopyMealModal } from './CopyMealModal';
import { FoodLogItem } from '@/services/db';

const triggerHaptic = (ms = 15) => {
  if (typeof navigator !== 'undefined' && navigator.vibrate) {
    navigator.vibrate(ms);
  }
};

export const DiaryDashboard: React.FC = () => {
  const navigate = useNavigate();
  const profile = useUserStore((state) => state.profile);
  const getActiveTarget = useUserStore((state) => state.getActiveTarget);
  
  const currentDate = useDiaryStore((state) => state.currentDate);
  const setCurrentDate = useDiaryStore((state) => state.setCurrentDate);
  const loadDay = useDiaryStore((state) => state.loadDay);
  const dayRecord = useDiaryStore((state) => state.dayRecord);
  const isLoading = useDiaryStore((state) => state.isLoading);
  const removeFoodFromMeal = useDiaryStore((state) => state.removeFoodFromMeal);
  const updateFoodInMeal = useDiaryStore((state) => state.updateFoodInMeal);
  const copyMealFromHistory = useDiaryStore((state) => state.copyMealFromHistory);

  // Edit Item State (Long Press)
  const [editingItem, setEditingItem] = useState<{ mealId: string, item: FoodLogItem } | null>(null);
  const [editingAmountStr, setEditingAmountStr] = useState<string>('');
  const pressTimer = useRef<NodeJS.Timeout | null>(null);

  const handlePressStart = (mealId: string, item: FoodLogItem) => {
    pressTimer.current = setTimeout(() => {
      triggerHaptic(50);
      setEditingItem({ mealId, item });
      setEditingAmountStr(item.amount.toString());
    }, 400); // 400ms hold
  };

  const handlePressEnd = () => {
    if (pressTimer.current) {
      clearTimeout(pressTimer.current);
      pressTimer.current = null;
    }
  };

  const handleSaveItemEdit = () => {
    if (!editingItem) return;
    const newAmount = parseFloat(editingAmountStr);
    if (isNaN(newAmount) || newAmount <= 0) {
      setEditingItem(null);
      return;
    }
    
    const oldAmount = editingItem.item.amount;
    const ratio = newAmount / oldAmount;

    const updatedItem = {
      ...editingItem.item,
      amount: newAmount,
      macros: {
        kcal: editingItem.item.macros.kcal * ratio,
        proteinG: editingItem.item.macros.proteinG * ratio,
        carbsG: editingItem.item.macros.carbsG * ratio,
        fatG: editingItem.item.macros.fatG * ratio,
      }
    };

    triggerHaptic(20);
    updateFoodInMeal(editingItem.mealId, updatedItem);
    setEditingItem(null);
  };

  // Modal State
  const [copyModalOpen, setCopyModalOpen] = useState(false);
  const [copyTargetMeal, setCopyTargetMeal] = useState<{id: string, name: string} | null>(null);

  // Ottieni il target storico valido per il giorno visualizzato
  const activeTarget = getActiveTarget(currentDate);

  useEffect(() => {
    if (profile && activeTarget) {
      loadDay(currentDate, activeTarget.id);
    }
  }, [currentDate, profile, activeTarget, loadDay]);

  if (!profile || !activeTarget) {
    return (
      <div className="flex items-center justify-center h-full p-4 text-center">
        <p className="text-zinc-500">Completa il setup del profilo per sbloccare il diario.</p>
      </div>
    );
  }

  // --- Date Navigation ---
  const handlePrevDay = () => {
    triggerHaptic(10);
    const d = new Date(currentDate);
    d.setDate(d.getDate() - 1);
    setCurrentDate(d.toISOString().split('T')[0]);
  };

  const handleNextDay = () => {
    triggerHaptic(10);
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
    <div className="flex flex-col space-y-5">
      
      {/* Header Fissato: Selettore Data */}
      <div className="sticky top-0 z-40 glass-header px-4 pb-3 flex justify-between items-center pt-safe">
        <button
          onClick={handlePrevDay}
          className="p-2 text-zinc-400 hover:text-zinc-100 active:scale-95 bg-[#161619] border border-white/[0.06] rounded-xl transition-all"
        >
          <ChevronLeft size={18} strokeWidth={1.75} />
        </button>
        <div className="flex items-center gap-2">
          <div className="font-semibold text-[16px] tracking-tight text-zinc-100 capitalize">
            {new Date(currentDate).toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric', month: 'long' })}
          </div>
          <button 
            onClick={() => {
              triggerHaptic(10);
              setCurrentDate(new Date().toISOString().split('T')[0]);
            }}
            className={`p-1.5 rounded-lg transition-all active:scale-95 border ${
              currentDate === new Date().toISOString().split('T')[0]
                ? 'bg-zinc-100 text-zinc-950 border-zinc-100'
                : 'bg-[#161619] text-zinc-400 hover:text-zinc-100 border-white/[0.06]'
            }`}
            title="Vai a oggi"
          >
            <Calendar size={14} strokeWidth={2} />
          </button>
        </div>
        <button 
          onClick={handleNextDay} 
          className="p-2 text-zinc-400 hover:text-zinc-100 active:scale-95 bg-[#161619] border border-white/[0.06] rounded-xl transition-all"
        >
          <ChevronRight size={18} strokeWidth={1.75} />
        </button>
      </div>

      <div className="px-4 space-y-4 pb-6">
        
        {/* Loader visivo morbido */}
        {isLoading && <div className="h-0.5 bg-zinc-800 rounded overflow-hidden"><div className="h-full bg-zinc-300 animate-pulse w-1/3"></div></div>}

        {/* Dashboard Compliance Kcal & Macros (Hero Card) */}
        <Card className="relative overflow-hidden">
          <CardContent className="p-5">
            <div className="flex justify-between items-end pb-5 mb-5 border-b border-white/[0.05]">
              <div>
                <div className="text-[13px] font-medium text-zinc-400 tracking-tight mb-1">Calorie consumate</div>
                <div className="flex items-baseline gap-1.5 tabular-nums">
                  <span className="text-4xl font-semibold tracking-tight text-zinc-100">{Math.round(consumedKcal)}</span>
                  <span className="text-zinc-500 text-sm font-medium">/ {dailyTarget.kcal} kcal</span>
                </div>
              </div>
              <div className="text-right tabular-nums">
                <div className="text-[12px] font-medium text-zinc-500 mb-1">Rimanenti</div>
                <div className={`text-xl font-semibold tracking-tight ${dailyTarget.kcal - consumedKcal < 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                  {Math.round(dailyTarget.kcal - consumedKcal)} <span className="text-xs font-normal text-zinc-500">kcal</span>
                </div>
              </div>
            </div>

            {/* 3-Column Segmented Macro Track */}
            <div className="grid grid-cols-3 gap-4">
              <MacroColumn
                label="Proteine"
                dotColor="bg-indigo-400"
                barColor="bg-indigo-400"
                consumed={consumedPro}
                target={dailyTarget.proteinG}
              />
              <MacroColumn
                label="Carboidrati"
                dotColor="bg-amber-400"
                barColor="bg-amber-400"
                consumed={consumedCarb}
                target={dailyTarget.carbsG}
              />
              <MacroColumn
                label="Grassi"
                dotColor="bg-rose-400"
                barColor="bg-rose-400"
                consumed={consumedFat}
                target={dailyTarget.fatG}
              />
            </div>
          </CardContent>
        </Card>

        {/* Lista Pasti (Stile iOS Grouped List con azioni integrate nell'header) */}
        <div className="space-y-3.5">
          {meals.map((mealConfig) => {
            const mealTargetKcal = Math.round(dailyTarget.kcal * mealConfig.percentage);
            const mealData = dayRecord?.meals[mealConfig.id];
            const items = mealData?.items || [];
            const mealKcal = items.reduce((acc, item) => acc + item.macros.kcal, 0);
            const mealPro = items.reduce((acc, item) => acc + item.macros.proteinG, 0);
            const mealCarb = items.reduce((acc, item) => acc + item.macros.carbsG, 0);
            const mealFat = items.reduce((acc, item) => acc + item.macros.fatG, 0);

            return (
              <Card key={mealConfig.id}>
                <CardContent className="p-0">
                  {/* Header Pasto con Macro Pills neutre e Azioni Integrate */}
                  <div className="px-4 py-3.5 flex justify-between items-center border-b border-white/[0.05] bg-[#161619]/60">
                    <div className="space-y-1.5 min-w-0 pr-2">
                      <div className="flex items-baseline gap-2">
                        <h3 className="font-semibold text-[16px] tracking-tight text-zinc-100 truncate">{mealConfig.name}</h3>
                        <span className="text-[12px] text-zinc-500 font-medium tabular-nums shrink-0">
                          {Math.round(mealKcal)} / {mealTargetKcal} kcal
                        </span>
                      </div>
                      {/* Macro Pills sobrie con micro-pallini colorati */}
                      <div className="flex flex-wrap items-center gap-1.5 tabular-nums">
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-medium bg-[#09090b]/60 text-zinc-300 border border-white/[0.05]">
                          <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                          {Math.round(mealPro)}g P
                        </span>
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-medium bg-[#09090b]/60 text-zinc-300 border border-white/[0.05]">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                          {Math.round(mealCarb)}g C
                        </span>
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-medium bg-[#09090b]/60 text-zinc-300 border border-white/[0.05]">
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                          {Math.round(mealFat)}g F
                        </span>
                      </div>
                    </div>

                    {/* Azioni Pasto Integrate nell'Header */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        title="Clona pasto"
                        onClick={() => {
                          triggerHaptic(15);
                          setCopyTargetMeal({ id: mealConfig.id, name: mealConfig.name });
                          setCopyModalOpen(true);
                        }}
                        className="w-8 h-8 rounded-full bg-zinc-800/70 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-100 border border-white/[0.06] flex items-center justify-center active:scale-95 transition-all"
                      >
                        <Copy size={14} strokeWidth={1.75} />
                      </button>
                      <button
                        type="button"
                        title="Aggiungi alimento"
                        onClick={() => {
                          triggerHaptic(15);
                          navigate(`/search?meal=${mealConfig.id}`);
                        }}
                        className="w-8 h-8 rounded-full bg-zinc-100 hover:bg-white text-zinc-950 flex items-center justify-center active:scale-95 transition-all shadow-sm"
                      >
                        <Plus size={16} strokeWidth={2.25} />
                      </button>
                    </div>
                  </div>

                  {/* Lista Alimenti Stile iOS Grouped List */}
                  <div className="divide-y divide-white/[0.04] overflow-hidden">
                    <AnimatePresence initial={false} mode="popLayout">
                      {items.length === 0 ? (
                        <motion.button
                          key="empty"
                          type="button"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          onClick={() => {
                            triggerHaptic(12);
                            navigate(`/search?meal=${mealConfig.id}`);
                          }}
                          className="w-full py-3.5 px-4 text-left text-[13px] text-zinc-500 hover:text-zinc-400 hover:bg-white/[0.01] transition-colors flex items-center justify-between"
                        >
                          <span>Nessun alimento registrato</span>
                          <span className="text-[11px] font-medium text-zinc-600">Tocca + per aggiungere</span>
                        </motion.button>
                      ) : (
                        items.map(item => (
                          <motion.div 
                            key={item.id}
                            layout
                            initial={{ opacity: 0, y: -6, scale: 0.98 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, x: -20, scale: 0.96 }}
                            transition={{ type: 'spring', stiffness: 420, damping: 32 }}
                            className="flex justify-between items-center px-4 py-3 hover:bg-white/[0.02] active:bg-white/[0.04] transition-colors group select-none touch-pan-y"
                            onPointerDown={() => handlePressStart(mealConfig.id, item)}
                            onPointerUp={handlePressEnd}
                            onPointerLeave={handlePressEnd}
                            onPointerCancel={handlePressEnd}
                            onContextMenu={(e) => {
                              if (('ontouchstart' in window) || navigator.maxTouchPoints > 0) {
                                e.preventDefault();
                              }
                            }}
                          >
                            <div className="min-w-0 pr-3">
                              <div className="font-medium text-[14px] text-zinc-100 truncate">{item.name}</div>
                              <div className="text-[12px] text-zinc-500 tabular-nums mt-0.5">
                                <span className="font-medium text-zinc-300">{item.amount}{item.unit === 'g' ? 'g' : ` ${item.unit}`}</span>
                                <span className="mx-1.5 text-zinc-700">·</span>
                                <span>{Math.round(item.macros.proteinG * 10) / 10}P</span>
                                <span className="mx-1 text-zinc-700">·</span>
                                <span>{Math.round(item.macros.carbsG * 10) / 10}C</span>
                                <span className="mx-1 text-zinc-700">·</span>
                                <span>{Math.round(item.macros.fatG * 10) / 10}F</span>
                              </div>
                            </div>
                            <div className="flex items-center gap-2.5 shrink-0 tabular-nums">
                              <span className="font-semibold text-[14px] text-zinc-200">{Math.round(item.macros.kcal)} <span className="text-[11px] font-normal text-zinc-500">kcal</span></span>
                              <button 
                                onClick={() => {
                                  triggerHaptic(20);
                                  removeFoodFromMeal(mealConfig.id, item.id);
                                }}
                                className="text-zinc-600 hover:text-rose-400 active:scale-90 transition-all p-1 -mr-1 rounded-md"
                              >
                                <Trash2 size={15} strokeWidth={1.75} />
                              </button>
                            </div>
                          </motion.div>
                        ))
                      )}
                    </AnimatePresence>
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
            triggerHaptic(25);
            await copyMealFromHistory(date, sourceId, copyTargetMeal.id);
          }}
        />
      )}

      {editingItem && createPortal(
        <div className="fixed inset-0 z-[120] flex flex-col justify-end bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#121215] rounded-t-2xl border-t border-white/[0.08] p-6 pb-safe-overlay animate-in slide-in-from-bottom-full duration-300">
            
            <div className="flex justify-between items-start mb-6">
              <div>
                <h3 className="text-lg font-semibold tracking-tight text-zinc-100">Modifica quantità</h3>
                <div className="text-sm text-zinc-400">{editingItem.item.name}</div>
              </div>
              <button 
                onClick={() => setEditingItem(null)} 
                className="p-2 bg-zinc-900 rounded-full text-zinc-400 hover:text-zinc-100 transition-colors"
              >
                <X size={18} strokeWidth={1.75} />
              </button>
            </div>

            <div className="bg-[#09090b] rounded-2xl p-4 mb-6 border border-white/[0.06] flex items-center justify-center min-h-[96px] relative tabular-nums">
              <div className="text-4xl font-semibold text-zinc-100 tracking-tight">
                {editingAmountStr || '0'}
              </div>
              <span className="absolute right-4 bottom-4 text-zinc-500 text-sm font-medium">{editingItem.item.unit}</span>
            </div>

            <div className="mb-6">
              <CustomNumpad 
                value={editingAmountStr} 
                onChange={setEditingAmountStr} 
                maxLength={6} 
              />
            </div>

            <Button 
              variant="primary" 
              fullWidth 
              size="lg" 
              onClick={handleSaveItemEdit}
            >
              <Check className="mr-2" size={18} />
              Salva modifiche
            </Button>
          </div>
        </div>,
        document.body
      )}

    </div>
  );
};

// --- Componente Utility: Colonna Macro Compatta ---
const MacroColumn = ({
  label,
  dotColor,
  barColor,
  consumed,
  target,
}: {
  label: string;
  dotColor: string;
  barColor: string;
  consumed: number;
  target: number;
}) => {
  const percentage = Math.min(100, Math.max(0, (consumed / target) * 100)) || 0;
  const isOver = consumed > target;

  return (
    <div className="space-y-2 tabular-nums">
      <div className="flex items-center gap-1.5">
        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dotColor}`} />
        <span className="text-[12px] font-medium text-zinc-400 tracking-tight truncate">{label}</span>
      </div>
      <div className="flex items-baseline gap-1">
        <span className={`text-[15px] font-semibold tracking-tight ${isOver ? 'text-rose-400' : 'text-zinc-100'}`}>
          {Math.round(consumed)}
        </span>
        <span className="text-[11px] text-zinc-500 font-normal">/ {target}g</span>
      </div>
      <div className="h-1.5 w-full bg-[#09090b] rounded-full overflow-hidden border border-white/[0.03]">
        <div
          className={`h-full rounded-full transition-all duration-500 ease-out ${isOver ? 'bg-rose-400' : barColor}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
};

export default DiaryDashboard;
