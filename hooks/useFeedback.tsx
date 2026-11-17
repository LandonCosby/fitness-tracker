import * as Haptics from 'expo-haptics';
import { useSQLiteContext } from 'expo-sqlite';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

import { getSetting, setSetting } from '@/db/settings';

type Feedback = 'light' | 'medium' | 'success' | 'warning' | 'selection';
let enabledForSession = true;
export function feedback(kind: Feedback = 'light') {
  if (!enabledForSession) return;
  const task = kind === 'selection' ? Haptics.selectionAsync()
    : kind === 'success' || kind === 'warning'
      ? Haptics.notificationAsync(kind === 'success' ? Haptics.NotificationFeedbackType.Success : Haptics.NotificationFeedbackType.Warning)
      : Haptics.impactAsync(kind === 'medium' ? Haptics.ImpactFeedbackStyle.Medium : Haptics.ImpactFeedbackStyle.Light);
  void task.catch(() => {});
}
const Context = createContext({ enabled: true, setEnabled: async (_next: boolean) => {} });
export function FeedbackProvider({ children }: { children: ReactNode }) {
  const db = useSQLiteContext();
  const [enabled, setEnabledState] = useState(true);
  useEffect(() => {
    let live = true;
    getSetting(db, 'haptics_enabled').then((saved) => {
      if (live) { enabledForSession = saved !== 'false'; setEnabledState(enabledForSession); }
    });
    return () => { live = false; };
  }, [db]);
  const setEnabled = async (next: boolean) => {
    await setSetting(db, 'haptics_enabled', String(next));
    enabledForSession = next;
    setEnabledState(next);
  };
  return <Context value={{ enabled, setEnabled }}>{children}</Context>;
}
export const useFeedback = () => useContext(Context);
