import { expensesRepo, salesRepo } from '../../data/repositories';
import { toEntries, type Entry } from '../entry';

// Ventas y gastos dentro de un rango inclusivo de fechas (sin límite si from/to no existen)
export async function loadEntries(r: { from?: string; to?: string }): Promise<Entry[]> {
  const [sales, expenses] = await Promise.all([salesRepo.all(), expensesRepo.all()]);
  const inRange = (k: string) => (!r.from || k >= r.from) && (!r.to || k <= r.to);
  return toEntries(sales.filter((s) => inRange(s.dateKey)), expenses.filter((e) => inRange(e.dateKey)));
}
