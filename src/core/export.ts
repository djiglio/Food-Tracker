import { initDB } from '@/services/db';

export const exportAllData = async (): Promise<void> => {
  try {
    const db = await initDB();
    
    // Estrai tutti i dati da IndexedDB
    const history = await db.getAll('history');
    const foods = await db.getAll('foods');
    const weightLogs = await db.getAll('weightLogs');
    
    // Estrai i dati da LocalStorage (Zustand persist)
    const userStoreStr = localStorage.getItem('user-store');
    const userStoreData = userStoreStr ? JSON.parse(userStoreStr) : null;
    
    const diaryStoreStr = localStorage.getItem('diary-store');
    const diaryStoreData = diaryStoreStr ? JSON.parse(diaryStoreStr) : null;

    const fullExport = {
      exportDate: new Date().toISOString(),
      appVersion: 'Food Tracker V11',
      idb: {
        history,
        foods,
        weightLogs
      },
      localStorage: {
        userStore: userStoreData,
        diaryStore: diaryStoreData
      }
    };

    const jsonString = JSON.stringify(fullExport, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = `food_tracker_backup_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
  } catch (error) {
    console.error("Errore durante l'esportazione dei dati:", error);
    alert("Si è verificato un errore durante l'esportazione dei dati.");
  }
};
