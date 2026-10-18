import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUserStore } from '@/store/userStore';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { ArrowLeft, Save, Activity, Calendar as CalendarIcon, Check } from 'lucide-react';
import { DailyMacroTarget } from '@/core/metabolism';
import { cn } from '@/core/utils';

const DAYS_OF_WEEK = [
  { index: 1, name: 'Lunedì' },
  { index: 2, name: 'Martedì' },
  { index: 3, name: 'Mercoledì' },
  { index: 4, name: 'Giovedì' },
  { index: 5, name: 'Venerdì' },
  { index: 6, name: 'Sabato' },
  { index: 0, name: 'Domenica' }
];

export const MacroCyclingDashboard: React.FC = () => {
  const navigate = useNavigate();
  const getActiveTarget = useUserStore(state => state.getActiveTarget);
  const addTargetVersion = useUserStore(state => state.addTargetVersion);
  
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const todayDayIndex = now.getDay();
  const activeTarget = getActiveTarget(today);

  // Se per qualche motivo non c'è un target, torna indietro
  if (!activeTarget) {
    navigate('/profile', { replace: true });
    return null;
  }

  const [isEnabled, setIsEnabled] = useState(!!activeTarget.isMacroCyclingEnabled);
  const [cyclingTargets, setCyclingTargets] = useState<Record<number, DailyMacroTarget>>(
    activeTarget.cyclingTargets || {}
  );
  
  // Stato per il giorno correntemente in modifica
  const [editingDay, setEditingDay] = useState<number | null>(null);
  const [draftMacros, setDraftMacros] = useState<{ pro: number | '', carbs: number | '', fat: number | '' }>({ pro: 0, carbs: 0, fat: 0 });

  const startEditing = (dayIndex: number) => {
    const targetForDay = cyclingTargets[dayIndex] || activeTarget.dailyTarget;
    setDraftMacros({
      pro: targetForDay.proteinG,
      carbs: targetForDay.carbsG,
      fat: targetForDay.fatG
    });
    setEditingDay(dayIndex);
  };

  const buildDraftTarget = (): DailyMacroTarget => {
    const pro = Number(draftMacros.pro) || 0;
    const carbs = Number(draftMacros.carbs) || 0;
    const fat = Number(draftMacros.fat) || 0;
    const kcal = Math.round((pro * 4) + (carbs * 4) + (fat * 9));
    return { kcal, proteinG: pro, carbsG: carbs, fatG: fat };
  };

  const saveEditing = () => {
    if (editingDay === null) return;
    const updated = buildDraftTarget();
    setCyclingTargets(prev => ({
      ...prev,
      [editingDay]: updated
    }));
    setEditingDay(null);
  };

  const handleSave = () => {
    // Se l'utente ha un giorno aperto in modifica e preme direttamente "Salva configurazione",
    // includiamo automaticamente le modifiche in corso
    const finalCyclingTargets: Record<number, DailyMacroTarget> = { ...cyclingTargets };
    if (editingDay !== null) {
      finalCyclingTargets[editingDay] = buildDraftTarget();
    }

    const configuredDays = Object.values(finalCyclingTargets);
    const updatedDailyTarget =
      isEnabled && configuredDays.length > 0
        ? finalCyclingTargets[todayDayIndex] || configuredDays[0]
        : activeTarget.dailyTarget;

    // Creiamo un nuovo TargetVersion per storicizzare la modifica
    const newTarget = {
      ...activeTarget,
      id: crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(),
      effectiveFromDate: today,
      dailyTarget: updatedDailyTarget,
      isMacroCyclingEnabled: isEnabled,
      cyclingTargets: isEnabled ? finalCyclingTargets : undefined
    };

    addTargetVersion(newTarget);
    navigate('/profile');
  };

  return (
    <div className="flex flex-col pb-8 bg-[#09090b] min-h-full">
      {/* Header Sticky */}
      <div className="flex items-center gap-3 px-4 pb-3 pt-safe glass-header sticky top-0 z-40 mb-4">
        <button
          onClick={() => navigate('/profile')}
          className="w-9 h-9 rounded-xl bg-[#121215] border border-white/[0.06] flex items-center justify-center text-zinc-400 hover:text-zinc-100 active:scale-95 transition-all"
        >
          <ArrowLeft size={18} strokeWidth={1.75} />
        </button>
        <div>
          <h1 className="text-lg font-semibold tracking-tight text-zinc-100 leading-tight">Ciclizzazione macronutrienti</h1>
          <p className="text-xs text-zinc-500">Personalizza i target per i singoli giorni della settimana</p>
        </div>
      </div>

      <div className="px-4 flex-1 overflow-y-auto space-y-5 pb-28 tabular-nums">
        
        {/* Toggle On/Off */}
        <Card>
          <CardContent className="p-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-[#18181c] border border-white/[0.06] flex items-center justify-center text-zinc-300 shrink-0">
                <Activity size={17} strokeWidth={1.75} />
              </div>
              <div>
                <div className="text-sm font-medium text-zinc-100">Abilita ciclizzazione settimanale</div>
                <div className="text-xs text-zinc-500">I giorni non modificati mantengono il fabbisogno standard.</div>
              </div>
            </div>
            <button 
              type="button"
              onClick={() => setIsEnabled(!isEnabled)}
              className={cn(
                "w-11 h-6 rounded-full transition-colors relative shrink-0",
                isEnabled ? "bg-emerald-500" : "bg-zinc-800"
              )}
            >
              <div
                className={cn(
                  "absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform",
                  isEnabled ? "translate-x-5.5 left-0" : "translate-x-0.5 left-0"
                )}
              />
            </button>
          </CardContent>
        </Card>

        {isEnabled && (
          <div className="space-y-2.5 animate-in fade-in slide-in-from-bottom-3 duration-250">
            {DAYS_OF_WEEK.map((day) => {
              const hasCustomTarget = !!cyclingTargets[day.index];
              const target = cyclingTargets[day.index] || activeTarget.dailyTarget;
              const isEditing = editingDay === day.index;

              return (
                <Card
                  key={day.index}
                  className={cn(
                    "transition-colors",
                    isEditing && "border-white/[0.16]"
                  )}
                >
                  <CardContent className="p-0">
                    {/* Intestazione Riga */}
                    <div 
                      className="px-4 py-3.5 flex items-center justify-between cursor-pointer active:scale-[0.99] transition-transform"
                      onClick={() => (isEditing ? setEditingDay(null) : startEditing(day.index))}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-[#18181c] border border-white/[0.06] flex items-center justify-center">
                          <CalendarIcon
                            size={15}
                            strokeWidth={1.75}
                            className={hasCustomTarget ? "text-zinc-100" : "text-zinc-500"}
                          />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-zinc-100">{day.name}</span>
                            {hasCustomTarget && !isEditing && (
                              <span className="text-[10px] bg-white/[0.06] border border-white/[0.08] text-zinc-300 px-1.5 py-0.5 rounded-md font-medium">
                                Personalizzato
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      {!isEditing && (
                        <div className="text-right">
                          <div className="text-sm font-semibold text-zinc-100">
                            {target.kcal} <span className="text-xs text-zinc-500 font-normal">kcal</span>
                          </div>
                          <div className="flex items-center justify-end gap-2.5 text-[11px] text-zinc-400 mt-0.5">
                            <span className="inline-flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                              {target.proteinG}g
                            </span>
                            <span className="inline-flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                              {target.carbsG}g
                            </span>
                            <span className="inline-flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                              {target.fatG}g
                            </span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Modalità Modifica Inline */}
                    {isEditing && (
                      <div className="px-4 pb-4 pt-3 border-t border-white/[0.05] animate-in slide-in-from-top-2">
                        <div className="grid grid-cols-3 gap-2.5 mb-4">
                          {[
                            {
                              key: 'pro' as const,
                              label: 'Proteine',
                              dot: 'bg-indigo-400',
                              val: draftMacros.pro,
                            },
                            {
                              key: 'carbs' as const,
                              label: 'Carbo',
                              dot: 'bg-amber-400',
                              val: draftMacros.carbs,
                            },
                            {
                              key: 'fat' as const,
                              label: 'Grassi',
                              dot: 'bg-rose-400',
                              val: draftMacros.fat,
                            },
                          ].map((m) => (
                            <div
                              key={m.key}
                              className="p-2.5 rounded-xl bg-[#18181c] border border-white/[0.06] space-y-1.5"
                            >
                              <div className="flex items-center gap-1.5">
                                <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", m.dot)} />
                                <label className="text-xs font-medium text-zinc-300">{m.label}</label>
                              </div>
                              <div className="relative">
                                <Input 
                                  type="number" 
                                  label={`${m.label} (${day.name})`}
                                  value={m.val} 
                                  onChange={(e) =>
                                    setDraftMacros((prev) => ({
                                      ...prev,
                                      [m.key]: parseInt(e.target.value) || '',
                                    }))
                                  }
                                  className="h-9 text-center font-semibold bg-[#09090b] border-white/[0.06] pr-6 rounded-lg"
                                />
                                <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-zinc-500">g</span>
                              </div>
                            </div>
                          ))}
                        </div>
                        
                        <div className="flex items-center justify-between pt-1">
                          <div className="text-xs text-zinc-400">
                            Totale calcolato:{' '}
                            <span className="font-semibold text-zinc-100 ml-1">
                              {Math.round(
                                Number(draftMacros.pro) * 4 +
                                  Number(draftMacros.carbs) * 4 +
                                  Number(draftMacros.fat) * 9
                              )}{' '}
                              kcal
                            </span>
                          </div>
                          <div className="flex gap-2">
                            {hasCustomTarget && (
                              <Button 
                                variant="danger" 
                                size="sm" 
                                onClick={() => {
                                  const newTargets = { ...cyclingTargets };
                                  delete newTargets[day.index];
                                  setCyclingTargets(newTargets);
                                  setEditingDay(null);
                                }}
                              >
                                Ripristina
                              </Button>
                            )}
                            <Button variant="primary" size="sm" onClick={saveEditing}>
                              <Check size={14} strokeWidth={2} className="mr-1" /> Applica
                            </Button>
                          </div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

      </div>
      
      {/* Footer Sticky */}
      <div className="fixed bottom-0 left-0 right-0 p-4 pb-28 bg-gradient-to-t from-[#09090b] via-[#09090b]/95 to-transparent pointer-events-none z-40">
        <div className="pointer-events-auto max-w-md mx-auto">
          <Button fullWidth variant="primary" size="lg" onClick={handleSave}>
            <Save size={17} strokeWidth={2} className="mr-2" /> Salva configurazione
          </Button>
        </div>
      </div>

    </div>
  );
};

export default MacroCyclingDashboard;
