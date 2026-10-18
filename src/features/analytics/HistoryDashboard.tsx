import React, { useEffect, useState } from 'react';
import { initDB } from '@/services/db';
import { useUserStore } from '@/store/userStore';
import { getMacroTargetForDate } from '@/core/metabolism';
import ComplianceCalendar, { ComplianceStatus, DaySummaryData } from './ComplianceCalendar';

export const HistoryDashboard: React.FC = () => {
  const getActiveTarget = useUserStore(state => state.getActiveTarget);

  const [complianceMap, setComplianceMap] = useState<Record<string, ComplianceStatus>>({});
  const [daySummaries, setDaySummaries] = useState<Record<string, DaySummaryData>>({});
  const [currentStreak, setCurrentStreak] = useState(0);

  const loadData = async () => {
    try {
      const db = await initDB();
      const allHistory = await db.getAll('history');
      
      const now = new Date();
      const todayStr = now.toISOString().split('T')[0];

      const cMap: Record<string, ComplianceStatus> = {};
      const summariesMap: Record<string, DaySummaryData> = {};

      // 1. Calcoliamo la mappa di compliance e i riepiloghi per tutto lo storico
      allHistory.forEach(record => {
        const activeTarget = getActiveTarget(record.date);
        const targetKcal = activeTarget ? getMacroTargetForDate(activeTarget, record.date).kcal : 2000;
        
        let consumedKcal = 0;
        let consumedPro = 0;
        let consumedCarb = 0;
        let consumedFat = 0;

        if (record.meals) {
          Object.values(record.meals).forEach(meal => {
            meal.items.forEach(item => {
              consumedKcal += item.macros.kcal;
              consumedPro += item.macros.proteinG;
              consumedCarb += item.macros.carbsG;
              consumedFat += item.macros.fatG;
            });
          });
        }

        let status: ComplianceStatus = 'empty';
        // Tolleranza del 5%
        if (consumedKcal > 0) {
          const minKcal = targetKcal * 0.95;
          const maxKcal = targetKcal * 1.05;
          if (consumedKcal >= minKcal && consumedKcal <= maxKcal) {
            status = 'compliant';
          } else {
            status = 'failed';
          }
          cMap[record.date] = status;
        }

        summariesMap[record.date] = {
          consumedKcal,
          consumedPro,
          consumedCarb,
          consumedFat,
          status,
        };
      });
      setComplianceMap(cMap);
      setDaySummaries(summariesMap);

      // 2. Calcolo della Streak
      let streak = 0;
      const d = new Date();
      let dateCursor = todayStr;
      
      // Se oggi non abbiamo ancora mangiato, iniziamo a contare da ieri
      if (!cMap[todayStr] || cMap[todayStr] === 'empty') {
        d.setUTCDate(d.getUTCDate() - 1);
        dateCursor = d.toISOString().split('T')[0];
      }

      while (cMap[dateCursor] === 'compliant') {
        streak++;
        d.setUTCDate(d.getUTCDate() - 1);
        dateCursor = d.toISOString().split('T')[0];
      }
      setCurrentStreak(streak);

    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  return (
    <div className="flex flex-col pb-8">
      <header className="sticky top-0 z-40 glass-header px-4 pb-3 pt-safe mb-4">
        <h1 className="text-xl font-semibold tracking-tight text-zinc-100">Storico</h1>
        <p className="text-zinc-500 text-xs mt-0.5">Il calendario dei tuoi progressi giornalieri</p>
      </header>

      <div className="px-4 space-y-6">
        {/* Calendario Compliance & Streak */}
        <ComplianceCalendar
          complianceMap={complianceMap}
          daySummaries={daySummaries}
          currentStreak={currentStreak}
        />
      </div>
    </div>
  );
};

export default HistoryDashboard;
