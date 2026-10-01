import { initializeApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { initializeFirestore, type Firestore } from 'firebase/firestore';

const env = import.meta.env;
const config = {
  apiKey: env.VITE_FIREBASE_API_KEY as string | undefined,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN as string | undefined,
  projectId: env.VITE_FIREBASE_PROJECT_ID as string | undefined,
  appId: env.VITE_FIREBASE_APP_ID as string | undefined,
};

// Si faltan las variables de entorno, la app funciona igual, solo sin sincronización
export const isSyncConfigured = Boolean(config.apiKey && config.authDomain && config.projectId && config.appId);

let cached: { auth: Auth; fs: Firestore } | null = null;

export function firebase() {
  if (!isSyncConfigured) return null;
  if (!cached) {
    const app = initializeApp(config);
    cached = { auth: getAuth(app), fs: initializeFirestore(app, { ignoreUndefinedProperties: true }) };
  }
  return cached;
}
