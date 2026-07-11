import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/layout/Layout';
import { initDB } from './services/db';
import { useUserStore } from './store/userStore';
import { listenToAuthStatus } from './services/firebase';
import { downloadCloudToLocal, triggerDebouncedSync } from './services/sync';

import Onboarding from './features/metabolic-engine/Onboarding';
import ProfileDashboard from './features/metabolic-engine/ProfileDashboard';
import DiaryDashboard from './features/diary/DiaryDashboard';
import SearchDashboard from './features/search/SearchDashboard';
import HistoryDashboard from './features/analytics/HistoryDashboard';
import MacroCyclingDashboard from './features/metabolic-engine/MacroCyclingDashboard';
import ShoppingListDashboard from './features/analytics/ShoppingListDashboard';

const DummyPage = ({ title }: { title: string }) => (
  <div className="p-4">
    <h1 className="text-2xl font-bold mb-4">{title}</h1>
    <div className="h-64 bg-zinc-900 rounded-3xl border border-zinc-800 flex items-center justify-center text-zinc-500">
      Modulo in costruzione
    </div>
  </div>
);

const App: React.FC = () => {
  const profile = useUserStore((state) => state.profile);

  useEffect(() => {
    initDB().catch(console.error);

    // Iscriviti ai cambiamenti dello userStore per triggerare il sync quando il profilo cambia
    const unsubscribeStore = useUserStore.subscribe((state, prevState) => {
      if (state.profile !== prevState.profile || state.targetHistory !== prevState.targetHistory) {
        triggerDebouncedSync();
      }
    });

    // Iscriviti allo stato di Firebase Auth
    const unsubscribeAuth = listenToAuthStatus(async (user) => {
      if (user) {
        console.log("Utente loggato:", user.email);
        // Scarica i dati al primo login
        await downloadCloudToLocal();
      }
    });

    return () => {
      unsubscribeStore();
      unsubscribeAuth();
    };
  }, []);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/onboarding" element={<Onboarding />} />
        
        <Route element={<Layout />}>
          {/* Rotta principale: Diario Alimentare */}
          <Route path="/" element={profile ? <DiaryDashboard /> : <Navigate to="/onboarding" replace />} />
          
          <Route path="/search" element={<SearchDashboard />} />
          
          <Route path="/add" element={<DummyPage title="Scanner / Aggiungi" />} />
          <Route path="/history" element={<HistoryDashboard />} />
          <Route path="/profile" element={<ProfileDashboard />} />
          <Route path="/profile/macro-cycling" element={<MacroCyclingDashboard />} />
          <Route path="/profile/shopping-list" element={<ShoppingListDashboard />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
};

export default App;
