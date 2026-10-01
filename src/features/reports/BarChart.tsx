import { useState } from 'react';
import { money } from '../../lib/money';

export interface Point { key: string; label: string; value: number }

// Gráfico de barras sencillo (sin librerías). Soporta valores negativos (utilidad).
export function BarChart({ data, color }: { data: Point[]; color: (v: number) => string }) {
  const [picked, setPicked] = useState<string | null>(null);

  const maxPos = Math.max(0, ...data.map((d) => d.value));
  const maxNeg = Math.max(0, ...data.map((d) => -d.value));
  const span = maxPos + maxNeg;
  if (span === 0) return <p className="empty">Sin operaciones en este periodo.</p>;

  const zero = (maxNeg / span) * 100; // posición de la línea base, en % desde abajo
  const every = data.length > 14 ? Math.ceil(data.length / 7) : 1;
  const cols = { gridTemplateColumns: `repeat(${data.length}, 1fr)` };
  const sel = data.find((d) => d.key === picked);

  return (
    <>
      <div className="chart" style={cols}>
        <div className="chart-zero" style={{ bottom: `${zero}%` }} />
        {data.map((d) => {
          const h = (Math.abs(d.value) / span) * 100;
          const place = d.value >= 0 ? { bottom: `${zero}%` } : { top: `${100 - zero}%` };
          return (
            <button
              key={d.key}
              className={`bar-col ${picked === d.key ? 'picked' : ''}`}
              onClick={() => setPicked(picked === d.key ? null : d.key)}
              aria-label={`${d.label}: ${money(d.value)}`}
            >
              <span className="bar" style={{ background: color(d.value), height: `${h}%`, minHeight: d.value !== 0 ? 3 : 0, ...place }} />
            </button>
          );
        })}
      </div>
      <div className="chart-labels" style={cols}>
        {data.map((d, i) => <span key={d.key}>{i % every === 0 ? d.label : ''}</span>)}
      </div>
      <p className="chart-info">{sel ? `${sel.label}: ${money(sel.value)}` : 'Toca una barra para ver el monto'}</p>
    </>
  );
}
