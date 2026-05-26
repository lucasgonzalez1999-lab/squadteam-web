// ══════════════════════════════════════════
// SQUAD TEAM — Muscle Map
// Card "Tu Perfil Muscular" en Mi Historial
// ══════════════════════════════════════════

(function(){
'use strict';

// ── Helpers ─────────────────────────────────
function slug(s){
  return (s||'').normalize('NFD').replace(/[̀-ͯ]/g,'')
    .toLowerCase().trim().replace(/\s+/g,'-');
}

function isoWeekNumber(date){
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}

// Lunes 00:00 local de la semana que contiene `date`
function mondayOf(date){
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const day = d.getDay(); // 0=domingo
  const diff = (day === 0 ? -6 : 1 - day);
  d.setDate(d.getDate() + diff);
  d.setHours(0,0,0,0);
  return d;
}

function sundayOf(monday){
  const d = new Date(monday);
  d.setDate(d.getDate() + 6);
  d.setHours(23,59,59,999);
  return d;
}

const MONTH_ES = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];

// ── Escala de color ─────────────────────────
// 5 estados visuales según brief del CTO.
// Body base #0a0a0a → tier 0 #1a1a1a es visible como guía anatómica sutil.
const TIER_STYLES = {
  0: { fill:'#2e2e2e', opacity:1.00 },
  1: { fill:'#444444', opacity:1.00 },
  2: { fill:'#777777', opacity:1.00 },
  3: { fill:'#d9ff00', opacity:0.45 },
  4: { fill:'#d9ff00', opacity:1.00 }
};

// ── Mapeo SVG ───────────────────────────────
const MUSCLE_TO_PATHS = {
  chest:      ['front-chest-left','front-chest-right'],
  shoulders:  ['front-shoulder-left','front-shoulder-right'],
  biceps:     ['front-biceps-left','front-biceps-right'],
  triceps:    ['back-triceps-left','back-triceps-right'],
  abs:        ['front-abs','front-obliques-left','front-obliques-right'],
  traps:      ['back-traps'],
  upperBack:  ['back-lats-left','back-lats-right'],
  lowerBack:  ['back-lumbar'],
  glutes:     ['back-glutes-left','back-glutes-right'],
  hamstrings: ['back-hamstrings-left','back-hamstrings-right'],
  quads:      ['front-quads-left','front-quads-right'],
  calves:     ['front-calves-left','front-calves-right','back-calves-left','back-calves-right']
};

const MUSCLE_KEYS = Object.keys(MUSCLE_TO_PATHS);

const MACRO_GROUPS = {
  PECHO:   ['chest'],
  ESPALDA: ['upperBack','lowerBack','traps'],
  HOMBRO:  ['shoulders'],
  BRAZO:   ['biceps','triceps'],
  PIERNA:  ['quads','hamstrings','glutes','calves'],
  CORE:    ['abs']
};

// ── Catálogo ejercicio → músculo ────────────
// Slugs construidos a partir de EXERCISE_DB en js/routineBuilder.js
const EXERCISE_TO_MUSCLE = {
  // PECHO
  'press-banca':                 { chest:1.0, shoulders:0.3, triceps:0.5 },
  'press-banca-smith':           { chest:1.0, shoulders:0.3, triceps:0.5 },
  'press-inclinado-con-barra':   { chest:1.0, shoulders:0.4, triceps:0.4 },
  'press-inclinado-maquina':     { chest:1.0, shoulders:0.4, triceps:0.4 },
  'press-plano-maquina':         { chest:1.0, shoulders:0.3, triceps:0.4 },
  'apertura-en-maquina':         { chest:1.0, shoulders:0.2 },
  'crossover-polea':             { chest:1.0, shoulders:0.2 },
  'pull-over':                   { chest:0.7, upperBack:0.5 },

  // ESPALDA
  'jalon-agarre-pronado':        { upperBack:1.0, biceps:0.5 },
  'jalon-agarre-neutro':         { upperBack:1.0, biceps:0.6 },
  'remo-con-barra':              { upperBack:1.0, biceps:0.5, lowerBack:0.4, traps:0.3 },
  'remo-maquina-agarre-abierto': { upperBack:1.0, biceps:0.4, traps:0.2 },
  'remo-maquina-agarre-neutro':  { upperBack:1.0, biceps:0.5, traps:0.2 },
  'remo-en-polea':               { upperBack:1.0, biceps:0.4, traps:0.3 },
  'pull-down-polea':             { upperBack:1.0, biceps:0.3 },
  'pullover-en-polea':           { upperBack:1.0, chest:0.4 },

  // HOMBRO
  'press-militar-maquina':       { shoulders:1.0, triceps:0.5, traps:0.3 },
  'press-con-mancuernas':        { shoulders:1.0, triceps:0.5, traps:0.2 },
  'elevacion-lateral':           { shoulders:1.0 },
  'elevacion-lateral-polea':     { shoulders:1.0 },
  'vuelos-posteriores':          { shoulders:0.8, upperBack:0.4 },
  'face-pull':                   { shoulders:0.7, traps:0.5, upperBack:0.4 },

  // BÍCEPS
  'curl-con-barra':              { biceps:1.0 },
  'curl-con-mancuernas':         { biceps:1.0 },
  'curl-inclinado-en-banco':     { biceps:1.0 },
  'curl-polea-barra':            { biceps:1.0 },
  'curl-martillo':               { biceps:1.0 },

  // TRÍCEPS
  'fondos-en-maquina':           { triceps:0.8, chest:0.6, shoulders:0.3 },
  'triceps-polea-con-barra':     { triceps:1.0 },
  'triceps-trasnuca':            { triceps:1.0 },
  'triceps-cuerda':              { triceps:1.0 },

  // CUÁDRICEPS
  'prensa-45°':                  { quads:1.0, glutes:0.6, hamstrings:0.3 },
  'sentadilla-smith':            { quads:1.0, glutes:0.5 },
  'sentadilla-libre':            { quads:1.0, glutes:0.7, lowerBack:0.3, abs:0.2 },
  'extension-de-cuadriceps':     { quads:1.0 },
  'zancada-en-smith':            { quads:0.9, glutes:0.7, hamstrings:0.3 },

  // ISQUIOTIBIALES
  'femoral-acostado':            { hamstrings:1.0 },
  'femoral-sentado':             { hamstrings:1.0 },
  'peso-muerto-rumano':          { hamstrings:1.0, glutes:0.7, lowerBack:0.6 },

  // GLÚTEOS
  'hip-thrust':                  { glutes:1.0, hamstrings:0.4 },
  'abductor-en-maquina':         { glutes:1.0 },
  'patada-de-gluteo-polea':      { glutes:1.0 },

  // CORE
  'abdomen-en-polea':            { abs:1.0 },
  'crunch-en-maquina':           { abs:1.0 },
  'plancha':                     { abs:1.0 },

  // GEMELOS
  'gemelo-parado':               { calves:1.0 },
  'gemelo-sentado':              { calves:1.0 }
};

const _warnedSlugs = new Set();
function _warnMissing(s){
  if(_warnedSlugs.has(s)) return;
  _warnedSlugs.add(s);
  console.warn('[muscleMap] sin mapeo:', s);
}

// ── Cálculo de volumen por músculo ──────────
function computeMuscleVolume(sessions, weekStart, weekEnd){
  const vol = {};
  MUSCLE_KEYS.forEach(m => vol[m] = 0);

  (sessions||[]).forEach(s => {
    if(!s || !s.date) return;
    const d = new Date(s.date + 'T12:00:00');
    if(d < weekStart || d > weekEnd) return;

    (s.exercises||[]).forEach(ex => {
      const key = slug(ex.name);
      const map = EXERCISE_TO_MUSCLE[key];
      if(!map){
        if(key) _warnMissing(key);
        return;
      }
      (ex.sets||[]).forEach(st => {
        const kg = parseFloat(st.kg)||0;
        const reps = parseInt(st.reps)||0;
        if(kg <= 0 || reps <= 0) return;
        const v = kg * reps;
        for(const m in map){
          if(vol[m] !== undefined) vol[m] += v * map[m];
        }
      });
    });
  });
  return vol;
}

// ── Tier por músculo ────────────────────────
function median(values){
  if(!values.length) return 0;
  const sorted = [...values].sort((a,b)=>a-b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid-1] + sorted[mid]) / 2;
}

function computeTiers(volByMuscle){
  const nonZero = MUSCLE_KEYS.map(m => volByMuscle[m]).filter(v => v > 0);
  const bodyMedian = median(nonZero);

  const sorted = MUSCLE_KEYS.slice().sort((a,b) => volByMuscle[b] - volByMuscle[a]);
  const topTwo = sorted.slice(0,2).filter(m => volByMuscle[m] > 0);

  const tiers = {};
  MUSCLE_KEYS.forEach(m => {
    const v = volByMuscle[m];
    if(v === 0 || bodyMedian === 0){ tiers[m] = 0; return; }
    const ratio = v / bodyMedian;
    if(ratio <= 0.4) tiers[m] = 1;
    else if(ratio <= 0.8) tiers[m] = 2;
    else if(ratio <= 1.3 && !topTwo.includes(m)) tiers[m] = 3;
    else tiers[m] = 4;
  });
  return tiers;
}

// ── Top macro-grupos ────────────────────────
function getTopMacroGroups(volByMuscle){
  const macroVol = {};
  for(const macro in MACRO_GROUPS){
    macroVol[macro] = MACRO_GROUPS[macro].reduce((s,m) => s + (volByMuscle[m]||0), 0);
  }
  const sorted = Object.entries(macroVol)
    .filter(([,v]) => v > 0)
    .sort((a,b) => b[1] - a[1]);

  const top = sorted.slice(0,3);
  if(!top.length) return [];

  const macroMedian = median(sorted.map(([,v]) => v));
  const topVol = top[0][1];

  return top.map(([name, v], i) => {
    let label;
    if(v === 0) label = 'SIN DATOS';
    else {
      const ratio = macroMedian > 0 ? v / macroMedian : 0;
      if(i === 0 && ratio > 1.0) label = 'DOMINANTE';
      else if(ratio > 0.6) label = 'FUERTE';
      else if(ratio > 0.25) label = 'ACTIVO';
      else label = 'EN PROGRESO';
    }
    return {
      name,
      volume: v,
      label,
      barPct: Math.min(100, (v / topVol) * 100)
    };
  });
}

// ── SVG builders ────────────────────────────
// Silueta humana profesional (SVG Repo asset, public domain).
// Un solo path que dibuja toda la figura (cabeza, cuello, hombros, brazos,
// torso, piernas, pies). viewBox 0 0 206.326 206.326 (cuadrado).
// Las zonas musculares se posicionan como overlay con coords adaptadas.

// SVG anatómico generado vía ChatGPT (paths separados por músculo con IDs).
// viewBox del SVG original 0 0 400 600 con frente en x=0..200 y espalda en x=200..400.
// Para mostrar cada lado en su propio SVG independiente (200x600), el grupo
// back-body se traslada -200 en x con un <g transform>.

const FRONT_PATHS = `
  <path id="front-silhouette" fill="#202020" d="M100 26 C87 26 80 36 82 51 C83 62 80 69 76 76 C70 86 63 95 56 102 C47 111 42 126 39 145 C36 166 31 188 24 213 C19 232 17 255 20 278 C22 292 28 297 35 288 C40 282 43 269 44 250 C45 229 51 206 56 189 C60 207 61 232 59 254 C57 280 55 301 57 320 C60 346 65 374 69 405 C72 430 72 460 68 489 C65 511 61 535 57 558 C55 570 61 576 73 574 C83 572 87 564 89 551 C92 530 97 503 100 481 C103 503 108 530 111 551 C113 564 117 572 127 574 C139 576 145 570 143 558 C139 535 135 511 132 489 C128 460 128 430 131 405 C135 374 140 346 143 320 C145 301 143 280 141 254 C139 232 140 207 144 189 C149 206 155 229 156 250 C157 269 160 282 165 288 C172 297 178 292 180 278 C183 255 181 232 176 213 C169 188 164 166 161 145 C158 126 153 111 144 102 C137 95 130 86 124 76 C120 69 117 62 118 51 C120 36 113 26 100 26Z"/>
  <path id="front-chest-left" fill="#1a1a1a" d="M95 115 C82 109 70 107 61 112 C58 124 60 138 66 150 C77 154 88 151 96 145 C97 134 97 123 95 115Z"/>
  <path id="front-chest-right" fill="#1a1a1a" d="M105 115 C118 109 130 107 139 112 C142 124 140 138 134 150 C123 154 112 151 104 145 C103 134 103 123 105 115Z"/>
  <path id="front-shoulder-left" fill="#1a1a1a" d="M56 109 C43 115 37 130 38 148 C46 151 56 147 62 137 C64 126 62 116 56 109Z"/>
  <path id="front-shoulder-right" fill="#1a1a1a" d="M144 109 C157 115 163 130 162 148 C154 151 144 147 138 137 C136 126 138 116 144 109Z"/>
  <path id="front-biceps-left" fill="#1a1a1a" d="M39 153 C34 171 29 191 25 212 C30 219 38 216 43 204 C48 184 51 164 48 151 C45 150 42 151 39 153Z"/>
  <path id="front-biceps-right" fill="#1a1a1a" d="M161 153 C166 171 171 191 175 212 C170 219 162 216 157 204 C152 184 149 164 152 151 C155 150 158 151 161 153Z"/>
  <path id="front-abs" fill="#1a1a1a" d="M91 157 C86 174 83 196 84 223 C86 248 91 269 100 286 C109 269 114 248 116 223 C117 196 114 174 109 157 C103 160 97 160 91 157Z"/>
  <path id="front-obliques-left" fill="#1a1a1a" d="M78 156 C69 174 65 199 67 225 C69 243 76 263 90 282 C85 253 81 226 81 198 C81 180 82 166 78 156Z"/>
  <path id="front-obliques-right" fill="#1a1a1a" d="M122 156 C131 174 135 199 133 225 C131 243 124 263 110 282 C115 253 119 226 119 198 C119 180 118 166 122 156Z"/>
  <path id="front-quads-left" fill="#1a1a1a" d="M73 300 C66 328 66 360 72 397 C77 414 88 412 93 392 C97 363 96 330 91 303 C84 296 78 296 73 300Z"/>
  <path id="front-quads-right" fill="#1a1a1a" d="M127 300 C134 328 134 360 128 397 C123 414 112 412 107 392 C103 363 104 330 109 303 C116 296 122 296 127 300Z"/>
  <path id="front-calves-left" fill="#1a1a1a" d="M72 419 C66 444 65 475 69 504 C74 520 85 518 88 499 C91 470 88 441 81 419 C78 416 75 416 72 419Z"/>
  <path id="front-calves-right" fill="#1a1a1a" d="M128 419 C134 444 135 475 131 504 C126 520 115 518 112 499 C109 470 112 441 119 419 C122 416 125 416 128 419Z"/>
`;

const BACK_PATHS = `
  <path id="back-silhouette" fill="#202020" d="M300 26 C287 26 280 36 282 51 C283 62 280 69 276 76 C270 86 263 95 256 102 C247 111 242 126 239 145 C236 166 231 188 224 213 C219 232 217 255 220 278 C222 292 228 297 235 288 C240 282 243 269 244 250 C245 229 251 206 256 189 C260 207 261 232 259 254 C257 280 255 301 257 320 C260 346 265 374 269 405 C272 430 272 460 268 489 C265 511 261 535 257 558 C255 570 261 576 273 574 C283 572 287 564 289 551 C292 530 297 503 300 481 C303 503 308 530 311 551 C313 564 317 572 327 574 C339 576 345 570 343 558 C339 535 335 511 332 489 C328 460 328 430 331 405 C335 374 340 346 343 320 C345 301 343 280 341 254 C339 232 340 207 344 189 C349 206 355 229 356 250 C357 269 360 282 365 288 C372 297 378 292 380 278 C383 255 381 232 376 213 C369 188 364 166 361 145 C358 126 353 111 344 102 C337 95 330 86 324 76 C320 69 317 62 318 51 C320 36 313 26 300 26Z"/>
  <path id="back-traps" fill="#1a1a1a" d="M300 76 C287 83 278 94 269 112 C279 121 291 125 300 126 C309 125 321 121 331 112 C322 94 313 83 300 76Z"/>
  <path id="back-lats-left" fill="#1a1a1a" d="M266 119 C253 135 247 158 249 186 C252 211 264 234 287 254 C291 221 292 188 289 153 C281 147 274 136 266 119Z"/>
  <path id="back-lats-right" fill="#1a1a1a" d="M334 119 C347 135 353 158 351 186 C348 211 336 234 313 254 C309 221 308 188 311 153 C319 147 326 136 334 119Z"/>
  <path id="back-lumbar" fill="#1a1a1a" d="M290 250 C286 269 286 287 292 304 C296 312 304 312 308 304 C314 287 314 269 310 250 C304 257 296 257 290 250Z"/>
  <path id="back-glutes-left" fill="#1a1a1a" d="M272 310 C264 325 263 346 272 363 C283 374 294 368 298 351 C299 334 293 319 282 310 C279 308 275 308 272 310Z"/>
  <path id="back-glutes-right" fill="#1a1a1a" d="M328 310 C336 325 337 346 328 363 C317 374 306 368 302 351 C301 334 307 319 318 310 C321 308 325 308 328 310Z"/>
  <path id="back-triceps-left" fill="#1a1a1a" d="M240 153 C235 173 230 194 225 216 C229 224 238 221 244 208 C249 185 251 166 248 151 C245 150 242 151 240 153Z"/>
  <path id="back-triceps-right" fill="#1a1a1a" d="M360 153 C365 173 370 194 375 216 C371 224 362 221 356 208 C351 185 349 166 352 151 C355 150 358 151 360 153Z"/>
  <path id="back-hamstrings-left" fill="#1a1a1a" d="M273 372 C267 395 266 428 270 459 C274 485 282 494 289 475 C294 443 292 406 286 375 C282 370 277 369 273 372Z"/>
  <path id="back-hamstrings-right" fill="#1a1a1a" d="M327 372 C333 395 334 428 330 459 C326 485 318 494 311 475 C306 443 308 406 314 375 C318 370 323 369 327 372Z"/>
  <path id="back-calves-left" fill="#1a1a1a" d="M272 459 C266 484 265 513 269 541 C274 556 285 554 288 536 C291 508 288 482 281 460 C278 457 275 457 272 459Z"/>
  <path id="back-calves-right" fill="#1a1a1a" d="M328 459 C334 484 335 513 331 541 C326 556 315 554 312 536 C309 508 312 482 319 460 C322 457 325 457 328 459Z"/>
`;

function svgFront(){
  return `<svg id="body-front" class="mm-svg" viewBox="0 0 200 600" xmlns="http://www.w3.org/2000/svg">
    ${FRONT_PATHS}
  </svg>`;
}

function svgBack(){
  return `<svg id="body-back" class="mm-svg" viewBox="0 0 200 600" xmlns="http://www.w3.org/2000/svg">
    <g transform="translate(-200, 0)">${BACK_PATHS}</g>
  </svg>`;
}

// ── Aplica fills al SVG sin re-renderizar ───
function applyTiers(root, tiers){
  for(const m in MUSCLE_TO_PATHS){
    const tier = tiers[m] ?? 0;
    const style = TIER_STYLES[tier];
    MUSCLE_TO_PATHS[m].forEach(id => {
      const el = root.querySelector('#' + id);
      if(!el) return;
      el.setAttribute('fill', style.fill);
      el.setAttribute('fill-opacity', style.opacity);
    });
  }
}

// ── Render del card ─────────────────────────
function mount(host, sessions){
  if(!host) return;

  const today = new Date();
  const baseMonday = mondayOf(today);

  // Estado interno
  const state = {
    weekOffset: 0, // 0 = semana actual
    side: sessionStorage.getItem('muscleMapSide') || 'front'
  };

  // Layout inicial (HTML estático del card; los fills + top3 son dinámicos)
  host.innerHTML = `
    <section class="mm-card" data-side="${state.side}">
      <header class="mm-head">
        <div class="mm-title-wrap">
          <h3 class="mm-title">TU PERFIL MUSCULAR</h3>
          <div class="mm-sub" id="mm-week-label">—</div>
        </div>
        <div class="mm-week-nav">
          <button type="button" class="mm-nav-btn" id="mm-prev" aria-label="Semana anterior">&#9664;</button>
          <button type="button" class="mm-nav-btn" id="mm-next" aria-label="Semana siguiente">&#9654;</button>
        </div>
      </header>

      <div class="mm-pills" role="tablist">
        <button type="button" class="mm-pill" data-pill="front" role="tab">FRENTE</button>
        <button type="button" class="mm-pill" data-pill="back" role="tab">ESPALDA</button>
      </div>

      <div class="mm-body">
        <div class="mm-svg-wrap" id="mm-svg-wrap">
          ${svgFront()}
          ${svgBack()}
        </div>
      </div>

      <div class="mm-legend" id="mm-legend">
        <div class="mm-legend-item"><span class="mm-legend-dot mm-dot-dom"></span>ALTO ESTÍMULO</div>
        <div class="mm-legend-item"><span class="mm-legend-dot mm-dot-dev"></span>MEDIO ESTÍMULO</div>
        <div class="mm-legend-item"><span class="mm-legend-dot mm-dot-low"></span>BAJO ESTÍMULO</div>
        <div class="mm-legend-item"><span class="mm-legend-dot mm-dot-none"></span>SIN DATOS</div>
      </div>

      <div class="mm-empty hidden" id="mm-empty"></div>

      <ul class="mm-top3" id="mm-top3"></ul>
    </section>
  `;

  const card     = host.querySelector('.mm-card');
  const lblWeek  = host.querySelector('#mm-week-label');
  const btnPrev  = host.querySelector('#mm-prev');
  const btnNext  = host.querySelector('#mm-next');
  const top3El   = host.querySelector('#mm-top3');
  const emptyEl  = host.querySelector('#mm-empty');
  const legendEl = host.querySelector('#mm-legend');
  const svgWrap  = host.querySelector('#mm-svg-wrap');
  const svgFrontEl = host.querySelector('#body-front');
  const svgBackEl  = host.querySelector('#body-back');
  const pills    = host.querySelectorAll('.mm-pill');

  function refresh(){
    const monday = new Date(baseMonday);
    monday.setDate(monday.getDate() + state.weekOffset * 7);
    const sunday = sundayOf(monday);

    // Etiqueta "Semana N · Mes"
    const wk = isoWeekNumber(monday);
    const m  = MONTH_ES[monday.getMonth()];
    lblWeek.textContent = `Semana ${wk} · ${m}`;

    let volByMuscle = computeMuscleVolume(sessions, monday, sunday);
    let totalVol = MUSCLE_KEYS.reduce((s,k) => s + volByMuscle[k], 0);
    let isHistoric = false;

    if(totalVol === 0 && sessions.length > 0){
      const allStart = new Date(0);
      const allEnd   = new Date(Date.now() + 86400000);
      volByMuscle = computeMuscleVolume(sessions, allStart, allEnd);
      totalVol    = MUSCLE_KEYS.reduce((s,k) => s + volByMuscle[k], 0);
      isHistoric  = true;
    }

    const tiers = computeTiers(volByMuscle);
    applyTiers(svgFrontEl, tiers);
    applyTiers(svgBackEl,  tiers);

    if(isHistoric){
      lblWeek.textContent = 'Perfil histórico · ' + MONTH_ES[new Date().getMonth()].toUpperCase();
    }

    const hasData = totalVol > 0;
    if(!hasData){
      top3El.classList.add('hidden');
      legendEl.classList.add('hidden');
      emptyEl.classList.remove('hidden');
      emptyEl.textContent = sessions.length > 0
        ? 'Aún faltan datos para calcular un perfil completo.'
        : 'Completá tu primera sesión para ver tu perfil muscular.';
    } else {
      emptyEl.classList.add('hidden');
      top3El.classList.remove('hidden');
      legendEl.classList.remove('hidden');

      const top3 = getTopMacroGroups(volByMuscle);

      const macroVols = Object.entries(MACRO_GROUPS).map(([name, keys]) => ({
        name,
        vol: keys.reduce((s,m) => s + (volByMuscle[m]||0), 0)
      })).filter(x => x.vol > 0).sort((a,b) => a.vol - b.vol);
      const leastGroup = macroVols[0] || null;

      const weekSessions = (sessions||[]).filter(s => {
        if(!s.date) return false;
        const d = new Date(s.date + 'T12:00:00');
        return d >= monday && d <= sunday;
      }).length;

      top3El.innerHTML = `
        <li class="mm-metric-row">
          <div class="mm-metric">
            <span class="mm-metric-label">MÁS TRABAJADO</span>
            <span class="mm-metric-val">${top3[0] ? top3[0].name : '—'}</span>
          </div>
          <div class="mm-metric">
            <span class="mm-metric-label">MENOS TRABAJADO</span>
            <span class="mm-metric-val">${leastGroup ? leastGroup.name : '—'}</span>
          </div>
          <div class="mm-metric">
            <span class="mm-metric-label">SESIONES SEMANA</span>
            <span class="mm-metric-val">${weekSessions}</span>
          </div>
        </li>
        ${top3.map(g => `
        <li class="mm-top-item">
          <span class="mm-top-name">${g.name}</span>
          <div class="mm-bar"><div class="mm-bar-fill" style="width:${g.barPct}%"></div></div>
          <span class="mm-top-label">${g.label}</span>
        </li>`).join('')}
      `;
    }

    // Habilitar/deshabilitar ▶
    if(state.weekOffset >= 0){
      btnNext.setAttribute('disabled','');
    } else {
      btnNext.removeAttribute('disabled');
    }
  }

  // ── Navegación de semana ──
  btnPrev.addEventListener('click', () => { state.weekOffset -= 1; refresh(); });
  btnNext.addEventListener('click', () => {
    if(state.weekOffset >= 0) return;
    state.weekOffset += 1; refresh();
  });

  // ── Toggle Frente/Espalda ──
  function setSide(side){
    if(side !== 'front' && side !== 'back') return;
    if(state.side === side) return;
    state.side = side;
    sessionStorage.setItem('muscleMapSide', side);

    svgWrap.style.transition = 'opacity 120ms';
    svgWrap.style.opacity = '0';
    setTimeout(() => {
      card.dataset.side = side;
      pills.forEach(p => p.classList.toggle('active', p.dataset.pill === side));
      svgWrap.style.transition = 'opacity 180ms';
      svgWrap.style.opacity = '1';
    }, 120);
  }
  pills.forEach(p => p.addEventListener('click', () => setSide(p.dataset.pill)));
  pills.forEach(p => p.classList.toggle('active', p.dataset.pill === state.side));

  // ── Swipe horizontal (mobile) ──
  let touchStart = null, touchId = null;
  svgWrap.addEventListener('touchstart', (e) => {
    if(e.touches.length !== 1) { touchStart = null; return; }
    const t = e.touches[0];
    touchId = t.identifier;
    touchStart = { x: t.clientX, y: t.clientY };
  }, { passive: true });

  svgWrap.addEventListener('touchend', (e) => {
    if(!touchStart) return;
    const t = e.changedTouches[0];
    if(!t || t.identifier !== touchId){ touchStart = null; return; }
    const dx = t.clientX - touchStart.x;
    const dy = t.clientY - touchStart.y;
    touchStart = null;
    if(Math.abs(dy) > Math.abs(dx)) return; // scroll vertical, no swipe
    if(Math.abs(dx) < 40) return;
    // Solo aplicar si estamos en mobile (pills visibles)
    if(!matchMedia('(max-width: 767px)').matches) return;
    setSide(state.side === 'front' ? 'back' : 'front');
  }, { passive: true });

  refresh();
}

// ── Exports ─────────────────────────────────
window.MuscleMap = {
  mount,
  slug,
  computeMuscleVolume,
  computeTiers,
  getTopMacroGroups,
  EXERCISE_TO_MUSCLE,
  MUSCLE_TO_PATHS,
  MACRO_GROUPS,
  TIER_STYLES
};

})();
