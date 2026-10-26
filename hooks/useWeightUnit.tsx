import { useSQLiteContext } from 'expo-sqlite';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { getWeightUnit, setWeightUnit } from '@/db/settings';
import { DEFAULT_WEIGHT_UNIT, type WeightUnit } from '@/db/units';

type WeightUnitContextValue = {
  unit: WeightUnit;
  setUnit: (unit: WeightUnit) => Promise<void>;
};

const WeightUnitContext = createContext<WeightUnitContextValue | null>(null);

// Loads the saved unit once and shares it, so every screen updates when it changes.
// Must be rendered inside <SQLiteProvider>.
export function WeightUnitProvider({ children }: { children: ReactNode }) {
  const db = useSQLiteContext();
  const [unit, setUnitState] = useState<WeightUnit>(DEFAULT_WEIGHT_UNIT);

  useEffect(() => {
    let cancelled = false;
    getWeightUnit(db).then((saved) => {
      if (!cancelled) setUnitState(saved);
    });
    return () => {
      cancelled = true;
    };
  }, [db]);

  const setUnit = useCallback(
    async (next: WeightUnit) => {
      const previous = unit;
      setUnitState(next);
      try {
        await setWeightUnit(db, next);
      } catch (error) {
        setUnitState(previous);
        throw error;
      }
    },
    [db, unit]
  );

  const value = useMemo(() => ({ unit, setUnit }), [unit, setUnit]);

  return <WeightUnitContext value={value}>{children}</WeightUnitContext>;
}

export function useWeightUnit(): WeightUnitContextValue {
  const context = useContext(WeightUnitContext);
  if (!context) throw new Error('useWeightUnit must be used inside <WeightUnitProvider>');
  return context;
}
