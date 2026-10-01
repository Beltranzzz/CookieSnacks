import Dexie, { type Table } from 'dexie';
import type { Expense, Product, Sale } from '../domain/models';
import type { Settings } from '../domain/settings';

export type StoredSettings = Settings & { key: string };

class CookieDB extends Dexie {
  sales!: Table<Sale, string>;
  expenses!: Table<Expense, string>;
  products!: Table<Product, string>;
  settings!: Table<StoredSettings, string>;

  constructor() {
    super('cookiesnacks');
    this.version(1).stores({
      sales: 'id, dateKey, occurredAt',
      expenses: 'id, dateKey, occurredAt',
    });
    // v2: catálogo de productos
    this.version(2).stores({
      products: 'id, name',
    });
    // v3: configuración (una sola fila con key "app"). Los datos existentes se conservan.
    this.version(3).stores({
      settings: 'key',
    });
  }
}

export const db = new CookieDB();
