# Sincronizar CookieSnacks entre iPhone y Mac

La app guarda todo en el dispositivo y, si activas la sincronización, también lo copia a la nube (Firebase, plan gratuito)
para que lo que registres en un dispositivo aparezca solo en el otro. Funciona sin internet: lo registrado se sube al volver la conexión.

## 1. Crear el proyecto en Firebase (una sola vez)
1. Entra a https://console.firebase.google.com → **Agregar proyecto** (puede ser nuevo; Analytics no hace falta).
2. **Build → Authentication → Comenzar → Correo electrónico/contraseña → Habilitar**.
3. **Build → Firestore Database → Crear base de datos** → modo **producción** → elige una ubicación cercana.
4. En Firestore, pestaña **Reglas**: pega el contenido de `firestore.rules` (en esta carpeta) y **Publicar**.
5. **Configuración del proyecto (engrane) → Tus apps → Web (</>)** → registra la app → copia los valores de `firebaseConfig`.

## 2. Probar en tu computadora
1. Copia `.env.example` como `.env.local` y llena `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID` y `VITE_FIREBASE_APP_ID`.
2. `npm install` y luego `npm run dev` (reinicia si ya estaba corriendo).
3. En la app: **Más → Configuración → Sincronización → Crear cuenta** (correo y contraseña de 6+ caracteres).

## 3. Publicar para usarla en el celular (Vercel)
1. Sube el proyecto a Vercel. En **Settings → Environment Variables** agrega las mismas 4 variables `VITE_FIREBASE_...` y vuelve a desplegar.
2. Si Vercel marca `Permission denied` al compilar, usa como Build Command:
   `node node_modules/typescript/bin/tsc && node node_modules/vite/bin/vite.js build`
3. En el iPhone abre la dirección de Vercel en Safari → Compartir → **Añadir a pantalla de inicio**.
4. En el celular: **Más → Configuración → Sincronización → Iniciar sesión** con el mismo correo.

## Importante
- Los datos locales pertenecen a cada dirección web: abre la app siempre desde la misma (la de Vercel en el celular).
- Si ya tenías datos en ambos dispositivos, al iniciar sesión se **combinan** (no se pierde nada).
- Si el mismo registro se edita en dos dispositivos, gana la edición más reciente.
- Los borrados también se sincronizan.
- Las copias de seguridad (.json) siguen disponibles como respaldo extra.
