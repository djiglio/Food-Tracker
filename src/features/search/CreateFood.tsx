import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { ArrowLeft, Check, AlertTriangle } from 'lucide-react';
import { FoodEntity, saveFood } from '@/services/db';

interface CreateFoodProps {
  onBack: () => void;
  onFoodCreated: (food: FoodEntity) => void;
  prefillBarcode?: string; // Nuova prop
  existingFood?: FoodEntity;
}

export const CreateFood: React.FC<CreateFoodProps> = ({ onBack, onFoodCreated, prefillBarcode, existingFood }) => {
  const [name, setName] = useState(existingFood?.name || '');
  const [brand, setBrand] = useState(existingFood?.brand || '');
  const [kcal, setKcal] = useState(existingFood?.kcalPer100 !== undefined ? String(existingFood.kcalPer100) : '');
  const [pro, setPro] = useState(existingFood?.proteinPer100 !== undefined ? String(existingFood.proteinPer100) : '');
  const [carbs, setCarbs] = useState(existingFood?.carbsPer100 !== undefined ? String(existingFood.carbsPer100) : '');
  const [fat, setFat] = useState(existingFood?.fatPer100 !== undefined ? String(existingFood.fatPer100) : '');
  const [error, setError] = useState('');

  // Nuovi state per porzioni opzionali
  const [hasPortion, setHasPortion] = useState(!!existingFood?.defaultUnit);
  const [portionName, setPortionName] = useState(existingFood?.defaultUnit || '');
  const [portionWeight, setPortionWeight] = useState(existingFood?.defaultUnitAmount !== undefined ? String(existingFood.defaultUnitAmount) : '');

  const handleSave = async () => {
    if (!name.trim()) {
      setError("Il nome dell'alimento è obbligatorio.");
      return;
    }

    const parsedKcal = parseFloat(kcal) || 0;
    const parsedPro = parseFloat(pro) || 0;
    const parsedCarbs = parseFloat(carbs) || 0;
    const parsedFat = parseFloat(fat) || 0;
    const parsedPortionWeight = parseFloat(portionWeight) || 0;

    const newFood: FoodEntity = {
      id: existingFood ? existingFood.id : crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(),
      name: name.trim(),
      brand: brand.trim() || undefined,
      kcalPer100: parsedKcal,
      proteinPer100: parsedPro,
      carbsPer100: parsedCarbs,
      fatPer100: parsedFat,
      barcode: prefillBarcode || existingFood?.barcode,
      isFavorite: existingFood ? existingFood.isFavorite : false,
      defaultUnit: hasPortion && portionName.trim() ? portionName.trim() : undefined,
      defaultUnitAmount: hasPortion && parsedPortionWeight > 0 ? parsedPortionWeight : undefined,
    };

    try {
      await saveFood(newFood);
      onFoodCreated(newFood);
    } catch (e) {
      console.error(e);
      setError("Errore durante il salvataggio.");
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#09090b] overflow-y-auto tabular-nums">
      <div className="sticky top-0 z-40 glass-header px-4 pb-3 flex items-center gap-3 pt-safe">
        <button
          onClick={onBack}
          className="w-9 h-9 text-zinc-400 hover:text-zinc-100 active:scale-95 bg-[#121215] border border-white/[0.06] rounded-xl flex items-center justify-center transition-colors"
        >
          <ArrowLeft size={18} strokeWidth={1.75} />
        </button>
        <h1 className="font-semibold tracking-tight text-lg text-zinc-100">
          {existingFood ? 'Modifica alimento' : 'Nuovo alimento'}
        </h1>
      </div>

      <div className="p-4 space-y-5 pb-24">
        <Card>
          <CardContent className="p-4 space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-400">Nome alimento *</label>
              <Input 
                placeholder="Es. Uova intere" 
                value={name} 
                onChange={(e) => setName(e.target.value)} 
              />
            </div>
            
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-400">Marca (opzionale)</label>
              <Input 
                placeholder="Es. AIA" 
                value={brand} 
                onChange={(e) => setBrand(e.target.value)} 
              />
            </div>
          </CardContent>
        </Card>

        <div>
          <h3 className="text-xs font-medium text-zinc-500 mb-2.5 px-1">Valori nutrizionali (per 100g)</h3>
          <Card>
            <CardContent className="p-4 space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-400 flex justify-between">
                  <span>Calorie (kcal)</span>
                  <span className="text-zinc-500">Obbligatorio</span>
                </label>
                <Input 
                  type="number" 
                  label="Calorie per 100g"
                  placeholder="0" 
                  value={kcal} 
                  onChange={(e) => setKcal(e.target.value)} 
                  className="font-semibold text-base"
                />
              </div>

              <div className="grid grid-cols-3 gap-2.5">
                {[
                  { label: 'Proteine', dot: 'bg-indigo-400', val: pro, setter: setPro },
                  { label: 'Carbo', dot: 'bg-amber-400', val: carbs, setter: setCarbs },
                  { label: 'Grassi', dot: 'bg-emerald-400', val: fat, setter: setFat },
                ].map((m) => (
                  <div key={m.label} className="p-2.5 rounded-xl bg-[#18181c] border border-white/[0.06] space-y-1.5">
                    <div className="flex items-center gap-1.5">
                      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${m.dot}`} />
                      <label className="text-xs font-medium text-zinc-300">{m.label}</label>
                    </div>
                    <div className="relative">
                      <Input 
                        type="number" 
                        label={`${m.label} per 100g`}
                        value={m.val} 
                        onChange={(e) => m.setter(e.target.value)}
                        className="h-9 pr-6 text-center font-semibold bg-[#09090b] border-white/[0.06] rounded-lg"
                      />
                      <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-zinc-500">g</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {error && (
          <div className="bg-rose-500/10 border border-rose-500/20 p-3 rounded-xl flex gap-2 items-center text-xs text-rose-300">
            <AlertTriangle size={15} strokeWidth={1.75} className="text-rose-400 shrink-0" />
            <p>{error}</p>
          </div>
        )}

        {/* Sezione Porzione Opzionale */}
        <Card className="overflow-hidden">
          <CardContent className="p-0">
            <button 
              type="button"
              onClick={() => setHasPortion(!hasPortion)}
              className="w-full p-4 flex items-center justify-between text-left"
            >
              <div>
                <h3 className="text-sm font-medium text-zinc-100">Porzione personalizzata</h3>
                <p className="text-xs text-zinc-500">Inserisci a unità/pezzi invece che in grammi (opzionale)</p>
              </div>
              <div className={`w-11 h-6 rounded-full transition-colors relative shrink-0 ${hasPortion ? 'bg-emerald-500' : 'bg-zinc-800'}`}>
                <div className={`w-5 h-5 rounded-full bg-white shadow-sm absolute top-0.5 transition-transform ${hasPortion ? 'translate-x-5.5 left-0' : 'translate-x-0.5 left-0'}`} />
              </div>
            </button>

            {hasPortion && (
              <div className="p-4 pt-3 border-t border-white/[0.05] space-y-3 animate-in slide-in-from-top-2 duration-200">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-zinc-400">Nome unità</label>
                    <Input 
                      placeholder="Es. Fetta, Biscotto" 
                      value={portionName} 
                      onChange={(e) => setPortionName(e.target.value)} 
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-zinc-400">Peso (grammi)</label>
                    <div className="relative">
                      <Input 
                        type="number" 
                        label="Peso porzione (g)"
                        placeholder="Es. 30" 
                        value={portionWeight} 
                        onChange={(e) => setPortionWeight(e.target.value)} 
                        className="pr-6"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-zinc-500">g</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Button fullWidth variant="primary" size="lg" onClick={handleSave} disabled={!name.trim()}>
          <Check className="mr-2" size={18} strokeWidth={2} /> Salva alimento
        </Button>
      </div>
    </div>
  );
};

export default CreateFood;
