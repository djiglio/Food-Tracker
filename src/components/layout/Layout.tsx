import React, { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import BottomNav from './BottomNav';
import { useAppStore } from '@/store/appStore';

const Layout: React.FC = () => {
  const setOfflineMode = useAppStore((state) => state.setOfflineMode);

  useEffect(() => {
    const handleOnline = () => setOfflineMode(false);
    const handleOffline = () => setOfflineMode(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [setOfflineMode]);

  return (
    <div className="flex flex-col h-screen bg-[#09090b] text-zinc-100 overflow-hidden relative selection:bg-zinc-700/50">
      <main className="flex-1 overflow-y-auto pb-[7rem]">
        {/* L'Outlet renderizza le route figlie */}
        <Outlet />
      </main>
      <BottomNav />
    </div>
  );
};

export default Layout;
