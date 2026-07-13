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

  return (
    <div className="flex flex-col h-screen bg-zinc-950 p-6 pb-safe-overlay overflow-hidden">
      <div className="sticky top-0 z-40 bg-zinc-950 pt-safe pb-6 w-full -mx-6 px-6">
        {/* Progress */}
        <div className="flex space-x-2 w-full max-w-md mx-auto">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className={cn("h-1.5 flex-1 rounded-full transition-colors", i <= step ? "bg-brand-primary" : "bg-zinc-800")} />
          ))}
        </div>
      </div>
      
      <div className="flex-1 flex flex-col max-w-md w-full mx-auto space-y-6 overflow-y-auto pb-8 pt-4">

        <Card className="border-none bg-zinc-900/50 shadow-2xl relative overflow-hidden my-auto shrink-0">
          
          {step === 1 && (
            <CardContent className="pt-6 space-y-6">
              <div className="space-y-2 text-center">
                <h2 className="text-2xl font-bold tracking-tight">Chi sei?</h2>
                <p className="text-zinc-400 text-sm">Aiutaci a calcolare il tuo metabolismo basale.</p>
              </div>
              <div className="flex space-x-4">
                <Button type="button" variant={profile.gender === 'M' ? 'primary' : 'secondary'} fullWidth onClick={() => setDraftProfile({ ...profile, gender: 'M' })}>Uomo</Button>
                <Button type="button" variant={profile.gender === 'F' ? 'primary' : 'secondary'} fullWidth onClick={() => setDraftProfile({ ...profile, gender: 'F' })}>Donna</Button>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-2"><Calendar size={14} /> Età</label>
                <Input type="number" min={16} max={99} value={profile.age || ''} onChange={(e) => setDraftProfile({ ...profile, age: parseInt(e.target.value) || undefined })} />
              </div>
              <Button fullWidth disabled={!profile.age || profile.age < 16 || profile.age > 99} onClick={handleNext} className="mt-6">Continua <ArrowRight className="ml-2" size={18} /></Button>
            </CardContent>
          )}

          {step === 2 && (
            <CardContent className="pt-6 space-y-6">
              <div className="space-y-2 text-center">
                <h2 className="text-2xl font-bold tracking-tight">Le tue misure</h2>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-2"><Ruler size={14} /> Altezza (cm)</label>
                <Input type="number" min={150} max={220} value={profile.heightCm || ''} onChange={(e) => setDraftProfile({ ...profile, heightCm: parseInt(e.target.value) || undefined })} />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-2"><Weight size={14} /> Peso (kg)</label>
                <Input type="number" min={30} max={300} value={profile.weightKg || ''} onChange={(e) => setDraftProfile({ ...profile, weightKg: parseFloat(e.target.value) || undefined })} />
              </div>
              <div className="flex space-x-3 mt-6">
                <Button variant="ghost" onClick={handleBack}>Indietro</Button>
                <Button fullWidth disabled={!profile.heightCm || profile.heightCm < 150 || profile.heightCm > 220 || !profile.weightKg} onClick={handleNext}>Continua <ArrowRight className="ml-2" size={18} /></Button>
              </div>
            </CardContent>
          )}

          {step === 3 && (
            <CardContent className="pt-6 space-y-6">
              <div className="space-y-2 text-center">
                <h2 className="text-2xl font-bold tracking-tight">Stile di vita</h2>
              </div>
              <div className="space-y-3">
                {(['sedentary', 'light', 'moderate', 'active', 'very_active'] as ActivityLevel[]).map((level) => (
                  <button key={level} onClick={() => { setDraftProfile({ ...profile, activityLevel: level }); handleNext(); }}
                    className="w-full p-3 rounded-2xl border border-zinc-800 bg-zinc-900/50 hover:bg-zinc-800/50 text-left flex items-start active:scale-95 transition-all">
                    <Activity className="mt-0.5 mr-3 text-brand-primary" size={20} />
                    <div>
                      <div className="font-medium text-zinc-100 uppercase tracking-widest text-xs mb-1">{level.replace('_', ' ')}</div>
                      <div className="text-[11px] text-zinc-400 leading-tight">
                        {level === 'sedentary' && "< 5.000 passi al giorno. Zero allenamenti mirati."}
                        {level === 'light' && "5.000 - 8.000 passi al giorno o 1-3 allenamenti a settimana."}
                        {level === 'moderate' && "8.000 - 10.000 passi al giorno o 3-5 allenamenti a settimana."}
                        {level === 'active' && "10.000 - 12.000 passi al giorno o 5-6 allenamenti intensi."}
                        {level === 'very_active' && "> 12.000 passi al giorno + lavoro fisico o doppio allenamento."}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
              <Button variant="ghost" fullWidth onClick={handleBack} className="mt-2">Indietro</Button>
            </CardContent>
          )}

          {step === 4 && (
            <CardContent className="pt-6 space-y-6">
              <div className="space-y-2 text-center mb-4">
                <h2 className="text-2xl font-bold tracking-tight">Proiezione Obiettivo</h2>
                <p className="text-zinc-400 text-xs">Peso Attuale: {profile.weightKg} kg (TDEE: {calculateTDEE(profile as UserMetabolicProfile)} kcal)</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-2"><Target size={14} /> Obiettivo (kg)</label>
                  <Input type="number" value={targetWeight === '' ? '' : targetWeight} onChange={(e) => setTargetWeight(parseFloat(e.target.value) || '')} />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-2"><Clock size={14} /> Tempo (settimane)</label>
                  <Input type="number" min={1} value={weeks === '' ? '' : weeks} onChange={(e) => setWeeks(parseInt(e.target.value) || '')} />
                </div>
              </div>

              {typeof targetWeight === 'number' && typeof weeks === 'number' && weeks > 0 && (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-300 space-y-6 mt-6">
                  
                  {warningMsg && (
                    <div className="bg-orange-950/30 border border-orange-900/50 p-3 rounded-xl flex gap-2 items-start text-xs text-orange-200">
                      <AlertTriangle size={16} className="text-orange-500 shrink-0 mt-0.5" />
                      <p>{warningMsg}</p>
                    </div>
                  )}

                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider flex justify-between">
                      <span>Fabbisogno Calorico (Kcal)</span>
                      <span className="text-brand-primary font-normal">Personalizzabile</span>
                    </label>
                    <Input type="number" value={targetKcal} onChange={(e) => setTargetKcal(parseInt(e.target.value) || 0)} className="font-bold text-lg" />
                  </div>

                  <div className="space-y-4 pt-4 border-t border-zinc-800">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Ripartizione Macro (%)</label>
                      <span className={cn("text-xs font-bold", totalMacroPerc === 100 ? "text-brand-primary" : "text-red-500")}>Totale: {totalMacroPerc}%</span>
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                      <div className="space-y-2">
                        <label className="text-[10px] text-violet-400 uppercase text-center block font-bold">Proteine</label>
                        <div className="relative">
                          <Input type="number" value={macroPerc.protein} onChange={(e) => updatePerc('protein', parseInt(e.target.value) || 0)} className="pr-6 text-center border-violet-900" />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-zinc-500">%</span>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] text-amber-400 uppercase text-center block font-bold">Carbo</label>
                        <div className="relative">
                          <Input type="number" value={macroPerc.carbs} onChange={(e) => updatePerc('carbs', parseInt(e.target.value) || 0)} className="pr-6 text-center border-amber-900" />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-zinc-500">%</span>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] text-rose-400 uppercase text-center block font-bold">Grassi</label>
                        <div className="relative">
                          <Input type="number" value={macroPerc.fat} onChange={(e) => updatePerc('fat', parseInt(e.target.value) || 0)} className="pr-6 text-center border-rose-900" />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-zinc-500">%</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex space-x-3 mt-6">
                <Button variant="ghost" onClick={handleBack}>Indietro</Button>
                <Button fullWidth onClick={handleNext} disabled={typeof targetWeight !== 'number' || typeof weeks !== 'number' || weeks <= 0 || totalMacroPerc !== 100}>Continua <ArrowRight className="ml-2" size={18} /></Button>
              </div>
            </CardContent>
          )}

          {step === 5 && (
            <CardContent className="pt-6 space-y-4">
              <div className="space-y-2 text-center mb-6">
                <h2 className="text-2xl font-bold tracking-tight">Struttura Pasti</h2>
                <p className="text-zinc-400 text-sm">Personalizza i tuoi pasti. La somma deve essere 100%.</p>
              </div>

              <div className="space-y-3">
                {meals.map((meal, index) => (
                  <div key={meal.id} className="flex items-center gap-2 p-3 bg-zinc-900 border border-zinc-800 rounded-2xl relative group">
                    <div className="flex flex-col gap-1 shrink-0">
                      <button disabled={index === 0} onClick={() => moveMeal(index, 'up')} className="p-1 text-zinc-500 hover:text-white disabled:opacity-30">
                        <ArrowUp size={16} />
                      </button>
                      <button disabled={index === meals.length - 1} onClick={() => moveMeal(index, 'down')} className="p-1 text-zinc-500 hover:text-white disabled:opacity-30">
                        <ArrowDown size={16} />
                      </button>
                    </div>
                    
                    <div className="flex-1 space-y-2">
                      <Input 
                        value={meal.name} 
                        onChange={(e) => updateMeal(index, 'name', e.target.value)} 
                        className="h-8 text-sm font-semibold bg-transparent border-none px-1"
                        placeholder="Nome Pasto"
                      />
                      <div className="relative">
                        <Input 
                          type="number" 
                          value={meal.percStr} 
                          onChange={(e) => updateMeal(index, 'percStr', e.target.value)} 
                          className="h-8 text-sm pr-6 bg-zinc-950 border-zinc-800"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-zinc-500">%</span>
                      </div>
                    </div>

                    <button disabled={meals.length <= 1} onClick={() => deleteMeal(index)} className="p-3 text-zinc-500 hover:text-red-500 disabled:opacity-30 shrink-0">
                      <Trash2 size={20} />
                    </button>
                  </div>
                ))}
              </div>

              <Button variant="secondary" fullWidth onClick={addMeal} className="mt-2 text-zinc-400 border-dashed border-2 border-zinc-800 hover:bg-zinc-800">
                <Plus size={16} className="mr-2" /> Aggiungi Pasto
              </Button>

              {mealsTotalPerc !== 100 && (
                <div className="bg-red-950/30 border border-red-900/50 p-3 rounded-xl flex gap-2 items-start text-xs text-red-200 mt-4">
                  <AlertTriangle size={16} className="text-red-500 shrink-0 mt-0.5" />
                  <p>La somma delle percentuali deve essere esattamente 100%. Attualmente: {mealsTotalPerc}%. Modifica i valori sopra per procedere.</p>
                </div>
              )}

              <div className="flex space-x-3 pt-6 border-t border-zinc-800/50">
                <Button variant="ghost" onClick={handleBack}>Indietro</Button>
                <Button fullWidth onClick={handleFinish} variant="primary" disabled={mealsTotalPerc !== 100}>
                  Completa Setup
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
