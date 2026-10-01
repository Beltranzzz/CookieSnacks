import { useEffect, useState } from 'react';
import { Calendar } from '../features/calendar/Calendar';
import { Dashboard } from '../features/dashboard/Dashboard';
import { ExportPage } from '../features/export/ExportPage';
import { History } from '../features/history/History';
import { Products } from '../features/products/Products';
import { EntryModal } from '../features/quick-entry/EntryModal';
import { Reports } from '../features/reports/Reports';
import { SettingsContext, useSettingsState } from '../features/settings/SettingsContext';
import { SyncContext, useSyncState } from '../features/sync/SyncContext';
import { SettingsPage } from '../features/settings/SettingsPage';

const TABS = [
  { hash: '#/', icon: '🏠', label: 'Inicio' },
  { hash: '#/registrar', icon: '➕', label: 'Registrar' },
  { hash: '#/calendario', icon: '📅', label: 'Calendario' },
  { hash: '#/reportes', icon: '📊', label: 'Reportes' },
  { hash: '#/mas', icon: '⚙️', label: 'Más' },
];

// Pantallas que viven dentro de "Más"
const MORE_SECTIONS = ['#/registro', '#/productos', '#/exportar', '#/configuracion'];

function useHash() {
  const [hash, setHash] = useState(window.location.hash || '#/');
  useEffect(() => {
    const on = () => setHash(window.location.hash || '#/');
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  return hash;
}

function More() {
  return (
    <>
      <h1>Más</h1>
      <div className="card" style={{ marginTop: 14 }}>
        <ul className="more-list">
          <li><a href="#/registro"><span>📋 Registro</span><span>›</span></a></li>
          <li><a href="#/productos"><span>🧁 Productos</span><span>›</span></a></li>
          <li><a href="#/exportar"><span>📤 Exportar</span><span>›</span></a></li>
          <li><a href="#/configuracion"><span>🎨 Configuración</span><span>›</span></a></li>
        </ul>
      </div>
    </>
  );
}

export function App() {
  const hash = useHash();
  const settingsCtx = useSettingsState(); // aplica la configuración antes de pintar el resto
  const syncCtx = useSyncState(); // sesión y sincronización con la nube
  const go = (h: string) => { window.location.hash = h; };

  // Rutas directas para Atajos de Apple: #/registrar/venta y #/registrar/gasto
  const kind = hash === '#/registrar/venta' ? 'venta' : hash === '#/registrar/gasto' ? 'gasto' : null;
  const chooser = hash === '#/registrar';
  const section = kind || chooser ? '#/' : hash;
  const active = chooser ? '#/registrar' : MORE_SECTIONS.includes(section) ? '#/mas' : section;

  return (
    <SettingsContext.Provider value={settingsCtx}>
      <SyncContext.Provider value={syncCtx}>
      <div className="shell">
        <nav className="nav">
          <div className="brand">🍪 {settingsCtx.settings.businessName}</div>
          {TABS.map((t) => (
            <a key={t.hash} href={t.hash} className={t.hash === active ? 'on' : ''}>
              <span>{t.icon}</span>{t.label}
            </a>
          ))}
        </nav>

        <main className="main">
          {section === '#/' ? <Dashboard onNew={(k) => go(`#/registrar/${k}`)} />
            : section === '#/calendario' ? <Calendar />
            : section === '#/reportes' ? <Reports />
            : section === '#/registro' ? <History />
            : section === '#/productos' ? <Products />
            : section === '#/exportar' ? <ExportPage />
            : section === '#/configuracion' ? <SettingsPage />
            : section === '#/mas' ? <More />
            : (
              <div className="card"><h2>Página no encontrada</h2><p className="empty">Regresa a Inicio desde el menú.</p></div>
            )}
        </main>

        {chooser && (
          <div className="overlay" onClick={() => go('#/')}>
            <div className="sheet" onClick={(e) => e.stopPropagation()}>
              <header><h2>¿Qué vas a registrar?</h2><button className="x" onClick={() => go('#/')} aria-label="Cerrar">✕</button></header>
              <div className="quick">
                <button className="big venta" onClick={() => go('#/registrar/venta')}>🛍️ Venta</button>
                <button className="big gasto" onClick={() => go('#/registrar/gasto')}>💸 Gasto</button>
              </div>
            </div>
          </div>
        )}
        {kind && <EntryModal key={kind} kind={kind} onClose={() => go('#/')} />}
      </div>
      </SyncContext.Provider>
    </SettingsContext.Provider>
  );
}
