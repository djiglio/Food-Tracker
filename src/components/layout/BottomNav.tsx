import React from 'react';
import { NavLink } from 'react-router-dom';
import { Home, Search, Calendar, User } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/core/utils';

const BottomNav: React.FC = () => {
  const navItems = [
    { icon: Home, label: 'Diario', path: '/' },
    { icon: Search, label: 'Cerca', path: '/search' },
    { icon: Calendar, label: 'Storico', path: '/history' },
    { icon: User, label: 'Profilo', path: '/profile' },
  ];

  const triggerHaptic = () => {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(10);
    }
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 pb-[max(env(safe-area-inset-bottom,16px),16px)] pointer-events-none">
      <nav className="glass-pill rounded-2xl mx-auto max-w-md pointer-events-auto transition-transform duration-300 relative overflow-hidden">
        <div className="flex items-center justify-around h-[3.85rem] px-1.5">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={triggerHaptic}
              className={({ isActive }) =>
                cn(
                  "flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors duration-200 relative group",
                  isActive ? "text-zinc-100" : "text-zinc-500 hover:text-zinc-300"
                )
              }
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <>
                      {/* Subtle top specular reflection */}
                      <motion.div
                        layoutId="bottomNavTopGlow"
                        className="absolute top-0 w-7 h-[2px] rounded-b-full bg-zinc-100 shadow-[0_1px_8px_rgba(255,255,255,0.45)]"
                        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                      />
                      {/* Soft matte pill behind active tab */}
                      <motion.div
                        layoutId="bottomNavSpotlight"
                        className="absolute inset-x-2.5 inset-y-1.5 rounded-xl bg-white/[0.06] pointer-events-none"
                        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                      />
                    </>
                  )}
                  <motion.div
                    className="relative z-10"
                    animate={
                      isActive
                        ? { y: [0, -3, 0], scale: 1.05 }
                        : { y: 0, scale: 1 }
                    }
                    transition={{
                      y: { duration: 0.28, ease: 'easeOut' },
                      scale: { type: 'spring', stiffness: 420, damping: 22 },
                    }}
                  >
                    <item.icon
                      size={20}
                      strokeWidth={isActive ? 2.2 : 1.75}
                      className="transition-all duration-200"
                    />
                  </motion.div>
                  <span
                    className={cn(
                      "text-[10px] font-medium tracking-tight transition-all duration-200 relative z-10",
                      isActive ? "opacity-100 text-zinc-100" : "opacity-65"
                    )}
                  >
                    {item.label}
                  </span>
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
