import React from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useUserStore } from '@/store/userStore';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Target, Beef, Wheat, Droplet, Clock, Database, Share, SlidersHorizontal, ShoppingCart, ChevronRight, Cloud, LogOut } from 'lucide-react';
import { exportAllData } from '@/core/export';
import { loginWithGoogle, logoutGoogle, auth } from '@/services/firebase';

export const ProfileDashboard: React.FC = () => {
  const profile = useUserStore((state) => state.profile);
  const getActiveTarget = useUserStore((state) => state.getActiveTarget);
  const logout = useUserStore((state) => state.logout);
  const navigate = useNavigate();
  const [user, setUser] = React.useState(auth.currentUser);

  React.useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((u) => setUser(u));
    return () => unsubscribe();
  }, []);

  if (!profile) {
    return <Navigate to="/onboarding" replace />;
  }

  const today = new Date().toISOString().split('T')[0];
  const activeTarget = getActiveTarget(today);

  if (!activeTarget) {
    return <Navigate to="/onboarding" replace />;
  }

  const handleRecalculate = () => {
    logout();
    navigate('/onboarding');
  };

  const { dailyTarget, meals, goal } = activeTarget;

  return (
    <div className="p-4 space-y-6 pb-8 pt-safe">
      <header className="mb-2">
        <h1 className="text-2xl font-bold tracking-tight">Profilo & Obiettivi</h1>
        <p className="text-zinc-400 text-sm">Dashboard metabolica in tempo reale.</p>
      </header>

      {/* Target Principale */}
      <Card className="bg-gradient-to-br from-zinc-850 to-zinc-900 border-brand-primary/20">
        <CardContent className="pt-6 text-center relative overflow-hidden">
          <div className="absolute top-0 right-0 p-3">
            <span className="px-2 py-1 bg-zinc-950 text-[10px] uppercase tracking-widest text-zinc-500 rounded-lg border border-zinc-800">
              {goal === 'cut' ? 'Perdita Peso' : goal === 'bulk' ? 'Massa' : 'Mantenimento'}
            </span>
          </div>
          <div className="mx-auto bg-brand-primary/10 w-16 h-16 rounded-full flex items-center justify-center mb-4">
            <Target className="text-brand-primary" size={32} />
          </div>
          <div className="text-sm font-semibold text-zinc-400 uppercase tracking-widest">Target Giornaliero</div>
          <div className="text-5xl font-black text-white">{dailyTarget.kcal} <span className="text-xl text-zinc-500 font-medium">kcal</span></div>
        </CardContent>
      </Card>

      {/* Macronutrienti Split Premium */}
      <div>
        <h3 className="text-sm font-bold tracking-widest uppercase text-zinc-500 mb-3 ml-1">Split Macronutrienti</h3>
        <div className="grid grid-cols-3 gap-3">
          <Card className="border-violet-900/50 bg-violet-950/20">
            <CardContent className="p-4 text-center">
              <Beef className="mx-auto text-violet-500 mb-2" size={24} strokeWidth={1.5} />
              <div className="text-xl font-bold text-white">{dailyTarget.proteinG}g</div>
              <div className="text-[10px] text-zinc-400 uppercase tracking-wider font-semibold mt-1">Proteine</div>
              <div className="text-[9px] text-zinc-500">{Math.round((dailyTarget.proteinG*4/dailyTarget.kcal)*100)}%</div>
            </CardContent>
          </Card>
          
          <Card className="border-amber-900/50 bg-amber-950/20">
            <CardContent className="p-4 text-center">
              <Wheat className="mx-auto text-amber-500 mb-2" size={24} strokeWidth={1.5} />
              <div className="text-xl font-bold text-white">{dailyTarget.carbsG}g</div>
              <div className="text-[10px] text-zinc-400 uppercase tracking-wider font-semibold mt-1">Carbo</div>
              <div className="text-[9px] text-zinc-500">{Math.round((dailyTarget.carbsG*4/dailyTarget.kcal)*100)}%</div>
            </CardContent>
          </Card>
          
          <Card className="border-rose-900/50 bg-rose-950/20">
            <CardContent className="p-4 text-center">
              <Droplet className="mx-auto text-rose-500 mb-2" size={24} strokeWidth={1.5} />
              <div className="text-xl font-bold text-white">{dailyTarget.fatG}g</div>
              <div className="text-[10px] text-zinc-400 uppercase tracking-wider font-semibold mt-1">Grassi</div>
              <div className="text-[9px] text-zinc-500">{Math.round((dailyTarget.fatG*9/dailyTarget.kcal)*100)}%</div>
            </CardContent>
          </Card>
        </div>
        
        <div className="mt-3">
          <button 
            onClick={() => navigate('/profile/macro-cycling')}
            className="w-full flex items-center justify-between p-3 rounded-xl bg-zinc-900/50 hover:bg-zinc-800/80 transition-colors border border-zinc-800 active:scale-95"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-brand-primary/10 text-brand-primary rounded-lg">
                <SlidersHorizontal size={18} />
              </div>
              <div className="text-left">
                <div className="text-sm font-semibold text-white">Gestione Macro-Cycling</div>
                <div className="text-[11px] text-zinc-500">
                  {activeTarget.isMacroCyclingEnabled ? 'Attivo (Giorni personalizzati)' : 'Disattivato (Target uniforme)'}
                </div>
              </div>
            </div>
            <div className="text-[10px] uppercase font-bold tracking-widest text-brand-primary bg-brand-primary/10 px-2 py-1 rounded-full">
              Configura
            </div>
          </button>
        </div>
      </div>

      {/* Ripartizione Pasti */}
      <div>
        <h3 className="text-sm font-bold tracking-widest uppercase text-zinc-500 mb-3 ml-1">Ripartizione Pasti</h3>
        <Card className="border-zinc-800">
          <CardContent className="p-0 divide-y divide-zinc-800/50">
            {meals.map((meal) => (
              <div key={meal.id} className="flex justify-between items-center p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-zinc-900 rounded-full text-zinc-500">
                    <Clock size={16} />
                  </div>
                  <span className="font-medium">{meal.name}</span>
                </div>
                <div className="text-right">
                  <div className="text-brand-primary font-bold">{Math.round(meal.percentage * 100)}%</div>
                  <div className="text-[10px] text-zinc-500">{Math.round(dailyTarget.kcal * meal.percentage)} kcal</div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Data & Privacy Section */}
      <div className="pt-2">
        <h3 className="text-sm font-bold tracking-widest uppercase text-zinc-500 mb-3 ml-1">Dati e Privacy</h3>
        <Card className="border-zinc-800 bg-zinc-900/50">
          <CardContent className="p-2 space-y-1">
            <button 
              onClick={() => navigate('/profile/shopping-list')}
              className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-zinc-800/80 transition-colors text-left active:scale-95"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-500/10 text-blue-500 rounded-lg">
                  <ShoppingCart size={18} />
                </div>
                <div>
                  <div className="text-sm font-semibold text-white">Lista della Spesa</div>
                  <div className="text-[11px] text-zinc-500">Genera spesa automatica dal diario</div>
                </div>
              </div>
              <ChevronRight size={16} className="text-zinc-600" />
            </button>

            <button 
              onClick={exportAllData}
              className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-zinc-800/80 transition-colors text-left active:scale-95"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-500/10 text-emerald-500 rounded-lg">
                  <Database size={18} />
                </div>
                <div>
                  <div className="text-sm font-semibold text-white">Esporta Dati (JSON)</div>
                  <div className="text-[11px] text-zinc-500">Salva un backup completo offline</div>
                </div>
              </div>
              <Share size={16} className="text-zinc-600" />
            </button>
          </CardContent>
        </Card>
      </div>

      {/* Cloud & Account */}
      <div className="pt-2">
        <h3 className="text-sm font-bold tracking-widest uppercase text-zinc-500 mb-3 ml-1">Account & Cloud Sync</h3>
        <Card className="border-zinc-800 bg-zinc-900/50">
          <CardContent className="p-2 space-y-1">
            {!user ? (
              <button 
                onClick={loginWithGoogle}
                className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-zinc-800/80 transition-colors text-left active:scale-95"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-500/10 text-blue-500 rounded-lg">
                    <Cloud size={18} />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-white">Accedi con Google</div>
                    <div className="text-[11px] text-zinc-500">Abilita il backup Cloud automatico</div>
                  </div>
                </div>
                <ChevronRight size={16} className="text-zinc-600" />
              </button>
            ) : (
              <button 
                onClick={logoutGoogle}
                className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-zinc-800/80 transition-colors text-left active:scale-95"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-red-500/10 text-red-500 rounded-lg">
                    <LogOut size={18} />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-white">Disconnetti ({user.email})</div>
                    <div className="text-[11px] text-zinc-500">I dati restano sul dispositivo</div>
                  </div>
                </div>
                <ChevronRight size={16} className="text-zinc-600" />
              </button>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="pt-4 space-y-3">
        <Button variant="secondary" fullWidth onClick={handleRecalculate}>
          Resetta Profilo & Ricalcola
        </Button>
      </div>
    </div>
  );
};

export default ProfileDashboard;
