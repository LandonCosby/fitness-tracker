import { useSyncExternalStore } from 'react';

const subscribe = () => () => {};

// The server snapshot is used during server rendering and hydration,
// so this returns `server` until the client has hydrated.
export function useClientOnlyValue<S, C>(server: S, client: C): S | C {
  const isClient = useSyncExternalStore(
    subscribe,
    () => true,
    () => false
  );

  return isClient ? client : server;
}
