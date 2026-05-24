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
// Silueta atlética con proporciones humanas (cabeza chica, hombros anchos,
// brazos largos pegados al cuerpo, cintura definida, piernas largas separadas).
// viewBox 0 0 200 540. Paths Bezier suaves. Stroke fino para definir contorno.
// Cabeza/cuello distintos entre frente y espalda; cuerpo idéntico.

const BODY_REST = `
  <path d="M88 86 L62 94 C50 100 44 110 42 124 L38 175 L40 230 C42 270 48 305 56 332 L62 348 C64 354 70 356 76 356 L124 356 C130 356 136 354 138 348 L144 332 C152 305 158 270 160 230 L162 175 L158 124 C156 110 150 100 138 94 L112 86 Z"/>
  <path d="M52 100 C42 104 32 114 30 130 L26 180 L24 240 L26 290 L30 320 L36 332 C40 336 46 336 50 332 L54 320 L56 290 L58 240 L60 180 L60 130 L62 110 Z"/>
  <path d="M148 100 C158 104 168 114 170 130 L174 180 L176 240 L174 290 L170 320 L164 332 C160 336 154 336 150 332 L146 320 L144 290 L142 240 L140 180 L140 130 L138 110 Z"/>
  <path d="M70 358 L98 358 L99 430 L97 490 L94 525 L74 525 L72 490 L70 430 Z"/>
  <path d="M130 358 L102 358 L101 430 L103 490 L106 525 L126 525 L128 490 L130 430 Z"/>
`;

// Frente: cabeza con mandíbula sutil (curva más definida al pie del rostro)
const HEAD_FRONT = `
  <path d="M100 14 C84 14 76 28 76 46 C76 58 80 66 86 72 L88 78 L88 86 L112 86 L112 78 L114 72 C120 66 124 58 124 46 C124 28 116 14 100 14 Z"/>
`;

// Espalda: cabeza más esférica/lisa (sin detalle de barbilla), cuello recto
const HEAD_BACK = `
  <ellipse cx="100" cy="46" rx="23" ry="32"/>
  <path d="M88 78 L112 78 L112 86 L88 86 Z"/>
`;

function svgFront(){
  return `<svg id="body-front" class="mm-svg" viewBox="0 0 200 540" xmlns="http://www.w3.org/2000/svg">
    <g id="body-front-base" fill="#18181d" stroke="rgba(255,255,255,0.08)" stroke-width="0.6">${HEAD_FRONT}${BODY_REST}</g>
    <g id="muscles-front" stroke="rgba(255,255,255,0.05)" stroke-width="0.5">
      <path id="zone-hombro-izq"      d="M58 96 C46 100 36 110 32 124 L34 138 C42 134 52 132 60 134 L66 108 C64 100 62 96 58 96 Z" fill="#2e2e36"/>
      <path id="zone-hombro-der"      d="M142 96 C154 100 164 110 168 124 L166 138 C158 134 148 132 140 134 L134 108 C136 100 138 96 142 96 Z" fill="#2e2e36"/>
      <path id="zone-pecho"           d="M68 108 C72 104 84 102 100 102 C116 102 128 104 132 108 L130 150 C126 162 116 168 108 166 L100 164 L92 166 C84 168 74 162 70 150 Z" fill="#2e2e36"/>
      <path id="zone-bicep-izq"       d="M30 138 C28 142 26 152 26 162 L24 210 C24 222 30 226 36 224 L52 222 C56 220 56 212 54 202 L54 162 C52 150 48 138 42 138 Z" fill="#2e2e36"/>
      <path id="zone-bicep-der"       d="M170 138 C172 142 174 152 174 162 L176 210 C176 222 170 226 164 224 L148 222 C144 220 144 212 146 202 L146 162 C148 150 152 138 158 138 Z" fill="#2e2e36"/>
      <path id="zone-abdomen"         d="M82 170 C84 168 92 166 100 166 C108 166 116 168 118 170 L122 290 C120 302 110 308 100 308 C90 308 80 302 78 290 Z" fill="#2e2e36"/>
      <path id="zone-cuadricep-izq"   d="M72 362 C72 360 88 358 98 358 L98 446 C96 456 90 460 82 460 C74 460 70 454 70 444 Z" fill="#2e2e36"/>
      <path id="zone-cuadricep-der"   d="M128 362 C128 360 112 358 102 358 L102 446 C104 456 110 460 118 460 C126 460 130 454 130 444 Z" fill="#2e2e36"/>
    </g>
    <g id="body-front-hints" stroke="rgba(255,255,255,0.07)" stroke-width="0.5" fill="none">
      <line x1="100" y1="170" x2="100" y2="304"/>
      <circle cx="100" cy="240" r="1" fill="rgba(255,255,255,0.15)"/>
    </g>
  </svg>`;
}

function svgBack(){
  return `<svg id="body-back" class="mm-svg" viewBox="0 0 200 540" xmlns="http://www.w3.org/2000/svg">
    <g id="body-back-base" fill="#18181d" stroke="rgba(255,255,255,0.08)" stroke-width="0.6">${HEAD_BACK}${BODY_REST}</g>
    <g id="muscles-back" stroke="rgba(255,255,255,0.05)" stroke-width="0.5">
      <path id="zone-trapecio"        d="M86 86 L114 86 L128 104 C128 116 116 126 100 128 C84 126 72 116 72 104 Z" fill="#2e2e36"/>
      <path id="zone-dorsal-izq"      d="M62 116 C54 128 48 148 50 182 C52 212 70 232 88 236 L98 236 L98 138 C94 130 84 122 70 120 Z" fill="#2e2e36"/>
      <path id="zone-dorsal-der"      d="M138 116 C146 128 152 148 150 182 C148 212 130 232 112 236 L102 236 L102 138 C106 130 116 122 130 120 Z" fill="#2e2e36"/>
      <path id="zone-lumbar"          d="M82 246 C84 244 92 242 100 242 C108 242 116 244 118 246 L122 298 C120 306 110 310 100 310 C90 310 80 306 78 298 Z" fill="#2e2e36"/>
      <path id="zone-gluteo"          d="M72 358 L128 358 C134 358 136 366 134 380 C130 406 118 422 100 422 C82 422 70 406 66 380 C64 366 66 358 72 358 Z" fill="#2e2e36"/>
      <path id="zone-isquio-izq"      d="M70 426 C72 424 88 422 98 422 L98 490 C96 502 90 506 82 506 C74 506 70 500 70 490 Z" fill="#2e2e36"/>
      <path id="zone-isquio-der"      d="M130 426 C128 424 112 422 102 422 L102 490 C104 502 110 506 118 506 C126 506 130 500 130 490 Z" fill="#2e2e36"/>
      <path id="zone-tricep-izq"      d="M28 140 C26 144 24 154 24 164 L22 214 C22 226 28 230 34 228 L52 226 C56 224 56 216 54 206 L52 164 C50 152 46 140 40 140 Z" fill="#2e2e36"/>
      <path id="zone-tricep-der"      d="M172 140 C174 144 176 154 176 164 L178 214 C178 226 172 230 166 228 L148 226 C144 224 144 216 146 206 L148 164 C150 152 154 140 160 140 Z" fill="#2e2e36"/>
    </g>
    <g id="body-back-hints" stroke="rgba(255,255,255,0.12)" stroke-width="0.8" fill="none">
      <line x1="100" y1="92" x2="100" y2="240"/>
      <line x1="100" y1="358" x2="100" y2="420"/>
    </g>
  </svg>`;
}

// ── Aplica fills al SVG sin re-renderizar ───
function applyTiers(root, tiers){
  for(const m in MUSCLE_TO_PATHS){
    const style = TIER_STYLES[tiers[m] ?? 0];
    MUSCLE_TO_PATHS[m].forEach(id => {
      const el = root.querySelector('#' + id);
      if(el){
        el.setAttribute('fill', style.fill);
        el.setAttribute('fill-opacity', style.opacity);
      }
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
