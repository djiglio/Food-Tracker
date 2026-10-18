import { create } from 'zustand';
import { DiaryDayRecord, FoodLogItem, getDayRecord, saveDayRecord } from '@/services/db';

interface DiaryState {
  currentDate: string; // YYYY-MM-DD
  dayRecord: DiaryDayRecord | null;
  isLoading: boolean;
  
  // Actions
  setCurrentDate: (date: string) => void;
  loadDay: (date: string, activeTargetId: string) => Promise<void>;
  addFoodToMeal: (mealId: string, item: FoodLogItem) => Promise<void>;
  removeFoodFromMeal: (mealId: string, itemId: string) => Promise<void>;
  updateFoodInMeal: (mealId: string, item: FoodLogItem) => Promise<void>;
  copyMealFromHistory: (sourceDate: string, sourceMealId: string, targetMealId: string) => Promise<void>;
}

const getEmptyDayRecord = (date: string, targetVersionId: string): DiaryDayRecord => ({
  date,
  targetVersionId,
  meals: {}
});

export const useDiaryStore = create<DiaryState>((set, get) => ({
  currentDate: new Date().toISOString().split('T')[0],
  dayRecord: null,
  isLoading: true,

  setCurrentDate: (date) => set({ currentDate: date }),

  loadDay: async (date, activeTargetId) => {
    set({ isLoading: true });
    try {
      let record = await getDayRecord(date);
      if (!record) {
        record = getEmptyDayRecord(date, activeTargetId);
        // Salvataggio asincrono "lazy" del nuovo giorno vuoto
        saveDayRecord(record).catch(console.error);
      }
      set({ dayRecord: record, currentDate: date, isLoading: false });
    } catch (error) {
      console.error("Failed to load diary day", error);
      set({ isLoading: false });
    }
  },

  addFoodToMeal: async (mealId, item) => {
    const { dayRecord } = get();
    if (!dayRecord) return;

    const currentMeal = dayRecord.meals[mealId] || { items: [] };
    const newRecord = {
      ...dayRecord,
      meals: {
        ...dayRecord.meals,
        [mealId]: { items: [...currentMeal.items, item] }
      }
    };

    set({ dayRecord: newRecord });
    await saveDayRecord(newRecord);
  },

  removeFoodFromMeal: async (mealId, itemId) => {
    const { dayRecord } = get();
    if (!dayRecord) return;

    const currentMeal = dayRecord.meals[mealId];
    if (!currentMeal) return;

    const newRecord = {
      ...dayRecord,
      meals: {
        ...dayRecord.meals,
        [mealId]: { items: currentMeal.items.filter(i => i.id !== itemId) }
      }
    };

    set({ dayRecord: newRecord });
    await saveDayRecord(newRecord);
  },

  updateFoodInMeal: async (mealId, item) => {
    const { dayRecord } = get();
    if (!dayRecord) return;

    const currentMeal = dayRecord.meals[mealId];
    if (!currentMeal) return;

    const newRecord = {
      ...dayRecord,
      meals: {
        ...dayRecord.meals,
        [mealId]: { items: currentMeal.items.map(i => i.id === item.id ? item : i) }
      }
    };

    set({ dayRecord: newRecord });
    await saveDayRecord(newRecord);
  },

  copyMealFromHistory: async (sourceDate, sourceMealId, targetMealId) => {
    const { dayRecord } = get();
    if (!dayRecord) return;

    const sourceRecord = await getDayRecord(sourceDate);
    if (!sourceRecord || !sourceRecord.meals[sourceMealId]) {
      throw new Error("Pasto sorgente non trovato nello storico.");
    }

    const itemsToCopy = sourceRecord.meals[sourceMealId].items.map(item => ({
      ...item,
      id: crypto.randomUUID ? crypto.randomUUID() : Date.now().toString() + Math.random(), // Genera nuovi ID per la copia
    }));

    const currentMeal = dayRecord.meals[targetMealId] || { items: [] };
    const newRecord = {
      ...dayRecord,
      meals: {
        ...dayRecord.meals,
        [targetMealId]: { items: [...currentMeal.items, ...itemsToCopy] }
      }
    };

    set({ dayRecord: newRecord });
    await saveDayRecord(newRecord);
  }
}));
