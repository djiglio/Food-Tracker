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
  
  const today = new Date().toISOString().split('T')[0];
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

  const saveEditing = () => {
    if (editingDay === null) return;
    
    const pro = Number(draftMacros.pro) || 0;
    const carbs = Number(draftMacros.carbs) || 0;
    const fat = Number(draftMacros.fat) || 0;
    
    // Calcolo Kcal matematico dai grammi
    const kcal = Math.round((pro * 4) + (carbs * 4) + (fat * 9));
    
    setCyclingTargets(prev => ({
      ...prev,
      [editingDay]: {
        kcal,
        proteinG: pro,
        carbsG: carbs,
        fatG: fat
      }
    }));
    
    setEditingDay(null);
  };

  const handleSave = () => {
    // Creiamo un nuovo TargetVersion per storicizzare la modifica
    const newTarget = {
      ...activeTarget,
      id: crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(),
      effectiveFromDate: today,
      isMacroCyclingEnabled: isEnabled,
      cyclingTargets: isEnabled ? cyclingTargets : undefined
    };

    addTargetVersion(newTarget);
    navigate('/profile');
  };

  return (
    <div className="flex flex-col min-h-full bg-zinc-950 pt-safe">
      {/* Header Assoluto */}
      <div className="flex items-center gap-4 p-4 bg-zinc-950/80 backdrop-blur-md sticky top-0 z-10 border-b border-zinc-900">
        <button onClick={() => navigate('/profile')} className="p-2 -ml-2 text-zinc-400 hover:text-white transition-colors">
          <ArrowLeft size={24} />
        </button>
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white leading-none">Macro Cycling</h1>
          <p className="text-xs text-zinc-500 mt-1">Differenzia i macro per giorni</p>
        </div>
      </div>

      <div className="p-4 flex-1 overflow-y-auto space-y-6 pb-24">
        
        {/* Toggle On/Off */}
        <Card className="border-zinc-800 bg-zinc-900/50">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={cn("p-2 rounded-xl transition-colors", isEnabled ? "bg-brand-primary/20 text-brand-primary" : "bg-zinc-800 text-zinc-500")}>
                <Activity size={24} />
              </div>
              <div>
                <div className="font-bold text-white">Abilita Macro Cycling</div>
                <div className="text-xs text-zinc-500">I giorni non personalizzati useranno il target di default.</div>
              </div>
            </div>
            <button 
              onClick={() => setIsEnabled(!isEnabled)}
              className={cn("w-12 h-6 rounded-full transition-colors relative", isEnabled ? "bg-brand-primary" : "bg-zinc-700")}
            >
              <div className={cn("absolute top-1 w-4 h-4 rounded-full bg-white transition-all", isEnabled ? "left-7" : "left-1")} />
            </button>
          </CardContent>
        </Card>

        {isEnabled && (
          <div className="space-y-3 animate-in fade-in slide-in-from-bottom-4 duration-300">
            {DAYS_OF_WEEK.map((day) => {
              const hasCustomTarget = !!cyclingTargets[day.index];
              const target = cyclingTargets[day.index] || activeTarget.dailyTarget;
              const isEditing = editingDay === day.index;

              return (
                <Card key={day.index} className={cn("border-zinc-800 transition-colors", isEditing ? "border-brand-primary bg-brand-primary/5" : hasCustomTarget ? "bg-zinc-900" : "bg-zinc-900/30")}>
                  <CardContent className="p-0">
                    {/* Intestazione Riga */}
                    <div 
                      className="p-4 flex items-center justify-between cursor-pointer active:scale-[0.98] transition-transform"
                      onClick={() => isEditing ? setEditingDay(null) : startEditing(day.index)}
                    >
                      <div className="flex items-center gap-3">
                        <CalendarIcon size={18} className={hasCustomTarget ? "text-brand-primary" : "text-zinc-600"} />
                        <span className="font-bold text-white">{day.name}</span>
                        {hasCustomTarget && !isEditing && (
                          <span className="text-[10px] bg-brand-primary/20 text-brand-primary px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                            Custom
                          </span>
                        )}
                      </div>
                      {!isEditing && (
                        <div className="text-right">
                          <div className="font-bold text-white">{target.kcal} <span className="text-xs text-zinc-500 font-normal">kcal</span></div>
                          <div className="text-[10px] text-zinc-500 space-x-1">
                            <span className="text-violet-400">{target.proteinG}P</span> • 
                            <span className="text-amber-400">{target.carbsG}C</span> • 
                            <span className="text-rose-400">{target.fatG}F</span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Modalità Modifica Inline */}
                    {isEditing && (
                      <div className="p-4 pt-0 border-t border-brand-primary/20 mt-2 animate-in slide-in-from-top-2">
                        <div className="grid grid-cols-3 gap-3 mb-4 mt-4">
                          {/* PROTEINE */}
                          <div className="space-y-1 text-center">
                            <label className="text-[10px] font-bold text-violet-400 uppercase tracking-widest">Proteine</label>
                            <div className="relative">
                              <Input 
                                type="number" 
                                value={draftMacros.pro} 
                                onChange={(e) => setDraftMacros(prev => ({...prev, pro: parseInt(e.target.value) || ''}))}
                                className="text-center font-bold text-lg border-violet-900/50 pr-6"
                              />
                              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-zinc-500">g</span>
                            </div>
                          </div>
                          
                          {/* CARBO */}
                          <div className="space-y-1 text-center">
                            <label className="text-[10px] font-bold text-amber-400 uppercase tracking-widest">Carbo</label>
                            <div className="relative">
                              <Input 
                                type="number" 
                                value={draftMacros.carbs} 
                                onChange={(e) => setDraftMacros(prev => ({...prev, carbs: parseInt(e.target.value) || ''}))}
                                className="text-center font-bold text-lg border-amber-900/50 pr-6"
                              />
                              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-zinc-500">g</span>
                            </div>
                          </div>
                          
                          {/* GRASSI */}
                          <div className="space-y-1 text-center">
                            <label className="text-[10px] font-bold text-rose-400 uppercase tracking-widest">Grassi</label>
                            <div className="relative">
                              <Input 
                                type="number" 
                                value={draftMacros.fat} 
                                onChange={(e) => setDraftMacros(prev => ({...prev, fat: parseInt(e.target.value) || ''}))}
                                className="text-center font-bold text-lg border-rose-900/50 pr-6"
                              />
                              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-zinc-500">g</span>
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center justify-between mt-6">
                          <div className="text-xs text-zinc-400">
                            Calorie calcolate: <span className="font-bold text-white ml-1">{Math.round((Number(draftMacros.pro)*4) + (Number(draftMacros.carbs)*4) + (Number(draftMacros.fat)*9))} kcal</span>
                          </div>
                          <div className="flex gap-2">
                            {hasCustomTarget && (
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="text-red-400 hover:text-red-300"
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
                              <Check size={16} className="mr-1" /> Fatto
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
      
      {/* Footer Assoluto */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-zinc-950 via-zinc-950 to-transparent">
        <Button fullWidth variant="primary" size="lg" onClick={handleSave} className="shadow-xl shadow-brand-primary/20">
          <Save size={20} className="mr-2" /> Salva Impostazioni
        </Button>
      </div>

    </div>
  );
};

export default MacroCyclingDashboard;
