import { useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { EXPENSE_CATEGORIES, PAYMENT_METHODS } from '../../config/constants';
import { sumTotals } from '../../domain/calculations';
import { toEntries, type Entry } from '../../domain/entry';
import { deleteEntry } from '../../domain/services/ledger';
import { expensesRepo, salesRepo } from '../../data/repositories';
import { EntryModal } from '../quick-entry/EntryModal';
import { timeLabel } from '../../lib/dates';
import { money } from '../../lib/money';

type TypeFilter = 'todo' | 'venta' | 'gasto';

const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

export function History() {
  const [search, setSearch] = useState('');
  const [type, setType] = useState<TypeFilter>('todo');
  const [pay, setPay] = useState('todas');
  const [category, setCategory] = useState('todas');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [editing, setEditing] = useState<Entry | null>(null);
  const [deleting, setDeleting] = useState<Entry | null>(null);

  const data = useLiveQuery(async () => ({ sales: await salesRepo.all(), expenses: await expensesRepo.all() }), []);
  const all = useMemo(() => toEntries(data?.sales ?? [], data?.expenses ?? []), [data]);

  const q = norm(search.trim());
  const shown = all.filter((e) => {
    if (type !== 'todo' && e.kind !== type) return false;
    if (pay !== 'todas' && e.paymentMethod !== pay) return false;
    if (category !== 'todas' && !(e.kind === 'gasto' && e.category === category)) return false;
    if (from && e.dateKey < from) return false;
    if (to && e.dateKey > to) return false;
    if (q && !norm(`${e.concept} ${e.notes ?? ''} ${e.kind === 'gasto' ? e.category : ''}`).includes(q)) return false;
    return true;
  });

  const ventas = sumTotals(shown.filter((e) => e.kind === 'venta'));
  const gastos = sumTotals(shown.filter((e) => e.kind === 'gasto'));
  const filtering = search !== '' || type !== 'todo' || pay !== 'todas' || category !== 'todas' || from !== '' || to !== '';

  const clear = () => { setSearch(''); setType('todo'); setPay('todas'); setCategory('todas'); setFrom(''); setTo(''); };

  async function confirmDelete() {
    if (!deleting) return;
    await deleteEntry(deleting.kind, deleting.id);
    setDeleting(null);
  }

  return (
    <>
      <h1>Registro</h1>

      <div className="toolbar">
        <input className="input" type="search" placeholder="Buscar (ej. chocolate)" value={search} onChange={(e) => setSearch(e.target.value)} />
        <div className="chips">
          {([['todo', 'Todo'], ['venta', 'Ventas'], ['gasto', 'Gastos']] as const).map(([id, label]) => (
            <button key={id} className={`chip ${type === id ? 'on' : ''}`} onClick={() => setType(id)}>{label}</button>
          ))}
        </div>
        <details>
          <summary>Más filtros</summary>
          <div className="filters-grid">
            <div className="field"><label>Método de pago</label>
              <select className="input" value={pay} onChange={(e) => setPay(e.target.value)}>
                <option value="todas">Todos</option>
                {PAYMENT_METHODS.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
              </select>
            </div>
            <div className="field"><label>Categoría (gastos)</label>
              <select className="input" value={category} onChange={(e) => setCategory(e.target.value)}>
                <option value="todas">Todas</option>
                {EXPENSE_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="field"><label>Desde</label>
              <input className="input" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
            </div>
            <div className="field"><label>Hasta</label>
              <input className="input" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
            </div>
          </div>
        </details>
        {filtering && <button className="mini" onClick={clear}>Limpiar filtros</button>}
      </div>

      <p className="summary">
        {shown.length} {shown.length === 1 ? 'operación' : 'operaciones'} · Ventas <b className="pos">{money(ventas)}</b> · Gastos <b className="neg">{money(gastos)}</b>
      </p>

      {shown.length === 0 ? (
        <div className="card"><p className="empty">{all.length === 0 ? 'Aún no hay registros. Registra tu primera venta o gasto desde Inicio.' : 'No hay resultados con estos filtros.'}</p></div>
      ) : (
        <div className="list">
          {shown.map((e) => {
            const method = PAYMENT_METHODS.find((m) => m.id === e.paymentMethod)?.label ?? e.paymentMethod;
            const date = new Date(e.occurredAt).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' });
            return (
              <div className="card" key={`${e.kind}-${e.id}`}>
                <div className="entry">
                  <div>
                    {e.kind === 'venta' ? '🍪' : '📦'} <b>{e.kind === 'venta' && e.quantity > 1 ? `${e.quantity} × ` : ''}{e.concept}</b>
                    <small className="meta">
                      {e.kind === 'venta' ? 'Venta' : `Gasto · ${e.category}`} · {date} · {timeLabel(e.occurredAt)} · {method}
                    </small>
                    {e.notes && <small className="meta">📝 {e.notes}</small>}
                  </div>
                  <span className={`amt ${e.kind === 'venta' ? 'pos' : 'neg'}`}>{e.kind === 'venta' ? '+' : '-'}{money(e.total)}</span>
                </div>
                <div className="entry-actions">
                  <button className="mini" onClick={() => setEditing(e)}>✏️ Editar</button>
                  <button className="mini danger" onClick={() => setDeleting(e)}>🗑️ Eliminar</button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {editing && <EntryModal key={editing.id} kind={editing.kind} editing={editing} onClose={() => setEditing(null)} />}

      {deleting && (
        <div className="overlay" onClick={() => setDeleting(null)}>
          <div className="sheet" onClick={(ev) => ev.stopPropagation()} role="alertdialog" aria-label="Confirmar eliminación">
            <header><h2>¿Eliminar este registro?</h2></header>
            <p className="empty">{deleting.concept} · {money(deleting.total)}. Esta acción no se puede deshacer.</p>
            <div className="quick">
              <button className="save danger-btn" onClick={confirmDelete}>ELIMINAR</button>
              <button className="big cancel" onClick={() => setDeleting(null)}>Cancelar</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
