import type { Expense, Sale } from './models';

export const sumTotals = (xs: { total: number }[]) => xs.reduce((acc, x) => acc + x.total, 0);

// Utilidad (flujo de efectivo) = Ventas - Gastos registrados
export function summarize(sales: Sale[], expenses: Expense[]) {
  const ventas = sumTotals(sales);
  const gastos = sumTotals(expenses);
  return { ventas, gastos, utilidad: ventas - gastos, ventasCount: sales.length };
}
