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
  chest:      ['m-chest-left','m-chest-right'],
  shoulders:  ['m-shoulder-left','m-shoulder-right'],
  biceps:     ['m-biceps-left','m-biceps-right'],
  triceps:    ['m-triceps-left','m-triceps-right'],
  abs:        ['m-abs'],
  traps:      ['m-traps'],
  upperBack:  ['m-upper-back'],
  lowerBack:  ['m-lower-back'],
  glutes:     ['m-glutes-left','m-glutes-right'],
  hamstrings: ['m-hamstrings-left','m-hamstrings-right'],
  quads:      ['m-quads-left','m-quads-right']
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
function svgFront(){
  return `<svg id="body-front" class="mm-svg" viewBox="0 0 200 500" xmlns="http://www.w3.org/2000/svg">
    <g id="body-front-base" fill="#1a1a1a">
      <ellipse cx="100" cy="38" rx="22" ry="28"/>
      <path d="M88 62 L112 62 L114 86 L86 86 Z"/>
      <path d="M58 86 L142 86 L156 124 L150 200 L138 258 L132 296 L68 296 L62 258 L50 200 L44 124 Z"/>
      <path d="M44 92 L62 86 L58 130 L62 200 L56 252 L48 296 L30 296 L26 252 L30 200 L32 130 Z"/>
      <path d="M156 92 L138 86 L142 130 L138 200 L144 252 L152 296 L170 296 L174 252 L170 200 L168 130 Z"/>
      <path d="M68 296 L99 296 L98 400 L95 480 L66 480 L64 400 Z"/>
      <path d="M132 296 L101 296 L102 400 L105 480 L134 480 L136 400 Z"/>
    </g>
    <g id="muscles-front">
      <path id="m-chest-left"     d="M72 102 L98 102 L98 150 L60 148 L58 130 Z" fill="#1a1a1a"/>
      <path id="m-chest-right"    d="M128 102 L102 102 L102 150 L140 148 L142 130 Z" fill="#1a1a1a"/>
      <path id="m-shoulder-left"  d="M52 90 L74 88 L70 122 L46 122 L44 100 Z" fill="#1a1a1a"/>
      <path id="m-shoulder-right" d="M148 90 L126 88 L130 122 L154 122 L156 100 Z" fill="#1a1a1a"/>
      <path id="m-biceps-left"    d="M30 128 L60 132 L56 198 L34 196 Z" fill="#1a1a1a"/>
      <path id="m-biceps-right"   d="M170 128 L140 132 L144 198 L166 196 Z" fill="#1a1a1a"/>
      <path id="m-abs"            d="M82 155 L118 155 L122 258 L78 258 Z" fill="#1a1a1a"/>
      <path id="m-quads-left"     d="M70 304 L98 304 L97 402 L66 402 Z" fill="#1a1a1a"/>
      <path id="m-quads-right"    d="M130 304 L102 304 L103 402 L134 402 Z" fill="#1a1a1a"/>
    </g>
  </svg>`;
}

function svgBack(){
  return `<svg id="body-back" class="mm-svg" viewBox="0 0 200 500" xmlns="http://www.w3.org/2000/svg">
    <g id="body-back-base" fill="#1a1a1a">
      <ellipse cx="100" cy="38" rx="22" ry="28"/>
      <path d="M88 62 L112 62 L114 86 L86 86 Z"/>
      <path d="M58 86 L142 86 L156 124 L150 200 L138 258 L132 296 L68 296 L62 258 L50 200 L44 124 Z"/>
      <path d="M44 92 L62 86 L58 130 L62 200 L56 252 L48 296 L30 296 L26 252 L30 200 L32 130 Z"/>
      <path d="M156 92 L138 86 L142 130 L138 200 L144 252 L152 296 L170 296 L174 252 L170 200 L168 130 Z"/>
      <path d="M68 296 L99 296 L98 400 L95 480 L66 480 L64 400 Z"/>
      <path d="M132 296 L101 296 L102 400 L105 480 L134 480 L136 400 Z"/>
    </g>
    <g id="muscles-back">
      <path id="m-traps"            d="M82 86 L118 86 L130 118 L100 130 L70 118 Z" fill="#1a1a1a"/>
      <path id="m-upper-back"       d="M62 120 L138 120 L148 175 L130 220 L100 230 L70 220 L52 175 Z" fill="#1a1a1a"/>
      <path id="m-lower-back"       d="M82 232 L118 232 L120 290 L80 290 Z" fill="#1a1a1a"/>
      <path id="m-glutes-left"      d="M70 296 L99 296 L98 354 L72 354 Z" fill="#1a1a1a"/>
      <path id="m-glutes-right"     d="M130 296 L101 296 L102 354 L128 354 Z" fill="#1a1a1a"/>
      <path id="m-hamstrings-left"  d="M68 358 L98 358 L96 432 L66 432 Z" fill="#1a1a1a"/>
      <path id="m-hamstrings-right" d="M132 358 L102 358 L104 432 L134 432 Z" fill="#1a1a1a"/>
      <path id="m-triceps-left"     d="M28 130 L58 132 L54 200 L30 198 Z" fill="#1a1a1a"/>
      <path id="m-triceps-right"    d="M172 130 L142 132 L146 200 L170 198 Z" fill="#1a1a1a"/>
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

      let msg = 'Completá sesiones para ver tu perfil muscular.';
      if(!noSessionsAtAll){
        const lastDate = (sessions||[])
          .map(s => s.date)
          .filter(Boolean)
          .sort()
          .pop();
        if(lastDate){
          const lastT = new Date(lastDate + 'T12:00:00').getTime();
          const days = Math.floor((Date.now() - lastT) / 86400000);
          if(days > 14) msg = 'Sin datos esta semana. Volvé a entrenar para reactivar tu mapa.';
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
