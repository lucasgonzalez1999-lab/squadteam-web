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
async function pbSelectAth(athId){
  _pb.athId=athId; _pb.plan=null;
  const cont=document.getElementById('planilla-root');
  if(cont) cont.innerHTML='<div style="padding:40px;text-align:center;color:var(--sub);font-size:13px">Cargando plan...</div>';
  try{
    const doc=await window.db.collection('plans').doc(athId).get();
    if(doc.exists&&doc.data()?.byDay) _pb.plan=JSON.parse(JSON.stringify(doc.data()));
  }catch(e){}
  if(!_pb.plan){
    const ath=getAth(athId);
    _pb.plan={nombre:`Plan ${ath?.name||athId}`,nivel:'intermedio',diasSemana:3,weeks:6,
      startDate:new Date().toISOString().slice(0,10),byDay:{'Día A':[],'Día B':[],'Día C':[]}};
  }
  _pb.activeDay=Object.keys(_pb.plan.byDay)[0]||'Día A';
  renderPlanilla();
}

// ── MAIN EDITOR ──
function pbRenderEditor(cont){
  const plan=_pb.plan, ath=getAth(_pb.athId);
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
      ${days.map(day=>{
        const active=day===_pb.activeDay;
        return `<button onclick="_pb.activeDay='${day}';pbRefreshEditor()"
          style="flex-shrink:0;display:flex;align-items:center;gap:6px;padding:9px 16px;border-radius:10px;
          border:1.5px solid ${active?color:'var(--border)'};background:${active?color+'18':'var(--surf)'};
          color:${active?color:'var(--text)'};font-size:13px;font-weight:${active?700:500};cursor:pointer;font-family:inherit">
          ${day}
          <span onclick="event.stopPropagation();pbRemoveDay('${day.replace(/'/g,"\\'")}'")"
            style="opacity:.45;font-size:12px;line-height:1;cursor:pointer" title="Eliminar día">✕</span>
        </button>`;
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
  const rir_opts=['RIR 3-4','RIR 2-3','RIR 1-2','RIR 0-1','DELOAD','—'];
  const rows=wl.map(wk=>{
    const wd=ex.weekData?.[wk]||{};
    const isDL=wk==='DL';
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
          ${rir_opts.map(r=>`<option value="${r}" ${(wd.rir||(isDL?'DELOAD':'RIR 2-3'))===r?'selected':''}>${r}</option>`).join('')}
        </select>
      </td>
    </tr>`;
  }).join('');

  return `
  <div style="background:var(--surf);border:1px solid var(--border);border-radius:12px;margin-bottom:10px;overflow:hidden">
    <div style="padding:12px 14px;display:flex;align-items:center;gap:6px;border-bottom:1px solid var(--border)">
      <div style="flex:1;font-size:14px;font-weight:700;color:var(--text)">${ex.name}</div>
      <button onclick="pbMoveEx(${ei},-1)" title="Subir" style="background:none;border:none;cursor:pointer;color:var(--sub);font-size:14px;padding:3px 7px;border-radius:5px;line-height:1">↑</button>
      <button onclick="pbMoveEx(${ei},1)"  title="Bajar" style="background:none;border:none;cursor:pointer;color:var(--sub);font-size:14px;padding:3px 7px;border-radius:5px;line-height:1">↓</button>
      <button onclick="pbRemoveEx(${ei})"  title="Eliminar" style="background:none;border:none;cursor:pointer;color:var(--red);font-size:14px;padding:3px 7px;border-radius:5px;line-height:1">✕</button>
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

function pbRemoveDay(day){
  if(Object.keys(_pb.plan.byDay).length<=1) return;
  if(!confirm(`¿Eliminar ${day} y todos sus ejercicios?`)) return;
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
  if(cont) pbRenderEditor(cont);
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
  }catch(e){
    if(status){status.style.color='var(--red)';status.textContent='Error: '+e.message;}
    if(btn) btn.textContent='💾 Guardar plan';
  }finally{
    if(btn) btn.disabled=false;
  }
}
