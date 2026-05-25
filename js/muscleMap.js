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
const TIER_STYLES = {
  0: { fill:'#2e2e36', opacity:1.0 }, // SIN DATOS (guía anatómica visible)
  1: { fill:'#555555', opacity:1.0 }, // POR DESARROLLAR
  2: { fill:'#d9ff00', opacity:0.30 }, // ACTIVO
  3: { fill:'#d9ff00', opacity:0.55 }, // EN DESARROLLO / FUERTE
  4: { fill:'#d9ff00', opacity:1.0 }  // DOMINANTE
};

// ── Mapeo SVG ───────────────────────────────
const MUSCLE_TO_PATHS = {
  chest:      ['zone-pecho'],
  shoulders:  ['zone-hombro-izq','zone-hombro-der'],
  biceps:     ['zone-bicep-izq','zone-bicep-der'],
  triceps:    ['zone-tricep-izq','zone-tricep-der'],
  abs:        ['zone-abdomen'],
  traps:      ['zone-trapecio'],
  upperBack:  ['zone-dorsal-izq','zone-dorsal-der'],
  lowerBack:  ['zone-lumbar'],
  glutes:     ['zone-gluteo'],
  hamstrings: ['zone-isquio-izq','zone-isquio-der'],
  quads:      ['zone-cuadricep-izq','zone-cuadricep-der']
};

const MUSCLE_KEYS = Object.keys(MUSCLE_TO_PATHS);

const MACRO_GROUPS = {
  PECHO:   ['chest'],
  ESPALDA: ['upperBack','lowerBack','traps'],
  HOMBRO:  ['shoulders'],
  BRAZO:   ['biceps','triceps'],
  PIERNA:  ['quads','hamstrings','glutes'],
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
  'plancha':                     { abs:1.0 }
  // Nota: gemelos no se mapean (el SVG no tiene gemelos) → warning esperado
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
// Silueta atlética con proporciones humanas reales (cabeza ~1/8 del cuerpo,
// hombros anchos, brazos largos pegados al cuerpo, cintura definida, piernas
// largas separadas). viewBox 0 0 200 600 (aspect 1:3).
// Cabeza/cuello distintos entre frente y espalda; cuerpo idéntico.

const BODY_REST = `
  <path d="M88 110 L60 120 C46 128 38 142 36 158 L30 215 L28 270 C30 295 36 318 44 338 L48 360 L42 380 C40 395 42 405 48 412 L70 412 L100 414 L130 412 L152 412 C158 405 160 395 158 380 L152 360 L156 338 C164 318 170 295 172 270 L170 215 L164 158 C162 142 154 128 140 120 L112 110 Z"/>
  <path d="M58 124 C46 130 34 144 30 162 L24 220 L22 286 L24 340 L30 380 L38 402 C42 412 50 414 56 410 L60 402 L62 380 L64 340 L66 286 L66 220 L64 162 L64 134 Z"/>
  <path d="M142 124 C154 130 166 144 170 162 L176 220 L178 286 L176 340 L170 380 L162 402 C158 412 150 414 144 410 L140 402 L138 380 L136 340 L134 286 L134 220 L136 162 L136 134 Z"/>
  <path d="M70 414 L99 414 L100 500 L98 555 L95 585 L94 595 L72 595 L70 585 L68 555 L68 500 Z"/>
  <path d="M130 414 L101 414 L100 500 L102 555 L105 585 L106 595 L128 595 L130 585 L132 555 L132 500 Z"/>
`;

// Frente: cabeza con curva de mandíbula y cuello con clavículas sutiles
const HEAD_FRONT = `
  <path d="M100 18 C82 18 74 34 74 56 C74 70 78 80 84 86 L86 96 L88 110 L112 110 L114 96 L116 86 C122 80 126 70 126 56 C126 34 118 18 100 18 Z"/>
`;

// Espalda: cabeza más esférica/lisa, cuello recto trapezoidal
const HEAD_BACK = `
  <ellipse cx="100" cy="56" rx="23" ry="34"/>
  <path d="M86 90 L114 90 L114 110 L86 110 Z"/>
`;

function svgFront(){
  return `<svg id="body-front" class="mm-svg" viewBox="0 0 200 600" xmlns="http://www.w3.org/2000/svg">
    <g id="body-front-base" fill="#18181d" stroke="rgba(255,255,255,0.1)" stroke-width="0.6" stroke-linejoin="round">${HEAD_FRONT}${BODY_REST}</g>
    <g id="muscles-front" stroke="rgba(255,255,255,0.06)" stroke-width="0.5" stroke-linejoin="round">
      <path id="zone-hombro-izq"      class="mm-zone" d="M64 122 C50 128 40 140 36 156 L38 174 C46 170 56 168 66 170 L72 138 C70 128 68 122 64 122 Z" fill="#2e2e36"/>
      <path id="zone-hombro-der"      class="mm-zone" d="M136 122 C150 128 160 140 164 156 L162 174 C154 170 144 168 134 170 L128 138 C130 128 132 122 136 122 Z" fill="#2e2e36"/>
      <path id="zone-pecho"           class="mm-zone" d="M72 138 C78 132 90 130 100 130 C110 130 122 132 128 138 L126 192 C122 206 110 214 102 210 L100 206 L98 210 C90 214 78 206 74 192 Z" fill="#2e2e36"/>
      <path id="zone-bicep-izq"       class="mm-zone" d="M28 174 C26 180 24 192 24 204 L22 262 C22 276 28 282 34 280 L56 276 C60 272 60 264 58 254 L58 204 C56 188 52 174 46 174 Z" fill="#2e2e36"/>
      <path id="zone-bicep-der"       class="mm-zone" d="M172 174 C174 180 176 192 176 204 L178 262 C178 276 172 282 166 280 L144 276 C140 272 140 264 142 254 L142 204 C144 188 148 174 154 174 Z" fill="#2e2e36"/>
      <path id="zone-abdomen"         class="mm-zone" d="M84 210 C86 206 94 204 100 204 C106 204 114 206 116 210 L120 360 C118 374 110 380 100 380 C90 380 82 374 80 360 Z" fill="#2e2e36"/>
      <path id="zone-cuadricep-izq"   class="mm-zone" d="M72 420 C72 416 88 414 98 414 L98 506 C96 518 90 524 82 524 C74 524 70 514 70 504 Z" fill="#2e2e36"/>
      <path id="zone-cuadricep-der"   class="mm-zone" d="M128 420 C128 416 112 414 102 414 L102 506 C104 518 110 524 118 524 C126 524 130 514 130 504 Z" fill="#2e2e36"/>
    </g>
    <g id="body-front-hints" stroke="rgba(255,255,255,0.07)" stroke-width="0.5" fill="none">
      <line x1="100" y1="214" x2="100" y2="375"/>
      <circle cx="100" cy="295" r="1.2" fill="rgba(255,255,255,0.2)" stroke="none"/>
      <line x1="92" y1="248" x2="108" y2="248" opacity="0.6"/>
      <line x1="92" y1="284" x2="108" y2="284" opacity="0.6"/>
      <line x1="92" y1="322" x2="108" y2="322" opacity="0.6"/>
    </g>
  </svg>`;
}

function svgBack(){
  return `<svg id="body-back" class="mm-svg" viewBox="0 0 200 600" xmlns="http://www.w3.org/2000/svg">
    <g id="body-back-base" fill="#18181d" stroke="rgba(255,255,255,0.1)" stroke-width="0.6" stroke-linejoin="round">${HEAD_BACK}${BODY_REST}</g>
    <g id="muscles-back" stroke="rgba(255,255,255,0.06)" stroke-width="0.5" stroke-linejoin="round">
      <path id="zone-trapecio"        class="mm-zone" d="M84 110 L116 110 L130 132 C130 146 116 158 100 160 C84 158 70 146 70 132 Z" fill="#2e2e36"/>
      <path id="zone-dorsal-izq"      class="mm-zone" d="M62 146 C54 158 48 180 50 216 C52 248 70 268 88 272 L98 272 L98 172 C94 162 84 152 70 150 Z" fill="#2e2e36"/>
      <path id="zone-dorsal-der"      class="mm-zone" d="M138 146 C146 158 152 180 150 216 C148 248 130 268 112 272 L102 272 L102 172 C106 162 116 152 130 150 Z" fill="#2e2e36"/>
      <path id="zone-lumbar"          class="mm-zone" d="M82 282 C84 280 92 278 100 278 C108 278 116 280 118 282 L122 348 C120 358 110 362 100 362 C90 362 80 358 78 348 Z" fill="#2e2e36"/>
      <path id="zone-gluteo"          class="mm-zone" d="M70 414 L130 414 C136 414 138 424 136 440 C132 470 118 488 100 488 C82 488 68 470 64 440 C62 424 64 414 70 414 Z" fill="#2e2e36"/>
      <path id="zone-isquio-izq"      class="mm-zone" d="M70 492 C72 490 88 488 98 488 L98 562 C96 574 90 580 82 580 C74 580 70 572 70 562 Z" fill="#2e2e36"/>
      <path id="zone-isquio-der"      class="mm-zone" d="M130 492 C128 490 112 488 102 488 L102 562 C104 574 110 580 118 580 C126 580 130 572 130 562 Z" fill="#2e2e36"/>
      <path id="zone-tricep-izq"      class="mm-zone" d="M26 176 C24 182 22 194 22 206 L20 266 C20 280 26 286 32 284 L54 280 C58 276 58 268 56 258 L56 206 C54 190 50 176 44 176 Z" fill="#2e2e36"/>
      <path id="zone-tricep-der"      class="mm-zone" d="M174 176 C176 182 178 194 178 206 L180 266 C180 280 174 286 168 284 L146 280 C142 276 142 268 144 258 L144 206 C146 190 150 176 156 176 Z" fill="#2e2e36"/>
    </g>
    <g id="body-back-hints" stroke="rgba(255,255,255,0.14)" stroke-width="0.8" fill="none">
      <line x1="100" y1="116" x2="100" y2="280"/>
      <line x1="100" y1="416" x2="100" y2="486"/>
    </g>
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
      el.classList.toggle('mm-zone-dom', tier === 4);
      el.classList.toggle('mm-zone-strong', tier === 3);
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
          <div class="mm-scanline"></div>
          ${svgFront()}
          ${svgBack()}
        </div>
      </div>

      <div class="mm-legend" id="mm-legend">
        <div class="mm-legend-item"><span class="mm-legend-dot mm-dot-dom"></span>DOMINANTE</div>
        <div class="mm-legend-item"><span class="mm-legend-dot mm-dot-dev"></span>EN DESARROLLO</div>
        <div class="mm-legend-item"><span class="mm-legend-dot mm-dot-low"></span>POR DESARROLLAR</div>
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

    // Cálculos
    const volByMuscle = computeMuscleVolume(sessions, monday, sunday);
    const totalVol = MUSCLE_KEYS.reduce((s,k) => s + volByMuscle[k], 0);
    const tiers = computeTiers(volByMuscle);

    // Pintar fills (ambos SVGs siempre, no se re-renderiza markup)
    applyTiers(svgFrontEl, tiers);
    applyTiers(svgBackEl,  tiers);

    // Estado vacío
    const hasData = totalVol > 0;
    const noSessionsAtAll = !(sessions && sessions.length);
    if(!hasData){
      top3El.classList.add('hidden');
      legendEl.classList.add('hidden');
      emptyEl.classList.remove('hidden');

      let msg = 'Sin sesiones registradas.';
      if(!noSessionsAtAll){
        const lastDate = (sessions||[])
          .map(s => s.date)
          .filter(Boolean)
          .sort()
          .pop();
        if(lastDate){
          const lastT = new Date(lastDate + 'T12:00:00').getTime();
          const days = Math.floor((Date.now() - lastT) / 86400000);
          if(days > 14) msg = 'Sin actividad esta semana.';
          else msg = 'Sin sesiones esta semana.';
        }
      }
      emptyEl.textContent = msg;
    } else {
      emptyEl.classList.add('hidden');
      top3El.classList.remove('hidden');
      legendEl.classList.remove('hidden');

      const top3 = getTopMacroGroups(volByMuscle);
      top3El.innerHTML = top3.map(g => `
        <li class="mm-top-item">
          <span class="mm-top-name">${g.name}</span>
          <div class="mm-bar"><div class="mm-bar-fill" style="width:${g.barPct}%"></div></div>
          <span class="mm-top-label">${g.label}</span>
        </li>
      `).join('');
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
