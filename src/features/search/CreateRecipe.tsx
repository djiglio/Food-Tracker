import React, { useState, useEffect, useRef } from 'react';
import { FoodEntity, searchFoods, saveFood, RecipeIngredient } from '@/services/db';
import { Card, CardContent } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { ArrowLeft, Search, Plus, Trash2, ChefHat, Save } from 'lucide-react';

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
    <div className="flex flex-col h-full bg-[#09090b] overflow-y-auto tabular-nums">
      {/* Header Fissato */}
      <div className="sticky top-0 z-40 glass-header px-4 pb-3 flex items-center gap-3 pt-safe">
        <button
          onClick={onBack}
          className="w-9 h-9 text-zinc-400 hover:text-zinc-100 active:scale-95 bg-[#121215] border border-white/[0.06] rounded-xl flex items-center justify-center transition-colors"
        >
          <ArrowLeft size={18} strokeWidth={1.75} />
        </button>
        <h1 className="font-semibold tracking-tight text-lg text-zinc-100">Nuova ricetta</h1>
      </div>

      <div className="p-4 space-y-5 pb-28">
        {/* Info di Base */}
        <Card>
          <CardContent className="p-4 space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-400 block">Nome ricetta</label>
              <Input 
                value={name} 
                onChange={e => setName(e.target.value)} 
                placeholder="Es. Porridge proteico"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-400 block">Note e preparazione (opzionale)</label>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Appunti, tempi di cottura, ecc..."
                className="w-full bg-[#18181c] border border-white/[0.06] rounded-xl p-3 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-1 focus:ring-white/25 min-h-[76px]"
              />
            </div>
          </CardContent>
        </Card>

        {/* Ingredienti */}
        <div>
          <div className="flex justify-between items-center mb-2.5 px-1">
            <h3 className="text-xs font-medium text-zinc-500">Ingredienti</h3>
            <span className="text-xs font-medium text-zinc-400">Peso crudo: {rawWeight}g</span>
          </div>

          {ingredients.length > 0 && (
            <Card className="mb-3 overflow-hidden">
              <CardContent className="p-0 divide-y divide-white/[0.04]">
                {ingredients.map((ing, i) => (
                  <div key={i} className="p-3.5 flex items-center justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="font-medium text-sm text-zinc-100 truncate">{ing.food.name}</div>
                      <div className="text-xs text-zinc-500 mt-0.5">
                        {Math.round(ing.food.kcalPer100 * (ing.amountGrams / 100))} kcal
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <div className="relative w-20">
                        <Input
                          type="number"
                          label={`Grammi ${ing.food.name}`}
                          value={ing.amountGrams || ''}
                          onChange={e => updateAmount(i, e.target.value)}
                          className="h-8 bg-[#09090b] border-white/[0.06] text-zinc-100 text-sm pr-6 rounded-lg text-center font-semibold"
                          placeholder="0"
                        />
                        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-zinc-500">g</span>
                      </div>
                      <button
                        onClick={() => removeIngredient(i)}
                        className="p-1.5 text-zinc-500 hover:text-rose-400 transition-colors"
                      >
                        <Trash2 size={16} strokeWidth={1.75} />
                      </button>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {!isSearching ? (
            <Button 
              variant="secondary" 
              fullWidth 
              className="border-dashed border border-white/[0.1] text-zinc-300"
              onClick={() => setIsSearching(true)}
            >
              <Plus size={16} strokeWidth={2} className="mr-1.5" /> Aggiungi ingrediente
            </Button>
          ) : (
            <Card>
              <CardContent className="p-3.5 space-y-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={15} strokeWidth={1.75} />
                  <Input 
                    ref={searchInputRef}
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="Cerca ingrediente..."
                    className="pl-9 h-9 bg-[#09090b] border-white/[0.06] text-sm"
                  />
                </div>
                <div className="max-h-48 overflow-y-auto divide-y divide-white/[0.04]">
                  {searchResults.length === 0 && searchQuery && (
                    <div className="text-center text-xs text-zinc-500 py-4">Nessun risultato</div>
                  )}
                  {searchResults.map(res => (
                    <button 
                      key={res.id} 
                      onClick={() => handleAddIngredient(res)}
                      className="w-full text-left py-2.5 px-2 hover:bg-white/[0.03] flex justify-between items-center transition-colors"
                    >
                      <span className="text-sm font-medium text-zinc-100 truncate pr-2">{res.name}</span>
                      <Plus size={15} strokeWidth={2} className="text-zinc-400 shrink-0" />
                    </button>
                  ))}
                </div>
                <Button variant="secondary" fullWidth size="sm" onClick={() => setIsSearching(false)}>
                  Annulla
                </Button>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Resa (Cottura) */}
        <div>
          <h3 className="text-xs font-medium text-zinc-500 mb-2.5 px-1">Resa dopo cottura</h3>
          <Card>
            <CardContent className="p-4 space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-xl bg-[#18181c] border border-white/[0.06] flex items-center justify-center text-zinc-300 shrink-0">
                  <ChefHat size={16} strokeWidth={1.75} />
                </div>
                <p className="text-xs text-zinc-500 leading-relaxed">
                  Inserisci il peso totale a fine cottura per ricalibrare automaticamente calorie e macronutrienti su 100g.
                </p>
              </div>
              <div className="relative">
                <Input 
                  type="number"
                  label="Peso cotto totale (g)"
                  value={cookedWeightStr}
                  onChange={e => setCookedWeightStr(e.target.value)}
                  placeholder={rawWeight.toString()}
                  className="bg-[#18181c] border-white/[0.06] text-base font-semibold pr-16"
                />
                <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs text-zinc-500 font-medium">grammi</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Live Macros (per 100g) */}
        <div>
          <h3 className="text-xs font-medium text-zinc-500 mb-2.5 px-1">Valori finali (per 100g)</h3>
          <div className="grid grid-cols-4 gap-2 bg-[#121215] rounded-2xl p-3.5 border border-white/[0.06]">
            <div>
              <div className="text-xs text-zinc-400 font-medium mb-1">Energia</div>
              <div className="text-sm font-semibold text-zinc-100">{Math.round(kcalPer100) || 0} <span className="text-[11px] text-zinc-500 font-normal">kcal</span></div>
            </div>
            <div>
              <div className="flex items-center gap-1 mb-1">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                <span className="text-xs text-zinc-400 font-medium">Proteine</span>
              </div>
              <div className="text-sm font-semibold text-zinc-100">{Math.round(proPer100 * 10) / 10 || 0}g</div>
            </div>
            <div>
              <div className="flex items-center gap-1 mb-1">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                <span className="text-xs text-zinc-400 font-medium">Carbo</span>
              </div>
              <div className="text-sm font-semibold text-zinc-100">{Math.round(carbsPer100 * 10) / 10 || 0}g</div>
            </div>
            <div>
              <div className="flex items-center gap-1 mb-1">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                <span className="text-xs text-zinc-400 font-medium">Grassi</span>
              </div>
              <div className="text-sm font-semibold text-zinc-100">{Math.round(fatPer100 * 10) / 10 || 0}g</div>
            </div>
          </div>
        </div>

      </div>

      {/* Footer Fissato */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-[#09090b] via-[#09090b]/95 to-transparent">
        <Button 
          variant="primary" 
          fullWidth 
          size="lg"
          onClick={handleSave}
          disabled={!name.trim() || ingredients.length === 0 || cookedWeight <= 0}
        >
          <Save size={18} strokeWidth={2} className="mr-2" />
          Salva ricetta
        </Button>
      </div>
    </div>
  );
};

export default CreateRecipe;
