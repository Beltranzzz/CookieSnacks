import { useState } from 'react';
import { PRODUCT_CATEGORIES } from '../../config/constants';
import type { Product } from '../../domain/models';
import { createProduct, updateProduct } from '../../domain/services/products';
import { resizeImage } from '../../lib/image';
import { money, toCents } from '../../lib/money';

export function ProductModal({ product, onClose }: { product?: Product; onClose: () => void }) {
  const [name, setName] = useState(product?.name ?? '');
  const [category, setCategory] = useState(product?.category ?? PRODUCT_CATEGORIES[0]);
  const [price, setPrice] = useState(product ? String(product.price / 100) : '');
  const [cost, setCost] = useState(product ? String(product.cost / 100) : '');
  const [image, setImage] = useState<string | undefined>(product?.image);
  const [active, setActive] = useState(product?.active ?? true);
  const [error, setError] = useState('');

  const p = Number(price);
  const c = Number(cost) || 0;
  const valid = name.trim() !== '' && p > 0 && c >= 0;
  const margin = p > 0 ? toCents(p - c) : 0;

  async function pickImage(file?: File) {
    if (!file) return;
    try { setImage(await resizeImage(file)); } catch { setError('No se pudo cargar la foto. Prueba con otra imagen.'); }
  }

  async function save() {
    if (!valid) return;
    setError('');
    try {
      const input = { name, category, price: p, cost: c, image, active };
      if (product) await updateProduct(product.id, input);
      else await createProduct(input);
      onClose();
    } catch (e) {
      setError(`No se pudo guardar: ${e instanceof Error ? e.message : 'error desconocido'}`);
    }
  }

  return (
    <div className="overlay" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()} role="dialog" aria-label={product ? 'Editar producto' : 'Nuevo producto'}>
        <header>
          <h2>🧁 {product ? 'Editar producto' : 'Nuevo producto'}</h2>
          <button className="x" onClick={onClose} aria-label="Cerrar">✕</button>
        </header>

        {error && <div className="toast error">{error}</div>}

        <div className="field">
          <label>Nombre</label>
          <input autoFocus className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej. Cookie Oreo" />
        </div>

        <div className="field">
          <label>Categoría</label>
          <div className="chips">
            {PRODUCT_CATEGORIES.map((c2) => (
              <button key={c2} className={`chip ${c2 === category ? 'on' : ''}`} onClick={() => setCategory(c2)}>{c2}</button>
            ))}
          </div>
        </div>

        <div className="filters-grid">
          <div className="field">
            <label>Precio de venta ($)</label>
            <input className="input" type="number" inputMode="decimal" min="0" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="0" />
          </div>
          <div className="field">
            <label>Costo ($)</label>
            <input className="input" type="number" inputMode="decimal" min="0" value={cost} onChange={(e) => setCost(e.target.value)} placeholder="0" />
          </div>
        </div>

        {p > 0 && (
          <div className="total">
            <span>Utilidad estimada por pieza</span>
            <b className={margin >= 0 ? 'pos' : 'neg'}>{money(margin)}</b>
          </div>
        )}

        <div className="field">
          <label>Foto (opcional)</label>
          <div className="photo-row">
            <div className="thumb">{image ? <img src={image} alt="" /> : '📷'}</div>
            <label className="mini file-btn">
              {image ? 'Cambiar foto' : 'Agregar foto'}
              <input type="file" accept="image/*" hidden onChange={(e) => pickImage(e.target.files?.[0])} />
            </label>
            {image && <button className="mini danger" onClick={() => setImage(undefined)}>Quitar</button>}
          </div>
        </div>

        <div className="field">
          <label>Estado</label>
          <div className="chips">
            <button className={`chip ${active ? 'on' : ''}`} onClick={() => setActive(true)}>Activo</button>
            <button className={`chip ${!active ? 'on' : ''}`} onClick={() => setActive(false)}>Inactivo</button>
          </div>
        </div>

        <button className="save" disabled={!valid} onClick={save}>{product ? 'GUARDAR CAMBIOS' : 'GUARDAR PRODUCTO'}</button>
      </div>
    </div>
  );
}
