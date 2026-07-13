import React, { forwardRef, useImperativeHandle } from 'react';
import { motion, useMotionValue, useTransform, animate } from 'framer-motion';
import { cn } from '@/core/utils';

export interface SwipeableItemRef {
  reset: () => void;
}

export interface SwipeableItemProps {
  children: React.ReactNode;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  leftActionContent?: React.ReactNode;
  rightActionContent?: React.ReactNode;
  swipeThreshold?: number;
  maxSwipe?: number;
}

export const SwipeableItem = forwardRef<SwipeableItemRef, SwipeableItemProps>(({
  children,
  onSwipeLeft,
  onSwipeRight,
  leftActionContent,
  rightActionContent,
  swipeThreshold = 60,
  maxSwipe = 100
}, ref) => {
  const x = useMotionValue(0);

  useImperativeHandle(ref, () => ({
    reset: () => {
      animate(x, 0, { type: 'spring', stiffness: 400, damping: 30 });
    }
  }));

  const handleDragEnd = (event: any, info: any) => {
    const offset = info.offset.x;
    const velocity = info.velocity.x;

    if (offset < -swipeThreshold || velocity < -500) {
      // Swiped left
      if (rightActionContent) {
        animate(x, -maxSwipe, { type: 'spring', stiffness: 400, damping: 30 });
        if (onSwipeLeft) onSwipeLeft();
      } else {
        animate(x, 0, { type: 'spring', stiffness: 400, damping: 30 });
      }
    } else if (offset > swipeThreshold || velocity > 500) {
      // Swiped right
      if (leftActionContent) {
        animate(x, maxSwipe, { type: 'spring', stiffness: 400, damping: 30 });
        if (onSwipeRight) onSwipeRight();
      } else {
        animate(x, 0, { type: 'spring', stiffness: 400, damping: 30 });
      }
    } else {
      animate(x, 0, { type: 'spring', stiffness: 400, damping: 30 });
    }
  };

  const opacityRight = useTransform(x, [0, -swipeThreshold], [0, 1]);
  const opacityLeft = useTransform(x, [0, swipeThreshold], [0, 1]);
  const scaleRight = useTransform(x, [0, -swipeThreshold], [0.8, 1]);
  const scaleLeft = useTransform(x, [0, swipeThreshold], [0.8, 1]);

  return (
    <div className="relative w-full overflow-hidden rounded-2xl touch-pan-y group">
      {/* Sfondo con le azioni (Livello 0) */}
      <div className="absolute inset-0 flex justify-between items-center z-0 rounded-2xl overflow-hidden bg-zinc-900/50">
        
        {/* Azione Sinistra (Swipe verso Destra) */}
        <div className="absolute left-0 top-0 bottom-0 flex items-center justify-start w-1/2 px-6 bg-brand-primary/20">
          <motion.div style={{ opacity: opacityLeft, scale: scaleLeft }} className="flex items-center text-brand-primary origin-left">
            {leftActionContent}
          </motion.div>
        </div>

        {/* Azione Destra (Swipe verso Sinistra) */}
        <div className="absolute right-0 top-0 bottom-0 flex items-center justify-end w-1/2 px-6 bg-red-500/20">
          <motion.div style={{ opacity: opacityRight, scale: scaleRight }} className="flex items-center text-red-500 origin-right">
            {rightActionContent}
          </motion.div>
        </div>
        
      </div>

      {/* Contenuto in primo piano (Livello 1) */}
      <motion.div
        drag="x"
        dragConstraints={{ left: rightActionContent ? -maxSwipe : 0, right: leftActionContent ? maxSwipe : 0 }}
        dragElastic={0.1}
        onDragEnd={handleDragEnd}
        style={{ x }}
        className="relative z-10 w-full bg-zinc-950 rounded-2xl border border-zinc-800/80 shadow-md group-active:scale-[0.98] transition-transform" 
      >
        {children}
      </motion.div>
    </div>
  );
});

SwipeableItem.displayName = "SwipeableItem";
