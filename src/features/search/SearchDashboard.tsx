import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Search, ArrowLeft, Plus, ChevronRight, ScanLine } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { searchFoods, FoodEntity, getFoodByBarcode, saveFood } from '@/services/db';
import { fetchOpenFoodFacts } from '@/services/openfoodfacts';
import AddFoodDrawer from './AddFoodDrawer';
import CreateFood from './CreateFood';
import BarcodeScanner from './BarcodeScanner';

export const SearchDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const targetMealId = searchParams.get('meal');

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<FoodEntity[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [scannedBarcode, setScannedBarcode] = useState<string | undefined>(undefined);
  const [selectedFood, setSelectedFood] = useState<FoodEntity | null>(null);

  // Debounced Search
  useEffect(() => {
    const timer = setTimeout(async () => {
      try {
        const res = await searchFoods(query);
        setResults(res);
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

  // Se siamo in modalità creazione, renderizza il form di creazione
  if (isCreating) {
    return (
      <CreateFood 
        prefillBarcode={scannedBarcode}
        onBack={() => {
          setIsCreating(false);
          setScannedBarcode(undefined);
        }} 
        onFoodCreated={(newFood) => {
          setIsCreating(false);
          setScannedBarcode(undefined);
          setSelectedFood(newFood); // Apri subito il drawer per aggiungerlo
        }} 
      />
    );
  }

  // Se siamo in modalità scansione
  if (isScanning) {
    return <BarcodeScanner onScan={handleBarcodeScan} onClose={() => setIsScanning(false)} />;
  }

  return (
    <div className="flex flex-col h-full bg-zinc-950 overflow-hidden">
      
      {/* Header Ricerca Fissato */}
      <div className="bg-zinc-950 border-b border-zinc-900 px-4 py-3 pt-safe space-y-4">
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
      <div className="flex-1 overflow-y-auto p-4 pb-safe space-y-2">
        {results.length === 0 ? (
          <div className="text-center py-10 space-y-4">
            <div className="mx-auto w-16 h-16 bg-zinc-900 rounded-full flex items-center justify-center text-zinc-700 mb-4">
              <Search size={32} />
            </div>
            <p className="text-zinc-500 text-sm">
              {query ? 'Nessun alimento trovato nel tuo database.' : 'Digita per cercare tra i tuoi alimenti salvati.'}
            </p>
            <Button variant="secondary" onClick={() => setIsCreating(true)} className="mt-4">
              <Plus size={18} className="mr-2" /> Crea Alimento Custom
            </Button>
          </div>
        ) : (
          <>
            <div className="flex justify-between items-center mb-2 px-1">
              <span className="text-xs font-bold tracking-widest uppercase text-zinc-500">I Miei Alimenti</span>
              <button onClick={() => setIsCreating(true)} className="text-xs text-brand-primary font-semibold flex items-center">
                <Plus size={14} className="mr-1" /> Nuovo
              </button>
            </div>
            
            {results.map((food) => (
              <button 
                key={food.id}
                onClick={() => setSelectedFood(food)}
                className="w-full text-left p-4 bg-zinc-900/40 hover:bg-zinc-800/60 border border-zinc-800/80 rounded-2xl flex items-center justify-between transition-colors active:scale-95 group"
              >
                <div>
                  <h3 className="font-semibold text-white leading-tight">{food.name}</h3>
                  <div className="text-xs text-zinc-500 mt-1 flex items-center gap-2">
                    {food.brand && <span className="bg-zinc-800 px-1.5 py-0.5 rounded text-[10px]">{food.brand}</span>}
                    <span>{food.kcalPer100} kcal / 100g</span>
                  </div>
                </div>
                <div className="text-zinc-600 group-hover:text-brand-primary transition-colors">
                  <ChevronRight size={20} />
                </div>
              </button>
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

    </div>
  );
};

export default SearchDashboard;
