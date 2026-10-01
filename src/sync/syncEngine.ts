import type { Table } from 'dexie';
import {
  collection, doc, onSnapshot, writeBatch,
  type DocumentData, type DocumentReference, type Unsubscribe,
} from 'firebase/firestore';
import { db } from '../data/db';
import type { Settings } from '../domain/settings';
import { firebase } from './firebase';

interface Rec { id: string; updatedAt?: string }

export interface SyncStatus { state: 'idle' | 'syncing' | 'offline' | 'error'; lastSyncAt?: string; error?: string }

const NAMES = ['sales', 'expenses', 'products'] as const;
type Name = (typeof NAMES)[number];
const TOTAL = NAMES.length + 1; // 3 colecciones + configuración

const tableOf = (n: Name) =>
  (n === 'sales' ? db.sales : n === 'expenses' ? db.expenses : db.products) as unknown as Table<Rec, string>;

const withTimeout = <T>(p: Promise<T>, ms: number) =>
  Promise.race([p, new Promise<T>((_, reject) => setTimeout(() => reject(new Error('Tiempo de espera agotado')), ms))]);

function friendly(e: unknown) {
  const code = (e as { code?: string } | null)?.code ?? '';
  if (code === 'permission-denied') return 'Sin permiso en Firestore: revisa las reglas de seguridad (ver SINCRONIZACION.md).';
  if (code === 'unavailable') return 'No se pudo conectar con el servidor. Se reintentará.';
  return e instanceof Error ? e.message : 'Error desconocido de sincronización';
}

// Guarda en este dispositivo lo que llegó de la nube, solo si es más reciente que lo local
async function applyRemote(table: Table<Rec, string>, docs: Rec[]) {
  if (!docs.length) return;
  await db.transaction('rw', table, async () => {
    const existing = await table.bulkGet(docs.map((d) => d.id));
    const fresh = docs.filter((d, i) => {
      const e = existing[i];
      return !e || (d.updatedAt ?? '') > (e.updatedAt ?? '');
    });
    if (fresh.length) await table.bulkPut(fresh);
  });
}

// Sincronización local-first: la app siempre lee y escribe en el dispositivo (Dexie);
// este motor sube los cambios locales a Firestore y baja los cambios de los otros dispositivos.
// Si un registro cambia en dos lugares, gana la edición más reciente (updatedAt).
export function startSync(uid: string, onStatus: (s: SyncStatus) => void) {
  const f = firebase();
  if (!f) return { stop: () => {}, flushNow: () => {} };
  const fs = f.fs;

  const cursorKey = `cookiesnacks.sync.cursor.${uid}`; // lo anterior a esta marca ya se subió
  const known = new Map<string, string>(); // versiones que ya existen en la nube
  const ready = new Set<string>();
  const unsubs: Unsubscribe[] = [];
  const status: SyncStatus = { state: 'syncing' };
  let stopped = false;
  let flushing = false;
  let again = false;
  let timer: number | undefined;

  const emit = (p: Partial<SyncStatus>) => {
    if (stopped) return;
    Object.assign(status, p);
    onStatus({ ...status });
  };

  const schedule = (ms = 800) => {
    window.clearTimeout(timer);
    timer = window.setTimeout(() => { void flush(); }, ms);
  };

  async function flush() {
    if (stopped || ready.size < TOTAL) return;
    if (!navigator.onLine) { emit({ state: 'offline' }); return; }
    if (flushing) { again = true; return; }
    flushing = true;
    emit({ state: 'syncing' });
    try {
      const cursor = localStorage.getItem(cursorKey) ?? '';
      const startedAt = new Date().toISOString();
      const ops: { ref: DocumentReference<DocumentData>; data: DocumentData; key: string; ver: string }[] = [];

      for (const name of NAMES) {
        for (const r of await tableOf(name).toArray()) {
          const ver = r.updatedAt ?? '';
          if (ver > cursor && known.get(`${name}/${r.id}`) !== ver) {
            ops.push({ ref: doc(fs, 'users', uid, name, r.id), data: { ...r }, key: `${name}/${r.id}`, ver });
          }
        }
      }
      const s = await db.settings.get('app');
      if (s?.updatedAt && s.updatedAt > cursor && known.get('settings') !== s.updatedAt) {
        const { key, ...data } = s;
        void key;
        ops.push({ ref: doc(fs, 'users', uid, 'meta', 'settings'), data, key: 'settings', ver: s.updatedAt });
      }

      for (let i = 0; i < ops.length; i += 400) {
        const chunk = ops.slice(i, i + 400);
        const batch = writeBatch(fs);
        chunk.forEach((o) => batch.set(o.ref, o.data));
        await withTimeout(batch.commit(), 20000);
        chunk.forEach((o) => known.set(o.key, o.ver));
      }

      // un segundo de margen para no perder cambios hechos en el mismo instante
      localStorage.setItem(cursorKey, new Date(Date.parse(startedAt) - 1000).toISOString());
      emit({ state: 'idle', lastSyncAt: new Date().toISOString(), error: undefined });
    } catch (e) {
      emit({ state: 'error', error: friendly(e) });
    } finally {
      flushing = false;
      if (again) { again = false; schedule(); }
    }
  }

  const markReady = (name: string) => {
    if (ready.has(name)) return;
    ready.add(name);
    if (ready.size === TOTAL) schedule(0);
  };

  // Bajar cambios en tiempo real desde la nube
  for (const name of NAMES) {
    unsubs.push(onSnapshot(
      collection(fs, 'users', uid, name),
      async (snap) => {
        const docs = snap.docChanges().filter((c) => c.type !== 'removed').map((c) => c.doc.data() as Rec);
        docs.forEach((d) => known.set(`${name}/${d.id}`, d.updatedAt ?? ''));
        await applyRemote(tableOf(name), docs);
        markReady(name);
      },
      (err) => emit({ state: 'error', error: friendly(err) })
    ));
  }
  unsubs.push(onSnapshot(
    doc(fs, 'users', uid, 'meta', 'settings'),
    async (snap) => {
      if (snap.exists()) {
        const remote = snap.data() as Settings;
        known.set('settings', remote.updatedAt ?? '');
        const local = await db.settings.get('app');
        if ((remote.updatedAt ?? '') > (local?.updatedAt ?? '')) await db.settings.put({ ...remote, key: 'app' });
      }
      markReady('settings');
    },
    (err) => emit({ state: 'error', error: friendly(err) })
  ));

  // Subir cuando cambie algo en este dispositivo, al volver el internet o al abrir la app
  const hook = () => { schedule(); };
  const tables = [db.sales, db.expenses, db.products, db.settings] as unknown as Table<unknown, string>[];
  tables.forEach((t) => { t.hook('creating', hook); t.hook('updating', hook); t.hook('deleting', hook); });
  const onOnline = () => schedule(300);
  const onVisible = () => { if (document.visibilityState === 'visible') schedule(300); };
  window.addEventListener('online', onOnline);
  document.addEventListener('visibilitychange', onVisible);

  return {
    flushNow: () => schedule(0),
    stop: () => {
      stopped = true;
      window.clearTimeout(timer);
      unsubs.forEach((u) => u());
      tables.forEach((t) => {
        t.hook('creating').unsubscribe(hook);
        t.hook('updating').unsubscribe(hook);
        t.hook('deleting').unsubscribe(hook);
      });
      window.removeEventListener('online', onOnline);
      document.removeEventListener('visibilitychange', onVisible);
    },
  };
}
