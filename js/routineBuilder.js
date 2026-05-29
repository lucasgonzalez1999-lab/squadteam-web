// ══════════════════════════════════════════
// SQUAD TEAM — Routine Builder
// Armador de mesociclos por nivel
// ══════════════════════════════════════════

// ── BASE DE EJERCICIOS ──
const EXERCISE_DB = {
  pecho: [
    {id:'press_banca',        name:'Press Banca',                    tipo:'compuesto', orden:1, eq:'barra'},
    {id:'press_banca_smith',  name:'Press Banca Smith',              tipo:'compuesto', orden:1, eq:'smith'},
    {id:'press_banca_mancuernas', name:'Press Banca con Mancuernas', tipo:'compuesto', orden:1, eq:'mancuerna'},
    {id:'press_inclinado',    name:'Press Inclinado con Barra',      tipo:'compuesto', orden:2, eq:'barra'},
    {id:'press_inc_smith',    name:'Press Inclinado Smith',          tipo:'compuesto', orden:2, eq:'smith'},
    {id:'press_inc_mancuernas', name:'Press Inclinado con Mancuernas', tipo:'compuesto', orden:2, eq:'mancuerna'},
    {id:'press_inc_maq',      name:'Press Inclinado Máquina',        tipo:'compuesto', orden:2, eq:'maquina'},
    {id:'press_plano_maq',    name:'Press Plano Máquina',            tipo:'compuesto', orden:2, eq:'maquina'},
    {id:'press_declinado',    name:'Press Declinado',                tipo:'compuesto', orden:2, eq:'barra'},
    {id:'press_hammer',       name:'Press Hammer',                   tipo:'compuesto', orden:2, eq:'maquina'},
    {id:'apertura_maq',       name:'Apertura en Máquina',            tipo:'aislado',   orden:3, eq:'maquina'},
    {id:'apertura_mancuernas', name:'Apertura con Mancuernas',       tipo:'aislado',   orden:3, eq:'mancuerna'},
    {id:'cross_over',         name:'Crossover Polea',                tipo:'aislado',   orden:3, eq:'polea'},
    {id:'cross_alto',         name:'Crossover Polea Alto',           tipo:'aislado',   orden:3, eq:'polea'},
    {id:'cross_bajo',         name:'Crossover Polea Bajo',           tipo:'aislado',   orden:3, eq:'polea'},
    {id:'pull_over',          name:'Pull Over',                      tipo:'aislado',   orden:4, eq:'mancuerna'},
    {id:'fondos_pecho',       name:'Fondos en Paralelas',            tipo:'compuesto', orden:1, eq:'cuerpo'},
  ],
  espalda: [
    {id:'jalon_prono',        name:'Jalón Agarre Pronado',           tipo:'compuesto', orden:1, eq:'polea'},
    {id:'jalon_neutro',       name:'Jalón Agarre Neutro',            tipo:'compuesto', orden:1, eq:'polea'},
    {id:'jalon_supino',       name:'Jalón Agarre Supino',            tipo:'compuesto', orden:1, eq:'polea'},
    {id:'jalon_unilateral',   name:'Jalón Unilateral',               tipo:'compuesto', orden:2, eq:'polea'},
    {id:'dominadas',          name:'Dominadas',                      tipo:'compuesto', orden:1, eq:'cuerpo'},
    {id:'dominadas_asist',    name:'Dominadas Asistidas',            tipo:'compuesto', orden:1, eq:'maquina'},
    {id:'remo_barra',         name:'Remo con Barra',                 tipo:'compuesto', orden:1, eq:'barra'},
    {id:'remo_barra_z',       name:'Remo con Barra Z',               tipo:'compuesto', orden:1, eq:'barra'},
    {id:'remo_t',             name:'Remo en T',                      tipo:'compuesto', orden:1, eq:'barra'},
    {id:'remo_pendlay',       name:'Remo Pendlay',                   tipo:'compuesto', orden:1, eq:'barra'},
    {id:'remo_yates',         name:'Remo Yates',                     tipo:'compuesto', orden:1, eq:'barra'},
    {id:'remo_invertido',     name:'Remo Invertido',                 tipo:'compuesto', orden:2, eq:'cuerpo'},
    {id:'remo_mancuerna',     name:'Remo con Mancuerna',             tipo:'compuesto', orden:2, eq:'mancuerna'},
    {id:'remo_mancuerna_apoyado', name:'Remo Mancuerna Apoyado',     tipo:'compuesto', orden:2, eq:'mancuerna'},
    {id:'remo_maq_abierto',   name:'Remo Máquina Agarre Abierto',    tipo:'compuesto', orden:2, eq:'maquina'},
    {id:'remo_maq_neutro',    name:'Remo Máquina Agarre Neutro',     tipo:'compuesto', orden:2, eq:'maquina'},
    {id:'remo_maq_supino',    name:'Remo Máquina Agarre Supino',     tipo:'compuesto', orden:2, eq:'maquina'},
    {id:'remo_maq_unilateral', name:'Remo Máquina Unilateral',       tipo:'compuesto', orden:2, eq:'maquina'},
    {id:'remo_hammer',        name:'Remo Hammer',                    tipo:'compuesto', orden:2, eq:'maquina'},
    {id:'remo_polea',         name:'Remo en Polea',                  tipo:'compuesto', orden:2, eq:'polea'},
    {id:'remo_polea_baja',    name:'Remo Polea Baja',                tipo:'compuesto', orden:2, eq:'polea'},
    {id:'remo_polea_alta',    name:'Remo Polea Alta',                tipo:'compuesto', orden:2, eq:'polea'},
    {id:'remo_polea_unilat',  name:'Remo Polea Unilateral',          tipo:'compuesto', orden:2, eq:'polea'},
    {id:'remo_polea_cuerda',  name:'Remo Polea Cuerda',              tipo:'compuesto', orden:2, eq:'polea'},
    {id:'remo_renegado',      name:'Remo Renegado',                  tipo:'compuesto', orden:3, eq:'mancuerna'},
    {id:'pull_down',          name:'Pull Down Polea',                tipo:'aislado',   orden:3, eq:'polea'},
    {id:'pullover_polea',     name:'Pullover en Polea',              tipo:'aislado',   orden:3, eq:'polea'},
    {id:'good_morning',       name:'Good Morning',                   tipo:'compuesto', orden:3, eq:'barra'},
    {id:'hiperextension',     name:'Hiperextensión',                 tipo:'aislado',   orden:3, eq:'cuerpo'},
  ],
  hombros: [
    {id:'press_militar',      name:'Press Militar con Barra',        tipo:'compuesto', orden:1, eq:'barra'},
    {id:'press_militar_smith', name:'Press Militar Smith',           tipo:'compuesto', orden:1, eq:'smith'},
    {id:'press_militar_maq',  name:'Press Militar Máquina',          tipo:'compuesto', orden:1, eq:'maquina'},
    {id:'press_militar_mancuernas', name:'Press Militar con Mancuernas', tipo:'compuesto', orden:1, eq:'mancuerna'},
    {id:'press_arnold',       name:'Press Arnold',                   tipo:'compuesto', orden:1, eq:'mancuerna'},
    {id:'press_landmine',     name:'Press Landmine',                 tipo:'compuesto', orden:2, eq:'barra'},
    {id:'elev_lateral',       name:'Elevación Lateral con Mancuernas', tipo:'aislado', orden:2, eq:'mancuerna'},
    {id:'elev_lat_polea',     name:'Elevación Lateral Polea',        tipo:'aislado',   orden:2, eq:'polea'},
    {id:'elev_lat_maq',       name:'Elevación Lateral Máquina',      tipo:'aislado',   orden:2, eq:'maquina'},
    {id:'elev_frontal',       name:'Elevación Frontal',              tipo:'aislado',   orden:2, eq:'mancuerna'},
    {id:'vuelos_post',        name:'Vuelos Posteriores Máquina',     tipo:'aislado',   orden:3, eq:'maquina'},
    {id:'vuelos_post_polea',  name:'Vuelos Posteriores Polea',       tipo:'aislado',   orden:3, eq:'polea'},
    {id:'vuelos_post_mancuerna', name:'Vuelos Posteriores Mancuerna', tipo:'aislado',  orden:3, eq:'mancuerna'},
    {id:'face_pull',          name:'Face Pull',                      tipo:'aislado',   orden:3, eq:'polea'},
    {id:'encogimiento',       name:'Encogimiento (Trapecio)',        tipo:'aislado',   orden:3, eq:'mancuerna'},
  ],
  biceps: [
    {id:'curl_barra',         name:'Curl con Barra',                 tipo:'aislado',   orden:1, eq:'barra'},
    {id:'curl_barra_z',       name:'Curl Barra Z',                   tipo:'aislado',   orden:1, eq:'barra'},
    {id:'curl_mancuernas',    name:'Curl con Mancuernas',            tipo:'aislado',   orden:2, eq:'mancuerna'},
    {id:'curl_inc_banco',     name:'Curl Inclinado en Banco',        tipo:'aislado',   orden:2, eq:'mancuerna'},
    {id:'curl_concentrado',   name:'Curl Concentrado',               tipo:'aislado',   orden:2, eq:'mancuerna'},
    {id:'curl_polea',         name:'Curl Polea Barra',               tipo:'aislado',   orden:3, eq:'polea'},
    {id:'curl_polea_cuerda',  name:'Curl Polea Cuerda',              tipo:'aislado',   orden:3, eq:'polea'},
    {id:'curl_martillo',      name:'Curl Martillo',                  tipo:'aislado',   orden:3, eq:'mancuerna'},
    {id:'curl_scott',         name:'Curl Scott',                     tipo:'aislado',   orden:3, eq:'barra'},
    {id:'curl_spider',        name:'Curl Spider',                    tipo:'aislado',   orden:3, eq:'mancuerna'},
    {id:'curl_araña_maq',     name:'Curl en Máquina',                tipo:'aislado',   orden:3, eq:'maquina'},
  ],
  triceps: [
    {id:'fondos',             name:'Fondos en Máquina',              tipo:'compuesto', orden:1, eq:'maquina'},
    {id:'fondos_paralelas',   name:'Fondos en Paralelas',            tipo:'compuesto', orden:1, eq:'cuerpo'},
    {id:'press_cerrado',      name:'Press Cerrado',                  tipo:'compuesto', orden:1, eq:'barra'},
    {id:'tric_polea_barra',   name:'Tríceps Polea con Barra',        tipo:'aislado',   orden:2, eq:'polea'},
    {id:'tric_polea_cuerda',  name:'Tríceps Polea con Cuerda',       tipo:'aislado',   orden:2, eq:'polea'},
    {id:'tric_polea_unilat',  name:'Tríceps Polea Unilateral',       tipo:'aislado',   orden:2, eq:'polea'},
    {id:'tric_trasnuca',      name:'Tríceps Trasnuca con Mancuerna', tipo:'aislado',   orden:2, eq:'mancuerna'},
    {id:'tric_trasnuca_polea', name:'Tríceps Trasnuca Polea',        tipo:'aislado',   orden:2, eq:'polea'},
    {id:'tric_frances',       name:'Tríceps Francés',                tipo:'aislado',   orden:3, eq:'barra'},
    {id:'patada_tric',        name:'Patada de Tríceps',              tipo:'aislado',   orden:3, eq:'mancuerna'},
  ],
  cuadriceps: [
    {id:'prensa_45',          name:'Prensa 45°',                     tipo:'compuesto', orden:1, eq:'maquina'},
    {id:'prensa_horizontal',  name:'Prensa Horizontal',              tipo:'compuesto', orden:1, eq:'maquina'},
    {id:'sentadilla_smith',   name:'Sentadilla Smith',               tipo:'compuesto', orden:1, eq:'smith'},
    {id:'sentadilla_libre',   name:'Sentadilla Libre',               tipo:'compuesto', orden:1, eq:'barra'},
    {id:'sentadilla_hack',    name:'Sentadilla Hack',                tipo:'compuesto', orden:1, eq:'maquina'},
    {id:'sentadilla_bulgara', name:'Sentadilla Búlgara',             tipo:'compuesto', orden:2, eq:'mancuerna'},
    {id:'sentadilla_frontal', name:'Sentadilla Frontal',             tipo:'compuesto', orden:1, eq:'barra'},
    {id:'sentadilla_goblet',  name:'Sentadilla Goblet',              tipo:'compuesto', orden:2, eq:'mancuerna'},
    {id:'extension_cuad',     name:'Extensión de Cuádriceps',        tipo:'aislado',   orden:2, eq:'maquina'},
    {id:'zancada_smith',      name:'Zancada en Smith',               tipo:'compuesto', orden:2, eq:'smith'},
    {id:'zancada_mancuernas', name:'Zancada con Mancuernas',         tipo:'compuesto', orden:2, eq:'mancuerna'},
    {id:'paso_banco',         name:'Paso al Banco',                  tipo:'compuesto', orden:2, eq:'mancuerna'},
  ],
  isquiotibiales: [
    {id:'femoral_acostado',   name:'Femoral Acostado',               tipo:'aislado',   orden:1, eq:'maquina'},
    {id:'femoral_sentado',    name:'Femoral Sentado',                tipo:'aislado',   orden:2, eq:'maquina'},
    {id:'femoral_de_pie',     name:'Femoral de Pie',                 tipo:'aislado',   orden:2, eq:'maquina'},
    {id:'peso_muerto',        name:'Peso Muerto',                    tipo:'compuesto', orden:1, eq:'barra'},
    {id:'peso_muerto_rumano', name:'Peso Muerto Rumano',             tipo:'compuesto', orden:1, eq:'barra'},
    {id:'peso_muerto_sumo',   name:'Peso Muerto Sumo',               tipo:'compuesto', orden:1, eq:'barra'},
    {id:'peso_muerto_mancuernas', name:'Peso Muerto con Mancuernas', tipo:'compuesto', orden:1, eq:'mancuerna'},
    {id:'nordic_curl',        name:'Nordic Curl',                    tipo:'aislado',   orden:2, eq:'cuerpo'},
  ],
  gluteos: [
    {id:'hip_thrust',         name:'Hip Thrust',                     tipo:'compuesto', orden:1, eq:'barra'},
    {id:'hip_thrust_maq',     name:'Hip Thrust en Máquina',          tipo:'compuesto', orden:1, eq:'maquina'},
    {id:'glute_bridge',       name:'Glute Bridge',                   tipo:'compuesto', orden:1, eq:'cuerpo'},
    {id:'abductor_maq',       name:'Abductor en Máquina',            tipo:'aislado',   orden:2, eq:'maquina'},
    {id:'aductor_maq',        name:'Aductor en Máquina',             tipo:'aislado',   orden:2, eq:'maquina'},
    {id:'patada_gluteo',      name:'Patada de Glúteo Polea',         tipo:'aislado',   orden:3, eq:'polea'},
    {id:'patada_gluteo_maq',  name:'Patada de Glúteo Máquina',       tipo:'aislado',   orden:3, eq:'maquina'},
    {id:'puente_gluteo',      name:'Puente de Glúteo',               tipo:'aislado',   orden:3, eq:'cuerpo'},
  ],
  gemelos: [
    {id:'gemelo_parado',      name:'Gemelo Parado',                  tipo:'aislado',   orden:1, eq:'maquina'},
    {id:'gemelo_sentado',     name:'Gemelo Sentado',                 tipo:'aislado',   orden:2, eq:'maquina'},
    {id:'gemelo_prensa',      name:'Gemelo en Prensa',               tipo:'aislado',   orden:2, eq:'maquina'},
    {id:'gemelo_burro',       name:'Gemelo Burro',                   tipo:'aislado',   orden:2, eq:'maquina'},
  ],
  core: [
    {id:'abdomen_polea',      name:'Abdomen en Polea',               tipo:'aislado',   orden:1, eq:'polea'},
    {id:'crunch_maq',         name:'Crunch en Máquina',              tipo:'aislado',   orden:2, eq:'maquina'},
    {id:'crunch_inverso',     name:'Crunch Inverso',                 tipo:'aislado',   orden:2, eq:'cuerpo'},
    {id:'plancha',            name:'Plancha',                        tipo:'compuesto', orden:3, eq:'cuerpo'},
    {id:'plancha_lateral',    name:'Plancha Lateral',                tipo:'aislado',   orden:3, eq:'cuerpo'},
    {id:'rueda_abdominal',    name:'Rueda Abdominal',                tipo:'compuesto', orden:3, eq:'cuerpo'},
    {id:'elev_piernas',       name:'Elevación de Piernas',           tipo:'aislado',   orden:2, eq:'cuerpo'},
    {id:'russian_twist',      name:'Russian Twist',                  tipo:'aislado',   orden:3, eq:'mancuerna'},
    {id:'ab_wheel',           name:'Ab Wheel',                       tipo:'compuesto', orden:3, eq:'cuerpo'},
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

// ── PLAN BUILDER STATE ──
let _pb = { athId: null, plan: null, activeDay: null };

// ── HELPERS ──
function pbAllEx(){ return Object.values(EXERCISE_DB).flat(); }
function pbSearchEx(q){
  if(!q||q.length<1) return [];
  const l=q.toLowerCase();
  return pbAllEx().filter(e=>e.name.toLowerCase().includes(l)).slice(0,8);
}
function pbWeekLabels(n){ return [...Array(n||6).keys()].map(i=>'S'+(i+1)).concat(['DL']); }

// ── ENTRY POINT ──
function renderPlanilla(){
  if(!Array.isArray(athletes)||!athletes.length) athletes=typeof DEFAULT_ATHLETES!=='undefined'?DEFAULT_ATHLETES:[];
  const cont=document.getElementById('planilla-root');
  if(!cont) return;
  _pb.athId ? pbRenderEditor(cont) : pbRenderList(cont);
  if(_pb.athId) pbInitDrag();
}

// ── ATHLETE LIST ──
function pbRenderList(cont){
  cont.innerHTML=`
  <div style="padding:20px;max-width:900px;margin:0 auto">
    <div style="font-size:18px;font-weight:800;color:var(--text);margin-bottom:4px">Planes</div>
    <div style="font-size:13px;color:var(--sub);margin-bottom:20px">Seleccioná un alumno para armar o editar su plan</div>
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:10px">
      ${athletes.map(a=>{
        const color=a.color||'#e8ff00';
        return `<button onclick="pbSelectAth('${a.id}')"
          style="padding:16px;background:var(--surf);border:1.5px solid var(--border);border-radius:12px;
          cursor:pointer;text-align:left;font-family:inherit;transition:border-color .15s"
          onmouseover="this.style.borderColor='${color}'" onmouseout="this.style.borderColor='var(--border)'">
          <div style="width:34px;height:34px;border-radius:50%;background:${color};display:flex;align-items:center;
            justify-content:center;font-size:15px;font-weight:800;color:#000;margin-bottom:10px">${(a.name||'?')[0]}</div>
          <div style="font-size:14px;font-weight:700;color:var(--text)">${a.name}</div>
          <div style="font-size:11px;color:var(--sub);margin-top:3px">Editar plan →</div>
        </button>`;
      }).join('')}
    </div>
  </div>`;
}

// ── SELECT ATHLETE ──
function _pbGetAth(id){ return getAth(id)||(typeof COACHES!=='undefined'&&COACHES[id])||null; }

async function pbSelectAth(athId){
  _pb.athId=athId; _pb.plan=null;
  const cont=document.getElementById('planilla-root');
  if(cont) cont.innerHTML='<div style="padding:40px;text-align:center;color:var(--sub);font-size:13px">Cargando plan...</div>';
  try{
    const doc=await window.db.collection('plans').doc(athId).get();
    if(doc.exists&&doc.data()?.byDay) _pb.plan=JSON.parse(JSON.stringify(doc.data()));
  }catch(e){}
  if(!_pb.plan){
    const ath=_pbGetAth(athId);
    _pb.plan={nombre:`Plan ${ath?.name||athId}`,nivel:'intermedio',diasSemana:3,weeks:6,
      startDate:new Date().toISOString().slice(0,10),byDay:{'Día A':[],'Día B':[],'Día C':[]}};
  }
  _pb.activeDay=Object.keys(_pb.plan.byDay)[0]||'Día A';
  renderPlanilla();
}

// ── MAIN EDITOR ──
function pbRenderEditor(cont){
  const plan=_pb.plan, ath=_pbGetAth(_pb.athId);
  const color=ath?.color||'var(--acc)';
  const days=Object.keys(plan.byDay);
  const wl=pbWeekLabels(plan.weeks||6);
  const exs=plan.byDay[_pb.activeDay]||[];

  cont.innerHTML=`
  <div style="max-width:960px;margin:0 auto;padding:16px">

    <!-- Header -->
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:16px;flex-wrap:wrap">
      <button onclick="_pb.athId=null;renderPlanilla()"
        style="background:none;border:none;cursor:pointer;color:var(--sub);font-size:20px;padding:4px 8px;line-height:1">←</button>
      <div style="flex:1">
        <div style="font-size:11px;font-weight:600;color:var(--sub);letter-spacing:.5px">PLAN PARA</div>
        <div style="font-size:17px;font-weight:800;color:var(--text)">${ath?.name||_pb.athId}</div>
      </div>
      <button onclick="pbImportModal()"
        style="padding:10px 16px;background:var(--surf);color:var(--text);border:1.5px solid var(--border);border-radius:10px;font-weight:700;font-size:13px;cursor:pointer;font-family:inherit">
        📥 Importar
      </button>
      <button onclick="pbSave()" id="pb-save-btn"
        style="padding:10px 22px;background:${color};color:#000;border:none;border-radius:10px;font-weight:800;font-size:13px;cursor:pointer;font-family:inherit;letter-spacing:.3px">
        💾 Guardar plan
      </button>
    </div>

    <!-- Plan meta -->
    <div style="background:var(--surf);border:1px solid var(--border);border-radius:12px;padding:14px;margin-bottom:16px">
      <div style="display:flex;gap:12px;flex-wrap:wrap">
        <div style="flex:2;min-width:140px">
          <div style="font-size:10px;font-weight:600;color:var(--sub2);margin-bottom:5px">NOMBRE</div>
          <input value="${plan.nombre||''}" oninput="_pb.plan.nombre=this.value"
            style="width:100%;background:var(--bg);border:1px solid var(--border);border-radius:7px;padding:8px 10px;color:var(--text);font-family:inherit;font-size:13px;font-weight:600;box-sizing:border-box">
        </div>
        <div style="min-width:70px">
          <div style="font-size:10px;font-weight:600;color:var(--sub2);margin-bottom:5px">SEMANAS</div>
          <input type="number" value="${plan.weeks||6}" min="1" max="20"
            oninput="_pb.plan.weeks=parseInt(this.value)||6;pbRefreshEditor()"
            style="width:100%;background:var(--bg);border:1px solid var(--border);border-radius:7px;padding:8px 10px;color:var(--text);font-family:inherit;font-size:13px;font-weight:600;box-sizing:border-box">
        </div>
        <div style="min-width:130px">
          <div style="font-size:10px;font-weight:600;color:var(--sub2);margin-bottom:5px">INICIO</div>
          <input type="date" value="${plan.startDate||''}" oninput="_pb.plan.startDate=this.value"
            style="width:100%;background:var(--bg);border:1px solid var(--border);border-radius:7px;padding:8px 10px;color:var(--text);font-family:inherit;font-size:13px;box-sizing:border-box">
        </div>
        <div style="min-width:110px">
          <div style="font-size:10px;font-weight:600;color:var(--sub2);margin-bottom:5px">NIVEL</div>
          <select oninput="_pb.plan.nivel=this.value"
            style="width:100%;background:var(--bg);border:1px solid var(--border);border-radius:7px;padding:8px 10px;color:var(--text);font-family:inherit;font-size:13px;box-sizing:border-box">
            ${['principiante','intermedio','avanzado'].map(n=>`<option value="${n}" ${plan.nivel===n?'selected':''}>${n}</option>`).join('')}
          </select>
        </div>
      </div>
    </div>

    <!-- Day tabs -->
    <div style="display:flex;gap:6px;margin-bottom:16px;overflow-x:auto;padding-bottom:2px;align-items:center">
      ${days.map((day,di)=>{
        const active=day===_pb.activeDay;
        return `<div style="flex-shrink:0;display:flex;align-items:center;border-radius:10px;
          border:1.5px solid ${active?color:'var(--border)'};background:${active?color+'18':'var(--surf)'}">
          <button onclick="pbSelectDay(${di})"
            style="padding:9px 6px 9px 14px;background:none;border:none;
            color:${active?color:'var(--text)'};font-size:13px;font-weight:${active?700:500};cursor:pointer;font-family:inherit;white-space:nowrap">
            ${day}
          </button>
          <button onclick="pbRemoveDay(${di})"
            style="padding:9px 12px 9px 4px;background:none;border:none;cursor:pointer;
            color:${active?color:'var(--sub)'};font-size:18px;line-height:1;font-family:inherit">×</button>
        </div>`;
      }).join('')}
      <button onclick="pbAddDay()"
        style="flex-shrink:0;padding:9px 14px;border-radius:10px;border:1.5px dashed var(--border);
        background:none;color:var(--sub);font-size:13px;cursor:pointer;font-family:inherit">+ Día</button>
    </div>

    <!-- Exercise list -->
    <div id="pb-exlist">
      ${exs.length===0
        ? `<div style="text-align:center;padding:32px;color:var(--sub);font-size:13px;background:var(--surf);border:1px dashed var(--border);border-radius:12px">
             Sin ejercicios · Buscá abajo para agregar
           </div>`
        : exs.map((ex,ei)=>pbRenderExCard(ex,ei,wl,color)).join('')
      }
    </div>

    <!-- Add exercise -->
    <div style="margin-top:12px;background:var(--surf);border:1px solid var(--border);border-radius:12px;padding:14px">
      <div style="font-size:11px;font-weight:700;color:var(--sub);letter-spacing:.5px;margin-bottom:8px">AGREGAR EJERCICIO</div>
      <div style="position:relative">
        <input id="pb-search" placeholder="Buscar ejercicio..." autocomplete="off"
          oninput="pbShowSearch(this.value)"
          style="width:100%;background:var(--bg);border:1.5px solid var(--border);border-radius:8px;
          padding:11px 14px;color:var(--text);font-family:inherit;font-size:14px;box-sizing:border-box;outline:none"
          onfocus="this.style.borderColor='${color}'" onblur="setTimeout(()=>{const r=document.getElementById('pb-results');if(r)r.style.display='none'},200);this.style.borderColor='var(--border)'">
        <div id="pb-results" style="position:absolute;top:calc(100% + 4px);left:0;right:0;z-index:100;
          background:var(--surf);border:1px solid var(--border);border-radius:10px;overflow:hidden;display:none;
          box-shadow:0 8px 24px rgba(0,0,0,.3)"></div>
      </div>
    </div>

    <div id="pb-status" style="min-height:24px;margin-top:12px;text-align:center;font-size:12px;color:var(--sub)"></div>
  </div>`;
}

function pbRenderExCard(ex, ei, wl, color){
  const base_opts=['RIR 3-4','RIR 2-3','RIR 1-2','RIR 0-1','DELOAD','—'];
  const rows=wl.map(wk=>{
    const wd=ex.weekData?.[wk]||{};
    const isDL=wk==='DL';
    const current=wd.rir||(isDL?'DELOAD':'RIR 2-3');
    // Si el RIR no está en la lista base, agregarlo dinámicamente
    const rir_opts=base_opts.includes(current)?base_opts:[current,...base_opts];
    return `<tr style="border-top:1px solid var(--border)">
      <td style="padding:5px 8px 5px 0;font-size:11px;font-weight:700;color:${isDL?'#ca8a04':color};white-space:nowrap">${wk}</td>
      <td style="padding:4px 3px">
        <input type="number" min="1" max="10" value="${wd.series||3}"
          oninput="pbSetWeek(${ei},'${wk}','series',this.value)"
          style="width:42px;text-align:center;background:var(--bg);border:1px solid var(--border);border-radius:5px;padding:4px 2px;color:var(--text);font-family:inherit;font-size:12px;font-weight:600">
      </td>
      <td style="padding:4px 3px">
        <input type="text" value="${wd.reps||'8-12'}" placeholder="8-12"
          oninput="pbSetWeek(${ei},'${wk}','reps',this.value)"
          style="width:58px;text-align:center;background:var(--bg);border:1px solid var(--border);border-radius:5px;padding:4px 2px;color:var(--text);font-family:inherit;font-size:12px;font-weight:600">
      </td>
      <td style="padding:4px 3px">
        <select oninput="pbSetWeek(${ei},'${wk}','rir',this.value)"
          style="background:var(--bg);border:1px solid var(--border);border-radius:5px;padding:4px 6px;color:var(--text);font-family:inherit;font-size:11px;max-width:90px">
          ${rir_opts.map(r=>`<option value="${r}" ${current===r?'selected':''}>${r}</option>`).join('')}
        </select>
      </td>
    </tr>`;
  }).join('');

  return `
  <div class="pb-ex-card" data-ei="${ei}" style="background:var(--surf);border:1px solid var(--border);border-radius:12px;margin-bottom:10px;overflow:hidden">
    <div style="padding:12px 14px;display:flex;align-items:center;gap:6px;border-bottom:1px solid var(--border)">
      <div class="pb-drag-handle" style="cursor:grab;color:var(--sub2);font-size:22px;padding:8px 10px 8px 4px;touch-action:none;line-height:1;user-select:none;-webkit-user-select:none;-webkit-touch-callout:none">⠿</div>
      <div style="flex:1;font-size:14px;font-weight:700;color:var(--text)">${ex.name}</div>
      <button onclick="pbRemoveEx(${ei})"  title="Eliminar" style="background:none;border:none;cursor:pointer;color:var(--sub);font-size:16px;padding:3px 7px;border-radius:5px;line-height:1">✕</button>
    </div>
    <div style="overflow-x:auto;padding:6px 14px">
      <table style="border-collapse:collapse;min-width:320px">
        <thead><tr>
          <th style="font-size:10px;color:var(--sub2);font-weight:600;padding:3px 8px 3px 0;text-align:left;width:36px">SEM</th>
          <th style="font-size:10px;color:var(--sub2);font-weight:600;padding:3px 3px;text-align:center;width:48px">SER</th>
          <th style="font-size:10px;color:var(--sub2);font-weight:600;padding:3px 3px;text-align:center;width:64px">REPS</th>
          <th style="font-size:10px;color:var(--sub2);font-weight:600;padding:3px 3px;text-align:left">RIR</th>
        </tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
    <div style="padding:6px 14px 12px">
      <input placeholder="Nota técnica (opcional)..." value="${ex.notes||''}"
        oninput="pbSetNote(${ei},this.value)"
        style="width:100%;background:var(--bg);border:1px solid var(--border);border-radius:7px;
        padding:7px 10px;color:var(--text);font-family:inherit;font-size:12px;box-sizing:border-box">
    </div>
  </div>`;
}

// ── SEARCH ──
function pbShowSearch(q){
  const res=document.getElementById('pb-results');
  if(!res) return;
  const matches=pbSearchEx(q);
  if(!matches.length){res.style.display='none';return;}
  res.style.display='block';
  res.innerHTML=matches.map(e=>`
    <button onmousedown="pbAddEx('${e.name.replace(/'/g,"\\'")}');document.getElementById('pb-search').value='';document.getElementById('pb-results').style.display='none'"
      style="width:100%;padding:10px 14px;background:none;border:none;border-bottom:1px solid var(--border);
      text-align:left;cursor:pointer;color:var(--text);font-family:inherit;font-size:13px;display:flex;align-items:center;gap:8px"
      onmouseover="this.style.background='var(--surf2)'" onmouseout="this.style.background='none'">
      <span style="font-weight:600">${e.name}</span>
      <span style="font-size:11px;color:var(--sub);flex-shrink:0">${e.tipo||''} · ${e.eq||''}</span>
    </button>`).join('');
}

// ── MUTATIONS ──
function pbAddDay(){
  const letters='ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const existing=Object.keys(_pb.plan.byDay);
  let i=existing.length;
  let name='Día '+letters[i%26];
  while(_pb.plan.byDay[name]){i++;name='Día '+letters[i%26];}
  _pb.plan.byDay[name]=[];
  _pb.activeDay=name;
  pbRefreshEditor();
}

function pbSelectDay(idx){
  const day=Object.keys(_pb.plan.byDay)[idx];
  if(day){_pb.activeDay=day;pbRefreshEditor();}
}
function pbRemoveDay(idx){
  const days=Object.keys(_pb.plan.byDay);
  if(days.length<=1) return;
  const day=days[idx];
  if(!day) return;
  delete _pb.plan.byDay[day];
  if(_pb.activeDay===day) _pb.activeDay=Object.keys(_pb.plan.byDay)[0];
  pbRefreshEditor();
}

function pbAddEx(name){
  if(!_pb.plan.byDay[_pb.activeDay]) _pb.plan.byDay[_pb.activeDay]=[];
  const wl=pbWeekLabels(_pb.plan.weeks||6);
  const weekData={};
  wl.forEach((wk,i)=>{
    const isDL=wk==='DL';
    weekData[wk]={series:3, reps:isDL?'12-15':'8-12', rir:isDL?'DELOAD':getRIR(i+1,wl.length)};
  });
  _pb.plan.byDay[_pb.activeDay].push({name,notes:'',weekData});
  pbRefreshEditor();
}

function pbRemoveEx(idx){
  _pb.plan.byDay[_pb.activeDay].splice(idx,1);
  pbRefreshEditor();
}

function pbMoveEx(idx,dir){
  const arr=_pb.plan.byDay[_pb.activeDay];
  const ni=idx+dir;
  if(ni<0||ni>=arr.length) return;
  [arr[idx],arr[ni]]=[arr[ni],arr[idx]];
  pbRefreshEditor();
}

function pbSetWeek(exIdx,wk,field,val){
  const ex=_pb.plan.byDay[_pb.activeDay]?.[exIdx];
  if(!ex) return;
  if(!ex.weekData) ex.weekData={};
  if(!ex.weekData[wk]) ex.weekData[wk]={};
  ex.weekData[wk][field]=field==='series'?parseInt(val)||3:val;
}

function pbSetNote(exIdx,val){
  const ex=_pb.plan.byDay[_pb.activeDay]?.[exIdx];
  if(ex) ex.notes=val;
}

// ── REFRESH (without full re-render to preserve input focus) ──
function pbRefreshEditor(){
  const cont=document.getElementById('planilla-root');
  if(cont){ pbRenderEditor(cont); pbInitDrag(); }
}

// ── DRAG-TO-REORDER ──
function pbInitDrag(){
  const list=document.getElementById('pb-exlist');
  if(!list) return;
  let drag=null;

  list.querySelectorAll('.pb-drag-handle').forEach(handle=>{
    handle.addEventListener('pointerdown', startDrag);
  });

  function startDrag(e){
    if(e.button!==0 && e.pointerType==='mouse') return;
    e.preventDefault();
    const card=e.currentTarget.closest('.pb-ex-card');
    if(!card) return;

    e.currentTarget.setPointerCapture(e.pointerId);

    const origEi=parseInt(card.dataset.ei);
    const rect=card.getBoundingClientRect();

    const ph=document.createElement('div');
    ph.style.cssText=`height:${rect.height}px;border-radius:12px;border:2px dashed var(--border);margin-bottom:10px;box-sizing:border-box;flex-shrink:0;`;
    list.insertBefore(ph, card);
    card.style.display='none';

    const fl=card.cloneNode(true);
    fl.style.cssText=`position:fixed;top:${rect.top}px;left:${rect.left}px;width:${rect.width}px;z-index:9999;opacity:.96;box-shadow:0 12px 40px rgba(0,0,0,.55);border-radius:12px;pointer-events:none;transform:scale(1.02);`;
    document.body.appendChild(fl);

    drag={origEi, card, fl, ph, handle:e.currentTarget, y:e.clientY, flTop:rect.top};
    e.currentTarget.addEventListener('pointermove', moveDrag);
    e.currentTarget.addEventListener('pointerup',   endDrag,   {once:true});
    e.currentTarget.addEventListener('pointercancel', endDrag, {once:true});
  }

  function moveDrag(e){
    if(!drag) return;
    const dy=e.clientY - drag.y;
    drag.y=e.clientY;
    drag.flTop+=dy;
    drag.fl.style.top=drag.flTop+'px';

    const mid=drag.flTop+drag.fl.offsetHeight/2;
    const siblings=[...list.querySelectorAll('.pb-ex-card')].filter(c=>c!==drag.card);
    let before=null;
    for(const sib of siblings){
      const r=sib.getBoundingClientRect();
      if(mid < r.top+r.height/2){before=sib;break;}
    }
    if(before) list.insertBefore(drag.ph, before);
    else        list.appendChild(drag.ph);
  }

  function endDrag(){
    if(!drag) return;
    drag.handle.removeEventListener('pointermove', moveDrag);

    const children=[...list.children];
    const phIdx=children.indexOf(drag.ph);
    let newEi=0;
    for(let i=0;i<phIdx;i++){
      if(children[i].classList.contains('pb-ex-card') && children[i]!==drag.card) newEi++;
    }

    const origEi=drag.origEi;
    drag.fl.remove();
    drag.ph.remove();
    drag.card.style.display='';
    drag=null;

    if(newEi!==origEi){
      const arr=_pb.plan.byDay[_pb.activeDay];
      if(arr){
        const [item]=arr.splice(origEi,1);
        arr.splice(newEi,0,item);
        pbRefreshEditor();
        return;
      }
    }
    pbInitDrag();
  }
}

// ── SAVE ──
async function pbSave(){
  const btn=document.getElementById('pb-save-btn');
  const status=document.getElementById('pb-status');
  if(btn){btn.disabled=true;btn.textContent='Guardando...';}
  try{
    const plan=JSON.parse(JSON.stringify(_pb.plan));
    plan.diasSemana=Object.keys(plan.byDay).length;
    await window.db.collection('plans').doc(_pb.athId).set(plan);
    if(status){status.style.color='var(--green)';status.textContent='✓ Plan guardado correctamente';}
    if(btn){btn.textContent='💾 Guardar plan';}
    setTimeout(()=>{if(status)status.textContent='';},3000);
    if(typeof sendPushTo === 'function'){
      const ath = (athletes||[]).find(a=>a.id===_pb.athId);
      swallow(sendPushTo(_pb.athId, 'Plan actualizado', `${ath?.name||'Tenés'} tu plan listo para esta semana`), 'push:plan');
    }
  }catch(e){
    if(status){status.style.color='var(--red)';status.textContent='Error: '+e.message;}
    if(btn) btn.textContent='💾 Guardar plan';
  }finally{
    if(btn) btn.disabled=false;
  }
}

// ── IMPORT FROM SPREADSHEET ──

function pbFuzzyMatchEx(name){
  if(!name||!name.trim()) return name;
  const all=pbAllEx();
  const n=name.toLowerCase().trim();
  let m=all.find(e=>e.name.toLowerCase()===n); if(m) return m.name;
  m=all.find(e=>e.name.toLowerCase().includes(n)); if(m) return m.name;
  m=all.find(e=>n.includes(e.name.toLowerCase())); if(m) return m.name;
  const words=n.split(/[\s\-_/]+/).filter(w=>w.length>3);
  m=all.find(e=>words.some(w=>e.name.toLowerCase().includes(w))); if(m) return m.name;
  return name;
}

function pbNormRIR(val){
  if(!val) return 'RIR 2-3';
  const v=String(val).trim();
  if(v.toUpperCase().startsWith('RIR')) return v;
  if(/^\d/.test(v)) return 'RIR '+v;
  if(v.toLowerCase()==='deload') return 'DELOAD';
  return 'RIR 2-3';
}

function pbImportModal(){
  if(document.getElementById('pb-import-modal')){document.getElementById('pb-import-modal').remove();return;}
  const m=document.createElement('div');
  m.id='pb-import-modal';
  m.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:2000;display:flex;align-items:center;justify-content:center;padding:16px';
  m.innerHTML=`
  <div style="background:var(--bg);border-radius:16px;padding:20px;max-width:520px;width:100%;max-height:85vh;overflow-y:auto">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px">
      <div style="font-size:15px;font-weight:800;color:var(--text)">Importar rutina</div>
      <button onclick="document.getElementById('pb-import-modal').remove()" style="background:none;border:none;font-size:22px;cursor:pointer;color:var(--sub);line-height:1">×</button>
    </div>
    <div style="margin-bottom:14px">
      <div style="font-size:11px;font-weight:700;color:var(--sub);letter-spacing:.4px;margin-bottom:8px">SUBIR ARCHIVO</div>
      <label style="display:block;border:2px dashed var(--border);border-radius:10px;padding:20px;text-align:center;cursor:pointer;transition:.15s"
        onmouseover="this.style.borderColor='var(--acc)'" onmouseout="this.style.borderColor='var(--border)'">
        <input type="file" accept=".xlsx,.xls,.csv" style="display:none" onchange="pbHandleFile(this)">
        <div style="font-size:24px;margin-bottom:6px">📂</div>
        <div style="font-size:13px;font-weight:600;color:var(--text)">Subí tu Excel o CSV</div>
        <div style="font-size:11px;color:var(--sub);margin-top:2px">.xlsx · .xls · .csv</div>
      </label>
    </div>
    <div style="display:flex;align-items:center;gap:8px;margin:12px 0">
      <div style="flex:1;height:1px;background:var(--border)"></div>
      <span style="font-size:11px;color:var(--sub)">o</span>
      <div style="flex:1;height:1px;background:var(--border)"></div>
    </div>
    <div>
      <div style="font-size:11px;font-weight:700;color:var(--sub);letter-spacing:.4px;margin-bottom:8px">GOOGLE SHEETS</div>
      <input id="pb-gs-url" type="url" placeholder="Pegá el link de tu Google Sheet..."
        style="width:100%;padding:10px 12px;border:1.5px solid var(--border);border-radius:8px;background:var(--surf);color:var(--text);font-size:13px;box-sizing:border-box;font-family:inherit;outline:none"
        onfocus="this.style.borderColor='var(--acc)'" onblur="this.style.borderColor='var(--border)'">
      <div style="font-size:11px;color:var(--sub);margin-top:5px;line-height:1.5">
        Debe estar compartido como <b>público</b> o publicado en la web (Archivo → Publicar en la web)
      </div>
      <button onclick="pbFetchGoogleSheet()"
        style="margin-top:8px;width:100%;padding:10px;background:var(--surf);color:var(--text);border:1.5px solid var(--border);border-radius:8px;font-weight:700;font-size:13px;cursor:pointer;font-family:inherit">
        Importar desde Google Sheets
      </button>
    </div>
    <div id="pb-import-preview" style="margin-top:14px"></div>
  </div>`;
  document.body.appendChild(m);
  m.addEventListener('click',e=>{if(e.target===m)m.remove();});
}

async function pbHandleFile(input){
  const file=input.files[0]; if(!file) return;
  const prev=document.getElementById('pb-import-preview');
  prev.innerHTML='<div style="color:var(--sub);font-size:13px;text-align:center;padding:12px">Procesando...</div>';
  try{
    let rows=[];
    if(file.name.toLowerCase().endsWith('.csv')){
      rows=pbParseCSV(await file.text());
    }else{
      if(!window.XLSX){
        prev.innerHTML='<div style="color:var(--sub);font-size:13px;text-align:center;padding:12px">Cargando librería Excel...</div>';
        await new Promise((res,rej)=>{const s=document.createElement('script');s.src='https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';s.onload=res;s.onerror=rej;document.head.appendChild(s);});
      }
      const buf=await file.arrayBuffer();
      const wb=XLSX.read(buf,{type:'array'});
      // Read ALL sheets — each sheet = one training day
      wb.SheetNames.forEach((name,idx)=>{
        const ws=wb.Sheets[name];
        const csv=XLSX.utils.sheet_to_csv(ws);
        const dayName=pbSheetToDay(name,idx);
        const sheetRows=pbParseCSV(csv,dayName);
        rows.push(...sheetRows);
      });
    }
    pbShowImportPreview(rows);
  }catch(e){
    prev.innerHTML=`<div style="color:var(--red);font-size:13px;padding:10px;background:var(--surf);border-radius:8px">Error: ${e.message}</div>`;
  }
}

async function pbFetchGoogleSheet(){
  const url=(document.getElementById('pb-gs-url')?.value||'').trim();
  if(!url){toast('Pegá el link del Google Sheet');return;}
  const prev=document.getElementById('pb-import-preview');
  prev.innerHTML='<div style="color:var(--sub);font-size:13px;text-align:center;padding:12px">Conectando...</div>';
  try{
    const id=(url.match(/spreadsheets\/d\/([a-zA-Z0-9\-_]+)/)||[])[1];
    if(!id) throw new Error('Link inválido. Pegá la URL completa de Google Sheets.');

    // Fetch all sheets by index until one fails or returns empty
    const allRows=[];
    for(let i=0;i<10;i++){
      let resp;
      try{ resp=await fetch(`https://docs.google.com/spreadsheets/d/${id}/gviz/tq?tqx=out:csv&sheet=${i}`); }
      catch(fe){ if(i===0) throw new Error('No se pudo conectar. Intentá descargar como CSV y subir el archivo.'); break; }
      if(!resp.ok) break;
      const text=await resp.text();
      if(!text.trim()||text.length<10) break;
      const dayName=pbSheetToDay(null,i);
      const rows=pbParseCSV(text,dayName);
      if(!rows.length&&i>0) break; // empty sheet = end of tabs
      allRows.push(...rows);
      prev.innerHTML=`<div style="color:var(--sub);font-size:13px;text-align:center;padding:12px">Leyendo hoja ${i+1}...</div>`;
    }
    if(!allRows.length) throw new Error('Acceso denegado o sin ejercicios. Asegurate que el archivo esté compartido públicamente.');
    pbShowImportPreview(allRows);
  }catch(e){
    prev.innerHTML=`<div style="color:var(--red);font-size:13px;padding:10px;background:var(--surf);border-radius:8px;line-height:1.6">
      ${e.message}<br><br>
      <b>Alternativa:</b> En Google Sheets → Archivo → Descargar → Excel y subí el archivo arriba.
    </div>`;
  }
}

// ── SHEET NAME → DAY LABEL ──
function pbSheetToDay(sheetName, idx){
  if(sheetName){
    const n=sheetName.trim();
    // If sheet name already looks like a day label, use it
    if(/^d[íi]a\s*[a-z0-9]/i.test(n)) return n.charAt(0).toUpperCase()+n.slice(1).toLowerCase().replace(/d[íi]a/i,'Día');
    if(/^[a-z]$/i.test(n)) return `Día ${n.toUpperCase()}`;
    if(n.length<=12) return n; // short custom name, keep as-is
  }
  return `Día ${String.fromCharCode(65+idx)}`; // Día A, Día B, Día C...
}

// ── SMART CSV PARSER ──
const _PB_SKIP=[
  // Serie / estructura
  /^[0-9]+[ºoaª°]?\s*serie/i,
  /^rir\s*[\(\[«]/i,
  /^tiempo\s+de\s+pausa/i,
  /^entrada\s+en\s+calor/i,
  /^calentamiento/i,
  /^pausa\s/i,
  /^descanso\b/i,
  /^ejercicios?$/i,
  /^series?$/i,
  /^repeticiones?$/i,
  /^carga$/i,
  /^peso$/i,
  /^d[íi]a\s+[0-9]/i,
  /^semana\s+[0-9]/i,
  /^bloque\s+[0-9]/i,
  /^\s*[-–—x×]+\s*$/,
  /^min(utos?)?\s*[0-9]/i,
  /^[0-9]+\s*min/i,
  // Feedback / encuesta
  /\?/,                          // cualquier pregunta
  /^¿/,                          // pregunta en español
  /^\(/,                         // nota entre paréntesis
  /sensacion/i,
  /motivaci[oó]n/i,
  /recuperaci[oó]n/i,
  /puntuar/i,
  /comentario/i,
  /intensidad/i,
  /ganas\s+de/i,
  /sientes/i,
  /crees\s+haber/i,
  /anterior\s+ses/i,
  /bienestar/i,
  /observaci[oó]n/i,
  /valoraci[oó]n/i,
  /feedback/i,
  /encuesta/i,
];
function _pbSkip(n){ return _PB_SKIP.some(r=>r.test(n.trim())); }
function _pbIsSerie(n){ return /^[0-9]+[ºoaª°]?\s*serie/i.test(n.trim()); }
function _pbKgFromRow(line){
  for(const c of line){
    const v=parseFloat(c);
    if(!isNaN(v)&&v>=5&&v<=500) return v;
  }
  return null;
}
function _pbRirFromRow(line){
  for(const c of line){
    if(/rir\s*[0-9]/i.test(c)) return c.trim();
    if(/^[0-9]\s*[-–]\s*[0-9]$/.test(c.trim())) return 'RIR '+c.trim();
  }
  return null;
}

function pbParseCSV(text, dayOverride=null){
  if(!text||!text.trim()) return [];
  const parseLine=line=>{
    const cols=[];let cur='',inQ=false;
    for(let i=0;i<line.length;i++){
      const c=line[i];
      if(c==='"'){if(inQ&&line[i+1]==='"'){cur+='"';i++;}else inQ=!inQ;}
      else if(c===','&&!inQ){cols.push(cur.trim());cur='';}
      else cur+=c;
    }
    cols.push(cur.trim());
    return cols;
  };
  const lines=text.trim().split('\n').map(parseLine);
  if(lines.length<2) return [];
  const hdr=lines[0].map(h=>h.toLowerCase().replace(/["\s]+/g,' ').trim());
  const ci={
    day:  hdr.findIndex(h=>/d[íi]a|day|bloque|block|split/.test(h)),
    ex:   hdr.findIndex(h=>/ejercicio|exercise|nombre|name/.test(h)),
    sets: hdr.findIndex(h=>/series|sets?\b/.test(h)),
    reps: hdr.findIndex(h=>/reps?|repetici/.test(h)),
    kg:   hdr.findIndex(h=>/^kg$|peso|weight|carga/.test(h)),
    rir:  hdr.findIndex(h=>/rir/.test(h)),
    note: hdr.findIndex(h=>/nota|note|obs|cue/.test(h)),
  };
  if(ci.ex===-1) ci.ex=0;

  const rows=[];
  let currentDay=dayOverride||'Día A';
  let lastRow=null;

  for(let i=1;i<lines.length;i++){
    const line=lines[i];
    if(!line||!line.some(c=>c)) continue;

    const dayVal=ci.day>=0?(line[ci.day]||'').trim():'';
    const exVal=(line[ci.ex]||'').trim();
    const nonEmpty=line.filter(c=>c).length;

    // Day header detection — only when no override
    if(!dayOverride){
      const dayLabel=dayVal||exVal;
      if(nonEmpty<=2&&dayLabel&&(/d[íi]a\s*[a-z0-9]/i.test(dayLabel)||/^[a-z]$/i.test(dayLabel)||/day\s*[a-z]/i.test(dayLabel))){
        currentDay=/d[íi]a/i.test(dayLabel)?dayLabel:`Día ${dayLabel.toUpperCase().trim()}`;
        continue;
      }
      if(dayVal&&dayVal.toLowerCase()!==currentDay.toLowerCase()&&(/d[íi]a/i.test(dayVal)||/^[a-d]$/i.test(dayVal))){
        currentDay=/d[íi]a/i.test(dayVal)?dayVal:`Día ${dayVal.toUpperCase().trim()}`;
      }
    }

    if(!exVal) continue;

    // SERIE row → extract kg and RIR, attach to last exercise
    if(_pbIsSerie(exVal)){
      if(lastRow){
        const kg=_pbKgFromRow(line);
        if(kg) lastRow._serieKgs.push(kg);
        if(!lastRow._rirFound){
          const rir=_pbRirFromRow(line);
          if(rir){lastRow.rir=pbNormRIR(rir);lastRow._rirFound=true;}
        }
      }
      continue;
    }

    // RIR-by-week row → "RIR" / "RIR EN RESERVA" / "RIR (rep en reserva)" en col + valores por columna
    if(lastRow && /^\s*rir\b/i.test(exVal)){
      const perWeek=[];
      // Buscar valores RIR en todas las columnas posteriores al label
      const startCol=Math.max(1,(ci.ex||0)+1);
      for(let cIdx=startCol;cIdx<line.length;cIdx++){
        const v=(line[cIdx]||'').trim();
        if(!v) continue;
        // "2-3", "0-1", "0", "1", "DELOAD", "RIR 2-3", "rir 0-1" → válido
        if(/^(rir\s*)?(\d+\s*[-–]\s*\d+|\d+)$/i.test(v) || /^deload$/i.test(v)){
          perWeek.push(pbNormRIR(v));
        }
      }
      console.log('[sq:import:rir]', lastRow.exercise, '→', perWeek);
      if(perWeek.length>=2){
        lastRow.rir_by_week=perWeek;
        lastRow.rir=perWeek[0];
        lastRow._rirFound=true;
      }
      continue;
    }

    // Skip known non-exercise labels
    if(_pbSkip(exVal)) continue;

    // Skip rows where exVal is clearly not an exercise (all uppercase short label, no match in DB)
    const matched=pbFuzzyMatchEx(exVal);
    if(matched===exVal&&exVal.length<4) continue;

    const row={
      day:currentDay,
      exercise:matched,
      original:exVal,
      sets:ci.sets>=0&&line[ci.sets]?line[ci.sets]:'3',
      reps:ci.reps>=0&&line[ci.reps]?line[ci.reps]:'8-12',
      rir:pbNormRIR(ci.rir>=0?line[ci.rir]:''),
      kg:ci.kg>=0&&line[ci.kg]?parseFloat(line[ci.kg])||'':'',
      note:ci.note>=0?(line[ci.note]||''):'',
      _serieKgs:[],
      _rirFound:!!(ci.rir>=0&&line[ci.rir]),
    };
    if(row.kg) row._serieKgs.push(parseFloat(row.kg));
    rows.push(row);
    lastRow=row;
  }

  // Compute startKg from serie data
  rows.forEach(r=>{
    if(r._serieKgs.length){
      r.startKg=Math.round(r._serieKgs.reduce((s,v)=>s+v,0)/r._serieKgs.length*10)/10;
    }
    delete r._serieKgs;
    delete r._rirFound;
  });

  return rows;
}

// ── PREVIEW & CONFIRM ──
function pbShowImportPreview(rows){
  const prev=document.getElementById('pb-import-preview');
  if(!rows.length){
    prev.innerHTML='<div style="color:var(--red);font-size:13px;padding:10px;background:var(--surf);border-radius:8px">No encontré ejercicios. Verificá el formato del archivo — necesito columnas de Ejercicio, Series y Reps.</div>';
    return;
  }
  const byDay={};
  rows.forEach(r=>{if(!byDay[r.day])byDay[r.day]=[];byDay[r.day].push(r);});
  const days=Object.keys(byDay);
  window._pbImportRows=rows;
  prev.innerHTML=`
    <div style="border-top:1px solid var(--border);padding-top:14px">
      <div style="font-size:13px;font-weight:700;color:var(--green);margin-bottom:10px">
        ✓ Encontré ${rows.length} ejercicios en ${days.length} día${days.length!==1?'s':''}
      </div>
      ${days.map(d=>`
        <div style="margin-bottom:10px">
          <div style="font-size:11px;font-weight:700;color:var(--acc);margin-bottom:5px;letter-spacing:.4px">${d}</div>
          ${byDay[d].map(r=>`
            <div style="font-size:12px;padding:5px 8px;background:var(--surf);border-radius:6px;margin-bottom:3px;display:flex;gap:8px;flex-wrap:wrap;align-items:center">
              <span style="font-weight:700;color:var(--text)">${r.exercise}</span>
              <span style="color:var(--sub)">${r.sets}×${r.reps}</span>
              <span style="color:var(--sub)">${r.rir}</span>
              ${r.startKg?`<span style="color:var(--green);font-weight:600">${r.startKg}kg</span>`:''}
              ${r.original!==r.exercise?`<span style="color:var(--blue);font-size:10px">(original: ${r.original})</span>`:''}
            </div>`).join('')}
        </div>`).join('')}
      <div style="display:flex;gap:8px;margin-top:6px">
        <button onclick="pbConfirmImport(true)"
          style="flex:1;padding:12px;background:var(--acc);color:#000;border:none;border-radius:10px;font-weight:800;font-size:13px;cursor:pointer;font-family:inherit">
          Reemplazar plan →
        </button>
        <button onclick="pbConfirmImport(false)"
          style="flex:1;padding:12px;background:var(--surf);color:var(--text);border:1.5px solid var(--border);border-radius:10px;font-weight:700;font-size:13px;cursor:pointer;font-family:inherit">
          Agregar al plan
        </button>
      </div>
    </div>`;
}

function pbConfirmImport(replace=true){
  const rows=window._pbImportRows||[];
  if(!rows.length||!_pb.plan) return;
  const byDay={};
  rows.forEach(r=>{if(!byDay[r.day])byDay[r.day]=[];byDay[r.day].push(r);});
  const wl=pbWeekLabels(_pb.plan.weeks||6);
  // Replace: wipe existing days and rebuild from import
  if(replace) _pb.plan.byDay={};
  Object.entries(byDay).forEach(([dayName,exs])=>{
    if(!_pb.plan.byDay[dayName]) _pb.plan.byDay[dayName]=[];
    exs.forEach(r=>{
      const weekData={};
      wl.forEach((wk,i)=>{
        const isDL=wk==='DL';
        // Si el archivo trajo RIR por semana, usar ese valor; sino fallback al RIR general o progresión auto
        const rirFromFile=Array.isArray(r.rir_by_week)?r.rir_by_week[i]:null;
        const rir=isDL?'DELOAD':(rirFromFile||r.rir||getRIR(i+1,wl.length));
        weekData[wk]={series:parseInt(r.sets)||3,reps:isDL?'12-15':r.reps||'8-12',rir};
      });
      const ex={name:r.exercise,notes:r.note||'',weekData};
      if(r.startKg) ex.startKg=r.startKg;
      _pb.plan.byDay[dayName].push(ex);
    });
  });
  _pb.plan.diasSemana=Object.keys(_pb.plan.byDay).length;
  _pb.activeDay=Object.keys(_pb.plan.byDay)[0];
  window._pbImportRows=null;
  document.getElementById('pb-import-modal')?.remove();
  pbRefreshEditor();
  toast('✓ Rutina importada');
}
