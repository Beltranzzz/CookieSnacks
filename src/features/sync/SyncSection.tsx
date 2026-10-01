import { useState } from 'react';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { firebase } from '../../sync/firebase';
import { useSync } from './SyncContext';

function authError(e: unknown) {
  switch ((e as { code?: string } | null)?.code) {
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found': return 'Correo o contraseña incorrectos.';
    case 'auth/email-already-in-use': return 'Ese correo ya tiene cuenta: usa "Iniciar sesión".';
    case 'auth/weak-password': return 'La contraseña debe tener al menos 6 caracteres.';
    case 'auth/invalid-email': return 'El correo no es válido.';
    case 'auth/network-request-failed': return 'Sin conexión a internet.';
    case 'auth/operation-not-allowed': return 'Activa "Correo electrónico/contraseña" en Firebase Authentication (ver SINCRONIZACION.md).';
    default: return e instanceof Error ? e.message : 'No se pudo completar la acción.';
  }
}

export function SyncSection() {
  const { configured, user, status, syncNow } = useSync();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function submit(mode: 'in' | 'up') {
    const f = firebase();
    if (!f) return;
    setBusy(true);
    setError('');
    try {
      if (mode === 'in') await signInWithEmailAndPassword(f.auth, email.trim(), password);
      else await createUserWithEmailAndPassword(f.auth, email.trim(), password);
      setPassword('');
    } catch (e) {
      setError(authError(e));
    } finally {
      setBusy(false);
    }
  }

  const logout = async () => { const f = firebase(); if (f) await signOut(f.auth); };

  const statusText =
    status.state === 'syncing' ? 'Sincronizando…'
    : status.state === 'offline' ? 'Sin conexión: se sincronizará al volver el internet.'
    : status.state === 'error' ? `Error: ${status.error ?? 'no se pudo sincronizar'}`
    : status.lastSyncAt ? `✓ Al día · ${new Date(status.lastSyncAt).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}`
    : '✓ Conectado';

  return (
    <div className="card" style={{ marginTop: 14 }}>
      <h2>☁️ Sincronización</h2>

      {!configured ? (
        <p className="empty" style={{ marginTop: 0 }}>
          La sincronización no está configurada. Sigue la guía <b>SINCRONIZACION.md</b> del proyecto (usa un proyecto gratuito de Firebase).
        </p>
      ) : user === undefined ? (
        <p className="empty" style={{ marginTop: 0 }}>Comprobando sesión…</p>
      ) : user ? (
        <>
          <p className="meta" style={{ marginTop: 0 }}>Sesión: <b>{user.email}</b></p>
          <div className={`toast ${status.state === 'error' ? 'error' : ''}`}>{statusText}</div>
          <p className="empty">Ventas, gastos, productos y configuración se copian solos entre tus dispositivos. Inicia sesión con este mismo correo en el otro.</p>
          <div className="quick">
            <button className="big venta" onClick={syncNow}>🔄 Sincronizar ahora</button>
            <button className="mini" onClick={() => void logout()}>Cerrar sesión</button>
          </div>
        </>
      ) : (
        <>
          <p className="empty" style={{ marginTop: 0 }}>
            Crea una cuenta (o inicia sesión) y usa el mismo correo en el iPhone y en la Mac para que tus datos se sincronicen solos.
          </p>
          <div className="field">
            <label>Correo</label>
            <input className="input" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="field">
            <label>Contraseña</label>
            <input className="input" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') void submit('in'); }} />
          </div>
          {error && <div className="toast error">{error}</div>}
          <div className="quick">
            <button className="save" disabled={busy || !email || !password} onClick={() => void submit('in')}>INICIAR SESIÓN</button>
            <button className="mini" disabled={busy || !email || !password} onClick={() => void submit('up')}>Crear cuenta nueva</button>
          </div>
        </>
      )}
    </div>
  );
}
