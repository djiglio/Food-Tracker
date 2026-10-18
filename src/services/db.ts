import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { triggerDebouncedSync } from './sync';

export interface FoodLogItem {
  id: string; // UUID of this specific log
  foodId: string; // Ref to food DB
  name: string;
  amount: number;
  unit: 'g' | 'unit';
  macros: {
    kcal: number;
    proteinG: number;
    carbsG: number;
    fatG: number;
  };
}

export interface MealRecord {
  items: FoodLogItem[];
}

export interface DiaryDayRecord {
  date: string; // "YYYY-MM-DD"
  targetVersionId: string; // reference to TargetVersion active on this day
  meals: Record<string, MealRecord>; // e.g. { 'breakfast': { items: [] } }
}

interface FoodTrackerDB extends DBSchema {
  history: {
    key: string; // date
    value: DiaryDayRecord;
  };
  foods: {
    key: string;
    value: FoodEntity;
  };
  weightLogs: {
    key: string; // YYYY-MM-DD
    value: {
      date: string;
      weightKg: number;
    };
  };
}

let dbPromise: Promise<IDBPDatabase<FoodTrackerDB>> | null = null;

export const initDB = () => {
  if (!dbPromise) {
    dbPromise = openDB<FoodTrackerDB>('food-tracker-v11', 3, {
      upgrade(db, oldVersion) {
        if (oldVersion < 1) {
          db.createObjectStore('history', { keyPath: 'date' });
          db.createObjectStore('foods', { keyPath: 'id' });
        }
        if (oldVersion < 3) {
          db.createObjectStore('weightLogs', { keyPath: 'date' });
        }
      },
    });
  }
  return dbPromise;
};

// CRUD for Diary
export const getDayRecord = async (date: string): Promise<DiaryDayRecord | undefined> => {
  const db = await initDB();
  return db.get('history', date);
};

export const saveDayRecord = async (record: DiaryDayRecord): Promise<void> => {
  const db = await initDB();
  await db.put('history', record);
  triggerDebouncedSync();
};

export interface RecipeIngredient {
  foodId: string;
  name: string;
  amountGrams: number;
  macros: {
    kcal: number;
    proteinG: number;
    carbsG: number;
    fatG: number;
  };
}

export interface FoodEntity {
  id: string;
  name: string;
  brand?: string;
  kcalPer100: number;
  proteinPer100: number;
  carbsPer100: number;
  fatPer100: number;
  defaultUnit?: string;
  defaultUnitAmount?: number;
  barcode?: string; // EAN-13 per lo scanner
  isFavorite?: boolean; // Se l'alimento è tra i preferiti
  
  // Recipe fields
  isRecipe?: boolean;
  recipeIngredients?: RecipeIngredient[];
  rawWeightGrams?: number;
  cookedWeightGrams?: number;
  notes?: string;
}

export const saveFood = async (food: FoodEntity): Promise<void> => {
  const db = await initDB();
  await db.put('foods', food);
  triggerDebouncedSync();
};

export const deleteFood = async (id: string): Promise<void> => {
  const db = await initDB();
  await db.delete('foods', id);
  triggerDebouncedSync();
};

export const getFoodByBarcode = async (barcode: string): Promise<FoodEntity | undefined> => {
  const db = await initDB();
  const allFoods = await db.getAll('foods');
  return allFoods.find(f => f.barcode === barcode);
};

export const searchFoods = async (query: string): Promise<FoodEntity[]> => {
  const db = await initDB();
  const allFoods = await db.getAll('foods');
  
  if (!query) return allFoods;
  
  const lowerQuery = query.toLowerCase();
  return allFoods.filter(f => f.name.toLowerCase().includes(lowerQuery) || (f.brand && f.brand.toLowerCase().includes(lowerQuery)));
};
