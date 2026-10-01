import type { Entry } from './entry';

export interface ProductProfit { productId: string; name: string; units: number; ingresos: number; costo: number; utilidad: number }

// Utilidad ESTIMADA por producto = ingresos - (costo del producto x unidades).
// Es distinta de la utilidad de flujo de efectivo (ventas - gastos registrados).
export function productProfit(entries: Entry[]): ProductProfit[] {
  const map = new Map<string, ProductProfit>();
  for (const e of entries) {
    if (e.kind !== 'venta' || !e.productId || e.unitCost === undefined) continue;
    const p = map.get(e.productId) ?? { productId: e.productId, name: e.concept, units: 0, ingresos: 0, costo: 0, utilidad: 0 };
    p.units += e.quantity;
    p.ingresos += e.total;
    p.costo += Math.round(e.unitCost * e.quantity);
    p.utilidad = p.ingresos - p.costo;
    map.set(e.productId, p);
  }
  return [...map.values()].sort((a, b) => b.utilidad - a.utilidad);
}
