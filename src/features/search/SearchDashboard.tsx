import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Search, ArrowLeft, Plus, ChevronRight, ScanLine, ChefHat, Star, Trash2, Edit2 } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { searchFoods, FoodEntity, getFoodByBarcode, saveFood, deleteFood } from '@/services/db';
import { fetchOpenFoodFacts } from '@/services/openfoodfacts';
import { SwipeableItem } from '@/components/ui/SwipeableItem';
import { fetchOpenFoodFacts } from '@/services/openfoodfacts';
import AddFoodDrawer from './AddFoodDrawer';
import CreateFood from './CreateFood';
import CreateRecipe from './CreateRecipe';
import BarcodeScanner from './BarcodeScanner';

export const SearchDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const targetMealId = searchParams.get('meal');

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<FoodEntity[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [isCreatingRecipe, setIsCreatingRecipe] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [scannedBarcode, setScannedBarcode] = useState<string | undefined>(undefined);
  const [selectedFood, setSelectedFood] = useState<FoodEntity | null>(null);
  const [itemToDelete, setItemToDelete] = useState<FoodEntity | null>(null);
  const [foodToEdit, setFoodToEdit] = useState<FoodEntity | undefined>(undefined);

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
        onFoodCreated={(newFood) => {
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

  return (
    <div className="flex flex-col min-h-full bg-zinc-950">
      
      {/* Header Ricerca Fissato */}
      <div className="sticky top-0 z-40 glass-header px-4 pb-3 space-y-4 pt-safe">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-2 text-zinc-400 hover:text-white active:scale-95 bg-zinc-900 rounded-full shrink-0">
            <ArrowLeft size={20} />
          </button>
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
            <Input 
              autoFocus
              placeholder="Cerca o scansiona..." 
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-10 pr-12 bg-zinc-900/50 border-zinc-800 focus-visible:ring-brand-primary"
            />
            <button 
              onClick={() => setIsScanning(true)}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-zinc-400 hover:text-brand-primary active:scale-95 transition-colors"
            >
              <ScanLine size={20} />
            </button>
          </div>
        </div>
      </div>

      {/* Lista Risultati Scorrevole */}
      <div className="flex-1 p-4 space-y-2">
        {results.length === 0 ? (
          <div className="text-center py-10 space-y-4">
            <div className="mx-auto w-16 h-16 bg-zinc-900 rounded-full flex items-center justify-center text-zinc-700 mb-4">
              <Search size={32} />
            </div>
            <p className="text-zinc-500 text-sm">
              {query ? 'Nessun alimento trovato nel tuo database.' : 'Digita per cercare tra i tuoi alimenti salvati.'}
            </p>
            <div className="mt-4 flex flex-col gap-2 w-full max-w-xs mx-auto">
              <Button variant="secondary" onClick={() => setIsCreatingRecipe(true)} className="w-full">
                <ChefHat size={18} className="mr-2" /> Crea Ricetta Composta
              </Button>
              <Button variant="ghost" onClick={() => setIsCreating(true)} className="w-full text-zinc-400">
                <Plus size={18} className="mr-2" /> Crea Alimento Custom
              </Button>
            </div>
          </div>
        ) : (
          <>
            <div className="flex justify-between items-center mb-2 px-1">
              <span className="text-xs font-bold tracking-widest uppercase text-zinc-500">I Miei Alimenti</span>
              <div className="flex gap-3">
                <button onClick={() => setIsCreatingRecipe(true)} className="text-xs text-brand-primary font-semibold flex items-center">
                  <Plus size={14} className="mr-1" /> Ricetta
                </button>
                <button onClick={() => setIsCreating(true)} className="text-xs text-brand-primary font-semibold flex items-center">
                  <Plus size={14} className="mr-1" /> Alimento
                </button>
              </div>
            </div>
            
            {results.map((food) => (
              <SwipeableItem
                key={food.id}
                onSwipeLeft={() => setItemToDelete(food)}
                onSwipeRight={() => {
                  setFoodToEdit(food);
                  setIsCreating(true);
                }}
                leftActionContent={<><Edit2 size={24} className="mr-3" /> Modifica</>}
                rightActionContent={<>Elimina <Trash2 size={24} className="ml-3" /></>}
                swipeThreshold={70}
                maxSwipe={120}
              >
                <div 
                  onClick={() => setSelectedFood(food)}
                  className="w-full text-left p-4 flex items-center justify-between cursor-pointer hover:bg-zinc-800/60 transition-colors"
                >
                  <div>
                    <h3 className="font-semibold text-white leading-tight flex items-center gap-2">
                      {food.name}
                      {food.isFavorite && <Star size={12} className="text-amber-400 fill-amber-400" />}
                    </h3>
                    <div className="text-xs text-zinc-500 mt-1 flex items-center gap-2">
                      {food.brand && <span className="bg-zinc-800 px-1.5 py-0.5 rounded text-[10px]">{food.brand}</span>}
                      <span>{food.kcalPer100} kcal / 100g</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <button 
                      onClick={(e) => toggleFavorite(e, food)}
                      className="p-2 -mr-2 text-zinc-600 hover:text-amber-400 active:scale-95 transition-all"
                    >
                      <Star size={18} className={food.isFavorite ? "text-amber-400 fill-amber-400" : ""} />
                    </button>
                    <div className="text-zinc-600 group-hover:text-brand-primary transition-colors">
                      <ChevronRight size={20} />
                    </div>
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
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-3xl w-full max-w-sm shadow-2xl animate-in zoom-in-95 duration-200">
            <h3 className="text-xl font-bold text-white mb-2">Elimina Alimento</h3>
            <p className="text-zinc-400 mb-6 text-sm">
              Sei sicuro di voler eliminare definitivamente "{itemToDelete.name}"? Questa azione non può essere annullata.
            </p>
            <div className="flex gap-3">
              <Button variant="ghost" fullWidth onClick={() => setItemToDelete(null)}>Annulla</Button>
              <Button variant="danger" fullWidth onClick={handleDeleteConfirm}>Elimina</Button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default SearchDashboard;
