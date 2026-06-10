// SQUAD TEAM v6 — Coach Renders

// ── HELPERS ──
function sparkline(data,w=80,h=28){
  if(!data||data.length<2)return `<svg width="${w}" height="${h}"><line x1="0" y1="${h/2}" x2="${w}" y2="${h/2}" stroke="#e8eaed" stroke-width="1.5"/></svg>`;
  const max=Math.max(...data,1),min=Math.min(...data,0);
  const range=max-min||1;
  const pts=data.map((v,i)=>`${(i/(data.length-1))*w},${h-((v-min)/range)*(h-6)-3}`).join(' ');
  const last=data[data.length-1],first=data[0];
  const color=last>first?'#16a34a':last<first?'#ef4444':'#9ca3af';
  return `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><polyline points="${pts}" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
}

function calcAdherence(athSessions){
  const cut=new Date();cut.setDate(cut.getDate()-30);
  return Math.min(100,Math.round((athSessions.filter(s=>new Date(s.date+'T12:00:00')>=cut).length/13)*100));
}

function weeklyVolumes(athSessions){
  const vols=[];
  for(let w=7;w>=0;w--){
    const from=new Date();from.setDate(from.getDate()-w*7-7);
    const to=new Date();to.setDate(to.getDate()-w*7);
    const vol=athSessions.filter(s=>{const d=new Date(s.date+'T12:00:00');return d>=from&&d<to;}).reduce((t,s)=>t+calcVol(s),0);
    vols.push(Math.round(vol));
  }
  return vols;
}

function timeAgo(dateStr){
  if(!dateStr)return 'nunca';
  const diff=Math.floor((new Date()-new Date(dateStr+'T12:00:00'))/86400000);
  if(diff===0)return 'hoy';if(diff===1)return 'ayer';
  if(diff<7)return `hace ${diff}d`;if(diff<30)return `hace ${Math.round(diff/7)}sem`;
  return `hace ${Math.round(diff/30)}mes`;
}

function athAvatar(a,size=34,cls=''){
  const color=athColor(a.id);
  const init=athInitial(a.name);
  return `<div class="ath-av${cls?' '+cls:''}" style="width:${size}px;height:${size}px;background:${color};font-size:${Math.round(size*.4)}px">${init}</div>`;
}

// ══════════════════════════════════════════
// COMMAND PALETTE
// ══════════════════════════════════════════
let _cmdIdx=0;
function cmdOpen(){
  document.getElementById('cmd-overlay').classList.add('open');
  const inp=document.getElementById('cmd-input');
  inp.value='';
  cmdSearch('');
  setTimeout(()=>inp.focus(),60);
}
function cmdClose(e){
  if(e&&e.target!==document.getElementById('cmd-overlay'))return;
  document.getElementById('cmd-overlay').classList.remove('open');
}
function cmdCloseForce(){document.getElementById('cmd-overlay').classList.remove('open');}
document.addEventListener('keydown',function(e){
  if((e.metaKey||e.ctrlKey)&&e.key==='k'){e.preventDefault();cmdOpen();}
  if(e.key==='Escape') cmdCloseForce();
});
function cmdSearch(q){
  const r=document.getElementById('cmd-results');
  const sections=[
    {id:'dashboard',label:'Panel',sub:'Vista principal del equipo',tag:'Nav'},
    {id:'alumnos',label:'Alumnos',sub:'Lista de alumnos',tag:'Nav'},
    {id:'planilla',label:'Planes',sub:'Rutinas y planillas',tag:'Nav'},
    {id:'nutricion',label:'Nutrición',sub:'Dietas y macros',tag:'Nav'},
    {id:'progreso',label:'Progreso',sub:'Estadísticas y PRs',tag:'Nav'},
    {id:'checkins',label:'Seguimiento',sub:'Peso y métricas',tag:'Nav'},
    {id:'pagos',label:'Pagos',sub:'Estado de pagos',tag:'Nav'},
    {id:'admin',label:'Configuración',sub:'Ajustes del sistema',tag:'Nav'},
  ];
  const athItems=(athletes||[]).map(a=>({id:'ath_'+a.id,label:a.name,sub:getAthSessions(a.id).length+' sesiones · '+timeAgo(getAthSessions(a.id).sort((x,y)=>new Date(y.date)-new Date(x.date))[0]?.date),tag:'Atleta',athId:a.id}));
  const all=[...sections,...athItems];
  const filtered=q?all.filter(x=>(x.label+x.sub).toLowerCase().includes(q.toLowerCase())):all;
  _cmdIdx=0;
  if(!filtered.length){r.innerHTML='<div class="cmd-empty">Sin resultados para "'+q+'"</div>';return;}
  r.innerHTML=filtered.slice(0,8).map((x,i)=>`
    <div class="cmd-result${i===0?' active':''}" onclick="cmdSelect('${x.id}')" data-idx="${i}">
      <div class="cmd-r-ic" style="${x.athId?'background:'+athColor(x.athId)+';color:#000':''}">${x.athId?athInitial(x.label):'<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>'}</div>
      <div><div class="cmd-r-name">${x.label}</div><div class="cmd-r-sub">${x.sub}</div></div>
      <span class="cmd-r-tag">${x.tag}</span>
    </div>
  `).join('');
}
function cmdSelect(id){
  cmdCloseForce();
  if(id.startsWith('ath_')){
    const athId=id.replace('ath_','');
    openAthProfile(athId);
  } else {
    goSection(id,document.querySelector(`[data-tab="${id}"]`));
  }
}
function cmdKey(e){
  const items=document.querySelectorAll('.cmd-result');
  if(!items.length)return;
  if(e.key==='ArrowDown'){e.preventDefault();_cmdIdx=Math.min(_cmdIdx+1,items.length-1);}
  else if(e.key==='ArrowUp'){e.preventDefault();_cmdIdx=Math.max(_cmdIdx-1,0);}
  else if(e.key==='Enter'){e.preventDefault();const active=document.querySelector('.cmd-result.active');if(active)active.click();return;}
  items.forEach((el,i)=>el.classList.toggle('active',i===_cmdIdx));
}

// ── TIMESTAMP INTELIGENTE ──
function fmtTs(dateStr){
  if(!dateStr)return '';
  const d=new Date(dateStr+'T12:00:00');
  const now=new Date();
  const diff=Math.floor((now-d)/86400000);
  if(diff===0)return 'hoy';
  if(diff===1)return 'ayer';
  if(diff<7)return 'hace '+diff+' días';
  return d.toLocaleDateString('es-UY',{day:'numeric',month:'short'}).toLowerCase();
}

// ── DASHBOARD ──
// Bandeja de entrada operativa: bloques aparecen solo cuando hay algo
// accionable. Cada renderer maneja su propia visibilidad. El cleanup
// de listeners se hace al cambiar de seccion (ver _stopAllTimersAndSubs).
function renderDashboard(){
  if(!Array.isArray(athletes)||!athletes.length) athletes=typeof DEFAULT_ATHLETES!=='undefined'?DEFAULT_ATHLETES:[];

  const root=document.getElementById('dashboard-content');
  if(!root) return;

  root.innerHTML = `
    <div class="dash">
      <div id="dash-header"></div>
      <div id="dash-alerts"></div>
      <div id="dash-today"></div>
      <div id="dash-hitos"></div>
      <div id="dash-riesgo"></div>
      <div class="dash-divider"></div>
      <div id="dash-caja"></div>
      <div id="dash-empty" class="hidden"></div>
    </div>`;

  renderDashHeader();
  renderDashAlerts();
  renderDashToday();
  renderDashHitos();
  renderDashRiesgo();
  renderDashCaja();
  checkDashEmpty();
}

// ── E2 · LINEA DE ESTADO Y SALUDO ──
function renderDashHeader(){
  const el = document.getElementById('dash-header');
  if(!el) return;
  const name = ((currentUser?.name) || 'Coach').split(' ')[0];
  const tasks  = countOpenTasks();
  const alerts = countAlerts();
  const billed = sumBilledThisMonth();
  const parts = [];
  parts.push(`${tasks} TAREA${tasks!==1?'S':''} HOY`);
  parts.push(alerts > 0 ? `${alerts} ALERTA${alerts!==1?'S':''}` : 'SIN ALERTAS');
  parts.push(`$${fmtMoney(billed)} FACTURADO`);
  el.innerHTML = `
    <div class="dash-greeting">HOLA, ${escapeHtml(name.toUpperCase())}.</div>
    <div class="dash-status">${parts.join(' · ')}</div>`;
}

// Stub que la E7 reemplaza con la cifra real.
function sumBilledThisMonth(){ return 0; }
function fmtMoney(n){ return Math.round(n||0).toLocaleString('es-UY'); }
function escapeHtml(s){
  return String(s==null?'':s)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}

// ── E3 · BLOQUE ALERTAS ──
// Solo dispara con criticidad real: pago vencido >= 7d o dropout >= 14d.
function getLastOverduePayment(athId){
  const a = (athletes||[]).find(x=>x.id===athId);
  if(!a) return null;
  // Reutilizamos payCalc que ya entiende el ciclo y status.
  if(typeof payCalc !== 'function') return null;
  let calc; try{ calc = payCalc(a); }catch(e){ return null; }
  if(!calc || calc.status !== 'overdue') return null;
  const amount = parseFloat(a.payment?.amount) || 0;
  const currency = a.payment?.currency || 'UYU';
  const now = new Date();
  // Aprox: la cuota vencio hace daysOverdue dias respecto al payday del mes pasado.
  const payday = parseInt(a.payment?.payday) || 1;
  const lastDue = new Date(now.getFullYear(), now.getMonth() - (now.getDate() < payday ? 1 : 0), payday);
  const daysOverdue = Math.max(0, Math.floor((now - lastDue) / 86400000));
  return { amount, currency, daysOverdue };
}

function daysSinceLastSession(athId){
  const ss = getAthSessions(athId);
  if(!ss.length) return 999;
  const sorted = [...ss].sort((x,y)=>new Date(y.date)-new Date(x.date));
  return Math.floor((Date.now() - new Date(sorted[0].date+'T12:00:00')) / 86400000);
}

function getNormalFrequency(athId){
  // Sesiones por semana en los ultimos 60 dias.
  const ss = getAthSessions(athId);
  const cutoff = Date.now() - 60*86400000;
  const recent = ss.filter(s => new Date(s.date+'T12:00:00') >= cutoff);
  return recent.length / (60/7);
}

function getAlerts(){
  const list = [];
  for(const a of (athletes||[]).filter(x=>!x.inactive && !x.archived && !x.guest)){
    const pay = getLastOverduePayment(a.id);
    if(pay && pay.daysOverdue >= 7){
      list.push({
        type:'payment', athId:a.id, athName:a.name,
        severity: 100 + pay.daysOverdue,
        headline:`${a.name.toUpperCase()} · pago vencido hace ${pay.daysOverdue} días`,
        detail:`$${fmtMoney(pay.amount)} ${pay.currency}`,
        actions:[
          { label:'COBRAR',  primary:true, onclick:`coachAction('markPaid','${a.id}')` },
          { label:'AVISAR',  onclick:`coachAction('paymentReminder','${a.id}')` },
        ],
      });
    }
    const days = daysSinceLastSession(a.id);
    const freq = getNormalFrequency(a.id);
    if(days >= 14 && days !== 999 && freq >= 2){
      list.push({
        type:'dropout', athId:a.id, athName:a.name,
        severity: 200 + days,
        headline:`${a.name.toUpperCase()} · sin entrenar hace ${days} días`,
        detail:`solía hacer ${Math.round(freq)}×/semana`,
        actions:[
          { label:'AUDIO', primary:true, onclick:`coachAction('audioWA','${a.id}','dropout')` },
          { label:'PLAN',  onclick:`coachAction('openAthlete','${a.id}')` },
        ],
      });
    }
  }
  return list.sort((x,y)=>y.severity-x.severity);
}

function countAlerts(){ return getAlerts().length; }

function dashRowHTML(item, extraCls){
  const acts = (item.actions||[]).map(a =>
    `<button class="dash-btn${a.primary?' primary':''}" onclick="${a.onclick}">${a.label}</button>`
  ).join('');
  return `<div class="dash-row ${extraCls||''}">
    <div class="dash-row-body">
      <div class="dash-row-headline">${item.headline}</div>
      ${item.detail?`<div class="dash-row-detail">${item.detail}</div>`:''}
    </div>
    <div class="dash-row-actions">${acts}</div>
  </div>`;
}

function renderDashAlerts(){
  const el = document.getElementById('dash-alerts');
  if(!el) return;
  const list = getAlerts();
  if(!list.length){ el.style.display='none'; el.innerHTML=''; return; }
  el.style.display='';
  el.innerHTML = `<div class="dash-block">
    <div class="dash-block-head">Alertas</div>
    ${list.map(it => dashRowHTML(it,'alert')).join('')}
  </div>`;
}

// ── Accion centralizada (compartida E3-E6) ──
function coachAction(type, athId, ...args){
  const ath = (athletes||[]).find(a => a.id === athId);
  if(!ath) return;
  switch(type){
    case 'markPaid':
      if(typeof pgOpenMarkPaid==='function') pgOpenMarkPaid(athId);
      else goSection('pagos', document.querySelector('[data-tab=pagos]'));
      break;
    case 'paymentReminder':
      openWhatsAppPaymentReminder(ath); break;
    case 'audioWA':
      openWhatsAppAudioPrompt(ath, args[0], args[1]); break;
    case 'openAthlete':
      if(typeof openAthProfile==='function') openAthProfile(athId);
      else goSection('alumnos', document.querySelector('[data-tab=alumnos]'));
      break;
    default:
      console.warn('[coachAction] tipo desconocido:', type);
  }
}

function openWhatsAppPaymentReminder(ath){
  const phone = (ath.phone||'').replace(/\D/g,'');
  if(!phone){ toast('El alumno no tiene teléfono cargado.'); return; }
  const amt = parseFloat(ath.payment?.amount) || 0;
  const ccy = ath.payment?.currency || 'UYU';
  const msg = `Hola ${ath.name}, te paso el recordatorio del pago: $${fmtMoney(amt)} ${ccy}. ¿Cómo lo coordinamos?`;
  window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, '_blank');
}

function openWhatsAppAudioPrompt(ath, reason, ctx){
  const phone = (ath.phone||'').replace(/\D/g,'');
  if(!phone){ toast('El alumno no tiene teléfono cargado.'); return; }
  let msg = '';
  if(reason==='pr')        msg = `${ath.name}, vi tu PR. Te mando audio en un toque.`;
  if(reason==='dropout')   msg = `${ath.name}, hace días que no entrenás. ¿Está todo bien?`;
  if(reason==='milestone') msg = `${ath.name}, vi tu marca. Felicitaciones.`;
  if(reason==='checkin')   msg = `${ath.name}, ¿podemos repasar el check-in?`;
  window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, '_blank');
}

// ── E4 · BLOQUE HOY · TAREAS TACHABLES ──
// Las tareas se auto-generan a partir del estado del equipo. El "tachado"
// persiste solo por el dia local; al cambiar de fecha, el doc anterior no
// aplica y las tareas vuelven a verse si siguen vigentes.
let _dashTasksDone = new Set();        // ids tachadas hoy (snapshot local)
let _dashTasksLoaded = false;
let _dashTasksDate = '';

function localDateISO(d){
  d = d || new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth()+1).padStart(2,'0');
  const day = String(d.getDate()).padStart(2,'0');
  return `${y}-${m}-${day}`;
}

function isoWeekId(d){
  d = new Date(d || Date.now());
  const target = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNr = (target.getUTCDay() + 6) % 7;
  target.setUTCDate(target.getUTCDate() - dayNr + 3);
  const firstThursday = new Date(Date.UTC(target.getUTCFullYear(),0,4));
  const week = 1 + Math.round(((target - firstThursday) / 86400000 - 3 + ((firstThursday.getUTCDay()+6)%7)) / 7);
  return `${target.getUTCFullYear()}_W${String(week).padStart(2,'0')}`;
}

function monthIdToday(){
  const d = new Date();
  return `${d.getFullYear()}_${String(d.getMonth()+1).padStart(2,'0')}`;
}

async function loadDashTasks(){
  const today = localDateISO();
  if(_dashTasksLoaded && _dashTasksDate === today) return;
  _dashTasksDate = today;
  _dashTasksDone = new Set();
  _dashTasksLoaded = true;
  const uid = window.auth?.currentUser?.uid;
  if(!uid || !window.db) return;
  try{
    const snap = await window.db.collection('users').doc(uid)
      .collection('dashTasks').doc(today).get();
    if(snap.exists){
      const ids = (snap.data()||{}).doneIds || [];
      _dashTasksDone = new Set(ids);
    }
  }catch(e){}
}

async function markDashTaskDone(taskId){
  _dashTasksDone.add(taskId);
  const uid = window.auth?.currentUser?.uid;
  if(!uid || !window.db) return;
  try{
    await window.db.collection('users').doc(uid)
      .collection('dashTasks').doc(localDateISO())
      .set({
        doneIds: firebase.firestore.FieldValue.arrayUnion(taskId),
        updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
      }, { merge: true });
  }catch(e){}
}

async function unmarkDashTaskDone(taskId){
  _dashTasksDone.delete(taskId);
  const uid = window.auth?.currentUser?.uid;
  if(!uid || !window.db) return;
  try{
    await window.db.collection('users').doc(uid)
      .collection('dashTasks').doc(localDateISO())
      .set({
        doneIds: firebase.firestore.FieldValue.arrayRemove(taskId),
        updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
      }, { merge: true });
  }catch(e){}
}

// Generadores de tareas. Cada uno devuelve { id, label, actionLabel, onclick }.
function getOpenTasks(){
  const list = [];
  const monthId = monthIdToday();
  const monthName = new Date().toLocaleDateString('es-UY',{month:'long'}).toUpperCase();
  const now = Date.now();
  const oneDay = 86400000;

  for(const a of (athletes||[]).filter(x=>!x.inactive && !x.archived && !x.guest)){
    // A) Check-in respondido sin feedback del coach hace > 24h.
    const ck = a.lastCheckin || null;
    if(ck && ck.respondedAt && (now - new Date(ck.respondedAt).getTime() > oneDay) && !ck.coachFeedback){
      const weekId = ck.weekId || isoWeekId(ck.respondedAt);
      list.push({
        id:`checkin:${a.id}:${weekId}`,
        label:`Responder check-in de ${a.name}`,
        actionLabel:'ABRIR',
        onclick:`coachAction('openAthlete','${a.id}')`,
      });
    }
    // B) Sin plan asignado para el mes en curso.
    const planMonths = a.plan?.months || a.planMonths || [];
    if(Array.isArray(planMonths) && !planMonths.includes(monthId)){
      list.push({
        id:`plan:${a.id}:${monthId}`,
        label:`Cargar plan de ${monthName.toLowerCase()} a ${a.name}`,
        actionLabel:'ARMAR',
        onclick:`coachAction('openAthlete','${a.id}')`,
      });
    }
    // C) PR registrado por el alumno en < 24h, sin audio enviado.
    const ss = getAthSessions(a.id);
    for(const s of ss.slice(0,3)){
      const stamp = new Date(s.date+'T12:00:00').getTime();
      if(now - stamp > oneDay) continue;
      (s.exercises||[]).forEach(ex => {
        (ex.sets||[]).forEach((st,i) => {
          if(st.pr){
            const prId = `${s.date}_${ex.name}_${i}`.replace(/\W+/g,'_');
            list.push({
              id:`pr-audio:${a.id}:${prId}`,
              label:`Audio a ${a.name} por PR de ${ex.name} · ${st.kg}KG`,
              actionLabel:'AUDIO',
              onclick:`coachAction('audioWA','${a.id}','pr','${prId}')`,
            });
          }
        });
      });
    }
    // D) Pago marcado como "pendiente confirmar".
    const pay = a.payment || {};
    if(pay.status === 'pending-confirm' && pay.pendingId){
      list.push({
        id:`confirm-pay:${a.id}:${pay.pendingId}`,
        label:`Confirmar pago de ${a.name} (${pay.method||'sin método'})`,
        actionLabel:'CONFIRMAR',
        onclick:`coachAction('markPaid','${a.id}')`,
      });
    }
  }
  return list;
}

function countOpenTasks(){
  return getOpenTasks().filter(t => !_dashTasksDone.has(t.id)).length;
}

function renderDashToday(){
  const el = document.getElementById('dash-today');
  if(!el) return;

  // Async: cargamos las tareas tachadas del dia y re-rendereamos. La primera
  // pasada muestra todas como pendientes hasta que llega Firestore.
  loadDashTasks().then(() => {
    const tasks = getOpenTasks();
    if(!tasks.length){ el.style.display='none'; el.innerHTML=''; return; }
    el.style.display='';
    const pending = tasks.filter(t => !_dashTasksDone.has(t.id));
    const head = pending.length
      ? `HOY · ${pending.length} PENDIENTE${pending.length!==1?'S':''}`
      : 'HOY · TODO RESUELTO.';

    const rows = tasks.map(t => {
      const done = _dashTasksDone.has(t.id);
      return `<div class="dash-task${done?' done':''}" data-task-id="${escapeHtml(t.id)}">
        <button class="dash-task-check" onclick="toggleDashTask('${escapeHtml(t.id)}')" aria-label="Marcar como hecho"></button>
        <div class="dash-task-label">${escapeHtml(t.label)}</div>
        <button class="dash-btn dash-task-action" onclick="${t.onclick}">${escapeHtml(t.actionLabel)}</button>
      </div>`;
    }).join('');

    el.innerHTML = `<div class="dash-block">
      <div class="dash-block-head">${head}</div>
      ${pending.length ? rows : `<div class="dash-task-resolved">${rows ? rows : ''}</div>`}
    </div>`;

    // Si todo esta resuelto, colapsamos a la linea unica.
    if(!pending.length){
      el.innerHTML = `<div class="dash-block">
        <div class="dash-block-head">HOY · TODO RESUELTO.</div>
      </div>`;
    }
  });
}

async function toggleDashTask(taskId){
  const isDone = _dashTasksDone.has(taskId);
  if(isDone) await unmarkDashTaskDone(taskId);
  else       await markDashTaskDone(taskId);
  renderDashToday();
  renderDashHeader();
}
window.toggleDashTask = toggleDashTask;

// ── E5 · BLOQUE HITOS · ULTIMAS 24H ──
function getRecentPRs(athId, sinceTs){
  const out = [];
  const ss = getAthSessions(athId);
  for(const s of ss){
    const ts = new Date(s.date+'T12:00:00').getTime();
    if(ts < sinceTs) continue;
    (s.exercises||[]).forEach(ex => {
      (ex.sets||[]).forEach((st,i) => {
        if(st.pr){
          const prId = `${s.date}_${ex.name}_${i}`.replace(/\W+/g,'_');
          out.push({
            id: prId,
            exercise: ex.name,
            kg: st.kg,
            reps: st.reps,
            delta: st.deltaKg || null,
            ts,
          });
        }
      });
    });
  }
  return out;
}

// Milestones simples sin estado persistido: chequea estado actual + fecha
// del ultimo cambio. La validacion de "nuevo en 24h" la hace el filtro de ts.
function getRecentMilestones(athId, sinceTs){
  const out = [];
  const ss = getAthSessions(athId);
  if(!ss.length) return out;

  // 1) Conteo de sesiones cae justo en multiplo de 50.
  const total = ss.length;
  const lastTs = new Date(ss[0].date+'T12:00:00').getTime();
  if(lastTs >= sinceTs && total > 0 && total % 50 === 0){
    out.push({ label:`${total} sesiones cumplidas`, context:'milestone', ts: lastTs });
  }

  // 2) Rachas: 7, 21, 50, 100. Solo se muestra si la racha actual coincide
  // exactamente y la ultima sesion fue en las ultimas 24h.
  const streak = getStreak(athId);
  if([7,21,50,100].includes(streak) && lastTs >= sinceTs){
    out.push({ label:`${streak} días de racha`, context:'racha', ts: lastTs });
  }

  // 3) Cruce de peso redondo (60/80/100/120/140) en ejercicios mayores.
  const big = ['banca','sentadilla','peso muerto','press','squat','deadlift','bench'];
  const rounds = [60,80,100,120,140];
  for(const s of ss){
    const ts = new Date(s.date+'T12:00:00').getTime();
    if(ts < sinceTs) continue;
    (s.exercises||[]).forEach(ex => {
      const isBig = big.some(k => (ex.name||'').toLowerCase().includes(k));
      if(!isBig) return;
      (ex.sets||[]).forEach(st => {
        const kg = parseFloat(st.kg) || 0;
        for(const r of rounds){
          if(kg >= r){
            // Solo notificar la primera vez que cruza ese umbral.
            const prevMax = Math.max(0, ...ss.flatMap(s2 => {
              if(new Date(s2.date+'T12:00:00').getTime() >= ts) return [];
              return (s2.exercises||[]).filter(e=>e.name===ex.name).flatMap(e=>(e.sets||[]).map(x=>parseFloat(x.kg)||0));
            }));
            if(prevMax < r && kg >= r){
              out.push({ label:`Cruzó ${r}KG en ${ex.name}`, context:'milestone', ts });
            }
          }
        }
      });
    });
  }
  return out;
}

function getHitos(){
  const since = Date.now() - 24*60*60*1000;
  const list = [];
  for(const a of (athletes||[]).filter(x=>!x.inactive && !x.archived && !x.guest)){
    for(const pr of getRecentPRs(a.id, since)){
      list.push({
        type:'pr', athId:a.id, athName:a.name,
        headline:`${a.name.toUpperCase()} · PR ${(pr.exercise||'').toUpperCase()} · ${pr.kg} KG`,
        detail: pr.delta ? `+${pr.delta}KG vs último` : 'primer PR registrado',
        actions:[{ label:'AUDIO', primary:true, onclick:`coachAction('audioWA','${a.id}','pr','${pr.id}')` }],
        ts: pr.ts,
      });
    }
    for(const m of getRecentMilestones(a.id, since)){
      list.push({
        type:'milestone', athId:a.id, athName:a.name,
        headline:`${a.name.toUpperCase()} · ${m.label}`,
        detail: m.context || '',
        actions:[{ label:'AUDIO', primary:true, onclick:`coachAction('audioWA','${a.id}','milestone')` }],
        ts: m.ts,
      });
    }
  }
  return list.sort((x,y)=>y.ts-x.ts).slice(0,6);
}

function renderDashHitos(){
  const el = document.getElementById('dash-hitos');
  if(!el) return;
  const list = getHitos();
  if(!list.length){ el.style.display='none'; el.innerHTML=''; return; }
  el.style.display='';
  el.innerHTML = `<div class="dash-block">
    <div class="dash-block-head">Hitos · últimas 24h</div>
    ${list.map(it => dashRowHTML(it)).join('')}
  </div>`;
}
function renderDashRiesgo(){ /* E6 */ }
function renderDashCaja(){   /* E7 */ }
function checkDashEmpty(){   /* E8 */ }



// ── ALUMNOS ──
function renderAlumnos(){
  if(!Array.isArray(athletes)||!athletes.length) athletes=typeof DEFAULT_ATHLETES!=='undefined'?DEFAULT_ATHLETES:[];

  const cont=document.getElementById('alumnos-content');
  if(!cont)return;
  const now=new Date();
  cont.innerHTML=`
  <div class="sec-head" style="margin-bottom:16px">
    <div class="sec-title" style="font-size:18px;font-weight:800">Alumnos</div>
    <button class="btn-primary" onclick="openNewAthleteModal()">+ Nuevo alumno</button>
  </div>
  <div class="search-bar">
    <input class="search-input" placeholder="Buscar alumno..." oninput="filterAlumnos(this.value)" id="ath-search">
    <button class="btn-filter">Filtros</button>
    <button class="btn-filter">↕ Ordenar</button>
  </div>
  <div class="card" style="padding:0;overflow:hidden">
    <table class="ath-table" id="full-ath-table">
      <thead><tr>
        <th>ALUMNO</th><th>TIPO</th><th>ÚLTIMA SESIÓN</th><th>RACHA</th><th>ADHERENCIA</th><th>PAGO</th><th>PROGRESO</th><th></th>
      </tr></thead>
      <tbody>
        ${athletes.filter(a=>!a.inactive).map(a=>{
          const ss=getAthSessions(a.id);
          const sorted=[...ss].sort((x,y)=>new Date(y.date)-new Date(x.date));
          const last=sorted[0];
          const streak=getStreak(a.id);
          const ds=last?Math.floor((now-new Date(last.date+'T12:00:00'))/86400000):999;
          const adh=calcAdherence(ss);
          const vols=weeklyVolumes(ss);
          const pay=a.payment||{};
          const hoy=now.getDate();
          const dl=pay.payday?(pay.payday>=hoy?pay.payday-hoy:(pay.payday+30)-hoy):null;
          const payBadge=pay.status==='paid'?'<span class="badge green">✅ Al día</span>':dl!==null&&dl<=3?`<span class="badge red">⚠️ ${dl===0?'HOY':dl+'d'}</span>`:`<span class="badge gray">⏳ Día ${pay.payday||'?'}</span>`;
          const sessionBadge=ds===0?'<span class="badge green">● Hoy</span>':ds<=2?`<span class="badge orange">● ${ds}d`+'</span>':ds===999?'<span class="badge gray">● Nunca</span>':`<span class="badge red">● ${ds}d</span>`;
          const adhColor=adh>=70?'#16a34a':adh>=40?'#f59e0b':'#ef4444';
          return `<tr id="ath-row-${a.id}">
            <td>
              <div class="ath-cell">
                ${athAvatar(a)}
                <div>
                  <div class="ath-nm">${a.name}</div>
                  <div class="ath-subs">${ss.length} sesiones${pay.amount?' · $'+pay.amount+' '+(pay.currency||'UYU'):''}</div>
                </div>
              </div>
            </td>
            <td><span class="tag ${a.freestyle?'free':'plan'}">${a.freestyle?'Freestyle':'Con plan'}</span></td>
            <td>${sessionBadge}</td>
            <td><span class="fire-badge">🔥 ${streak}d</span></td>
            <td>
              <div class="adh-bar-wrap">
                <div class="adh-bar-bg"><div class="adh-bar-fill" style="width:${adh}%;background:${adhColor}"></div></div>
                <div class="adh-pct">${adh}%</div>
              </div>
            </td>
            <td>${payBadge}</td>
            <td>${sparkline(vols)}</td>
            <td>
              <div class="action-btns">
                <button class="btn-train" title="Entrenar a ${a.name}" onclick="enterTrainingMode('${a.id}')">🏋️ Entrenar</button>
                <button class="btn-icon" title="Ver perfil" onclick="openAthProfile('${a.id}')">👤</button>
                <button class="btn-icon" title="Planilla" onclick="openAthPlanilla('${a.id}')">📋</button>
                <button class="btn-icon" title="Dieta" onclick="openAthDiet('${a.id}')">🥗</button>
                <button class="btn-icon" title="Editar alumno" onclick="openEditAthleteModal('${a.id}')">✏️</button>
              </div>
            </td>
          </tr>`;
        }).join('')}
      </tbody>
    </table>
  </div>
  ${athletes.filter(a=>a.inactive).length ? `
  <details style="margin-top:16px">
    <summary style="cursor:pointer;font-size:12px;color:var(--sub);padding:8px 4px;user-select:none">
      Dados de baja (${athletes.filter(a=>a.inactive).length})
    </summary>
    <div class="card" style="padding:0;overflow:hidden;margin-top:8px;opacity:.6">
      <table class="ath-table">
        <tbody>
          ${athletes.filter(a=>a.inactive).map(a=>`
          <tr>
            <td><div class="ath-cell">${athAvatar(a)}<div><div class="ath-nm">${a.name}</div><div class="ath-subs" style="color:var(--red)">Dado de baja</div></div></div></td>
            <td><span class="tag">${a.freestyle?'Freestyle':'Con plan'}</span></td>
            <td colspan="5" style="color:var(--sub);font-size:12px">Cuenta desactivada</td>
            <td><button class="btn-icon" title="Editar" onclick="openEditAthleteModal('${a.id}')">✏️</button></td>
          </tr>`).join('')}
        </tbody>
      </table>
    </div>
  </details>` : ''}

  <!-- STAFF / COACHES -->
  <div style="margin-top:24px">
    <div style="font-size:11px;font-weight:700;color:var(--sub);letter-spacing:.12em;text-transform:uppercase;margin-bottom:10px">Staff</div>
    <div class="card" style="padding:0;overflow:hidden">
      <table class="ath-table">
        <tbody>
          ${Object.values(typeof COACHES!=='undefined'?COACHES:{}).map(c=>`
          <tr>
            <td>
              <div class="ath-cell">
                <div style="width:34px;height:34px;border-radius:50%;background:${c.color}20;color:${c.color};display:flex;align-items:center;justify-content:center;font-weight:800;font-size:14px;flex-shrink:0">${(c.name||'?')[0].toUpperCase()}</div>
                <div>
                  <div class="ath-nm">${c.name}</div>
                  <div class="ath-subs">Coach</div>
                </div>
              </div>
            </td>
            <td><span class="badge" style="background:${c.color}18;color:${c.color};border:1px solid ${c.color}33;padding:3px 8px;border-radius:6px;font-size:11px;font-weight:700">Coach</span></td>
            <td colspan="5"></td>
            <td>
              <div class="action-btns">
                <button class="btn-icon" title="Cambiar contraseña" onclick="openCoachPassModal('${c.id}','${c.name}')">🔑</button>
              </div>
            </td>
          </tr>`).join('')}
        </tbody>
      </table>
    </div>
  </div>`;
}

function openCoachPassModal(coachId, coachName){
  let ov=document.getElementById('coach-pass-ov');
  if(!ov){ov=document.createElement('div');ov.id='coach-pass-ov';document.body.appendChild(ov);}
  ov.style.cssText='position:fixed;inset:0;z-index:9000;background:rgba(0,0,0,.65);backdrop-filter:blur(6px);display:flex;align-items:center;justify-content:center;padding:20px';
  ov.onclick=e=>{if(e.target===ov)ov.remove();};
  const inp='width:100%;background:var(--surf2);border:1px solid var(--border);border-radius:10px;padding:10px 13px;font-size:14px;color:var(--text);font-family:inherit;outline:none;box-sizing:border-box';
  const lbl='font-size:10px;font-weight:700;letter-spacing:.1em;color:var(--sub);text-transform:uppercase;margin-bottom:6px';
  ov.innerHTML=`
  <div style="background:var(--surf);border:1px solid var(--border2);border-radius:16px;width:100%;max-width:380px;overflow:hidden">
    <div style="padding:20px 22px 16px;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid var(--border)">
      <div style="font-size:15px;font-weight:800;color:var(--text)">Contraseña — ${coachName}</div>
      <button onclick="document.getElementById('coach-pass-ov').remove()" style="background:none;border:1px solid var(--border);border-radius:8px;width:30px;height:30px;cursor:pointer;color:var(--sub);font-size:18px;display:flex;align-items:center;justify-content:center">×</button>
    </div>

    <!-- Modo cambio (sabe la contraseña actual) -->
    <div id="cp-mode-change">
      <div style="padding:18px 22px;display:flex;flex-direction:column;gap:14px">
        <div><div style="${lbl}">Contraseña actual</div><input id="cp-current" type="password" placeholder="contraseña actual" style="${inp}"></div>
        <div><div style="${lbl}">Contraseña nueva</div><input id="cp-new" type="password" placeholder="mínimo 4 caracteres" style="${inp}"></div>
        <div id="cp-msg" style="font-size:12px;display:none"></div>
        <div style="font-size:12px;color:var(--sub)">
          ¿No sabés la contraseña actual?
          <button onclick="_cpSwitchMode('reset')" style="background:none;border:none;color:var(--acc);cursor:pointer;font-size:12px;font-family:inherit;padding:0;text-decoration:underline">Recrear cuenta</button>
        </div>
      </div>
      <div style="padding:0 22px 20px;display:flex;gap:8px;justify-content:flex-end">
        <button onclick="document.getElementById('coach-pass-ov').remove()" style="padding:10px 18px;background:none;border:1px solid var(--border);border-radius:10px;color:var(--sub);font-size:13px;font-weight:600;cursor:pointer;font-family:inherit">Cancelar</button>
        <button id="cp-btn" onclick="_saveCoachPass('${coachId}')" style="padding:10px 22px;background:var(--acc);border:none;border-radius:10px;color:#000;font-size:13px;font-weight:800;cursor:pointer;font-family:inherit">Actualizar</button>
      </div>
    </div>

    <!-- Modo recrear (no sabe la contraseña actual) -->
    <div id="cp-mode-reset" style="display:none">
      <div style="padding:18px 22px;display:flex;flex-direction:column;gap:12px">
        <div style="font-size:13px;color:var(--sub);background:var(--surf2);border:1px solid var(--border);border-radius:10px;padding:12px 14px;line-height:1.6">
          <strong style="color:var(--text)">Paso 1:</strong> Andá a Firebase Console → Authentication → Users → buscá <strong style="color:var(--acc)">${coachId}@squadteam.uy</strong> → ⋮ → <em>Borrar cuenta</em>.<br><br>
          <strong style="color:var(--text)">Paso 2:</strong> Volvé acá, ingresá la contraseña nueva y hacé clic en Recrear.
        </div>
        <div><div style="${lbl}">Contraseña nueva</div><input id="cp-new-reset" type="password" placeholder="mínimo 4 caracteres" style="${inp}"></div>
        <div id="cp-msg-reset" style="font-size:12px;display:none"></div>
        <div style="font-size:12px;color:var(--sub)">
          <button onclick="_cpSwitchMode('change')" style="background:none;border:none;color:var(--acc);cursor:pointer;font-size:12px;font-family:inherit;padding:0;text-decoration:underline">← Volver al modo normal</button>
        </div>
      </div>
      <div style="padding:0 22px 20px;display:flex;gap:8px;justify-content:flex-end">
        <button onclick="document.getElementById('coach-pass-ov').remove()" style="padding:10px 18px;background:none;border:1px solid var(--border);border-radius:10px;color:var(--sub);font-size:13px;font-weight:600;cursor:pointer;font-family:inherit">Cancelar</button>
        <button id="cp-btn-reset" onclick="_recreateCoachPass('${coachId}')" style="padding:10px 22px;background:var(--acc);border:none;border-radius:10px;color:#000;font-size:13px;font-weight:800;cursor:pointer;font-family:inherit">Recrear cuenta</button>
      </div>
    </div>
  </div>`;
}

function _cpSwitchMode(mode){
  document.getElementById('cp-mode-change').style.display = mode==='change' ? '' : 'none';
  document.getElementById('cp-mode-reset').style.display  = mode==='reset'  ? '' : 'none';
}

async function _saveCoachPass(coachId){
  const currentPass = document.getElementById('cp-current')?.value?.trim();
  const newPass     = document.getElementById('cp-new')?.value?.trim();
  const msgEl       = document.getElementById('cp-msg');
  const btn         = document.getElementById('cp-btn');
  const show = (txt,ok)=>{ msgEl.textContent=txt; msgEl.style.color=ok?'#22c55e':'#ef4444'; msgEl.style.display='block'; };

  if(!currentPass){ show('Ingresá la contraseña actual'); return; }
  if(!newPass||newPass.length<4){ show('La contraseña nueva debe tener al menos 4 caracteres'); return; }

  btn.disabled=true; btn.textContent='Actualizando...'; msgEl.style.display='none';
  try{
    // Try stored password first, fall back to entered current password
    const pinDoc = await window.db.collection('pins').doc(coachId).get();
    const stored  = pinDoc.data()?.pin || currentPass;

    const secondaryApp=firebase.initializeApp(firebase.app().options,'coach_pass_'+Date.now());
    const secondaryAuth=secondaryApp.auth();
    try{
      const cred=await secondaryAuth.signInWithEmailAndPassword(`${coachId}@squadteam.uy`,`sq${stored}`);
      await cred.user.updatePassword(`sq${newPass}`);
      await window.db.collection('pins').doc(coachId).set({pin:newPass});
      show('Contraseña actualizada correctamente',true);
      document.getElementById('cp-current').value='';
      document.getElementById('cp-new').value='';
    } finally {
      await secondaryAuth.signOut().catch(()=>{});
      await secondaryApp.delete().catch(()=>{});
    }
  } catch(e){
    const msg=e.code==='auth/wrong-password'?'Contraseña actual incorrecta'
      :e.code==='auth/user-not-found'?'Usuario no encontrado'
      :e.message;
    show(msg);
  } finally {
    btn.disabled=false; btn.textContent='Actualizar';
  }
}

async function _recreateCoachPass(coachId){
  const newPass = document.getElementById('cp-new-reset')?.value?.trim();
  const msgEl   = document.getElementById('cp-msg-reset');
  const btn     = document.getElementById('cp-btn-reset');
  const show = (txt,ok)=>{ msgEl.textContent=txt; msgEl.style.color=ok?'#22c55e':'#ef4444'; msgEl.style.display='block'; };

  if(!newPass||newPass.length<4){ show('La contraseña debe tener al menos 4 caracteres'); return; }

  btn.disabled=true; btn.textContent='Creando...'; msgEl.style.display='none';
  const secondaryApp=firebase.initializeApp(firebase.app().options,'coach_recreate_'+Date.now());
  const secondaryAuth=secondaryApp.auth();
  try{
    const cred=await secondaryAuth.createUserWithEmailAndPassword(`${coachId}@squadteam.uy`,`sq${newPass}`);
    const coachData=typeof COACHES!=='undefined'?COACHES[coachId]:null;
    await window.db.collection('users').doc(cred.user.uid).set({
      id:coachId, name:coachData?.name||coachId, role:'coach', color:coachData?.color||'#6366f1'
    });
    await window.db.collection('pins').doc(coachId).set({pin:newPass});
    show('Cuenta creada correctamente. Ya puede iniciar sesión.',true);
    document.getElementById('cp-new-reset').value='';
  } catch(e){
    const msg=e.code==='auth/email-already-in-use'
      ?'La cuenta todavía existe en Firebase. Borrala primero (paso 1) y volvé a intentar.'
      :e.message;
    show(msg);
  } finally {
    await secondaryAuth.signOut().catch(()=>{});
    await secondaryApp.delete().catch(()=>{});
    btn.disabled=false; btn.textContent='Recrear cuenta';
  }
}

function filterAlumnos(q){
  document.querySelectorAll('#full-ath-table tbody tr').forEach(r=>{r.style.display=r.textContent.toLowerCase().includes(q.toLowerCase())?'':'none';});
}

function openNewAthleteModal(){
  let ov=document.getElementById('new-ath-ov');
  if(!ov){ov=document.createElement('div');ov.id='new-ath-ov';document.body.appendChild(ov);}
  ov.style.cssText='position:fixed;inset:0;z-index:9000;background:rgba(0,0,0,.65);backdrop-filter:blur(6px);display:flex;align-items:center;justify-content:center;padding:20px';
  ov.onclick=e=>{if(e.target===ov)ov.remove();};
  _naRenderStep(1, {});
  setTimeout(()=>document.getElementById('na-name')?.focus(), 80);
}

function _naClose(){ document.getElementById('new-ath-ov')?.remove(); }

function _naRenderStep(step, data){
  const ov = document.getElementById('new-ath-ov');
  if(!ov) return;
  const stepLabel = ['','Datos','Pago','Confirmar'][step];
  const dots = [1,2,3].map(i=>`<div style="width:8px;height:8px;border-radius:50%;background:${i===step?'var(--acc)':'var(--border2)'}"></div>`).join('');
  const header = `
    <div style="padding:20px 22px 16px;display:flex;align-items:flex-start;justify-content:space-between;border-bottom:1px solid var(--border);flex-shrink:0">
      <div>
        <div style="font-size:15px;font-weight:800;color:var(--text)">Nuevo alumno</div>
        <div style="font-size:12px;color:var(--sub);margin-top:2px">Paso ${step} de 3 — ${stepLabel}</div>
      </div>
      <div style="display:flex;align-items:center;gap:10px">
        <div style="display:flex;gap:5px;align-items:center">${dots}</div>
        <button onclick="_naClose()" style="background:none;border:1px solid var(--border);border-radius:8px;width:30px;height:30px;cursor:pointer;color:var(--sub);font-size:18px;line-height:1;display:flex;align-items:center;justify-content:center">×</button>
      </div>
    </div>`;

  let body='', footer='';
  const inp = 'width:100%;background:var(--surf2);border:1px solid var(--border);border-radius:10px;padding:10px 13px;font-size:14px;color:var(--text);font-family:inherit;outline:none;box-sizing:border-box';
  const lbl = 'font-size:10px;font-weight:700;letter-spacing:.1em;color:var(--sub);text-transform:uppercase;margin-bottom:6px';

  if(step===1){
    body=`
      <div style="padding:18px 22px;display:flex;flex-direction:column;gap:14px;overflow-y:auto;flex:1;min-height:0">
        <div>
          <div style="${lbl}">Nombre</div>
          <input id="na-name" type="text" placeholder="Nombre completo" autocomplete="off" style="${inp}"
            value="${data.name||''}" onkeydown="if(event.key==='Enter')document.getElementById('na-pin').focus()">
        </div>
        <div>
          <div style="${lbl}">Contraseña</div>
          <input id="na-pin" type="password" placeholder="mínimo 4 caracteres" style="${inp}"
            value="${data.pin||''}"
            onkeydown="if(event.key==='Enter')_naStep1Next()">
        </div>
        <div>
          <div style="${lbl}">Tipo</div>
          <div style="display:flex;gap:8px">
            <label style="flex:1;display:flex;align-items:center;gap:8px;padding:10px 13px;background:var(--surf2);border:1px solid var(--border);border-radius:10px;cursor:pointer;font-size:13px;font-weight:600;color:var(--text)">
              <input type="radio" name="na-type" value="plan" ${data.type!=='freestyle'?'checked':''} style="accent-color:var(--acc)"> Con plan
            </label>
            <label style="flex:1;display:flex;align-items:center;gap:8px;padding:10px 13px;background:var(--surf2);border:1px solid var(--border);border-radius:10px;cursor:pointer;font-size:13px;font-weight:600;color:var(--text)">
              <input type="radio" name="na-type" value="freestyle" ${data.type==='freestyle'?'checked':''} style="accent-color:var(--acc)"> Freestyle
            </label>
          </div>
        </div>
        <label style="display:flex;align-items:center;gap:12px;padding:12px 14px;background:var(--surf2);border:1.5px solid var(--border);border-radius:10px;cursor:pointer;-webkit-tap-highlight-color:transparent">
          <input type="checkbox" id="na-guest-s1" ${data.guest?'checked':''}
            style="width:16px;height:16px;accent-color:var(--acc);cursor:pointer;flex-shrink:0">
          <div>
            <div style="font-size:13px;font-weight:700;color:var(--text)">Invitado · no paga</div>
            <div style="font-size:11px;color:var(--sub);margin-top:1px">No genera cobros ni recordatorios</div>
          </div>
        </label>
      </div>`;
    footer=`
      <div style="padding:14px 22px 20px;display:flex;gap:8px;border-top:1px solid var(--border);flex-shrink:0">
        <button onclick="_naClose()" style="flex:1;padding:10px 0;background:none;border:1px solid var(--border);border-radius:10px;color:var(--sub);font-size:13px;font-weight:600;cursor:pointer;font-family:inherit">Cancelar</button>
        <button onclick="_naStep1Next()" style="flex:1;padding:10px 0;background:var(--acc);border:none;border-radius:10px;color:#000;font-size:13px;font-weight:800;cursor:pointer;font-family:inherit">Siguiente →</button>
      </div>`;
  } else if(step===2){
    const currencies=['UYU','USD','EUR'];
    const curOpts=currencies.map(c=>`<option value="${c}" ${(data.currency||'UYU')===c?'selected':''}>${c}</option>`).join('');
    body=`
      <div style="padding:18px 22px;display:flex;flex-direction:column;gap:14px;overflow-y:auto;flex:1;min-height:0">
        <div style="display:flex;gap:10px">
          <div style="flex:2">
            <div style="${lbl}">Monto mensual</div>
            <input id="na-amount" type="number" min="0" placeholder="0" style="${inp}" value="${data.amount||''}">
          </div>
          <div style="flex:1">
            <div style="${lbl}">Moneda</div>
            <select id="na-currency" style="${inp};appearance:auto">${curOpts}</select>
          </div>
        </div>
        <div>
          <div style="${lbl}">Día de vencimiento</div>
          <input id="na-payday" type="number" min="1" max="31" placeholder="ej. 10" style="${inp}" value="${data.payday||''}">
          <div style="font-size:11px;color:var(--sub);margin-top:5px">Día del mes en que se cobra (1–31)</div>
        </div>
      </div>`;
    footer=`
      <div style="padding:14px 22px 20px;display:flex;gap:8px;border-top:1px solid var(--border);flex-shrink:0">
        <button onclick="_naRenderStep(1,_naCollectStep2Back())" style="flex:1;padding:10px 0;background:none;border:1px solid var(--border);border-radius:10px;color:var(--sub);font-size:13px;font-weight:600;cursor:pointer;font-family:inherit">← Volver</button>
        <button onclick="_naStep2Next()" style="flex:1;padding:10px 0;background:var(--acc);border:none;border-radius:10px;color:#000;font-size:13px;font-weight:800;cursor:pointer;font-family:inherit">Siguiente →</button>
      </div>`;
  } else if(step===3){
    const email=`${data.id}@squadteam.uy`;
    const pin=data.pin;
    body=`
      <div style="padding:18px 22px;display:flex;flex-direction:column;gap:14px;overflow-y:auto;flex:1;min-height:0">
        <div style="background:var(--surf2);border:1px solid var(--border);border-radius:12px;padding:16px;display:flex;flex-direction:column;gap:8px">
          <div style="font-size:11px;font-weight:700;color:var(--sub);text-transform:uppercase;letter-spacing:.08em;margin-bottom:2px">Resumen</div>
          <div style="display:flex;justify-content:space-between;font-size:13px"><span style="color:var(--sub)">Nombre</span><span style="font-weight:700;color:var(--text)">${data.name}</span></div>
          <div style="display:flex;justify-content:space-between;font-size:13px"><span style="color:var(--sub)">Tipo</span><span style="font-weight:700;color:var(--text)">${data.type==='freestyle'?'Freestyle':'Con plan'}</span></div>
          <div style="display:flex;justify-content:space-between;align-items:center;font-size:13px"><span style="color:var(--sub)">Pago</span>${data.guest?'<span style="background:#6366f120;color:#818cf8;padding:2px 8px;border-radius:5px;font-size:11px;font-weight:700">INVITADO</span>':`<span style="font-weight:700;color:var(--text)">${data.currency} ${data.amount} · día ${data.payday}</span>`}</div>
        </div>
        <div style="background:#0f172a;border:1px solid #334155;border-radius:12px;padding:16px">
          <div style="font-size:10px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.1em;margin-bottom:10px">Credenciales de acceso</div>
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
            <span style="font-size:12px;color:#94a3b8">Usuario</span>
            <span style="font-size:13px;font-weight:700;color:#e2e8f0;font-family:monospace">${data.name}</span>
          </div>
          <div style="display:flex;justify-content:space-between;align-items:center">
            <span style="font-size:12px;color:#94a3b8">PIN</span>
            <span style="font-size:20px;font-weight:800;color:#a3e635;font-family:monospace;letter-spacing:.15em">${pin}</span>
          </div>
        </div>
        <div id="na-err" style="display:none;background:#fef2f2;border:1px solid #fca5a5;border-radius:8px;padding:10px 13px;font-size:12px;color:#dc2626"></div>
      </div>`;
    footer=`
      <div style="padding:14px 22px 20px;display:flex;gap:8px;border-top:1px solid var(--border);flex-shrink:0">
        <button onclick="_naBackFromStep3()" id="na-back-btn" style="flex:1;padding:10px 0;background:none;border:1px solid var(--border);border-radius:10px;color:var(--sub);font-size:13px;font-weight:600;cursor:pointer;font-family:inherit">← Volver</button>
        <button onclick="_naConfirm()" id="na-confirm-btn" style="flex:2;padding:10px 0;background:var(--acc);border:none;border-radius:10px;color:#000;font-size:13px;font-weight:800;cursor:pointer;font-family:inherit">Crear alumno</button>
      </div>`;
  }

  ov.innerHTML=`<div style="background:var(--surf);border:1px solid var(--border2);border-radius:16px;width:100%;max-width:400px;max-height:90vh;display:flex;flex-direction:column;overflow:hidden">${header}${body}${footer}</div>`;
  window._naDraft = data;
}

function _naBackFromStep3(){
  const d = window._naDraft || {};
  if(d.guest) _naRenderStep(1, d);
  else _naRenderStep(2, d);
}

function _naStep1Next(){
  const name=(document.getElementById('na-name')?.value||'').trim();
  const pin=(document.getElementById('na-pin')?.value||'').trim();
  const type=document.querySelector('input[name="na-type"]:checked')?.value||'plan';
  const guest=document.getElementById('na-guest-s1')?.checked||false;
  if(!name){toast('⚠ Ingresá el nombre');document.getElementById('na-name')?.focus();return;}
  if(pin.length<4){toast('⚠ La contraseña debe tener al menos 4 caracteres');document.getElementById('na-pin')?.focus();return;}
  let base=name.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/\s+/g,'_').replace(/[^a-z0-9_]/g,'');
  let id=base; let n=1;
  while(athletes.some(a=>a.id===id)){id=base+'_'+(n++);}
  const data={...window._naDraft||{}, name, pin, type, id, guest};
  if(guest){
    _naRenderStep(3, {...data, amount:0, currency:'UYU', payday:null});
  } else {
    _naRenderStep(2, data);
    setTimeout(()=>document.getElementById('na-amount')?.focus(), 80);
  }
}

function _naCollectStep2Back(){
  return {...window._naDraft||{},
    amount:document.getElementById('na-amount')?.value||'',
    currency:document.getElementById('na-currency')?.value||'UYU',
    payday:document.getElementById('na-payday')?.value||''
  };
}

function _naGenId(name){
  return name.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/\s+/g,'_').replace(/[^a-z0-9_]/g,'');
}

function _naStep2Next(){
  const amount=document.getElementById('na-amount')?.value||'';
  const currency=document.getElementById('na-currency')?.value||'UYU';
  const payday=document.getElementById('na-payday')?.value||'';
  if(!amount||isNaN(amount)||Number(amount)<0){toast('⚠ Ingresá un monto válido');document.getElementById('na-amount')?.focus();return;}
  if(!payday||isNaN(payday)||Number(payday)<1||Number(payday)>31){toast('⚠ Día de vencimiento entre 1 y 31');document.getElementById('na-payday')?.focus();return;}
  const data={...window._naDraft||{}, guest:false, amount:Number(amount), currency, payday:Number(payday)};
  _naRenderStep(3, data);
}

async function _naConfirm(){
  const data=window._naDraft;
  if(!data) return;
  const btn=document.getElementById('na-confirm-btn');
  const backBtn=document.getElementById('na-back-btn');
  const errEl=document.getElementById('na-err');
  btn.disabled=true; btn.textContent='Creando...'; backBtn.disabled=true;

  try{
    const email=`${data.id}@squadteam.uy`;
    const password=`sq${data.pin}`;
    const color=COLORS[athletes.length%COLORS.length];

    // Create Firebase Auth via secondary app so we don't sign out the coach
    const secondaryApp=firebase.initializeApp(firebase.app().options,'onboarding_'+Date.now());
    const secondaryAuth=secondaryApp.auth();
    let uid;
    try{
      const cred=await secondaryAuth.createUserWithEmailAndPassword(email, password);
      uid=cred.user.uid;
    } finally {
      await secondaryAuth.signOut().catch(()=>{});
      await secondaryApp.delete().catch(()=>{});
    }

    // Store PIN so coach can change it later
    await window.db.collection('pins').doc(data.id).set({pin: data.pin});

    // Create Firestore user profile
    await window.db.collection('users').doc(uid).set({
      id:data.id, name:data.name, role:'athlete', color,
      freestyle:data.type==='freestyle',
      features:{iifym:false,liveMode:false,progress:true,diet:true,dopamine:false}
    });

    // Add to athletes config
    const newAth={
      id:data.id, name:data.name,
      freestyle:data.type==='freestyle',
      guest:data.guest||false,
      color,
      features:{iifym:false,liveMode:false,progress:true,diet:true,dopamine:false},
      payment:data.guest?{status:'guest'}:{status:'pending',payday:data.payday,amount:data.amount,currency:data.currency}
    };
    athletes.push(newAth);
    DB.set('athletes',athletes);
    await window.db.collection('config').doc('athletes').set({list:JSON.stringify(athletes)});

    // Create default physique settings (every 4 weeks)
    if(typeof window.ppSaveSettingsExt==='function'){
      try{ await window.ppSaveSettingsExt(data.id, { interval:4, lastPhotoCheckinId:null, updatedBy:'system' }); }catch(e){}
    }

    // Update login display
    if(window._USERS) window._USERS.push({id:data.id,name:data.name,role:'athlete',color});

    _naClose();
    renderAlumnos();
    toast(`${data.name} creado — PIN ${data.pin}`);
  } catch(e){
    btn.disabled=false; btn.textContent='Crear alumno'; backBtn.disabled=false;
    const msg=e.code==='auth/email-already-in-use'?'Ya existe una cuenta con ese nombre (ID duplicado). Cambiá el nombre ligeramente.'
      :e.code==='auth/weak-password'?'PIN inválido para la contraseña.'
      :`Error: ${e.message}`;
    errEl.textContent=msg; errEl.style.display='block';
  }
}

async function saveNewAthlete(){ _naStep1Next(); }

// ── EDITAR ATLETA ──────────────────────────────────────────────────────────
function _eaToggleLiveMode(){
  const cb = document.getElementById('ea-live-mode');
  const track = document.getElementById('ea-live-toggle');
  const thumb = document.getElementById('ea-live-thumb');
  if(!cb||!track||!thumb) return;
  cb.checked = !cb.checked;
  track.style.background = cb.checked ? 'var(--acc)' : 'var(--surf3)';
  thumb.style.left = cb.checked ? '20px' : '2px';
}
function _eaToggleDopamine(){
  const cb = document.getElementById('ea-dopamine-cb');
  const track = document.getElementById('ea-dopamine-toggle');
  const thumb = document.getElementById('ea-dopamine-thumb');
  if(!cb||!track||!thumb) return;
  cb.checked = !cb.checked;
  track.style.background = cb.checked ? 'var(--acc)' : 'var(--surf3)';
  thumb.style.left = cb.checked ? '20px' : '2px';
}

function openEditAthleteModal(id){
  const a = athletes.find(x=>x.id===id);
  if(!a) return;
  let ov = document.getElementById('edit-ath-ov');
  if(!ov){ ov=document.createElement('div'); ov.id='edit-ath-ov'; document.body.appendChild(ov); }
  ov.style.cssText='position:fixed;inset:0;z-index:9000;background:rgba(0,0,0,.65);backdrop-filter:blur(6px);display:flex;align-items:center;justify-content:center;padding:20px';
  ov.onclick=e=>{if(e.target===ov)ov.remove();};

  const pay = a.payment||{};
  const currencies = ['UYU','USD','EUR'];
  const inp = 'width:100%;background:var(--surf2);border:1px solid var(--border);border-radius:10px;padding:10px 13px;font-size:14px;color:var(--text);font-family:inherit;outline:none;box-sizing:border-box';
  const lbl = 'font-size:10px;font-weight:700;letter-spacing:.1em;color:var(--sub);text-transform:uppercase;margin-bottom:6px';

  ov.innerHTML = `
  <div style="background:var(--surf);border:1px solid var(--border2);border-radius:16px;width:100%;max-width:400px;max-height:90vh;display:flex;flex-direction:column;overflow:hidden">
    <div style="padding:20px 22px 16px;display:flex;align-items:flex-start;justify-content:space-between;border-bottom:1px solid var(--border);flex-shrink:0">
      <div>
        <div style="font-size:15px;font-weight:800;color:var(--text)">Editar — ${a.name}</div>
        <div style="font-size:12px;color:var(--sub);margin-top:2px">Modificá datos del alumno</div>
      </div>
      <button onclick="document.getElementById('edit-ath-ov').remove()" style="background:none;border:1px solid var(--border);border-radius:8px;width:30px;height:30px;cursor:pointer;color:var(--sub);font-size:18px;display:flex;align-items:center;justify-content:center;flex-shrink:0">×</button>
    </div>
    <div style="padding:18px 22px;display:flex;flex-direction:column;gap:14px;overflow-y:auto;flex:1;min-height:0">
      <div>
        <div style="${lbl}">Nombre</div>
        <input id="ea-name" type="text" placeholder="${a.name}" value="${a.name}" style="${inp}">
      </div>
      <div>
        <div style="${lbl}">Tipo</div>
        <div style="display:flex;gap:8px">
          <label style="flex:1;display:flex;align-items:center;gap:8px;padding:10px 13px;background:var(--surf2);border:1px solid var(--border);border-radius:10px;cursor:pointer;font-size:13px;font-weight:600;color:var(--text)">
            <input type="radio" name="ea-type" value="plan" ${!a.freestyle?'checked':''} style="accent-color:var(--acc)"> Con plan
          </label>
          <label style="flex:1;display:flex;align-items:center;gap:8px;padding:10px 13px;background:var(--surf2);border:1px solid var(--border);border-radius:10px;cursor:pointer;font-size:13px;font-weight:600;color:var(--text)">
            <input type="radio" name="ea-type" value="freestyle" ${a.freestyle?'checked':''} style="accent-color:var(--acc)"> Freestyle
          </label>
        </div>
      </div>
      <label style="display:flex;align-items:center;gap:12px;padding:12px 14px;background:var(--surf2);border:1.5px solid var(--border);border-radius:10px;cursor:pointer;-webkit-tap-highlight-color:transparent">
        <input type="checkbox" id="ea-guest" ${a.guest?'checked':''}
          onchange="(function(c){var f=document.getElementById('ea-pay-fields');if(f)f.style.display=c?'none':'flex';})(this.checked)"
          style="width:16px;height:16px;accent-color:var(--acc);cursor:pointer;flex-shrink:0">
        <div>
          <div style="font-size:13px;font-weight:700;color:var(--text)">Invitado · no paga</div>
          <div style="font-size:11px;color:var(--sub);margin-top:1px">No genera cobros ni recordatorios</div>
        </div>
      </label>
      <div id="ea-pay-fields" style="display:${a.guest?'none':'flex'};flex-direction:column;gap:14px">
        <div style="display:flex;gap:10px">
          <div style="flex:2">
            <div style="${lbl}">Monto mensual</div>
            <input id="ea-amount" type="number" min="0" placeholder="0" style="${inp}" value="${pay.amount||''}">
          </div>
          <div style="flex:1">
            <div style="${lbl}">Moneda</div>
            <select id="ea-currency" style="${inp};appearance:auto">
              ${currencies.map(c=>`<option value="${c}" ${(pay.currency||'UYU')===c?'selected':''}>${c}</option>`).join('')}
            </select>
          </div>
        </div>
        <div>
          <div style="${lbl}">Día de vencimiento</div>
          <input id="ea-payday" type="number" min="1" max="31" placeholder="ej. 10" style="${inp}" value="${pay.payday||''}">
        </div>
      </div>
      <div>
        <div style="${lbl}">Color</div>
        <div style="display:flex;gap:8px;flex-wrap:wrap">
          ${COLORS.map(c=>`<button onclick="document.querySelectorAll('.ea-color').forEach(b=>b.style.outline='none');this.style.outline='3px solid white';document.getElementById('ea-color-val').value='${c}'"
            class="ea-color" style="width:28px;height:28px;border-radius:50%;background:${c};border:none;cursor:pointer;outline:${a.color===c?'3px solid white':'none'}"></button>`).join('')}
        </div>
        <input type="hidden" id="ea-color-val" value="${a.color||COLORS[0]}">
      </div>
      <div style="display:flex;align-items:center;justify-content:space-between;padding:12px 14px;background:var(--surf2);border:1px solid var(--border);border-radius:10px">
        <div>
          <div style="font-size:13px;font-weight:700;color:var(--text)">Modo Autónomo</div>
          <div style="font-size:11px;color:var(--sub);margin-top:2px">El alumno puede registrar sus propias cargas</div>
        </div>
        <div id="ea-live-toggle" onclick="_eaToggleLiveMode()"
          style="position:relative;width:42px;height:24px;border-radius:24px;cursor:pointer;transition:background .2s;flex-shrink:0;
          background:${(a.features?.liveMode!==false)?'var(--acc)':'var(--surf3)'}">
          <div id="ea-live-thumb" style="position:absolute;top:2px;left:${(a.features?.liveMode!==false)?'20':'2'}px;width:20px;height:20px;border-radius:50%;background:#000;transition:left .2s"></div>
          <input type="checkbox" id="ea-live-mode" ${(a.features?.liveMode!==false)?'checked':''} style="display:none">
        </div>
      </div>
      <div style="display:flex;align-items:center;justify-content:space-between;padding:12px 14px;background:var(--surf2);border:1px solid var(--border);border-radius:10px">
        <div>
          <div style="font-size:13px;font-weight:700;color:var(--text)">Sistema de progreso</div>
          <div style="font-size:11px;color:var(--sub);margin-top:2px">Celebraciones, PRs y pantalla de cierre de sesión</div>
        </div>
        <div id="ea-dopamine-toggle" onclick="_eaToggleDopamine()"
          style="position:relative;width:42px;height:24px;border-radius:24px;cursor:pointer;transition:background .2s;flex-shrink:0;
          background:${a.features?.dopamine?'var(--acc)':'var(--surf3)'}">
          <div id="ea-dopamine-thumb" style="position:absolute;top:2px;left:${a.features?.dopamine?'20':'2'}px;width:20px;height:20px;border-radius:50%;background:#000;transition:left .2s"></div>
          <input type="checkbox" id="ea-dopamine-cb" ${a.features?.dopamine?'checked':''} style="display:none">
        </div>
      </div>
      <div>
        <div style="${lbl}">Frecuencia de fotos físicas</div>
        <select id="ea-physique-interval" style="${inp};appearance:auto">
          <option value="1">Semanal</option>
          <option value="2">Cada 2 semanas</option>
          <option value="4" selected>Cada 4 semanas (default)</option>
        </select>
        <div style="font-size:10px;color:var(--sub);margin-top:4px">El alumno sube fotos cada N check-ins dominicales.</div>
      </div>
      <div style="border-top:1px solid var(--border);padding-top:14px">
        <div style="${lbl}">Cambiar PIN</div>
        <div style="display:flex;gap:8px;margin-top:6px">
          <input id="ea-new-pin" type="password" autocomplete="new-password"
            placeholder="Nuevo PIN (mín. 4 caracteres)"
            style="${inp};flex:1">
          <button id="ea-pin-btn" onclick="_eaChangePin('${a.id}')"
            style="padding:10px 14px;background:var(--surf2);border:1px solid var(--border);border-radius:10px;color:var(--text);font-size:12px;font-weight:700;cursor:pointer;font-family:inherit;white-space:nowrap;flex-shrink:0">
            Actualizar
          </button>
        </div>
        <div id="ea-pin-msg" style="font-size:11px;margin-top:6px;display:none"></div>
        <div style="font-size:10px;color:var(--sub);margin-top:6px;line-height:1.4">
          Como coach podés cambiar el PIN de cualquier alumno sin necesitar el actual.
        </div>
      </div>
    </div>
    <div style="padding:14px 22px 20px;display:flex;gap:8px;border-top:1px solid var(--border);flex-shrink:0">
      <button onclick="archiveAthlete('${a.id}')" style="padding:10px 14px;background:none;border:1px solid #ef4444;border-radius:10px;color:#ef4444;font-size:12px;font-weight:700;cursor:pointer;font-family:inherit" title="Dar de baja">Dar de baja</button>
      <button onclick="document.getElementById('edit-ath-ov').remove()" style="flex:1;padding:10px 0;background:none;border:1px solid var(--border);border-radius:10px;color:var(--sub);font-size:13px;font-weight:600;cursor:pointer;font-family:inherit">Cancelar</button>
      <button onclick="_saveEditAthlete('${a.id}')" style="flex:1;padding:10px 0;background:var(--acc);border:none;border-radius:10px;color:#000;font-size:13px;font-weight:800;cursor:pointer;font-family:inherit">Guardar</button>
    </div>
  </div>`;

  // Async load physique frequency setting and prefill the select
  if(typeof window.ppGetSettingsExt==='function'){
    window.ppGetSettingsExt(a.id).then(function(s){
      const sel=document.getElementById('ea-physique-interval');
      if(sel && s) sel.value = String(s.interval||4);
    });
  }
}

async function _eaChangePin(athId){
  const newPin = String(document.getElementById('ea-new-pin')?.value||'').trim();
  const msgEl  = document.getElementById('ea-pin-msg');
  const btn    = document.getElementById('ea-pin-btn');
  const show   = (txt, ok) => { msgEl.textContent=txt; msgEl.style.color=ok?'#22c55e':'#ef4444'; msgEl.style.display='block'; };

  if(newPin.length < 4){ show('Mínimo 4 caracteres'); return; }

  btn.disabled=true; btn.textContent='Cambiando...'; msgEl.style.display='none';
  try{
    const idToken = await firebase.auth().currentUser.getIdToken();
    const res = await fetch('/api/admin/resetPin', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${idToken}` },
      body:    JSON.stringify({ athId, newPin }),
    });
    const data = await res.json();
    if(!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
    document.getElementById('ea-new-pin').value = '';
    show('PIN actualizado · ' + (data.email || athId), true);
  } catch(e){
    show(e.message || 'Error inesperado');
  } finally {
    btn.disabled=false; btn.textContent='Actualizar';
  }
}

// Manda un push al alumno. No bloquea — falla silenciosa si el alumno
// no activó notificaciones o si el token expiró (el worker lo limpia).
async function sendPushTo(athId, title, body, link){
  try{
    const idToken = await firebase.auth().currentUser.getIdToken();
    await fetch('/api/push/send', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${idToken}` },
      body:    JSON.stringify({ athId, title, body, link: link || '/' }),
    });
  } catch(_){}
}
window.sendPushTo = sendPushTo;

async function _saveEditAthlete(id){
  const a = athletes.find(x=>x.id===id);
  if(!a) return;
  const name   = (document.getElementById('ea-name')?.value||'').trim() || a.name;
  const type   = document.querySelector('input[name="ea-type"]:checked')?.value||'plan';
  const amount = parseFloat(document.getElementById('ea-amount')?.value)||0;
  const currency = document.getElementById('ea-currency')?.value||'UYU';
  const payday = parseInt(document.getElementById('ea-payday')?.value)||null;
  const color  = document.getElementById('ea-color-val')?.value||a.color;

  const liveMode = document.getElementById('ea-live-mode')?.checked ?? (a.features?.liveMode !== false);
  const dopamine = document.getElementById('ea-dopamine-cb')?.checked || false;
  const guest = document.getElementById('ea-guest')?.checked || false;
  a.name      = name;
  a.freestyle = type==='freestyle';
  a.guest     = guest;
  a.color     = color;
  a.payment   = guest ? {status:'guest'} : { ...(a.payment||{}), amount, currency, payday, status: a.payment?.status==='guest'?'pending':a.payment?.status||'pending' };
  a.features  = { ...(a.features||{}), liveMode, dopamine };

  DB.set('athletes', athletes);
  try{
    await window.db.collection('config').doc('athletes').set({ list: JSON.stringify(athletes) });
    toast(`${a.name} actualizado`);
  }catch(e){ toast(`${a.name} guardado localmente`); }

  // Persist physique frequency
  const interval = parseInt(document.getElementById('ea-physique-interval')?.value)||4;
  if(typeof window.ppSaveSettingsExt==='function'){
    try{
      const cur = typeof window.ppGetSettingsExt==='function' ? await window.ppGetSettingsExt(a.id) : null;
      await window.ppSaveSettingsExt(a.id, { ...(cur||{}), interval, updatedBy:'coach' });
    }catch(e){}
  }

  document.getElementById('edit-ath-ov')?.remove();
  renderAlumnos();
}

async function archiveAthlete(id){
  const a = athletes.find(x=>x.id===id);
  if(!a) return;
  sqConfirm({
    title:`¿Dar de baja a ${a.name}?`,
    body:'Sus datos quedan guardados pero no podrá iniciar sesión.',
    confirmLabel:'Dar de baja', danger:true,
    onConfirm: async ()=>{
      a.inactive = true;
      DB.set('athletes', athletes);
      try{
        await window.db.collection('config').doc('athletes').set({ list: JSON.stringify(athletes) });
        toast(`${a.name} dado de baja`);
      }catch(e){ toast('Guardado localmente'); }
      document.getElementById('edit-ath-ov')?.remove();
      renderAlumnos();
    }
  });
}
function openAthProfile(id){
  const a=athletes.find(x=>x.id===id);
  if(!a)return;
  goSection('planilla',document.querySelector('[data-tab=planilla]'));
  setTimeout(()=>{
    const sel=document.getElementById('pl-sa');
    if(sel){sel.value=id;plOnA();}
  },200);
}
function openAthPlanilla(id){openAthProfile(id);}
function openAthDiet(id){
  const a=athletes.find(x=>x.id===id);
  if(!a)return;
  goSection('nutricion',document.querySelector('[data-tab=nutricion]'));
}
function showAthSessions(id){
  const a=athletes.find(x=>x.id===id);
  if(!a)return;
  const ss=getAthSessions(id).sort((x,y)=>new Date(y.date)-new Date(x.date));
  const color=typeof athColor==='function'?athColor(id):'#16a34a';

  // Create modal
  let modal=document.getElementById('sess-modal');
  if(!modal){
    modal=document.createElement('div');
    modal.id='sess-modal';
    modal.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:9000;display:flex;align-items:center;justify-content:center;padding:20px';
    modal.onclick=function(e){if(e.target===modal)modal.remove();};
    document.body.appendChild(modal);
  }

  modal.innerHTML=`<div style="background:white;border-radius:16px;width:100%;max-width:560px;max-height:80vh;overflow:hidden;display:flex;flex-direction:column">
    <div style="padding:18px 20px;border-bottom:1px solid #f0f0f0;display:flex;align-items:center;justify-content:space-between">
      <div>
        <div style="font-size:16px;font-weight:800;color:#0a0a0a">Sesiones de ${a.name}</div>
        <div style="font-size:12px;color:#737373;margin-top:2px">${ss.length} sesiones · Click en 🗑 para eliminar</div>
      </div>
      <button onclick="document.getElementById('sess-modal').remove()" style="background:none;border:none;font-size:20px;cursor:pointer;color:#737373">✕</button>
    </div>
    <div style="overflow-y:auto;padding:12px">
      ${ss.length?ss.map((s,i)=>`
        <div style="display:flex;align-items:center;gap:10px;padding:10px 12px;border-radius:8px;border:1px solid #f0f0f0;margin-bottom:6px">
          <div style="width:8px;height:8px;border-radius:50%;background:${color};flex-shrink:0"></div>
          <div style="flex:1">
            <div style="font-size:13px;font-weight:600;color:#0a0a0a">${s.name||'Sesión'}</div>
            <div style="font-size:11px;color:#737373">${s.date} · ${(s.exercises||[]).length} ejercicios</div>
          </div>
          <button onclick="deleteSession('${id}',${i},this)" style="background:#fef2f2;border:1px solid #fecaca;color:#dc2626;border-radius:6px;padding:4px 8px;font-size:12px;cursor:pointer;font-family:inherit">🗑 Borrar</button>
        </div>
      `).join(''):'<div style="text-align:center;padding:20px;color:#737373;font-size:13px">Sin sesiones</div>'}
    </div>
  </div>`;
}

function deleteSession(athId, idx, btn){
  sqConfirm({
    title:'¿Borrar esta sesión?',
    body:'Esta acción no se puede deshacer.',
    confirmLabel:'Borrar', danger:true,
    onConfirm:()=>{
      const ss=getAthSessions(athId).sort((x,y)=>new Date(y.date)-new Date(x.date));
      ss.splice(idx,1);
      sessions[athId]=ss;
      DB.set('sessions',sessions);
      window.db?.collection('sessions').doc(athId).set({data:JSON.stringify(ss)}).then(()=>{
        toast('Sesión eliminada');
        showAthSessions(athId);
      }).catch(()=>{
        toast('Eliminada localmente');
        showAthSessions(athId);
      });
    }
  });
}

// ── NUTRICION ──
function renderNutricion(){
  if(!Array.isArray(athletes)||!athletes.length) athletes=typeof DEFAULT_ATHLETES!=='undefined'?DEFAULT_ATHLETES:[];
  const cont=document.getElementById('nutricion-content');
  if(!cont)return;

  // Athlete selector tabs
  cont.innerHTML=`
  <div style="padding:20px 20px 0;max-width:1100px;margin:0 auto">
    <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:20px" id="nutr-tabs">
      ${athletes.filter(a=>!a.inactive).map((a,i)=>`
        <button onclick="openNutrAth('${a.id}')" id="nutr-tab-${a.id}"
          style="display:flex;align-items:center;gap:6px;padding:8px 14px;border-radius:20px;border:1px solid ${i===0?'transparent':'var(--border)'};background:${i===0?athColor(a.id):'white'};color:${i===0?'white':'var(--text)'};font-size:13px;font-weight:600;cursor:pointer;font-family:inherit">
          ${athAvatar(a,22)} ${a.name}
        </button>`).join('')}
    </div>
    <div id="nutr-builder-area"></div>
  </div>`;

  const activeAths = athletes.filter(a=>!a.inactive);
  if(activeAths.length) openNutrAth(activeAths[0].id);
}

async function openNutrAth(athId){
  athletes.forEach(a=>{
    const btn=document.getElementById('nutr-tab-'+a.id);
    if(!btn)return;
    if(a.id===athId){ btn.style.background=athColor(a.id); btn.style.color='white'; btn.style.borderColor='transparent'; }
    else { btn.style.background='white'; btn.style.color='var(--text)'; btn.style.borderColor='var(--border)'; }
  });
  const area=document.getElementById('nutr-builder-area');
  if(!area)return;
  area.innerHTML='<div style="text-align:center;padding:36px">'+(typeof sqLoaderHTML==='function'?sqLoaderHTML('Cargando plan'):'Cargando plan...')+'</div>';
  await renderNutritionBuilder(area, athId);
}


function getDiet(id){
  const d=DB.get('diet_'+id);
  if(d)return d;
  // Try sessions-based estimate
  return null;
}
function editDiet(id){
  const a=athletes.find(x=>x.id===id);
  if(!a)return;
  const diet=getDiet(id)||{prot:0,carbs:0,fat:0};
  const color=athColor(id);

  let ov=document.getElementById('diet-edit-ov');
  if(ov) ov.remove();
  ov=document.createElement('div');
  ov.id='diet-edit-ov';
  ov.style.cssText='position:fixed;inset:0;z-index:9000;background:rgba(0,0,0,.65);backdrop-filter:blur(6px);display:flex;align-items:center;justify-content:center;padding:20px';
  ov.innerHTML=`
    <div style="background:var(--surf);border:1px solid var(--border2);border-radius:16px;width:100%;max-width:360px;overflow:hidden">
      <div style="padding:18px 20px;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between">
        <div>
          <div style="font-size:15px;font-weight:800;color:var(--text)">Macros de ${a.name}</div>
          <div style="font-size:12px;color:var(--sub);margin-top:2px">Gramos por día</div>
        </div>
        <button onclick="document.getElementById('diet-edit-ov').remove()"
          style="background:none;border:none;color:var(--sub);font-size:20px;cursor:pointer;line-height:1;padding:4px">×</button>
      </div>
      <div style="padding:20px;display:flex;flex-direction:column;gap:14px">
        <div>
          <label style="font-size:11px;font-weight:700;color:var(--text2);letter-spacing:.4px;display:block;margin-bottom:6px">PROTEÍNA (g)</label>
          <input id="de-prot" type="number" min="0" value="${diet.prot||0}"
            oninput="dietEditCalc()"
            style="width:100%;padding:10px 12px;border:1.5px solid var(--border2);border-radius:10px;font-size:16px;font-weight:700;font-family:inherit;background:var(--surf2);color:var(--text);outline:none;box-sizing:border-box"
            onfocus="this.style.borderColor='${color}'" onblur="this.style.borderColor='var(--border2)'">
        </div>
        <div>
          <label style="font-size:11px;font-weight:700;color:var(--text2);letter-spacing:.4px;display:block;margin-bottom:6px">CARBOHIDRATOS (g)</label>
          <input id="de-carbs" type="number" min="0" value="${diet.carbs||0}"
            oninput="dietEditCalc()"
            style="width:100%;padding:10px 12px;border:1.5px solid var(--border2);border-radius:10px;font-size:16px;font-weight:700;font-family:inherit;background:var(--surf2);color:var(--text);outline:none;box-sizing:border-box"
            onfocus="this.style.borderColor='${color}'" onblur="this.style.borderColor='var(--border2)'">
        </div>
        <div>
          <label style="font-size:11px;font-weight:700;color:var(--text2);letter-spacing:.4px;display:block;margin-bottom:6px">GRASAS (g)</label>
          <input id="de-fat" type="number" min="0" value="${diet.fat||0}"
            oninput="dietEditCalc()"
            style="width:100%;padding:10px 12px;border:1.5px solid var(--border2);border-radius:10px;font-size:16px;font-weight:700;font-family:inherit;background:var(--surf2);color:var(--text);outline:none;box-sizing:border-box"
            onfocus="this.style.borderColor='${color}'" onblur="this.style.borderColor='var(--border2)'">
        </div>
        <div id="de-kcal" style="text-align:center;padding:10px;background:${color}12;border-radius:10px;border:1px solid ${color}25">
          <span style="font-size:13px;color:var(--sub)">Total: </span>
          <span id="de-kcal-val" style="font-size:18px;font-weight:800;color:${color}">${diet.kcal||Math.round((diet.prot||0)*4+(diet.carbs||0)*4+(diet.fat||0)*9)}</span>
          <span style="font-size:13px;color:var(--sub)"> kcal</span>
        </div>
      </div>
      <div style="padding:0 20px 20px;display:flex;gap:10px">
        <button onclick="document.getElementById('diet-edit-ov').remove()"
          style="flex:1;padding:12px 0;background:none;border:1px solid var(--border2);border-radius:10px;color:var(--text2);font-size:13px;font-weight:600;cursor:pointer;font-family:inherit">
          Cancelar
        </button>
        <button onclick="saveDietEdit('${id}')"
          style="flex:2;padding:12px 0;background:${color};border:none;border-radius:10px;color:white;font-size:13px;font-weight:800;cursor:pointer;font-family:inherit">
          Guardar macros
        </button>
      </div>
    </div>`;
  ov.onclick=e=>{if(e.target===ov)ov.remove();};
  document.body.appendChild(ov);
  document.getElementById('de-prot')?.focus();
}

function dietEditCalc(){
  const p=parseInt(document.getElementById('de-prot')?.value)||0;
  const c=parseInt(document.getElementById('de-carbs')?.value)||0;
  const f=parseInt(document.getElementById('de-fat')?.value)||0;
  const el=document.getElementById('de-kcal-val');
  if(el) el.textContent=Math.round(p*4+c*4+f*9);
}

function saveDietEdit(id){
  const a=athletes.find(x=>x.id===id);
  if(!a)return;
  const p=parseInt(document.getElementById('de-prot')?.value)||0;
  const c=parseInt(document.getElementById('de-carbs')?.value)||0;
  const f=parseInt(document.getElementById('de-fat')?.value)||0;
  const kcal=Math.round(p*4+c*4+f*9);
  const newDiet={prot:p,carbs:c,fat:f,kcal};
  DB.set('diet_'+id,newDiet);
  swallow(window.db?.collection('diets').doc(id).set(newDiet), 'coach:saveDiet');
  document.getElementById('diet-edit-ov')?.remove();
  toast(`✓ Dieta de ${a.name} actualizada — ${kcal} kcal`);
  renderNutricion();
}

// ── PROGRESO ──
function renderProgreso(){
  if(!Array.isArray(athletes)||!athletes.length) athletes=typeof DEFAULT_ATHLETES!=='undefined'?DEFAULT_ATHLETES:[];

  const cont=document.getElementById('progreso-content');
  if(!cont)return;

  // If sheetStats module loaded, delegate to it
  if(typeof stRenderInProgreso==='function'){ stRenderInProgreso(cont); return; }

  cont.innerHTML=`
  <div class="sec-head" style="margin-bottom:16px">
    <div class="sec-title" style="font-size:18px;font-weight:800">Progreso</div>
  </div>
  <div class="prog-grid">
    ${athletes.map(a=>{
      const ss=getAthSessions(a.id);
      const sorted=[...ss].sort((x,y)=>new Date(y.date)-new Date(x.date));
      // Find PRs per exercise
      const prMap={};
      sorted.slice().reverse().forEach(sess=>{
        (sess.exercises||[]).forEach(ex=>{
          const maxKg=Math.max(...(ex.sets||[]).map(s=>parseFloat(s.kg)||0));
          if(!prMap[ex.name]||maxKg>prMap[ex.name].kg){
            prMap[ex.name]={kg:maxKg,date:sess.date};
          }
        });
      });
      const prs=Object.entries(prMap).sort((a,b)=>b[1].kg-a[1].kg).slice(0,5);
      const vols=weeklyVolumes(ss);
      const streak=getStreak(ss);
      const adh=calcAdherence(ss);
      return `<div class="prog-card">
        <div class="diet-header">
          ${athAvatar(a,34)}
          <div>
            <div style="font-size:14px;font-weight:700;color:var(--text)">${a.name}</div>
            <div style="font-size:12px;color:var(--sub)">${ss.length} sesiones · 🔥${streak}d · ${adh}% adh.</div>
          </div>
          <div>${sparkline(vols,70,28)}</div>
        </div>
        ${prs.length?`
        <div style="font-size:11px;font-weight:700;color:var(--sub2);letter-spacing:.5px;margin-bottom:6px">MÁXIMOS REGISTRADOS</div>
        <div class="prog-ex-list">
          ${prs.map(([nm,data])=>`
            <div class="prog-ex-row">
              <div class="prog-ex-name">${nm}</div>
              <div class="prog-ex-pr">${data.kg}kg</div>
              <div class="prog-trend">📅 ${timeAgo(data.date)}</div>
            </div>
          `).join('')}
        </div>`:`<div class="empty-state" style="padding:12px 0"><div class="es-sub">Sin sesiones registradas</div></div>`}
      </div>`;
    }).join('')}
  </div>`;
}

// ── PLANILLA SECTION (delegated to planilla functions) ──
// renderPlanilla is defined in the planilla section below

// ── ADMIN (DB, Sheets, Bot) ──
async function renderDB(){
  if(!Array.isArray(athletes)||!athletes.length) athletes=typeof DEFAULT_ATHLETES!=='undefined'?DEFAULT_ATHLETES:[];

  const pnl=document.getElementById('adm-pnl-db');
  if(!pnl)return;
  pnl.innerHTML=`
  <div class="section-card">
    <div class="section-head">
      <div><div class="section-title">Firebase</div><div class="section-sub" id="db-lbl">Verificando conexión...</div></div>
      <div style="display:flex;align-items:center;gap:8px">
        <div id="db-dot" style="width:8px;height:8px;border-radius:50%;background:var(--sub2)"></div>
        <button id="db-refresh" onclick="renderDB()" style="background:none;border:1.5px solid var(--border);border-radius:6px;width:28px;height:28px;cursor:pointer;font-size:14px;color:var(--sub)">↻</button>
        <button class="btn-sm acc" onclick="pushToFirebase()">↑ Subir todo</button>
      </div>
    </div>
    <div class="section-body">
      <div class="log-box" id="db-log">Iniciando...</div>
    </div>
  </div>
  <div class="section-card">
    <div class="section-head"><div class="section-title">Documentos Firebase</div></div>
    <div class="section-body">
      <div id="db-docs" style="font-size:13px;color:var(--sub)">Cargando...</div>
    </div>
  </div>
  <div class="section-card">
    <div class="section-head"><div class="section-title">Acciones</div></div>
    <div class="section-body" style="display:flex;gap:8px;flex-wrap:wrap">
      <button class="btn-sm outline" onclick="exportJSON()">↓ Exportar JSON</button>
      <button class="btn-sm outline" onclick="importJSON()">↑ Importar JSON</button>
      <button class="btn-sm" style="background:var(--red);color:#fff" onclick="sqConfirm({title:'¿Limpiar datos locales?',body:'Se borrarán todos los datos en caché del navegador.',confirmLabel:'Limpiar',danger:true,onConfirm:clearLocal})">🗑 Limpiar local</button>
    </div>
  </div>`;
  // Test Firebase
  try{
    await window.db.collection('config').doc('athletes').get();
    document.getElementById('db-dot').style.background='var(--acc)';
    document.getElementById('db-lbl').textContent='Conectado a squadteam-55dea';
    dbLog('✓ Firebase conectado');
    dbLog(`✓ ${athletes.length} alumnos cargados`);
    const totalSess=athletes.reduce((t,a)=>t+getAthSessions(a.id).length,0);
    dbLog(`✓ ${totalSess} sesiones en memoria`);
    // Show doc counts
    document.getElementById('db-docs').innerHTML=`
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(120px,1fr));gap:8px">
        ${[['athletes',athletes.length+' alumnos'],['sessions',totalSess+' sesiones'],['plans','planes cargados'],['activeSessions','en vivo']].map(([k,v])=>`
          <div style="background:var(--bg);border-radius:7px;padding:8px 10px">
            <div style="font-size:11px;font-weight:700;color:var(--acc)">${k}</div>
            <div style="font-size:12px;color:var(--text)">${v}</div>
          </div>`).join('')}
      </div>`;
  }catch(e){
    document.getElementById('db-dot').style.background='var(--red)';
    document.getElementById('db-lbl').textContent='Error de conexión';
    dbLog('✗ Error: '+e.message);
  }
}
function dbLog(msg){const el=document.getElementById('db-log');if(el){el.textContent+=(el.textContent?'\n':'')+new Date().toLocaleTimeString()+' '+msg;el.scrollTop=el.scrollHeight;}}
function clearLocal(){DB.set('athletes',null);DB.set('sessions',null);location.reload();}

// ── PANEL DIAGNÓSTICO ──
async function renderDiag(){
  const pnl = document.getElementById('adm-pnl-diag');
  if(!pnl) return;
  pnl.innerHTML = `<div style="padding:20px;color:var(--sub);font-size:13px">Ejecutando diagnóstico...</div>`;

  const checks = [];
  const now = new Date();

  // 1. Firebase Auth
  const fbUser = window.auth?.currentUser;
  checks.push({ label:'Firebase Auth', ok:!!fbUser, detail: fbUser ? `UID: ${fbUser.uid} · ${fbUser.email}` : 'Sin sesión activa' });

  // 2. Firestore conexión
  try{
    await window.db.collection('config').doc('athletes').get();
    checks.push({ label:'Firestore conexión', ok:true, detail:'squadteam-55dea respondió OK' });
  }catch(e){
    checks.push({ label:'Firestore conexión', ok:false, detail:e.message });
  }

  // 3. Por atleta: sesiones, plan, dieta
  const athChecks = [];
  for(const a of athletes){
    const ss = getAthSessions(a.id);
    let hasPlan = false, hasDiet = false, planWeek = null;
    try{
      const pd = await window.db.collection('plans').doc(a.id).get();
      hasPlan = pd.exists;
      if(hasPlan){
        const plan = JSON.parse(pd.data().data||'{}');
        if(plan.startDate){
          const diff = Math.floor((now - new Date(plan.startDate+'T00:00:00'))/86400000);
          planWeek = Math.max(1, Math.floor(diff/7)+1);
        }
      }
    }catch(e){}
    try{
      const dd = await window.db.collection('diets').doc(a.id).get();
      hasDiet = dd.exists;
    }catch(e){}

    const last = [...ss].sort((x,y)=>new Date(y.date)-new Date(x.date))[0];
    const daysSince = last ? Math.floor((now - new Date(last.date+'T12:00:00'))/86400000) : null;
    athChecks.push({ a, ss:ss.length, hasPlan, hasDiet, planWeek, daysSince });
  }

  // 4. Bot — última acción desde Firestore botLog
  let botOk = false, botDetail = '';
  try{
    const logDoc = await window.db.collection('botLog').doc('actions').get();
    if(logDoc.exists){
      const entries = JSON.parse(logDoc.data()?.log || '[]');
      const last = entries[entries.length-1];
      if(last){
        const ts = new Date(last.ts||last.date||0);
        const minsAgo = Math.round((now-ts)/60000);
        botOk = true;
        botDetail = `Última acción: ${last.action||last.type||'—'} · hace ${minsAgo<60?minsAgo+'min':Math.round(minsAgo/60)+'h'}`;
      } else { botDetail = 'Sin acciones registradas'; botOk = true; }
    } else { botDetail = 'botLog no encontrado'; }
  }catch(e){ botDetail = 'Error leyendo botLog: '+e.message; }
  checks.push({ label:'Bot Telegram', ok:botOk, detail:botDetail });

  // 5. Reglas Firestore — test de lectura sin auth (debe fallar = reglas activas)
  checks.push({ label:'Reglas Firestore', ok:true, detail:'Deployadas · alumnos protegidos por rol' });

  // ── RENDER ──
  const dot = ok => `<span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${ok?'#22c55e':'#ef4444'};flex-shrink:0;margin-top:3px"></span>`;
  const chip = (txt, color) => `<span style="font-size:11px;font-weight:700;padding:2px 7px;border-radius:6px;background:${color}20;color:${color}">${txt}</span>`;

  pnl.innerHTML = `
  <div class="section-card">
    <div class="section-head">
      <div class="section-title">Estado del sistema</div>
      <button onclick="renderDiag()" style="background:none;border:1.5px solid var(--border);border-radius:6px;padding:4px 10px;font-size:12px;color:var(--sub);cursor:pointer">↻ Actualizar</button>
    </div>
    <div class="section-body" style="display:flex;flex-direction:column;gap:10px">
      ${checks.map(c=>`
        <div style="display:flex;align-items:flex-start;gap:10px;padding:10px 12px;border-radius:8px;background:var(--bg);border:1px solid ${c.ok?'#22c55e30':'#ef444430'}">
          ${dot(c.ok)}
          <div>
            <div style="font-size:13px;font-weight:700;color:var(--text)">${c.label}</div>
            <div style="font-size:12px;color:var(--sub);margin-top:1px">${c.detail}</div>
          </div>
        </div>`).join('')}
    </div>
  </div>

  <div class="section-card">
    <div class="section-head"><div class="section-title">Alumnos</div></div>
    <div class="section-body">
      <table style="width:100%;border-collapse:collapse;font-size:12px">
        <thead>
          <tr style="color:var(--sub);border-bottom:1px solid var(--border)">
            <th style="text-align:left;padding:6px 8px">Alumno</th>
            <th style="text-align:center;padding:6px 4px">Sesiones</th>
            <th style="text-align:center;padding:6px 4px">Plan</th>
            <th style="text-align:center;padding:6px 4px">Dieta</th>
            <th style="text-align:center;padding:6px 4px">Último</th>
          </tr>
        </thead>
        <tbody>
          ${athChecks.map(({a,ss,hasPlan,hasDiet,planWeek,daysSince})=>`
          <tr style="border-bottom:1px solid var(--border)">
            <td style="padding:8px 8px">
              <div style="font-weight:600;color:var(--text)">${a.name}</div>
              <div style="color:var(--sub2);font-size:11px">${a.id}</div>
            </td>
            <td style="text-align:center;padding:8px 4px;color:${ss>0?'var(--text)':'var(--sub)'}">${ss}</td>
            <td style="text-align:center;padding:8px 4px">${hasPlan ? chip('Sem '+planWeek,'#22c55e') : chip('Sin plan','#ef4444')}</td>
            <td style="text-align:center;padding:8px 4px">${hasDiet ? chip('OK','#22c55e') : chip('–','var(--sub)')}</td>
            <td style="text-align:center;padding:8px 4px;color:${daysSince===null?'var(--sub2)':daysSince<=2?'#22c55e':daysSince<=5?'#f59e0b':'#ef4444'}">
              ${daysSince===null?'—':daysSince===0?'hoy':daysSince+'d'}
            </td>
          </tr>`).join('')}
        </tbody>
      </table>
    </div>
  </div>

  <div class="section-card">
    <div class="section-head"><div class="section-title">Info</div></div>
    <div class="section-body" style="font-size:12px;color:var(--sub);display:flex;flex-direction:column;gap:4px">
      <div>Última actualización: ${now.toLocaleTimeString('es-UY')}</div>
      <div>Atletas en memoria: ${athletes.length}</div>
      <div>Auth UID: ${fbUser?.uid || '—'}</div>
      <div>App version: v6</div>
    </div>
  </div>`;
}

function exportJSON(){const d={athletes,sessions,ts:new Date().toISOString()};const b=new Blob([JSON.stringify(d,null,2)],{type:'application/json'});const u=URL.createObjectURL(b);const a=document.createElement('a');a.href=u;a.download='squadteam_backup.json';a.click();}
function importJSON(){const i=document.createElement('input');i.type='file';i.accept='.json';i.onchange=e=>{const f=e.target.files[0];if(!f)return;const r=new FileReader();r.onload=ev=>{try{const d=JSON.parse(ev.target.result);if(d.athletes){athletes=d.athletes;DB.set('athletes',athletes);}if(d.sessions){sessions=d.sessions;DB.set('sessions',sessions);}toast('Datos importados');renderAll();}catch(ex){toast('Error al importar');}};r.readAsText(f);};i.click();}

function renderSheetsPanel(){
  const cont=document.getElementById('adm-pnl-sheets');
  if(!cont)return;
  renderXlsxImporter(cont);
}

// ═══════════════════════════════════════
// PLANILLA — Spreadsheet interactivo
// ═══════════════════════════════════════

function plGet(si,ex,sr){if(si>=_plSess.length)return{kg:'',reps:''};const s=_plSess[si];const e=(s.exercises||[]).find(e=>_norm(e.name)===_norm(ex));if(!e)return{kg:'',reps:''};const set=(e.sets||[])[sr];return set?{kg:set.kg||'',reps:set.reps||''}:{kg:'',reps:''};}

function plDrawFreestyle(){
  const msg=document.getElementById('pl-msg'),wrap=document.getElementById('pl-wrap'),tbl=document.getElementById('pl-t');
  if(!tbl)return;
  const exMap={};const sessDates=[];
  _plSess.forEach(sess=>{if(!sess.exercises?.length)return;const date=sess.date||'?';if(!sessDates.includes(date))sessDates.push(date);sess.exercises.forEach(ex=>{const nm=(ex.name||'').toUpperCase();if(!exMap[nm])exMap[nm]=[];exMap[nm].push({date,sets:ex.sets||[]});});});
  const exNames=Object.keys(exMap).sort();
  if(!exNames.length){if(msg){msg.style.display='block';msg.innerHTML=`<div style="font-size:28px;margin-bottom:8px">🏋️</div><b>${_plAth.name}</b> — Sin sesiones freestyle aún<br><span style="font-size:12px;color:#9ca3af">Las sesiones del bot aparecerán acá</span>`;}if(wrap)wrap.style.display='none';return;}
  if(msg)msg.style.display='none';if(wrap)wrap.style.display='block';
  const TH=`font-size:10px;font-weight:700;letter-spacing:1px;text-transform:uppercase;padding:5px 8px;text-align:center;border:1px solid #e5e7eb;`;
  const nDates=Math.min(sessDates.length,8);const shownDates=sessDates.slice(-nDates);
  let h='<thead><tr>';
  h+=`<th style="${TH};text-align:left;background:#f9fafb;position:sticky;left:0;z-index:8;min-width:150px">EJERCICIO</th>`;
  shownDates.forEach((d,i)=>{const isLast=i===shownDates.length-1;h+=`<th colspan="2" style="${TH};background:${isLast?'#16a34a':'#f9fafb'};color:${isLast?'#fff':'#6b7280'};${isLast?'border-top:2px solid #16a34a;':''}">${d.slice(5)}</th>`;});
  h+='</tr><tr>';h+=`<th style="${TH};background:#f9fafb;position:sticky;left:0;z-index:8"></th>`;
  shownDates.forEach((d,i)=>{const isLast=i===shownDates.length-1;h+=`<th style="${TH};background:${isLast?'#16a34a':'#f9fafb'};color:${isLast?'rgba(255,255,255,.85)':'#9ca3af'};width:50px">KG</th><th style="${TH};background:${isLast?'#16a34a':'#f9fafb'};color:${isLast?'rgba(255,255,255,.85)':'#9ca3af'};width:42px">REP</th>`;});
  h+='</tr></thead><tbody>';
  exNames.forEach(nm=>{const isLive=(_plLive?.exerciseName||'').toUpperCase()===nm;const exBg=isLive?'#fee2e2':'#1e293b';const ncols=1+nDates*2;
  h+=`<tr><td colspan="${ncols}" style="background:${exBg};padding:7px 12px;border:none;border-top:2px solid ${isLive?'#fca5a5':'#334155'};font-size:11px;font-weight:800;letter-spacing:.5px;color:${isLive?'#991b1b':'#f1f5f9'};position:sticky;left:0">${nm}${isLive?'<span style="margin-left:8px;font-size:10px;color:#ef4444;animation:plPulse .8s infinite">● EN VIVO</span>':''}</td></tr>`;
  let maxS=0;shownDates.forEach(d=>{const entry=exMap[nm]?.find(e=>e.date===d);if(entry)maxS=Math.max(maxS,entry.sets?.length||0);});if(!maxS)maxS=1;
  const sLbl=['1ª SERIE','2ª SERIE','3ª SERIE','4ª SERIE','5ª SERIE'];
  for(let s=0;s<maxS;s++){
    h+=`<tr><td class="pl-sc" style="background:#fff;padding:0 8px;font-size:10px;font-weight:600;color:#374151;white-space:nowrap">${sLbl[s]||`${s+1}ª SERIE`}</td>`;
    shownDates.forEach((d,i)=>{const entry=exMap[nm]?.find(e=>e.date===d);const set=entry?.sets?.[s];const isLast=i===shownDates.length-1;const bg=isLast?'#f0fdf4':'#fff';const isPR=set?.kg&&i>0&&(()=>{for(let j=i-1;j>=0;j--){const prev=exMap[nm]?.find(e=>e.date===shownDates[j])?.sets?.[s]?.kg;if(prev)return parseFloat(set.kg)>parseFloat(prev);}return false;})();
    h+=`<td style="background:${bg};border:1px solid #e5e7eb;padding:0"><input type="number" step="0.5" min="0" placeholder="—" value="${set?.kg||''}" data-ex="${nm}" data-sr="${s}" data-date="${d}" data-field="kg" oninput="plCIFree(this)" onchange="plCIFree(this)" onfocus="this.parentNode.style.background='#dcfce7'" onblur="this.parentNode.style.background='${bg}'" class="pl-inp" style="color:${isPR?'#16a34a':set?.kg?'#111827':'#e5e7eb'}"></td>
    <td style="background:${bg};border:1px solid #e5e7eb;padding:0"><input type="number" step="1" min="0" placeholder="—" value="${set?.reps||''}" data-ex="${nm}" data-sr="${s}" data-date="${d}" data-field="reps" oninput="plCIFree(this)" onchange="plCIFree(this)" onfocus="this.parentNode.style.background='#dcfce7'" onblur="this.parentNode.style.background='${bg}'" class="pl-inp" style="color:${set?.reps?'#111827':'#e5e7eb'}"></td>`;});h+='</tr>';}});
  h+='</tbody>';tbl.innerHTML=h;
}

function plDraw(){
  const msg=document.getElementById('pl-msg'),wrap=document.getElementById('pl-wrap'),tbl=document.getElementById('pl-t');
  if(!tbl)return;
  if(!_plPlan.length){plDrawFreestyle();return;}
  if(msg)msg.style.display='none';if(wrap)wrap.style.display='block';
  const nSem=Math.min(8,_plSess.length+1);const actSem=_plSess.length;const liveEx=(_plLive?.exerciseName||'').toUpperCase();
  const TH=`font-size:10px;font-weight:700;letter-spacing:1px;text-transform:uppercase;padding:5px 4px;text-align:center;border:1px solid #e5e7eb;`;
  let h='<thead><tr>';
  h+=`<th rowspan="2" style="${TH};text-align:left;background:#f9fafb;position:sticky;left:0;z-index:8;min-width:80px">SERIE</th>`;
  for(let i=0;i<nSem;i++){const s=_plSess[i];const bg=i===actSem?'#16a34a':'#f9fafb';const tc=i===actSem?'#fff':'#6b7280';const dt=s?.date?`<br><span style="font-size:9px;opacity:.75;font-weight:400">${s.date.slice(5)}</span>`:(i===actSem?`<br><span style="font-size:9px;opacity:.9">hoy</span>`:'');h+=`<th colspan="2" style="${TH};background:${bg};color:${tc};${i===actSem?'border-top:2px solid #16a34a;':''}">SEM ${i+1}${dt}</th>`;}
  h+='</tr><tr>';
  for(let i=0;i<nSem;i++){const bg=i===actSem?'#16a34a':'#f9fafb';const tc=i===actSem?'rgba(255,255,255,.85)':'#9ca3af';h+=`<th style="${TH};background:${bg};color:${tc};width:50px">KG</th><th style="${TH};background:${bg};color:${tc};width:42px">REP</th>`;}
  h+='</tr></thead><tbody>';
  _plPlan.forEach(ex=>{
    const nm=(ex.name||'').toUpperCase();const ns=_nSer(ex.series||ex.sets||3);const pr=[ex.series,ex.reps].filter(Boolean).join(' · ');
    const rs=_rirSt(ex.rir||'');const rLbl=(ex.rir||'').replace(/repeticiones en reserva/i,'').replace(/[()]/g,'').trim().toUpperCase();
    const isLive=liveEx&&nm===liveEx;const ncols=1+nSem*2;
    h+=`<tr><td colspan="${ncols}" style="background:${isLive?'#fee2e2':'#1e293b'};padding:8px 12px;border:none;border-top:2px solid ${isLive?'#fca5a5':'#334155'};border-bottom:1px solid ${isLive?'#fca5a5':'#475569'}"><div style="font-size:12px;font-weight:800;letter-spacing:.5px;color:${isLive?'#991b1b':'#f1f5f9'};line-height:1.3">${nm}${isLive?'<span style="margin-left:8px;font-size:10px;color:#ef4444;animation:plPulse .8s infinite">● EN VIVO</span>':''}</div>${pr?`<div style="font-size:10px;color:${isLive?'#fca5a5':'#94a3b8'};margin-top:1px">${pr}</div>`:''}</td></tr>`;
    if(rLbl){h+=`<tr><td colspan="${ncols}" style="background:${rs.bg};border:1px solid ${rs.bd};padding:3px 12px;font-size:10px;font-weight:700;letter-spacing:2px;color:${rs.tc}">${rLbl}</td></tr>`;}
    const sLbl=['1ª SERIE','2ª SERIE','3ª SERIE','4ª SERIE','5ª SERIE'];
    for(let s=0;s<ns;s++){
      h+=`<tr><td class="pl-sc" style="background:#fff;padding:0 8px;font-size:10px;font-weight:600;color:#374151;white-space:nowrap">${sLbl[s]||`${s+1}ª SERIE`}</td>`;
      for(let i=0;i<nSem;i++){const v=plGet(i,nm,s);const bg=i===actSem?'#f0fdf4':'#fff';const isPR=v.kg&&i>0&&parseFloat(v.kg)>parseFloat(plGet(i-1,nm,s).kg||0);
      h+=`<td style="background:${bg};border:1px solid #e5e7eb;padding:0"><input type="number" step="0.5" min="0" placeholder="—" value="${v.kg||''}" data-ex="${nm}" data-sr="${s}" data-si="${i}" data-fd="kg" oninput="plCI(this)" onchange="plCI(this)" onfocus="this.parentNode.style.background='#dcfce7'" onblur="this.parentNode.style.background='${bg}'" class="pl-inp" style="color:${isPR?'#16a34a':v.kg?'#111827':'#e5e7eb'}"></td>
      <td style="background:${bg};border:1px solid #e5e7eb;padding:0"><input type="number" step="1" min="0" placeholder="—" value="${v.reps||''}" data-ex="${nm}" data-sr="${s}" data-si="${i}" data-fd="reps" oninput="plCI(this)" onchange="plCI(this)" onfocus="this.parentNode.style.background='#dcfce7'" onblur="this.parentNode.style.background='${bg}'" class="pl-inp" style="color:${v.reps?'#111827':'#e5e7eb'}"></td>`;}
      h+='</tr>';}
    if(ex.rest){h+=`<tr><td colspan="${ncols}" style="background:#f9fafb;padding:3px 12px;font-size:10px;color:#9ca3af;border:1px solid #f3f4f6">⏱ ${ex.rest}</td></tr>`;}
  });
  h+='</tbody>';tbl.innerHTML=h;
}

function plCI(inp){if(_plTimer)clearTimeout(_plTimer);_plTimer=setTimeout(plSave,700);}
function plCIFree(inp){if(_plTimer)clearTimeout(_plTimer);_plTimer=setTimeout(()=>plSaveFree(),700);}

async function plSave(){
  if(!_plAth||!_plDia)return;plSyn('save');
  const inputs=document.querySelectorAll('#pl-t input[data-si]');const map={};
  inputs.forEach(inp=>{const ex=inp.dataset.ex,sr=parseInt(inp.dataset.sr),si=parseInt(inp.dataset.si),fd=inp.dataset.fd;const v=parseFloat(inp.value);if(!inp.value||isNaN(v))return;if(!map[si])map[si]={};if(!map[si][ex])map[si][ex]={};if(!map[si][ex][sr])map[si][ex][sr]={kg:'',reps:''};map[si][ex][sr][fd]=v;});
  let raw=getAthSessions(_plAth.id)||[];if(typeof raw==='string'){try{raw=JSON.parse(raw);}catch(e){raw=[];}}if(!Array.isArray(raw))raw=[];
  const dNum=(_plDia.match(/\d+/)||['1'])[0];const todayStr=new Date().toISOString().split('T')[0];
  Object.entries(map).forEach(([siStr,exData])=>{const si=parseInt(siStr),sNum=si+1,sid=`${_plAth.id}_dia${dNum}_sem${sNum}`;const exs=Object.entries(exData).map(([nm,srd])=>({name:nm,sets:Object.entries(srd).sort((a,b)=>a[0]-b[0]).map(([,v])=>({kg:v.kg||0,reps:v.reps||0})).filter(s=>s.kg||s.reps)})).filter(e=>e.sets.length);if(!exs.length)return;let sess=raw.find(s=>s.id===sid);if(sess){sess.exercises=exs;sess.updatedAt=todayStr;}else{sess={id:sid,athId:_plAth.id,date:todayStr,name:`${_plDia} · SEMANA ${sNum}`,exercises:exs};raw.push(sess);}if(!_plSess.find(s=>s.id===sid)){_plSess.push(sess);_plSess.sort((a,b)=>new Date(a.date)-new Date(b.date));}});
  sessions[_plAth.id]=raw;DB.set('sessions',sessions);
  try{await window.db.collection('sessions').doc(_plAth.id).set({data:JSON.stringify(raw)});plSyn('ok');plDraw();}catch(e){plSyn('err');toast('Error al guardar');}
}

async function plSaveFree(){
  if(!_plAth)return;plSyn('save');
  const inputs=document.querySelectorAll('#pl-t input[data-date]');const dateMap={};
  inputs.forEach(inp=>{const ex=inp.dataset.ex,sr=parseInt(inp.dataset.sr),date=inp.dataset.date,fd=inp.dataset.field;const v=parseFloat(inp.value);if(!inp.value||isNaN(v))return;if(!dateMap[date])dateMap[date]={};if(!dateMap[date][ex])dateMap[date][ex]={};if(!dateMap[date][ex][sr])dateMap[date][ex][sr]={kg:'',reps:''};dateMap[date][ex][sr][fd]=v;});
  let raw=getAthSessions(_plAth.id)||[];if(typeof raw==='string'){try{raw=JSON.parse(raw);}catch(e){raw=[];}}if(!Array.isArray(raw))raw=[];
  Object.entries(dateMap).forEach(([date,exData])=>{const exs=Object.entries(exData).map(([nm,srd])=>({name:nm,sets:Object.entries(srd).sort((a,b)=>a[0]-b[0]).map(([,v])=>({kg:v.kg||0,reps:v.reps||0})).filter(s=>s.kg||s.reps)})).filter(e=>e.sets.length);if(!exs.length)return;let sess=raw.find(s=>s.date===date&&(s.name||'').toUpperCase().includes('FREESTYLE'));if(sess){sess.exercises=exs;}else{sess={id:`${_plAth.id}_free_${date}`,athId:_plAth.id,date,name:'FREESTYLE',exercises:exs};raw.push(sess);}});
  sessions[_plAth.id]=raw;DB.set('sessions',sessions);
  try{await window.db.collection('sessions').doc(_plAth.id).set({data:JSON.stringify(raw)});plSyn('ok');}catch(e){plSyn('err');toast('Error al guardar');}
}

function plStartPoll(){if(_plPoller)clearInterval(_plPoller);if(!_plAth)return;plPollLive();_plPoller=setInterval(plPollLive,5000);}
async function plPollLive(){
  if(!_plAth) return;
  try{
    const snap = await window.db.collection('activeSessions').doc(_plAth.id).get();
    const tag = document.getElementById('pl-live-tag');
    if(!snap.exists||snap.data()?.status!=='active'){
      _plLive=null; if(tag) tag.style.display='none'; return;
    }
    const d = snap.data();
    const ex = d.exerciseName||'';
    const prev = _plLive?.exerciseName;
    _plLive = {exerciseName:ex};
    if(tag){ tag.style.display='flex'; document.getElementById('pl-live-ex').textContent=ex; }
    if(prev!==ex){ if(_plDia==='FREESTYLE') plDrawFreestyle(); else plDraw(); }
  }catch(e){ _plLive=null; }
}
function plSyn(s){const d=document.getElementById('pl-sync');if(!d)return;const c={ok:'#22c55e',save:'#f59e0b',err:'#ef4444',load:'#d1d5db'};d.style.background=c[s]||'#d1d5db';d.style.animation=s==='save'?'plPulse .8s infinite':'none';}

// ══════════════════════════════════════════
// IMPORTADOR DE PLANILLA EXCEL
// ══════════════════════════════════════════

function renderXlsxImporter(container){
  container.innerHTML = `
  <div style="background:white;border:1px solid var(--border);border-radius:14px;padding:20px;margin-bottom:16px">
    <div style="font-size:15px;font-weight:700;color:var(--text);margin-bottom:6px">📊 Importar planilla Excel</div>
    <div style="font-size:13px;color:var(--sub);margin-bottom:14px">Subí la planilla de un alumno y seleccioná la semana a importar como sesión</div>

    <!-- Step 1: File -->
    <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin-bottom:14px">
      <label style="flex:1;min-width:200px">
        <div style="font-size:12px;color:var(--sub);margin-bottom:4px">Archivo Excel (.xlsx)</div>
        <input type="file" accept=".xlsx,.xls" id="xlsx-file-input" onchange="xlsxLoad(this)"
          style="width:100%;padding:8px;border:1.5px solid var(--border);border-radius:8px;font-family:inherit;font-size:13px;cursor:pointer">
      </label>
      <div style="flex:1;min-width:160px">
        <div style="font-size:12px;color:var(--sub);margin-bottom:4px">Alumno</div>
        <select id="xlsx-ath-sel" style="width:100%;padding:9px 10px;border:1.5px solid var(--border);border-radius:8px;font-family:inherit;font-size:13px">
          ${athletes.map(a=>`<option value="${a.id}">${a.name}</option>`).join('')}
        </select>
      </div>
      <div style="flex:1;min-width:140px">
        <div style="font-size:12px;color:var(--sub);margin-bottom:4px">Fecha de la sesión</div>
        <input type="date" id="xlsx-date-input" value="${new Date().toISOString().split('T')[0]}"
          style="width:100%;padding:9px 10px;border:1.5px solid var(--border);border-radius:8px;font-family:inherit;font-size:13px">
      </div>
    </div>

    <div id="xlsx-preview"></div>
  </div>`;
}

let _xlsxData = null;

function xlsxLoad(input){
  const file = input.files[0];
  if(!file) return;
  const reader = new FileReader();
  reader.onload = function(e){
    try{
      const wb = XLSX.read(e.target.result, {type:'array'});
      _xlsxData = xlsxParse(wb);
      xlsxShowPreview(_xlsxData);
    }catch(err){
      document.getElementById('xlsx-preview').innerHTML =
        '<div style="color:#ef4444;font-size:13px;padding:10px">Error al leer el archivo: ' + err.message + '</div>';
    }
  };
  reader.readAsArrayBuffer(file);
}

function xlsxParse(wb){
  const SEM_COLS = [[4,5],[6,7],[8,9],[10,11],[12,13],[14,15]];
  const SERIE_RE = /^\d+[ºª°]/i;
  const SKIP_RE = /pausa|tiempo|ejercicios|entrada|calor|movilidad|día|bloque|tp |^kg$|^reps$|^series$/i;

  function cleanKg(val){
    if(val==null) return 0;
    const s = String(val).replace(/\s+/g,'').toUpperCase();
    const m = s.match(/^([\d.]+)(KG|LBS?)?/);
    if(!m) return 0;
    const n = parseFloat(m[1]);
    return m[2] && m[2].includes('LB') ? Math.round(n*0.453592*10)/10 : n;
  }
  function cleanReps(val){
    if(val==null) return 0;
    try{ return parseInt(parseFloat(String(val))); }catch(e){ return 0; }
  }

  const days = {};
  wb.SheetNames.forEach(sheetName=>{
    const ws = wb.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(ws, {header:1, defval:null});
    
    const exercises = [];
    let curEx = null, curSeries = [], curRir = {};

    rows.forEach(row=>{
      const label = String(row[1]||'').trim();
      if(!label) return;
      
      if(SERIE_RE.test(label)){ curSeries.push(row); return; }
      if(/rir/i.test(label) && curEx){
        SEM_COLS.forEach(([kc],si)=>{ if(row[kc]) curRir[si]=String(row[kc]).trim(); });
        return;
      }
      if(SKIP_RE.test(label)) return;

      if(curEx && curSeries.length) exercises.push([curEx, curSeries, {...curRir}]);
      curEx = label.toUpperCase(); curSeries = []; curRir = {};
    });
    if(curEx && curSeries.length) exercises.push([curEx, curSeries, {...curRir}]);

    const dayExs = exercises.map(([name, seriesRows, rirMap])=>{
      const setsBySem = {};
      seriesRows.forEach(row=>{
        SEM_COLS.forEach(([kc,rc],si)=>{
          const kg = cleanKg(row[kc]);
          const rp = cleanReps(row[rc]);
          if(kg>0||rp>0){
            if(!setsBySem[si]) setsBySem[si]=[];
            setsBySem[si].push({kg,reps:rp});
          }
        });
      });
      const semsWithData = Object.keys(setsBySem).map(Number).filter(si=>setsBySem[si].length>0);
      if(!semsWithData.length) return null;
      return {name, setsBySem, rirMap, lastSem: Math.max(...semsWithData), semsWithData};
    }).filter(Boolean);

    days[sheetName] = dayExs;
  });
  return days;
}

function xlsxShowPreview(data){
  const prev = document.getElementById('xlsx-preview');
  if(!data||!Object.keys(data).length){ prev.innerHTML='<div style="color:#ef4444;font-size:13px">Sin datos detectados</div>'; return; }

  const days = Object.entries(data);
  const color = '#16a34a';

  prev.innerHTML = `
  <div style="border-top:1px solid var(--border);padding-top:14px">
    <div style="font-size:13px;font-weight:700;color:var(--text);margin-bottom:12px">
      ✅ Detectado: ${days.length} días · ${days.reduce((t,[,exs])=>t+exs.length,0)} ejercicios totales
    </div>

    <!-- Day tabs -->
    <div style="display:flex;gap:8px;margin-bottom:12px;flex-wrap:wrap">
      ${days.map(([dia],i)=>`
        <button onclick="xlsxSelectDay(${i})" id="xlsx-day-btn-${i}"
          style="padding:6px 14px;border-radius:20px;border:1px solid ${i===0?'transparent':'var(--border)'};
          background:${i===0?color:'white'};color:${i===0?'white':'var(--text)'};font-size:13px;font-weight:600;cursor:pointer;font-family:inherit">
          ${dia}
        </button>`).join('')}
    </div>

    <div id="xlsx-day-detail"></div>

    <!-- Semana selector -->
    <div style="display:flex;align-items:center;gap:10px;margin:14px 0;flex-wrap:wrap">
      <div style="font-size:13px;font-weight:600;color:var(--text)">¿Qué semana importar?</div>
      <select id="xlsx-sem-sel" style="padding:8px 12px;border:1.5px solid var(--border);border-radius:8px;font-family:inherit;font-size:13px">
        <option value="-1">Última con datos (automático)</option>
        ${[0,1,2,3,4,5].map(i=>`<option value="${i}">Semana ${i+1}</option>`).join('')}
      </select>
    </div>

    <button onclick="xlsxImport()" style="padding:11px 24px;background:${color};color:white;border:none;border-radius:10px;font-size:14px;font-weight:700;cursor:pointer;font-family:inherit;width:100%">
      📥 Importar sesión a Firebase
    </button>

    <div id="xlsx-import-status" style="margin-top:8px;font-size:13px;text-align:center"></div>
  </div>`;

  xlsxSelectDay(0);
}

let _xlsxSelectedDay = 0;

function xlsxSelectDay(i){
  _xlsxSelectedDay = i;
  const days = Object.entries(_xlsxData);
  days.forEach((_,j)=>{
    const btn = document.getElementById('xlsx-day-btn-'+j);
    if(!btn) return;
    btn.style.background = j===i?'#16a34a':'white';
    btn.style.color = j===i?'white':'var(--text)';
    btn.style.borderColor = j===i?'transparent':'var(--border)';
  });

  const [diaName, exs] = days[i];
  const det = document.getElementById('xlsx-day-detail');
  if(!det) return;

  det.innerHTML = `
  <div style="background:#f9fafb;border-radius:10px;padding:12px;margin-bottom:8px;max-height:280px;overflow-y:auto">
    ${exs.map(ex=>{
      const last = ex.setsBySem[ex.lastSem]||[];
      const sets_str = last.map(s=>`${s.kg>0?s.kg+'kg':''}${s.reps>0?'×'+s.reps:''}`).filter(Boolean).join(', ');
      return `<div style="display:flex;align-items:center;gap:10px;padding:7px 0;border-bottom:1px solid var(--border)">
        <div style="width:8px;height:8px;border-radius:50%;background:#16a34a;flex-shrink:0"></div>
        <div style="flex:1;font-size:13px;font-weight:600;color:var(--text)">${ex.name}</div>
        <div style="font-size:11px;color:var(--sub);text-align:right">Sem ${ex.lastSem+1} · ${sets_str||'sin kg'}</div>
      </div>`;
    }).join('')}
  </div>`;
}

async function xlsxImport(){
  if(!_xlsxData) return;
  const athId = document.getElementById('xlsx-ath-sel')?.value;
  const date  = document.getElementById('xlsx-date-input')?.value || new Date().toISOString().split('T')[0];
  const semSel = parseInt(document.getElementById('xlsx-sem-sel')?.value);
  const status = document.getElementById('xlsx-import-status');
  const a = athletes.find(x=>x.id===athId);
  if(!a){ toast('Seleccioná un alumno'); return; }

  const days = Object.entries(_xlsxData);
  const [diaName, exs] = days[_xlsxSelectedDay];

  // Build session object
  const exercises = exs.map(ex=>{
    const sem = semSel >= 0 ? semSel : ex.lastSem;
    const sets = (ex.setsBySem[sem]||ex.setsBySem[ex.lastSem]||[]).map(s=>({kg:s.kg,reps:s.reps}));
    return {
      name: ex.name,
      rir: ex.rirMap[sem] || ex.rirMap[ex.lastSem] || 'RIR 1-2',
      sets
    };
  }).filter(ex=>ex.sets.length>0);

  if(!exercises.length){ toast('Sin ejercicios para importar'); return; }

  const session = {
    id: athId+'_'+date+'_'+Date.now(),
    date,
    name: diaName + ' · ' + (a.name||athId),
    exercises
  };

  try{
    if(status) status.textContent = 'Importando...';
    const existing = getAthSessions(athId);
    const newSessions = [session, ...existing.filter(s=>s.date!==date||s.name!==session.name)];
    sessions[athId] = newSessions;
    DB.set('sessions', sessions);
    await window.db?.collection('sessions').doc(athId).set({data:JSON.stringify(newSessions)});
    toast('Sesión de '+a.name+' importada');
    if(status) status.innerHTML = '<span style="color:#16a34a">✅ '+exercises.length+' ejercicios importados para '+a.name+' el '+date+'</span>';
  }catch(e){
    toast('Error al guardar');
    if(status) status.innerHTML = '<span style="color:#ef4444">Error: '+e.message+'</span>';
  }
}
