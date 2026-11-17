import { usePreventRemove } from 'expo-router';
import { useEffect, useState } from 'react';
import { showAlert } from '@/components/AlertSheet';

// Capture the loaded draft once; pushes to pickers keep the draft and do not prompt.
// Only a pop/dismiss/replacement that removes this screen is guarded.
export function useUnsavedChanges(snapshot: string, ready: boolean) {
  const [baseline, setBaseline] = useState<string | null>(null);
  const [released, setReleased] = useState(false);
  useEffect(() => {
    if (ready && baseline === null) setBaseline(snapshot);
  }, [ready, baseline, snapshot]);
  const disable = usePreventRemove(ready && baseline !== null && snapshot !== baseline && !released,
    ({ repeat }) => showAlert('Discard changes?', 'Your changes have not been saved.', [
      { text: 'Keep editing', style: 'cancel' },
      { text: 'Discard', style: 'destructive', onPress: () => { setReleased(true); disable(); repeat(); } },
    ]));
  return () => { setReleased(true); disable(); };
}
