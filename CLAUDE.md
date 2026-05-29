# Squad Team — Contexto del proyecto

Web app de coaching fitness. Coach gestiona alumnos, planes, nutrición,
pagos, check-ins. Atleta carga sesiones, ve progreso, calorías, racha.
Sin servidor propio: todo Firebase Firestore + Cloudflare Worker para
operaciones admin.

## Stack

- **Frontend:** HTML + CSS + JS vanilla (sin framework, sin build step).
- **Hosting:** Cloudflare Workers con assets estáticos + un Worker para `/api/admin/*`.
- **Auth + DB:** Firebase (Auth para login, Firestore para datos).
- **Bot Telegram:** Railway (Node + Gemini), repo separado `squadteam-bot`.
- **Dominio:** `squadteam.app`.

## Estructura del repo

```
/
├── index.html              ← shell de la app (todas las views inline)
├── _worker.js              ← Cloudflare Worker: /api/admin/resetPin
├── wrangler.jsonc          ← Cloudflare config (main + assets dir)
├── .assetsignore           ← excluye _worker.js de assets públicos
├── firebase.json           ← Firestore rules path
├── firestore.rules         ← reglas de Firestore
├── manifest.json           ← PWA manifest
├── sw.js                   ← service worker (PWA offline)
├── css/
│   ├── main.css            ← estilos globales
│   └── nutrition-export.css
└── js/
    ├── config.js           ← URLs del bot + APP_SECRET
    ├── auth.js             ← wrapper Firebase Auth
    ├── storage.js          ← localStorage + sync
    ├── app.js              ← router + training mode + login
    ├── coach.js            ← panel coach (alumnos, edición, importación)
    ├── athlete.js          ← panel atleta (home, progreso, daily)
    ├── miRutina.js         ← carga de sesiones (sets, kg, reps)
    ├── routineBuilder.js   ← editor de planes
    ├── progressChart.js    ← gráficos de progreso
    ├── checkin.js          ← check-ins semanales
    ├── pagos.js            ← sección pagos del coach
    ├── clases.js           ← clases presenciales
    ├── dopamine.js         ← achievements / racha
    ├── data.js             ← logros, ejercicios, etc.
    ├── utils.js            ← helpers comunes
    ├── muscleMap.js        ← silueta muscular animada
    ├── muscleMapShare.js   ← export del muscle map a story 9:16
    ├── sheetStats.js       ← import desde Google Sheets
    ├── sheetSync.js        ← sync de planes desde sheets
    ├── coachTour.js        ← onboarding del coach
    └── nutrition/          ← módulo nutrición (macros, plates, export)
```

## Modelo de datos (Firestore)

```
users/{uid}                 ← perfil (id, name, role, color, features, isOwner?)
pins/{athId}                ← último PIN del alumno (string)
sessions/{athId}            ← {data: JSON-string con sesiones de entrenamiento}
plans/{athId}               ← plan de rutina del atleta
config/athletes             ← {list: JSON-string con array de athletes}
checkins/{athId}            ← check-ins semanales
pagos/{athId}               ← historial de pagos
diet/{athId}                ← dieta + macros
```

## Identidades y auth

- Email convention: `{userId}@squadteam.uy` (no se verifica, es identificador).
- Password convention: `sq{PIN}` (Firebase requiere mín 6 chars).
- Roles: `coach`, `athlete`, `owner` (owner = coach + permisos admin).
- `currentUser` es global en `app.js`, sostiene el perfil activo.

## Modo Entrenar Alumno

Coach puede asumir identidad de un alumno para cargar la sesión desde
su panel (alumno presencial). Stack multi-alumno: hasta N alumnos
abiertos a la vez con chips para cambiar.

- `_previewCoachProfile` guarda el perfil real del coach mientras está
  "entrenando con" un alumno.
- `_trainingStack` = array de `{athId, name, color, profile}`.
- `enterTrainingMode(athId)` → pushea al stack y activa ese alumno.
- `switchTrainingAth(athId)` → cambia el alumno activo.
- `closeTrainingAth(athId)` → cierra ese alumno (confirma si hay draft).
- `exitTrainingMode()` → vacía stack y vuelve al panel coach.
- Las sesiones cargadas por el coach se taggean con
  `source: 'coach-presencial'`, `coachId`, `coachName`.

Banner en `index.html#preview-banner` con chips renderizados por
`_renderTrainingBanner()`. CSS en `.tr-chip` / `.tr-chip.active`.

## Admin: cambio de PIN sin saber el actual

Cloudflare Worker (`_worker.js`) expone `POST /api/admin/resetPin`:

1. Valida el ID token Firebase del coach que llama.
2. Verifica que `users/{callerUid}.role === 'coach'`.
3. Firma un JWT con la service account y obtiene un access token de Google.
4. Llama `identitytoolkit:lookup` → resuelve UID del alumno por email.
5. Llama `identitytoolkit:update` → fuerza nuevo password sin el actual.
6. Sincroniza `pins/{athId}` en Firestore.

Secret requerido en Cloudflare: `FIREBASE_SERVICE_ACCOUNT` (tipo Secret,
contenido = JSON completo de la service account).

Cliente: `_eaChangePin(athId)` en `coach.js` → solo pide el nuevo PIN,
manda `Bearer <idToken>` al endpoint.

## Owner / Admin

- Para activar: en Firestore `users/{uid}` poner `isOwner: true` o `role: 'owner'`.
- `window.isOwner` se setea en `initApp()`.
- Muestra badge "ADMIN" en sidebar y "Admin" en footer-role.
- Por ahora no restringe features — todos los coaches tienen acceso completo.
- Cuando vendamos a otros coaches: el owner verá panel global de coaches.

## Daily tracking

- `daily/{athId}/{date}` con peso, agua, pasos, ánimo, comentarios.
- Agua: presets 1/1.5/2/2.5/3 L + botón "Otro" que abre input inline.
- Pasos: input con separador de miles (`12.500`) que se strippea al guardar.

## Muscle Map

- SVG con paths anatómicos de `react-native-body-highlighter` (MIT).
- Cada grupo muscular es un `<g id="…">` para colorear por volumen.
- Animación de scan line con `top: 0% → 100%` (adapta a cualquier alto).
- Export 1080×1920 (story 9:16) con `MuscleMapShare.open(...)`:
  - Canvas con bg oscuro, glow lime, silueta, dominante grande, frase, footer.
  - Usa Web Share API con archivo (`navigator.share({files})`); fallback download.
  - Frases auto: "Semana de pecho", "Semana de pierna", etc.

## Convenciones de UI

- Dark theme `#040404` bg, surfs `#0a0b0d / #16181c`.
- Acento `--acc: #e8ff00` (lime).
- Tipografía: Barlow Condensed (headers), Inter (body).
- Toasts cortos sin emoji.
- Bullets con `·` entre métricas (5 sesiones · 3 días).
- Sin gradientes/glows exagerados.

## Deploy

- **GitHub → Cloudflare:** push a `main` redeployea automático.
- **Branch de trabajo:** `claude/amazing-gauss-GZXmG` (Claude Code).
- **Secret en Cloudflare:** `FIREBASE_SERVICE_ACCOUNT` (cargar 1 vez).
- **Bot:** Railway, repo separado, vars: `BOT_TOKEN`, `GEMINI_KEY`, `APP_SECRET`, `WEB_URL`.

## Pendientes

- [ ] Panel owner: listar coaches activos, ingresos por coach, métricas globales.
- [ ] Onboarding self-service de coaches (registro + cobro + alta).
- [ ] Restringir features de Firestore rules según `isOwner` / `coachId`.
- [ ] Notificaciones push reales (más allá de las nativas del browser).
- [ ] Tests E2E del flujo coach → atleta → carga sesión.
- [ ] Migrar `sessions/{athId}` a subcolección en lugar de blob JSON.

## Decisiones / restricciones conocidas

- **No hay build step.** Si se necesita bundler, repensar todo el deploy.
- **Firebase apiKey en el HTML es público** (es lo normal, lo controlan las rules).
- **Service account NUNCA va al repo ni a assets.** Solo como Secret en Cloudflare.
- **PWA funciona offline** con `sw.js` cachando assets.
- **El bot de Telegram no usa Firebase Admin** — habla con la web vía `APP_SECRET`.

## Comandos útiles

```bash
# Branch actual de Claude
git checkout claude/amazing-gauss-GZXmG

# Ver último deploy de Cloudflare
# Dashboard → Workers & Pages → squadteam → Deployments

# Probar Worker localmente (requiere .dev.vars con FIREBASE_SERVICE_ACCOUNT)
npx wrangler dev
```
