import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { loadProfile, loadRounds, saveProfile, saveRounds, resetData } from '../lib/storage';
import { estimateHandicap, average, round1, sortRoundsDesc } from '../lib/stats';
import type { PlayerProfile, Round, ToastMessage } from '../types';

interface GolfContextValue {
  rounds: Round[];
  profile: PlayerProfile;
  toasts: ToastMessage[];
  setRounds: (rounds: Round[]) => void;
  addRounds: (newRounds: Round[]) => void;
  addRound: (round: Round) => void;
  updateRound: (round: Round) => void;
  deleteRound: (id: string) => void;
  updateProfile: (profile: PlayerProfile) => void;
  resetToSeed: () => void;
  pushToast: (toast: Omit<ToastMessage, 'id'>) => void;
  dismissToast: (id: string) => void;
}

const GolfContext = createContext<GolfContextValue | null>(null);

function syncProfileFromRounds(rounds: Round[], profile: PlayerProfile): PlayerProfile {
  const sorted = sortRoundsDesc(rounds);
  const last10 = sorted.slice(0, 10);
  const handicap = estimateHandicap(rounds);
  const avgScore = round1(average(last10.map((r) => r.score)));
  const putts = round1(average(last10.map((r) => r.putts)));
  const girPct = round1(average(last10.map((r) => r.gir)));

  return {
    ...profile,
    handicap,
    goals: profile.goals.map((g) => {
      if (g.id === 'handicap') return { ...g, current: handicap };
      if (g.id === 'avg-score') return { ...g, current: avgScore };
      if (g.id === 'putts') return { ...g, current: putts };
      if (g.id === 'gir') return { ...g, current: girPct };
      return g;
    }),
  };
}

export function GolfProvider({ children }: { children: ReactNode }) {
  const [rounds, setRoundsState] = useState<Round[]>(() => loadRounds());
  const [profile, setProfileState] = useState<PlayerProfile>(() => {
    const r = loadRounds();
    return syncProfileFromRounds(r, loadProfile());
  });
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const setRounds = useCallback((next: Round[]) => {
    saveRounds(next);
    setRoundsState(next);
    setProfileState((prev) => {
      const synced = syncProfileFromRounds(next, prev);
      saveProfile(synced);
      return synced;
    });
  }, []);

  const addRounds = useCallback(
    (newRounds: Round[]) => {
      setRoundsState((prev) => {
        const merged = [...prev, ...newRounds];
        saveRounds(merged);
        setProfileState((p) => {
          const synced = syncProfileFromRounds(merged, p);
          saveProfile(synced);
          return synced;
        });
        return merged;
      });
    },
    [],
  );

  const addRound = useCallback(
    (round: Round) => {
      setRoundsState((prev) => {
        const merged = [...prev, round];
        saveRounds(merged);
        setProfileState((p) => {
          const synced = syncProfileFromRounds(merged, p);
          saveProfile(synced);
          return synced;
        });
        return merged;
      });
    },
    [],
  );

  const updateRound = useCallback(
    (round: Round) => {
      setRoundsState((prev) => {
        const next = prev.map((r) => (r.id === round.id ? round : r));
        saveRounds(next);
        setProfileState((p) => {
          const synced = syncProfileFromRounds(next, p);
          saveProfile(synced);
          return synced;
        });
        return next;
      });
    },
    [],
  );

  const deleteRound = useCallback((id: string) => {
    setRoundsState((prev) => {
      const next = prev.filter((r) => r.id !== id);
      saveRounds(next);
      setProfileState((p) => {
        const synced = syncProfileFromRounds(next, p);
        saveProfile(synced);
        return synced;
      });
      return next;
    });
  }, []);

  const updateProfile = useCallback((next: PlayerProfile) => {
    saveProfile(next);
    setProfileState(next);
  }, []);

  const resetToSeed = useCallback(() => {
    resetData();
    const r = loadRounds();
    const p = syncProfileFromRounds(r, loadProfile());
    setRoundsState(r);
    setProfileState(p);
  }, []);

  const pushToast = useCallback((toast: Omit<ToastMessage, 'id'>) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    setToasts((prev) => [...prev, { ...toast, id }]);
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const value = useMemo(
    () => ({
      rounds,
      profile,
      toasts,
      setRounds,
      addRounds,
      addRound,
      updateRound,
      deleteRound,
      updateProfile,
      resetToSeed,
      pushToast,
      dismissToast,
    }),
    [
      rounds,
      profile,
      toasts,
      setRounds,
      addRounds,
      addRound,
      updateRound,
      deleteRound,
      updateProfile,
      resetToSeed,
      pushToast,
      dismissToast,
    ],
  );

  return <GolfContext.Provider value={value}>{children}</GolfContext.Provider>;
}

export function useGolf(): GolfContextValue {
  const ctx = useContext(GolfContext);
  if (!ctx) throw new Error('useGolf must be used within GolfProvider');
  return ctx;
}
