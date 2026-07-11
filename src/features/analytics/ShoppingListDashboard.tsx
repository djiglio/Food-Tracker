import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/Card';
import { ArrowLeft, ShoppingCart, Calendar, CheckCircle2, Copy, ChefHat, Check } from 'lucide-react';
import { initDB } from '@/services/db';
import { cn } from '@/core/utils';

interface ShoppingItem {
  name: string;
  amountGrams: number;
}

export const ShoppingListDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [rangeDays, setRangeDays] = useState<number>(3);
  const [items, setItems] = useState<ShoppingItem[]>([]);
  const [checkedItems, setCheckedItems] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    generateList(rangeDays);
    // Reset checked items when range changes
    setCheckedItems(new Set());
  }, [rangeDays]);

  const generateList = async (days: number) => {
    setIsLoading(true);
    try {
      const db = await initDB();
      const history = await db.getAll('history');
      const allFoods = await db.getAll('foods');
      const foodsMap = new Map(allFoods.map(f => [f.id, f]));

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayStr = today.toISOString().split('T')[0];

      const targetDate = new Date(today);
      targetDate.setDate(targetDate.getDate() + days - 1);
      const targetDateStr = targetDate.toISOString().split('T')[0];

      const futureHistory = history.filter(r => r.date >= todayStr && r.date <= targetDateStr);
      const aggregated = new Map<string, number>();

      const addAmount = (name: string, grams: number) => {
        const current = aggregated.get(name) || 0;
        aggregated.set(name, current + grams);
      };

      for (const day of futureHistory) {
        if (!day.meals) continue;
        for (const meal of Object.values(day.meals)) {
          for (const item of meal.items) {
            const food = foodsMap.get(item.foodId);
            
            let amountGrams = item.amount;
            if (item.unit !== 'g' && food?.defaultUnitAmount) {
              amountGrams = item.amount * food.defaultUnitAmount;
            }
            
            if (food?.isRecipe && food.recipeIngredients) {
              // Scomposizione automatica della ricetta
              const cookedWeight = food.cookedWeightGrams || food.rawWeightGrams || 100;
              const ratio = amountGrams / cookedWeight;
              for (const ing of food.recipeIngredients) {
                addAmount(ing.name, ing.amountGrams * ratio);
              }
            } else {
              addAmount(item.name, amountGrams);
            }
          }
        }
      }

      const list: ShoppingItem[] = Array.from(aggregated.entries())
        .map(([name, amountGrams]) => ({
          name,
          amountGrams: Math.round(amountGrams),
        }))
        .filter(item => item.amountGrams > 0)
        .sort((a, b) => a.name.localeCompare(b.name));

      setItems(list);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleCheck = (name: string) => {
    setCheckedItems(prev => {
      const next = new Set(prev);
      if (next.has(name)) {
        next.delete(name);
      } else {
        next.add(name);
      }
      return next;
    });
  };

  const copyToClipboard = () => {
    let text = `🛒 Lista della Spesa (${rangeDays} giorni)\n\n`;
    const toBuy = items.filter(i => !checkedItems.has(i.name));
    if (toBuy.length === 0) {
      text += "Tutto completato! ✅\n";
    } else {
      toBuy.forEach(i => {
        text += `- ${i.name}: ${i.amountGrams}g\n`;
      });
    }
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col h-full bg-zinc-950 pb-safe">
      {/* Header Assoluto */}
      <div className="flex items-center justify-between p-4 bg-zinc-950/80 backdrop-blur-md sticky top-0 z-10 border-b border-zinc-900">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-zinc-400 hover:text-white transition-colors">
            <ArrowLeft size={24} />
          </button>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white leading-none">Lista Spesa</h1>
            <p className="text-xs text-zinc-500 mt-1">Generata dal tuo diario</p>
          </div>
        </div>
        <button 
          onClick={copyToClipboard}
          className="flex items-center gap-2 px-3 py-1.5 bg-brand-primary/10 text-brand-primary rounded-lg text-xs font-bold active:scale-95 transition-all"
        >
          {copied ? <Check size={16} /> : <Copy size={16} />}
          {copied ? 'Copiato' : 'Copia'}
        </button>
      </div>

      <div className="p-4 flex-1 overflow-y-auto space-y-6">
        
        {/* Selector Giorni */}
        <div className="flex gap-2 p-1 bg-zinc-900 rounded-xl">
          {[1, 3, 7].map(days => (
            <button
              key={days}
              onClick={() => setRangeDays(days)}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 py-2 text-sm font-semibold rounded-lg transition-all",
                rangeDays === days 
                  ? "bg-brand-primary text-black shadow-sm" 
                  : "text-zinc-400 hover:text-white hover:bg-zinc-800/50"
              )}
            >
              <Calendar size={16} />
              {days === 1 ? 'Oggi' : `${days} Giorni`}
            </button>
          ))}
        </div>

        {/* Info Box */}
        <Card className="border-blue-900/30 bg-blue-950/10">
          <CardContent className="p-4 flex gap-3">
            <ChefHat className="text-blue-500 shrink-0 mt-0.5" size={18} />
            <p className="text-xs text-blue-300/80 leading-relaxed">
              L'algoritmo scompone automaticamente le ricette composte nei loro ingredienti base, 
              calcolando le proporzioni esatte in base al calo di peso post-cottura.
            </p>
          </CardContent>
        </Card>

        {/* Lista */}
        <div>
          <h3 className="text-xs font-bold tracking-widest uppercase text-zinc-500 mb-3">Da Comprare</h3>
          
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="h-16 bg-zinc-900/50 rounded-2xl animate-pulse"></div>
              ))}
            </div>
          ) : items.length === 0 ? (
            <div className="text-center py-10 space-y-3">
              <div className="mx-auto w-12 h-12 bg-zinc-900 rounded-full flex items-center justify-center text-zinc-700">
                <ShoppingCart size={24} />
              </div>
              <p className="text-zinc-500 text-sm">Non hai ancora pianificato pasti <br/>per questo periodo.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {items.map(item => {
                const isChecked = checkedItems.has(item.name);
                return (
                  <button
                    key={item.name}
                    onClick={() => toggleCheck(item.name)}
                    className={cn(
                      "w-full flex items-center justify-between p-4 rounded-2xl border transition-all active:scale-[0.98]",
                      isChecked 
                        ? "bg-zinc-900/30 border-transparent opacity-50" 
                        : "bg-zinc-900/60 border-zinc-800/80 hover:bg-zinc-800/80"
                    )}
                  >
                    <div className="flex items-center gap-4">
                      <div className={cn(
                        "w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors",
                        isChecked ? "border-brand-primary bg-brand-primary text-black" : "border-zinc-600 text-transparent"
                      )}>
                        <CheckCircle2 size={16} className={isChecked ? "opacity-100" : "opacity-0"} />
                      </div>
                      <span className={cn(
                        "font-semibold transition-all",
                        isChecked ? "line-through text-zinc-500" : "text-white"
                      )}>
                        {item.name}
                      </span>
                    </div>
                    <div className={cn(
                      "font-bold transition-all",
                      isChecked ? "text-zinc-600" : "text-brand-primary"
                    )}>
                      {item.amountGrams}g
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default ShoppingListDashboard;
