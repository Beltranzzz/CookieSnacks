import { db } from './db';
import type { Expense, Product, Sale } from '../domain/models';
import type { Settings } from '../domain/settings';

// Borrado lógico: el registro se marca con deletedAt (no se elimina) para que el borrado
// también se sincronice con los demás dispositivos. Las lecturas ignoran lo borrado.
const live = <T extends { deletedAt?: string }>(xs: T[]) => xs.filter((x) => !x.deletedAt);
const tombstone = () => {
  const now = new Date().toISOString();
  return { deletedAt: now, updatedAt: now };
};

export const salesRepo = {
  add: (s: Sale) => db.sales.add(s),
  all: async () => live(await db.sales.toArray()),
  byDate: async (key: string) => live(await db.sales.where('dateKey').equals(key).toArray()),
  between: async (from: string, toExclusive: string) =>
    live(await db.sales.where('dateKey').between(from, toExclusive, true, false).toArray()),
  update: (id: string, changes: Partial<Sale>) => db.sales.update(id, changes),
  remove: (id: string) => db.sales.update(id, tombstone()),
};

export const expensesRepo = {
  add: (e: Expense) => db.expenses.add(e),
  all: async () => live(await db.expenses.toArray()),
  byDate: async (key: string) => live(await db.expenses.where('dateKey').equals(key).toArray()),
  between: async (from: string, toExclusive: string) =>
    live(await db.expenses.where('dateKey').between(from, toExclusive, true, false).toArray()),
  update: (id: string, changes: Partial<Expense>) => db.expenses.update(id, changes),
  remove: (id: string) => db.expenses.update(id, tombstone()),
  renameCategory: (oldName: string, newName: string) =>
    db.expenses.filter((e) => e.category === oldName && !e.deletedAt).modify({ category: newName, updatedAt: new Date().toISOString() }),
};

export const productsRepo = {
  add: (p: Product) => db.products.add(p),
  all: async () => live(await db.products.toArray()),
  update: (id: string, changes: Partial<Product>) => db.products.update(id, changes),
  renameCategory: (oldName: string, newName: string) =>
    db.products.filter((p) => p.category === oldName && !p.deletedAt).modify({ category: newName, updatedAt: new Date().toISOString() }),
};

export const settingsRepo = {
  get: async (): Promise<Settings | null> => {
    const row = await db.settings.get('app');
    if (!row) return null;
    const { key, ...rest } = row;
    void key;
    return rest;
  },
  put: (s: Settings) => db.settings.put({ ...s, key: 'app' }),
};

export async function paymentMethodInUse(id: string) {
  const [s, e] = await Promise.all([
    db.sales.filter((x) => x.paymentMethod === id && !x.deletedAt).count(),
    db.expenses.filter((x) => x.paymentMethod === id && !x.deletedAt).count(),
  ]);
  return s + e > 0;
}
