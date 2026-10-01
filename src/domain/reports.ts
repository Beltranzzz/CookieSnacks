import { sumTotals } from './calculations';
import type { Entry } from './entry';
import { addDaysKey, addMonthsKey, parseKey } from '../lib/dates';

export type Granularity = 'hora' | 'dia' | 'mes';

export interface Bucket { key: string; label: string; ventas: number; gastos: number; utilidad: number }

export interface Report {
  ventas: number;
  gastos: number;
  utilidad: number; // flujo de efectivo: ventas - gastos registrados
  ventasCount: number;
  ticketPromedio: number;
  count: number;
  granularity: Granularity;
  buckets: Bucket[];
}

const diffDays = (from: string, to: string) =>
  Math.round((parseKey(to).getTime() - parseKey(from).getTime()) / 86400000) + 1;

// Un solo día -> barras por hora; hasta 62 días -> por día; más -> por mes
export function buildReport(entries: Entry[], from: string, to: string): Report {
  const days = diffDays(from, to);
  const granularity: Granularity = days === 1 ? 'hora' : days > 62 ? 'mes' : 'dia';

  const keyOf = (e: Entry) =>
    granularity === 'hora' ? String(new Date(e.occurredAt).getHours())
    : granularity === 'mes' ? e.dateKey.slice(0, 7)
    : e.dateKey;

  const sums = new Map<string, { v: number; g: number }>();
  entries.forEach((e) => {
    const k = keyOf(e);
    const b = sums.get(k) ?? { v: 0, g: 0 };
    if (e.kind === 'venta') b.v += e.total; else b.g += e.total;
    sums.set(k, b);
  });

  let keys: string[] = [];
  if (granularity === 'hora') {
    const active = [...sums.keys()].map(Number);
    const hmin = Math.min(8, ...active);
    const hmax = Math.max(20, ...active);
    keys = Array.from({ length: hmax - hmin + 1 }, (_, i) => String(hmin + i));
  } else if (granularity === 'dia') {
    for (let d = from; d <= to; d = addDaysKey(d, 1)) keys.push(d);
  } else {
    const end = to.slice(0, 7);
    for (let ym = from.slice(0, 7); ym <= end; ym = addMonthsKey(`${ym}-01`, 1).slice(0, 7)) keys.push(ym);
  }

  const label = (k: string) =>
    granularity === 'hora' ? `${k}h`
    : granularity === 'mes' ? parseKey(`${k}-01`).toLocaleDateString('es-MX', { month: 'short' }).replace('.', '')
    : days <= 7 ? parseKey(k).toLocaleDateString('es-MX', { weekday: 'short' }).replace('.', '')
    : String(Number(k.slice(8)));

  const buckets: Bucket[] = keys.map((k) => {
    const b = sums.get(k) ?? { v: 0, g: 0 };
    return { key: k, label: label(k), ventas: b.v, gastos: b.g, utilidad: b.v - b.g };
  });

  const sales = entries.filter((e) => e.kind === 'venta');
  const ventas = sumTotals(sales);
  const gastos = sumTotals(entries.filter((e) => e.kind === 'gasto'));
  return {
    ventas, gastos, utilidad: ventas - gastos,
    ventasCount: sales.length,
    ticketPromedio: sales.length ? Math.round(ventas / sales.length) : 0,
    count: entries.length,
    granularity, buckets,
  };
}
