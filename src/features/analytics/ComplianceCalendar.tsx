import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { useDiaryStore } from '@/store/diaryStore';
import { useUserStore } from '@/store/userStore';
import { getMacroTargetForDate } from '@/core/metabolism';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { ChevronLeft, ChevronRight, Flame, X, ArrowRight, CheckCircle2, AlertCircle, MinusCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/core/utils';

export type ComplianceStatus = 'compliant' | 'failed' | 'empty';

export interface DaySummaryData {
  consumedKcal: number;
  consumedPro: number;
  consumedCarb: number;
  consumedFat: number;
  status: ComplianceStatus;
}

interface ComplianceCalendarProps {
  complianceMap: Record<string, ComplianceStatus>;
  daySummaries?: Record<string, DaySummaryData>;
  currentStreak: number;
}

export const ComplianceCalendar: React.FC<ComplianceCalendarProps> = ({
  complianceMap,
  daySummaries = {},
  currentStreak,
}) => {
  const navigate = useNavigate();
  const getActiveTarget = useUserStore((state) => state.getActiveTarget);

  const [currentDate, setCurrentDate] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d;
  });

  const [selectedDateStr, setSelectedDateStr] = useState<string | null>(null);

  const triggerHaptic = (ms = 12) => {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(ms);
    }
  };

  const nextMonth = () => {
    triggerHaptic(10);
    const d = new Date(currentDate);
    d.setMonth(d.getMonth() + 1);
    setCurrentDate(d);
  };

  const prevMonth = () => {
    triggerHaptic(10);
    const d = new Date(currentDate);
    d.setMonth(d.getMonth() - 1);
    setCurrentDate(d);
  };

  const handleDayClick = (dateString: string) => {
    triggerHaptic(15);
    setSelectedDateStr(dateString);
  };

  const handleGoToDiary = (dateString: string) => {
    triggerHaptic(20);
    useDiaryStore.getState().setCurrentDate(dateString);
    setSelectedDateStr(null);
    navigate('/');
  };

  const monthNames = [
    'Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno', 
    'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'
  ];

  const daysOfWeek = ['LUN', 'MAR', 'MER', 'GIO', 'VEN', 'SAB', 'DOM'];

  const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (year: number, month: number) => {
    const day = new Date(year, month, 1).getDay();
    return day === 0 ? 6 : day - 1; 
  };

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);

  const days = [];
  
  for (let i = 0; i < firstDay; i++) {
    days.push(null);
  }
  
  for (let i = 1; i <= daysInMonth; i++) {
    const dStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
    days.push({
      day: i,
      dateString: dStr,
      status: complianceMap[dStr] || 'empty'
    });
  }

  const remaining = days.length % 7;
  if (remaining !== 0) {
    for (let i = 0; i < 7 - remaining; i++) {
      days.push(null);
    }
  }

  const todayStr = new Date().toISOString().split('T')[0];

  // Calcolo riepilogo per il giorno selezionato nel bottom sheet
  const getSelectedDayDetails = () => {
    if (!selectedDateStr) return null;
    const activeTarget = getActiveTarget(selectedDateStr);
    const targetMacros = activeTarget
      ? getMacroTargetForDate(activeTarget, selectedDateStr)
      : { kcal: 2000, proteinG: 150, carbsG: 200, fatG: 65 };

    const summary = daySummaries[selectedDateStr] || {
      consumedKcal: 0,
      consumedPro: 0,
      consumedCarb: 0,
      consumedFat: 0,
      status: complianceMap[selectedDateStr] || 'empty',
    };

    const kcalDelta = Math.round(summary.consumedKcal - targetMacros.kcal);
    const proPerc = targetMacros.proteinG > 0 ? Math.round((summary.consumedPro / targetMacros.proteinG) * 100) : 0;
    const carbPerc = targetMacros.carbsG > 0 ? Math.round((summary.consumedCarb / targetMacros.carbsG) * 100) : 0;
    const fatPerc = targetMacros.fatG > 0 ? Math.round((summary.consumedFat / targetMacros.fatG) * 100) : 0;

    return {
      dateStr: selectedDateStr,
      formattedDate: new Date(selectedDateStr).toLocaleDateString('it-IT', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
      }),
      status: summary.status,
      consumedKcal: Math.round(summary.consumedKcal),
      targetKcal: Math.round(targetMacros.kcal),
      kcalDelta,
      macros: [
        {
          label: 'Proteine',
          consumed: Math.round(summary.consumedPro),
          target: targetMacros.proteinG,
          perc: proPerc,
          barColor: 'bg-violet-500',
          textColor: 'text-violet-400',
          bgTint: 'bg-violet-500/10 border-violet-500/20',
        },
        {
          label: 'Carboidrati',
          consumed: Math.round(summary.consumedCarb),
          target: targetMacros.carbsG,
          perc: carbPerc,
          barColor: 'bg-amber-500',
          textColor: 'text-amber-400',
          bgTint: 'bg-amber-500/10 border-amber-500/20',
        },
        {
          label: 'Grassi',
          consumed: Math.round(summary.consumedFat),
          target: targetMacros.fatG,
          perc: fatPerc,
          barColor: 'bg-rose-500',
          textColor: 'text-rose-400',
          bgTint: 'bg-rose-500/10 border-rose-500/20',
        },
      ],
    };
  };

  const selectedDetails = getSelectedDayDetails();
  const isHighStreak = currentStreak >= 3;
  const isSuperStreak = currentStreak >= 7;

  return (
    <>
      <Card className="border-white/10 bg-zinc-900/50 overflow-hidden mb-6">
        <CardContent className="p-0">
          <div className="flex items-center justify-between p-4 border-b border-white/5 bg-zinc-900/80">
            <div className="flex items-center gap-3">
              {/* Streak Badge con Gradiente Animato & Particelle */}
              <motion.div
                animate={
                  isSuperStreak
                    ? {
                        boxShadow: [
                          '0 0 12px rgba(249,115,22,0.35)',
                          '0 0 24px rgba(239,68,68,0.65)',
                          '0 0 12px rgba(249,115,22,0.35)',
                        ],
                      }
                    : isHighStreak
                    ? {
                        boxShadow: [
                          '0 0 8px rgba(249,115,22,0.2)',
                          '0 0 18px rgba(249,115,22,0.45)',
                          '0 0 8px rgba(249,115,22,0.2)',
                        ],
                      }
                    : undefined
                }
                transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
                className={cn(
                  "relative flex flex-col items-center justify-center p-2.5 rounded-2xl border overflow-hidden min-w-[46px]",
                  isSuperStreak
                    ? "bg-gradient-to-t from-red-600/30 via-orange-500/25 to-amber-400/20 border-orange-500/50"
                    : isHighStreak
                    ? "bg-gradient-to-t from-orange-600/25 via-orange-500/15 to-amber-500/10 border-orange-500/35"
                    : currentStreak > 0
                    ? "bg-orange-500/10 border-orange-500/20"
                    : "bg-zinc-800/50 border-white/5"
                )}
              >
                {/* Particelle sottili quando streak >= 3 */}
                {isHighStreak && (
                  <div className="absolute inset-0 pointer-events-none overflow-hidden">
                    <motion.span
                      animate={{ y: [18, -14], x: [-4, 3], opacity: [0, 0.85, 0], scale: [0.6, 1.1, 0.4] }}
                      transition={{ duration: 1.8, repeat: Infinity, ease: 'easeOut' }}
                      className="absolute bottom-1 left-1/3 w-1 h-1 rounded-full bg-amber-300"
                    />
                    <motion.span
                      animate={{ y: [18, -16], x: [5, -2], opacity: [0, 0.75, 0], scale: [0.5, 1, 0.3] }}
                      transition={{ duration: 2.1, delay: 0.6, repeat: Infinity, ease: 'easeOut' }}
                      className="absolute bottom-1 right-1/3 w-1 h-1 rounded-full bg-orange-400"
                    />
                    {isSuperStreak && (
                      <motion.span
                        animate={{ y: [20, -18], x: [0, 4], opacity: [0, 0.9, 0], scale: [0.7, 1.2, 0.4] }}
                        transition={{ duration: 1.5, delay: 1.1, repeat: Infinity, ease: 'easeOut' }}
                        className="absolute bottom-0 left-1/2 w-1.5 h-1.5 rounded-full bg-red-400"
                      />
                    )}
                  </div>
                )}

                <motion.div
                  animate={
                    currentStreak > 0
                      ? {
                          scale: isSuperStreak ? [1, 1.16, 1] : [1, 1.08, 1],
                          rotate: isHighStreak ? [-3, 3, -3] : 0,
                        }
                      : undefined
                  }
                  transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
                  className="relative z-10"
                >
                  <Flame
                    size={20}
                    className={cn(
                      currentStreak > 0
                        ? "text-orange-400 fill-orange-500/40 drop-shadow-[0_0_8px_rgba(249,115,22,0.8)]"
                        : "text-zinc-600"
                    )}
                  />
                </motion.div>
                <span
                  className={cn(
                    "text-xs font-black leading-none mt-1 relative z-10",
                    isSuperStreak
                      ? "bg-gradient-to-r from-amber-300 via-orange-400 to-red-400 bg-clip-text text-transparent"
                      : currentStreak > 0
                      ? "text-orange-400"
                      : "text-zinc-600"
                  )}
                >
                  {currentStreak}
                </span>
              </motion.div>

              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className="text-sm font-bold text-white uppercase tracking-widest leading-tight">Streak</h3>
                  {isSuperStreak && (
                    <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded-full bg-gradient-to-r from-orange-500/20 to-red-500/20 text-orange-300 border border-orange-500/30">
                      On Fire
                    </span>
                  )}
                </div>
                <p className="text-[10px] text-zinc-500 uppercase font-semibold">Giorni Rispettati</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <button onClick={prevMonth} className="p-1 text-zinc-400 hover:text-white transition-colors">
                <ChevronLeft size={20} />
              </button>
              <span className="font-bold text-white min-w-[100px] text-center text-sm">
                {monthNames[month]} {year}
              </span>
              <button onClick={nextMonth} className="p-1 text-zinc-400 hover:text-white transition-colors">
                <ChevronRight size={20} />
              </button>
            </div>
          </div>

          <div className="p-4">
            <div className="grid grid-cols-7 gap-2 mb-2">
              {daysOfWeek.map(d => (
                <div key={d} className="text-center text-[9px] font-black uppercase text-zinc-600">
                  {d}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-2">
              {days.map((dayData, index) => {
                if (!dayData) {
                  return <div key={`empty-${index}`} className="aspect-square" />;
                }

                const { day, status, dateString } = dayData;
                const isToday = dateString === todayStr;
                const isSelected = dateString === selectedDateStr;

                return (
                  <button 
                    key={dateString} 
                    onClick={() => handleDayClick(dateString)}
                    className="flex flex-col items-center justify-center aspect-square relative group active:scale-90 transition-transform cursor-pointer"
                  >
                    <div 
                      className={cn(
                        "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all border-2",
                        status === 'compliant' 
                          ? "bg-emerald-500/20 border-emerald-500 text-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.2)]" 
                          : status === 'failed'
                          ? "bg-red-500/10 border-red-500/50 text-red-400"
                          : isToday
                          ? "bg-zinc-800 border-zinc-600 text-white"
                          : "bg-transparent border-transparent text-zinc-500 hover:bg-zinc-800",
                        isSelected && "ring-2 ring-white/40 scale-110"
                      )}
                    >
                      {day}
                    </div>
                    {isToday && status !== 'empty' && (
                      <div className="absolute -bottom-1 w-1 h-1 rounded-full bg-white" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bottom Sheet Riepilogo Giorno */}
      {createPortal(
        <AnimatePresence>
          {selectedDetails && (
            <motion.div
              key="day-sheet-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedDateStr(null)}
              className="fixed inset-0 z-[110] flex flex-col justify-end bg-black/60 backdrop-blur-sm"
            >
              <motion.div
                key="day-sheet-content"
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                transition={{ type: 'spring', stiffness: 360, damping: 32 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-zinc-950/95 backdrop-blur-2xl rounded-t-3xl border-t border-white/10 p-6 pb-[max(env(safe-area-inset-bottom,24px),24px)] shadow-[0_-12px_40px_rgba(0,0,0,0.7)] space-y-5"
              >
                {/* Maniglia superiore */}
                <div className="w-12 h-1.5 bg-zinc-800 rounded-full mx-auto -mt-2 mb-1" />

                {/* Intestazione Data & Stato */}
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-bold text-white capitalize">
                      {selectedDetails.formattedDate}
                    </h3>
                    <div className="mt-1">
                      {selectedDetails.status === 'compliant' ? (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-400 bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-0.5 rounded-full">
                          <CheckCircle2 size={12} /> Target Rispettato
                        </span>
                      ) : selectedDetails.status === 'failed' ? (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-red-400 bg-red-500/15 border border-red-500/30 px-2.5 py-0.5 rounded-full">
                          <AlertCircle size={12} /> Fuori Target
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-zinc-400 bg-zinc-800/80 border border-white/10 px-2.5 py-0.5 rounded-full">
                          <MinusCircle size={12} /> Nessun Alimento Registrato
                        </span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedDateStr(null)}
                    className="p-2 bg-zinc-900 rounded-full text-zinc-400 hover:text-white active:scale-95 transition-all"
                  >
                    <X size={20} />
                  </button>
                </div>

                {/* Riepilogo Calorie & Delta */}
                <div className="p-4 rounded-2xl bg-zinc-900/70 border border-white/10 flex items-center justify-between">
                  <div>
                    <div className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">Calorie Totali</div>
                    <div className="flex items-baseline gap-1.5 mt-1">
                      <span className="text-3xl font-black text-white">{selectedDetails.consumedKcal}</span>
                      <span className="text-sm text-zinc-500 font-semibold">/ {selectedDetails.targetKcal} kcal</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">Delta Calorico</div>
                    <div
                      className={cn(
                        "text-lg font-black mt-1 px-2.5 py-0.5 rounded-xl inline-block border",
                        selectedDetails.consumedKcal === 0
                          ? "text-zinc-400 bg-zinc-800/60 border-white/5"
                          : Math.abs(selectedDetails.kcalDelta) <= selectedDetails.targetKcal * 0.05
                          ? "text-emerald-400 bg-emerald-500/15 border-emerald-500/30"
                          : "text-red-400 bg-red-500/15 border-red-500/30"
                      )}
                    >
                      {selectedDetails.kcalDelta > 0 ? `+${selectedDetails.kcalDelta}` : selectedDetails.kcalDelta} kcal
                    </div>
                  </div>
                </div>

                {/* Riepilogo Macro Percentuali */}
                <div className="grid grid-cols-3 gap-2.5">
                  {selectedDetails.macros.map((m) => (
                    <div
                      key={m.label}
                      className={cn("p-3 rounded-2xl border flex flex-col justify-between", m.bgTint)}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">{m.label}</span>
                        <span className={cn("text-xs font-black", m.textColor)}>{m.perc}%</span>
                      </div>
                      <div className="text-sm font-bold text-white mb-2">
                        {m.consumed} <span className="text-[11px] text-zinc-500 font-normal">/ {m.target}g</span>
                      </div>
                      <div className="h-1.5 w-full bg-zinc-800/80 rounded-full overflow-hidden">
                        <div
                          className={cn("h-full rounded-full transition-all duration-500", m.barColor)}
                          style={{ width: `${Math.min(100, Math.max(0, m.perc))}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                {/* Azione Vai al Diario */}
                <Button
                  variant="primary"
                  fullWidth
                  size="lg"
                  onClick={() => handleGoToDiary(selectedDetails.dateStr)}
                >
                  Vai al Diario del Giorno <ArrowRight size={18} className="ml-2" />
                </Button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </>
  );
};

export default ComplianceCalendar;
