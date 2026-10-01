import { runtime } from '../config/runtime';

export const toCents = (pesos: number) => Math.round(pesos * 100);
export const money = (cents: number) =>
  (cents / 100).toLocaleString('es-MX', { style: 'currency', currency: runtime.currency });
