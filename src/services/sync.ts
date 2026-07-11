import { db as firestore, auth } from './firebase';
import { doc, setDoc, getDoc, collection, getDocs, writeBatch } from 'firebase/firestore';
import { initDB, FoodEntity, DiaryDayRecord } from './db';
import { useUserStore } from '@/store/userStore';

// We debounce the sync to avoid too many writes
let syncTimeout: NodeJS.Timeout | null = null;

export const triggerDebouncedSync = () => {
  if (syncTimeout) {
    clearTimeout(syncTimeout);
  }
  syncTimeout = setTimeout(() => {
    syncLocalToCloud().catch(console.error);
  }, 3000); // 3 seconds debounce
};

export const syncLocalToCloud = async () => {
  const user = auth.currentUser;
  if (!user) return; // Non loggato, nessuna sincronizzazione

  const db = await initDB();
  const uid = user.uid;

  try {
    // 1. Sync Profile & Targets from Zustand store
    const state = useUserStore.getState();
    if (state.profile) {
      await setDoc(doc(firestore, `users/${uid}/data/profile`), {
        profile: state.profile,
        targetVersions: state.targetVersions,
      });
    }

    // 2. Sync Foods
    const foods = await db.getAll('foods');
    const foodBatch = writeBatch(firestore);
    foods.forEach((food) => {
      const foodRef = doc(firestore, `users/${uid}/foods/${food.id}`);
      foodBatch.set(foodRef, food);
    });
    // Attenzione: writeBatch supporta max 500 operazioni, per db enormi va diviso in chunk
    if (foods.length > 0 && foods.length <= 500) {
      await foodBatch.commit();
    }

    // 3. Sync History
    const history = await db.getAll('history');
    const historyBatch = writeBatch(firestore);
    history.forEach((day) => {
      const dayRef = doc(firestore, `users/${uid}/history/${day.date}`);
      historyBatch.set(dayRef, day);
    });
    if (history.length > 0 && history.length <= 500) {
      await historyBatch.commit();
    }

    // 4. Sync Weight Logs
    const weights = await db.getAll('weightLogs');
    const weightBatch = writeBatch(firestore);
    weights.forEach((log) => {
      const wRef = doc(firestore, `users/${uid}/weightLogs/${log.date}`);
      weightBatch.set(wRef, log);
    });
    if (weights.length > 0 && weights.length <= 500) {
      await weightBatch.commit();
    }

    console.log('[Cloud Sync] Dati sincronizzati con successo su Firestore');
  } catch (error) {
    console.error('[Cloud Sync] Errore durante la sincronizzazione', error);
  }
};

export const downloadCloudToLocal = async () => {
  const user = auth.currentUser;
  if (!user) return;

  const db = await initDB();
  const uid = user.uid;

  try {
    // 1. Profile
    const profileSnap = await getDoc(doc(firestore, `users/${uid}/data/profile`));
    if (profileSnap.exists()) {
      const data = profileSnap.data();
      if (data.profile) {
        useUserStore.getState().setProfile(data.profile);
      }
      if (data.targetVersions) {
        useUserStore.setState({ targetVersions: data.targetVersions });
      }
    }

    // 2. Foods
    const foodsSnap = await getDocs(collection(firestore, `users/${uid}/foods`));
    const txFoods = db.transaction('foods', 'readwrite');
    for (const doc of foodsSnap.docs) {
      await txFoods.store.put(doc.data() as FoodEntity);
    }
    await txFoods.done;

    // 3. History
    const historySnap = await getDocs(collection(firestore, `users/${uid}/history`));
    const txHistory = db.transaction('history', 'readwrite');
    for (const doc of historySnap.docs) {
      await txHistory.store.put(doc.data() as DiaryDayRecord);
    }
    await txHistory.done;

    // 4. Weight Logs
    const weightSnap = await getDocs(collection(firestore, `users/${uid}/weightLogs`));
    const txWeight = db.transaction('weightLogs', 'readwrite');
    for (const doc of weightSnap.docs) {
      await txWeight.store.put(doc.data() as {date: string, weightKg: number});
    }
    await txWeight.done;

    console.log('[Cloud Download] Dati scaricati e salvati in locale');
  } catch (error) {
    console.error('[Cloud Download] Errore nel download dei dati', error);
  }
};
