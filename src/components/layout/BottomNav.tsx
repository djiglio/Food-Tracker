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
      <nav className="glass-pill rounded-3xl mx-auto max-w-md pointer-events-auto transition-transform duration-300 relative overflow-hidden">
        <div className="flex items-center justify-around h-[4.25rem] px-2">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={triggerHaptic}
              className={({ isActive }) =>
                cn(
                  "flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors duration-300 relative group",
                  isActive ? "text-brand-primary" : "text-zinc-500 hover:text-zinc-300"
                )
              }
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <>
                      {/* Top luminous glow reflection */}
                      <motion.div
                        layoutId="bottomNavTopGlow"
                        className="absolute top-0 w-10 h-[3px] rounded-b-full bg-brand-primary shadow-[0_2px_12px_2px_rgba(16,185,129,0.8)]"
                        transition={{ type: 'spring', stiffness: 380, damping: 28 }}
                      />
                      {/* Soft radial spotlight behind active tab */}
                      <motion.div
                        layoutId="bottomNavSpotlight"
                        className="absolute inset-x-3 inset-y-1.5 rounded-2xl bg-gradient-to-b from-brand-primary/15 via-brand-primary/5 to-transparent pointer-events-none"
                        transition={{ type: 'spring', stiffness: 380, damping: 28 }}
                      />
                    </>
                  )}
                  <motion.div
                    className="relative z-10"
                    animate={
                      isActive
                        ? { y: [0, -5, 0], scale: 1.12 }
                        : { y: 0, scale: 1 }
                    }
                    transition={{
                      y: { duration: 0.35, ease: 'easeOut' },
                      scale: { type: 'spring', stiffness: 400, damping: 18 },
                    }}
                  >
                    <item.icon
                      size={22}
                      strokeWidth={isActive ? 2.5 : 2}
                      className={cn(
                        "transition-all duration-300",
                        isActive && "drop-shadow-[0_0_10px_rgba(16,185,129,0.6)]"
                      )}
                    />
                  </motion.div>
                  <span
                    className={cn(
                      "text-[10px] font-semibold tracking-wide transition-all duration-300 relative z-10",
                      isActive ? "opacity-100 text-brand-primary" : "opacity-70"
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
