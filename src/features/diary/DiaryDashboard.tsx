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
    <div className="flex flex-col space-y-6">
      
      {/* Header Fissato: Selettore Data */}
      <div className="sticky top-0 z-40 glass-header px-4 pb-3 flex justify-between items-center pt-safe">
        <button onClick={handlePrevDay} className="p-2 text-zinc-400 hover:text-white active:scale-95 bg-zinc-900 rounded-full">
          <ChevronLeft size={20} />
        </button>
        <div className="flex items-center gap-2">
          <div className="font-bold text-lg text-gradient">
            {new Date(currentDate).toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' })}
          </div>
          <button 
            onClick={() => {
              triggerHaptic(10);
              setCurrentDate(new Date().toISOString().split('T')[0]);
            }}
            className={`p-1.5 rounded-full transition-all active:scale-95 ${
              currentDate === new Date().toISOString().split('T')[0]
                ? 'bg-brand-primary/20 text-brand-primary ring-1 ring-brand-primary/30 shadow-[0_0_10px_rgba(16,185,129,0.2)]'
                : 'glass text-zinc-400 hover:text-white border-none'
            }`}
            title="Vai a oggi"
          >
            <Calendar size={16} />
          </button>
        </div>
        <button 
          onClick={handleNextDay} 
          className="p-2 text-zinc-400 hover:text-white transition-transform active:scale-95 glass rounded-full border-none"
        >
          <ChevronRight size={20} />
        </button>
      </div>

      <div className="px-4 space-y-6 pb-6">
        
        {/* Loader visivo morbido */}
        {isLoading && <div className="h-1 bg-brand-primary/20 rounded overflow-hidden"><div className="h-full bg-brand-primary animate-pulse w-1/3"></div></div>}

        {/* Dashboard Compliance Kcal & Macros */}
        <Card className="relative overflow-hidden">
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

        {/* Lista Pasti */}
        <div className="space-y-4">
          {meals.map((mealConfig) => {
            const mealTargetKcal = Math.round(dailyTarget.kcal * mealConfig.percentage);
            const mealData = dayRecord?.meals[mealConfig.id];
            const items = mealData?.items || [];
            const mealKcal = items.reduce((acc, item) => acc + item.macros.kcal, 0);
            const mealPro = items.reduce((acc, item) => acc + item.macros.proteinG, 0);
            const mealCarb = items.reduce((acc, item) => acc + item.macros.carbsG, 0);
            const mealFat = items.reduce((acc, item) => acc + item.macros.fatG, 0);

            return (
              <Card key={mealConfig.id} className="border-white/10 bg-zinc-900/45">
                <CardContent className="p-0">
                  {/* Header Pasto con Macro Pills */}
                  <div className="p-4 flex justify-between items-start border-b border-white/5 bg-zinc-800/30">
                    <div className="space-y-2">
                      <div>
                        <h3 className="font-bold text-lg leading-tight">{mealConfig.name}</h3>
                        <div className="text-xs text-zinc-500 font-medium mt-0.5">Target: {mealTargetKcal} kcal</div>
                      </div>
                      {/* Macro Pills del singolo pasto */}
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-violet-500/15 text-violet-300 border border-violet-500/25">
                          P: {Math.round(mealPro)}g
                        </span>
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/25">
                          C: {Math.round(mealCarb)}g
                        </span>
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/15 text-rose-300 border border-rose-500/25">
                          F: {Math.round(mealFat)}g
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-black text-lg text-white">{Math.round(mealKcal)} <span className="text-xs font-medium text-zinc-400">kcal</span></div>
                    </div>
                  </div>

                  {/* Lista Alimenti con Animazioni Framer Motion */}
                  <div className="p-2 space-y-1 overflow-hidden">
                    <AnimatePresence initial={false} mode="popLayout">
                      {items.length === 0 ? (
                        <motion.div
                          key="empty"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className="p-4 text-center text-sm text-zinc-600 italic"
                        >
                          Nessun alimento.
                        </motion.div>
                      ) : (
                        items.map(item => (
                          <motion.div 
                            key={item.id}
                            layout
                            initial={{ opacity: 0, y: -8, scale: 0.97 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, x: -24, scale: 0.95 }}
                            transition={{ type: 'spring', stiffness: 420, damping: 30 }}
                            className="flex justify-between items-center p-3 hover:bg-zinc-800/30 active:bg-zinc-800/50 rounded-xl transition-colors group select-none touch-pan-y"
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
                            <div>
                              <div className="font-medium text-sm text-zinc-200">{item.name}</div>
                              <div className="text-[11px] text-zinc-500">
                                <span className="font-bold text-zinc-300">{item.amount} {item.unit}</span> • P: {Math.round(item.macros.proteinG * 10) / 10}g C: {Math.round(item.macros.carbsG * 10) / 10}g F: {Math.round(item.macros.fatG * 10) / 10}g
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="font-semibold text-sm">{Math.round(item.macros.kcal)}</span>
                              <button 
                                onClick={() => {
                                  triggerHaptic(20);
                                  removeFoodFromMeal(mealConfig.id, item.id);
                                }}
                                className="text-zinc-600 hover:text-red-500 active:scale-90 transition-transform p-1 rounded-md"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </motion.div>
                        ))
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Azioni Pasto */}
                  <div className="p-2 flex gap-2">
                    <Button 
                      variant="ghost" 
                      className="flex-1 text-brand-primary hover:text-brand-primary bg-brand-primary/5 hover:bg-brand-primary/10"
                      onClick={() => {
                        triggerHaptic(15);
                        navigate(`/search?meal=${mealConfig.id}`);
                      }}
                    >
                      <Plus size={16} className="mr-2" /> Aggiungi
                    </Button>
                    <Button 
                      variant="ghost" 
                      className="flex-1 text-zinc-400 bg-zinc-800/30 hover:bg-zinc-800"
                      onClick={() => {
                        triggerHaptic(15);
                        setCopyTargetMeal({ id: mealConfig.id, name: mealConfig.name });
                        setCopyModalOpen(true);
                      }}
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
            triggerHaptic(25);
            await copyMealFromHistory(date, sourceId, copyTargetMeal.id);
          }}
        />
      )}

      {editingItem && createPortal(
        <div className="fixed inset-0 z-[120] flex flex-col justify-end bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-zinc-950 rounded-t-3xl border-t border-zinc-800 p-6 pb-safe-overlay animate-in slide-in-from-bottom-full duration-300">
            
            <div className="flex justify-between items-start mb-6">
              <div>
                <h3 className="text-xl font-bold text-white">Modifica Quantità</h3>
                <div className="text-sm text-zinc-400">{editingItem.item.name}</div>
              </div>
              <button 
                onClick={() => setEditingItem(null)} 
                className="p-2 bg-zinc-900 rounded-full text-zinc-400 hover:text-white transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="bg-zinc-900/50 rounded-2xl p-4 mb-6 border border-zinc-800 flex items-center justify-center min-h-[100px] relative">
              <div className="text-5xl font-black text-brand-primary tracking-tight">
                {editingAmountStr || '0'}
              </div>
              <span className="absolute right-4 bottom-4 text-zinc-500 font-bold">{editingItem.item.unit}</span>
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
              <Check className="mr-2" size={20} />
              Salva Modifiche
            </Button>
          </div>
        </div>,
        document.body
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
