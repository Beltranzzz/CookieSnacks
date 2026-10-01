import { useLiveQuery } from 'dexie-react-hooks';
import { runtime } from '../../config/runtime';
import { expensesRepo, salesRepo } from '../../data/repositories';
import { summarize, sumTotals } from '../../domain/calculations';
import { dateKey, daysAgoKey, timeLabel } from '../../lib/dates';
import { money } from '../../lib/money';

type Kind = 'venta' | 'gasto';
interface Op { id: string; kind: Kind; concept: string; total: number; occurredAt: string; quantity?: number }

export function Dashboard({ onNew }: { onNew: (k: Kind) => void }) {
  const today = dateKey();
  const data = useLiveQuery(async () => {
    const [sales, expenses, prev] = await Promise.all([
      salesRepo.byDate(today),
      expensesRepo.byDate(today),
      salesRepo.between(daysAgoKey(7), today),
    ]);
    return { sales, expenses, prev };
  }, [today]);

  const sales = data?.sales ?? [];
  const expenses = data?.expenses ?? [];
  const prev = data?.prev ?? [];
  const s = summarize(sales, expenses);

  const ops: Op[] = [
    ...sales.map((x) => ({ id: x.id, kind: 'venta' as const, concept: x.concept, total: x.total, occurredAt: x.occurredAt, quantity: x.quantity })),
    ...expenses.map((x) => ({ id: x.id, kind: 'gasto' as const, concept: x.concept, total: x.total, occurredAt: x.occurredAt })),
  ].sort((a, b) => b.occurredAt.localeCompare(a.occurredAt)).slice(0, 6);

  const avg7 = sumTotals(prev) / 7;
  const diff = avg7 > 0 ? Math.round(((s.ventas - avg7) / avg7) * 100) : null;

  return (
    <>
      <h1>{runtime.businessName} 👋</h1>
      <p className="date">{new Date().toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' })}</p>

      <section className="stats">
        <div className="card stat ventas"><small>💰 Ventas</small><b>{money(s.ventas)}</b></div>
        <div className="card stat gastos"><small>💸 Gastos</small><b>{money(s.gastos)}</b></div>
        <div className="card stat util"><small>📈 Utilidad</small><b>{money(s.utilidad)}</b></div>
        <div className="card stat"><small>🧾 Ventas realizadas</small><b>{s.ventasCount}</b></div>
      </section>

      <section className="grid2">
        <div>
          <div className="card">
            <h2>Registro rápido</h2>
            <div className="quick">
              <button className="big venta" onClick={() => onNew('venta')}>🛍️ Registrar venta</button>
              <button className="big gasto" onClick={() => onNew('gasto')}>💸 Registrar gasto</button>
            </div>
          </div>
          <div className="card" style={{ marginTop: 14 }}>
            <h2>Resumen del día</h2>
            <ul className="insights">
              <li>Hoy llevas <b>{money(s.ventas)}</b> en ventas.</li>
              <li>Has gastado <b>{money(s.gastos)}</b>.</li>
              <li>Tu utilidad registrada es de <b>{money(s.utilidad)}</b>.</li>
              <li>Has realizado <b>{s.ventasCount}</b> {s.ventasCount === 1 ? 'venta' : 'ventas'}.</li>
              {diff !== null && (
                <li className={diff >= 0 ? 'pos' : 'neg'}>
                  {diff >= 0 ? '▲' : '▼'} {Math.abs(diff)}% {diff >= 0 ? 'más' : 'menos'} que tu promedio de los últimos 7 días ({money(avg7)}).
                </li>
              )}
            </ul>
          </div>
        </div>

        <div className="card">
          <h2>Últimas operaciones</h2>
          {ops.length === 0 ? (
            <p className="empty">Aún no hay operaciones hoy. Toca "Registrar venta" para empezar.</p>
          ) : (
            <ul className="ops">
              {ops.map((o) => (
                <li key={o.id}>
                  <div>
                    {o.kind === 'venta' ? '🍪' : '📦'} {o.quantity && o.quantity > 1 ? `${o.quantity} × ` : ''}{o.concept}
                    <small>{o.kind === 'venta' ? 'Venta' : 'Gasto'} · {timeLabel(o.occurredAt)}</small>
                  </div>
                  <b className={o.kind === 'venta' ? 'pos' : 'neg'}>{o.kind === 'venta' ? '+' : '-'}{money(o.total)}</b>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </>
  );
}
