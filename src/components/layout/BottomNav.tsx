import React from 'react';
import { NavLink } from 'react-router-dom';
import { Home, Search, Calendar, User } from 'lucide-react';
import { cn } from '@/core/utils';

const BottomNav: React.FC = () => {
  const navItems = [
    { icon: Home, label: 'Diario', path: '/' },
    { icon: Search, label: 'Cerca', path: '/search' },
    { icon: Calendar, label: 'Storico', path: '/history' },
    { icon: User, label: 'Profilo', path: '/profile' },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 pb-[max(env(safe-area-inset-bottom,16px),16px)] pointer-events-none">
      <nav className="glass-pill rounded-3xl mx-auto max-w-md pointer-events-auto transition-transform duration-300">
        <div className="flex items-center justify-around h-[4rem] px-2">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                cn(
                  "flex flex-col items-center justify-center w-full h-full space-y-1 transition-all duration-300 relative group",
                  isActive ? "text-brand-primary" : "text-zinc-500 hover:text-zinc-300 hover:-translate-y-0.5"
                )
              }
            >
              {({ isActive }) => (
                  <>
                    <div className="relative">
                      <item.icon size={22} strokeWidth={isActive ? 2.5 : 2} className={cn("transition-transform duration-300", isActive && "scale-110 drop-shadow-[0_0_8px_rgba(16,185,129,0.5)]")} />
                      {isActive && (
                        <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-brand-primary shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
                      )}
                    </div>
                    <span className={cn("text-[10px] font-medium transition-all duration-300", isActive ? "opacity-100" : "opacity-70")}>{item.label}</span>
                  </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
};

export default BottomNav;
