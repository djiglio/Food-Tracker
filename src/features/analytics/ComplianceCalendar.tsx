import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDiaryStore } from '@/store/diaryStore';
import { Card, CardContent } from '@/components/ui/Card';
import { ChevronLeft, ChevronRight, Flame } from 'lucide-react';
import { cn } from '@/core/utils';

export type ComplianceStatus = 'compliant' | 'failed' | 'empty';

interface ComplianceCalendarProps {
  complianceMap: Record<string, ComplianceStatus>;
  currentStreak: number;
}

export const ComplianceCalendar: React.FC<ComplianceCalendarProps> = ({ complianceMap, currentStreak }) => {
  const navigate = useNavigate();
  
  const [currentDate, setCurrentDate] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d;
  });

  const nextMonth = () => {
    const d = new Date(currentDate);
    d.setMonth(d.getMonth() + 1);
    setCurrentDate(d);
  };

  const prevMonth = () => {
    const d = new Date(currentDate);
    d.setMonth(d.getMonth() - 1);
    setCurrentDate(d);
  };

  const handleDayClick = (dateString: string) => {
    // Imposta la data globale del diario e naviga
    useDiaryStore.getState().setCurrentDate(dateString);
    navigate('/');
  };

  const monthNames = [
    'Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno', 
    'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'
  ];

  const daysOfWeek = ['LUN', 'MAR', 'MER', 'GIO', 'VEN', 'SAB', 'DOM'];

  const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (year: number, month: number) => {
    let day = new Date(year, month, 1).getDay();
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

  return (
    <Card className="border-zinc-800 bg-zinc-900/50 overflow-hidden mb-6">
      <CardContent className="p-0">
        <div className="flex items-center justify-between p-4 border-b border-zinc-800/50 bg-zinc-900/80">
          <div className="flex items-center gap-2">
            <div className="flex flex-col items-center justify-center bg-orange-500/10 text-orange-500 p-2 rounded-xl">
              <Flame size={20} className={currentStreak > 0 ? "text-orange-500 animate-pulse" : "text-zinc-600"} />
              <span className={cn("text-xs font-black leading-none mt-1", currentStreak > 0 ? "text-orange-500" : "text-zinc-600")}>
                {currentStreak}
              </span>
            </div>
            <div>
              <h3 className="text-sm font-bold text-white uppercase tracking-widest leading-tight">Streak</h3>
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
                        : "bg-transparent border-transparent text-zinc-500 hover:bg-zinc-800"
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
  );
};

export default ComplianceCalendar;
