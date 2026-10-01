import type { Expense, Sale } from './models';

// Vista unificada de ventas y gastos (para Registro, Calendario y Reportes)
export type Entry = ({ kind: 'venta' } & Sale) | ({ kind: 'gasto' } & Expense);

export const toEntries = (sales: Sale[], expenses: Expense[]): Entry[] =>
  [
    ...sales.map((s) => ({ kind: 'venta' as const, ...s })),
    ...expenses.map((e) => ({ kind: 'gasto' as const, ...e })),
  ].sort((a, b) => b.occurredAt.localeCompare(a.occurredAt));
