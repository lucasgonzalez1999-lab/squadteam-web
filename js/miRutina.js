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

// ── ENTRY POINT ──
async function renderMiRutina(){
  const user = currentUser;
  if(!user || user.role !== 'athlete'){ return; }
  _mrAthId = user.id;

  const cont = document.getElementById('mi-rutina-content');
  if(!cont) return;
  cont.innerHTML = `<div style="text-align:center;padding:40px;color:var(--sub)">Cargando tu rutina...</div>`;

  _mrPlan = await mrLoadPlan(_mrAthId);
  if(!_mrPlan){
    cont.innerHTML = `<div style="padding:24px;text-align:center">
      <div style="font-size:32px;margin-bottom:12px">📋</div>
      <div style="font-size:15px;font-weight:700;color:var(--text);margin-bottom:6px">Sin rutina asignada</div>
      <div style="font-size:13px;color:var(--sub)">Tu coach todavía no cargó tu plan. Consultale por Telegram.</div>
    </div>`;
    return;
  }

  _mrWeek    = mrCurrentWeek(_mrPlan);
  _mrDay     = _mrDay || mrAutoSelectDay(_mrPlan);
  _mrInputs  = {};
  _mrSaved   = false;

  await mrLoadTodayDraft();
  mrRender(cont);
}

// ── LOAD PLAN ──
async function mrLoadPlan(athId){
  try{
    const doc = await window.db.collection('plans').doc(athId).get();
    if(!doc.exists) return null;
    const raw = doc.data()?.data;
    if(!raw) return null;
    const plan = JSON.parse(raw);
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
  const color  = getAth(_mrAthId)?.color || 'var(--acc)';
  const isDeload = _mrWeek === totalWeeks;

  cont.innerHTML = `
  <div style="max-width:700px;margin:0 auto;padding:16px">

    <!-- Header -->
    <div style="margin-bottom:16px">
      <div style="font-size:18px;font-weight:800;color:var(--text)">Mi Rutina</div>
      <div style="font-size:13px;color:var(--sub);margin-top:2px">${plan.nivel||'intermedio'} · ${plan.diasSemana||days.length} días/sem · ${totalWeeks-1} semanas</div>
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
      ${isDeload?`<div style="font-size:11px;color:#ca8a04;font-weight:700;flex-shrink:0;background:#fef9c3;padding:3px 8px;border-radius:10px">DELOAD 60%</div>`:''}
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
    <div id="mr-save-area" style="margin-top:20px">
      ${mrRenderSaveBtn(color)}
    </div>
    <div id="mr-autosave-status" style="text-align:center;min-height:20px;margin-top:8px"></div>

  </div>`;
}

// ── RENDER EXERCISES ──
function mrRenderExercises(exercises, week, totalWeeks, color){
  if(!exercises || !exercises.length)
    return `<div style="text-align:center;padding:30px;color:var(--sub);font-size:13px">Sin ejercicios para este día</div>`;

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
    const athUnit = DB.get('units_'+_mrAthId) || getAth(_mrAthId)?.units || 'kg';
    const inputStep = athUnit === 'lbs' ? 5 : 2.5;

    // Series rows
    let seriesHtml = '';
    for(let s=1; s<=planSeries; s++){
      const sKey = 's'+s;
      const val  = inputs[sKey] || {};
      const ordinals = ['1º','2º','3º','4º','5º','6º'];
      const done = !!val.done;
      seriesHtml += `
      <div id="mr-row-${ei}-${sKey}" style="display:flex;align-items:center;gap:8px;padding:8px 0;border-bottom:1px solid var(--border);
        transition:background .2s;background:${done?color+'18':''}">
        <div id="mr-ord-${ei}-${sKey}" style="font-size:12px;font-weight:600;width:28px;flex-shrink:0;display:flex;align-items:center;justify-content:center;color:${done?color:'var(--sub)'}">
          ${done?`<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>`:ordinals[s-1]||s+'º'}
        </div>
        <div style="flex:1;display:flex;gap:8px;align-items:center">
          <div style="flex:1">
            <div style="font-size:10px;color:var(--sub2);margin-bottom:3px">KG</div>
            <input type="number" step="${inputStep}" min="0" placeholder="${lastRef?lastRef.kg:'—'}"
              value="${val.kg||''}"
              id="mr-${ei}-${sKey}-kg"
              oninput="mrInput('${exName}','${sKey}','kg',this.value)"
              style="width:100%;padding:9px 10px;border:1.5px solid ${val.kg?color:'var(--border)'};border-radius:8px;font-size:15px;font-weight:700;font-family:inherit;background:var(--surf);color:var(--text);outline:none;transition:border .15s"
              onfocus="this.style.borderColor='${color}'" onblur="this.style.borderColor=this.value?'${color}':'var(--border)'">
          </div>
          <div style="font-size:16px;color:var(--sub2);flex-shrink:0;padding-top:14px">×</div>
          <div style="flex:1">
            <div style="font-size:10px;color:var(--sub2);margin-bottom:3px">REPS</div>
            <input type="number" min="1" placeholder="${planReps?.split('-')[0]||'?'}"
              value="${val.reps||''}"
              id="mr-${ei}-${sKey}-reps"
              oninput="mrInput('${exName}','${sKey}','reps',this.value)"
              style="width:100%;padding:9px 10px;border:1.5px solid ${val.reps?color:'var(--border)'};border-radius:8px;font-size:15px;font-weight:700;font-family:inherit;background:var(--surf);color:var(--text);outline:none;transition:border .15s"
              onfocus="this.style.borderColor='${color}'" onblur="this.style.borderColor=this.value?'${color}':'var(--border)'">
          </div>
        </div>
        <button id="mr-chk-${ei}-${sKey}" onclick="mrCheckSet('${exName.replace(/'/g,"\\'")}','${sKey}',${ei})"
          style="width:34px;height:34px;border-radius:50%;border:2px solid ${done?color:'var(--border2)'};
          background:${done?color:'transparent'};display:flex;align-items:center;justify-content:center;
          flex-shrink:0;cursor:pointer;transition:all .2s;-webkit-tap-highlight-color:transparent;margin-top:14px">
          ${done?`<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>`:''}
        </button>
      </div>`;
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
                ${overload.action==='increase'?'↑':overload.action==='deload'?'↓':'='} ${overload.label} · ${overload.suggestedKg}${overload.unit||'kg'}
              </span>
            </span>
          </div>`:''}

        </div>
        ${lastRef?`<div style="text-align:right;flex-shrink:0">
          <div style="font-size:10px;color:var(--sub2)">sem. anterior</div>
          <div style="font-size:13px;font-weight:700;color:var(--sub)">${lastRef.kg}kg × ${lastRef.reps}</div>
        </div>`:''}
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
    return `<div style="display:flex;align-items:center;gap:10px;padding:14px 18px;background:${color}15;border-radius:12px;border:1.5px solid ${color}40;animation:mrFadeIn .3s ease">
      <div style="width:28px;height:28px;border-radius:50%;background:${color};display:flex;align-items:center;justify-content:center;flex-shrink:0">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>
      </div>
      <div>
        <div style="font-size:14px;font-weight:700;color:${color}">Entrenamiento guardado</div>
        <div style="font-size:11px;color:var(--sub);margin-top:1px">${_mrDay} · Semana ${_mrWeek}</div>
      </div>
      <button onclick="mrUnsave()" style="margin-left:auto;font-size:12px;color:var(--sub);background:none;border:none;cursor:pointer;padding:4px 8px;border-radius:6px;border:1px solid var(--border)">Editar</button>
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

  const color = getAth(_mrAthId)?.color || 'var(--acc)';
  const ordinals = ['1º','2º','3º','4º','5º','6º'];
  const sNum = parseInt(sKey.replace('s','')) - 1;

  const row = document.getElementById('mr-row-'+ei+'-'+sKey);
  const ord = document.getElementById('mr-ord-'+ei+'-'+sKey);
  const btn = document.getElementById('mr-chk-'+ei+'-'+sKey);

  if(row) row.style.background = done ? color+'18' : '';
  if(ord){
    ord.style.color = done ? color : 'var(--sub)';
    ord.innerHTML = done
      ? `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>`
      : ordinals[sNum]||sNum+1+'º';
  }
  if(btn){
    btn.style.background = done ? color : 'transparent';
    btn.style.borderColor = done ? color : 'var(--border2)';
    btn.innerHTML = done
      ? `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>`
      : '';
  }

  const saveArea = document.getElementById('mr-save-area');
  if(saveArea) saveArea.innerHTML = mrRenderSaveBtn(color);
}

// ── INPUT HANDLER ──
function mrInput(exName, sKey, field, value){
  if(!_mrInputs[exName]) _mrInputs[exName] = {};
  if(!_mrInputs[exName][sKey]) _mrInputs[exName][sKey] = {};
  _mrInputs[exName][sKey][field] = value ? parseFloat(value) || value : '';
  mrSaveDraft();
  mrAutoSaveDebounced();
  const color = getAth(_mrAthId)?.color || 'var(--acc)';
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
      if(v.kg || v.reps) sets.push({ kg: parseFloat(v.kg)||0, reps: parseInt(v.reps)||0 });
    }
    if(sets.length) exList.push({ name: exName, sets });
  });

  if(!exList.length){ toast('Completá al menos un set antes de guardar'); return; }

  const sessionObj = {
    date:   today(),
    name:   _mrDay,
    dia:    _mrDay,
    week:   _mrWeek,
    source: 'web',
    exercises: exList,
  };

  // Save to global sessions array (same as bot)
  const existing = getAthSessions(_mrAthId);
  const withoutToday = existing.filter(s => !(s.date === today() && s.dia === _mrDay));
  const updated = [sessionObj, ...withoutToday];
  sessions[_mrAthId] = updated;
  DB.set('sessions', sessions);
  await fbSet('sessions', _mrAthId, { data: JSON.stringify(updated) });

  // Mark as done in localStorage
  const doneKey = `mr_done_${_mrAthId}_${_mrWeek}_${_mrDay}`;
  DB.set(doneKey, today());

  // Clear draft
  DB.del(`mr_draft_${_mrAthId}_${today()}_${_mrDay}`);
  clearTimeout(_mrAutoSaveTimer);
  window.db.collection('sessions').doc(_mrAthId).set({ draft: null }, { merge: true }).catch(()=>{});
  _mrSaved = true;

  toast('✅ ' + _mrDay + ' guardado — semana ' + _mrWeek);
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
  clearTimeout(_mrAutoSaveTimer);
  await mrLoadTodayDraft();
  const cont = document.getElementById('mi-rutina-content');
  if(cont) mrRender(cont);
}
async function mrSetDay(day){
  _mrDay   = day;
  _mrInputs = {};
  clearTimeout(_mrAutoSaveTimer);
  await mrLoadTodayDraft();
  const cont = document.getElementById('mi-rutina-content');
  if(cont) mrRender(cont);
}
