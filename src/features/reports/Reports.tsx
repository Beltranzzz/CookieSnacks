import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import type { Entry } from '../../domain/entry';
import { resolvePeriod, type PeriodId } from '../../domain/periods';
import { productProfit } from '../../domain/productProfit';
import { buildReport } from '../../domain/reports';
import { loadEntries } from '../../domain/services/ledgerQuery';
import { addDaysKey, addMonthsKey, dateKey, parseKey } from '../../lib/dates';
import { money } from '../../lib/money';
import { BarChart } from './BarChart';

const PERIODS: [PeriodId, string][] = [['hoy', 'Día'], ['semana', 'Semana'], ['mes', 'Mes'], ['rango', 'Rango']];
type Series = 'ventas' | 'gastos' | 'utilidad';
const SERIES: [Series, string][] = [['ventas', 'Ventas'], ['gastos', 'Gastos'], ['utilidad', 'Utilidad']];

const COLORS: Record<Series, (v: number) => string> = {
  ventas: () => 'var(--sky-deep)',
  gastos: () => 'var(--pink-deep)',
  utilidad: (v) => (v >= 0 ? 'var(--sky-deep)' : 'var(--pink-deep)'),
};

const fmt = (k?: string, year = false) =>
  k ? parseKey(k).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', ...(year ? { year: 'numeric' } : {}) }) : '';

export function Reports() {
  const [period, setPeriod] = useState<PeriodId>('semana');
  const [anchor, setAnchor] = useState(dateKey());
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [series, setSeries] = useState<Series>('ventas');

  const range = resolvePeriod(period, { from, to }, parseKey(anchor));
  const entries = useLiveQuery(
    () => (range.valid ? loadEntries(range) : Promise.resolve([] as Entry[])),
    [range.valid, range.from, range.to]
  );
  const report = range.valid && range.from && range.to ? buildReport(entries ?? [], range.from, range.to) : null;
  const profits = productProfit(entries ?? []);

  const shift = (dir: 1 | -1) =>
    setAnchor((a) => (period === 'hoy' ? addDaysKey(a, dir) : period === 'semana' ? addDaysKey(a, 7 * dir) : addMonthsKey(a, dir)));

  const title =
    period === 'hoy' ? parseKey(anchor).toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' })
    : period === 'semana' ? `${fmt(range.from)} – ${fmt(range.to)}`
    : period === 'mes' ? parseKey(anchor).toLocaleDateString('es-MX', { month: 'long', year: 'numeric' })
    : range.valid ? `${fmt(range.from, true)} – ${fmt(range.to, true)}` : 'Elige las fechas';

  return (
    <>
      <h1>Reportes</h1>

      <div className="chips" style={{ marginTop: 14 }}>
        {PERIODS.map(([id, label]) => (
          <button key={id} className={`chip ${period === id ? 'on' : ''}`} onClick={() => setPeriod(id)}>{label}</button>
        ))}
      </div>

      {period !== 'rango' ? (
        <div className="day-nav" style={{ marginTop: 14 }}>
          <button className="mini" onClick={() => shift(-1)} aria-label="Periodo anterior">‹ Anterior</button>
          <b className="day-title">{title}</b>
          <button className="mini" onClick={() => shift(1)} aria-label="Periodo siguiente">Siguiente ›</button>
        </div>
      ) : (
        <div className="filters-grid" style={{ marginTop: 14 }}>
          <div className="field"><label>Desde</label>
            <input className="input" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div className="field"><label>Hasta</label>
            <input className="input" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
        </div>
      )}
      {period === 'rango' && !range.valid && <p className="empty">Elige una fecha inicial y una final (la inicial no puede ser posterior).</p>}

      {report && (
        <>
          <section className="stats5">
            <div className="card stat ventas"><small>💰 Ventas totales</small><b>{money(report.ventas)}</b></div>
            <div className="card stat gastos"><small>💸 Gastos totales</small><b>{money(report.gastos)}</b></div>
            <div className="card stat util"><small>📈 Utilidad</small><b>{money(report.utilidad)}</b></div>
            <div className="card stat"><small>🧾 Ventas realizadas</small><b>{report.ventasCount}</b></div>
            <div className="card stat wide"><small>🎟️ Ticket promedio</small><b>{money(report.ticketPromedio)}</b></div>
          </section>

          <div className="card" style={{ marginTop: 14 }}>
            <h2>{series === 'utilidad' ? 'Utilidad' : series === 'ventas' ? 'Ventas' : 'Gastos'} por {report.granularity === 'hora' ? 'hora' : report.granularity === 'mes' ? 'mes' : 'día'}</h2>
            <div className="chips">
              {SERIES.map(([id, label]) => (
                <button key={id} className={`chip ${series === id ? 'on' : ''}`} onClick={() => setSeries(id)}>{label}</button>
              ))}
            </div>
            <BarChart
              key={`${series}-${range.from}-${range.to}`}
              data={report.buckets.map((b) => ({ key: b.key, label: b.label, value: b[series] }))}
              color={COLORS[series]}
            />
            <p className="empty" style={{ marginBottom: 0 }}>Utilidad = ventas − gastos registrados (flujo de efectivo).</p>
          </div>

          {profits.length > 0 && (
            <div className="card" style={{ marginTop: 14 }}>
              <h2>Utilidad estimada por producto</h2>
              <p className="empty" style={{ marginTop: 0 }}>
                Precio de venta − costo del producto. Es una estimación distinta de la utilidad de flujo de efectivo y no incluye otros gastos.
              </p>
              <ul className="ops">
                {profits.map((pr) => (
                  <li key={pr.productId}>
                    <div>
                      {pr.name}
                      <small>{pr.units} {pr.units === 1 ? 'unidad' : 'unidades'} · ingresos {money(pr.ingresos)} · costo {money(pr.costo)}</small>
                    </div>
                    <b className={pr.utilidad >= 0 ? 'pos' : 'neg'}>{money(pr.utilidad)}</b>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}
    </>
  );
}
