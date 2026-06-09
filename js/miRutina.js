// ══════════════════════════════════════════
// SQUAD TEAM — Mi Rutina (athlete training log)
// Planilla digital: plan + registro kg/reps por serie
// ══════════════════════════════════════════

// ── STATE ──
let _mrPlan          = null;
let _mrAthId         = null;
let _mrWeek          = 1;
let _mrDay           = null;
let _mrInputs        = {};
let _mrSaved         = false;
let _mrAutoSaveTimer = null;
let _mrReadOnly      = false;
// Sesión activa que se está editando — null si arrancamos una nueva.
// Cuando se setea, mrSave la actualiza en vez de crear una nueva entrada.
let _mrCurrentSessionId = null;
let _mrSyncing       = false;

// ── UNIT HELPERS ──
function _mrUnit(){ return DB.get('units_'+_mrAthId)||getAth(_mrAthId)?.units||'kg'; }
function _fromKg(v){ return _mrUnit()==='lbs'?+(v*2.20462).toFixed(1):+v; }
function _toKg(v){   return _mrUnit()==='lbs'?+(v*0.453592).toFixed(2):+v; }
function _unitLabel(){ return _mrUnit()==='lbs'?'lb':'kg'; }

function mrToggleUnit(){
  const next=_mrUnit()==='kg'?'lbs':'kg';
  const factor=next==='lbs'?2.20462:0.453592;
  Object.values(_mrInputs).forEach(ex=>Object.values(ex).forEach(s=>{
    if(s.kg!=null&&s.kg!=='') s.kg=+(parseFloat(s.kg)*factor).toFixed(1);
  }));
  DB.set('units_'+_mrAthId,next);
  const c=document.getElementById('mi-rutina-content');
  if(c) mrRender(c);
}

// ── ENTRY POINT ──
async function renderMiRutina(){
  const user = currentUser;
  if(!user) return;
  _mrAthId = user.id;

  const cont = document.getElementById('mi-rutina-content');
  if(!cont) return;
  cont.innerHTML = `<div style="text-align:center;padding:40px;color:var(--sub)">Cargando tu rutina...</div>`;

  _mrPlan = await mrLoadPlan(_mrAthId);
  if(!_mrPlan){
    const isCoach = user.role === 'coach';
    cont.innerHTML = `<div class="sq-empty">
      <span class="sq-empty-title">Sin plan todavía</span>
      <span class="sq-empty-sub">Tu coach todavía no cargó tu rutina.</span>
      ${isCoach ? `<button onclick="goSection('planilla',document.querySelector('[data-tab=planilla]'));setTimeout(()=>pbSelectAth('${user.id}'),80)"
        style="margin-top:8px;background:var(--acc);color:#000;border:none;border-radius:12px;padding:14px 28px;font-size:14px;font-weight:900;cursor:pointer;font-family:inherit;letter-spacing:.3px">
        Crear mi plan
      </button>` : ''}
    </div>`;
    return;
  }

  _mrWeek     = mrCurrentWeek(_mrPlan);
  _mrDay      = _mrDay || mrAutoSelectDay(_mrPlan);
  _mrInputs   = {};
  _mrSaved    = false;
  _mrReadOnly = user.role !== 'coach' && getAth(user.id)?.features?.liveMode === false;

  if(typeof initDopamine==='function'){
    const ath=getAth(_mrAthId);
    if(ath?.features?.dopamine||currentUser?.features?.dopamine){
      initDopamine(_mrAthId, ath?.color||currentUser?.color||'var(--acc)');
    }
  }

  await mrLoadTodayDraft();
  _mrCurrentSessionId = null;  // arrancamos limpio al entrar a Mi Rutina

  // Heal "done" state from session data — handles cross-device sync
  // If a session exists for this day+week, mark as done even on a new device
  if(!mrDayIsDone(_mrDay, _mrWeek)){
    const syncedSession = getAthSessions(_mrAthId).find(s => s.dia === _mrDay && s.week === _mrWeek);
    if(syncedSession){
      const doneKey = `mr_done_${_mrAthId}_${_mrWeek}_${_mrDay}`;
      DB.set(doneKey, syncedSession.date || today());
      // Si la sesión synced ya tiene ID, lo cargamos para que un Editar+Save
      // actualice esa misma entrada en lugar de crear una nueva.
      if(syncedSession.id) _mrCurrentSessionId = syncedSession.id;
      // Also restore inputs from the saved session so Editar works correctly
      syncedSession.exercises?.forEach(ex => {
        if(!ex.name) return;
        _mrInputs[ex.name] = {};
        (ex.sets||[]).forEach((s,i) => { _mrInputs[ex.name]['s'+(i+1)] = {kg:_fromKg(s.kg),reps:s.reps}; });
      });
    }
  }

  mrRender(cont);

  // Background re-sync: fetches fresh sessions from Firestore once per navigation.
  // Catches data saved on another device (desktop/mobile) without requiring a full reload.
  if(!_mrSyncing && window.db){
    _mrSyncing = true;
    (async()=>{
      try{
        const snap = await window.db.collection('sessions').doc(_mrAthId).get();
        // Also check Firestore draft for in-progress sessions from other devices
        const fbDraft = snap.data()?.draft;
        if(fbDraft && fbDraft.date===today() && fbDraft.day===_mrDay && fbDraft.week===_mrWeek && !mrDayIsDone(_mrDay,_mrWeek)){
          const hasLocal = Object.values(_mrInputs).some(ex=>Object.values(ex).some(s=>s.kg||s.reps));
          if(!hasLocal){
            _mrInputs = fbDraft.inputs || {};
            const c = document.getElementById('mi-rutina-content');
            if(c) mrRender(c);
          }
        }
        // Check if remote has sessions the local array doesn't
        const remote = _parseArrField(snap.data()?.data||snap.data());
        if(remote && remote.length > (sessions[_mrAthId]||[]).length){
          sessions[_mrAthId] = remote;
          DB.set('sessions', sessions);
          // Heal done state and re-render if this day now has data
          if(!mrDayIsDone(_mrDay, _mrWeek)){
            const ss = remote.find(s=>s.dia===_mrDay&&s.week===_mrWeek);
            if(ss){
              DB.set(`mr_done_${_mrAthId}_${_mrWeek}_${_mrDay}`, ss.date||today());
              _mrInputs = {};
              ss.exercises?.forEach(ex=>{
                if(!ex.name) return;
                _mrInputs[ex.name] = {};
                (ex.sets||[]).forEach((s,i)=>{ _mrInputs[ex.name]['s'+(i+1)]={kg:_fromKg(s.kg),reps:s.reps}; });
              });
              const c = document.getElementById('mi-rutina-content');
              if(c) mrRender(c);
            }
          }
        }
      }catch(e){}
      _mrSyncing = false;
    })();
  }
}

// ── LOAD PLAN ──
async function mrLoadPlan(athId){
  try{
    const doc = await window.db.collection('plans').doc(athId).get();
    if(!doc.exists) return null;
    const docData = doc.data();
    // Support both legacy format ({data: JSON string}) and direct object format
    let plan;
    if(typeof docData?.data === 'string') {
      plan = JSON.parse(docData.data);
    } else {
      plan = docData;
    }
    if(!plan) return null;
    if(plan.dias && !plan.byDay) plan.byDay = plan.dias;
    return plan;
  }catch(e){ return null; }
}

// ── AUTO-SELECT TODAY'S TRAINING DAY ──
function mrAutoSelectDay(plan){
  const days = Object.keys(plan.byDay || {});
  if(!days.length) return null;

  // Si los días son nombres de días de la semana, matchear directo
  const DOW_ES = ['domingo','lunes','martes','miércoles','jueves','viernes','sábado'];
  const todayName = DOW_ES[new Date().getDay()].toLowerCase();
  const dayByName = days.find(d => d.toLowerCase().includes(todayName));
  if(dayByName) return dayByName;

  // Si son numerados (Día 1, Día 2...) o letras (A, B, C...)
  // Rotar por día de la semana laboral (lunes=0...viernes=4), saltear domingo
  const dow = new Date().getDay(); // 0=dom,1=lun...6=sab
  if(dow === 0) return days[0]; // domingo → primer día (descanso probable, pero mostramos el primero)
  const workDay = dow - 1; // lunes=0...sábado=5
  return days[workDay % days.length];
}

// ── CALCULATE CURRENT WEEK ──
function mrCurrentWeek(plan){
  if(!plan.startDate) return 1;
  const start  = new Date(plan.startDate + 'T00:00:00');
  const diff   = Math.floor((new Date() - start) / 86400000);
  const week   = Math.max(1, Math.floor(diff / 7) + 1);
  const total  = (plan.weeks || plan.duracion || 6) + 1; // +1 deload
  return Math.min(week, total);
}

// ── LOAD DRAFT ──
async function mrLoadTodayDraft(){
  const key = `mr_draft_${_mrAthId}_${today()}_${_mrDay}`;
  const local = DB.get(key);
  if(local){ _mrInputs = local; return; }
  // Fallback: Firestore draft (cross-device recovery)
  try{
    const doc = await window.db.collection('sessions').doc(_mrAthId).get();
    const draft = doc.data()?.draft;
    if(draft && draft.date === today() && draft.day === _mrDay && draft.week === _mrWeek){
      _mrInputs = draft.inputs || {};
    }
  }catch(e){}
}
function mrSaveDraft(){
  const key = `mr_draft_${_mrAthId}_${today()}_${_mrDay}`;
  DB.set(key, _mrInputs);
}

// ── MAIN RENDER ──
function mrRender(cont){
  const plan   = _mrPlan;
  const byDay  = plan.byDay || {};
  const days   = Object.keys(byDay);
  const totalWeeks = (plan.weeks || plan.duracion || 6) + 1;
  const color  = getAth(_mrAthId)?.color
    || (typeof COACHES!=='undefined' && COACHES[_mrAthId]?.color)
    || currentUser?.color
    || 'var(--acc)';
  const isDeload = _mrWeek === totalWeeks;

  cont.innerHTML = `
  <div style="max-width:700px;margin:0 auto;padding:16px">

    <!-- Header -->
    <div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:16px;gap:10px">
      <div>
        <div style="font-size:18px;font-weight:800;color:var(--text)">Mi Rutina</div>
        <div style="font-size:13px;color:var(--sub);margin-top:2px">${plan.nivel||'intermedio'} · ${plan.diasSemana||days.length} días/sem · ${totalWeeks-1} semanas</div>
        ${_mrReadOnly?`<div style="font-size:11px;color:var(--sub);margin-top:6px;display:flex;align-items:center;gap:5px">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
          Tu coach registra tus entrenamientos
        </div>`:''}
      </div>
      <div style="display:flex;gap:6px;flex-shrink:0;align-items:flex-start">
        ${!_mrReadOnly?`<button onclick="mrToggleUnit()"
          style="padding:7px 12px;background:var(--surf2);border:1.5px solid var(--border2);border-radius:10px;
          color:var(--text2);font-size:12px;font-weight:700;cursor:pointer;font-family:inherit;white-space:nowrap">
          ${_mrUnit()==='kg'?'kg → lb':'lb → kg'}
        </button>`:''}
        ${currentUser?.role === 'coach'?`
        <button onclick="mrExportDemo()"
          style="padding:7px 12px;background:var(--surf2);border:1.5px solid var(--border2);border-radius:10px;
          color:var(--text2);font-size:12px;font-weight:700;cursor:pointer;font-family:inherit;display:flex;align-items:center;gap:5px">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
          Demo
        </button>
        <button onclick="goSection('planilla',document.querySelector('[data-tab=planilla]'));setTimeout(()=>pbSelectAth('${_mrAthId}'),80)"
          style="padding:7px 12px;background:var(--surf2);border:1.5px solid var(--border2);border-radius:10px;
          color:var(--text2);font-size:12px;font-weight:700;cursor:pointer;font-family:inherit;display:flex;align-items:center;gap:5px">
          ✏️ Editar
        </button>`:''}
      </div>
    </div>

    <!-- Week selector -->
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:16px">
      <div style="font-size:12px;font-weight:600;color:var(--sub);flex-shrink:0">SEMANA</div>
      <div style="display:flex;gap:4px;overflow-x:auto;padding-bottom:2px;flex:1">
        ${Array.from({length:totalWeeks},(_,i)=>i+1).map(w=>{
          const isActive  = w === _mrWeek;
          const isDL      = w === totalWeeks;
          const isDone    = mrWeekIsDone(w);
          return `<button onclick="mrSetWeek(${w})"
            style="flex-shrink:0;padding:6px 12px;border-radius:20px;border:1.5px solid ${isActive?color:'var(--border)'};
            background:${isActive?color:'var(--surf)'};color:${isActive?'white':isDone?'var(--sub)':'var(--text)'};
            font-size:12px;font-weight:${isActive?700:500};cursor:pointer;font-family:inherit;
            text-decoration:${isDone&&!isActive?'line-through':''};opacity:${isDone&&!isActive?0.6:1}">
            ${isDL?'DL':w}
          </button>`;
        }).join('')}
      </div>
      ${isDeload?`<div style="font-size:11px;color:#f59e0b;font-weight:700;flex-shrink:0;background:rgba(245,158,11,.12);border:1px solid rgba(245,158,11,.25);padding:3px 8px;border-radius:10px">DELOAD 60%</div>`:''}
    </div>

    <!-- Day tabs -->
    <div style="display:flex;gap:6px;margin-bottom:16px;overflow-x:auto;padding-bottom:2px">
      ${days.map(day=>{
        const isActive  = day === _mrDay;
        const isDone    = mrDayIsDone(day, _mrWeek);
        const isToday   = day === mrAutoSelectDay(_mrPlan);
        return `<button onclick="mrSetDay('${day}')"
          style="flex-shrink:0;padding:8px 16px;border-radius:10px;border:1.5px solid ${isActive?color:'var(--border)'};
          background:${isActive?color+'15':'var(--surf)'};color:${isActive?color:'var(--text)'};
          font-size:13px;font-weight:${isActive?700:500};cursor:pointer;font-family:inherit;
          display:flex;align-items:center;gap:5px;position:relative">
          ${isDone?`<span style="color:${color}">✓</span>`:''}${day}
          ${isToday&&!isDone?`<span style="font-size:9px;font-weight:800;background:${color};color:white;padding:1px 5px;border-radius:6px;letter-spacing:.5px">HOY</span>`:''}
        </button>`;
      }).join('')}
    </div>

    <!-- Exercises -->
    <div id="mr-exercises">
      ${mrPrefillLastSession(byDay[_mrDay]||[]) || ''}
      ${mrRenderExercises(byDay[_mrDay]||[], _mrWeek, totalWeeks, color)}
    </div>

    <!-- Save button -->
    ${_mrReadOnly ? '' : `
    <div id="mr-save-area" style="margin-top:20px">
      ${mrRenderSaveBtn(color)}
    </div>
    <div id="mr-autosave-status" style="text-align:center;min-height:20px;margin-top:8px"></div>`}

  </div>`;
}

// ── RENDER EXERCISES ──
function mrRenderExercises(exercises, week, totalWeeks, color){
  if(!exercises || !exercises.length)
    return `<div class="sq-empty"><span class="sq-empty-title">Día libre</span><span class="sq-empty-sub">No hay ejercicios asignados para este día.</span></div>`;

  const isDeload = week === totalWeeks;

  return exercises.map((item, ei)=>{
    const ex       = item.ejercicio || item;
    const exName   = ex.name || item.name || item;
    if(!exName) return '';

    // Get weekData from plan — routineBuilder stores it as S1, S2...
    const wd       = item.weekData?.['S'+week] || {};
    const planSeries  = wd.series  || item.series || 3;
    const planReps    = wd.reps    || item.reps   || '8-12';
    const planRir     = isDeload ? 'DELOAD' : (wd.rir || '');
    const rirColor    = !planRir?'var(--sub)':planRir==='DELOAD'?'#ca8a04':planRir.includes('3-4')?'#16a34a':planRir.includes('1-2')?'#f59e0b':'#ef4444';

    // Last week reference
    const lastRef  = mrGetLastWeekRef(exName, week);

    // Progressive overload suggestion
    const overload = (typeof calcOverload==='function' && _mrAthId) ? calcOverload(_mrAthId, exName) : null;

    // Current inputs
    if(!_mrInputs[exName]) _mrInputs[exName] = {};
    const inputs = _mrInputs[exName];
    const athUnit = _mrUnit();
    const inputStep = athUnit === 'lbs' ? 2.5 : 2.5;

    // Series rows
    let seriesHtml = '';
    for(let s=1; s<=planSeries; s++){
      const sKey = 's'+s;
      const val  = inputs[sKey] || {};
      const ordinals = ['1º','2º','3º','4º','5º','6º'];
      const done = !!val.done;

      if(_mrReadOnly){
        seriesHtml += `
        <div style="display:flex;align-items:center;gap:10px;padding:9px 0;border-bottom:1px solid rgba(255,255,255,.06)">
          <div style="font-size:12px;font-weight:700;width:28px;flex-shrink:0;text-align:center;color:var(--text2)">${ordinals[s-1]||s+'º'}</div>
          <div style="font-size:13px;color:var(--text2)">${planReps} reps</div>
          ${planRir?`<div style="font-size:11px;font-weight:700;color:${rirColor};margin-left:auto">RIR ${planRir}</div>`:''}
        </div>`;
      } else {
        seriesHtml += `
        <div id="mr-row-${ei}-${sKey}" style="display:flex;align-items:center;gap:8px;padding:10px 0;border-bottom:1px solid rgba(255,255,255,.06);
          transition:background .2s;background:${done?color+'15':''}">
          <div id="mr-ord-${ei}-${sKey}" style="font-size:12px;font-weight:700;width:28px;flex-shrink:0;display:flex;align-items:center;justify-content:center;color:${done?color:'var(--text2)'}">
            ${done?`<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>`:ordinals[s-1]||s+'º'}
          </div>
          <div style="flex:1;display:flex;gap:8px;align-items:center">
            <div style="flex:1">
              <div style="font-size:10px;font-weight:600;color:var(--text2);margin-bottom:4px;letter-spacing:.4px">${_unitLabel().toUpperCase()}</div>
              <input type="number" step="${inputStep}" min="0" placeholder="${lastRef?_fromKg(lastRef.kg):'0'}"
                value="${val.kg||''}"
                id="mr-${ei}-${sKey}-kg"
                oninput="mrInput('${exName}','${sKey}','kg',this.value)"
                style="width:100%;padding:10px 12px;border:1.5px solid ${val.kg?color:'rgba(255,255,255,.18)'};border-radius:10px;font-size:16px;font-weight:700;font-family:inherit;background:var(--surf2);color:var(--text);outline:none;transition:border .15s"
                onfocus="this.style.borderColor='${color}'" onblur="this.style.borderColor=this.value?'${color}':'rgba(255,255,255,.18)'">
            </div>
            <div style="font-size:18px;color:var(--text2);flex-shrink:0;padding-top:18px;font-weight:300">×</div>
            <div style="flex:1">
              <div style="font-size:10px;font-weight:600;color:var(--text2);margin-bottom:4px;letter-spacing:.4px">REPS</div>
              <input type="number" min="1" placeholder="${planReps?.split('-')[0]||'?'}"
                value="${val.reps||''}"
                id="mr-${ei}-${sKey}-reps"
                oninput="mrInput('${exName}','${sKey}','reps',this.value)"
                style="width:100%;padding:10px 12px;border:1.5px solid ${val.reps?color:'rgba(255,255,255,.18)'};border-radius:10px;font-size:16px;font-weight:700;font-family:inherit;background:var(--surf2);color:var(--text);outline:none;transition:border .15s"
                onfocus="this.style.borderColor='${color}'" onblur="this.style.borderColor=this.value?'${color}':'rgba(255,255,255,.18)'">
            </div>
          </div>
          <button id="mr-chk-${ei}-${sKey}" onclick="mrCheckSet('${exName.replace(/'/g,"\\'")}_','${sKey}',${ei})"
            style="width:36px;height:36px;border-radius:50%;border:2px solid ${done?color:'rgba(255,255,255,.3)'};
            background:${done?color:'rgba(255,255,255,.05)'};display:flex;align-items:center;justify-content:center;
            flex-shrink:0;cursor:pointer;transition:all .2s;-webkit-tap-highlight-color:transparent;margin-top:18px">
            ${done?`<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>`:''}
          </button>
        </div>`;
      }
    }

    return `
    <div style="background:var(--surf);border:1px solid var(--border);border-radius:12px;margin-bottom:12px;overflow:hidden">
      <!-- Exercise header -->
      <div style="padding:12px 14px;border-bottom:1px solid var(--border);display:flex;align-items:flex-start;justify-content:space-between;gap:8px">
        <div>
          <div style="font-size:14px;font-weight:700;color:var(--text)">${exName}</div>
          <div style="font-size:11px;color:var(--sub);margin-top:2px">
            ${planSeries} series · ${planReps} reps
            ${planRir?`· <span style="color:${rirColor};font-weight:600">${planRir}</span>`:''}
          </div>
          ${overload?`<div style="margin-top:5px">
            <span style="display:inline-flex;align-items:center;gap:4px;padding:3px 9px;border-radius:6px;
              background:${overload.color}18;border:1px solid ${overload.color}35;cursor:default"
              title="${overload.reasoning}">
              <span style="font-size:10px;font-weight:700;color:${overload.color}">
                ${overload.action==='increase'?'↑':overload.action==='deload'?'↓':'='} ${overload.label} · ${_fromKg(overload.suggestedKg)}${_unitLabel()}
              </span>
            </span>
          </div>`:''}

        </div>
        <div style="display:flex;flex-direction:column;align-items:flex-end;gap:6px;flex-shrink:0">
          ${lastRef?`<div style="text-align:right">
            <div style="font-size:10px;color:var(--sub2)">sem. anterior</div>
            <div style="font-size:13px;font-weight:700;color:var(--sub)">${_fromKg(lastRef.kg)}${_unitLabel()} × ${lastRef.reps}</div>
          </div>`:''}
          <button onclick="showProgressChart('${_mrAthId}','${exName.replace(/'/g,"\\'")}')"
            title="Ver progreso"
            style="background:none;border:1px solid var(--border);border-radius:7px;padding:4px 8px;cursor:pointer;font-size:14px;color:var(--sub);line-height:1">
            📊
          </button>
        </div>
      </div>
      <!-- Series inputs -->
      <div style="padding:4px 14px 10px">
        ${seriesHtml}
      </div>
    </div>`;
  }).join('');
}

// ── RENDER SAVE BUTTON ──
function mrRenderSaveBtn(color){
  const hasSomething = Object.values(_mrInputs).some(ex=>
    Object.values(ex).some(s=>s.kg||s.reps)
  );
  const alreadySaved = mrDayIsDone(_mrDay, _mrWeek);
  if(alreadySaved){
    return `<div style="background:${color}12;border-radius:14px;border:1.5px solid ${color}35;animation:mrFadeIn .3s ease;overflow:hidden">
      <div style="display:flex;align-items:center;gap:10px;padding:14px 16px 10px">
        <div style="width:26px;height:26px;border-radius:50%;background:${color};display:flex;align-items:center;justify-content:center;flex-shrink:0">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>
        </div>
        <div>
          <div style="font-size:14px;font-weight:700;color:${color}">Entrenamiento guardado</div>
          <div style="font-size:11px;color:var(--sub);margin-top:1px">${_mrDay} · Semana ${_mrWeek}</div>
        </div>
      </div>
      <div style="display:flex;gap:6px;padding:0 12px 12px">
        <button onclick="mrShowStoryOptions()"
          style="flex:1;padding:11px 0;background:${color};border:none;border-radius:10px;color:#000;font-size:13px;font-weight:900;cursor:pointer;font-family:inherit;display:flex;align-items:center;justify-content:center;gap:6px;letter-spacing:.4px">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>
          STORY
        </button>
        <button onclick="mrExportWorkoutImage()"
          style="padding:11px 12px;background:none;border:1px solid var(--border);border-radius:10px;color:var(--text2);font-size:12px;font-weight:600;cursor:pointer;font-family:inherit;display:flex;align-items:center;gap:5px">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
          Resumen
        </button>
        <button onclick="mrUnsave()"
          style="padding:11px 12px;background:none;border:1px solid var(--border);border-radius:10px;color:var(--sub);font-size:12px;cursor:pointer;font-family:inherit">
          Editar
        </button>
      </div>
    </div>`;
  }
  return `<button onclick="mrSave()" ${!hasSomething?'disabled':''} id="mr-save-btn"
    style="width:100%;padding:15px;border:none;border-radius:12px;font-size:15px;font-weight:800;cursor:${hasSomething?'pointer':'default'};font-family:inherit;
    background:${hasSomething?color:'var(--border)'};color:${hasSomething?'white':'var(--sub)'};transition:all .2s;
    display:flex;align-items:center;justify-content:center;gap:8px">
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
    Guardar entrenamiento
  </button>`;
}

// ── CHECK SET ──
function mrCheckSet(exName, sKey, ei){
  if(!_mrInputs[exName]) _mrInputs[exName] = {};
  if(!_mrInputs[exName][sKey]) _mrInputs[exName][sKey] = {};
  const done = !_mrInputs[exName][sKey].done;
  _mrInputs[exName][sKey].done = done;
  mrSaveDraft();
  mrAutoSaveDebounced();

  const color = getAth(_mrAthId)?.color || (typeof COACHES!=='undefined'&&COACHES[_mrAthId]?.color) || currentUser?.color || 'var(--acc)';
  const ordinals = ['1º','2º','3º','4º','5º','6º'];
  const sNum = parseInt(sKey.replace('s','')) - 1;

  const row = document.getElementById('mr-row-'+ei+'-'+sKey);
  const ord = document.getElementById('mr-ord-'+ei+'-'+sKey);
  const btn = document.getElementById('mr-chk-'+ei+'-'+sKey);

  if(row) row.style.background = done ? color+'15' : '';
  if(ord){
    ord.style.color = done ? color : 'var(--text2)';
    ord.innerHTML = done
      ? `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>`
      : ordinals[sNum]||sNum+1+'º';
  }
  if(btn){
    btn.style.background = done ? color : 'rgba(255,255,255,.05)';
    btn.style.borderColor = done ? color : 'rgba(255,255,255,.3)';
    btn.innerHTML = done
      ? `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>`
      : '';
  }

  const saveArea = document.getElementById('mr-save-area');
  if(saveArea) saveArea.innerHTML = mrRenderSaveBtn(color);

  if(done){
    try{
      const cleanEx=exName.replace(/_$/,'');
      const inp=_mrInputs[cleanEx]?.[sKey]||{};
      const displayVal=parseFloat(inp.kg)||0;  // in user's unit
      const reps=parseInt(inp.reps)||0;
      const unit=_unitLabel();
      if(displayVal>0){
        const lastSets=mrGetLastSets(cleanEx);
        const prevMaxDisplay=lastSets?_fromKg(Math.max(0,...lastSets.map(s=>parseFloat(s.kg)||0))):0;
        const sparkDelta=prevMaxDisplay>0?+(displayVal-prevMaxDisplay).toFixed(1):0;
        document.dispatchEvent(new CustomEvent('sq:set:done',{
          detail:{athId:_mrAthId,exercise:cleanEx,kg:displayVal,reps,sparkDelta,unit,rowId:'mr-row-'+ei+'-'+sKey}
        }));
        const prKgStored=mrGetExercisePR(cleanEx);
        const prDisplay=_fromKg(prKgStored);
        if(prDisplay>0&&displayVal>prDisplay){
          const prDate=mrGetExercisePRDate(cleanEx);
          const weeksSince=prDate?Math.floor((Date.now()-new Date(prDate+'T12:00:00'))/604800000):null;
          document.dispatchEvent(new CustomEvent('sq:pr:broken',{
            detail:{athId:_mrAthId,exercise:cleanEx,kg:displayVal,reps,prevKg:prDisplay,weeksSince,unit}
          }));
        }
      }
    }catch(_){}
  }
}

// ── INPUT HANDLER ──
function mrInput(exName, sKey, field, value){
  if(!_mrInputs[exName]) _mrInputs[exName] = {};
  if(!_mrInputs[exName][sKey]) _mrInputs[exName][sKey] = {};
  _mrInputs[exName][sKey][field] = value ? parseFloat(value) || value : '';
  mrSaveDraft();
  mrAutoSaveDebounced();
  const color = getAth(_mrAthId)?.color || (typeof COACHES!=='undefined'&&COACHES[_mrAthId]?.color) || currentUser?.color || 'var(--acc)';
  const saveArea = document.getElementById('mr-save-area');
  if(saveArea) saveArea.innerHTML = mrRenderSaveBtn(color);
}

// ── AUTO-SAVE TO FIREBASE (debounced 1.5s) ──
function mrAutoSaveDebounced(){
  clearTimeout(_mrAutoSaveTimer);
  _mrShowAutoSaveStatus('pending');
  _mrAutoSaveTimer = setTimeout(()=> mrAutoSaveFirebase(), 1500);
}

async function mrAutoSaveFirebase(){
  if(!_mrAthId || !_mrDay) return;
  const hasData = Object.values(_mrInputs).some(ex => Object.values(ex).some(s => s.kg || s.reps));
  if(!hasData) return;
  try{
    _mrShowAutoSaveStatus('saving');
    await window.db.collection('sessions').doc(_mrAthId).set({
      draft: { date: today(), day: _mrDay, week: _mrWeek, inputs: _mrInputs }
    }, { merge: true });
    _mrShowAutoSaveStatus('saved');
  }catch(e){
    _mrShowAutoSaveStatus('offline');
  }
}

function _mrShowAutoSaveStatus(state){
  const el = document.getElementById('mr-autosave-status');
  if(!el) return;
  const styles = 'font-size:11px;font-weight:500;';
  if(state === 'pending')  el.innerHTML = '';
  if(state === 'saving')   el.innerHTML = `<span style="${styles}color:var(--sub)">Guardando borrador...</span>`;
  if(state === 'saved')    el.innerHTML = `<span style="${styles}color:var(--sub)">● Borrador guardado en la nube</span>`;
  if(state === 'offline')  el.innerHTML = `<span style="${styles}color:var(--sub)">Guardado en este dispositivo</span>`;
}

// ── SAVE SESSION ──
async function mrSave(){
  // Spinner feedback
  const btn = document.getElementById('mr-save-btn');
  if(btn){ btn.disabled = true; btn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="animation:mrSpin 1s linear infinite"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg> Guardando...'; }

  const byDay = _mrPlan.byDay || {};
  const dayExercises = byDay[_mrDay] || [];
  const exList = [];

  dayExercises.forEach(item=>{
    const ex     = item.ejercicio || item;
    const exName = ex.name || item.name || item;
    if(!exName) return;
    const inp    = _mrInputs[exName] || {};
    const sets   = [];
    const planSeries = (item.weekData?.['S'+_mrWeek]?.series || item.series || 3);
    for(let s=1; s<=planSeries; s++){
      const v = inp['s'+s] || {};
      if(v.kg || v.reps) sets.push({ kg: _toKg(parseFloat(v.kg)||0), reps: parseInt(v.reps)||0 });
    }
    if(sets.length) exList.push({ name: exName, sets });
  });

  if(!exList.length){ toast('Completá al menos un set antes de guardar'); return; }

  // Si hay un coach asumiendo la identidad del alumno (modo entrenar presencial)
  // y NO es self-entreno (_coachOriginalProfile.id !== _mrAthId), taggear la fuente.
  const coachOrig = window._coachOriginalProfile;
  const isCoachTraining = coachOrig && coachOrig.role === 'coach' && coachOrig.id !== _mrAthId;

  // ID único por sesión para preservar historial. En modo coach-presencial usamos
  // timestamp para que cada save acumule en vez de pisarse. En modo self-entreno
  // del alumno mantenemos un ID determinístico (un save por día) para que editar
  // y volver a guardar siga reemplazando la misma entrada.
  // Si la sesión actual ya tiene un sessionId cargado (estamos editando), lo reusamos.
  const sessionId = _mrCurrentSessionId
    || (isCoachTraining ? `${today()}_${_mrDay}_${Date.now()}` : `${today()}_${_mrDay}`);

  const sessionObj = {
    id:     sessionId,
    date:   today(),
    name:   _mrDay,
    dia:    _mrDay,
    week:   _mrWeek,
    source: isCoachTraining ? 'coach-presencial' : 'web',
    exercises: exList,
  };
  if(isCoachTraining){
    sessionObj.coachId = coachOrig.id;
    sessionObj.coachName = coachOrig.name;
  }

  // Save to global sessions array. Filtro nuevo: matcheamos por ID si lo tiene,
  // y como fallback para sesiones viejas sin ID, por date+dia (solo en self mode
  // para no pisar la historia de coach-presencial).
  const existing = getAthSessions(_mrAthId);
  const withoutThis = existing.filter(s => {
    if(s.id && sessionObj.id) return s.id !== sessionObj.id;
    if(s.id) return true; // tiene ID distinto, conservar
    // Sesión legacy sin ID: solo reemplazar si es self-mode (no coach-presencial)
    if(isCoachTraining) return true;
    return !(s.date === today() && s.dia === _mrDay);
  });
  const updated = [sessionObj, ...withoutThis];
  sessions[_mrAthId] = updated;
  DB.set('sessions', sessions);
  _mrCurrentSessionId = sessionId;
  const fbOk = await fbSet('sessions', _mrAthId, { data: JSON.stringify(updated) });

  // Mark as done in localStorage
  const doneKey = `mr_done_${_mrAthId}_${_mrWeek}_${_mrDay}`;
  DB.set(doneKey, today());

  // Clear draft
  DB.del(`mr_draft_${_mrAthId}_${today()}_${_mrDay}`);
  clearTimeout(_mrAutoSaveTimer);
  window.db.collection('sessions').doc(_mrAthId).set({ draft: null }, { merge: true }).catch(()=>{});
  _mrSaved = true;

  toast(fbOk ? _mrDay + ' guardado — semana ' + _mrWeek : 'Guardado localmente (sin conexión)');
  try{
    const vol=exList.reduce((t,ex)=>t+ex.sets.reduce((s,set)=>s+(parseFloat(set.kg)||0)*(parseInt(set.reps)||0),0),0);
    document.dispatchEvent(new CustomEvent('sq:session:saved',{
      detail:{
        athId:_mrAthId,
        volume:Math.round(vol),
        sets:exList.reduce((t,ex)=>t+ex.sets.length,0),
        exercises:exList.length,
        fbOk,
        weekdayAvg:mrGetWeekdayAvg()
      }
    }));
  }catch(_){}
  const cont = document.getElementById('mi-rutina-content');
  if(cont) mrRender(cont);
}

function mrUnsave(){
  const doneKey = `mr_done_${_mrAthId}_${_mrWeek}_${_mrDay}`;
  DB.del(doneKey);
  _mrSaved = false;
  const cont = document.getElementById('mi-rutina-content');
  if(cont) mrRender(cont);
}

// ── WEEK / DAY DONE CHECK ──
function mrWeekIsDone(week){
  const byDay = _mrPlan?.byDay || {};
  return Object.keys(byDay).every(day => mrDayIsDone(day, week));
}
function mrDayIsDone(day, week){
  const doneKey = `mr_done_${_mrAthId}_${week}_${day}`;
  return !!DB.get(doneKey);
}

// ── GET ALL SETS FROM MOST RECENT SESSION ──
function mrGetLastSets(exName){
  const ss = getAthSessions(_mrAthId).sort((a,b)=>new Date(b.date)-new Date(a.date));
  for(const s of ss){
    const ex = (s.exercises||[]).find(e=>e.name===exName);
    if(ex?.sets?.length) return ex.sets;
  }
  return null;
}

// ── DOPAMINE HELPERS ──
function mrGetExercisePR(exName){
  let max=0;
  (getAthSessions(_mrAthId)||[]).forEach(s=>{
    (s.exercises||[]).filter(e=>e.name===exName).forEach(ex=>{
      (ex.sets||[]).forEach(st=>{const k=parseFloat(st.kg)||0;if(k>max)max=k;});
    });
  });
  return max;
}
function mrGetExercisePRDate(exName){
  let max=0,date=null;
  (getAthSessions(_mrAthId)||[]).sort((a,b)=>new Date(b.date)-new Date(a.date)).forEach(s=>{
    (s.exercises||[]).filter(e=>e.name===exName).forEach(ex=>{
      (ex.sets||[]).forEach(st=>{const k=parseFloat(st.kg)||0;if(k>max){max=k;date=s.date;}});
    });
  });
  return date;
}
function mrGetWeekdayAvg(){
  const dow=new Date().getDay();
  const prev=(getAthSessions(_mrAthId)||[])
    .filter(s=>s.dia===_mrDay&&new Date(s.date+'T12:00:00').getDay()===dow)
    .sort((a,b)=>new Date(b.date)-new Date(a.date)).slice(0,4);
  if(!prev.length) return null;
  const vols=prev.map(s=>(s.exercises||[]).reduce((t,ex)=>t+(ex.sets||[]).reduce((ts,set)=>ts+(parseFloat(set.kg)||0)*(parseInt(set.reps)||0),0),0));
  return Math.round(vols.reduce((a,b)=>a+b,0)/vols.length);
}

// ── PREFILL INPUTS FROM LAST SESSION ──
function mrPrefillLastSession(exercises){
  for(const item of (exercises||[])){
    const exName = (item.ejercicio||item)?.name || item.name || item;
    if(!exName) continue;
    if(!_mrInputs[exName]) _mrInputs[exName] = {};
    const hasData = Object.values(_mrInputs[exName]).some(v=>v.kg||v.reps);
    if(hasData) continue;
    const lastSets = mrGetLastSets(exName);
    if(!lastSets) continue;
    const wd = item.weekData?.['S'+_mrWeek] || {};
    const planSeries = wd.series || item.series || 3;
    for(let i=0; i<Math.min(planSeries, lastSets.length); i++){
      _mrInputs[exName]['s'+(i+1)] = { kg: lastSets[i].kg||'', reps: lastSets[i].reps||'' };
    }
  }
}

// ── LAST WEEK REFERENCE ──
function mrGetLastWeekRef(exName, week){
  if(week <= 1) return null;
  const ss = getAthSessions(_mrAthId);
  for(const s of ss){
    if(s.week !== week - 1 && s.dia !== _mrDay) continue;
    const ex = (s.exercises||[]).find(e=>e.name===exName);
    if(ex?.sets?.length){
      const maxSet = ex.sets.reduce((best,s)=> (s.kg||0)>(best.kg||0)?s:best, ex.sets[0]);
      return { kg: maxSet.kg||0, reps: maxSet.reps||0 };
    }
  }
  // Fallback: find any recent session with this exercise
  for(const s of ss.sort((a,b)=>new Date(b.date)-new Date(a.date))){
    const ex = (s.exercises||[]).find(e=>e.name===exName);
    if(ex?.sets?.length){
      const maxSet = ex.sets.reduce((best,sv)=> (sv.kg||0)>(best.kg||0)?sv:best, ex.sets[0]);
      return { kg: maxSet.kg||0, reps: maxSet.reps||0 };
    }
  }
  return null;
}

// ── NAVIGATION ──
async function mrSetWeek(w){
  _mrWeek  = w;
  _mrInputs = {};
  _mrCurrentSessionId = null;
  clearTimeout(_mrAutoSaveTimer);
  await mrLoadTodayDraft();
  const cont = document.getElementById('mi-rutina-content');
  if(cont) mrRender(cont);
}
async function mrSetDay(day){
  _mrDay   = day;
  _mrInputs = {};
  _mrCurrentSessionId = null;
  clearTimeout(_mrAutoSaveTimer);
  await mrLoadTodayDraft();
  const cont = document.getElementById('mi-rutina-content');
  if(cont) mrRender(cont);
}

// ── EXPORT WORKOUT IMAGE ──
function mrExportDemo(){ mrExportStory(null, true); }

async function mrExportWorkoutImage(){
  const ath   = getAth(_mrAthId) || (typeof COACHES!=='undefined' && COACHES[_mrAthId]) || currentUser;
  const color = ath?.color || 'var(--acc)';
  const resolvedColor = color.startsWith('var(') ? '#e8ff00' : color;

  // Build exercise list from last saved session
  const session = getAthSessions(_mrAthId).find(s => s.dia === _mrDay && s.week === _mrWeek && s.date === today());
  const exItems = [];

  (session?.exercises || []).forEach(ex => {
    if(!ex.name || !ex.sets?.length) return;
    const doneSets = ex.sets.filter(s => s.kg || s.reps);
    if(!doneSets.length) return;
    exItems.push({ name: ex.name, sets: doneSets });
  });

  if(!exItems.length){ toast('Sin datos para exportar'); return; }

  await _mrDrawWorkoutCanvas({
    athName: (ath?.name || _mrAthId || '').toUpperCase(),
    day: _mrDay, week: _mrWeek, resolvedColor, exItems, isDemo: false
  });
}

async function _mrDrawWorkoutCanvas({ athName, day, week, resolvedColor, exItems, isDemo }){

  const W = 1080;
  const MARGIN = 72;
  const HEADER_H = 300;
  const EX_HEADER = 52;
  const SET_ROW   = 38;
  const FOOTER_H  = 100;
  const GAP       = 14;

  const exBlockHeights = exItems.map(ex => EX_HEADER + ex.sets.length * SET_ROW + GAP);
  const exTotalH = exBlockHeights.reduce((a, b) => a + b, 0);
  const H = Math.max(1080, HEADER_H + exTotalH + FOOTER_H + 40);

  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d');

  // ── Background ──
  ctx.fillStyle = '#07070a';
  ctx.fillRect(0, 0, W, H);

  // Grid
  ctx.strokeStyle = 'rgba(255,255,255,.03)';
  ctx.lineWidth = 1;
  for(let x = 0; x < W; x += 80){ ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,H); ctx.stroke(); }
  for(let y = 0; y < H; y += 80){ ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(W,y); ctx.stroke(); }

  // Accent strip top
  ctx.fillStyle = resolvedColor;
  ctx.fillRect(0, 0, W, 6);

  // Noise grain
  const imgData = ctx.getImageData(0, 0, W, H);
  const buf = imgData.data;
  for(let i = 0; i < buf.length; i += 4){
    const n = (Math.random() - .5) * 8;
    buf[i]   = Math.min(255, Math.max(0, buf[i]   + n));
    buf[i+1] = Math.min(255, Math.max(0, buf[i+1] + n));
    buf[i+2] = Math.min(255, Math.max(0, buf[i+2] + n));
  }
  ctx.putImageData(imgData, 0, 0);

  // ── Header ──
  ctx.fillStyle = 'rgba(255,255,255,.18)';
  ctx.font = '700 22px Inter,system-ui,sans-serif';
  ctx.letterSpacing = '6px';
  ctx.fillText('SQUAD TEAM', MARGIN, 86);
  ctx.letterSpacing = '0px';

  ctx.fillStyle = '#ffffff';
  ctx.font = '900 italic 96px "Barlow Condensed",Impact,sans-serif';
  let fs = 96;
  while(ctx.measureText(athName).width > W - MARGIN*2 - 20 && fs > 40){
    fs -= 4;
    ctx.font = `900 italic ${fs}px "Barlow Condensed",Impact,sans-serif`;
  }
  ctx.fillText(athName, MARGIN, 196);

  // Day + week + date
  const dateStr = new Date().toLocaleDateString('es-UY',{day:'2-digit',month:'short',year:'numeric'}).toUpperCase();
  ctx.fillStyle = 'rgba(255,255,255,.5)';
  ctx.font = '500 30px Inter,system-ui,sans-serif';
  ctx.fillText(`${day.toUpperCase()} · SEMANA ${week} · ${dateStr}`, MARGIN, 248);

  // Total volume
  const totalVol = exItems.reduce((tot, ex) => tot + ex.sets.reduce((s, set) => s + (set.kg||0)*(set.reps||0), 0), 0);
  if(totalVol > 0){
    ctx.fillStyle = resolvedColor;
    ctx.font = '700 22px Inter,system-ui,sans-serif';
    ctx.letterSpacing = '2px';
    const volStr = `VOL TOTAL ${totalVol.toLocaleString('es')} KG`;
    const volW = ctx.measureText(volStr).width;
    ctx.fillText(volStr, W - MARGIN - volW, 248);
    ctx.letterSpacing = '0px';
  }

  // Accent divider
  ctx.fillStyle = resolvedColor;
  ctx.fillRect(MARGIN, 272, W - MARGIN*2, 3);

  // ── Exercises ──
  let curY = HEADER_H;
  const ordinals = ['1º','2º','3º','4º','5º','6º','7º','8º'];

  exItems.forEach((ex, ei) => {
    // Exercise name
    ctx.fillStyle = 'rgba(255,255,255,.9)';
    ctx.font = '700 34px Inter,system-ui,sans-serif';
    let exLabel = ex.name;
    const maxNameW = W - MARGIN*2 - 120;
    while(ctx.measureText(exLabel).width > maxNameW && exLabel.length > 4) exLabel = exLabel.slice(0,-1);
    if(exLabel !== ex.name) exLabel += '…';
    ctx.fillText(exLabel, MARGIN, curY + 38);

    // Set count badge
    ctx.fillStyle = resolvedColor + '22';
    const badge = `${ex.sets.length} sets`;
    ctx.font = '600 20px Inter,system-ui,sans-serif';
    const bw = ctx.measureText(badge).width + 20;
    ctx.beginPath();
    ctx.roundRect(W - MARGIN - bw, curY + 14, bw, 30, 6);
    ctx.fill();
    ctx.fillStyle = resolvedColor;
    ctx.textAlign = 'center';
    ctx.fillText(badge, W - MARGIN - bw/2, curY + 34);
    ctx.textAlign = 'left';

    curY += EX_HEADER;

    // Set rows
    ex.sets.forEach((set, si) => {
      const rowY = curY + si * SET_ROW;

      // Ordinal
      ctx.fillStyle = 'rgba(255,255,255,.3)';
      ctx.font = '600 22px Inter,system-ui,sans-serif';
      ctx.fillText(ordinals[si] || (si+1)+'º', MARGIN, rowY + 26);

      // Separator dot
      ctx.fillStyle = 'rgba(255,255,255,.12)';
      ctx.beginPath();
      ctx.arc(MARGIN + 68, rowY + 18, 3, 0, Math.PI*2);
      ctx.fill();

      // kg × reps
      const kgStr  = set.kg  ? set.kg+'kg'  : '—';
      const repStr = set.reps ? '×'+set.reps : '';

      ctx.font = '800 italic 36px "Barlow Condensed",Impact,sans-serif';
      ctx.fillStyle = '#ffffff';
      ctx.fillText(kgStr, MARGIN + 84, rowY + 30);

      if(repStr){
        const kgMeasure = ctx.measureText(kgStr).width;
        ctx.font = '600 26px Inter,system-ui,sans-serif';
        ctx.fillStyle = 'rgba(255,255,255,.45)';
        ctx.fillText(repStr, MARGIN + 84 + kgMeasure + 10, rowY + 28);
      }

      // Row separator
      if(si < ex.sets.length - 1){
        ctx.fillStyle = 'rgba(255,255,255,.04)';
        ctx.fillRect(MARGIN + 80, rowY + SET_ROW - 2, W - MARGIN*2 - 80, 1);
      }
    });

    curY += ex.sets.length * SET_ROW + GAP;

    // Exercise separator
    if(ei < exItems.length - 1){
      ctx.fillStyle = 'rgba(255,255,255,.06)';
      ctx.fillRect(MARGIN, curY - GAP/2, W - MARGIN*2, 1);
    }
  });

  // ── Footer ──
  const footY = H - 52;
  ctx.fillStyle = 'rgba(255,255,255,.12)';
  ctx.font = '700 18px Inter,system-ui,sans-serif';
  ctx.letterSpacing = '4px';
  ctx.fillText('SQUAD TEAM · COACH OS', MARGIN, footY);
  ctx.letterSpacing = '0px';

  ctx.fillStyle = 'rgba(255,255,255,.2)';
  ctx.font = '400 18px Inter,system-ui,sans-serif';
  const ds = dateStr;
  const dw = ctx.measureText(ds).width;
  ctx.fillText(ds, W - MARGIN - dw, footY);

  // Accent strip bottom
  ctx.fillStyle = resolvedColor;
  ctx.fillRect(0, H - 6, W, 6);

  // ── Download / Share ──
  const dataUrl = canvas.toDataURL('image/png');
  const suffix = isDemo ? 'demo' : `${day}_sem${week}`;
  if(!isDemo && navigator.canShare?.({ files: [new File([], 'test.png', { type: 'image/png' })] })){
    const blob = await (await fetch(dataUrl)).blob();
    const file = new File([blob], `squad_entreno_${suffix}.png`, { type: 'image/png' });
    try{
      await navigator.share({ files: [file], title: `${day} · Semana ${week}` });
    }catch(e){ if(e.name!=='AbortError') _mrDownloadImage(dataUrl, suffix); }
  } else {
    _mrDownloadImage(dataUrl, suffix);
  }
  toast(isDemo ? '📸 Demo generada' : '📸 Imagen generada');
}

// Carga icon-512.png una sola vez. Saca el negro del maskable y croppea
// el escudo (descartando el wordmark hardcoded debajo).
let _mrLogoCache = null;
function _mrLoadLogo(){
  if(_mrLogoCache) return _mrLogoCache;
  _mrLogoCache = new Promise(resolve => {
    const src = new Image();
    src.onload = () => {
      try {
        const c = document.createElement('canvas');
        c.width = src.width; c.height = src.height;
        const cx = c.getContext('2d');
        cx.drawImage(src, 0, 0);
        const data = cx.getImageData(0, 0, c.width, c.height);
        const p = data.data;
        let minX = c.width, minY = c.height, maxX = 0, maxY = 0;
        for(let y=0; y<c.height; y++){
          for(let x=0; x<c.width; x++){
            const i = (y*c.width + x)*4;
            if(p[i] < 24 && p[i+1] < 24 && p[i+2] < 24){
              p[i+3] = 0;
            } else if(p[i+3] > 32){
              if(x < minX) minX = x; if(x > maxX) maxX = x;
              if(y < minY) minY = y; if(y > maxY) maxY = y;
            }
          }
        }
        cx.putImageData(data, 0, 0);
        // Detectar gap entre el escudo y el wordmark
        let symEnd = maxY, gapStart = -1, gapLen = 0;
        for(let y=minY; y<=maxY; y++){
          let rowHas = false;
          for(let x=minX; x<=maxX; x++){
            if(p[(y*c.width + x)*4 + 3] > 32){ rowHas = true; break; }
          }
          if(rowHas){
            if(gapLen >= 6 && gapStart > minY){ symEnd = gapStart; break; }
            gapStart = -1; gapLen = 0;
          } else {
            if(gapStart < 0) gapStart = y;
            gapLen++;
          }
        }
        const cw = Math.max(1, maxX - minX);
        const ch = Math.max(1, symEnd - minY);
        const out = document.createElement('canvas');
        out.width = cw; out.height = ch;
        out.getContext('2d').drawImage(c, minX, minY, cw, ch, 0, 0, cw, ch);
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => resolve(null);
        img.src = out.toDataURL('image/png');
      } catch(_){ resolve(null); }
    };
    src.onerror = () => resolve(null);
    src.src = 'icons/icon-512.png';
  });
  return _mrLogoCache;
}

function _mrDownloadImage(dataUrl, suffix){
  const a = document.createElement('a');
  a.download = `squad_entreno_${suffix||'workout'}.png`;
  a.href = dataUrl;
  a.click();
}

// ══════════════════════════════════════════
// STORY EXPORT — HUD Overlay Transparente
// PNG transparente para superponer en Instagram Stories
// ══════════════════════════════════════════

function mrShowStoryOptions(){
  let ov = document.getElementById('mr-story-ov');
  if(ov){ ov.remove(); return; }
  ov = document.createElement('div');
  ov.id = 'mr-story-ov';
  ov.style.cssText = 'position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,.88);backdrop-filter:blur(14px);display:flex;align-items:flex-end;justify-content:center;padding:16px';
  ov.onclick = e=>{ if(e.target===ov) ov.remove(); };
  ov.innerHTML = `
  <div style="width:100%;max-width:420px;background:var(--surf);border:1px solid var(--border2);border-radius:20px 20px 14px 14px;overflow:hidden">
    <div style="padding:20px 22px 12px;border-bottom:1px solid var(--border)">
      <div style="font-size:10px;font-weight:700;color:var(--sub);letter-spacing:6px;margin-bottom:6px">EXPORTAR</div>
      <div style="font-size:17px;font-weight:900;color:var(--text)">Story HUD</div>
      <div style="font-size:12px;color:var(--sub);margin-top:3px">Overlay transparente · Superponelo a tu foto en IG</div>
    </div>
    <div style="padding:16px 22px 22px;display:flex;flex-direction:column;gap:10px">
      <button onclick="document.getElementById('mr-story-ov').remove();mrExportStory(null,false)"
        style="padding:16px 20px;background:var(--acc);border:none;border-radius:12px;font-size:13px;font-weight:900;cursor:pointer;font-family:inherit;
               display:flex;align-items:center;gap:12px;color:#000;width:100%;letter-spacing:.4px">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="2" y="2" width="20" height="20" rx="3" stroke-dasharray="4 2"/><circle cx="12" cy="12" r="4"/></svg>
        <div style="text-align:left">
          <div>OVERLAY TRANSPARENTE</div>
          <div style="font-size:10px;font-weight:500;opacity:.65;margin-top:1px">PNG · Importalo en IG Stories sobre tu foto</div>
        </div>
      </button>
      <button onclick="_mrStoryPickPhoto()"
        style="padding:14px 20px;background:none;border:1.5px solid var(--border2);border-radius:12px;font-size:13px;font-weight:700;cursor:pointer;font-family:inherit;color:var(--text);width:100%;display:flex;align-items:center;gap:8px">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
        Combinar con foto
      </button>
    </div>
  </div>`;
  document.body.appendChild(ov);
}

function _mrStoryPickPhoto(){
  const inp = document.createElement('input');
  inp.type='file'; inp.accept='image/*'; inp.style.display='none';
  document.body.appendChild(inp);
  inp.onchange = async e=>{
    const file = e.target.files?.[0]||null;
    inp.remove();
    document.getElementById('mr-story-ov')?.remove();
    await mrExportStory(file, false);
  };
  inp.click();
}

async function mrExportStory(photoFile, isDemo){
  const ath      = getAth(_mrAthId)||(typeof COACHES!=='undefined'&&COACHES[_mrAthId])||currentUser;
  const rawColor = ath?.color||'#3b82f6';
  const accent   = rawColor.startsWith('var(')?'#3b82f6':rawColor;
  const [ar,ag,ab] = _mrHexRgb(accent);

  let exItems, dayLabel, weekNum, athName;
  if(isDemo){
    athName='ATHLETE'; dayLabel='PUSH A'; weekNum=3;
    exItems=[
      {name:'Press Banca',       sets:[{kg:82.5,reps:8},{kg:82.5,reps:7},{kg:80,reps:6}]},
      {name:'Press Inclinado',   sets:[{kg:65,reps:9},{kg:67.5,reps:8},{kg:67.5,reps:7}]},
      {name:'Press Militar',     sets:[{kg:52.5,reps:8},{kg:52.5,reps:8},{kg:50,reps:9}]},
      {name:'Fondos con Lastre', sets:[{kg:20,reps:10},{kg:20,reps:9},{kg:17.5,reps:9}]},
      {name:'Extensión Tríceps', sets:[{kg:30,reps:12},{kg:30,reps:11},{kg:27.5,reps:12}]},
      {name:'Lateral Raises',    sets:[{kg:12,reps:15},{kg:12,reps:14},{kg:10,reps:15}]},
    ];
    athName=(ath?.name||'ATHLETE').toUpperCase();
  } else {
    const session=getAthSessions(_mrAthId).find(s=>s.dia===_mrDay&&s.week===_mrWeek&&s.date===today());
    exItems=[];
    (session?.exercises||[]).forEach(ex=>{
      if(!ex.name||!ex.sets?.length) return;
      const sets=ex.sets.filter(s=>s.kg||s.reps);
      if(sets.length) exItems.push({name:ex.name,sets});
    });
    if(!exItems.length){ toast('Guardá el entrenamiento antes de exportar'); return; }
    athName=(ath?.name||_mrAthId||'').toUpperCase();
    dayLabel=_mrDay; weekNum=_mrWeek;
  }

  // Load photo if provided
  let bgImg=null;
  if(photoFile instanceof File){
    bgImg=await new Promise(res=>{
      const r=new FileReader();
      r.onload=e=>{ const i=new Image(); i.onload=()=>res(i); i.onerror=()=>res(null); i.src=e.target.result; };
      r.onerror=()=>res(null); r.readAsDataURL(photoFile);
    });
  }

  const W=1080, H=1920, M=58;
  const canvas=document.createElement('canvas');
  canvas.width=W; canvas.height=H;
  const ctx=canvas.getContext('2d');
  // Canvas starts fully transparent — no background fill

  // ── PHOTO BASE ──
  if(bgImg){
    const s=Math.max(W/bgImg.width,H/bgImg.height);
    const pw=bgImg.width*s, ph=bgImg.height*s;
    ctx.drawImage(bgImg,(W-pw)/2,(H-ph)/2,pw,ph);
    ctx.fillStyle='rgba(0,0,0,0.48)'; ctx.fillRect(0,0,W,H);
  }

  // ── DARK GRADIENT ZONES (top 580px + bottom 560px) ──
  const topFade=ctx.createLinearGradient(0,0,0,580);
  topFade.addColorStop(0,  'rgba(0,0,0,0.90)');
  topFade.addColorStop(0.5,'rgba(0,0,0,0.50)');
  topFade.addColorStop(1,  'rgba(0,0,0,0)');
  ctx.fillStyle=topFade; ctx.fillRect(0,0,W,580);

  const botFade=ctx.createLinearGradient(0,1360,0,H);
  botFade.addColorStop(0,  'rgba(0,0,0,0)');
  botFade.addColorStop(0.3,'rgba(0,0,0,0.55)');
  botFade.addColorStop(1,  'rgba(0,0,0,0.92)');
  ctx.fillStyle=botFade; ctx.fillRect(0,1360,W,H-1360);

  // Grain in gradient zones only
  const applyGrain=(x,y,w,h,strength)=>{
    const gd=ctx.getImageData(x,y,w,h); const gb=gd.data;
    for(let i=0;i<gb.length;i+=4){
      if(gb[i+3]<8) continue;
      const n=(Math.random()-.5)*strength;
      gb[i]=Math.min(255,Math.max(0,gb[i]+n));
      gb[i+1]=Math.min(255,Math.max(0,gb[i+1]+n));
      gb[i+2]=Math.min(255,Math.max(0,gb[i+2]+n));
    }
    ctx.putImageData(gd,x,y);
  };
  applyGrain(0,0,W,580,9);
  applyGrain(0,1360,W,H-1360,9);

  // ── ACCENT TOP LINE ──
  ctx.save(); ctx.shadowColor=accent; ctx.shadowBlur=10;
  ctx.fillStyle=`rgba(${ar},${ag},${ab},0.7)`; ctx.fillRect(0,0,W,3); ctx.restore();

  // ── CORNER BRACKETS ──
  const bracket=(x,y,sz,dir,clr,a)=>{
    ctx.save(); ctx.strokeStyle=clr; ctx.lineWidth=1.5; ctx.globalAlpha=a;
    ctx.beginPath();
    if(dir==='tl'){ctx.moveTo(x,y+sz);ctx.lineTo(x,y);ctx.lineTo(x+sz,y);}
    if(dir==='tr'){ctx.moveTo(x-sz,y);ctx.lineTo(x,y);ctx.lineTo(x,y+sz);}
    if(dir==='bl'){ctx.moveTo(x,y-sz);ctx.lineTo(x,y);ctx.lineTo(x+sz,y);}
    if(dir==='br'){ctx.moveTo(x-sz,y);ctx.lineTo(x,y);ctx.lineTo(x,y-sz);}
    ctx.stroke(); ctx.restore();
  };
  bracket(28,28,44,'tl','white',0.28);
  bracket(W-28,28,44,'tr','white',0.28);
  bracket(28,H-28,44,'bl',accent,0.55);
  bracket(W-28,H-28,44,'br',accent,0.55);

  // ── WATERMARK: escudo TS al centro, semi-transparente ──
  try {
    const logo = await _mrLoadLogo();
    if(logo){
      const lw = 720;
      const lh = lw * (logo.height / logo.width);
      ctx.save();
      ctx.globalAlpha = 0.07;
      ctx.globalCompositeOperation = 'lighter';
      ctx.drawImage(logo, (W - lw)/2, (H - lh)/2 - 40, lw, lh);
      ctx.restore();
    }
  } catch(_){}

  // ── HEADER (y: 0-130) ──
  ctx.fillStyle='rgba(255,255,255,0.28)';
  ctx.font='700 16px Inter,system-ui,sans-serif';
  ctx.letterSpacing='8px'; ctx.textAlign='center';
  ctx.fillText('SQUAD TEAM',W/2,46); ctx.letterSpacing='0px'; ctx.textAlign='left';

  ctx.strokeStyle='rgba(255,255,255,0.1)'; ctx.lineWidth=1;
  ctx.beginPath(); ctx.moveTo(M,64); ctx.lineTo(W-M,64); ctx.stroke();

  // Day + week chips
  let chx=M; const chy=80;
  [[dayLabel.toUpperCase(),false],[`SEM ${weekNum}`,false]].forEach(([lbl])=>{
    ctx.font='700 15px Inter,system-ui,sans-serif';
    const tw=ctx.measureText(lbl).width, cw=tw+22, ch2=30;
    ctx.fillStyle='rgba(255,255,255,0.1)'; ctx.beginPath(); ctx.roundRect(chx,chy,cw,ch2,ch2/2); ctx.fill();
    ctx.strokeStyle='rgba(255,255,255,0.2)'; ctx.lineWidth=1; ctx.stroke();
    ctx.fillStyle='rgba(255,255,255,0.8)'; ctx.fillText(lbl,chx+11,chy+20); chx+=cw+8;
  });

  // False coords top-right
  ctx.fillStyle='rgba(255,255,255,0.16)'; ctx.font='500 13px Inter,system-ui,sans-serif';
  ctx.textAlign='right';
  ctx.fillText(`${(Math.random()*8+27).toFixed(4)}°S  ${(Math.random()*8+56).toFixed(4)}°O`,W-M,46);
  ctx.textAlign='left';

  // ── MAIN LIFT — EXERCISE NAME (y~170) ──
  const mainEx=_mrStoryMainLift(exItems);
  const mSets=mainEx?.sets||[];
  const mMaxKg=Math.max(...mSets.map(s=>s.kg||0),0);
  const mMaxReps=mSets.find(s=>s.kg===mMaxKg)?.reps||0;

  const exLabel=(mainEx?.name||dayLabel).toUpperCase();
  ctx.save(); ctx.shadowColor='rgba(0,0,0,1)'; ctx.shadowBlur=20;
  ctx.fillStyle='rgba(255,255,255,0.88)';
  let efs=72; ctx.font=`900 italic ${efs}px "Barlow Condensed",Impact,sans-serif`;
  while(ctx.measureText(exLabel).width>W-M*2-20&&efs>36){efs-=4;ctx.font=`900 italic ${efs}px "Barlow Condensed",Impact,sans-serif`;}
  ctx.fillText(exLabel,M,188); ctx.restore();

  // Other exercises — compact chips below headline (y~218)
  const otherEx=exItems.filter(ex=>ex!==mainEx);
  if(otherEx.length){
    ctx.save(); ctx.shadowColor='rgba(0,0,0,0.9)'; ctx.shadowBlur=14;
    let ox=M; const oY=216;
    otherEx.slice(0,5).forEach(ex=>{
      const pk=Math.max(...ex.sets.map(s=>s.kg||0),0);
      const nm=ex.name.length>13?ex.name.slice(0,12).trim()+'…':ex.name;
      const lbl=nm.toUpperCase()+' '+pk+'KG';
      ctx.font='600 17px Inter,system-ui,sans-serif';
      const tw=ctx.measureText(lbl).width, bw=tw+14, bh=26;
      if(ox+bw>W-M) return;
      ctx.fillStyle='rgba(0,0,0,0.35)'; ctx.beginPath(); ctx.roundRect(ox,oY,bw,bh,4); ctx.fill();
      ctx.strokeStyle='rgba(255,255,255,0.15)'; ctx.lineWidth=1; ctx.stroke();
      ctx.fillStyle='rgba(255,255,255,0.65)'; ctx.fillText(lbl,ox+7,oY+19);
      ox+=bw+6;
    });
    ctx.restore();
  }

  // ── WEIGHT GLOW SPHERE ──
  const glowSphere=ctx.createRadialGradient(W/2,360,0,W/2,360,320);
  glowSphere.addColorStop(0,`rgba(${ar},${ag},${ab},0.22)`);
  glowSphere.addColorStop(0.45,`rgba(${ar},${ag},${ab},0.07)`);
  glowSphere.addColorStop(1,'rgba(0,0,0,0)');
  ctx.fillStyle=glowSphere; ctx.fillRect(0,100,W,520);

  // ── WEIGHT NUMBER — ENORMOUS (y~390) ──
  const numStr=String(mMaxKg);
  let wfs=196; ctx.font=`900 italic ${wfs}px "Barlow Condensed",Impact,sans-serif`;
  while(ctx.measureText(numStr).width>W-M*2-170&&wfs>80){wfs-=4;ctx.font=`900 italic ${wfs}px "Barlow Condensed",Impact,sans-serif`;}

  ctx.save();
  ctx.strokeStyle='rgba(0,0,0,0.85)'; ctx.lineWidth=10; ctx.lineJoin='round';
  ctx.shadowColor='rgba(0,0,0,0.9)'; ctx.shadowBlur=24;
  ctx.strokeText(numStr,M,396);
  ctx.shadowColor=`rgba(${ar},${ag},${ab},0.75)`; ctx.shadowBlur=44;
  ctx.fillStyle='#ffffff'; ctx.fillText(numStr,M,396); ctx.restore();

  const numW=ctx.measureText(numStr).width;
  const kgFs=Math.round(wfs*0.3);
  ctx.save(); ctx.shadowColor=`rgba(${ar},${ag},${ab},0.9)`; ctx.shadowBlur=22;
  ctx.fillStyle=accent; ctx.font=`900 italic ${kgFs}px "Barlow Condensed",Impact,sans-serif`;
  ctx.fillText('KG',M+numW+12,316); ctx.restore();

  ctx.fillStyle='rgba(255,255,255,0.32)';
  ctx.font=`700 italic ${Math.round(wfs*0.26)}px "Barlow Condensed",Impact,sans-serif`;
  ctx.fillText(`× ${mMaxReps}`,M+numW+12,375);

  // Accent micro-line
  ctx.save(); ctx.strokeStyle=accent; ctx.lineWidth=1; ctx.globalAlpha=0.35;
  ctx.beginPath(); ctx.moveTo(M,460); ctx.lineTo(M+160,460); ctx.stroke(); ctx.restore();

  // ── ATMOSPHERIC WAVEFORM (y~505, reduced) ──
  const allSets2=[];
  exItems.forEach(ex=>ex.sets.forEach(s=>allSets2.push(s.kg||0)));
  const maxKgAll=Math.max(...allSets2,1);
  const WVY=510, WVA=36;
  const wvP=allSets2.map((kg,i)=>({x:(i/(allSets2.length-1||1))*W, y:WVY-(kg/maxKgAll)*WVA}));
  const wvFull=[{x:-6,y:WVY},...wvP,{x:W+6,y:WVY}];
  const drawWv=(pts,lw,a)=>{
    ctx.beginPath(); ctx.moveTo(pts[0].x,pts[0].y);
    for(let i=0;i<pts.length-1;i++){const cpx=(pts[i].x+pts[i+1].x)/2;ctx.bezierCurveTo(cpx,pts[i].y,cpx,pts[i+1].y,pts[i+1].x,pts[i+1].y);}
    ctx.strokeStyle=accent; ctx.lineWidth=lw; ctx.globalAlpha=a; ctx.stroke(); ctx.globalAlpha=1;
  };
  drawWv(wvFull,10,0.05); drawWv(wvFull,4,0.1);
  ctx.save(); ctx.shadowColor=accent; ctx.shadowBlur=10; drawWv(wvFull,1.2,0.55); ctx.restore();
  wvP.forEach(p=>{ ctx.beginPath(); ctx.arc(p.x,p.y,2.5,0,Math.PI*2); ctx.fillStyle=accent; ctx.globalAlpha=0.6; ctx.fill(); ctx.globalAlpha=1; });

  // ── SIDE METRICS (y: 660-1020, hugging edges) ──
  const sideLine=(x,y1,y2)=>{
    ctx.strokeStyle='rgba(255,255,255,0.06)'; ctx.lineWidth=1;
    ctx.beginPath(); ctx.moveTo(x,y1); ctx.lineTo(x,y2); ctx.stroke();
    for(let ty=y1+10;ty<y2;ty+=80){ ctx.strokeStyle='rgba(255,255,255,0.1)'; ctx.beginPath(); ctx.moveTo(x,ty); ctx.lineTo(x+(x<W/2?10:-10),ty); ctx.stroke(); }
  };
  sideLine(M,650,1050); sideLine(W-M,650,1050);

  const drawMetric=(x,y,lbl,val,sub,align)=>{
    ctx.save(); ctx.shadowColor='rgba(0,0,0,0.95)'; ctx.shadowBlur=16; ctx.textAlign=align;
    // Dark backing card — opaque enough for any background
    const bkW=180, bkH=82, bkX=align==='right'?x-bkW+10:x-10;
    ctx.fillStyle='rgba(0,0,0,0.65)'; ctx.beginPath(); ctx.roundRect(bkX,y-18,bkW,bkH,8); ctx.fill();
    ctx.strokeStyle='rgba(255,255,255,0.10)'; ctx.lineWidth=1; ctx.stroke();
    // Label
    ctx.fillStyle='rgba(255,255,255,0.72)'; ctx.font='700 11px Inter,system-ui,sans-serif';
    ctx.letterSpacing='4px'; ctx.fillText(lbl,x,y); ctx.letterSpacing='0px';
    // Value — large with stroke for extra punch
    ctx.font=`900 italic 44px "Barlow Condensed",Impact,sans-serif`;
    ctx.strokeStyle='rgba(0,0,0,0.85)'; ctx.lineWidth=6; ctx.lineJoin='round';
    ctx.strokeText(val,x,y+38);
    ctx.fillStyle='#ffffff'; ctx.fillText(val,x,y+38);
    // Sub
    ctx.fillStyle='rgba(255,255,255,0.55)'; ctx.font='500 12px Inter,system-ui,sans-serif';
    ctx.fillText(sub,x,y+58); ctx.textAlign='left'; ctx.restore();
  };

  const totalVol=exItems.reduce((t,ex)=>t+ex.sets.reduce((ss,s)=>ss+(s.kg||0)*(s.reps||0),0),0);
  const volStr=totalVol>=1000?(totalVol/1000).toFixed(1)+'T':totalVol+'KG';
  const totalSets=exItems.reduce((t,ex)=>t+ex.sets.length,0);

  drawMetric(M+20,700,'VOLUMEN',volStr,'total','left');
  drawMetric(M+20,820,'PICO',maxKgAll+'KG','max set','left');
  drawMetric(W-M-20,700,'SERIES',String(totalSets),'completadas','right');
  drawMetric(W-M-20,820,'EJERC.',String(exItems.length),'movimientos','right');

  // ── SEPARATOR ──
  ctx.strokeStyle='rgba(255,255,255,0.1)'; ctx.lineWidth=1;
  ctx.beginPath(); ctx.moveTo(M,1390); ctx.lineTo(W-M,1390); ctx.stroke();

  // ── SESSION COMPARISON vs anterior (y: 1415-1495) ──
  let _prevVol=0,_prevMax=0,_hasPrev=false;
  if(!isDemo){
    const _prevSess=getAthSessions(_mrAthId)
      .filter(s=>s.dia===_mrDay&&!(s.week===_mrWeek&&s.date===today()))
      .sort((a,b)=>(b.date||'').localeCompare(a.date||''))[0];
    if(_prevSess){
      _hasPrev=true;
      (_prevSess.exercises||[]).forEach(ex=>{
        (ex.sets||[]).forEach(s=>{
          _prevVol+=(s.kg||0)*(s.reps||0);
          if((s.kg||0)>_prevMax) _prevMax=s.kg||0;
        });
      });
    }
  }
  if(_hasPrev){
    ctx.save(); ctx.shadowColor='rgba(0,0,0,0.9)'; ctx.shadowBlur=12;
    const fmtV=v=>v>=1000?(v/1000).toFixed(1)+'T':Math.round(v)+'KG';
    ctx.fillStyle='rgba(255,255,255,0.20)'; ctx.font='600 11px Inter,system-ui,sans-serif';
    ctx.letterSpacing='5px'; ctx.fillText('VS ANTERIOR',M,1418); ctx.letterSpacing='0px';
    const drawCmpRow=(ry,lbl,prev,curr,delta,dUnit)=>{
      ctx.fillStyle='rgba(255,255,255,0.22)'; ctx.font='600 10px Inter,system-ui,sans-serif';
      ctx.letterSpacing='2px'; ctx.fillText(lbl,M,ry); ctx.letterSpacing='0px';
      const c1=M+90, c2=M+200, c3=M+320;
      ctx.fillStyle='rgba(255,255,255,0.38)'; ctx.font=`900 italic 28px "Barlow Condensed",Impact,sans-serif`;
      ctx.fillText(prev,c1,ry+2);
      ctx.fillStyle='rgba(255,255,255,0.18)'; ctx.font='400 14px Inter,system-ui,sans-serif';
      ctx.fillText('→',c2-22,ry-2);
      ctx.fillStyle='rgba(255,255,255,0.90)'; ctx.font=`900 italic 28px "Barlow Condensed",Impact,sans-serif`;
      ctx.fillText(curr,c2,ry+2);
      const dPos=delta>=0;
      ctx.fillStyle=dPos?'rgba(134,239,172,0.88)':'rgba(252,165,165,0.88)';
      ctx.font=`700 italic 20px "Barlow Condensed",Impact,sans-serif`;
      ctx.fillText((dPos?'+':'')+delta+dUnit,c3,ry+2);
    };
    drawCmpRow(1444,'VOLUMEN',fmtV(_prevVol),fmtV(totalVol),Math.round(totalVol-_prevVol),' KG');
    if(_prevMax>0) drawCmpRow(1486,'PICO MAX',_prevMax+'KG',mMaxKg+'KG',+(mMaxKg-_prevMax).toFixed(1),' KG');
    ctx.restore();
  }

  // ── MUSCLE PILLS (y~1530) ──
  const muscles=_mrStoryMuscles(exItems);
  let mpx=M;
  (muscles.length?muscles:['FULL BODY']).forEach(m=>{
    ctx.font='700 15px Inter,system-ui,sans-serif';
    const tw=ctx.measureText(m).width, bw=tw+20, bh=30;
    ctx.fillStyle=`rgba(${ar},${ag},${ab},0.14)`; ctx.beginPath(); ctx.roundRect(mpx,1530,bw,bh,4); ctx.fill();
    ctx.strokeStyle=`rgba(${ar},${ag},${ab},0.45)`; ctx.lineWidth=1; ctx.stroke();
    ctx.fillStyle=accent; ctx.fillText(m,mpx+10,1530+20); mpx+=bw+8;
  });

  // ── MINI STATS ROW (y~1600) ──
  const miniS=[{l:'TOTAL',v:volStr},{l:'MAX',v:maxKgAll+'KG'},{l:'SETS',v:String(totalSets)},{l:'EJERC',v:String(exItems.length)}];
  const msW=(W-M*2)/miniS.length;
  miniS.forEach((s,i)=>{
    const sx=M+i*msW;
    if(i>0){ ctx.strokeStyle='rgba(255,255,255,0.08)'; ctx.lineWidth=1; ctx.beginPath(); ctx.moveTo(sx,1600); ctx.lineTo(sx,1656); ctx.stroke(); }
    ctx.fillStyle='rgba(255,255,255,0.25)'; ctx.font='600 11px Inter,system-ui,sans-serif';
    ctx.letterSpacing='3px'; ctx.fillText(s.l,sx+4,1616); ctx.letterSpacing='0px';
    ctx.fillStyle='rgba(255,255,255,0.88)'; ctx.font=`900 italic 36px "Barlow Condensed",Impact,sans-serif`;
    ctx.fillText(s.v,sx+4,1654);
  });

  // ── SET BREAKDOWN of main lift (y~1715) ──
  if(mSets.length){
    ctx.fillStyle='rgba(255,255,255,0.18)'; ctx.font='600 12px Inter,system-ui,sans-serif';
    ctx.letterSpacing='4px'; ctx.fillText('SERIES',M,1702); ctx.letterSpacing='0px';
    let sx2=M; const sbY=1730;
    mSets.forEach(s=>{
      const lbl=`${s.kg}×${s.reps}`; ctx.font='600 19px Inter,system-ui,sans-serif';
      const tw=ctx.measureText(lbl).width, bw=tw+16, bh=28;
      const top=s.kg===mMaxKg;
      ctx.fillStyle=top?`rgba(${ar},${ag},${ab},0.2)`:'rgba(255,255,255,0.06)';
      ctx.beginPath(); ctx.roundRect(sx2,sbY,bw,bh,5); ctx.fill();
      ctx.strokeStyle=top?`rgba(${ar},${ag},${ab},0.5)`:'rgba(255,255,255,0.1)'; ctx.lineWidth=1; ctx.stroke();
      ctx.fillStyle=top?accent:'rgba(255,255,255,0.55)'; ctx.fillText(lbl,sx2+8,sbY+20); sx2+=bw+6;
    });
  }

  // ── DATE + SQUAD TEAM WATERMARK ──
  const dtStr=new Date().toLocaleDateString('es-UY',{day:'2-digit',month:'short',year:'numeric'}).toUpperCase();
  ctx.fillStyle='rgba(255,255,255,0.18)'; ctx.font='400 14px Inter,system-ui,sans-serif';
  ctx.textAlign='right'; ctx.fillText(dtStr,W-M,1810); ctx.textAlign='left';

  // Geometric diamond mark (subtle Squad Team logo)
  const wmX=W-M-20, wmY=H-56;
  ctx.save(); ctx.globalAlpha=0.10; ctx.strokeStyle=accent; ctx.lineWidth=1.5;
  ctx.beginPath(); ctx.moveTo(wmX,wmY-12); ctx.lineTo(wmX+10,wmY); ctx.lineTo(wmX,wmY+12); ctx.lineTo(wmX-10,wmY); ctx.closePath(); ctx.stroke();
  ctx.restore();

  ctx.fillStyle='rgba(255,255,255,0.08)'; ctx.font='700 14px Inter,system-ui,sans-serif';
  ctx.letterSpacing='5px'; ctx.textAlign='center'; ctx.fillText('SQUAD TEAM · COACH OS',W/2,H-44);
  ctx.letterSpacing='0px'; ctx.textAlign='left';

  // Bottom accent strip
  ctx.save(); ctx.shadowColor=`rgba(${ar},${ag},${ab},0.6)`; ctx.shadowBlur=10;
  ctx.fillStyle=`rgba(${ar},${ag},${ab},0.75)`; ctx.fillRect(0,H-4,W,4); ctx.restore();

  // ── EXPORT ──
  const dataUrl=canvas.toDataURL('image/png');
  const sfx=isDemo?'hud_demo':`hud_${dayLabel}_s${weekNum}`;
  if(!isDemo&&navigator.canShare?.({files:[new File([],'t.png',{type:'image/png'})]})){
    const blob=await(await fetch(dataUrl)).blob();
    const f2=new File([blob],`squad_${sfx}.png`,{type:'image/png'});
    try{ await navigator.share({files:[f2],title:`${dayLabel} · Semana ${weekNum}`}); }
    catch(e){ if(e.name!=='AbortError') _mrDownloadImage(dataUrl,sfx); }
  } else { _mrDownloadImage(dataUrl,sfx); }
  toast(isDemo?'📸 HUD demo generado':'📸 HUD generado');
}

function _mrCalcStreak(){
  const sessions=getAthSessions(_mrAthId);
  if(!sessions.length) return 0;
  const dates=new Set(sessions.map(s=>s.date));
  let streak=0; const d=new Date(); d.setHours(0,0,0,0);
  while(true){
    const ds=d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
    if(!dates.has(ds)) break;
    streak++; d.setDate(d.getDate()-1);
  }
  return streak;
}

function _mrStoryMainLift(exItems){
  let best=null,bestKg=0;
  exItems.forEach(ex=>{ const mx=Math.max(...ex.sets.map(s=>s.kg||0)); if(mx>bestKg){bestKg=mx;best=ex;} });
  return best;
}

function _mrStoryIsPR(exName,kg){
  if(!kg||kg<=0||!_mrAthId) return false;
  const prev=getAthSessions(_mrAthId).filter(s=>!(s.dia===_mrDay&&s.week===_mrWeek&&s.date===today()));
  const mx=prev.reduce((m,s)=>{ const e=(s.exercises||[]).find(e=>e.name===exName); if(!e) return m; return Math.max(m,...(e.sets||[]).map(st=>st.kg||0)); },0);
  return kg>mx&&mx>0;
}

function _mrStoryMuscles(exItems){
  const MAP=[
    {k:['banca','pecho','chest','pec','inclinado'],   l:'PECTORALES'},
    {k:['militar','hombro','shoulder','lateral'],     l:'HOMBROS'},
    {k:['tríceps','triceps','fondos','extensión'],    l:'TRÍCEPS'},
    {k:['espalda','remo','dominada','jalón'],         l:'ESPALDA'},
    {k:['bíceps','biceps','curl'],                   l:'BÍCEPS'},
    {k:['sentadilla','squat','prensa','pierna','leg'],l:'PIERNAS'},
    {k:['peso muerto','deadlift'],                   l:'CADENA P.'},
    {k:['abdomen','abs','core'],                     l:'CORE'},
  ];
  const found=new Set();
  exItems.forEach(ex=>{ const n=ex.name.toLowerCase(); MAP.forEach(m=>{if(m.k.some(k=>n.includes(k))) found.add(m.l);}); });
  return [...found].slice(0,3);
}

function _mrHexRgb(hex){
  hex=hex.replace('#','');
  if(hex.length===3) hex=hex.split('').map(c=>c+c).join('');
  return [parseInt(hex.slice(0,2),16),parseInt(hex.slice(2,4),16),parseInt(hex.slice(4,6),16)];
}
