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
          dotColor: 'bg-indigo-400',
          barColor: 'bg-indigo-400',
        },
        {
          label: 'Carbo',
          consumed: Math.round(summary.consumedCarb),
          target: targetMacros.carbsG,
          perc: carbPerc,
          dotColor: 'bg-amber-400',
          barColor: 'bg-amber-400',
        },
        {
          label: 'Grassi',
          consumed: Math.round(summary.consumedFat),
          target: targetMacros.fatG,
          perc: fatPerc,
          dotColor: 'bg-rose-400',
          barColor: 'bg-rose-400',
        },
      ],
    };
  };

  const selectedDetails = getSelectedDayDetails();
  const isHighStreak = currentStreak >= 3;
  const isSuperStreak = currentStreak >= 7;
  const weekLabels = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'];

  return (
    <>
      <Card className="overflow-hidden mb-6">
        <CardContent className="p-0">
          <div className="flex items-center justify-between px-4 py-3.5 border-b border-white/[0.05]">
            <div className="flex items-center gap-3">
              {/* Streak Badge con Gradiente Animato & Particelle */}
              <motion.div
                animate={
                  isSuperStreak
                    ? {
                        boxShadow: [
                          '0 0 10px rgba(249,115,22,0.2)',
                          '0 0 20px rgba(239,68,68,0.4)',
                          '0 0 10px rgba(249,115,22,0.2)',
                        ],
                      }
                    : isHighStreak
                    ? {
                        boxShadow: [
                          '0 0 6px rgba(249,115,22,0.15)',
                          '0 0 14px rgba(249,115,22,0.3)',
                          '0 0 6px rgba(249,115,22,0.15)',
                        ],
                      }
                    : undefined
                }
                transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
                className={cn(
                  "relative flex items-center gap-1.5 px-3 py-1.5 rounded-xl border overflow-hidden tabular-nums",
                  isSuperStreak
                    ? "bg-gradient-to-r from-orange-500/15 to-amber-500/10 border-orange-500/35"
                    : isHighStreak
                    ? "bg-orange-500/10 border-orange-500/25"
                    : currentStreak > 0
                    ? "bg-orange-500/10 border-orange-500/20"
                    : "bg-[#18181c] border-white/[0.06]"
                )}
              >
                {/* Particelle sottili quando streak >= 3 */}
                {isHighStreak && (
                  <div className="absolute inset-0 pointer-events-none overflow-hidden">
                    <motion.span
                      animate={{ y: [14, -12], x: [-3, 2], opacity: [0, 0.75, 0], scale: [0.6, 1, 0.4] }}
                      transition={{ duration: 1.9, repeat: Infinity, ease: 'easeOut' }}
                      className="absolute bottom-0.5 left-1/3 w-1 h-1 rounded-full bg-amber-300"
                    />
                    <motion.span
                      animate={{ y: [14, -14], x: [4, -2], opacity: [0, 0.65, 0], scale: [0.5, 0.9, 0.3] }}
                      transition={{ duration: 2.2, delay: 0.6, repeat: Infinity, ease: 'easeOut' }}
                      className="absolute bottom-0.5 right-1/3 w-1 h-1 rounded-full bg-orange-400"
                    />
                  </div>
                )}

                <motion.div
                  animate={
                    currentStreak > 0
                      ? {
                          scale: isSuperStreak ? [1, 1.12, 1] : [1, 1.06, 1],
                        }
                      : undefined
                  }
                  transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
                  className="relative z-10 flex items-center"
                >
                  <Flame
                    size={16}
                    strokeWidth={1.75}
                    className={cn(
                      currentStreak > 0
                        ? "text-orange-400 fill-orange-400/30"
                        : "text-zinc-500"
                    )}
                  />
                </motion.div>
                <span
                  className={cn(
                    "text-sm font-semibold leading-none relative z-10 tabular-nums",
                    currentStreak > 0 ? "text-orange-300" : "text-zinc-500"
                  )}
                >
                  {currentStreak}
                </span>
              </motion.div>

              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className="text-sm font-semibold text-zinc-100 tracking-tight leading-tight">Costanza</h3>
                  {isSuperStreak && (
                    <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-md bg-orange-500/15 text-orange-300 border border-orange-500/25">
                      Serie attiva
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-zinc-500">Giorni consecutivi a target</p>
              </div>
            </div>
            
            <div className="flex items-center gap-1.5">
              <button
                onClick={prevMonth}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-zinc-400 hover:text-zinc-100 hover:bg-white/[0.04] active:scale-95 transition-all"
              >
                <ChevronLeft size={17} strokeWidth={1.75} />
              </button>
              <span className="font-semibold text-zinc-100 min-w-[105px] text-center text-xs tracking-tight">
                {monthNames[month]} {year}
              </span>
              <button
                onClick={nextMonth}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-zinc-400 hover:text-zinc-100 hover:bg-white/[0.04] active:scale-95 transition-all"
              >
                <ChevronRight size={17} strokeWidth={1.75} />
              </button>
            </div>
          </div>

          <div className="p-4">
            <div className="grid grid-cols-7 gap-1.5 mb-2">
              {weekLabels.map(d => (
                <div key={d} className="text-center text-[11px] font-medium text-zinc-500 py-1">
                  {d}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1.5">
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
                        "w-9 h-9 rounded-xl flex items-center justify-center text-xs font-medium tabular-nums transition-all border",
                        status === 'compliant' 
                          ? "bg-emerald-500/15 border-emerald-500/25 text-emerald-300 font-semibold" 
                          : status === 'failed'
                          ? "bg-rose-500/10 border-rose-500/20 text-rose-300 font-semibold"
                          : isToday
                          ? "bg-white/[0.07] border-white/[0.15] text-zinc-100 font-semibold"
                          : "bg-transparent border-transparent text-zinc-500 hover:bg-white/[0.04] hover:text-zinc-300",
                        isSelected && "ring-1 ring-zinc-200 scale-105"
                      )}
                    >
                      {day}
                    </div>
                    {isToday && (
                      <div className="absolute bottom-1 w-1 h-1 rounded-full bg-zinc-200" />
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
              className="fixed inset-0 z-[110] flex flex-col justify-end bg-black/70 backdrop-blur-sm"
            >
              <motion.div
                key="day-sheet-content"
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                transition={{ type: 'spring', stiffness: 380, damping: 34 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-[#121215]/95 backdrop-blur-2xl rounded-t-3xl border-t border-white/[0.08] p-6 pb-[max(env(safe-area-inset-bottom,24px),24px)] shadow-[0_-12px_40px_rgba(0,0,0,0.75)] space-y-5"
              >
                {/* Maniglia superiore */}
                <div className="w-10 h-1 bg-zinc-700/80 rounded-full mx-auto -mt-2 mb-1" />

                {/* Intestazione Data & Stato */}
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-semibold tracking-tight text-zinc-100 capitalize">
                      {selectedDetails.formattedDate}
                    </h3>
                    <div className="mt-1.5">
                      {selectedDetails.status === 'compliant' ? (
                        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-300 bg-emerald-500/15 border border-emerald-500/25 px-2.5 py-0.5 rounded-lg">
                          <CheckCircle2 size={13} strokeWidth={1.75} /> Target rispettato
                        </span>
                      ) : selectedDetails.status === 'failed' ? (
                        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-rose-300 bg-rose-500/10 border border-rose-500/20 px-2.5 py-0.5 rounded-lg">
                          <AlertCircle size={13} strokeWidth={1.75} /> Fuori target
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-zinc-400 bg-[#18181c] border border-white/[0.06] px-2.5 py-0.5 rounded-lg">
                          <MinusCircle size={13} strokeWidth={1.75} /> Nessun alimento registrato
                        </span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedDateStr(null)}
                    className="w-8 h-8 rounded-xl bg-[#18181c] border border-white/[0.06] flex items-center justify-center text-zinc-400 hover:text-zinc-100 active:scale-95 transition-all"
                  >
                    <X size={17} strokeWidth={1.75} />
                  </button>
                </div>

                {/* Riepilogo Calorie & Delta */}
                <div className="p-4 rounded-2xl bg-[#18181c] border border-white/[0.06] flex items-center justify-between tabular-nums">
                  <div>
                    <div className="text-xs font-medium text-zinc-400">Calorie assunte</div>
                    <div className="flex items-baseline gap-1.5 mt-1">
                      <span className="text-2xl font-semibold tracking-tight text-zinc-100">{selectedDetails.consumedKcal}</span>
                      <span className="text-xs text-zinc-500 font-medium">/ {selectedDetails.targetKcal} kcal</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs font-medium text-zinc-400">Scostamento</div>
                    <div
                      className={cn(
                        "text-sm font-semibold mt-1 px-2.5 py-1 rounded-lg inline-block border tabular-nums",
                        selectedDetails.consumedKcal === 0
                          ? "text-zinc-400 bg-[#121215] border-white/[0.06]"
                          : Math.abs(selectedDetails.kcalDelta) <= selectedDetails.targetKcal * 0.05
                          ? "text-emerald-300 bg-emerald-500/15 border-emerald-500/25"
                          : "text-rose-300 bg-rose-500/10 border-rose-500/20"
                      )}
                    >
                      {selectedDetails.kcalDelta > 0 ? `+${selectedDetails.kcalDelta}` : selectedDetails.kcalDelta} kcal
                    </div>
                  </div>
                </div>

                {/* Riepilogo Macro Percentuali — Matte Graphite + 6px Colored Dots */}
                <div className="grid grid-cols-3 gap-2.5 tabular-nums">
                  {selectedDetails.macros.map((m) => (
                    <div
                      key={m.label}
                      className="p-3 rounded-2xl bg-[#18181c] border border-white/[0.06] flex flex-col justify-between"
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-1.5">
                          <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", m.dotColor)} />
                          <span className="text-xs font-medium text-zinc-400">{m.label}</span>
                        </div>
                        <span className="text-[11px] font-medium text-zinc-400">{m.perc}%</span>
                      </div>
                      <div className="text-sm font-semibold text-zinc-100 mb-2">
                        {m.consumed}<span className="text-xs text-zinc-500 font-normal">/{m.target}g</span>
                      </div>
                      <div className="h-1.5 w-full bg-[#09090b] rounded-full overflow-hidden border border-white/[0.04]">
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
                  Apri diario del giorno <ArrowRight size={17} strokeWidth={2} className="ml-2" />
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
