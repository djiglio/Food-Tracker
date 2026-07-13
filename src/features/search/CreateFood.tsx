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
    <div className="flex flex-col h-full bg-zinc-950 overflow-y-auto">
      <div className="sticky top-0 z-40 glass-header px-4 pb-3 flex items-center gap-3 pt-safe">
        <button onClick={onBack} className="p-2 text-zinc-400 hover:text-white active:scale-95 bg-zinc-900 rounded-full">
          <ArrowLeft size={20} />
        </button>
        <h1 className="font-bold text-lg text-white">Crea Alimento</h1>
      </div>

      <div className="p-4 space-y-6">
        <Card className="border-zinc-800 bg-zinc-900/50">
          <CardContent className="p-4 space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Nome Alimento *</label>
              <Input 
                placeholder="Es. Uova Intere" 
                value={name} 
                onChange={(e) => setName(e.target.value)} 
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Marca (Opzionale)</label>
              <Input 
                placeholder="Es. Aia" 
                value={brand} 
                onChange={(e) => setBrand(e.target.value)} 
              />
            </div>
          </CardContent>
        </Card>

        <div>
          <h3 className="text-sm font-bold tracking-widest uppercase text-zinc-500 mb-3 ml-1">Valori Nutrizionali (per 100g)</h3>
          <Card className="border-zinc-800 bg-zinc-900/50">
            <CardContent className="p-4 space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider flex justify-between">
                  <span>Calorie (Kcal)</span>
                  <span className="text-zinc-500 font-normal">Obbligatorio</span>
                </label>
                <Input 
                  type="number" 
                  placeholder="0" 
                  value={kcal} 
                  onChange={(e) => setKcal(e.target.value)} 
                  className="font-bold text-lg"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-2">
                  <label className="text-[10px] text-violet-400 uppercase font-bold block">Proteine</label>
                  <div className="relative">
                    <Input 
                      type="number" 
                      value={pro} 
                      onChange={(e) => setPro(e.target.value)}
                      className="pr-6 border-violet-900/50 focus-visible:ring-violet-500"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-zinc-500">g</span>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <label className="text-[10px] text-amber-400 uppercase font-bold block">Carbo</label>
                  <div className="relative">
                    <Input 
                      type="number" 
                      value={carbs} 
                      onChange={(e) => setCarbs(e.target.value)}
                      className="pr-6 border-amber-900/50 focus-visible:ring-amber-500"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-zinc-500">g</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] text-rose-400 uppercase font-bold block">Grassi</label>
                  <div className="relative">
                    <Input 
                      type="number" 
                      value={fat} 
                      onChange={(e) => setFat(e.target.value)}
                      className="pr-6 border-rose-900/50 focus-visible:ring-rose-500"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-zinc-500">g</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {error && (
          <div className="bg-red-950/30 border border-red-900/50 p-3 rounded-xl flex gap-2 items-center text-xs text-red-200">
            <AlertTriangle size={16} className="text-red-500 shrink-0" />
            <p>{error}</p>
          </div>
        )}

        {/* Sezione Porzione Opzionale */}
        <Card className="border-zinc-800 bg-zinc-900/50 overflow-hidden">
          <CardContent className="p-0">
            <button 
              onClick={() => setHasPortion(!hasPortion)}
              className="w-full p-4 flex items-center justify-between text-left"
            >
              <div>
                <h3 className="text-sm font-bold text-white">Porzione Discreta</h3>
                <p className="text-xs text-zinc-400">Inserisci a pezzi invece che a grammi (Opzionale)</p>
              </div>
              <div className={`w-10 h-6 rounded-full p-1 transition-colors ${hasPortion ? 'bg-brand-primary' : 'bg-zinc-800'}`}>
                <div className={`w-4 h-4 rounded-full bg-white transition-transform ${hasPortion ? 'translate-x-4' : 'translate-x-0'}`} />
              </div>
            </button>

            {hasPortion && (
              <div className="p-4 pt-0 border-t border-zinc-800/50 space-y-4 animate-in slide-in-from-top-2 duration-200">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase font-bold text-zinc-400">Nome Porzione</label>
                    <Input 
                      placeholder="Es. Fetta, Biscotto" 
                      value={portionName} 
                      onChange={(e) => setPortionName(e.target.value)} 
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase font-bold text-zinc-400">Peso (Grammi)</label>
                    <div className="relative">
                      <Input 
                        type="number" 
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
          <Check className="mr-2" size={20} /> Salva Alimento
        </Button>
      </div>
    </div>
  );
};

export default CreateFood;
