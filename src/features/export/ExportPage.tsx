import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { sumTotals } from '../../domain/calculations';
import type { Entry } from '../../domain/entry';
import { resolvePeriod, type PeriodId } from '../../domain/periods';
import { loadEntries } from '../../domain/services/ledgerQuery';
import { buildWorkbook } from '../../export/buildWorkbook';
import { saveWorkbook } from '../../export/saveFile';
import { dateKey } from '../../lib/dates';
import { money } from '../../lib/money';

const PERIODS: [PeriodId, string][] = [
  ['hoy', 'Hoy'], ['semana', 'Esta semana'], ['mes', 'Este mes'], ['rango', 'Rango personalizado'], ['todo', 'Todo'],
];

export function ExportPage() {
  const [period, setPeriod] = useState<PeriodId>('mes');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const range = resolvePeriod(period, { from, to });
  const entries = useLiveQuery(
    () => (range.valid ? loadEntries(range) : Promise.resolve([] as Entry[])),
    [range.valid, range.from, range.to]
  );

  const list = entries ?? [];
  const ventas = sumTotals(list.filter((e) => e.kind === 'venta'));
  const gastos = sumTotals(list.filter((e) => e.kind === 'gasto'));
  const canExport = range.valid && list.length > 0 && !busy;

  async function exportNow() {
    if (!canExport) return;
    setBusy(true);
    setMsg(null);
    try {
      const label = range.from && range.to ? `${range.label} (${range.from} a ${range.to})` : range.label;
      await saveWorkbook(buildWorkbook(list, label), `CookieSnacks_${period}_${dateKey()}.xlsx`);
      setMsg({ ok: true, text: '✓ Archivo de Excel generado' });
    } catch (e) {
      setMsg({ ok: false, text: `No se pudo exportar: ${e instanceof Error ? e.message : 'error desconocido'}` });
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <h1>Exportar</h1>
      <p className="date">Genera un archivo de Excel (.xlsx) con tus operaciones y un resumen.</p>

      <div className="card">
        <h2>Periodo</h2>
        <div className="chips">
          {PERIODS.map(([id, label]) => (
            <button key={id} className={`chip ${period === id ? 'on' : ''}`} onClick={() => setPeriod(id)}>{label}</button>
          ))}
        </div>

        {period === 'rango' && (
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
      </div>

      <div className="card" style={{ marginTop: 14 }}>
        <h2>Se exportará</h2>
        {range.valid && (
          <ul className="insights">
            <li><b>{list.length}</b> {list.length === 1 ? 'operación' : 'operaciones'}</li>
            <li>Ventas <b className="pos">{money(ventas)}</b> · Gastos <b className="neg">{money(gastos)}</b></li>
            <li>Utilidad (ventas - gastos): <b>{money(ventas - gastos)}</b></li>
          </ul>
        )}
        {range.valid && list.length === 0 && <p className="empty">No hay operaciones en este periodo.</p>}
      </div>

      {msg && <div className={`toast ${msg.ok ? '' : 'error'}`} style={{ marginTop: 14 }}>{msg.text}</div>}

      <button className="save" style={{ marginTop: 14 }} disabled={!canExport} onClick={exportNow}>
        {busy ? 'GENERANDO...' : '📤 EXPORTAR A EXCEL'}
      </button>
    </>
  );
}
