import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { firebase, isSyncConfigured } from '../../sync/firebase';
import { startSync, type SyncStatus } from '../../sync/syncEngine';

interface SyncCtx {
  configured: boolean;
  user: User | null | undefined; // undefined = comprobando sesión
  status: SyncStatus;
  syncNow: () => void;
}

export const SyncContext = createContext<SyncCtx>({ configured: false, user: null, status: { state: 'idle' }, syncNow: () => {} });
export const useSync = () => useContext(SyncContext);

// Se usa en App: mantiene la sesión y arranca la sincronización mientras haya usuario
export function useSyncState(): SyncCtx {
  const [user, setUser] = useState<User | null | undefined>(isSyncConfigured ? undefined : null);
  const [status, setStatus] = useState<SyncStatus>({ state: 'idle' });
  const flushRef = useRef<() => void>(() => {});

  useEffect(() => {
    const f = firebase();
    if (!f) return;
    return onAuthStateChanged(f.auth, setUser);
  }, []);

  const uid = user?.uid;
  useEffect(() => {
    if (!uid) { setStatus({ state: 'idle' }); return; }
    setStatus({ state: 'syncing' });
    const s = startSync(uid, setStatus);
    flushRef.current = s.flushNow;
    return () => { s.stop(); flushRef.current = () => {}; };
  }, [uid]);

  return { configured: isSyncConfigured, user, status, syncNow: () => flushRef.current() };
}
