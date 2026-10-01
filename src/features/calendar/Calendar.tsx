import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { PAYMENT_METHODS } from '../../config/constants';
import { sumTotals } from '../../domain/calculations';
import { toEntries } from '../../domain/entry';
import { expensesRepo, salesRepo } from '../../data/repositories';
import { addDaysKey, addMonthsKey, dateKey, parseKey, timeLabel } from '../../lib/dates';
import { money } from '../../lib/money';

const WEEK = ['D', 'L', 'M', 'M', 'J', 'V', 'S'];

export function Calendar() {
  const [selected, setSelected] = useState(dateKey());
  const today = dateKey();

  const base = parseKey(selected);
  const y = base.getFullYear();
  const m = base.getMonth();
  const first = dateKey(new Date(y, m, 1));
  const next = dateKey(new Date(y, m + 1, 1));

  const data = useLiveQuery(
    async () => ({ sales: await salesRepo.between(first, next), expenses: await expensesRepo.between(first, next) }),
    [first, next]
  );
  const sales = data?.sales ?? [];
  const expenses = data?.expenses ?? [];

  // Marcas por día para los puntitos del calendario
  const marks = new Map<string, { v: boolean; g: boolean }>();
  sales.forEach((s) => marks.set(s.dateKey, { v: true, g: marks.get(s.dateKey)?.g ?? false }));
  expenses.forEach((e) => marks.set(e.dateKey, { v: marks.get(e.dateKey)?.v ?? false, g: true }));

  const daySales = sales.filter((s) => s.dateKey === selected);
  const dayExpenses = expenses.filter((e) => e.dateKey === selected);
  const entries = toEntries(daySales, dayExpenses);
  const ventas = sumTotals(daySales);
  const gastos = sumTotals(dayExpenses);

  const lead = new Date(y, m, 1).getDay();
  const daysInMonth = new Date(y, m + 1, 0).getDate();
  const cells: (string | null)[] = [
    ...Array<null>(lead).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => dateKey(new Date(y, m, i + 1))),
  ];

  return (
    <>
      <h1>Calendario</h1>
      <div className="cal-layout">
        <div className="card">
          <div className="cal-head">
            <button className="mini" onClick={() => setSelected(addMonthsKey(selected, -1))} aria-label="Mes anterior">‹</button>
            <b className="cal-title">{base.toLocaleDateString('es-MX', { month: 'long', year: 'numeric' })}</b>
            <button className="mini" onClick={() => setSelected(addMonthsKey(selected, 1))} aria-label="Mes siguiente">›</button>
          </div>

          <div className="cal-grid">
            {WEEK.map((w, i) => <span key={i} className="cal-week">{w}</span>)}
            {cells.map((key, i) =>
              key === null ? <span key={`b${i}`} /> : (
                <button
                  key={key}
                  className={`cal-day ${key === selected ? 'sel' : ''} ${key === today ? 'today' : ''}`}
                  onClick={() => setSelected(key)}
                  aria-label={parseKey(key).toLocaleDateString('es-MX', { day: 'numeric', month: 'long' })}
                >
                  {Number(key.slice(8))}
                  <span className="dots">
                    {marks.get(key)?.v && <i className="dot v" />}
                    {marks.get(key)?.g && <i className="dot g" />}
                  </span>
                </button>
              )
            )}
          </div>
          <button className="mini cal-today" onClick={() => setSelected(today)}>Ir a hoy</button>
        </div>

        <div>
          <div className="day-nav">
            <button className="mini" onClick={() => setSelected(addDaysKey(selected, -1))}>‹ Anterior</button>
            <b className="day-title">{base.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' })}</b>
            <button className="mini" onClick={() => setSelected(addDaysKey(selected, 1))}>Siguiente ›</button>
          </div>

          <section className="stats">
            <div className="card stat ventas"><small>💰 Ventas</small><b>{money(ventas)}</b></div>
            <div className="card stat gastos"><small>💸 Gastos</small><b>{money(gastos)}</b></div>
            <div className="card stat util"><small>📈 Utilidad</small><b>{money(ventas - gastos)}</b></div>
            <div className="card stat"><small>🧾 Operaciones</small><b>{entries.length}</b></div>
          </section>

          <div className="card" style={{ marginTop: 14 }}>
            <h2>Detalle del día</h2>
            {entries.length === 0 ? (
              <p className="empty">No hay operaciones registradas este día.</p>
            ) : (
              <ul className="ops">
                {entries.map((e) => (
                  <li key={`${e.kind}-${e.id}`}>
                    <div>
                      {e.kind === 'venta' ? '🍪' : '📦'} {e.kind === 'venta' && e.quantity > 1 ? `${e.quantity} × ` : ''}{e.concept}
                      <small>
                        {e.kind === 'venta' ? 'Venta' : `Gasto · ${e.category}`} · {timeLabel(e.occurredAt)} · {PAYMENT_METHODS.find((p) => p.id === e.paymentMethod)?.label ?? e.paymentMethod}
                      </small>
                      {e.notes && <small>📝 {e.notes}</small>}
                    </div>
                    <b className={e.kind === 'venta' ? 'pos' : 'neg'}>{e.kind === 'venta' ? '+' : '-'}{money(e.total)}</b>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
