# Squad Team — Contexto del proyecto

Web app de coaching fitness. El coach gestiona alumnos, planes, nutrición,
pagos, check-ins y progreso físico. El atleta carga sesiones, ve progreso,
calorías, racha y sube fotos del check-in semanal. Sin servidor propio:
todo Firebase Firestore + Cloudflare Worker para operaciones admin.

> **Para una sesión nueva de Claude (o un dev que acaba de entrar):** todo
> lo que necesitás para arrancar está acá. No hay README adicional. Si
> tocás algo crítico, actualizá este archivo.

---

## Stack

- **Frontend:** HTML + CSS + JS vanilla. **Sin framework, sin build step.**
  Todo se sirve tal cual está en el repo.
- **Hosting:** Cloudflare Workers (`squadteam.app`) — assets estáticos
  + un Worker para `/api/admin/*` y `/api/push/*`.
- **Auth + DB:** Firebase (Auth para login, Firestore para datos).
- **Storage de fotos:** Cloudinary (preset unsigned, compresión client-side ~400 KB).
- **Push notifications:** Firebase Cloud Messaging (FCM v1) coach → atleta.
- **Bot Telegram:** Railway (Node + Gemini), repo separado `squadteam-bot`.
- **Tipografías:** Barlow Condensed (headers), Inter (body), cargadas de
  Google Fonts en `index.html`.
- **Iconos / PWA:** `manifest.json` + `sw.js` + `firebase-messaging-sw.js`.

---

## Estructura del repo

```
/
├── index.html                  ← shell de la app (todas las views inline)
├── _worker.js                  ← Cloudflare Worker: /api/admin/* + /api/push/*
├── wrangler.jsonc              ← Cloudflare config (main + assets dir)
├── .assetsignore               ← excluye _worker.js de los assets públicos
├── firebase.json               ← Firestore rules path
├── firestore.rules             ← reglas de Firestore
├── firebase-messaging-sw.js    ← Service Worker dedicado para FCM
├── manifest.json               ← PWA manifest
├── sw.js                       ← service worker (PWA offline + cache)
├── icons/                      ← icon-512.png, icon-192.png, logo-transparent.png
├── CLAUDE.md                   ← este archivo
├── css/
│   ├── main.css                ← estilos globales + componentes pp-*, .tr-chip, etc.
│   └── nutrition-export.css
└── js/
    ├── config.js               ← URLs del bot + APP_SECRET + Firebase config
    ├── auth.js                 ← wrapper Firebase Auth + sesión expirada
    ├── storage.js              ← localStorage + pullFromFirebase + sync inicial
    ├── app.js                  ← router + training mode + login + global poller
    ├── coach.js                ← panel coach (alumnos, edición, dashboard, push)
    ├── athlete.js              ← panel atleta (home, progreso, daily, racha)
    ├── miRutina.js             ← carga de sesiones (sets, kg, reps) + export Strava
    ├── routineBuilder.js       ← editor de planes
    ├── progressChart.js        ← gráficos de progreso (sparklines, barras)
    ├── checkin.js              ← check-ins semanales + bloque de fotos
    ├── progressPhotos.js       ← Físico: 4 poses, anclado al check-in
    ├── pagos.js                ← sección pagos del coach (multi-moneda)
    ├── clases.js               ← clases presenciales (horarios)
    ├── dopamine.js             ← achievements / racha / micro-rewards
    ├── data.js                 ← catálogos: logros, ejercicios, sinónimos
    ├── utils.js                ← helpers comunes (confirmDialog, sqPrompt,
    │                              safeAsync, humanizeError, roundRect polyfill)
    ├── muscleMap.js            ← silueta muscular animada (FRONT_PATHS SVG)
    ├── muscleMapShare.js       ← export del muscle map a story 9:16
    ├── push.js                 ← FCM cliente (VAPID, permisos, token)
    ├── sheetStats.js           ← import desde Google Sheets
    ├── sheetSync.js            ← sync de planes desde sheets
    ├── coachTour.js            ← onboarding del coach
    ├── promoMaker.js           ← ?promo=1/2/3: generador de stories de marca
    ├── contentMaker.js         ← ?gen=1: generador de contenido multi-formato
    └── nutrition/
        ├── foodDatabase.js
        ├── macroCalculator.js
        ├── mealBuilder.js
        └── nutritionExport.js
```

> **Truco para encontrar la versión bumpeada de un script:**
> `grep "<archivo>.js?v" index.html` — todas las cargas llevan `?v=N`
> para bustear cache. **Cada vez que tocás un JS, bump el `v`.**

---

## Modelo de datos (Firestore)

```
users/{uid}              ← perfil (id, name, role, color, features, isOwner?)
pins/{athId}             ← último PIN del alumno (string)
sessions/{athId}         ← {data: JSON-string [sesiones de entrenamiento]}
plans/{athId}            ← plan de rutina del atleta
config/athletes          ← {list: JSON-string [array de athletes]}
checkins/{athId}         ← check-ins semanales (mapa por checkinId)
physiqueSettings/{athId} ← {interval: N semanas, lastPhotoCheckinId}
physiquePhotos/{athId}   ← {data: JSON-string [sesiones de fotos]}
pagos/{athId}            ← historial de pagos (multi-moneda UYU/USD)
diet/{athId}             ← dieta + macros
fcmTokens/{athId}        ← tokens push (un mapa de {device: token})
notes/{athId}            ← notas del coach
daily/{athId}_{date}     ← peso, agua, pasos, ánimo, comentario
```

Convenciones de IDs:
- `athId` = `id` del athlete en `config/athletes`.
- `checkinId` = `ck_YYYY_W##` (ISO week) — único por semana del año.
- Las sesiones se guardan como blob JSON (clave `data`) por la regla histórica.
  Pendiente migrar a subcolección.

---

## Identidades y auth

- **Email convention:** `{userId}@squadteam.uy` (no se verifica — es solo
  identificador para Firebase Auth).
- **Password convention:** `sq{PIN}` (Firebase requiere mín 6 chars, por eso
  el prefijo `sq`).
- **Roles:** `coach`, `athlete`, `owner` (owner = coach + permisos admin).
- `currentUser` es global en `app.js`, sostiene el perfil activo.
- `_wasLoggedIn` + `_manualLogout` en `auth.js` para detectar sesión
  expirada (Firebase token rota). `showSessionExpired()` muestra un modal
  con CTA "INGRESAR".

---

## Modo Entrenar Alumno (presencial)

El coach asume la identidad de un alumno para cargar la sesión desde su
propio panel cuando lo entrena presencial. Stack multi-alumno: hasta N
alumnos abiertos a la vez con chips para cambiar.

- `_previewCoachProfile` guarda el perfil real del coach mientras está
  "entrenando con" un alumno.
- `_trainingStack` = array de `{athId, name, color, profile}`.
- `enterTrainingMode(athId)` → pushea al stack y activa ese alumno.
- `switchTrainingAth(athId)` → cambia el alumno activo.
- `closeTrainingAth(athId)` → cierra ese alumno (confirma si hay draft).
- `exitTrainingMode()` → vacía stack y vuelve al panel coach.
- Las sesiones cargadas por el coach se taggean con:
  - `source: 'coach-presencial'`
  - `coachId: <coach.id>`
  - `coachName: <coach.name>`

Banner en `index.html#preview-banner` con chips renderizados por
`_renderTrainingBanner()`. CSS en `.tr-chip` / `.tr-chip.active`.

> **Sync coach → atleta:** `quickSyncFromFirebase()` en `app.js` polea
> `sessions/{athId}` cada 30s e incluye `currentUser.id` en la lista
> de ids a sincronizar. Si el alumno tiene mi-rutina abierto en su
> dispositivo, se re-renderea automáticamente cuando aparece una sesión
> nueva — la lógica "heal" en `renderMiRutina` (líneas 75-86) restaura
> los inputs desde la sesión sincronizada.

---

## Admin: cambio de PIN sin saber el actual

Cloudflare Worker (`_worker.js`) expone `POST /api/admin/resetPin`:

1. Valida el ID token Firebase del coach que llama.
2. Verifica que `users/{callerUid}.role === 'coach' || isOwner`.
3. Firma un JWT con la service account y obtiene un access token de Google.
4. Llama `identitytoolkit:lookup` → resuelve UID del alumno por email.
5. Llama `identitytoolkit:update` → fuerza nuevo password sin el actual.
6. Sincroniza `pins/{athId}` en Firestore.

**Secret requerido en Cloudflare:** `FIREBASE_SERVICE_ACCOUNT` (tipo Secret,
contenido = JSON completo de la service account).

**Cliente:** `_eaChangePin(athId)` en `coach.js` → solo pide el nuevo PIN,
manda `Authorization: Bearer <idToken>` al endpoint.

---

## Owner / Admin

- Para activar: en Firestore `users/{uid}` poner `isOwner: true` o `role: 'owner'`.
- `window.isOwner` se setea en `initApp()`.
- Muestra badge "ADMIN" en sidebar y "Admin" en footer-role.
- Por ahora no restringe features — todos los coaches tienen acceso completo.
- Panel debug (`?debug=1`) muestra subtabs Firebase y Diagnóstico ocultos por defecto.

---

## Push notifications (FCM)

Coach → atleta cuando se actualiza plan o check-in.

- `js/push.js` → módulo cliente: pide permiso, obtiene token FCM,
  lo guarda en `fcmTokens/{athId}`.
- `firebase-messaging-sw.js` → Service Worker dedicado para background pushes.
- `_worker.js` → `POST /api/push/send` recibe `{athId, title, body, link}`
  desde el coach, valida ID token, llama FCM v1 con la service account.
- `coach.js` expone `sendPushTo(athId, title, body, link)` global —
  no bloquea, falla silenciosa.

**Triggers actuales:**
- `routineBuilder.js` después de `db.collection('plans').set(...)`.
- `checkin.js` después de `ckSaveForm` (solo si `currentUser.role==='coach'`).

**UI:** en `athlete.js` aparece una card "Activar" en la tab Hoy si
`Notification.permission === 'default'`. Una vez activado, se oculta.

**VAPID public key** en `push.js` (constante `VAPID_PUBLIC_KEY`).
Obtenerla en Firebase Console → Project Settings → Cloud Messaging →
Web Push certificates → Generate key pair.

iOS Safari solo soporta push si el usuario instaló la app como PWA
(agregar a pantalla de inicio). Android Chrome / desktop funciona sin instalar.

---

## Daily tracking

- `daily/{athId}_{date}` con peso, agua, pasos, ánimo, comentarios.
- Agua: presets 1 / 1.5 / 2 / 2.5 / 3 L + botón "Otro" con input inline.
- Pasos: input con separador de miles (`12.500`) que se strippea al guardar.

---

## Check-ins semanales

- `checkin.js` — bloque del check-in del atleta (Hoy) y panel del coach.
- ID de check-in = `ck_YYYY_W##` (ISO week).
- El bloque de fotos (`progressPhotos.js`) se monta dentro del check-in
  cuando `checkinRequiresPhotos(checkinId, settings)` devuelve `true`,
  según el `interval` configurado en `physiqueSettings/{athId}`.
- "ENTENDIDO" del atleta queda disabled hasta tener las 4 fotos cargadas.
- Comparador: `ckCoachOpenEvolution` muestra side-by-side el check-in
  anterior vs el actual con las fotos.

---

## Físico (progress photos)

- 4 poses fijas: `frente_relax`, `perfil_izq`, `perfil_der`, `espalda_relax`.
- Grid 2×2 reutilizable (`ppRenderPhotoGrid(...)`).
- Upload a **Cloudinary** (preset unsigned), compresión a 1600 px / 82 % JPEG.
- Anclado al check-in dominical: por defecto **cada 4 semanas**, configurable
  por alumno desde el modal de edición.
- `ppOpenAdhocSheet()` permite subir fotos ad-hoc sin avanzar
  `lastPhotoCheckinId` (no rompe la cadencia dominical).
- Photo sessions en `physiquePhotos/{athId}` como `{data: JSON.stringify([...])}`.
- Globals expuestos: `ppShouldShowInCheckin`, `ppRenderCheckinBlock`,
  `ppMarkCheckinDone`, `ppSaveSettingsExt`.

---

## Pagos

- `pagos/{athId}` con historial de pagos.
- Métodos soportados (UI): `Efectivo`, `Transferencia`, `Otro`.
- Métodos legacy (solo lectura): `mp` (Mercado Pago), `stripe` — se
  muestran con sufijo `(legacy)` en `METHOD_LABEL`.
- **Monedas:** UYU por defecto, USD opcional.
- **Totales agrupados por moneda** — no se mezclan (`byCcy` en `renderPagos`).
- `getPaymentStatus(athId)` centraliza estado, monto y historial para
  el card del atleta.

---

## Muscle Map

- SVG con paths anatómicos de `react-native-body-highlighter` (MIT).
- Cada grupo muscular es un `<g id="…">` para colorear por volumen.
- Animación de scan line con `top: 0% → 100%` (adapta a cualquier alto).
- `FRONT_PATHS` (string global) se reusa en otros lugares (ej:
  `promoMaker.js` lo rasteriza para el mockup "Volumen").
- Export 1080×1920 (story 9:16) con `MuscleMapShare.open(...)`:
  - Canvas con bg oscuro, glow lime, silueta, dominante grande, frase, footer.
  - Usa Web Share API con archivo (`navigator.share({files})`); fallback download.
  - Frases auto: "Semana de pecho", "Semana de pierna", etc.

---

## Exports de imagen

### Story del entrenamiento (tipo Strava)
- `mrExportStory(photoFile, isDemo)` en `miRutina.js`.
- Canvas **1080×1920**, fondo foto (opcional) + gradientes + brackets en
  esquinas + main lift gigante + watermark del escudo TS al centro
  (`globalAlpha 0.07`, `composite 'lighter'`).
- Helper `_mrLoadLogo()` carga `icon-512.png`, saca el fondo negro del
  maskable, detecta el gap horizontal y croppea solo el escudo (sin el
  wordmark hardcoded del PNG).

### Generador de promo (`?promo=1/2/3`)
- `promoMaker.js`. 3 modos:
  - **Modo 1 (mockups del app):** Rutina, Pagos, Físico, Check-in, Volumen, Record.
  - **Modo 2 (tipográficas):** Intro, Hero, Pregunta, Features, Manifiesto, CTA,
    Countdown, Social Proof.
  - **Modo 3 (marcos PNG transparentes):** Sello, Esquina, Tapa, Borde.
    El canvas NO llama a `drawBackground()` → exporta con alpha real para
    pegar como sticker sobre fotos.
- `drawLogoBlock(ctx, cx, cy, size, color)` = escudo TS (cropped sin el
  texto embebido del PNG) + wordmark "SQUAD / TEAM" canvas-native debajo.

### Generador de contenido (`?gen=1`)
- `contentMaker.js`. 3 formatos:
  - **YouTube** 1280×720 (miniatura).
  - **Historia** 1080×1920.
  - **Cuadrado** 1080×1080.
- Templates declarativos: cada uno declara su schema de campos
  (`text` / `textarea` / `color` / `range` / `toggle`). El editor arma la UI
  automáticamente.
- Common fields heredados: `overlay`, `posY`, `watermark`.
- Helper `fitText(ctx, text, maxW, maxH, opts)` reduce el tamaño de fuente
  hasta que el texto wrappeado entra en el área disponible.
  `fitOrFixed(...)` permite override manual con `fixedSize > 0`.
- **Drag de texto:** pointer events sobre el canvas escalan el delta a
  coordenadas del canvas y guardan offset en `textOffsetX`/`textOffsetY`.
  Botón "Centrar texto" resetea. `touch-action: none` evita el scroll en mobile.

---

## Convenciones de UI y branding

### Paleta
- Bg principal `#040404`.
- Surfaces `#0a0b0d` / `#16181c`.
- Borders `#1f1f24`.
- Texto principal blanco, secundario `#9090a8`.
- **Acento: `--acc: #e8ff00` (lima).**
- Verde estado: `#00d084`.
- Naranja alerta: `#ff9500`.
- Rojo crítico: `#ff3f3f`.

### Tipografía
- **Headers / hero:** Barlow Condensed 900 italic.
- **Body:** Inter 400-800.
- **Mono / hex labels:** Roboto Mono (en el generador de contenido).
- No usar gradientes / glows exagerados.

### Componentes
- Toasts cortos sin emoji.
- Bullets con `·` entre métricas (`5 sesiones · 3 días`).
- Pills redondeados, no rectangulares.
- Modales custom: `confirmDialog({title, body, danger})`, `sqPrompt({...})` —
  **nunca** `confirm()` / `prompt()` nativos.
- Botones primarios: fondo lima `#e8ff00`, texto negro.
- Banners de estado:
  - **Offline:** `showOfflineBanner()` — barra naranja en el top.
  - **Sesión expirada:** `showSessionExpired()` — modal fullscreen con CTA.

### Comunicación
- Español rioplatense ("vos", "decime", "agarrá").
- Sin "claudismo": evitar voces robóticas o demasiado pulidas.
- En el generador de contenido y los marcos: blanco y negro como base.
  Lima solo como acento puntual, no como protagonista.

---

## Reglas de código

### General
- **Nada de comentarios que digan QUÉ hace el código** (los nombres ya lo dicen).
  Solo comentarios sobre el **POR QUÉ** cuando no es obvio (workarounds,
  invariantes ocultas, decisiones contraintuitivas).
- **No agregar abstracciones especulativas.** Tres líneas similares es mejor
  que una abstracción prematura.
- **No agregar error handling para escenarios que no pueden pasar.** Trust
  internal code. Solo validar en bordes del sistema.
- **No medias implementaciones.** Si lo arrancás, terminalo o no lo hagas.
- **No agregar features ni refactorings que no se pidieron.** Bug fix = bug fix.
- **Backwards compat hacks no — borrá el código viejo si ya no se usa.**

### Async / errores
- `safeAsync(fn, {label, toast})` para envolver llamadas async con manejo
  unificado de errores (toast legible + console.error).
- `humanizeError(e)` mapea códigos Firebase / network a mensajes en español.
- `getWithRetry(query, tries=3, delayMs=400)` para Firestore con
  exponential backoff.
- Firestore reads / writes que no son críticos van con `.catch(()=>{})` para
  no bloquear UI.

### Storage / state
- `DB.get(key)` / `DB.set(key, value)` / `DB.del(key)` — wrapper de
  `localStorage` con `JSON.parse/stringify` automático.
- Globals esperados en `app.js`: `currentUser`, `athletes`, `sessions`,
  `templates`, `currentSection`, `isOwner`.
- `window._subscriptions` = registry de unsubscribers de `onSnapshot`.
  `_stopAllTimersAndSubs()` los limpia en logout / cambio de modo.

### Canvas
- Polyfill local de `roundRect` al inicio de cada archivo que dibuja
  (Safari < 15.4, Firefox < 113 no lo soportan).
- Checks / iconos: dibujados en canvas con `drawCheck()` — **nunca**
  Unicode (`'✓'`) porque rinde distinto en cada plataforma.
- Siluetas humanas: `drawPoseFront/Profile/Back` canvas-native, no emojis.

### URLs / parámetros
- `?debug=1` → muestra paneles dev (Firebase, Diagnóstico).
- `?promo=1` → mockups del app (story 9:16).
- `?promo=2` → templates tipográficas.
- `?promo=3` → marcos PNG transparentes (overlay sobre fotos).
- `?gen=1` → generador de contenido multi-formato (YouTube / Historia / Cuadrado).

---

## Deploy

- **GitHub → Cloudflare:** push a `main` redeployea automático (Cloudflare
  Pages connect to Git).
- **Branch de trabajo (Claude Code on the web):** `claude/amazing-gauss-GZXmG`.
- **Secret en Cloudflare:** `FIREBASE_SERVICE_ACCOUNT` (cargar 1 vez).
- **Bot:** Railway, repo separado, vars: `BOT_TOKEN`, `GEMINI_KEY`,
  `APP_SECRET`, `WEB_URL`.

### Cómo bumpear cache de un JS
1. Editás `js/foo.js`.
2. En `index.html` bumpeás `<script src="js/foo.js?v=N">` → `?v=N+1`.
3. Commit + push → Cloudflare redeployea → los navegadores se bajan la versión nueva.

### Cómo deployar Firestore rules
```bash
firebase deploy --only firestore:rules
```
(no se hace automático con el push a GitHub, hay que correrlo a mano cuando
toques `firestore.rules`).

---

## Pendientes

- [ ] Panel owner: listar coaches activos, ingresos por coach, métricas globales.
- [ ] Onboarding self-service de coaches (registro + cobro + alta).
- [ ] Restringir features de Firestore rules según `isOwner` / `coachId`.
- [x] ~~Notificaciones push reales~~ — implementado con FCM (coach → atleta).
- [ ] Tests E2E del flujo coach → atleta → carga sesión.
- [ ] Migrar `sessions/{athId}` a subcolección en lugar de blob JSON.
- [ ] Listener real-time (`onSnapshot`) sobre `sessions/{athId}` para
      eliminar el delay de 30s del poller.
- [ ] Carrusel multi-slide + stickers en `contentMaker.js`.

---

## Decisiones / restricciones conocidas

- **No hay build step.** Si se necesita bundler, repensar todo el deploy.
- **Firebase apiKey en el HTML es público** (es lo normal, lo controlan
  las Firestore rules).
- **Service account NUNCA va al repo ni a assets.** Solo como Secret en
  Cloudflare. La regla `.assetsignore` excluye `_worker.js` de los assets
  públicos.
- **PWA funciona offline** con `sw.js` cachando assets.
- **El bot de Telegram no usa Firebase Admin** — habla con la web vía
  `APP_SECRET` (HMAC).
- **`icon-512.png` es un maskable icon con fondo negro + wordmark embebido.**
  Para usarlo limpio en canvases (watermarks, marcos) hay que procesarlo:
  pixeles negros → alpha 0 + crop al bounding box del escudo, descartando
  el wordmark. Helpers: `ensureLogoImg()` en `promoMaker.js`, `_mrLoadLogo()`
  en `miRutina.js`.

---

## Comandos útiles

```bash
# Branch actual de Claude Code on the web
git checkout claude/amazing-gauss-GZXmG

# Ver último deploy de Cloudflare
# Dashboard → Workers & Pages → squadteam → Deployments

# Probar Worker localmente (requiere .dev.vars con FIREBASE_SERVICE_ACCOUNT)
npx wrangler dev

# Deploy de Firestore rules
firebase deploy --only firestore:rules

# Buscar dónde se carga un script y su versión en index.html
grep "miRutina.js?v" index.html
```

---

## Para una sesión nueva: arranque de 30 segundos

1. `index.html` es el shell — todas las views están inline como `<section>`s,
   `goSection(id, btn)` cambia la visible.
2. Cada feature mayor tiene su archivo `js/*.js`. No hay imports / módulos
   ESM — todo es global, cargado por orden de `<script>` en `index.html`.
3. **El orden de carga importa:** `config.js` → `auth.js` → `storage.js` →
   `data.js` → `utils.js` → resto. Si agregás un archivo nuevo y depende de
   helpers, ponelo después de `utils.js`.
4. **Estado global** vive en `app.js`. Para ver qué hay disponible:
   `console.log(Object.keys(window).filter(k => k.startsWith('_') || k === 'currentUser'))`.
5. **Para tocar UI del coach:** `js/coach.js` → `renderCoachView()`.
6. **Para tocar UI del atleta:** `js/athlete.js` → `renderAthleteView()`.
7. **Si rompés el login:** revisar `auth.js` + el form en `index.html` (search `sqSubmit`).
