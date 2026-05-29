// js/checkin.js — CHECK-IN SEMANAL v1
// Premium weekly review: Loom + scores + goals + athlete confirmation
// Overrides the legacy body-metrics check-in from coach.js

// ─── FIREBASE ──────────────────────────────────────────────────────────────
async function ckGet(athId){
  try{
    const doc = await window.db?.collection('weeklyCheckins').doc(athId).get();
    if(doc?.exists){
      let d = doc.data()?.data;
      if(typeof d==='string') try{ d=JSON.parse(d); }catch(e){ d=[]; }
      if(Array.isArray(d)) return d;
    }
  }catch(e){}
  return [];
}

async function ckSave(athId, data){
  try{
    await window.db?.collection('weeklyCheckins').doc(athId).set({data:JSON.stringify(data)});
  }catch(e){ console.error('[checkin] save error', e); }
}

// ─── HELPERS ───────────────────────────────────────────────────────────────
function ckLoomEmbed(url){
  if(!url) return null;
  // https://www.loom.com/share/ID → https://www.loom.com/embed/ID
  return url.replace('loom.com/share/','loom.com/embed/');
}

function ckISOWeek(d){
  const date = new Date(d);
  date.setHours(0,0,0,0);
  date.setDate(date.getDate()+3-(date.getDay()+6)%7);
  const week1 = new Date(date.getFullYear(),0,4);
  return 1+Math.round(((date-week1)/86400000-3+(week1.getDay()+6)%7)/7);
}

function ckWeekRange(weekNum, year){
  // First day of ISO week
  const simple = new Date(year,0,1+((weekNum-1)*7));
  const dow = simple.getDay();
  const startDate = new Date(simple);
  if(dow<=4) startDate.setDate(simple.getDate()-(dow+6)%7);
  else startDate.setDate(simple.getDate()+8-dow);
  const endDate = new Date(startDate);
  endDate.setDate(startDate.getDate()+6);
  const MESES = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
  const fmt = d => d.getDate()+' '+MESES[d.getMonth()];
  return fmt(startDate)+' — '+fmt(endDate);
}

function ckToday(){ return new Date().toISOString().split('T')[0]; }

function ckId(weekNum, year){ return 'ck_'+year+'_W'+String(weekNum).padStart(2,'0'); }

// ─── SCORE CATEGORIES ──────────────────────────────────────────────────────
const CK_CATS = [
  { id:'entrenos',   label:'Entrenamientos', icon:'💪' },
  { id:'dieta',      label:'Dieta',          icon:'🥗' },
  { id:'pasos',      label:'Pasos',          icon:'👟' },
  { id:'sueno',      label:'Sueño',          icon:'😴' },
  { id:'adherencia', label:'Adherencia',     icon:'🎯' },
];

function ckDotsHtml(val, color){
  val = parseInt(val)||0;
  const c = color||'var(--text)';
  let h = '<div class="ck-dots">';
  for(let i=1;i<=5;i++){
    h += i<=val
      ? `<div class="ck-dot filled" style="background:${c}"></div>`
      : `<div class="ck-dot"></div>`;
  }
  return h + '</div>';
}

function ckStatusBadge(ck){
  if(ck.athleteQuestion) return '<span class="ck-badge needs">💬 Tiene dudas</span>';
  if(ck.athleteConfirmed) return '<span class="ck-badge ok">✅ Confirmado</span>';
  return '<span class="ck-badge pending">⏳ Sin confirmar</span>';
}

// ─── MAIN ENTRY (overrides coach.js renderCheckins) ─────────────────────────
function renderCheckins(){
  if(!Array.isArray(athletes)||!athletes.length)
    athletes = typeof DEFAULT_ATHLETES!=='undefined'?DEFAULT_ATHLETES:[];
  const cont = document.getElementById('checkins-content');
  if(!cont) return;
  if(currentUser?.role==='coach') ckCoachView(cont);
  else                            ckAthleteView(cont, currentUser);
}

// ─── COACH VIEW ─────────────────────────────────────────────────────────────
let _ckSelAth = null;

function ckCoachView(cont){
  _ckSelAth = _ckSelAth || athletes[0]?.id;
  const now = new Date();
  const curWeek = ckISOWeek(now);
  const curYear = now.getFullYear();
  const curRange = ckWeekRange(curWeek, curYear);

  cont.innerHTML = `
<div class="ck-wrap">
  <div class="ck-topbar">
    <div>
      <div class="ck-page-title">CHECK-IN SEMANAL</div>
      <div class="ck-page-sub">Semana ${curWeek} · ${curRange}</div>
    </div>
    <button class="ck-btn-new" onclick="ckOpenNew()">+ Nuevo</button>
  </div>

  <div class="ck-ath-tabs" id="ck-ath-tabs">
    ${athletes.map(a=>`
    <button class="ck-ath-tab${a.id===_ckSelAth?' on':''}"
      onclick="ckSelectAth('${a.id}')" id="ck-tab-${a.id}"
      style="--ac:${athColor(a.id)}">
      <div class="ck-tab-av" style="background:${athColor(a.id)}22;color:${athColor(a.id)}">${athInitial(a.name)}</div>
      ${a.name}
    </button>`).join('')}
  </div>

  <div id="ck-ath-body"></div>

  <!-- Modal -->
  <div class="ck-modal-bg hidden" id="ck-modal-bg" onclick="ckModalClose(event)">
    <div class="ck-modal" id="ck-modal"></div>
  </div>
</div>`;

  ckLoadAth(_ckSelAth);
}

function ckSelectAth(athId){
  _ckSelAth = athId;
  document.querySelectorAll('.ck-ath-tab').forEach(b=>{
    b.classList.toggle('on', b.id==='ck-tab-'+athId);
  });
  ckLoadAth(athId);
}

async function ckLoadAth(athId){
  const body = document.getElementById('ck-ath-body');
  if(!body) return;
  body.innerHTML = '<div class="ck-loading">Cargando...</div>';

  const a = athletes.find(x=>x.id===athId)||{id:athId,name:athId};
  const list = await ckGet(athId);
  const sorted = [...list].sort((x,y)=>y.id.localeCompare(x.id));
  const color = athColor(athId);

  if(!sorted.length){
    body.innerHTML = `
<div class="ck-empty">
  <div class="ck-empty-icon">📋</div>
  <div class="ck-empty-title">Sin check-ins aún</div>
  <div class="ck-empty-sub">Creá el primero para ${a.name}</div>
  <button class="ck-btn-new" onclick="ckOpenNew()">+ Crear check-in</button>
</div>`;
    return;
  }

  const current = sorted[0];
  const history = sorted.slice(1);

  body.innerHTML = `
<div class="ck-coach-grid">

  <!-- Current check-in -->
  <div class="ck-card ck-current">
    <div class="ck-card-head">
      <div>
        <div class="ck-week-label">${current.weekLabel||'Semana '+current.weekNum}</div>
        <div class="ck-date-range">${current.dateRange||''}</div>
      </div>
      <div class="ck-head-right">
        ${ckStatusBadge(current)}
        <button class="ck-btn-edit" onclick="ckOpenEdit('${athId}','${current.id}')">Editar</button>
        <button class="ck-btn-del" onclick="ckDelete('${athId}','${current.id}')">✕</button>
      </div>
    </div>

    ${current.loomUrl ? `
    <div class="ck-video-wrap">
      <iframe src="${ckLoomEmbed(current.loomUrl)}"
        frameborder="0" webkitallowfullscreen mozallowfullscreen allowfullscreen
        class="ck-video"></iframe>
    </div>` : `<div class="ck-no-video">Sin video — <a onclick="ckOpenEdit('${athId}','${current.id}')" class="ck-link">Agregar Loom</a></div>`}

    <div class="ck-scores-row">
      ${CK_CATS.map(c=>`
      <div class="ck-score-item">
        <div class="ck-score-icon">${c.icon}</div>
        <div class="ck-score-label">${c.label}</div>
        ${ckDotsHtml(current.scores?.[c.id], color)}
        <div class="ck-score-num" style="color:${color}">${current.scores?.[c.id]||'—'}</div>
      </div>`).join('')}
    </div>

    ${current.summary?.length ? `
    <div class="ck-section">
      <div class="ck-section-label">RESUMEN</div>
      <ul class="ck-bullets">
        ${current.summary.map(b=>`<li>${b}</li>`).join('')}
      </ul>
    </div>` : ''}

    ${current.goals?.length ? `
    <div class="ck-section">
      <div class="ck-section-label">OBJETIVOS</div>
      <div class="ck-goals">
        ${current.goals.map((g,i)=>`
        <div class="ck-goal${g.done?' done':''}">
          <div class="ck-goal-check">${g.done?'✓':''}</div>
          <div class="ck-goal-text">${g.text}</div>
        </div>`).join('')}
      </div>
    </div>` : ''}

    ${current.athleteQuestion ? `
    <div class="ck-question-box">
      <div class="ck-question-label">💬 PREGUNTA DEL ALUMNO</div>
      <div class="ck-question-text">${current.athleteQuestion}</div>
    </div>` : ''}

    ${current.coachNote ? `
    <div class="ck-section">
      <div class="ck-section-label">NOTA PRIVADA</div>
      <div class="ck-note">${current.coachNote}</div>
    </div>` : ''}
  </div>

  <!-- History -->
  ${history.length ? `
  <div class="ck-history-col">
    <div class="ck-history-title">HISTORIAL</div>
    ${history.map(ck=>`
    <div class="ck-history-item" onclick="ckOpenHistDetail('${athId}','${ck.id}')">
      <div>
        <div class="ck-hist-week">${ck.weekLabel||'Sem '+ck.weekNum}</div>
        <div class="ck-hist-range">${ck.dateRange||''}</div>
      </div>
      <div class="ck-hist-right">
        ${ckStatusBadge(ck)}
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M9 18l6-6-6-6"/></svg>
      </div>
    </div>`).join('')}
  </div>` : ''}

</div>`;
}

async function ckOpenHistDetail(athId, ckId_){
  const list = await ckGet(athId);
  const ck = list.find(x=>x.id===ckId_);
  if(!ck) return;
  const color = athColor(athId);
  const a = athletes.find(x=>x.id===athId)||{id:athId,name:athId};

  ckModalShow(`
<div class="ck-modal-head">
  <div>
    <div class="ck-week-label">${ck.weekLabel||'Semana '+ck.weekNum}</div>
    <div class="ck-date-range">${ck.dateRange||''}</div>
  </div>
  <div>${ckStatusBadge(ck)}</div>
</div>

${ck.loomUrl ? `
<div class="ck-video-wrap" style="margin:16px 0">
  <iframe src="${ckLoomEmbed(ck.loomUrl)}"
    frameborder="0" webkitallowfullscreen mozallowfullscreen allowfullscreen
    class="ck-video"></iframe>
</div>` : ''}

<div class="ck-scores-row" style="margin:16px 0">
  ${CK_CATS.map(c=>`
  <div class="ck-score-item">
    <div class="ck-score-icon">${c.icon}</div>
    <div class="ck-score-label">${c.label}</div>
    ${ckDotsHtml(ck.scores?.[c.id], color)}
    <div class="ck-score-num" style="color:${color}">${ck.scores?.[c.id]||'—'}</div>
  </div>`).join('')}
</div>

${ck.summary?.length ? `
<div class="ck-section">
  <div class="ck-section-label">RESUMEN</div>
  <ul class="ck-bullets">${ck.summary.map(b=>`<li>${b}</li>`).join('')}</ul>
</div>` : ''}

${ck.goals?.length ? `
<div class="ck-section">
  <div class="ck-section-label">OBJETIVOS</div>
  <div class="ck-goals">
    ${ck.goals.map(g=>`<div class="ck-goal${g.done?' done':''}"><div class="ck-goal-check">${g.done?'✓':''}</div><div class="ck-goal-text">${g.text}</div></div>`).join('')}
  </div>
</div>` : ''}

${ck.athleteQuestion ? `
<div class="ck-question-box">
  <div class="ck-question-label">💬 PREGUNTA DEL ALUMNO</div>
  <div class="ck-question-text">${ck.athleteQuestion}</div>
</div>` : ''}
`);
}

// ─── NEW / EDIT MODAL ────────────────────────────────────────────────────────
function ckOpenNew(){
  const athId = _ckSelAth;
  if(!athId) return;
  const now = new Date();
  const weekNum = ckISOWeek(now);
  const year = now.getFullYear();
  ckOpenForm(athId, {
    id: ckId(weekNum, year),
    weekNum, year,
    weekLabel: 'Semana '+weekNum,
    dateRange: ckWeekRange(weekNum, year),
    date: ckToday(),
    status: 'reviewed',
    loomUrl: '',
    summary: [],
    scores: {},
    goals: [],
    coachNote: '',
    athleteConfirmed: false,
    athleteQuestion: null
  }, true);
}

async function ckOpenEdit(athId, ckId_){
  const list = await ckGet(athId);
  const ck = list.find(x=>x.id===ckId_);
  if(!ck) return;
  ckOpenForm(athId, ck, false);
}

function ckOpenForm(athId, ck, isNew){
  const a = athletes.find(x=>x.id===athId)||{id:athId,name:athId};
  const color = athColor(athId);

  const summaryVal = (ck.summary||[]).join('\n');
  const goalsVal   = (ck.goals||[]).map(g=>g.text).join('\n');

  ckModalShow(`
<div class="ck-form-title">${isNew?'Nuevo check-in':'Editar check-in'} — ${a.name}</div>
<div class="ck-form-sub">${ck.weekLabel} · ${ck.dateRange}</div>

<div class="ck-field">
  <label class="ck-label">SEMANA</label>
  <div style="display:flex;gap:8px">
    <input class="ck-input" type="number" id="ck-f-week" value="${ck.weekNum}" min="1" max="53" style="width:80px">
    <input class="ck-input" type="number" id="ck-f-year" value="${ck.year||new Date().getFullYear()}" style="width:90px">
    <button class="ck-btn-sec" onclick="ckUpdateWeekLabel()" style="flex:0">Actualizar</button>
  </div>
  <div class="ck-hint" id="ck-f-range">${ck.dateRange}</div>
</div>

<div class="ck-field">
  <label class="ck-label">VIDEO LOOM (URL de compartir)</label>
  <input class="ck-input" type="url" id="ck-f-loom" value="${ck.loomUrl||''}" placeholder="https://www.loom.com/share/...">
</div>

<div class="ck-field">
  <label class="ck-label">SCORES (1 a 5 por categoría)</label>
  <div class="ck-scores-form">
    ${CK_CATS.map(c=>`
    <div class="ck-score-form-row">
      <span class="ck-score-form-icon">${c.icon}</span>
      <span class="ck-score-form-label">${c.label}</span>
      <div class="ck-score-form-dots" id="ck-fdots-${c.id}" data-val="${ck.scores?.[c.id]||0}" data-cat="${c.id}">
        ${[1,2,3,4,5].map(n=>`<button class="ck-fdot${(ck.scores?.[c.id]||0)>=n?' on':''}" onclick="ckSetScore('${c.id}',${n})" style="--ac:${color}">${n}</button>`).join('')}
      </div>
    </div>`).join('')}
  </div>
</div>

<div class="ck-field">
  <label class="ck-label">RESUMEN (una línea por punto)</label>
  <textarea class="ck-textarea" id="ck-f-summary" rows="4" placeholder="+ 150 kcal diarios&#10;subir pasos a 8000&#10;descarga el jueves">${summaryVal}</textarea>
</div>

<div class="ck-field">
  <label class="ck-label">OBJETIVOS PRÓXIMA SEMANA (una línea por objetivo)</label>
  <textarea class="ck-textarea" id="ck-f-goals" rows="3" placeholder="Llegar a 8000 pasos diarios&#10;Respetar la dieta 6/7 días">${goalsVal}</textarea>
</div>

<div class="ck-field">
  <label class="ck-label">NOTA PRIVADA (solo para el coach)</label>
  <textarea class="ck-textarea" id="ck-f-note" rows="2" placeholder="Notas internas...">${ck.coachNote||''}</textarea>
</div>

<input type="hidden" id="ck-f-id" value="${ck.id}">
<input type="hidden" id="ck-f-athid" value="${athId}">
<input type="hidden" id="ck-f-confirmed" value="${ck.athleteConfirmed?'1':'0'}">
<input type="hidden" id="ck-f-question" value="${ck.athleteQuestion||''}">

<div class="ck-form-actions">
  <button class="ck-btn-ghost" onclick="ckModalBg().classList.add('hidden')">Cancelar</button>
  <button class="ck-btn-save" onclick="ckSaveForm()" style="--ac:${color}">Guardar check-in</button>
</div>
`);
}

function ckUpdateWeekLabel(){
  const w = parseInt(document.getElementById('ck-f-week')?.value)||1;
  const y = parseInt(document.getElementById('ck-f-year')?.value)||new Date().getFullYear();
  const rangeEl = document.getElementById('ck-f-range');
  if(rangeEl) rangeEl.textContent = ckWeekRange(w, y);
}

function ckSetScore(catId, val){
  const container = document.getElementById('ck-fdots-'+catId);
  if(!container) return;
  container.setAttribute('data-val', val);
  container.querySelectorAll('.ck-fdot').forEach((btn,i)=>{
    btn.classList.toggle('on', i<val);
  });
}

async function ckSaveForm(){
  const athId   = document.getElementById('ck-f-athid')?.value;
  const id      = document.getElementById('ck-f-id')?.value;
  const weekNum = parseInt(document.getElementById('ck-f-week')?.value)||1;
  const year    = parseInt(document.getElementById('ck-f-year')?.value)||new Date().getFullYear();
  const loomUrl = document.getElementById('ck-f-loom')?.value.trim()||'';
  const summaryRaw = document.getElementById('ck-f-summary')?.value||'';
  const goalsRaw   = document.getElementById('ck-f-goals')?.value||'';
  const coachNote  = document.getElementById('ck-f-note')?.value.trim()||'';
  const confirmedRaw = document.getElementById('ck-f-confirmed')?.value;
  const questionRaw  = document.getElementById('ck-f-question')?.value||'';

  const scores = {};
  CK_CATS.forEach(c=>{
    const el = document.getElementById('ck-fdots-'+c.id);
    scores[c.id] = parseInt(el?.getAttribute('data-val'))||0;
  });

  const summary = summaryRaw.split('\n').map(s=>s.trim()).filter(Boolean);
  const goals   = goalsRaw.split('\n').map(s=>s.trim()).filter(Boolean).map(t=>({text:t,done:false}));

  // Preserve existing goal done states if editing
  const list = await ckGet(athId);
  const existing = list.find(x=>x.id===id);
  if(existing?.goals){
    existing.goals.forEach((g,i)=>{
      if(goals[i]) goals[i].done = g.done||false;
    });
  }

  const newCk = {
    id: ckId(weekNum, year),
    weekNum, year,
    weekLabel: 'Semana '+weekNum,
    dateRange: ckWeekRange(weekNum, year),
    date: existing?.date||ckToday(),
    status: 'reviewed',
    loomUrl,
    summary,
    scores,
    goals,
    coachNote,
    athleteConfirmed: confirmedRaw==='1',
    athleteQuestion: questionRaw||null
  };

  const idx = list.findIndex(x=>x.id===id||x.id===newCk.id);
  if(idx>=0) list[idx]=newCk;
  else list.push(newCk);

  await ckSave(athId, list);
  ckModalBg().classList.add('hidden');
  toast('Check-in guardado');
  ckLoadAth(athId);
  // Si lo guardó el coach, avisar al atleta por push.
  if(typeof currentUser !== 'undefined' && currentUser?.role === 'coach' && typeof sendPushTo === 'function'){
    swallow(sendPushTo(athId, 'Check-in actualizado', coachNote ? 'Te dejé una nota nueva' : 'El coach revisó tu check-in'), 'push:checkin');
  }
}

function ckDelete(athId, ckId_){
  sqConfirm({
    title:'¿Eliminar este check-in?',
    confirmLabel:'Eliminar', danger:true,
    onConfirm: async ()=>{
      let list = await ckGet(athId);
      list = list.filter(x=>x.id!==ckId_);
      await ckSave(athId, list);
      toast('Eliminado');
      ckLoadAth(athId);
    }
  });
}

// ─── MODAL HELPERS ──────────────────────────────────────────────────────────
function ckModalBg(){ return document.getElementById('ck-modal-bg'); }

function ckModalShow(html){
  const bg  = ckModalBg();
  const box = document.getElementById('ck-modal');
  if(!bg||!box) return;
  box.innerHTML = html;
  bg.classList.remove('hidden');
}

function ckModalClose(e){
  if(e.target===document.getElementById('ck-modal-bg'))
    document.getElementById('ck-modal-bg').classList.add('hidden');
}

// ─── ATHLETE VIEW ───────────────────────────────────────────────────────────
async function ckAthleteView(cont, user){
  if(!user) return;
  const athId = user.id;
  const color = athColor(athId);
  cont.innerHTML = '<div class="ck-loading">Cargando tu check-in...</div>';

  const list = await ckGet(athId);
  const sorted = [...list].sort((x,y)=>y.id.localeCompare(x.id));

  if(!sorted.length){
    cont.innerHTML = `<div class="sq-empty"><span class="sq-empty-title">Sin check-in esta semana</span><span class="sq-empty-sub">Tu coach lo va a cargar próximamente.</span></div>`;
    return;
  }

  const current = sorted[0];
  const history = sorted.slice(1);
  const embedUrl = ckLoomEmbed(current.loomUrl);
  const avgScore = current.scores ? Math.round(Object.values(current.scores).reduce((a,b)=>a+b,0)/CK_CATS.length*10)/10 : 0;

  cont.innerHTML = `
<div class="ck-wrap ck-ath-wrap">

  <!-- Header -->
  <div class="ck-ath-header">
    <div class="ck-ath-eyebrow">CHECK-IN SEMANAL</div>
    <div class="ck-ath-week" style="color:${color}">${current.weekLabel}</div>
    <div class="ck-ath-range">${current.dateRange||''}</div>
  </div>

  <!-- Video -->
  ${embedUrl ? `
  <div class="ck-video-wrap">
    <iframe src="${embedUrl}"
      frameborder="0" webkitallowfullscreen mozallowfullscreen allowfullscreen
      class="ck-video"></iframe>
  </div>` : `
  <div class="ck-no-video-ath">
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M15 10l4.55-2.55A1 1 0 0 1 21 8.4v7.2a1 1 0 0 1-1.45.9L15 14"/><rect x="1" y="6" width="14" height="12" rx="2"/></svg>
    Video no disponible aún
  </div>`}

  <!-- Scores -->
  <div class="ck-ath-scores-wrap">
    <div class="ck-ath-scores-title">TU SEMANA EN NÚMEROS</div>
    <div class="ck-ath-scores">
      ${CK_CATS.map(c=>{
        const v = current.scores?.[c.id]||0;
        return `
        <div class="ck-ath-score">
          <div class="ck-ath-score-icon">${c.icon}</div>
          <div class="ck-ath-score-num" style="color:${color}">${v||'—'}</div>
          ${ckDotsHtml(v, color)}
          <div class="ck-ath-score-label">${c.label}</div>
        </div>`;
      }).join('')}
    </div>
  </div>

  <!-- Summary -->
  ${current.summary?.length ? `
  <div class="ck-ath-card">
    <div class="ck-ath-card-title">NOTAS DEL COACH</div>
    <ul class="ck-ath-bullets">
      ${current.summary.map(b=>`<li>${b}</li>`).join('')}
    </ul>
  </div>` : ''}

  <!-- Goals -->
  ${current.goals?.length ? `
  <div class="ck-ath-card">
    <div class="ck-ath-card-title">OBJETIVOS DE ESTA SEMANA</div>
    <div class="ck-ath-goals" id="ck-ath-goals-${athId}">
      ${current.goals.map((g,i)=>`
      <button class="ck-ath-goal${g.done?' done':''}" onclick="ckAthToggleGoal('${athId}','${current.id}',${i})" style="--ac:${color}">
        <div class="ck-ath-goal-check" style="border-color:${color};${g.done?'background:'+color:''}">
          ${g.done?`<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="${color==='#e8ff00'?'#000':'#fff'}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`:''}
        </div>
        <span>${g.text}</span>
      </button>`).join('')}
    </div>
  </div>` : ''}

  <!-- Confirm / Question -->
  ${!current.athleteConfirmed && !current.athleteQuestion ? `
  <div class="ck-ath-cta">
    <div class="ck-ath-cta-label">¿Quedó claro?</div>
    <div class="ck-ath-cta-btns">
      <button class="ck-cta-ok" onclick="ckAthConfirm('${athId}','${current.id}','ok')" style="--ac:${color}">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
        ENTENDIDO
      </button>
      <button class="ck-cta-doubt" onclick="ckAthAskDoubt('${athId}','${current.id}')">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
        TENGO DUDAS
      </button>
    </div>
  </div>` : `
  <div class="ck-ath-status">
    ${current.athleteQuestion ? `
    <div class="ck-ath-asked">
      <div class="ck-ath-asked-label">💬 Tu pregunta fue enviada</div>
      <div class="ck-ath-asked-text">"${current.athleteQuestion}"</div>
    </div>` : `
    <div class="ck-ath-confirmed">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
      <span style="color:${color}">Confirmado</span>
    </div>`}
  </div>`}

  <!-- History -->
  ${history.length ? `
  <div class="ck-ath-history">
    <div class="ck-ath-history-title">HISTORIAL</div>
    ${history.map(ck=>{
      const avg = ck.scores ? Math.round(Object.values(ck.scores).reduce((a,b)=>a+b,0)/CK_CATS.length*10)/10 : null;
      return `
      <button class="ck-ath-hist-item" onclick="ckAthHistDetail('${athId}','${ck.id}')">
        <div>
          <div class="ck-ath-hist-week">${ck.weekLabel||'Sem '+ck.weekNum}</div>
          <div class="ck-ath-hist-range">${ck.dateRange||''}</div>
        </div>
        <div class="ck-ath-hist-right">
          ${avg!==null?`<span class="ck-ath-hist-avg" style="color:${color}">${avg}/5</span>`:''}
          ${ck.athleteConfirmed?'<span class="ck-hist-ok">✅</span>':ck.athleteQuestion?'<span class="ck-hist-q">💬</span>':''}
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M9 18l6-6-6-6"/></svg>
        </div>
      </button>`;
    }).join('')}
  </div>` : ''}

</div>

<!-- Question modal -->
<div class="ck-modal-bg hidden" id="ck-doubt-bg" onclick="ckDoubtClose(event)">
  <div class="ck-modal" id="ck-doubt-modal"></div>
</div>`;
}

async function ckAthToggleGoal(athId, ckId_, goalIdx){
  const list = await ckGet(athId);
  const ck = list.find(x=>x.id===ckId_);
  if(!ck||!ck.goals||!ck.goals[goalIdx]) return;
  ck.goals[goalIdx].done = !ck.goals[goalIdx].done;
  await ckSave(athId, list);
  // Re-render goals only
  const goalsEl = document.getElementById('ck-ath-goals-'+athId);
  if(goalsEl){
    const color = athColor(athId);
    goalsEl.innerHTML = ck.goals.map((g,i)=>`
    <button class="ck-ath-goal${g.done?' done':''}" onclick="ckAthToggleGoal('${athId}','${ckId_}',${i})" style="--ac:${color}">
      <div class="ck-ath-goal-check" style="border-color:${color};${g.done?'background:'+color:''}">
        ${g.done?`<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="${color==='#e8ff00'?'#000':'#fff'}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`:''}
      </div>
      <span>${g.text}</span>
    </button>`).join('');
  }
}

async function ckAthConfirm(athId, ckId_, action){
  const list = await ckGet(athId);
  const ck = list.find(x=>x.id===ckId_);
  if(!ck) return;
  ck.athleteConfirmed = true;
  ck.status = 'reviewed';
  await ckSave(athId, list);
  toast('Confirmado');
  ckAthleteView(document.getElementById('checkins-content'), currentUser);
}

function ckAthAskDoubt(athId, ckId_){
  const bg  = document.getElementById('ck-doubt-bg');
  const box = document.getElementById('ck-doubt-modal');
  if(!bg||!box) return;
  const color = athColor(athId);
  box.innerHTML = `
<div class="ck-form-title">Tu pregunta</div>
<div class="ck-form-sub">El coach va a responder pronto</div>
<textarea class="ck-textarea" id="ck-doubt-txt" rows="4" placeholder="Escribí tu duda..."></textarea>
<div class="ck-form-actions">
  <button class="ck-btn-ghost" onclick="document.getElementById('ck-doubt-bg').classList.add('hidden')">Cancelar</button>
  <button class="ck-btn-save" onclick="ckAthSendDoubt('${athId}','${ckId_}')" style="--ac:${color}">Enviar</button>
</div>`;
  bg.classList.remove('hidden');
}

async function ckAthSendDoubt(athId, ckId_){
  const txt = document.getElementById('ck-doubt-txt')?.value.trim();
  if(!txt){ toast('Escribí tu duda primero'); return; }
  const list = await ckGet(athId);
  const ck = list.find(x=>x.id===ckId_);
  if(!ck) return;
  ck.athleteQuestion = txt;
  ck.status = 'needs_response';
  await ckSave(athId, list);
  document.getElementById('ck-doubt-bg').classList.add('hidden');
  toast('Pregunta enviada');
  ckAthleteView(document.getElementById('checkins-content'), currentUser);
}

function ckDoubtClose(e){
  if(e.target===document.getElementById('ck-doubt-bg'))
    document.getElementById('ck-doubt-bg').classList.add('hidden');
}

async function ckAthHistDetail(athId, ckId_){
  const list = await ckGet(athId);
  const ck = list.find(x=>x.id===ckId_);
  if(!ck) return;
  // reuse coach modal logic but show on athlete side
  const color = athColor(athId);
  const bg = document.getElementById('ck-doubt-bg');
  const box = document.getElementById('ck-doubt-modal');
  if(!bg||!box) return;
  box.innerHTML = `
<div class="ck-modal-head">
  <div>
    <div class="ck-week-label">${ck.weekLabel||'Semana '+ck.weekNum}</div>
    <div class="ck-date-range">${ck.dateRange||''}</div>
  </div>
</div>
${ck.loomUrl ? `
<div class="ck-video-wrap" style="margin:16px 0">
  <iframe src="${ckLoomEmbed(ck.loomUrl)}"
    frameborder="0" webkitallowfullscreen mozallowfullscreen allowfullscreen
    class="ck-video"></iframe>
</div>` : ''}
<div class="ck-ath-scores" style="margin:16px 0">
  ${CK_CATS.map(c=>{
    const v = ck.scores?.[c.id]||0;
    return `
    <div class="ck-ath-score">
      <div class="ck-ath-score-icon">${c.icon}</div>
      <div class="ck-ath-score-num" style="color:${color}">${v||'—'}</div>
      ${ckDotsHtml(v, color)}
      <div class="ck-ath-score-label">${c.label}</div>
    </div>`;
  }).join('')}
</div>
${ck.summary?.length ? `
<div class="ck-section">
  <div class="ck-section-label">RESUMEN</div>
  <ul class="ck-bullets">${ck.summary.map(b=>`<li>${b}</li>`).join('')}</ul>
</div>` : ''}
${ck.goals?.length ? `
<div class="ck-section">
  <div class="ck-section-label">OBJETIVOS</div>
  <div class="ck-goals">
    ${ck.goals.map(g=>`<div class="ck-goal${g.done?' done':''}"><div class="ck-goal-check">${g.done?'✓':''}</div><div class="ck-goal-text">${g.text}</div></div>`).join('')}
  </div>
</div>` : ''}
<div class="ck-form-actions" style="margin-top:20px">
  <button class="ck-btn-ghost" onclick="document.getElementById('ck-doubt-bg').classList.add('hidden')">Cerrar</button>
</div>`;
  bg.classList.remove('hidden');
}
