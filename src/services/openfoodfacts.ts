import { FoodEntity } from './db';

// https://world.openfoodfacts.org/api/v2/product/{barcode}

interface OFFProduct {
  product_name?: string;
  brands?: string;
  nutriments?: {
    'energy-kcal_100g'?: number;
    proteins_100g?: number;
    carbohydrates_100g?: number;
    fat_100g?: number;
  };
}

interface OFFResponse {
  code: string;
  product?: OFFProduct;
  status: number; // 1 if found, 0 if not found
}

export const fetchOpenFoodFacts = async (barcode: string): Promise<Partial<FoodEntity> | null> => {
  try {
    const res = await fetch(`https://world.openfoodfacts.org/api/v2/product/${barcode}.json`);
    
    if (!res.ok) {
      return null;
    }

    const data: OFFResponse = await res.json();

    if (data.status !== 1 || !data.product) {
      return null;
    }

    const p = data.product;
    const n = p.nutriments || {};

    // Validiamo che abbia almeno le calorie e il nome
    if (!p.product_name || typeof n['energy-kcal_100g'] !== 'number') {
      return null;
    }

    return {
      barcode: barcode,
      name: p.product_name,
      brand: p.brands,
      kcalPer100: n['energy-kcal_100g'] || 0,
      proteinPer100: n.proteins_100g || 0,
      carbsPer100: n.carbohydrates_100g || 0,
      fatPer100: n.fat_100g || 0,
      defaultUnit: 'g',
      defaultUnitAmount: 100,
    };
  } catch (error) {
    console.error("Errore fetch OpenFoodFacts:", error);
    return null;
  }
};
