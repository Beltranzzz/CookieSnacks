import type { Table } from 'dexie';
import { db } from './db';
import { expensesRepo, productsRepo, salesRepo, settingsRepo } from './repositories';
import type { Expense, Product, Sale } from '../domain/models';
import type { Settings } from '../domain/settings';

export interface BackupFile {
  app: 'cookiesnacks';
  version: 1;
  exportedAt: string;
  data: { sales: Sale[]; expenses: Expense[]; products: Product[]; settings: Settings | null };
}

export async function createBackup(): Promise<BackupFile> {
  const [sales, expenses, products, settings] = await Promise.all([
    salesRepo.all(), expensesRepo.all(), productsRepo.all(), settingsRepo.get(),
  ]);
  return { app: 'cookiesnacks', version: 1, exportedAt: new Date().toISOString(), data: { sales, expenses, products, settings } };
}

export function parseBackup(text: string): BackupFile {
  let raw: unknown;
  try { raw = JSON.parse(text); } catch { throw new Error('El archivo no es una copia válida de CookieSnacks.'); }
  const b = raw as Partial<BackupFile> | null;
  if (!b || b.app !== 'cookiesnacks' || !b.data) throw new Error('El archivo no es una copia válida de CookieSnacks.');
  const ok = (xs: unknown) => Array.isArray(xs) && xs.every((x) => x && typeof (x as { id?: unknown }).id === 'string');
  if (!ok(b.data.sales) || !ok(b.data.expenses) || !ok(b.data.products)) throw new Error('La copia está incompleta o dañada.');
  return b as BackupFile;
}

type Row = { id: string; updatedAt: string; deletedAt?: string };

async function restoreTable<T extends Row>(table: Table<T, string>, incoming: T[], mode: 'merge' | 'replace', now: string) {
  const existing = await table.toArray();
  if (mode === 'replace') {
    // Lo que no viene en la copia se marca como borrado (así el borrado también se sincroniza)
    const keep = new Set(incoming.map((r) => r.id));
    const gone = existing.filter((r) => !keep.has(r.id) && !r.deletedAt).map((r) => ({ ...r, deletedAt: now, updatedAt: now }));
    await table.bulkPut(gone);
    await table.bulkPut(incoming.map((r) => ({ ...r, deletedAt: undefined, updatedAt: now })));
  } else {
    // Combinar: solo entra lo que falta o lo que sea más reciente que lo actual
    const byId = new Map(existing.map((r) => [r.id, r]));
    const fresh = incoming.filter((r) => {
      const e = byId.get(r.id);
      return !e || (r.updatedAt ?? '') > (e.updatedAt ?? '');
    });
    await table.bulkPut(fresh);
  }
}

export async function restoreBackup(b: BackupFile, mode: 'merge' | 'replace') {
  const now = new Date().toISOString();
  await db.transaction('rw', [db.sales, db.expenses, db.products, db.settings], async () => {
    await restoreTable(db.sales, b.data.sales, mode, now);
    await restoreTable(db.expenses, b.data.expenses, mode, now);
    await restoreTable(db.products, b.data.products, mode, now);
    if (mode === 'replace' && b.data.settings) await db.settings.put({ ...b.data.settings, updatedAt: now, key: 'app' });
  });
}
