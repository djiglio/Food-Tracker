import React from 'react';
import { NavLink } from 'react-router-dom';
import { Home, Search, PlusCircle, Calendar, User } from 'lucide-react';
import { cn } from '@/core/utils';

const BottomNav: React.FC = () => {
  const navItems = [
    { icon: Home, label: 'Diario', path: '/' },
    { icon: Search, label: 'Cerca', path: '/search' },
    { icon: PlusCircle, label: 'Aggiungi', path: '/add', isAction: true },
    { icon: Calendar, label: 'Storico', path: '/history' },
    { icon: User, label: 'Profilo', path: '/profile' },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-zinc-900/90 backdrop-blur-md border-t border-zinc-800 pb-safe">
      <div className="flex items-center justify-around h-16 px-2">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              cn(
                "flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors relative",
                isActive ? "text-brand-primary" : "text-zinc-500 hover:text-zinc-300"
              )
            }
          >
            {({ isActive }) => (
              <>
                {item.isAction ? (
                  <div className="absolute -top-5 bg-brand-primary text-zinc-950 p-3 rounded-full shadow-lg shadow-brand-primary/20 active:scale-95 transition-transform">
                    <item.icon size={24} strokeWidth={2.5} />
                  </div>
                ) : (
                  <>
                    <item.icon size={20} strokeWidth={isActive ? 2.5 : 2} />
                    <span className="text-[10px] font-medium">{item.label}</span>
                  </>
                )}
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
};

export default BottomNav;
