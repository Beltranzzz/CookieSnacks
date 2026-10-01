import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { CATEGORY_EMOJI } from '../../config/constants';
import { productsRepo } from '../../data/repositories';
import type { Product } from '../../domain/models';
import { setProductActive } from '../../domain/services/products';
import { money } from '../../lib/money';
import { ProductModal } from './ProductModal';

export function Products() {
  const products = useLiveQuery(() => productsRepo.all(), []);
  const [editing, setEditing] = useState<Product | 'new' | null>(null);

  const list = [...(products ?? [])].sort(
    (a, b) => Number(b.active) - Number(a.active) || a.name.localeCompare(b.name, 'es')
  );

  return (
    <>
      <div className="prod-top">
        <h1>Productos</h1>
        <button className="prod-add" onClick={() => setEditing('new')}>＋ Nuevo</button>
      </div>

      {list.length === 0 ? (
        <div className="card">
          <p className="empty">Aún no tienes productos. Crea el primero (por ejemplo, Cookie Oreo) y al registrar una venta el precio se llenará solo.</p>
        </div>
      ) : (
        <div className="prod-list">
          {list.map((p) => {
            const margin = p.price - p.cost;
            const pct = p.price > 0 ? Math.round((margin / p.price) * 100) : 0;
            return (
              <div className={`card prod ${p.active ? '' : 'off'}`} key={p.id}>
                <div className="thumb">{p.image ? <img src={p.image} alt="" /> : CATEGORY_EMOJI[p.category] ?? '🧁'}</div>
                <div className="prod-body">
                  <b>{p.name}</b>{!p.active && <span className="tag">Inactivo</span>}
                  <small className="meta">{p.category}</small>
                  <small className="meta">Precio {money(p.price)} · Costo {money(p.cost)}</small>
                  <small className={`meta ${margin >= 0 ? 'pos' : 'neg'}`}>Utilidad estimada {money(margin)} ({pct}%)</small>
                  <div className="entry-actions">
                    <button className="mini" onClick={() => setEditing(p)}>✏️ Editar</button>
                    <button className="mini" onClick={() => setProductActive(p.id, !p.active)}>{p.active ? 'Desactivar' : 'Activar'}</button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {editing && (
        <ProductModal key={editing === 'new' ? 'new' : editing.id} product={editing === 'new' ? undefined : editing} onClose={() => setEditing(null)} />
      )}
    </>
  );
}
