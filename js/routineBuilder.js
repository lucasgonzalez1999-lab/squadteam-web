// ══════════════════════════════════════════
// SQUAD TEAM — Routine Builder
// Armador de mesociclos por nivel
// ══════════════════════════════════════════

// ── BASE DE EJERCICIOS ──
const EXERCISE_DB = {
  pecho: [
    {id:'press_banca',        name:'Press Banca',                    tipo:'compuesto', orden:1, eq:'barra'},
    {id:'press_banca_smith',  name:'Press Banca Smith',              tipo:'compuesto', orden:1, eq:'smith'},
    {id:'press_inclinado',    name:'Press Inclinado con Barra',      tipo:'compuesto', orden:2, eq:'barra'},
    {id:'press_inc_maq',      name:'Press Inclinado Máquina',        tipo:'compuesto', orden:2, eq:'maquina'},
    {id:'press_plano_maq',    name:'Press Plano Máquina',            tipo:'compuesto', orden:2, eq:'maquina'},
    {id:'apertura_maq',       name:'Apertura en Máquina',            tipo:'aislado',   orden:3, eq:'maquina'},
    {id:'cross_over',         name:'Crossover Polea',                tipo:'aislado',   orden:3, eq:'polea'},
    {id:'pull_over',          name:'Pull Over',                      tipo:'aislado',   orden:4, eq:'mancuerna'},
  ],
  espalda: [
    {id:'jalon_prono',        name:'Jalón Agarre Pronado',           tipo:'compuesto', orden:1, eq:'polea'},
    {id:'jalon_neutro',       name:'Jalón Agarre Neutro',            tipo:'compuesto', orden:1, eq:'polea'},
    {id:'remo_barra',         name:'Remo con Barra',                 tipo:'compuesto', orden:1, eq:'barra'},
    {id:'remo_maq_abierto',   name:'Remo Máquina Agarre Abierto',    tipo:'compuesto', orden:2, eq:'maquina'},
    {id:'remo_maq_neutro',    name:'Remo Máquina Agarre Neutro',     tipo:'compuesto', orden:2, eq:'maquina'},
    {id:'remo_polea',         name:'Remo en Polea',                  tipo:'compuesto', orden:2, eq:'polea'},
    {id:'pull_down',          name:'Pull Down Polea',                tipo:'aislado',   orden:3, eq:'polea'},
    {id:'pullover_polea',     name:'Pullover en Polea',              tipo:'aislado',   orden:3, eq:'polea'},
  ],
  hombros: [
    {id:'press_militar_maq',  name:'Press Militar Máquina',          tipo:'compuesto', orden:1, eq:'maquina'},
    {id:'press_mancuernas',   name:'Press con Mancuernas',           tipo:'compuesto', orden:1, eq:'mancuerna'},
    {id:'elev_lateral',       name:'Elevación Lateral',              tipo:'aislado',   orden:2, eq:'mancuerna'},
    {id:'elev_lat_polea',     name:'Elevación Lateral Polea',        tipo:'aislado',   orden:2, eq:'polea'},
    {id:'vuelos_post',        name:'Vuelos Posteriores',             tipo:'aislado',   orden:3, eq:'maquina'},
    {id:'face_pull',          name:'Face Pull',                      tipo:'aislado',   orden:3, eq:'polea'},
  ],
  biceps: [
    {id:'curl_barra',         name:'Curl con Barra',                 tipo:'aislado',   orden:1, eq:'barra'},
    {id:'curl_mancuernas',    name:'Curl con Mancuernas',            tipo:'aislado',   orden:2, eq:'mancuerna'},
    {id:'curl_inc_banco',     name:'Curl Inclinado en Banco',        tipo:'aislado',   orden:2, eq:'mancuerna'},
    {id:'curl_polea',         name:'Curl Polea Barra',               tipo:'aislado',   orden:3, eq:'polea'},
    {id:'curl_martillo',      name:'Curl Martillo',                  tipo:'aislado',   orden:3, eq:'mancuerna'},
  ],
  triceps: [
    {id:'fondos',             name:'Fondos en Máquina',              tipo:'compuesto', orden:1, eq:'maquina'},
    {id:'tric_polea_barra',   name:'Tríceps Polea con Barra',        tipo:'aislado',   orden:2, eq:'polea'},
    {id:'tric_trasnuca',      name:'Tríceps Trasnuca',               tipo:'aislado',   orden:2, eq:'mancuerna'},
    {id:'tric_cuerda',        name:'Tríceps Cuerda',                 tipo:'aislado',   orden:3, eq:'polea'},
  ],
  cuadriceps: [
    {id:'prensa_45',          name:'Prensa 45°',                     tipo:'compuesto', orden:1, eq:'maquina'},
    {id:'sentadilla_smith',   name:'Sentadilla Smith',               tipo:'compuesto', orden:1, eq:'smith'},
    {id:'sentadilla_libre',   name:'Sentadilla Libre',               tipo:'compuesto', orden:1, eq:'barra'},
    {id:'extension_cuad',     name:'Extensión de Cuádriceps',        tipo:'aislado',   orden:2, eq:'maquina'},
    {id:'zancada_smith',      name:'Zancada en Smith',               tipo:'compuesto', orden:2, eq:'smith'},
  ],
  isquiotibiales: [
    {id:'femoral_acostado',   name:'Femoral Acostado',               tipo:'aislado',   orden:1, eq:'maquina'},
    {id:'femoral_sentado',    name:'Femoral Sentado',                tipo:'aislado',   orden:2, eq:'maquina'},
    {id:'peso_muerto_rumano', name:'Peso Muerto Rumano',             tipo:'compuesto', orden:1, eq:'barra'},
  ],
  gluteos: [
    {id:'hip_thrust',         name:'Hip Thrust',                     tipo:'compuesto', orden:1, eq:'barra'},
    {id:'abductor_maq',       name:'Abductor en Máquina',            tipo:'aislado',   orden:2, eq:'maquina'},
    {id:'patada_gluteo',      name:'Patada de Glúteo Polea',         tipo:'aislado',   orden:3, eq:'polea'},
  ],
  gemelos: [
    {id:'gemelo_parado',      name:'Gemelo Parado',                  tipo:'aislado',   orden:1, eq:'maquina'},
    {id:'gemelo_sentado',     name:'Gemelo Sentado',                 tipo:'aislado',   orden:2, eq:'maquina'},
  ],
  core: [
    {id:'abdomen_polea',      name:'Abdomen en Polea',               tipo:'aislado',   orden:1, eq:'polea'},
    {id:'crunch_maq',         name:'Crunch en Máquina',              tipo:'aislado',   orden:2, eq:'maquina'},
    {id:'plancha',            name:'Plancha',                        tipo:'compuesto', orden:3, eq:'cuerpo'},
  ],
};

const MUSCLE_LABELS = {
  pecho:'Pecho', espalda:'Espalda', hombros:'Hombros', biceps:'Bíceps',
  triceps:'Tríceps', cuadriceps:'Cuádriceps', isquiotibiales:'Isquiotibiales',
  gluteos:'Glúteos', gemelos:'Gemelos', core:'Core'
};

// ── VOLUMEN POR NIVEL (series/semana/músculo) ──
const VOLUME = {
  principiante: { min:8,  max:12, mesos_weeks:4, deload_freq:4  },
  intermedio:   { min:12, max:18, mesos_weeks:6, deload_freq:6  },
  avanzado:     { min:16, max:24, mesos_weeks:8, deload_freq:8  },
};

// ── RIR PROGRESSION ──
function getRIR(week, totalWeeks){
  if(week === totalWeeks) return 'DELOAD';
  const pct = week / (totalWeeks - 1);
  if(pct <= 0.33) return 'RIR 3-4';
  if(pct <= 0.66) return 'RIR 1-2';
  return 'RIR 0-1';
}

// ── STATE ──
let _rbState = {
  step: 1,
  ath: null,
  nivel: 'intermedio',
  diasSemana: 3,
  objetivo: 'hipertrofia',
  duracion: 6,
  prioridades: {},      // {musculo: 'alta'|'media'|'baja'}
  ejercicios: {},       // {dia: [{musculo, ejercicio, series}]}
  plan: null,
};

// ── RENDER MAIN ──
function renderPlanilla(){
  if(!Array.isArray(athletes)||!athletes.length) athletes=typeof DEFAULT_ATHLETES!=='undefined'?DEFAULT_ATHLETES:[];
  const cont = document.getElementById('planilla-root');
  if(!cont) return;

  cont.innerHTML = `
  <div style="padding:20px;max-width:1100px;margin:0 auto">
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;flex-wrap:wrap;gap:12px">
      <div>
        <div style="font-size:18px;font-weight:800;color:var(--text)">📋 Armador de Rutina</div>
        <div style="font-size:13px;color:var(--sub);margin-top:2px">Mesociclo personalizado por nivel y objetivos</div>
      </div>
    </div>

    <!-- Progress steps -->
    <div style="display:flex;align-items:center;gap:0;margin-bottom:24px;overflow-x:auto">
      ${[1,2,3,4].map((s,i,arr)=>{
        const labels=['Alumno','Prioridades','Ejercicios','Plan'];
        const done = _rbState.step > s;
        const active = _rbState.step === s;
        const color = done?'#16a34a':active?'#3b82f6':'#e5e7eb';
        const textColor = done||active?'white':'#9ca3af';
        return `<div style="display:flex;align-items:center;flex:1;min-width:0">
          <div style="display:flex;flex-direction:column;align-items:center;gap:4px;flex:1">
            <div style="width:32px;height:32px;border-radius:50%;background:${color};color:${textColor};display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:700;flex-shrink:0">${done?'✓':s}</div>
            <div style="font-size:11px;color:${active?'var(--text)':'var(--sub)'};font-weight:${active?700:400};white-space:nowrap">${labels[i]}</div>
          </div>
          ${i<arr.length-1?`<div style="height:2px;background:${done?'#16a34a':'#e5e7eb'};flex:1;margin:0 4px;margin-bottom:18px"></div>`:''}
        </div>`;
      }).join('')}
    </div>

    <div id="rb-step-content"></div>
  </div>`;

  rbRenderStep();
}

function rbRenderStep(){
  const cont = document.getElementById('rb-step-content');
  if(!cont) return;
  if(_rbState.step===1) rbStep1(cont);
  else if(_rbState.step===2) rbStep2(cont);
  else if(_rbState.step===3) rbStep3(cont);
  else if(_rbState.step===4) rbStep4(cont);
}

// ── STEP 1: ALUMNO + NIVEL ──
function rbStep1(cont){
  const vol = VOLUME[_rbState.nivel];
  cont.innerHTML = `
  <div style="background:white;border:1px solid var(--border);border-radius:14px;padding:20px;box-shadow:var(--shadow)">
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">

      <div>
        <div style="font-size:12px;font-weight:600;color:var(--sub);margin-bottom:6px">ALUMNO</div>
        <select id="rb-ath" style="width:100%;padding:10px 12px;border:1.5px solid var(--border);border-radius:8px;font-family:inherit;font-size:14px">
          ${athletes.map(a=>`<option value="${a.id}">${a.name}</option>`).join('')}
        </select>
      </div>

      <div>
        <div style="font-size:12px;font-weight:600;color:var(--sub);margin-bottom:6px">OBJETIVO</div>
        <select id="rb-obj" style="width:100%;padding:10px 12px;border:1.5px solid var(--border);border-radius:8px;font-family:inherit;font-size:14px">
          <option value="hipertrofia">Hipertrofia</option>
          <option value="fuerza">Fuerza</option>
          <option value="definicion">Definición / Cutting</option>
          <option value="general">Fitness general</option>
        </select>
      </div>

      <div>
        <div style="font-size:12px;font-weight:600;color:var(--sub);margin-bottom:6px">NIVEL</div>
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px">
          ${['principiante','intermedio','avanzado'].map(n=>`
            <button onclick="rbSetNivel('${n}')" id="rb-niv-${n}"
              style="padding:10px 6px;border-radius:8px;border:1.5px solid ${_rbState.nivel===n?'#3b82f6':'var(--border)'};
              background:${_rbState.nivel===n?'#eff6ff':'white'};color:${_rbState.nivel===n?'#1d4ed8':'var(--text)'};
              font-size:12px;font-weight:600;cursor:pointer;font-family:inherit;text-transform:capitalize">
              ${n}
            </button>`).join('')}
        </div>
      </div>

      <div>
        <div style="font-size:12px;font-weight:600;color:var(--sub);margin-bottom:6px">DÍAS POR SEMANA</div>
        <div style="display:grid;grid-template-columns:repeat(5,1fr);gap:6px">
          ${[2,3,4,5,6].map(d=>`
            <button onclick="rbSetDias(${d})" id="rb-dias-${d}"
              style="padding:10px 4px;border-radius:8px;border:1.5px solid ${_rbState.diasSemana===d?'#3b82f6':'var(--border)'};
              background:${_rbState.diasSemana===d?'#eff6ff':'white'};color:${_rbState.diasSemana===d?'#1d4ed8':'var(--text)'};
              font-size:14px;font-weight:700;cursor:pointer;font-family:inherit">
              ${d}
            </button>`).join('')}
        </div>
      </div>
    </div>

    <!-- Mesocycle config -->
    <div style="margin-top:16px;padding-top:16px;border-top:1px solid var(--border)">
      <div style="font-size:12px;font-weight:600;color:var(--sub);margin-bottom:10px">DURACIÓN DEL MESOCICLO</div>
      <div style="display:flex;gap:8px;flex-wrap:wrap" id="rb-dur-btns">
        ${[4,5,6,7,8].map(w=>`
          <button onclick="rbSetDuracion(${w})" id="rb-dur-${w}"
            style="padding:8px 16px;border-radius:20px;border:1.5px solid ${_rbState.duracion===w?'#16a34a':'var(--border)'};
            background:${_rbState.duracion===w?'#f0fdf4':'white'};color:${_rbState.duracion===w?'#15803d':'var(--text)'};
            font-size:13px;font-weight:600;cursor:pointer;font-family:inherit">
            ${w} semanas${w===4?' (principiante)':w===6?' (intermedio)':w===8?' (avanzado)':''}
          </button>`).join('')}
      </div>
    </div>

    <!-- Volume preview -->
    <div style="margin-top:14px;background:#f9fafb;border-radius:10px;padding:12px" id="rb-vol-preview">
      <div style="font-size:12px;color:var(--sub);margin-bottom:6px">PARÁMETROS SEGÚN NIVEL</div>
      <div style="display:flex;gap:20px;flex-wrap:wrap">
        <div><span style="font-size:13px;font-weight:700;color:var(--text)">${VOLUME[_rbState.nivel].min}–${VOLUME[_rbState.nivel].max}</span> <span style="font-size:12px;color:var(--sub)">series/músculo/semana</span></div>
        <div><span style="font-size:13px;font-weight:700;color:var(--text)">${_rbState.duracion}</span> <span style="font-size:12px;color:var(--sub)">semanas + 1 descarga</span></div>
        <div><span style="font-size:13px;font-weight:700;color:var(--text)">RIR 3→0</span> <span style="font-size:12px;color:var(--sub)">progresión por semana</span></div>
      </div>
    </div>

    <div style="display:flex;justify-content:flex-end;margin-top:16px">
      <button onclick="rbGoStep2()" style="padding:11px 28px;background:#3b82f6;color:white;border:none;border-radius:10px;font-size:14px;font-weight:700;cursor:pointer;font-family:inherit">
        Siguiente → Prioridades
      </button>
    </div>
  </div>`;
}

function rbSetNivel(n){
  _rbState.nivel = n;
  const rec = {principiante:4, intermedio:6, avanzado:8};
  _rbState.duracion = rec[n];
  rbRenderStep();
}
function rbSetDias(d){ _rbState.diasSemana = d; rbRenderStep(); }
function rbSetDuracion(w){ _rbState.duracion = w; rbRenderStep(); }

function rbGoStep2(){
  _rbState.ath = document.getElementById('rb-ath')?.value;
  _rbState.objetivo = document.getElementById('rb-obj')?.value || 'hipertrofia';
  _rbState.step = 2;
  renderPlanilla();
}

// ── STEP 2: PRIORIDADES POR MÚSCULO ──
function rbStep2(cont){
  const muscles = Object.keys(MUSCLE_LABELS);
  if(!Object.keys(_rbState.prioridades).length){
    muscles.forEach(m => _rbState.prioridades[m] = 'media');
  }

  const priorityColors = {alta:'#ef4444', media:'#f59e0b', baja:'#6b7280', none:'#e5e7eb'};
  const priorityLabels = {alta:'Alta', media:'Media', baja:'Baja'};

  cont.innerHTML = `
  <div style="background:white;border:1px solid var(--border);border-radius:14px;padding:20px;box-shadow:var(--shadow)">
    <div style="font-size:14px;font-weight:600;color:var(--text);margin-bottom:4px">¿Qué necesita mejorar el alumno?</div>
    <div style="font-size:13px;color:var(--sub);margin-bottom:16px">Marcá la prioridad de entrenamiento para cada grupo muscular. Los de alta prioridad van primero y tienen más volumen.</div>

    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:10px" id="rb-muscles-grid">
      ${muscles.map(m=>{
        const p = _rbState.prioridades[m]||'media';
        return `
        <div style="border:1.5px solid ${priorityColors[p]};border-radius:10px;padding:12px;background:${priorityColors[p]}08" id="rb-mcard-${m}">
          <div style="font-size:14px;font-weight:700;color:var(--text);margin-bottom:8px">${MUSCLE_LABELS[m]}</div>
          <div style="display:flex;gap:4px">
            ${['alta','media','baja'].map(prio=>`
              <button onclick="rbSetPrio('${m}','${prio}')"
                style="flex:1;padding:5px 4px;border-radius:6px;border:1px solid ${p===prio?priorityColors[prio]:'var(--border)'};
                background:${p===prio?priorityColors[prio]:''};color:${p===prio?'white':'var(--sub)'};
                font-size:11px;font-weight:600;cursor:pointer;font-family:inherit">
                ${priorityLabels[prio]}
              </button>`).join('')}
          </div>
        </div>`;
      }).join('')}
    </div>

    <div style="margin-top:16px;background:#eff6ff;border-radius:10px;padding:12px">
      <div style="font-size:12px;color:#1d4ed8;font-weight:600">💡 Criterio de distribución</div>
      <div style="font-size:12px;color:#3b82f6;margin-top:4px">Alta = ejercicio primero + más series · Media = orden estándar · Baja = al final, menos volumen</div>
    </div>

    <div style="display:flex;justify-content:space-between;margin-top:16px">
      <button onclick="_rbState.step=1;renderPlanilla()" style="padding:10px 20px;border:1px solid var(--border);border-radius:10px;background:white;font-size:14px;cursor:pointer;font-family:inherit">← Atrás</button>
      <button onclick="rbGoStep3()" style="padding:11px 28px;background:#3b82f6;color:white;border:none;border-radius:10px;font-size:14px;font-weight:700;cursor:pointer;font-family:inherit">Siguiente → Ejercicios</button>
    </div>
  </div>`;
}

function rbSetPrio(m, p){
  _rbState.prioridades[m] = p;
  rbStep2(document.getElementById('rb-step-content'));
}

// ── STEP 3: SELECCIÓN DE EJERCICIOS POR DÍA ──
function rbGoStep3(){
  _rbState.step = 3;
  // Auto-generate exercise selection
  _rbState.ejercicios = rbAutoAssign();
  renderPlanilla();
}

function rbAutoAssign(){
  const dias = _rbState.diasSemana;
  const prios = _rbState.prioridades;
  const nivel = _rbState.nivel;
  const vol = VOLUME[nivel];

  // Sort muscles by priority
  const musclesByPrio = {
    alta: Object.keys(prios).filter(m=>prios[m]==='alta'),
    media: Object.keys(prios).filter(m=>prios[m]==='media'),
    baja: Object.keys(prios).filter(m=>prios[m]==='baja'),
  };

  // Determine split
  const split = rbGetSplit(dias, musclesByPrio);
  
  // Assign exercises to each day
  const result = {};
  split.forEach((muscles, dayIdx)=>{
    const dayKey = 'DIA '+(dayIdx+1);
    result[dayKey] = [];
    muscles.forEach(muscle=>{
      const p = prios[muscle]||'media';
      const exList = [...(EXERCISE_DB[muscle]||[])].sort((a,b)=>a.orden-b.orden);
      const numEx = p==='alta'?Math.min(3,exList.length):p==='media'?Math.min(2,exList.length):Math.min(1,exList.length);
      const seriesBase = p==='alta'?Math.round(vol.max*0.35):p==='media'?Math.round(vol.min*0.4):Math.round(vol.min*0.3);
      exList.slice(0,numEx).forEach((ex,i)=>{
        result[dayKey].push({
          musculo: muscle,
          ejercicio: ex,
          series: i===0?Math.ceil(seriesBase/numEx)+1:Math.floor(seriesBase/numEx),
          reps: nivel==='principiante'?'12-15':nivel==='intermedio'?'8-12':'6-10',
          selected: true,
        });
      });
    });
  });
  return result;
}

function rbGetSplit(dias, byPrio){
  const allHigh = byPrio.alta;
  const allMed = byPrio.media;
  const allLow = byPrio.baja;
  const all = [...allHigh,...allMed,...allLow];

  // Simple splits
  const splits = {
    2: [['pecho','triceps','hombros'],['espalda','biceps','cuadriceps','isquiotibiales']],
    3: [['pecho','triceps','hombros'],['espalda','biceps','core'],['cuadriceps','isquiotibiales','gluteos','gemelos']],
    4: [['pecho','triceps'],['espalda','biceps'],['hombros','core'],['cuadriceps','isquiotibiales','gluteos','gemelos']],
    5: [['pecho','triceps'],['espalda','biceps'],['hombros','core'],['cuadriceps','gluteos'],['isquiotibiales','gemelos','biceps']],
    6: [['pecho'],['espalda'],['hombros','core'],['cuadriceps','gluteos'],['isquiotibiales','gemelos'],['biceps','triceps']],
  };
  const baseSplit = splits[dias] || splits[3];
  
  // Re-order: put high priority muscles first in their day
  return baseSplit.map(dayMuscles=>{
    const dayHigh = dayMuscles.filter(m=>allHigh.includes(m));
    const dayMed = dayMuscles.filter(m=>allMed.includes(m));
    const dayLow = dayMuscles.filter(m=>allLow.includes(m));
    const ordered = [...dayHigh,...dayMed,...dayLow];
    return ordered.filter(m=>EXERCISE_DB[m]);
  }).filter(day=>day.length>0);
}

function rbStep3(cont){
  const dias = Object.keys(_rbState.ejercicios);
  cont.innerHTML = `
  <div style="background:white;border:1px solid var(--border);border-radius:14px;padding:20px;box-shadow:var(--shadow)">
    <div style="font-size:14px;font-weight:600;color:var(--text);margin-bottom:4px">Ejercicios por día</div>
    <div style="font-size:13px;color:var(--sub);margin-bottom:16px">La selección es automática según prioridades. Podés cambiar ejercicios o quitar los que no correspondan.</div>

    <div style="display:grid;gap:14px">
      ${dias.map(dia=>{
        const exs = _rbState.ejercicios[dia];
        const totalSeries = exs.filter(e=>e.selected).reduce((t,e)=>t+e.series,0);
        return `
        <div style="border:1px solid var(--border);border-radius:10px;overflow:hidden">
          <div style="background:#fafafa;padding:12px 16px;border-bottom:1px solid var(--border);display:flex;justify-content:space-between;align-items:center">
            <div style="font-size:14px;font-weight:700;color:var(--text)">${dia}</div>
            <div style="font-size:12px;color:var(--sub)">${totalSeries} series totales</div>
          </div>
          ${exs.map((item,i)=>`
          <div style="display:flex;align-items:center;gap:10px;padding:10px 16px;border-bottom:1px solid #f5f5f5;opacity:${item.selected?1:0.5}">
            <input type="checkbox" ${item.selected?'checked':''} onchange="rbToggleEx('${dia}',${i},this.checked)"
              style="width:16px;height:16px;cursor:pointer;flex-shrink:0">
            <div style="flex:1">
              <div style="font-size:13px;font-weight:600;color:var(--text)">${item.ejercicio.name}</div>
              <div style="font-size:11px;color:var(--sub)">${MUSCLE_LABELS[item.musculo]} · ${item.ejercicio.tipo}</div>
            </div>
            <div style="display:flex;align-items:center;gap:6px;flex-shrink:0">
              <button onclick="rbChangeSeries('${dia}',${i},-1)" style="width:24px;height:24px;border:1px solid var(--border);border-radius:6px;background:white;cursor:pointer;font-size:14px">-</button>
              <span style="font-size:13px;font-weight:700;min-width:24px;text-align:center">${item.series}</span>
              <button onclick="rbChangeSeries('${dia}',${i},1)" style="width:24px;height:24px;border:1px solid var(--border);border-radius:6px;background:white;cursor:pointer;font-size:14px">+</button>
              <span style="font-size:11px;color:var(--sub)">series</span>
              <select onchange="rbChangeEx('${dia}',${i},this.value)" style="padding:4px 6px;border:1px solid var(--border);border-radius:6px;font-size:12px;font-family:inherit;max-width:180px">
                ${(EXERCISE_DB[item.musculo]||[]).map(ex=>`<option value="${ex.id}" ${ex.id===item.ejercicio.id?'selected':''}>${ex.name}</option>`).join('')}
              </select>
            </div>
          </div>`).join('')}
        </div>`;
      }).join('')}
    </div>

    <div style="display:flex;justify-content:space-between;margin-top:16px">
      <button onclick="_rbState.step=2;renderPlanilla()" style="padding:10px 20px;border:1px solid var(--border);border-radius:10px;background:white;font-size:14px;cursor:pointer;font-family:inherit">← Atrás</button>
      <button onclick="rbGoStep4()" style="padding:11px 28px;background:#16a34a;color:white;border:none;border-radius:10px;font-size:14px;font-weight:700;cursor:pointer;font-family:inherit">Generar Plan →</button>
    </div>
  </div>`;
}

function rbToggleEx(dia, i, checked){ _rbState.ejercicios[dia][i].selected = checked; rbStep3(document.getElementById('rb-step-content')); }
function rbChangeSeries(dia, i, delta){ _rbState.ejercicios[dia][i].series = Math.max(1,(_rbState.ejercicios[dia][i].series||3)+delta); rbStep3(document.getElementById('rb-step-content')); }
function rbChangeEx(dia, i, exId){
  const m = _rbState.ejercicios[dia][i].musculo;
  const ex = (EXERCISE_DB[m]||[]).find(e=>e.id===exId);
  if(ex) _rbState.ejercicios[dia][i].ejercicio = ex;
}

// ── STEP 4: PLAN GENERADO ──
function rbGoStep4(){
  _rbState.step = 4;
  _rbState.plan = rbGeneratePlan();
  renderPlanilla();
}

function rbGeneratePlan(){
  const totalWeeks = _rbState.duracion + 1; // +1 deload
  const plan = {};

  Object.entries(_rbState.ejercicios).forEach(([dia, exs])=>{
    plan[dia] = exs.filter(e=>e.selected).map(item=>{
      const weekData = {};
      for(let w=1;w<=totalWeeks;w++){
        const isDeload = w===totalWeeks;
        const rir = isDeload?'DELOAD':getRIR(w-1, _rbState.duracion);
        weekData['S'+w] = {
          series: isDeload?Math.ceil(item.series*0.6):item.series,
          reps: item.reps,
          rir,
        };
      }
      return { ...item, weekData, totalWeeks };
    });
  });
  return { dias: plan, duracion: _rbState.duracion, nivel: _rbState.nivel };
}

function rbStep4(cont){
  const plan = _rbState.plan;
  const totalWeeks = _rbState.duracion + 1;
  const a = athletes.find(x=>x.id===_rbState.ath);
  const weekNums = Array.from({length:totalWeeks},(_,i)=>i+1);

  cont.innerHTML = `
  <div style="background:white;border:1px solid var(--border);border-radius:14px;padding:20px;box-shadow:var(--shadow)">
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;flex-wrap:wrap;gap:10px">
      <div>
        <div style="font-size:15px;font-weight:700;color:var(--text)">✅ Plan generado para ${a?.name||'alumno'}</div>
        <div style="font-size:13px;color:var(--sub)">${_rbState.nivel} · ${_rbState.diasSemana} días/semana · ${_rbState.duracion} semanas + deload</div>
      </div>
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        <button onclick="rbSaveToFirebase()" style="padding:9px 18px;background:#16a34a;color:white;border:none;border-radius:8px;font-size:13px;font-weight:700;cursor:pointer;font-family:inherit">💾 Guardar en app</button>
        <button onclick="rbExportXlsx()" style="padding:9px 18px;background:#3b82f6;color:white;border:none;border-radius:8px;font-size:13px;font-weight:700;cursor:pointer;font-family:inherit">📥 Exportar Excel</button>
        <button onclick="_rbState.step=1;_rbState.prioridades={};_rbState.ejercicios={};renderPlanilla()" style="padding:9px 16px;border:1px solid var(--border);border-radius:8px;font-size:13px;cursor:pointer;font-family:inherit;background:white">🔄 Nuevo plan</button>
      </div>
    </div>
    <div id="rb-save-status" style="font-size:13px;margin-bottom:10px;text-align:center"></div>

    <div style="overflow-x:auto">
      ${Object.entries(plan.dias).map(([dia,exs])=>`
      <div style="margin-bottom:24px">
        <div style="font-size:14px;font-weight:800;color:var(--text);padding:8px 0;border-bottom:2px solid #e8ff00;margin-bottom:8px">${dia}</div>
        <table style="width:100%;border-collapse:collapse;font-size:12px;min-width:600px">
          <thead>
            <tr style="background:#fafafa">
              <th style="text-align:left;padding:8px;border:1px solid var(--border);min-width:200px">EJERCICIO</th>
              ${weekNums.map(w=>`<th style="padding:8px;border:1px solid var(--border);text-align:center;min-width:80px;${w===totalWeeks?'background:#fef9c3':''}">SEM ${w}${w===totalWeeks?'<br><span style="font-size:10px;color:#ca8a04">DELOAD</span>':''}</th>`).join('')}
            </tr>
          </thead>
          <tbody>
            ${exs.map(ex=>`
            <tr>
              <td style="padding:8px;border:1px solid var(--border);font-weight:600">${ex.ejercicio.name}<br><span style="font-weight:400;color:var(--sub);font-size:11px">${ex.reps} reps</span></td>
              ${weekNums.map(w=>{
                const wd = ex.weekData['S'+w];
                const rirColor = wd.rir==='DELOAD'?'#ca8a04':wd.rir.includes('3-4')?'#16a34a':wd.rir.includes('1-2')?'#f59e0b':'#ef4444';
                return `<td style="padding:6px 8px;border:1px solid var(--border);text-align:center;${w===totalWeeks?'background:#fefce8':''}">
                  <div style="font-weight:700">${wd.series}×</div>
                  <div style="color:${rirColor};font-size:10px">${wd.rir}</div>
                </td>`;
              }).join('')}
            </tr>
            <tr style="background:#fafafa">
              <td style="padding:4px 8px;border:1px solid var(--border);color:var(--sub);font-size:11px">KG</td>
              ${weekNums.map(w=>`<td style="padding:4px 8px;border:1px solid var(--border)"></td>`).join('')}
            </tr>
            <tr style="background:#fafafa">
              <td style="padding:4px 8px;border:1px solid var(--border);color:var(--sub);font-size:11px">REPS REALES</td>
              ${weekNums.map(w=>`<td style="padding:4px 8px;border:1px solid var(--border)"></td>`).join('')}
            </tr>`).join('')}
          </tbody>
        </table>
      </div>`).join('')}
    </div>

    <div style="background:#f0fdf4;border-radius:10px;padding:12px;margin-top:8px">
      <div style="font-size:12px;font-weight:700;color:#16a34a;margin-bottom:6px">Progresión RIR</div>
      <div style="display:flex;gap:12px;flex-wrap:wrap">
        ${[['RIR 3-4','🟢','Acumulación'],['RIR 1-2','🟡','Intensificación'],['RIR 0-1','🔴','Pico'],['DELOAD','⚪','Descarga']].map(([r,e,l])=>`
          <div style="font-size:12px;color:var(--sub)">${e} <strong>${r}</strong> ${l}</div>`).join('')}
      </div>
    </div>
  </div>`;
}

async function rbSaveToFirebase(){
  if(!_rbState.plan || !_rbState.ath) return;
  const status = document.getElementById('rb-save-status');
  if(status) status.textContent = 'Guardando...';

  // Convert to planilla format compatible with existing system
  const planData = {};
  Object.entries(_rbState.plan.dias).forEach(([dia, exs])=>{
    planData[dia] = exs.map(ex=>({
      name: ex.ejercicio.name,
      musculo: ex.musculo,
      series: ex.series,
      reps: ex.reps,
      rir: ex.weekData['S1']?.rir || 'RIR 3-4',
      weekData: ex.weekData,
    }));
  });

  try{
    await window.db?.collection('plans').doc(_rbState.ath).set({data:JSON.stringify(planData)});
    if(status) status.innerHTML = '<span style="color:#16a34a">✅ Plan guardado. Ya disponible en el bot y la app.</span>';
    toast('✅ Plan guardado para '+athletes.find(a=>a.id===_rbState.ath)?.name);
  }catch(e){
    if(status) status.innerHTML = '<span style="color:#ef4444">Error: '+e.message+'</span>';
  }
}

function rbExportXlsx(){
  if(typeof XLSX === 'undefined'){ toast('SheetJS no disponible'); return; }
  const plan = _rbState.plan;
  const a = athletes.find(x=>x.id===_rbState.ath);
  const totalWeeks = _rbState.duracion + 1;
  const wb = XLSX.utils.book_new();

  Object.entries(plan.dias).forEach(([dia, exs])=>{
    const rows = [];
    rows.push(['','TP 1']);
    rows.push([]);
    rows.push(['',dia,...Array(totalWeeks*2-1).fill('')]);

    // Header row
    const semHeaders = ['','EJERCICIOS'];
    for(let w=1;w<=totalWeeks;w++){
      semHeaders.push(w===totalWeeks?'DELOAD':'SEMANA '+w);
      semHeaders.push('');
    }
    rows.push(semHeaders);

    // Series/Reps header
    const srHeader = ['',''];
    for(let w=1;w<=totalWeeks;w++){ srHeader.push('SERIES','REPS'); }
    rows.push(srHeader);

    exs.forEach(ex=>{
      // Exercise name row
      const exRow = ['',ex.ejercicio.name];
      for(let w=1;w<=totalWeeks;w++){
        const wd = ex.weekData['S'+w];
        exRow.push(wd.series+'X', ex.reps);
      }
      rows.push(exRow);

      // RIR row
      const rirRow = ['','RIR (REPETICIONES EN RESERVA)'];
      for(let w=1;w<=totalWeeks;w++){
        rirRow.push(ex.weekData['S'+w].rir,'');
      }
      rows.push(rirRow);

      // Serie rows (1º, 2º, 3º)
      const numSeries = ex.series || 3;
      for(let s=1;s<=numSeries;s++){
        const sRow = ['',(s===1?'1º':s===2?'2º':'3º')+' SERIE'];
        for(let w=1;w<=totalWeeks;w++){ sRow.push('',''); }
        rows.push(sRow);
      }

      // Pause row
      const pauseRow = ['','TIEMPO DE PAUSA ENTRE SERIES'];
      for(let w=1;w<=totalWeeks;w++){ pauseRow.push("2'00''", ''); }
      rows.push(pauseRow);
      rows.push([]);
    });

    const ws = XLSX.utils.aoa_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, dia);
  });

  XLSX.writeFile(wb, `squad-team-plan-${a?.name?.toLowerCase()||'alumno'}.xlsx`);
  toast('📥 Excel descargado!');
}
