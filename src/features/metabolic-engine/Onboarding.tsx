import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { 
  ActivityLevel, UserMetabolicProfile, WeightGoal, 
  getDefaultMeals, TargetVersion, DailyMacroTarget, calculateTDEE, MealTargetConfig 
} from '@/core/metabolism';
import { useUserStore } from '@/store/userStore';
import { Activity, Ruler, Weight, Calendar, ArrowRight, Target, AlertTriangle, Clock, ArrowUp, ArrowDown, Trash2, Plus } from 'lucide-react';
import { cn } from '@/core/utils';

export const Onboarding: React.FC = () => {
  const setProfile = useUserStore((state) => state.setProfile);
  const addTargetVersion = useUserStore((state) => state.addTargetVersion);
  const navigate = useNavigate();

  const [step, setStep] = useState(1);
  const [profile, setDraftProfile] = useState<Partial<UserMetabolicProfile>>({
    gender: 'M',
    activityLevel: 'light'
  });
  
  // Phase 3 Refinement: Target Weight & Timeline & Macros
  const [targetWeight, setTargetWeight] = useState<number | ''>('');
  const [weeks, setWeeks] = useState<number | ''>('');
  const [targetKcal, setTargetKcal] = useState<number>(0);
  const [macroPerc, setMacroPerc] = useState({ protein: 30, carbs: 40, fat: 30 });
  const [derivedGoal, setDerivedGoal] = useState<WeightGoal>('maintain');
  const [warningMsg, setWarningMsg] = useState<string | null>(null);

  // Epic: Meal Builder
  // Salviamo le % internamente come interi (es. 20 per 20%) per facilità di UI
  const [meals, setMeals] = useState<{id: string, name: string, percStr: string}[]>(() => {
    return getDefaultMeals().map(m => ({
      id: m.id,
      name: m.name,
      percStr: Math.round(m.percentage * 100).toString()
    }));
  });

  // Calcola Goal e Kcal base quando cambiano peso target e settimane
  useEffect(() => {
    if (profile.weightKg && typeof targetWeight === 'number' && typeof weeks === 'number' && weeks > 0) {
      const tdee = calculateTDEE(profile as UserMetabolicProfile);
      let newGoal: WeightGoal = 'maintain';
      const weightDelta = targetWeight - profile.weightKg;
      
      if (weightDelta < 0) newGoal = 'cut';
      else if (weightDelta > 0) newGoal = 'bulk';

      const totalKcalDelta = weightDelta * 7700;
      const days = weeks * 7;
      const dailyKcalDelta = totalKcalDelta / days;
      
      let proposedKcal = Math.round(tdee + dailyKcalDelta);
      
      setWarningMsg(null);
      if (proposedKcal < 1200) {
        proposedKcal = 1200;
        setWarningMsg(`L'obiettivo selezionato richiederebbe un deficit estremo. Le calorie sono state limitate alla soglia minima di sicurezza (1200 kcal). Aumenta le settimane.`);
      }

      setDerivedGoal(newGoal);
      setTargetKcal(proposedKcal);
    }
  }, [targetWeight, weeks, profile.weightKg, profile.heightCm, profile.age, profile.gender, profile.activityLevel]);

  const handleNext = () => setStep((s) => s + 1);
  const handleBack = () => setStep((s) => Math.max(1, s - 1));

  const updatePerc = (field: 'protein' | 'carbs' | 'fat', value: number) => {
    setMacroPerc(prev => ({ ...prev, [field]: value }));
  };

  const totalMacroPerc = macroPerc.protein + macroPerc.carbs + macroPerc.fat;
  
  // Funzioni Meal Builder
  const mealsTotalPerc = meals.reduce((acc, m) => acc + (parseInt(m.percStr) || 0), 0);

  const moveMeal = (index: number, direction: 'up' | 'down') => {
    const newMeals = [...meals];
    if (direction === 'up' && index > 0) {
      [newMeals[index - 1], newMeals[index]] = [newMeals[index], newMeals[index - 1]];
    } else if (direction === 'down' && index < newMeals.length - 1) {
      [newMeals[index + 1], newMeals[index]] = [newMeals[index], newMeals[index + 1]];
    }
    setMeals(newMeals);
  };

  const updateMeal = (index: number, field: 'name' | 'percStr', value: string) => {
    const newMeals = [...meals];
    newMeals[index][field] = value;
    setMeals(newMeals);
  };

  const deleteMeal = (index: number) => {
    if (meals.length <= 1) return;
    const newMeals = [...meals];
    newMeals.splice(index, 1);
    setMeals(newMeals);
  };

  const addMeal = () => {
    setMeals([...meals, {
      id: crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(),
      name: 'Nuovo Pasto',
      percStr: '0'
    }]);
  };

  const handleFinish = () => {
    if (totalMacroPerc !== 100 || mealsTotalPerc !== 100) return;

    try {
      const finalProfile = profile as UserMetabolicProfile;
      setProfile(finalProfile);
      
      const proteinG = Math.round((targetKcal * (macroPerc.protein / 100)) / 4);
      const carbsG = Math.round((targetKcal * (macroPerc.carbs / 100)) / 4);
      const fatG = Math.round((targetKcal * (macroPerc.fat / 100)) / 9);

      const dailyTarget: DailyMacroTarget = {
        kcal: targetKcal,
        proteinG,
        carbsG,
        fatG
      };

      // Mappa l'array temporaneo nel formato MealConfig richiesto
      const finalMeals: MealTargetConfig[] = meals.map(m => ({
        id: m.id,
        name: m.name,
        percentage: (parseInt(m.percStr) || 0) / 100
      }));

      const today = new Date().toISOString().split('T')[0];
      const newTarget: TargetVersion = {
        id: crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(),
        effectiveFromDate: today,
        goal: derivedGoal,
        dailyTarget,
        meals: finalMeals
      };
      
      addTargetVersion(newTarget);
      navigate('/profile', { replace: true });
    } catch (e) {
      console.error("Errore salvataggio:", e);
      alert("Errore durante il salvataggio del profilo.");
    }
  };

  const activityLabels: Record<ActivityLevel, { title: string; desc: string }> = {
    sedentary: {
      title: 'Sedentario',
      desc: 'Meno di 5.000 passi al giorno, nessun allenamento programmato.',
    },
    light: {
      title: 'Leggermente attivo',
      desc: '5.000 – 8.000 passi al giorno o 1–3 allenamenti a settimana.',
    },
    moderate: {
      title: 'Moderatamente attivo',
      desc: '8.000 – 10.000 passi al giorno o 3–5 allenamenti a settimana.',
    },
    active: {
      title: 'Molto attivo',
      desc: '10.000 – 12.000 passi al giorno o 5–6 allenamenti intensi.',
    },
    very_active: {
      title: 'Estremamente attivo',
      desc: 'Oltre 12.000 passi al giorno + lavoro fisico o doppio allenamento.',
    },
  };

  return (
    <div className="flex flex-col h-screen bg-[#09090b] px-5 pb-safe-overlay overflow-hidden">
      <div className="sticky top-0 z-40 bg-[#09090b]/90 backdrop-blur-xl pt-safe pb-4 w-full">
        {/* Progress */}
        <div className="flex items-center justify-between max-w-md mx-auto mb-2.5 text-xs text-zinc-500 font-medium tabular-nums">
          <span>Configurazione metabolica</span>
          <span>Passaggio {step} di 5</span>
        </div>
        <div className="flex gap-1.5 w-full max-w-md mx-auto">
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className={cn(
                "h-1 flex-1 rounded-full transition-colors duration-300",
                i <= step ? "bg-zinc-100" : "bg-white/[0.08]"
              )}
            />
          ))}
        </div>
      </div>
      
      <div className="flex-1 flex flex-col max-w-md w-full mx-auto space-y-6 overflow-y-auto pb-8 pt-2">

        <Card className="my-auto shrink-0">
          
          {step === 1 && (
            <CardContent className="p-6 space-y-6">
              <div className="space-y-1">
                <h2 className="text-xl font-semibold tracking-tight text-zinc-100">Dati anagrafici</h2>
                <p className="text-zinc-500 text-xs">Parametri base per il calcolo del metabolismo basale (BMR).</p>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium text-zinc-400 block">Sesso biologico</label>
                <div className="grid grid-cols-2 gap-2.5">
                  <Button
                    type="button"
                    variant={profile.gender === 'M' ? 'primary' : 'secondary'}
                    fullWidth
                    onClick={() => setDraftProfile({ ...profile, gender: 'M' })}
                  >
                    Uomo
                  </Button>
                  <Button
                    type="button"
                    variant={profile.gender === 'F' ? 'primary' : 'secondary'}
                    fullWidth
                    onClick={() => setDraftProfile({ ...profile, gender: 'F' })}
                  >
                    Donna
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium text-zinc-400 flex items-center gap-1.5">
                  <Calendar size={13.5} strokeWidth={1.75} className="text-zinc-500" /> Età (anni)
                </label>
                <Input
                  type="number"
                  label="Età (anni)"
                  min={16}
                  max={99}
                  placeholder="Es. 28"
                  value={profile.age || ''}
                  onChange={(e) => setDraftProfile({ ...profile, age: parseInt(e.target.value) || undefined })}
                />
              </div>
              <Button
                fullWidth
                disabled={!profile.age || profile.age < 16 || profile.age > 99}
                onClick={handleNext}
                className="mt-2"
              >
                Continua <ArrowRight className="ml-2" size={16} strokeWidth={2} />
              </Button>
            </CardContent>
          )}

          {step === 2 && (
            <CardContent className="p-6 space-y-6">
              <div className="space-y-1">
                <h2 className="text-xl font-semibold tracking-tight text-zinc-100">Misure corporee</h2>
                <p className="text-zinc-500 text-xs">Inserisci altezza e peso attuale per stimare il dispendio energetico.</p>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium text-zinc-400 flex items-center gap-1.5">
                  <Ruler size={13.5} strokeWidth={1.75} className="text-zinc-500" /> Altezza (cm)
                </label>
                <Input
                  type="number"
                  label="Altezza (cm)"
                  min={140}
                  max={230}
                  placeholder="Es. 178"
                  value={profile.heightCm || ''}
                  onChange={(e) => setDraftProfile({ ...profile, heightCm: parseInt(e.target.value) || undefined })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium text-zinc-400 flex items-center gap-1.5">
                  <Weight size={13.5} strokeWidth={1.75} className="text-zinc-500" /> Peso attuale (kg)
                </label>
                <Input
                  type="number"
                  label="Peso attuale (kg)"
                  min={30}
                  max={300}
                  placeholder="Es. 75"
                  value={profile.weightKg || ''}
                  onChange={(e) => setDraftProfile({ ...profile, weightKg: parseFloat(e.target.value) || undefined })}
                />
              </div>
              <div className="flex gap-2.5 pt-2">
                <Button variant="secondary" onClick={handleBack}>Indietro</Button>
                <Button
                  fullWidth
                  disabled={!profile.heightCm || profile.heightCm < 140 || profile.heightCm > 230 || !profile.weightKg}
                  onClick={handleNext}
                >
                  Continua <ArrowRight className="ml-2" size={16} strokeWidth={2} />
                </Button>
              </div>
            </CardContent>
          )}

          {step === 3 && (
            <CardContent className="p-6 space-y-5">
              <div className="space-y-1">
                <h2 className="text-xl font-semibold tracking-tight text-zinc-100">Livello di attività</h2>
                <p className="text-zinc-500 text-xs">Seleziona il profilo più vicino alla tua routine settimanale.</p>
              </div>
              <div className="space-y-2">
                {(['sedentary', 'light', 'moderate', 'active', 'very_active'] as ActivityLevel[]).map((level) => {
                  const isSelected = profile.activityLevel === level;
                  return (
                    <button
                      key={level}
                      onClick={() => {
                        setDraftProfile({ ...profile, activityLevel: level });
                        handleNext();
                      }}
                      className={cn(
                        "w-full p-3.5 rounded-xl border text-left flex items-start gap-3 active:scale-[0.99] transition-all",
                        isSelected
                          ? "bg-white/[0.06] border-white/[0.18]"
                          : "bg-[#18181c] border-white/[0.06] hover:bg-white/[0.04]"
                      )}
                    >
                      <div className="w-8 h-8 rounded-lg bg-[#121215] border border-white/[0.06] flex items-center justify-center shrink-0 mt-0.5 text-zinc-300">
                        <Activity size={15} strokeWidth={1.75} />
                      </div>
                      <div>
                        <div className="font-medium text-zinc-100 text-sm mb-0.5">
                          {activityLabels[level].title}
                        </div>
                        <div className="text-xs text-zinc-500 leading-relaxed">
                          {activityLabels[level].desc}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
              <Button variant="secondary" fullWidth onClick={handleBack}>Indietro</Button>
            </CardContent>
          )}

          {step === 4 && (
            <CardContent className="p-6 space-y-5 tabular-nums">
              <div className="space-y-1">
                <h2 className="text-xl font-semibold tracking-tight text-zinc-100">Calorie e macronutrienti</h2>
                <p className="text-zinc-500 text-xs">
                  Peso attuale: <span className="text-zinc-300 font-medium">{profile.weightKg} kg</span> · TDEE stimato:{' '}
                  <span className="text-zinc-300 font-medium">{calculateTDEE(profile as UserMetabolicProfile)} kcal</span>
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-zinc-400 flex items-center gap-1.5">
                    <Target size={13.5} strokeWidth={1.75} className="text-zinc-500" /> Peso obiettivo (kg)
                  </label>
                  <Input
                    type="number"
                    label="Peso obiettivo (kg)"
                    placeholder="Es. 70"
                    value={targetWeight === '' ? '' : targetWeight}
                    onChange={(e) => setTargetWeight(parseFloat(e.target.value) || '')}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-zinc-400 flex items-center gap-1.5">
                    <Clock size={13.5} strokeWidth={1.75} className="text-zinc-500" /> Durata (settimane)
                  </label>
                  <Input
                    type="number"
                    label="Durata (settimane)"
                    min={1}
                    placeholder="Es. 12"
                    value={weeks === '' ? '' : weeks}
                    onChange={(e) => setWeeks(parseInt(e.target.value) || '')}
                  />
                </div>
              </div>

              {typeof targetWeight === 'number' && typeof weeks === 'number' && weeks > 0 && (
                <div className="animate-in fade-in slide-in-from-bottom-3 duration-250 space-y-5 pt-2 border-t border-white/[0.06]">
                  
                  {warningMsg && (
                    <div className="bg-amber-500/10 border border-amber-500/20 p-3 rounded-xl flex gap-2.5 items-start text-xs text-amber-200 leading-relaxed">
                      <AlertTriangle size={15} strokeWidth={1.75} className="text-amber-400 shrink-0 mt-0.5" />
                      <p>{warningMsg}</p>
                    </div>
                  )}

                  <div className="p-3.5 rounded-2xl bg-[#18181c] border border-white/[0.06] space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-medium text-zinc-400">Fabbisogno giornaliero target</label>
                      <span className="text-[11px] text-zinc-500">Modificabile manualmente</span>
                    </div>
                    <div className="relative">
                      <Input
                        type="number"
                        label="Fabbisogno calorico (kcal)"
                        value={targetKcal}
                        onChange={(e) => setTargetKcal(parseInt(e.target.value) || 0)}
                        className="font-semibold text-lg bg-[#09090b] border-white/[0.06] pr-14"
                      />
                      <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs text-zinc-500 font-medium">
                        kcal
                      </span>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between px-0.5">
                      <label className="text-xs font-medium text-zinc-400">Ripartizione macronutrienti</label>
                      <span
                        className={cn(
                          "text-xs font-semibold tabular-nums",
                          totalMacroPerc === 100 ? "text-emerald-400" : "text-rose-400"
                        )}
                      >
                        Totale: {totalMacroPerc}%
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-2.5">
                      {[
                        {
                          key: 'protein' as const,
                          label: 'Proteine',
                          dot: 'bg-indigo-400',
                          perc: macroPerc.protein,
                          grams: Math.round((targetKcal * (macroPerc.protein / 100)) / 4),
                        },
                        {
                          key: 'carbs' as const,
                          label: 'Carbo',
                          dot: 'bg-amber-400',
                          perc: macroPerc.carbs,
                          grams: Math.round((targetKcal * (macroPerc.carbs / 100)) / 4),
                        },
                        {
                          key: 'fat' as const,
                          label: 'Grassi',
                          dot: 'bg-rose-400',
                          perc: macroPerc.fat,
                          grams: Math.round((targetKcal * (macroPerc.fat / 100)) / 9),
                        },
                      ].map((m) => (
                        <div
                          key={m.key}
                          className="p-3 rounded-2xl bg-[#18181c] border border-white/[0.06] space-y-2"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5">
                              <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", m.dot)} />
                              <span className="text-xs font-medium text-zinc-300">{m.label}</span>
                            </div>
                          </div>
                          <div className="relative">
                            <Input
                              type="number"
                              label={`${m.label} (%)`}
                              value={m.perc}
                              onChange={(e) => updatePerc(m.key, parseInt(e.target.value) || 0)}
                              className="h-9 pr-6 text-center font-semibold bg-[#09090b] border-white/[0.06] rounded-lg"
                            />
                            <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-zinc-500">%</span>
                          </div>
                          <div className="text-[11px] text-zinc-500 text-center font-medium">
                            {m.grams}g / giorno
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              <div className="flex gap-2.5 pt-2">
                <Button variant="secondary" onClick={handleBack}>Indietro</Button>
                <Button
                  fullWidth
                  onClick={handleNext}
                  disabled={typeof targetWeight !== 'number' || typeof weeks !== 'number' || weeks <= 0 || totalMacroPerc !== 100}
                >
                  Continua <ArrowRight className="ml-2" size={16} strokeWidth={2} />
                </Button>
              </div>
            </CardContent>
          )}

          {step === 5 && (
            <CardContent className="p-6 space-y-4 tabular-nums">
              <div className="flex items-start justify-between gap-2">
                <div className="space-y-1">
                  <h2 className="text-xl font-semibold tracking-tight text-zinc-100">Struttura pasti</h2>
                  <p className="text-zinc-500 text-xs">Ripartisci le calorie giornaliere tra i pasti.</p>
                </div>
                <span
                  className={cn(
                    "text-xs font-semibold px-2.5 py-1 rounded-lg border shrink-0",
                    mealsTotalPerc === 100
                      ? "text-emerald-300 bg-emerald-500/15 border-emerald-500/25"
                      : "text-rose-300 bg-rose-500/10 border-rose-500/20"
                  )}
                >
                  {mealsTotalPerc}%
                </span>
              </div>

              <div className="space-y-2.5">
                {meals.map((meal, index) => {
                  const mealPerc = parseInt(meal.percStr) || 0;
                  const mealKcal = Math.round(targetKcal * (mealPerc / 100));
                  return (
                    <div
                      key={meal.id}
                      className="flex items-center gap-2 p-2.5 bg-[#18181c] border border-white/[0.06] rounded-xl"
                    >
                      <div className="flex flex-col gap-1 shrink-0">
                        <button
                          disabled={index === 0}
                          onClick={() => moveMeal(index, 'up')}
                          className="p-1 text-zinc-500 hover:text-zinc-200 disabled:opacity-30"
                        >
                          <ArrowUp size={14} strokeWidth={1.75} />
                        </button>
                        <button
                          disabled={index === meals.length - 1}
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
                              label={`Percentuale ${meal.name}`}
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
                        disabled={meals.length <= 1}
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

              <div className="flex gap-2.5 pt-3 border-t border-white/[0.06]">
                <Button variant="secondary" onClick={handleBack}>Indietro</Button>
                <Button fullWidth onClick={handleFinish} variant="primary" disabled={mealsTotalPerc !== 100}>
                  Completa configurazione
                </Button>
              </div>
            </CardContent>
          )}

        </Card>
      </div>
    </div>
  );
};

export default Onboarding;
