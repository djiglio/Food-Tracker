import React, { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { ComposedChart, Area, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { initDB, getWeightLogs, saveWeightLog } from '@/services/db';
import { useUserStore } from '@/store/userStore';
import { getMacroTargetForDate } from '@/core/metabolism';
import { TrendingDown, TrendingUp, Scale, Activity } from 'lucide-react';
import { cn } from '@/core/utils';
import ComplianceCalendar, { ComplianceStatus } from './ComplianceCalendar';

interface UnifiedChartData {
  dateFull: string; // YYYY-MM-DD
  dateLabel: string; // DD-MM
  kcal: number;
  targetKcal: number;
  weightKg: number | null;
}

export const HistoryDashboard: React.FC = () => {
  const getActiveTarget = useUserStore(state => state.getActiveTarget);

  const [weightLogs, setWeightLogs] = useState<{date: string, weightKg: number}[]>([]);
  const [chartData, setChartData] = useState<UnifiedChartData[]>([]);
  
  const [complianceMap, setComplianceMap] = useState<Record<string, ComplianceStatus>>({});
  const [currentStreak, setCurrentStreak] = useState(0);

  const [newWeight, setNewWeight] = useState('');
  const [isLogging, setIsLogging] = useState(false);

  const loadData = async () => {
    try {
      const logs = await getWeightLogs();
      setWeightLogs(logs);

      const db = await initDB();
      const allHistory = await db.getAll('history');
      
      const unifiedData: UnifiedChartData[] = [];
      const today = new Date();
      today.setHours(0,0,0,0);
      const todayStr = new Date().toISOString().split('T')[0];

      const cMap: Record<string, ComplianceStatus> = {};

      // 1. Calcoliamo la mappa di compliance per tutto lo storico
      allHistory.forEach(record => {
        const activeTarget = getActiveTarget(record.date);
        const targetKcal = activeTarget ? getMacroTargetForDate(activeTarget, record.date).kcal : 2000;
        
        let consumedKcal = 0;
        if (record.meals) {
          Object.values(record.meals).forEach(meal => {
            meal.items.forEach(item => {
              consumedKcal += item.macros.kcal;
            });
          });
        }

        // Tolleranza del 5%
        if (consumedKcal > 0) {
          const minKcal = targetKcal * 0.95;
          const maxKcal = targetKcal * 1.05;
          if (consumedKcal >= minKcal && consumedKcal <= maxKcal) {
            cMap[record.date] = 'compliant';
          } else {
            cMap[record.date] = 'failed';
          }
        }
      });
      setComplianceMap(cMap);

      // 2. Calcolo della Streak
      let streak = 0;
      let d = new Date(today);
      let dateCursor = todayStr;
      
      // Se oggi non abbiamo ancora mangiato, iniziamo a contare da ieri
      if (!cMap[todayStr] || cMap[todayStr] === 'empty') {
        d.setDate(d.getDate() - 1);
        dateCursor = d.toISOString().split('T')[0];
      }

      while (cMap[dateCursor] === 'compliant') {
        streak++;
        d.setDate(d.getDate() - 1);
        dateCursor = d.toISOString().split('T')[0];
      }
      setCurrentStreak(streak);

      // 3. Carichiamo i dati per il grafico (ultimi 14 giorni)
      for (let i = 13; i >= 0; i--) {
        const dChart = new Date(today);
        dChart.setDate(dChart.getDate() - i);
        const dateStr = dChart.toISOString().split('T')[0];
        
        const record = allHistory.find(r => r.date === dateStr);
        const activeTarget = getActiveTarget(dateStr);
        const targetKcal = activeTarget ? getMacroTargetForDate(activeTarget, dateStr).kcal : 2000;

        let consumedKcal = 0;
        if (record && record.meals) {
          Object.values(record.meals).forEach(meal => {
            meal.items.forEach(item => {
              consumedKcal += item.macros.kcal;
            });
          });
        }

        // --- 2. Peso ---
        // Se c'è un log per questa data, usalo. Altrimenti lascia null (la linea si collegherà automaticamente)
        const dayWeightLog = logs.find(l => l.date === dateStr);
        const weightValue = dayWeightLog ? dayWeightLog.weightKg : null;

        unifiedData.push({
          dateFull: dateStr,
          dateLabel: `${d.getDate()}/${d.getMonth()+1}`,
          kcal: Math.round(consumedKcal) || 0, // se non ha mangiato, 0 (oppure potremmo ometterlo)
          targetKcal,
          weightKg: weightValue
        });
      }
      setChartData(unifiedData);

    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSaveWeight = async () => {
    const w = parseFloat(newWeight);
    if (w > 0) {
      const today = new Date().toISOString().split('T')[0];
      await saveWeightLog(today, w);
      setNewWeight('');
      setIsLogging(false);
      loadData();
    }
  };

  // Calcolo Delta Peso Settimanale (stesso algoritmo di prima)
  let weightDelta = 0;
  if (weightLogs.length >= 2) {
    const latest = weightLogs[weightLogs.length - 1].weightKg;
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const pastLog = weightLogs.find(l => new Date(l.date) >= sevenDaysAgo) || weightLogs[0];
    weightDelta = latest - pastLog.weightKg;
  }

  // Custom Tooltip per gestire due valori diversi
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-zinc-900 border border-zinc-800 p-3 rounded-xl shadow-xl">
          <p className="text-zinc-400 text-xs font-bold mb-2">{label}</p>
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center justify-between gap-4 mb-1">
              <span className="text-xs font-semibold" style={{ color: entry.color }}>{entry.name}:</span>
              <span className="text-sm font-black text-white">
                {entry.value} {entry.dataKey === 'weightKg' ? 'kg' : 'kcal'}
              </span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="flex flex-col h-full overflow-y-auto bg-zinc-950 pb-safe">
      <header className="px-4 py-6">
        <h1 className="text-2xl font-bold tracking-tight text-white">Analytics</h1>
        <p className="text-zinc-400 text-sm">Il quadro completo dei tuoi progressi.</p>
      </header>

      <div className="p-4 space-y-6">
        
        {/* Calendario Compliance & Streak */}
        <ComplianceCalendar complianceMap={complianceMap} currentStreak={currentStreak} />

        {/* Widget Registra Peso */}
        <Card className="border-brand-primary/30 bg-brand-primary/5">
          <CardContent className="p-4">
            {!isLogging ? (
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-brand-primary/20 rounded-full text-brand-primary">
                    <Scale size={20} />
                  </div>
                  <div>
                    <div className="font-semibold text-white">Peso Odierno</div>
                    <div className="text-xs text-brand-primary font-medium">
                      {weightLogs.length > 0 ? `Attuale: ${weightLogs[weightLogs.length - 1].weightKg} kg` : 'Nessun dato'}
                    </div>
                  </div>
                </div>
                <Button variant="secondary" onClick={() => setIsLogging(true)}>Aggiorna</Button>
              </div>
            ) : (
              <div className="flex gap-2 items-center">
                <Input 
                  autoFocus
                  type="number" 
                  placeholder="Es. 70.5" 
                  value={newWeight} 
                  onChange={(e) => setNewWeight(e.target.value)} 
                  className="bg-zinc-900 border-zinc-800"
                />
                <Button variant="primary" onClick={handleSaveWeight} disabled={!newWeight}>Salva</Button>
                <Button variant="ghost" onClick={() => setIsLogging(false)}>Annulla</Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Master Chart: Calorie vs Peso */}
        <Card className="border-zinc-800 bg-zinc-900/50">
          <CardContent className="p-4">
            <div className="flex justify-between items-start mb-6">
              <div className="flex items-center gap-2">
                <Activity size={18} className="text-zinc-100" />
                <h3 className="text-sm font-bold tracking-widest uppercase text-zinc-500">Correlazione (Ultimi 14 gg)</h3>
              </div>
              
              {weightLogs.length >= 2 && (
                <div className={cn(
                  "flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-bold",
                  weightDelta < 0 ? "bg-brand-primary/20 text-brand-primary" : weightDelta > 0 ? "bg-red-500/20 text-red-500" : "bg-zinc-800 text-zinc-400"
                )}>
                  {weightDelta < 0 ? <TrendingDown size={14} /> : weightDelta > 0 ? <TrendingUp size={14} /> : null}
                  {weightDelta > 0 ? '+' : ''}{weightDelta.toFixed(1)} kg
                </div>
              )}
            </div>

            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={chartData} margin={{ top: 5, right: -10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorKcal" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f97316" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#f97316" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="dateLabel" tick={{fill: '#71717a', fontSize: 10}} tickLine={false} axisLine={false} />
                  
                  {/* Asse Y Sinistro per Kcal */}
                  <YAxis yAxisId="left" hide domain={[0, 'dataMax + 500']} />
                  
                  {/* Asse Y Destro per Peso (min-max dinamico per far risaltare le variazioni) */}
                  <YAxis yAxisId="right" orientation="right" hide domain={['dataMin - 1', 'dataMax + 1']} />
                  
                  <Tooltip content={<CustomTooltip />} />
                  
                  {/* Linea Kcal Target */}
                  <ReferenceLine yAxisId="left" y={chartData[0]?.targetKcal || 2000} stroke="#52525b" strokeDasharray="3 3" />
                  
                  {/* Area Kcal (Sullo Sfondo) */}
                  <Area 
                    yAxisId="left" 
                    type="monotone" 
                    dataKey="kcal" 
                    name="Calorie" 
                    stroke="#f97316" 
                    strokeWidth={2} 
                    fill="url(#colorKcal)" 
                  />

                  {/* Linea Peso (In Primo Piano, connette i punti anche se ci sono giorni vuoti (connectNulls)) */}
                  <Line 
                    yAxisId="right" 
                    type="monotone" 
                    dataKey="weightKg" 
                    name="Peso" 
                    stroke="#10b981" 
                    strokeWidth={3} 
                    dot={{ r: 4, fill: '#10b981', strokeWidth: 2, stroke: '#18181b' }} 
                    activeDot={{ r: 6 }} 
                    connectNulls 
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
            
            <div className="mt-6 flex flex-wrap gap-4 items-center justify-center text-xs text-zinc-400 font-semibold">
              <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-emerald-500"></div> Peso</div>
              <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-orange-500 opacity-50"></div> Calorie</div>
              <div className="flex items-center gap-1.5"><div className="w-4 h-0 border-t-2 border-dashed border-zinc-500"></div> Target Kcal</div>
            </div>
          </CardContent>
        </Card>

      </div>
    </div>
  );
};

export default HistoryDashboard;
