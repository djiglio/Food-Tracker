import React, { useState, useEffect, useRef } from 'react';
import { FoodEntity, searchFoods, saveFood, RecipeIngredient } from '@/services/db';
import { Card, CardContent } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { ArrowLeft, Search, Plus, Trash2, ChefHat, Save } from 'lucide-react';
import { cn } from '@/core/utils';

interface CreateRecipeProps {
  onBack: () => void;
  onRecipeCreated: (recipe: FoodEntity) => void;
}

interface IngState {
  food: FoodEntity;
  amountGrams: number;
}

export const CreateRecipe: React.FC<CreateRecipeProps> = ({ onBack, onRecipeCreated }) => {
  const [name, setName] = useState('');
  const [notes, setNotes] = useState('');
  const [ingredients, setIngredients] = useState<IngState[]>([]);
  const [cookedWeightStr, setCookedWeightStr] = useState('');
  
  // Search state
  const [isSearching, setIsSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<FoodEntity[]>([]);

  const searchInputRef = useRef<HTMLInputElement>(null);

  // Focus search input when opened
  useEffect(() => {
    if (isSearching && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isSearching]);

  // Debounced Search
  useEffect(() => {
    if (!isSearching) return;
    const timer = setTimeout(async () => {
      const res = await searchFoods(searchQuery);
      // Escludi le ricette ricorsive infinite se volessimo (per ora permettiamo tutto)
      setSearchResults(res);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, isSearching]);

  // Calculations
  const rawWeight = ingredients.reduce((sum, ing) => sum + ing.amountGrams, 0);
  const cookedWeight = parseFloat(cookedWeightStr) || rawWeight;

  const totalKcal = ingredients.reduce((sum, ing) => sum + (ing.food.kcalPer100 * (ing.amountGrams / 100)), 0);
  const totalPro = ingredients.reduce((sum, ing) => sum + (ing.food.proteinPer100 * (ing.amountGrams / 100)), 0);
  const totalCarbs = ingredients.reduce((sum, ing) => sum + (ing.food.carbsPer100 * (ing.amountGrams / 100)), 0);
  const totalFat = ingredients.reduce((sum, ing) => sum + (ing.food.fatPer100 * (ing.amountGrams / 100)), 0);

  const ratio = cookedWeight > 0 ? 100 / cookedWeight : 0;
  const kcalPer100 = totalKcal * ratio;
  const proPer100 = totalPro * ratio;
  const carbsPer100 = totalCarbs * ratio;
  const fatPer100 = totalFat * ratio;

  const handleAddIngredient = (food: FoodEntity) => {
    setIngredients(prev => [...prev, { food, amountGrams: 100 }]);
    setIsSearching(false);
    setSearchQuery('');
  };

  const updateAmount = (index: number, valStr: string) => {
    const val = parseFloat(valStr) || 0;
    setIngredients(prev => {
      const next = [...prev];
      next[index].amountGrams = val;
      return next;
    });
  };

  const removeIngredient = (index: number) => {
    setIngredients(prev => prev.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    if (!name.trim() || ingredients.length === 0) return;

    const mappedIngredients: RecipeIngredient[] = ingredients.map(ing => ({
      foodId: ing.food.id,
      name: ing.food.name,
      amountGrams: ing.amountGrams,
      macros: {
        kcal: ing.food.kcalPer100 * (ing.amountGrams / 100),
        proteinG: ing.food.proteinPer100 * (ing.amountGrams / 100),
        carbsG: ing.food.carbsPer100 * (ing.amountGrams / 100),
        fatG: ing.food.fatPer100 * (ing.amountGrams / 100),
      }
    }));

    const newRecipe: FoodEntity = {
      id: crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(),
      name: name.trim(),
      kcalPer100: Math.round(kcalPer100),
      proteinPer100: Math.round(proPer100 * 10) / 10,
      carbsPer100: Math.round(carbsPer100 * 10) / 10,
      fatPer100: Math.round(fatPer100 * 10) / 10,
      isRecipe: true,
      rawWeightGrams: rawWeight,
      cookedWeightGrams: cookedWeight,
      notes: notes.trim(),
      recipeIngredients: mappedIngredients
    };

    await saveFood(newRecipe);
    onRecipeCreated(newRecipe);
  };

  return (
    <div className="flex flex-col h-full bg-zinc-950 overflow-y-auto">
      {/* Header Fissato */}
      <div className="sticky top-0 z-40 bg-zinc-950/80 backdrop-blur-xl border-b border-zinc-900 px-4 py-3 flex items-center justify-between pt-safe">
        <button onClick={onBack} className="p-2 text-zinc-400 hover:text-white active:scale-95 bg-zinc-900 rounded-full">
          <ArrowLeft size={20} />
        </button>
        <h1 className="font-bold text-lg text-white">Nuova Ricetta</h1>
        <div className="w-9" /> {/* Spacer */}
      </div>

      <div className="p-4 space-y-6 pb-24">
        {/* Info di Base */}
        <div className="space-y-4">
          <div>
            <label className="text-xs font-bold tracking-widest uppercase text-zinc-500 mb-2 block">Nome Ricetta</label>
            <Input 
              value={name} 
              onChange={e => setName(e.target.value)} 
              placeholder="Es. Porridge Proteico"
              className="bg-zinc-900/50 border-zinc-800 text-lg py-6"
            />
          </div>
          <div>
            <label className="text-xs font-bold tracking-widest uppercase text-zinc-500 mb-2 block">Note e Preparazione (Opzionale)</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Appunti, tempi di cottura, ecc..."
              className="w-full bg-zinc-900/50 border border-zinc-800 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-brand-primary min-h-[80px]"
            />
          </div>
        </div>

        {/* Ingredienti */}
        <div>
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-xs font-bold tracking-widest uppercase text-zinc-500">Ingredienti</h3>
            <span className="text-xs font-semibold text-zinc-400">Totale Crudo: {rawWeight}g</span>
          </div>

          <div className="space-y-3 mb-3">
            {ingredients.map((ing, i) => (
              <Card key={i} className="border-zinc-800 bg-zinc-900/40">
                <CardContent className="p-3 flex items-center gap-3">
                  <div className="flex-1">
                    <div className="font-semibold text-sm text-white mb-1">{ing.food.name}</div>
                    <div className="text-[10px] text-zinc-500">
                      {Math.round(ing.food.kcalPer100 * (ing.amountGrams/100))} kcal
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={ing.amountGrams || ''}
                      onChange={e => updateAmount(i, e.target.value)}
                      className="w-16 bg-zinc-950 border border-zinc-800 text-white text-sm px-2 py-1.5 rounded-lg text-center"
                      placeholder="0"
                    />
                    <span className="text-xs text-zinc-500">g</span>
                    <button onClick={() => removeIngredient(i)} className="p-2 text-zinc-600 hover:text-red-500 transition-colors">
                      <Trash2 size={18} />
                    </button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {!isSearching ? (
            <Button 
              variant="secondary" 
              fullWidth 
              className="border-dashed border-2 border-zinc-800 bg-transparent hover:bg-zinc-900 text-zinc-400"
              onClick={() => setIsSearching(true)}
            >
              <Plus size={18} className="mr-2" /> Aggiungi Ingrediente
            </Button>
          ) : (
            <div className="bg-zinc-900 border border-brand-primary/50 rounded-xl p-3 space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={16} />
                <Input 
                  ref={searchInputRef}
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Cerca ingrediente..."
                  className="pl-9 bg-zinc-950 border-zinc-800 text-sm"
                />
              </div>
              <div className="max-h-48 overflow-y-auto space-y-1 pr-1">
                {searchResults.length === 0 && searchQuery && (
                  <div className="text-center text-xs text-zinc-500 py-4">Nessun risultato</div>
                )}
                {searchResults.map(res => (
                  <button 
                    key={res.id} 
                    onClick={() => handleAddIngredient(res)}
                    className="w-full text-left p-2 rounded-lg hover:bg-zinc-800 flex justify-between items-center transition-colors"
                  >
                    <span className="text-sm font-medium text-white">{res.name}</span>
                    <span className="text-xs text-brand-primary"><Plus size={14}/></span>
                  </button>
                ))}
              </div>
              <Button variant="ghost" fullWidth size="sm" onClick={() => setIsSearching(false)}>
                Annulla
              </Button>
            </div>
          )}
        </div>

        {/* Resa (Cottura) */}
        <div>
          <h3 className="text-xs font-bold tracking-widest uppercase text-zinc-500 mb-3">Resa (Peso Cotto)</h3>
          <Card className="border-orange-900/30 bg-orange-950/10">
            <CardContent className="p-4">
              <div className="flex items-center gap-3 mb-4">
                <div className="bg-orange-500/20 p-2 rounded-full text-orange-500">
                  <ChefHat size={20} />
                </div>
                <div>
                  <p className="text-xs text-zinc-400">Il peso cambia dopo la cottura (evaporazione acqua). Inserisci il peso finale per calibrare i macro.</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Input 
                  type="number"
                  value={cookedWeightStr}
                  onChange={e => setCookedWeightStr(e.target.value)}
                  placeholder={rawWeight.toString()}
                  className="bg-zinc-900/80 border-orange-900/50 text-xl font-bold text-center"
                />
                <span className="font-semibold text-zinc-500">grammi</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Live Macros (per 100g) */}
        <div>
          <h3 className="text-xs font-bold tracking-widest uppercase text-zinc-500 mb-3">Valori Finali (per 100g)</h3>
          <div className="grid grid-cols-4 gap-2 text-center bg-zinc-900/40 rounded-xl p-3 border border-zinc-800">
            <div>
              <div className="text-[10px] text-zinc-500 uppercase font-bold mb-1">Kcal</div>
              <div className="font-black text-brand-primary">{Math.round(kcalPer100) || 0}</div>
            </div>
            <div>
              <div className="text-[10px] text-violet-400 uppercase font-bold mb-1">Pro</div>
              <div className="font-semibold text-white">{Math.round(proPer100 * 10) / 10 || 0}g</div>
            </div>
            <div>
              <div className="text-[10px] text-amber-400 uppercase font-bold mb-1">Carbo</div>
              <div className="font-semibold text-white">{Math.round(carbsPer100 * 10) / 10 || 0}g</div>
            </div>
            <div>
              <div className="text-[10px] text-rose-400 uppercase font-bold mb-1">Fat</div>
              <div className="font-semibold text-white">{Math.round(fatPer100 * 10) / 10 || 0}g</div>
            </div>
          </div>
        </div>

      </div>

      {/* Footer Fissato */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-zinc-950 via-zinc-950 to-transparent">
        <Button 
          variant="primary" 
          fullWidth 
          size="lg"
          onClick={handleSave}
          disabled={!name.trim() || ingredients.length === 0 || cookedWeight <= 0}
          className="shadow-xl shadow-brand-primary/20"
        >
          <Save size={20} className="mr-2" />
          Salva Ricetta
        </Button>
      </div>
    </div>
  );
};

export default CreateRecipe;
