import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/layout/Layout';
import { initDB } from './services/db';
import { useUserStore } from './store/userStore';

import Onboarding from './features/metabolic-engine/Onboarding';
import ProfileDashboard from './features/metabolic-engine/ProfileDashboard';
import DiaryDashboard from './features/diary/DiaryDashboard';
import SearchDashboard from './features/search/SearchDashboard';
import HistoryDashboard from './features/analytics/HistoryDashboard';

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
        </Route>
      </Routes>
    </BrowserRouter>
  );
};

export default App;
