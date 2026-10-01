// crypto.randomUUID solo existe en HTTPS o localhost; este respaldo evita que falle en http://IP-local
export const newId = (): string =>
  globalThis.crypto?.randomUUID?.() ??
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
