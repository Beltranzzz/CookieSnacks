import { useEffect, useState } from 'react';
import { createBackup, parseBackup, restoreBackup, type BackupFile } from '../../data/backup';
import { expensesRepo, paymentMethodInUse, productsRepo } from '../../data/repositories';
import { BACKGROUNDS, CURRENCIES } from '../../domain/settings';
import { saveFile } from '../../export/saveFile';
import { dateKey } from '../../lib/dates';
import { SyncSection } from '../sync/SyncSection';
import { useSettings } from './SettingsContext';

type Result = Promise<string | undefined | void>;
interface Item { key: string; label: string }

const slug = (s: string) =>
  s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

function Row({ label, onRename, onRemove }: { label: string; onRename: (v: string) => void; onRemove: () => void }) {
  const [v, setV] = useState(label);
  useEffect(() => { setV(label); }, [label]);
  const commit = () => {
    const t = v.trim();
    if (t && t !== label) onRename(t); else setV(label);
  };
  return (
    <div className="edit-row">
      <input className="input" value={v} onChange={(e) => setV(e.target.value)} onBlur={commit}
        onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }} />
      <button className="mini danger" onClick={onRemove} aria-label={`Quitar ${label}`}>🗑️</button>
    </div>
  );
}

function EditableList(props: {
  title: string; hint?: string; placeholder: string; items: Item[];
  onRename: (key: string, label: string) => Result;
  onRemove: (key: string) => Result;
  onAdd: (label: string) => Result;
}) {
  const [newLabel, setNewLabel] = useState('');
  const [msg, setMsg] = useState('');
  const run = async (p: Result) => { const r = await p; setMsg(typeof r === 'string' ? r : ''); return r; };

  const add = async () => {
    const t = newLabel.trim();
    if (!t) return;
    const r = await run(props.onAdd(t));
    if (typeof r !== 'string') setNewLabel('');
  };

  return (
    <div className="card" style={{ marginTop: 14 }}>
      <h2>{props.title}</h2>
      {props.hint && <p className="empty" style={{ marginTop: 0 }}>{props.hint}</p>}
      {props.items.map((i) => (
        <Row key={i.key} label={i.label}
          onRename={(v) => { void run(props.onRename(i.key, v)); }}
          onRemove={() => { void run(props.onRemove(i.key)); }} />
      ))}
      <div className="edit-row">
        <input className="input" placeholder={props.placeholder} value={newLabel} onChange={(e) => setNewLabel(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') void add(); }} />
        <button className="mini" onClick={() => void add()}>Agregar</button>
      </div>
      {msg && <div className="toast error">{msg}</div>}
    </div>
  );
}

export function SettingsPage() {
  const { settings, save } = useSettings();
  const [name, setName] = useState(settings.businessName);
  const [pending, setPending] = useState<BackupFile | null>(null);
  const [confirmReplace, setConfirmReplace] = useState(false);
  const [backupMsg, setBackupMsg] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => { setName(settings.businessName); }, [settings.businessName]);

  const commitName = async () => {
    const t = name.trim();
    if (t && t !== settings.businessName) await save({ businessName: t }); else setName(settings.businessName);
  };

  // --- Métodos de pago ---
  const pms = settings.paymentMethods;
  const pmDup = (l: string) => pms.some((m) => m.label.toLowerCase() === l.toLowerCase());
  const paymentList = {
    items: pms.map((m) => ({ key: m.id, label: m.label })),
    onAdd: async (label: string): Result => {
      if (pmDup(label)) return 'Ese método de pago ya existe.';
      const base = slug(label) || 'metodo';
      let id = base; let n = 2;
      while (pms.some((m) => m.id === id)) id = `${base}-${n++}`;
      await save({ paymentMethods: [...pms, { id, label }] });
    },
    onRename: async (id: string, label: string): Result => {
      if (pms.some((m) => m.id !== id && m.label.toLowerCase() === label.toLowerCase())) return 'Ese método de pago ya existe.';
      await save({ paymentMethods: pms.map((m) => (m.id === id ? { ...m, label } : m)) });
    },
    onRemove: async (id: string): Result => {
      if (id === 'efectivo') return 'Efectivo es el método predeterminado; puedes cambiarle el nombre, pero no quitarlo.';
      if (await paymentMethodInUse(id)) return 'Ese método ya se usó en registros; mejor cámbiale el nombre.';
      await save({ paymentMethods: pms.filter((m) => m.id !== id) });
    },
  };

  // --- Categorías (gastos y productos) ---
  const categoryList = (field: 'expenseCategories' | 'productCategories', renameRecords: (o: string, n: string) => Promise<unknown>) => {
    const list = settings[field];
    const patch = (l: string[]) => (field === 'expenseCategories' ? { expenseCategories: l } : { productCategories: l });
    const dup = (l: string) => list.some((x) => x.toLowerCase() === l.toLowerCase());
    return {
      items: list.map((c) => ({ key: c, label: c })),
      onAdd: async (label: string): Result => {
        if (dup(label)) return 'Esa categoría ya existe.';
        await save(patch([...list, label]));
      },
      onRename: async (old: string, label: string): Result => {
        if (label.toLowerCase() !== old.toLowerCase() && dup(label)) return 'Esa categoría ya existe.';
        await renameRecords(old, label);
        await save(patch(list.map((c) => (c === old ? label : c))));
      },
      onRemove: async (c: string): Result => {
        if (list.length <= 1) return 'Debe quedar al menos una categoría.';
        await save(patch(list.filter((x) => x !== c)));
      },
    };
  };

  // --- Copias de seguridad ---
  async function download() {
    setBackupMsg(null);
    try {
      const backup = await createBackup();
      await saveFile(JSON.stringify(backup), `CookieSnacks_copia_${dateKey()}.json`, 'application/json');
      await save({ lastBackupAt: new Date().toISOString() });
      setBackupMsg({ ok: true, text: '✓ Copia de seguridad generada' });
    } catch (e) {
      setBackupMsg({ ok: false, text: `No se pudo crear la copia: ${e instanceof Error ? e.message : 'error desconocido'}` });
    }
  }

  async function onFile(input: HTMLInputElement) {
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    setBackupMsg(null);
    setConfirmReplace(false);
    try { setPending(parseBackup(await file.text())); }
    catch (e) { setPending(null); setBackupMsg({ ok: false, text: e instanceof Error ? e.message : 'No se pudo leer el archivo.' }); }
  }

  async function restore(mode: 'merge' | 'replace') {
    if (!pending) return;
    try {
      await restoreBackup(pending, mode);
      setBackupMsg({ ok: true, text: mode === 'replace' ? '✓ Copia restaurada (datos reemplazados)' : '✓ Copia combinada con tus datos' });
      setPending(null);
      setConfirmReplace(false);
    } catch (e) {
      setBackupMsg({ ok: false, text: `No se pudo restaurar: ${e instanceof Error ? e.message : 'error desconocido'}` });
    }
  }

  return (
    <>
      <h1>Configuración</h1>

      <div className="card" style={{ marginTop: 14 }}>
        <h2>Negocio</h2>
        <div className="field">
          <label>Nombre del negocio</label>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} onBlur={() => void commitName()}
            onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }} />
        </div>
        <div className="field">
          <label>Moneda</label>
          <div className="chips">
            {CURRENCIES.map((c) => (
              <button key={c.code} className={`chip ${settings.currency === c.code ? 'on' : ''}`} onClick={() => void save({ currency: c.code })}>{c.label}</button>
            ))}
          </div>
          <small className="meta">Solo cambia el formato; no convierte los montos ya registrados.</small>
        </div>
      </div>

      <div className="card" style={{ marginTop: 14 }}>
        <ul className="more-list">
          <li><a href="#/productos"><span>🧁 Productos</span><span>›</span></a></li>
          <li><a href="#/exportar"><span>📤 Exportar a Excel</span><span>›</span></a></li>
        </ul>
      </div>

      <EditableList title="Métodos de pago" placeholder="Nuevo método (ej. Vales)" {...paymentList} />
      <EditableList title="Categorías de gasto" placeholder="Nueva categoría"
        hint="Al cambiar un nombre se actualizan también los gastos anteriores. Quitar una categoría no borra registros."
        {...categoryList('expenseCategories', expensesRepo.renameCategory)} />
      <EditableList title="Categorías de producto" placeholder="Nueva categoría"
        {...categoryList('productCategories', productsRepo.renameCategory)} />

      <div className="card" style={{ marginTop: 14 }}>
        <h2>Preferencias visuales</h2>
        <div className="field">
          <label>Color de fondo</label>
          <div className="chips">
            {BACKGROUNDS.map((b) => (
              <button key={b.id} className={`chip ${settings.background === b.id ? 'on' : ''}`} onClick={() => void save({ background: b.id })}>
                <i className="swatch" style={{ background: b.value }} /> {b.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <SyncSection />

      <div className="card" style={{ marginTop: 14 }}>
        <h2>Copias de seguridad</h2>
        <p className="empty" style={{ marginTop: 0 }}>
          Descarga una copia de vez en cuando como respaldo extra. Si no usas la sincronización, tus datos viven solo en este dispositivo y esta copia sirve también para pasarlos del iPhone a la Mac (o al revés).
        </p>
        {settings.lastBackupAt && (
          <p className="meta">Última copia: {new Date(settings.lastBackupAt).toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short' })}</p>
        )}
        <div className="quick">
          <button className="big venta" onClick={() => void download()}>📥 Descargar copia</button>
          <label className="big gasto file-btn" style={{ justifyContent: 'center' }}>
            📤 Restaurar copia
            <input type="file" accept=".json,application/json" hidden onChange={(e) => void onFile(e.target)} />
          </label>
        </div>

        {pending && (
          <div className="card restore-box">
            <b>Copia encontrada</b>
            <small className="meta">
              {new Date(pending.exportedAt).toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short' })} ·{' '}
              {pending.data.sales.length} ventas · {pending.data.expenses.length} gastos · {pending.data.products.length} productos
            </small>
            {!confirmReplace ? (
              <div className="quick" style={{ marginTop: 10 }}>
                <button className="save" onClick={() => void restore('merge')}>COMBINAR CON MIS DATOS</button>
                <button className="mini danger" onClick={() => setConfirmReplace(true)}>Reemplazar todo…</button>
                <button className="mini" onClick={() => setPending(null)}>Cancelar</button>
              </div>
            ) : (
              <div className="quick" style={{ marginTop: 10 }}>
                <p className="empty" style={{ margin: 0 }}>Se borrarán las ventas, gastos y productos actuales y quedará solo lo de la copia. Esta acción no se puede deshacer.</p>
                <button className="save danger-btn" onClick={() => void restore('replace')}>SÍ, REEMPLAZAR TODO</button>
                <button className="mini" onClick={() => setConfirmReplace(false)}>No, volver</button>
              </div>
            )}
          </div>
        )}
        {backupMsg && <div className={`toast ${backupMsg.ok ? '' : 'error'}`} style={{ marginTop: 12 }}>{backupMsg.text}</div>}
      </div>
    </>
  );
}
