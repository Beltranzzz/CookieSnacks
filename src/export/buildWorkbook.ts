import * as XLSX from 'xlsx';
import { PAYMENT_METHODS } from '../config/constants';
import { runtime } from '../config/runtime';
import { sumTotals } from '../domain/calculations';
import type { Entry } from '../domain/entry';

const MONEY = '"$"#,##0.00';
const DATE = 'dd/mm/yyyy';

const pesos = (cents: number) => cents / 100;
const methodLabel = (id: string) => PAYMENT_METHODS.find((m) => m.id === id)?.label ?? id;
const timeText = (iso: string) =>
  new Date(iso).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', hour12: false });

// "YYYY-MM-DD" -> número de serie de Excel (fecha real, sin desfases de zona horaria)
const serial = (key: string) => {
  const [y, m, d] = key.split('-').map(Number);
  return Math.round((Date.UTC(y, m - 1, d) - Date.UTC(1899, 11, 30)) / 86400000);
};

function format(ws: XLSX.WorkSheet, col: number, fromRow: number, toRow: number, z: string) {
  for (let r = fromRow; r <= toRow; r++) {
    const cell = ws[XLSX.utils.encode_cell({ r, c: col })];
    if (cell && cell.t === 'n') cell.z = z;
  }
}

export function buildWorkbook(entries: Entry[], periodLabel: string): XLSX.WorkBook {
  const sorted = [...entries].sort((a, b) => a.occurredAt.localeCompare(b.occurredAt));

  // Hoja 1: Operaciones
  const header = ['Fecha', 'Hora', 'Tipo', 'Concepto', 'Cantidad', 'Precio', 'Total', 'Método de pago', 'Categoría', 'Notas'];
  const rows = sorted.map((e) => [
    serial(e.dateKey),
    timeText(e.occurredAt),
    e.kind === 'venta' ? 'Venta' : 'Gasto',
    e.concept,
    e.kind === 'venta' ? e.quantity : 1,
    pesos(e.kind === 'venta' ? e.unitPrice : e.total),
    pesos(e.total),
    methodLabel(e.paymentMethod),
    e.kind === 'gasto' ? e.category : '',
    e.notes ?? '',
  ]);
  const ops = XLSX.utils.aoa_to_sheet([header, ...rows]);
  format(ops, 0, 1, rows.length, DATE);
  format(ops, 5, 1, rows.length, MONEY);
  format(ops, 6, 1, rows.length, MONEY);
  ops['!cols'] = [{ wch: 12 }, { wch: 8 }, { wch: 8 }, { wch: 30 }, { wch: 10 }, { wch: 12 }, { wch: 12 }, { wch: 16 }, { wch: 14 }, { wch: 30 }];

  // Hoja 2: Resumen
  const sales = sorted.filter((e) => e.kind === 'venta');
  const expenses = sorted.filter((e) => e.kind === 'gasto');
  const ventas = sumTotals(sales);
  const gastos = sumTotals(expenses);

  const perDay = new Map<string, { v: number; g: number }>();
  sorted.forEach((e) => {
    const d = perDay.get(e.dateKey) ?? { v: 0, g: 0 };
    if (e.kind === 'venta') d.v += e.total; else d.g += e.total;
    perDay.set(e.dateKey, d);
  });
  const days = [...perDay.entries()].sort(([a], [b]) => a.localeCompare(b));

  const summary = XLSX.utils.aoa_to_sheet([
    [`${runtime.businessName} - Resumen`],
    ['Periodo', periodLabel],
    [],
    ['Ventas totales', pesos(ventas)],
    ['Gastos totales', pesos(gastos)],
    ['Utilidad (ventas - gastos)', pesos(ventas - gastos)],
    ['Número de operaciones', sorted.length],
    ['Número de ventas', sales.length],
    ['Ticket promedio', sales.length ? pesos(ventas / sales.length) : 0],
    [],
    ['Por día'],
    ['Fecha', 'Ventas', 'Gastos', 'Utilidad'],
    ...days.map(([k, d]) => [serial(k), pesos(d.v), pesos(d.g), pesos(d.v - d.g)]),
  ]);
  format(summary, 1, 3, 5, MONEY);
  format(summary, 1, 8, 8, MONEY);
  const last = 11 + days.length;
  format(summary, 0, 12, last, DATE);
  [1, 2, 3].forEach((c) => format(summary, c, 12, last, MONEY));
  summary['!cols'] = [{ wch: 28 }, { wch: 22 }, { wch: 14 }, { wch: 14 }];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ops, 'Operaciones');
  XLSX.utils.book_append_sheet(wb, summary, 'Resumen');
  return wb;
}
