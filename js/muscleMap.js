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
  0: { fill:'#1f1f1f', opacity:1.0 }, // SIN DATOS
  1: { fill:'#555555', opacity:1.0 }, // EN PROGRESO
  2: { fill:'#d9ff00', opacity:0.30 }, // ACTIVO
  3: { fill:'#d9ff00', opacity:0.55 }, // FUERTE
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
// Silueta minimalista deportiva. Paths con curvas Bezier que siguen la
// forma del cuerpo (no rectángulos blocky). viewBox 0 0 200 500.
// Centro vertical x=100. Color base body = #18181d, zonas musculares = #1f1f1f.

const BODY_SILHOUETTE = `
  <path d="M100 10 C82 10 76 24 76 40 C76 56 84 66 90 70 L90 86 L110 86 L110 70 C116 66 124 56 124 40 C124 24 118 10 100 10 Z"/>
  <path d="M62 86 C54 86 48 92 46 102 L42 145 C40 200 44 252 54 285 C58 296 64 298 72 298 L128 298 C136 298 142 296 146 285 C156 252 160 200 158 145 L154 102 C152 92 146 86 138 86 L62 86 Z"/>
  <path d="M52 88 C40 92 32 100 28 114 L22 184 C20 244 24 282 32 296 C36 300 42 298 46 292 L52 240 L56 184 L60 118 C60 104 56 92 52 88 Z"/>
  <path d="M148 88 C160 92 168 100 172 114 L178 184 C180 244 176 282 168 296 C164 300 158 298 154 292 L148 240 L144 184 L140 118 C140 104 144 92 148 88 Z"/>
  <path d="M72 298 L99 298 L99 380 C99 422 95 458 90 484 L70 484 C65 458 65 422 68 380 Z"/>
  <path d="M128 298 L101 298 L101 380 C101 422 105 458 110 484 L130 484 C135 458 135 422 132 380 Z"/>
`;

function svgFront(){
  return `<svg id="body-front" class="mm-svg" viewBox="0 0 200 500" xmlns="http://www.w3.org/2000/svg">
    <g id="body-front-base" fill="#18181d">${BODY_SILHOUETTE}</g>
    <g id="muscles-front">
      <path id="zone-pecho"           d="M64 100 C68 96 80 94 100 94 C120 94 132 96 136 100 L132 138 C128 148 118 152 108 150 L100 148 L92 150 C82 152 72 148 68 138 Z" fill="#1f1f1f"/>
      <path id="zone-hombro-izq"      d="M50 90 C40 94 32 102 30 114 L32 128 C40 124 50 124 58 128 L62 102 C60 94 56 90 50 90 Z" fill="#1f1f1f"/>
      <path id="zone-hombro-der"      d="M150 90 C160 94 168 102 170 114 L168 128 C160 124 150 124 142 128 L138 102 C140 94 144 90 150 90 Z" fill="#1f1f1f"/>
      <path id="zone-bicep-izq"       d="M30 132 C28 134 26 142 26 152 L24 192 C24 202 30 204 34 202 L52 200 C56 198 56 190 54 182 L52 142 C50 136 46 132 40 132 Z" fill="#1f1f1f"/>
      <path id="zone-bicep-der"       d="M170 132 C172 134 174 142 174 152 L176 192 C176 202 170 204 166 202 L148 200 C144 198 144 190 146 182 L148 142 C150 136 154 132 160 132 Z" fill="#1f1f1f"/>
      <path id="zone-abdomen"         d="M84 156 C86 154 92 152 100 152 C108 152 114 154 116 156 L120 254 C118 262 110 266 100 266 C90 266 82 262 80 254 Z" fill="#1f1f1f"/>
      <path id="zone-cuadricep-izq"   d="M72 312 C72 308 88 304 98 304 L98 396 C96 406 90 410 82 410 C74 410 70 404 70 394 Z" fill="#1f1f1f"/>
      <path id="zone-cuadricep-der"   d="M128 312 C128 308 112 304 102 304 L102 396 C104 406 110 410 118 410 C126 410 130 404 130 394 Z" fill="#1f1f1f"/>
    </g>
  </svg>`;
}

function svgBack(){
  return `<svg id="body-back" class="mm-svg" viewBox="0 0 200 500" xmlns="http://www.w3.org/2000/svg">
    <g id="body-back-base" fill="#18181d">${BODY_SILHOUETTE}</g>
    <g id="muscles-back">
      <path id="zone-trapecio"        d="M86 86 L114 86 L126 100 C126 112 116 122 100 124 C84 122 74 112 74 100 Z" fill="#1f1f1f"/>
      <path id="zone-dorsal-izq"      d="M62 110 C54 122 48 142 50 174 C52 204 70 222 88 226 L98 226 L98 132 C94 124 84 116 70 114 Z" fill="#1f1f1f"/>
      <path id="zone-dorsal-der"      d="M138 110 C146 122 152 142 150 174 C148 204 130 222 112 226 L102 226 L102 132 C106 124 116 116 130 114 Z" fill="#1f1f1f"/>
      <path id="zone-lumbar"          d="M82 234 C84 232 92 230 100 230 C108 230 116 232 118 234 L122 282 C120 290 110 294 100 294 C90 294 80 290 78 282 Z" fill="#1f1f1f"/>
      <path id="zone-gluteo"          d="M72 298 L128 298 C134 298 136 304 134 318 C130 344 118 360 100 360 C82 360 70 344 66 318 C64 304 66 298 72 298 Z" fill="#1f1f1f"/>
      <path id="zone-isquio-izq"      d="M70 364 C72 362 88 360 98 360 L98 432 C96 442 90 446 82 446 C74 446 70 440 70 430 Z" fill="#1f1f1f"/>
      <path id="zone-isquio-der"      d="M130 364 C128 362 112 360 102 360 L102 432 C104 442 110 446 118 446 C126 446 130 440 130 430 Z" fill="#1f1f1f"/>
      <path id="zone-tricep-izq"      d="M28 134 C26 136 24 144 24 154 L22 196 C22 206 28 208 32 206 L52 204 C56 202 56 194 54 186 L52 144 C50 138 46 134 40 134 Z" fill="#1f1f1f"/>
      <path id="zone-tricep-der"      d="M172 134 C174 136 176 144 176 154 L178 196 C178 206 172 208 168 206 L148 204 C144 202 144 194 146 186 L148 144 C150 138 154 134 160 134 Z" fill="#1f1f1f"/>
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
