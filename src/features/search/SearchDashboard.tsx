import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Search, ArrowLeft, Plus, ChevronRight, ScanLine, ChefHat, Star, Clock, Trash2, Edit2 } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { initDB, searchFoods, FoodEntity, getFoodByBarcode, saveFood, deleteFood } from '@/services/db';
import { fetchOpenFoodFacts } from '@/services/openfoodfacts';
import { SwipeableItem } from '@/components/ui/SwipeableItem';
import { cn } from '@/core/utils';
import AddFoodDrawer from './AddFoodDrawer';
import CreateFood from './CreateFood';
import CreateRecipe from './CreateRecipe';
import BarcodeScanner from './BarcodeScanner';

type QuickFilter = 'favorites' | 'recipes' | 'recent' | null;

export const SearchDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const targetMealId = searchParams.get('meal');

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<FoodEntity[]>([]);
  const [activeFilter, setActiveFilter] = useState<QuickFilter>(null);
  const [recentFoodIds, setRecentFoodIds] = useState<string[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [isCreatingRecipe, setIsCreatingRecipe] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [scannedBarcode, setScannedBarcode] = useState<string | undefined>(undefined);
  const [selectedFood, setSelectedFood] = useState<FoodEntity | null>(null);
  const [itemToDelete, setItemToDelete] = useState<FoodEntity | null>(null);
  const [foodToEdit, setFoodToEdit] = useState<FoodEntity | undefined>(undefined);

  const triggerHaptic = (ms = 12) => {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(ms);
    }
  };

  // Carica gli ID degli alimenti usati di recente dallo storico
  useEffect(() => {
    const loadRecentFoodIds = async () => {
      try {
        const db = await initDB();
        const allHistory = await db.getAll('history');
        const sortedDays = allHistory.sort((a, b) => b.date.localeCompare(a.date));
        const seen = new Set<string>();
        const recent: string[] = [];

        for (const day of sortedDays) {
          if (!day.meals) continue;
          for (const meal of Object.values(day.meals)) {
            for (const item of meal.items) {
              if (item.foodId && !seen.has(item.foodId)) {
                seen.add(item.foodId);
                recent.push(item.foodId);
              }
            }
          }
        }
        setRecentFoodIds(recent);
      } catch (e) {
        console.error(e);
      }
    };
    loadRecentFoodIds();
  }, []);

  const handleDeleteConfirm = async () => {
    if (itemToDelete) {
      await deleteFood(itemToDelete.id);
      setItemToDelete(null);
      // Aggiorna risultati
      setResults(prev => prev.filter(f => f.id !== itemToDelete.id));
    }
  };

  // Debounced Search
  useEffect(() => {
    const timer = setTimeout(async () => {
      try {
        const res = await searchFoods(query);
        // Ordina mettendo i preferiti in alto
        const sorted = res.sort((a, b) => {
          if (a.isFavorite && !b.isFavorite) return -1;
          if (!a.isFavorite && b.isFavorite) return 1;
          return a.name.localeCompare(b.name);
        });
        setResults(sorted);
      } catch (e) {
        console.error(e);
      }
    }, 300); // 300ms debounce
    return () => clearTimeout(timer);
  }, [query]);

  const filteredResults = useMemo(() => {
    if (!activeFilter) return results;
    if (activeFilter === 'favorites') {
      return results.filter(f => !!f.isFavorite);
    }
    if (activeFilter === 'recipes') {
      return results.filter(f => !!f.isRecipe);
    }
    if (activeFilter === 'recent') {
      const orderMap = new Map(recentFoodIds.map((id, idx) => [id, idx]));
      return results
        .filter(f => orderMap.has(f.id))
        .sort((a, b) => (orderMap.get(a.id) ?? 999) - (orderMap.get(b.id) ?? 999));
    }
    return results;
  }, [results, activeFilter, recentFoodIds]);

  const toggleQuickFilter = (filter: Exclude<QuickFilter, null>) => {
    triggerHaptic(12);
    setActiveFilter(prev => (prev === filter ? null : filter));
  };

  // Gestione Scansione Barcode
  const handleBarcodeScan = async (barcode: string) => {
    setIsScanning(false);
    
    // 1. Cerca in locale
    const localFood = await getFoodByBarcode(barcode);
    if (localFood) {
      setSelectedFood(localFood);
      return;
    }

    // 2. Cerca su OpenFoodFacts
    const offFood = await fetchOpenFoodFacts(barcode);
    if (offFood) {
      // Salva in locale e aprilo
      const newFood: FoodEntity = {
        id: crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(),
        ...offFood
      } as FoodEntity;
      await saveFood(newFood);
      setSelectedFood(newFood);
    } else {
      // 3. Non trovato: vai alla creazione manuale passando il barcode
      setScannedBarcode(barcode);
      setIsCreating(true);
    }
  };

  const toggleFavorite = async (e: React.MouseEvent, food: FoodEntity) => {
    e.stopPropagation(); // Previene l'apertura del drawer
    triggerHaptic(15);
    const updatedFood = { ...food, isFavorite: !food.isFavorite };
    await saveFood(updatedFood);
    
    // Aggiorna lo stato locale senza ricaricare tutto
    setResults(prev => {
      const newResults = prev.map(f => f.id === food.id ? updatedFood : f);
      return newResults.sort((a, b) => {
        if (a.isFavorite && !b.isFavorite) return -1;
        if (!a.isFavorite && b.isFavorite) return 1;
        return a.name.localeCompare(b.name);
      });
    });
  };

  if (isCreating) {
    return (
      <CreateFood 
        prefillBarcode={scannedBarcode}
        existingFood={foodToEdit}
        onBack={() => {
          setIsCreating(false);
          setScannedBarcode(undefined);
          setFoodToEdit(undefined);
        }} 
        onFoodCreated={() => {
          setIsCreating(false);
          setScannedBarcode(undefined);
          setFoodToEdit(undefined);
          // Ricarica risultati...
          setQuery('');
        }} 
      />
    );
  }

  // Se siamo in modalità creazione ricetta
  if (isCreatingRecipe) {
    return (
      <CreateRecipe 
        onBack={() => setIsCreatingRecipe(false)}
        onRecipeCreated={(newRecipe) => {
          setIsCreatingRecipe(false);
          setSelectedFood(newRecipe);
        }}
      />
    );
  }

  // Se siamo in modalità scansione
  if (isScanning) {
    return <BarcodeScanner onScan={handleBarcodeScan} onClose={() => setIsScanning(false)} />;
  }

  const filterChips: { id: Exclude<QuickFilter, null>; label: string; Icon: React.ElementType }[] = [
    { id: 'favorites', label: 'Preferiti', Icon: Star },
    { id: 'recipes', label: 'Ricette', Icon: ChefHat },
    { id: 'recent', label: 'Recenti', Icon: Clock },
  ];

  return (
    <div className="flex flex-col min-h-full bg-[#09090b]">
      
      {/* Header Ricerca Fissato */}
      <div className="sticky top-0 z-40 glass-header px-4 pb-3 space-y-3 pt-safe">
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => navigate(-1)}
            className="w-9 h-9 flex items-center justify-center text-zinc-400 hover:text-zinc-100 active:scale-95 bg-[#121215] border border-white/[0.06] rounded-xl shrink-0 transition-colors"
          >
            <ArrowLeft size={18} strokeWidth={1.75} />
          </button>
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" size={16} strokeWidth={1.75} />
            <Input 
              autoFocus
              placeholder="Cerca alimento o marca..." 
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-10 pr-11 h-10 bg-[#121215] border-white/[0.06] rounded-xl text-sm placeholder:text-zinc-500 focus-visible:ring-white/20"
            />
            <button 
              onClick={() => setIsScanning(true)}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-zinc-400 hover:text-zinc-100 active:scale-95 transition-colors"
            >
              <ScanLine size={18} strokeWidth={1.75} />
            </button>
          </div>
        </div>

        {/* Filtro rapido a chips orizzontali con icone vettoriali */}
        <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide pb-0.5 -mx-1 px-1">
          {filterChips.map(({ id, label, Icon }) => {
            const isSelected = activeFilter === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => toggleQuickFilter(id)}
                className={cn(
                  "shrink-0 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-medium transition-all duration-150 active:scale-95 border",
                  isSelected
                    ? "bg-zinc-100 text-zinc-950 border-zinc-100 shadow-sm font-semibold"
                    : "bg-[#121215] text-zinc-400 border-white/[0.06] hover:text-zinc-200 hover:bg-[#18181c]"
                )}
              >
                <Icon
                  size={13.5}
                  strokeWidth={1.75}
                  className={cn(
                    id === 'favorites' && isSelected && "fill-zinc-950"
                  )}
                />
                <span>{label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Lista Risultati Scorrevole */}
      <div className="flex-1 p-4 space-y-2.5">
        {filteredResults.length === 0 ? (
          <div className="text-center py-12 space-y-4">
            <div className="mx-auto w-14 h-14 bg-[#121215] border border-white/[0.06] rounded-2xl flex items-center justify-center text-zinc-600 mb-3">
              <Search size={24} strokeWidth={1.75} />
            </div>
            <p className="text-zinc-500 text-sm">
              {query || activeFilter
                ? 'Nessun alimento trovato con i filtri selezionati.'
                : 'Digita per cercare tra i tuoi alimenti salvati.'}
            </p>
            <div className="mt-4 flex flex-col gap-2 w-full max-w-xs mx-auto">
              <Button variant="secondary" onClick={() => setIsCreatingRecipe(true)} className="w-full">
                <ChefHat size={17} strokeWidth={1.75} className="mr-2" /> Crea ricetta composta
              </Button>
              <Button variant="ghost" onClick={() => setIsCreating(true)} className="w-full text-zinc-400">
                <Plus size={17} strokeWidth={1.75} className="mr-2" /> Crea alimento personalizzato
              </Button>
            </div>
          </div>
        ) : (
          <>
            <div className="flex justify-between items-center mb-1.5 px-1">
              <span className="text-xs font-medium text-zinc-500">I miei alimenti</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsCreatingRecipe(true)}
                  className="text-xs text-zinc-300 hover:text-white bg-[#121215] border border-white/[0.06] px-2.5 py-1 rounded-lg font-medium flex items-center gap-1 active:scale-95 transition-all"
                >
                  <Plus size={13} strokeWidth={2} /> Ricetta
                </button>
                <button
                  onClick={() => setIsCreating(true)}
                  className="text-xs text-zinc-300 hover:text-white bg-[#121215] border border-white/[0.06] px-2.5 py-1 rounded-lg font-medium flex items-center gap-1 active:scale-95 transition-all"
                >
                  <Plus size={13} strokeWidth={2} /> Alimento
                </button>
              </div>
            </div>
            
            {filteredResults.map((food) => (
              <SwipeableItem
                key={food.id}
                onSwipeLeft={() => setItemToDelete(food)}
                onSwipeRight={() => {
                  setFoodToEdit(food);
                  setIsCreating(true);
                }}
                leftActionContent={<><Edit2 size={20} strokeWidth={1.75} className="mr-2" /> Modifica</>}
                rightActionContent={<>Elimina <Trash2 size={20} strokeWidth={1.75} className="ml-2" /></>}
                swipeThreshold={70}
                maxSwipe={120}
              >
                <div 
                  onClick={() => setSelectedFood(food)}
                  className="w-full text-left px-4 py-3.5 flex items-center justify-between cursor-pointer hover:bg-white/[0.02] transition-colors"
                >
                  <div className="min-w-0 pr-3">
                    <h3 className="text-[15px] font-medium text-zinc-100 leading-snug flex items-center gap-2 truncate">
                      <span className="truncate">{food.name}</span>
                      {food.isRecipe && (
                        <span className="shrink-0 text-[10px] font-medium text-zinc-400 bg-white/[0.05] border border-white/[0.06] px-1.5 py-0.5 rounded-md">
                          Ricetta
                        </span>
                      )}
                    </h3>
                    <div className="text-xs text-zinc-500 mt-1 flex items-center gap-2 tabular-nums">
                      {food.brand && (
                        <span className="text-zinc-400 font-medium truncate max-w-[140px]">
                          {food.brand} ·
                        </span>
                      )}
                      <span className="text-zinc-400 font-medium">{food.kcalPer100} kcal</span>
                      <span className="text-zinc-600">/ 100g</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button 
                      onClick={(e) => toggleFavorite(e, food)}
                      className="p-2 text-zinc-600 hover:text-amber-400 active:scale-90 transition-all"
                    >
                      <Star
                        size={16}
                        strokeWidth={1.75}
                        className={food.isFavorite ? "text-amber-400 fill-amber-400" : ""}
                      />
                    </button>
                    <ChevronRight size={16} strokeWidth={1.75} className="text-zinc-600" />
                  </div>
                </div>
              </SwipeableItem>
            ))}
          </>
        )}
      </div>

      {/* Drawer Aggiunta Quantità */}
      <AddFoodDrawer 
        food={selectedFood} 
        targetMealId={targetMealId} 
        onClose={() => setSelectedFood(null)} 
      />

      {/* Modal Conferma Eliminazione */}
      {itemToDelete && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#121215] border border-white/[0.08] p-6 rounded-2xl w-full max-w-sm shadow-2xl animate-in zoom-in-95 duration-200">
            <h3 className="text-lg font-semibold tracking-tight text-zinc-100 mb-1.5">Elimina alimento</h3>
            <p className="text-zinc-400 mb-6 text-sm leading-relaxed">
              Vuoi eliminare definitivamente "{itemToDelete.name}"? Questa azione non può essere annullata.
            </p>
            <div className="flex gap-2.5">
              <Button variant="secondary" fullWidth onClick={() => setItemToDelete(null)}>Annulla</Button>
              <Button variant="danger" fullWidth onClick={handleDeleteConfirm}>Elimina</Button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default SearchDashboard;
