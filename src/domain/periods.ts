import { addDaysKey, dateKey } from '../lib/dates';

export type PeriodId = 'hoy' | 'semana' | 'mes' | 'rango' | 'todo';

// from/to son fechas "YYYY-MM-DD" inclusivas; undefined = sin límite
export interface Range { from?: string; to?: string; label: string; valid: boolean }

export function resolvePeriod(id: PeriodId, custom?: { from: string; to: string }, now: Date = new Date()): Range {
  const today = dateKey(now);
  switch (id) {
    case 'hoy':
      return { from: today, to: today, label: 'Hoy', valid: true };
    case 'semana': {
      const dow = (now.getDay() + 6) % 7; // semana de lunes a domingo
      const from = addDaysKey(today, -dow);
      return { from, to: addDaysKey(from, 6), label: 'Esta semana', valid: true };
    }
    case 'mes': {
      const from = dateKey(new Date(now.getFullYear(), now.getMonth(), 1));
      const to = dateKey(new Date(now.getFullYear(), now.getMonth() + 1, 0));
      return { from, to, label: 'Este mes', valid: true };
    }
    case 'rango': {
      const f = custom?.from || undefined;
      const t = custom?.to || undefined;
      return { from: f, to: t, label: 'Rango personalizado', valid: !!f && !!t && f <= t };
    }
    default:
      return { label: 'Todo', valid: true };
  }
}
