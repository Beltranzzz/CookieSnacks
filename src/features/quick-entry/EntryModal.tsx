import { useRef, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { CATEGORY_EMOJI, EXPENSE_CATEGORIES, PAYMENT_METHODS } from '../../config/constants';
import { productsRepo } from '../../data/repositories';
import type { Entry } from '../../domain/entry';
import type { PaymentMethod, Product } from '../../domain/models';
import { registerExpense, registerSale, updateExpense, updateSale } from '../../domain/services/ledger';
import { money, toCents } from '../../lib/money';

const pad = (n: number) => String(n).padStart(2, '0');
const toLocalInput = (iso: string) => {
  const d = new Date(iso);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

interface Props { kind: 'venta' | 'gasto'; editing?: Entry; onClose: () => void }

export function EntryModal({ kind, editing, onClose }: Props) {
  const isSale = kind === 'venta';
  const [concept, setConcept] = useState(editing?.concept ?? '');
  const [qty, setQty] = useState(editing?.kind === 'venta' ? String(editing.quantity) : '1');
  const [price, setPrice] = useState(editing ? String((editing.kind === 'venta' ? editing.unitPrice : editing.total) / 100) : '');
  const [category, setCategory] = useState(editing?.kind === 'gasto' ? editing.category : EXPENSE_CATEGORIES[0]);
  const [pay, setPay] = useState<PaymentMethod>(editing?.paymentMethod ?? 'efectivo');
  const [notes, setNotes] = useState(editing?.notes ?? '');
  const [when, setWhen] = useState(editing ? toLocalInput(editing.occurredAt) : ''); // vacío = ahora
  const [product, setProduct] = useState<{ id: string; cost?: number } | null>(
    editing?.kind === 'venta' && editing.productId ? { id: editing.productId, cost: editing.unitCost } : null
  );
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const conceptRef = useRef<HTMLInputElement>(null);

  const products = useLiveQuery(() => productsRepo.all(), [])
    ?.filter((p) => p.active)
    .sort((a, b) => a.name.localeCompare(b.name, 'es'));

  const q = Number(qty);
  const p = Number(price);
  const total = isSale ? q * p : p;
  const valid = concept.trim() !== '' && p > 0 && (!isSale || q > 0);

  // Al elegir un producto se llenan concepto y precio; tocarlo de nuevo lo desvincula
  const pick = (prod: Product) => {
    if (product?.id === prod.id) { setProduct(null); return; }
    setConcept(prod.name);
    setPrice(String(prod.price / 100));
    setProduct({ id: prod.id, cost: prod.cost });
  };

  async function save() {
    if (!valid) return;
    setError('');
    try {
      const at = when ? new Date(when) : editing ? new Date(editing.occurredAt) : new Date();
      if (isSale) {
        const input = { concept, quantity: q, unitPrice: p, paymentMethod: pay, notes, at, productId: product?.id, unitCost: product?.cost };
        if (editing) await updateSale(editing.id, input);
        else await registerSale(input);
      } else {
        const input = { concept, category, amount: p, paymentMethod: pay, notes, at };
        if (editing) await updateExpense(editing.id, input);
        else await registerExpense(input);
      }
      if (editing) { onClose(); return; }
      setConcept(''); setQty('1'); setPrice(''); setNotes(''); setWhen(''); setProduct(null);
      setSaved(true);
      setTimeout(() => setSaved(false), 1800);
      conceptRef.current?.focus();
    } catch (e) {
      setError(`No se pudo guardar: ${e instanceof Error ? e.message : 'error desconocido'}`);
    }
  }

  const onEnter = (e: React.KeyboardEvent) => { if (e.key === 'Enter') save(); };
  const title = `${editing ? 'Editar' : 'Registrar'} ${isSale ? 'venta' : 'gasto'}`;

  return (
    <div className="overlay" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()} role="dialog" aria-label={title}>
        <header>
          <h2>{isSale ? '🛍️' : '💸'} {title}</h2>
          <button className="x" onClick={onClose} aria-label="Cerrar">✕</button>
        </header>

        {saved && <div className="toast">✓ {isSale ? 'Venta guardada' : 'Gasto guardado'}</div>}
        {error && <div className="toast error">{error}</div>}

        {isSale && products && products.length > 0 && (
          <div className="field">
            <label>Productos</label>
            <div className="picker">
              {products.map((prod) => (
                <button key={prod.id} className={`chip ${product?.id === prod.id ? 'on' : ''}`} onClick={() => pick(prod)}>
                  {CATEGORY_EMOJI[prod.category] ?? '🧁'} {prod.name} · {money(prod.price)}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="field">
          <label>{isSale ? '¿Qué vendiste?' : '¿En qué gastaste?'}</label>
          <input ref={conceptRef} autoFocus className="input" value={concept}
            onChange={(e) => { setConcept(e.target.value); setProduct(null); }}
            onKeyDown={onEnter} placeholder={isSale ? 'Ej. Cookies Oreo' : 'Ej. Compra de chocolate'} />
        </div>

        <div className="row">
          {isSale && (
            <div className="field">
              <label>Cantidad</label>
              <input className="input" type="number" inputMode="numeric" min="1" value={qty} onChange={(e) => setQty(e.target.value)} onKeyDown={onEnter} />
            </div>
          )}
          <div className="field" style={isSale ? undefined : { gridColumn: '1 / -1' }}>
            <label>{isSale ? 'Precio unitario ($)' : 'Monto ($)'}</label>
            <input className="input" type="number" inputMode="decimal" min="0" value={price} onChange={(e) => setPrice(e.target.value)} onKeyDown={onEnter} placeholder="0" />
          </div>
        </div>

        {!isSale && (
          <div className="field">
            <label>Categoría</label>
            <div className="chips">
              {EXPENSE_CATEGORIES.map((c) => (
                <button key={c} className={`chip ${c === category ? 'on' : ''}`} onClick={() => setCategory(c)}>{c}</button>
              ))}
            </div>
          </div>
        )}

        <div className="total"><span>Total</span><b>{money(toCents(isFinite(total) ? total : 0))}</b></div>

        <details>
          <summary>Más detalles (opcional)</summary>
          <div className="field">
            <label>Método de pago</label>
            <div className="chips">
              {PAYMENT_METHODS.map((m) => (
                <button key={m.id} className={`chip ${m.id === pay ? 'on' : ''}`} onClick={() => setPay(m.id)}>{m.label}</button>
              ))}
            </div>
          </div>
          <div className="field">
            <label>Fecha y hora (vacío = ahora)</label>
            <input className="input" type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} />
          </div>
          <div className="field">
            <label>Notas</label>
            <input className="input" value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
        </details>

        <button className="save" disabled={!valid} onClick={save}>
          {editing ? 'GUARDAR CAMBIOS' : isSale ? 'GUARDAR VENTA' : 'GUARDAR GASTO'}
        </button>
      </div>
    </div>
  );
}
