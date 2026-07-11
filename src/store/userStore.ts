import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { 
  UserMetabolicProfile, 
  TargetVersion, 
  calculateBMR, 
  calculateTDEE 
} from '@/core/metabolism';

interface UserState {
  profile: UserMetabolicProfile | null;
  bmr: number | null;
  tdee: number | null;
  
  // Storicizzazione
  targetHistory: TargetVersion[];
  
  // Actions
  setProfile: (profile: UserMetabolicProfile) => void;
  addTargetVersion: (version: TargetVersion) => void;
  getActiveTarget: (date: string) => TargetVersion | null;
  logout: () => void;
}

export const useUserStore = create<UserState>()(
  persist(
    (set, get) => ({
      profile: null,
      bmr: null,
      tdee: null,
      targetHistory: [],

      setProfile: (profile) => {
        const bmr = calculateBMR(profile);
        const tdee = calculateTDEE(profile);
        set({ profile, bmr, tdee });
      },
      
      addTargetVersion: (version) => {
        set((state) => {
          // Aggiunge o sovrascrive se la data è identica
          const filtered = state.targetHistory.filter(t => t.effectiveFromDate !== version.effectiveFromDate);
          // Ordiniamo la timeline cronologicamente (dal più vecchio al più nuovo)
          const newHistory = [...filtered, version].sort((a, b) => 
            a.effectiveFromDate.localeCompare(b.effectiveFromDate)
          );
          return { targetHistory: newHistory };
        });
      },

      getActiveTarget: (date: string) => {
        const history = get().targetHistory;
        if (history.length === 0) return null;
        
        // Cerca l'ultimo target la cui data di entrata in vigore è <= alla data richiesta
        // Essendo ordinati cronologicamente, li iteriamo al contrario
        for (let i = history.length - 1; i >= 0; i--) {
          if (history[i].effectiveFromDate <= date) {
            return history[i];
          }
        }
        
        // Fallback: se chiediamo una data antecedente al primissimo target, restituiamo il primo
        return history[0];
      },
      
      logout: () => set({ profile: null, bmr: null, tdee: null, targetHistory: [] }),
    }),
    {
      name: 'food-tracker-user-storage',
    }
  )
);
