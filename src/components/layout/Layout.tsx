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
    <div className="flex flex-col h-[100dvh] bg-zinc-950 text-zinc-50 overflow-hidden relative">
      <main className="flex-1 overflow-y-auto pb-[calc(env(safe-area-inset-bottom)+4rem)]">
        {/* L'Outlet renderizza le route figlie */}
        <Outlet />
      </main>
      <BottomNav />
    </div>
  );
};

export default Layout;
