import React, { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useUserStore } from '@/store/userStore';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Clock, Database, Share, SlidersHorizontal, ChevronRight, Cloud, LogOut, Edit2, ArrowUp, ArrowDown, Trash2, Plus, AlertTriangle, Check, X } from 'lucide-react';
import { exportAllData } from '@/core/export';
import { loginWithGoogle, logoutGoogle, auth } from '@/services/firebase';
import { MealTargetConfig, getMacroTargetForDate } from '@/core/metabolism';
import { cn } from '@/core/utils';

export const ProfileDashboard: React.FC = () => {
  const profile = useUserStore((state) => state.profile);
  const getActiveTarget = useUserStore((state) => state.getActiveTarget);
  const addTargetVersion = useUserStore((state) => state.addTargetVersion);
  const resetProfile = useUserStore((state) => state.resetProfile);
  const navigate = useNavigate();
  const [user, setUser] = React.useState(auth.currentUser);
  const [isEditingMeals, setIsEditingMeals] = useState(false);
  const [draftMeals, setDraftMeals] = useState<{ id: string; name: string; percStr: string }[]>([]);

  React.useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((u: any) => setUser(u));
    return () => unsubscribe();
  }, []);

  if (!profile) {
    return <Navigate to="/onboarding" replace />;
  }

  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const activeTarget = getActiveTarget(today);

  if (!activeTarget) {
    return <Navigate to="/onboarding" replace />;
  }

  const handleRecalculate = () => {
    resetProfile();
    navigate('/onboarding');
  };

  const { meals, goal } = activeTarget;
  const dailyTarget = getMacroTargetForDate(activeTarget, today);

  const startEditingMeals = () => {
    setDraftMeals(
      meals.map((m) => ({
        id: m.id,
        name: m.name,
        percStr: Math.round(m.percentage * 100).toString(),
      }))
    );
    setIsEditingMeals(true);
  };

  const mealsTotalPerc = draftMeals.reduce((acc, m) => acc + (parseInt(m.percStr) || 0), 0);

  const moveMeal = (index: number, direction: 'up' | 'down') => {
    const newMeals = [...draftMeals];
    if (direction === 'up' && index > 0) {
      [newMeals[index - 1], newMeals[index]] = [newMeals[index], newMeals[index - 1]];
    } else if (direction === 'down' && index < newMeals.length - 1) {
      [newMeals[index + 1], newMeals[index]] = [newMeals[index], newMeals[index + 1]];
    }
    setDraftMeals(newMeals);
  };

  const updateMeal = (index: number, field: 'name' | 'percStr', value: string) => {
    const newMeals = [...draftMeals];
    newMeals[index] = { ...newMeals[index], [field]: value };
    setDraftMeals(newMeals);
  };

  const deleteMeal = (index: number) => {
    if (draftMeals.length <= 1) return;
    const newMeals = [...draftMeals];
    newMeals.splice(index, 1);
    setDraftMeals(newMeals);
  };

  const addMeal = () => {
    setDraftMeals([
      ...draftMeals,
      {
        id: crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(),
        name: 'Nuovo Pasto',
        percStr: '0',
      },
    ]);
  };

  const handleSaveMeals = () => {
    if (mealsTotalPerc !== 100) return;

    const finalMeals: MealTargetConfig[] = draftMeals.map((m) => ({
      id: m.id,
      name: m.name.trim() || 'Pasto',
      percentage: (parseInt(m.percStr) || 0) / 100,
    }));

    addTargetVersion({
      ...activeTarget,
      id: crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(),
      effectiveFromDate: today,
      meals: finalMeals,
    });

    setIsEditingMeals(false);
  };

  const macroSplit = [
    {
      label: 'Proteine',
      grams: dailyTarget.proteinG,
      perc: Math.round(((dailyTarget.proteinG * 4) / dailyTarget.kcal) * 100),
      dotColor: 'bg-indigo-400',
    },
    {
      label: 'Carbo',
      grams: dailyTarget.carbsG,
      perc: Math.round(((dailyTarget.carbsG * 4) / dailyTarget.kcal) * 100),
      dotColor: 'bg-amber-400',
    },
    {
      label: 'Grassi',
      grams: dailyTarget.fatG,
      perc: Math.round(((dailyTarget.fatG * 9) / dailyTarget.kcal) * 100),
      dotColor: 'bg-emerald-400',
    },
  ];

  return (
    <div className="flex flex-col pb-8">
      <header className="sticky top-0 z-40 glass-header px-4 pb-3 pt-safe mb-4">
        <h1 className="text-xl font-semibold tracking-tight text-zinc-100">Profilo e obiettivi</h1>
        <p className="text-zinc-500 text-xs mt-0.5">Parametri metabolici e configurazione pasti</p>
      </header>

      <div className="px-4 space-y-6">
        {/* Target Principale */}
        <Card>
          <CardContent className="p-5 flex items-center justify-between tabular-nums">
            <div>
              <div className="text-xs font-medium text-zinc-400 mb-1">Fabbisogno giornaliero</div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-4xl font-semibold tracking-tight text-zinc-100">{dailyTarget.kcal}</span>
                <span className="text-sm text-zinc-500 font-medium">kcal</span>
              </div>
            </div>
            <span className="px-2.5 py-1 bg-[#18181c] text-xs font-medium text-zinc-300 rounded-lg border border-white/[0.06]">
              {goal === 'cut' ? 'Definizione' : goal === 'bulk' ? 'Massa' : 'Mantenimento'}
            </span>
          </CardContent>
        </Card>

        {/* Macronutrienti Split — Unified Matte Graphite + 6px Colored Dots */}
        <div>
          <h3 className="text-xs font-medium text-zinc-500 mb-2.5 px-1">Ripartizione macronutrienti</h3>
          <div className="grid grid-cols-3 gap-2.5 tabular-nums">
            {macroSplit.map((m) => (
              <Card key={m.label}>
                <CardContent className="p-3.5">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-1.5">
                      <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", m.dotColor)} />
                      <span className="text-xs font-medium text-zinc-400">{m.label}</span>
                    </div>
                  </div>
                  <div className="text-xl font-semibold tracking-tight text-zinc-100">{m.grams}g</div>
                  <div className="text-[11px] text-zinc-500 mt-0.5">{m.perc}% delle kcal</div>
                </CardContent>
              </Card>
            ))}
          </div>
          
          <div className="mt-2.5">
            <button 
              onClick={() => navigate('/profile/macro-cycling')}
              className="w-full flex items-center justify-between p-3.5 rounded-2xl bg-[#121215] hover:bg-[#16161a] transition-colors border border-white/[0.06] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)] active:scale-[0.99]"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-[#18181c] border border-white/[0.06] text-zinc-300 rounded-xl flex items-center justify-center">
                  <SlidersHorizontal size={16} strokeWidth={1.75} />
                </div>
                <div className="text-left">
                  <div className="text-sm font-medium text-zinc-100">Ciclizzazione dei carboidrati</div>
                  <div className="text-xs text-zinc-500">
                    {activeTarget.isMacroCyclingEnabled ? 'Attiva · Giorni personalizzati' : 'Disattivata · Target uniforme'}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1 text-xs font-medium text-zinc-400">
                <span>Configura</span>
                <ChevronRight size={15} strokeWidth={1.75} />
              </div>
            </button>
          </div>
        </div>

        {/* Ripartizione Pasti */}
        <div>
          <div className="flex items-center justify-between mb-2.5 px-1">
            <h3 className="text-xs font-medium text-zinc-500">Ripartizione pasti</h3>
            {!isEditingMeals ? (
              <button
                onClick={startEditingMeals}
                className="flex items-center gap-1.5 text-xs font-medium text-zinc-300 hover:text-white bg-[#121215] border border-white/[0.06] px-2.5 py-1 rounded-lg transition-colors active:scale-95"
              >
                <Edit2 size={12} strokeWidth={1.75} />
                Modifica
              </button>
            ) : (
              <span className={cn("text-xs font-semibold tabular-nums", mealsTotalPerc === 100 ? "text-emerald-400" : "text-rose-400")}>
                Totale: {mealsTotalPerc}%
              </span>
            )}
          </div>

          {!isEditingMeals ? (
            <Card>
              <CardContent className="p-0 divide-y divide-white/[0.04] tabular-nums">
                {meals.map((meal) => (
                  <div key={meal.id} className="flex justify-between items-center px-4 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-[#18181c] border border-white/[0.05] rounded-xl flex items-center justify-center text-zinc-400">
                        <Clock size={15} strokeWidth={1.75} />
                      </div>
                      <span className="text-sm font-medium text-zinc-100">{meal.name}</span>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-semibold text-zinc-100">{Math.round(meal.percentage * 100)}%</div>
                      <div className="text-[11px] text-zinc-500">{Math.round(dailyTarget.kcal * meal.percentage)} kcal</div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-4 space-y-3 tabular-nums">
                <div className="space-y-2.5">
                  {draftMeals.map((meal, index) => {
                    const mealPerc = parseInt(meal.percStr) || 0;
                    const mealKcal = Math.round(dailyTarget.kcal * (mealPerc / 100));
                    return (
                      <div key={meal.id} className="flex items-center gap-2 p-2.5 bg-[#18181c] border border-white/[0.06] rounded-xl">
                        <div className="flex flex-col gap-1 shrink-0">
                          <button
                            type="button"
                            disabled={index === 0}
                            onClick={() => moveMeal(index, 'up')}
                            className="p-1 text-zinc-500 hover:text-zinc-200 disabled:opacity-30"
                          >
                            <ArrowUp size={14} strokeWidth={1.75} />
                          </button>
                          <button
                            type="button"
                            disabled={index === draftMeals.length - 1}
                            onClick={() => moveMeal(index, 'down')}
                            className="p-1 text-zinc-500 hover:text-zinc-200 disabled:opacity-30"
                          >
                            <ArrowDown size={14} strokeWidth={1.75} />
                          </button>
                        </div>

                        <div className="flex-1 space-y-1.5">
                          <Input
                            value={meal.name}
                            onChange={(e) => updateMeal(index, 'name', e.target.value)}
                            className="h-8 text-sm font-medium bg-transparent border-none px-1"
                            placeholder="Nome pasto"
                          />
                          <div className="flex items-center gap-2">
                            <div className="relative flex-1">
                              <Input
                                type="number"
                                value={meal.percStr}
                                onChange={(e) => updateMeal(index, 'percStr', e.target.value)}
                                className="h-8 text-sm pr-6 bg-[#09090b] border-white/[0.06] rounded-lg"
                              />
                              <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-zinc-500">%</span>
                            </div>
                            <span className="text-xs text-zinc-500 min-w-[65px] text-right font-medium">
                              {mealKcal} kcal
                            </span>
                          </div>
                        </div>

                        <button
                          type="button"
                          disabled={draftMeals.length <= 1}
                          onClick={() => deleteMeal(index)}
                          className="p-2 text-zinc-500 hover:text-rose-400 disabled:opacity-30 shrink-0"
                        >
                          <Trash2 size={16} strokeWidth={1.75} />
                        </button>
                      </div>
                    );
                  })}
                </div>

                <Button
                  variant="secondary"
                  fullWidth
                  onClick={addMeal}
                  className="text-zinc-300 border-dashed border border-white/[0.1]"
                >
                  <Plus size={15} strokeWidth={2} className="mr-1.5" /> Aggiungi pasto
                </Button>

                {mealsTotalPerc !== 100 && (
                  <div className="bg-rose-500/10 border border-rose-500/20 p-3 rounded-xl flex gap-2 items-start text-xs text-rose-300">
                    <AlertTriangle size={15} strokeWidth={1.75} className="text-rose-400 shrink-0 mt-0.5" />
                    <p>La somma delle percentuali deve essere esattamente 100% (attualmente {mealsTotalPerc}%).</p>
                  </div>
                )}

                <div className="flex gap-2 pt-1">
                  <Button
                    variant="secondary"
                    className="flex-1"
                    onClick={() => setIsEditingMeals(false)}
                  >
                    <X size={15} strokeWidth={1.75} className="mr-1.5" /> Annulla
                  </Button>
                  <Button
                    variant="primary"
                    className="flex-1"
                    disabled={mealsTotalPerc !== 100}
                    onClick={handleSaveMeals}
                  >
                    <Check size={15} strokeWidth={2} className="mr-1.5" /> Salva pasti
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Data & Privacy Section */}
        <div>
          <h3 className="text-xs font-medium text-zinc-500 mb-2.5 px-1">Dati e sincronizzazione</h3>
          <Card>
            <CardContent className="p-0 divide-y divide-white/[0.04]">
              <button 
                onClick={exportAllData}
                className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-white/[0.02] transition-colors text-left active:scale-[0.99]"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-[#18181c] border border-white/[0.06] text-zinc-300 rounded-xl flex items-center justify-center">
                    <Database size={16} strokeWidth={1.75} />
                  </div>
                  <div>
                    <div className="text-sm font-medium text-zinc-100">Esporta backup JSON</div>
                    <div className="text-xs text-zinc-500">Salva una copia completa sul dispositivo</div>
                  </div>
                </div>
                <Share size={15} strokeWidth={1.75} className="text-zinc-500" />
              </button>

              {!user ? (
                <button 
                  onClick={loginWithGoogle}
                  className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-white/[0.02] transition-colors text-left active:scale-[0.99]"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-[#18181c] border border-white/[0.06] text-zinc-300 rounded-xl flex items-center justify-center">
                      <Cloud size={16} strokeWidth={1.75} />
                    </div>
                    <div>
                      <div className="text-sm font-medium text-zinc-100">Accedi con Google</div>
                      <div className="text-xs text-zinc-500">Sincronizzazione cloud automatica</div>
                    </div>
                  </div>
                  <ChevronRight size={15} strokeWidth={1.75} className="text-zinc-500" />
                </button>
              ) : (
                <button 
                  onClick={logoutGoogle}
                  className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-white/[0.02] transition-colors text-left active:scale-[0.99]"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl flex items-center justify-center">
                      <LogOut size={16} strokeWidth={1.75} />
                    </div>
                    <div>
                      <div className="text-sm font-medium text-zinc-100">Disconnetti account</div>
                      <div className="text-xs text-zinc-500">{user.email}</div>
                    </div>
                  </div>
                  <ChevronRight size={15} strokeWidth={1.75} className="text-zinc-500" />
                </button>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="pt-2">
          <Button variant="secondary" fullWidth onClick={handleRecalculate}>
            Ricalcola fabbisogno da zero
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ProfileDashboard;
