
function closeSidebar(){
  const sb = document.getElementById('sidebar');
  const ov = document.getElementById('sidebar-overlay');
  const btn = document.getElementById('sidebar-close-btn');
  if(sb) sb.classList.remove('open');
  if(ov) ov.classList.remove('show');
  if(btn) btn.style.display = 'none';
}

function openSidebar(){
  const sb = document.getElementById('sidebar');
  const ov = document.getElementById('sidebar-overlay');
  const btn = document.getElementById('sidebar-close-btn');
  if(sb) sb.classList.add('open');
  if(ov) ov.classList.add('show');
  // Only show X on mobile
  if(btn && window.innerWidth <= 768) btn.style.display = 'block';
}

// SQUAD TEAM v6 — App Router
// ==========================================

let athletes = [], templates = [], sessions = {}, currentUser = null, currentSection = 'dashboard';
let curSeg = '', curLive = ''; // v5 compat

const COLORS = ['#3b82f6','#8b5cf6','#f59e0b','#ec4899','#06b6d4','#10b981','#f97316','#6366f1'];
function athColor(id){ const idx = Array.isArray(athletes)?athletes.findIndex(a=>a.id===id):0; return COLORS[Math.abs(idx)%COLORS.length]||COLORS[0]; }
function athInitial(name){ return (name || '?')[0].toUpperCase(); }
function toast(msg, dur=2500){ const t = document.getElementById('toast'); if(!t) return; t.textContent = msg; t.classList.add('show'); setTimeout(() => t.classList.remove('show'), dur); }

// ── COACHES ──
const COACHES = {
  lucas: { id:'lucas', name:'Lucas', role:'coach', color:'#3b82f6' },
  tomas: { id:'tomas', name:'Tomás',  role:'coach', color:'#8b5cf6' }
};

// ── LOGIN SYSTEM ──
let loginPending = null;
let loginPin = '';

const COACH_USERS = [
  {id:'lucas', name:'Lucas', role:'coach', color:'#3b82f6'},
  {id:'tomas', name:'Tomás', role:'coach', color:'#8b5cf6'},
];

async function renderLogin() {
  const cont = document.getElementById('login-users');
  if (!cont) return;
  cont.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:24px;color:var(--sub);font-size:13px">Cargando...</div>';

  let athList = [];
  try {
    if (window.db) {
      const snap = await window.db.collection('config').doc('athletes').get();
      if (snap.exists) {
        const raw = snap.data()?.list;
        athList = raw ? JSON.parse(raw) : [];
      }
    }
  } catch(e) {}
  if (!athList.length) athList = _parseList(DB.get('athletes')) || [];
  athList = athList.filter(a => !a.inactive);

  const users = [
    ...COACH_USERS,
    ...athList.map(a => ({ id:a.id, name:a.name, role:'athlete', color:a.color||'#6366f1' }))
  ];
  window._loginUsers = users;

  cont.innerHTML = users.map((u, i) =>
    `<button class="user-btn" onclick="_loginPick(${i})" data-id="${u.id}">` +
    `<div class="user-av" style="background:${u.color}20;color:${u.color}">${athInitial(u.name)}</div>` +
    `<div class="user-btn-name">${u.name}</div>` +
    `<div class="user-btn-role">${u.role==='coach'?'⚡ Coach':'🏋️'}</div>` +
    `</button>`
  ).join('');
}
function _loginPick(i) { loginSelectUser(window._loginUsers[i]); }

function loginSelectUserStr(str) {
  try { loginSelectUser(JSON.parse(decodeURIComponent(str))); } catch(e) { console.error(e); }
}

function loginSelectUser(jsonStr) {
  loginPending = typeof jsonStr === 'string' ? JSON.parse(jsonStr) : jsonStr;
  loginPin = '';
  document.getElementById('login-step1').classList.add('hidden');
  document.getElementById('login-step2').classList.remove('hidden');
  document.getElementById('pin-user-name').textContent = loginPending.name;
  const av = document.getElementById('pin-user-av');
  const color = loginPending.color || athColor(loginPending.id);
  av.style.background = color + '20';
  av.style.color = color;
  av.textContent = athInitial(loginPending.name);
  updatePinDots();
}

function numPress(n) {
  if (loginPin.length >= 12) return;
  loginPin += n;
  updatePinDots();
  checkPin();
}

function numDel() {
  loginPin = loginPin.slice(0, -1);
  updatePinDots();
  document.getElementById('pin-err').classList.add('hidden');
  document.querySelectorAll('.dot').forEach(d => d.classList.remove('err'));
}

function updatePinDots() {
  for (let i = 0; i < 8; i++) {
    const d = document.getElementById('pd' + i);
    if (!d) continue;
    d.classList.toggle('on', i < loginPin.length);
    d.classList.remove('err');
  }
}

let _pinChecking = false;

function checkPin() {
  if(_pinChecking) return;
  // Intentar login cuando el PIN tiene 4 dígitos
  if(loginPin.length < 4) return;
  _pinChecking = true;
  SQ_AUTH.signIn(loginPending.id, loginPin)
    .then(profile => {
      document.querySelectorAll('.dot').forEach(d => d.classList.add('on'));
      DB.set('session', profile);
      setTimeout(() => initApp(profile), 300);
    })
    .catch(() => {
      loginFail();
    })
    .finally(() => { _pinChecking = false; });
}

function loginFail() {
  document.querySelectorAll('.dot').forEach(d => { d.classList.remove('on'); d.classList.add('err'); });
  document.getElementById('pin-err').classList.remove('hidden');
  setTimeout(() => {
    loginPin = '';
    updatePinDots();
    document.getElementById('pin-err').classList.add('hidden');
  }, 800);
}

function loginSuccess() {
  // Mantenido por compatibilidad — el flujo real es async en checkPin()
}

function loginBack() {
  loginPending = null;
  loginPin = '';
  document.getElementById('login-step2').classList.add('hidden');
  document.getElementById('login-step1').classList.remove('hidden');
}

// ── INIT APP ──
async function initApp(user) {
  currentUser = user;
  document.getElementById('login-screen').classList.add('hidden');
  const ca=document.getElementById('coach-app'); ca.classList.remove('hidden'); ca.style.display='flex';
  document.getElementById('mobile-nav').classList.remove('hidden');

  // Set user UI
  ['foot-av','top-av'].forEach(id => { const el = document.getElementById(id); if(el) { el.textContent = athInitial(user.name); el.style.background = (user.color || athColor(user.id)) + '20'; el.style.color = user.color || athColor(user.id); } });
  const fn = document.getElementById('foot-name'); if(fn) fn.textContent = user.name;
  const fr = document.getElementById('foot-role'); if(fr) fr.textContent = user.role === 'coach' ? 'Entrenador' : 'Alumno';
  // Sidebar subtitle handled after greeting block

  // Greeting
  const now = new Date(); const h = now.getHours();
  const tit = document.getElementById('tb-title'); if(tit) tit.textContent = user.role==='coach'?'SQUAD TEAM':user.name.toUpperCase();
  const dat = document.getElementById('tb-date'); if(dat) dat.textContent = now.toLocaleDateString('es-UY',{weekday:'long',day:'numeric',month:'long'});
  const logoSub2 = document.getElementById('logo-sub'); if(logoSub2) logoSub2.textContent = user.role==='coach'?'Coach OS':'Athlete';

  // Load data
  load();
  curSeg = athletes[0]?.id || '';
  curLive = athletes[0]?.id || '';

  // Route by role
  if (user.role === 'coach') {
    showCoachUI();
    renderDashboard();
    const ok = await pullFromFirebase();
    if (ok) renderAll();
    startGlobalPoller();
  } else {
    showAthleteUI(user);
    await pullFromFirebase();
    renderAthleteView(user); // siempre re-renderiza con datos frescos
  }
}

function showCoachUI() {
  document.querySelectorAll('.coach-only').forEach(el => el.style.display = '');
  document.querySelectorAll('.athlete-only').forEach(el => el.style.display = 'none');
  document.body.classList.remove('is-athlete');
  const tog = document.querySelector('.sidebar-tog');
  if (tog) tog.style.display = '';
  const av = document.getElementById('top-av');
  if (av) { av.title = ''; av.onclick = null; }
}

function showAthleteUI(user) {
  document.querySelectorAll('.coach-only').forEach(el => el.style.display = 'none');
  document.querySelectorAll('.athlete-only').forEach(el => el.style.display = '');
  document.body.classList.add('is-athlete');
  const tog = document.querySelector('.sidebar-tog');
  if (tog) tog.style.display = 'none';
  const av = document.getElementById('top-av');
  if (av) { av.title = 'Cerrar sesión'; av.onclick = doLogout; }
  goSection('mi-rutina', null);
}

function doLogout() {
  DB.set('session', null);
  currentUser = null;
  document.body.classList.remove('is-athlete');
  SQ_AUTH.signOut().catch(()=>{});
  const coachApp = document.getElementById('coach-app');
  const mobileNav = document.getElementById('mobile-nav');
  const loginScreen = document.getElementById('login-screen');
  if(coachApp) coachApp.classList.add('hidden');
  if(mobileNav) mobileNav.classList.add('hidden');
  if(loginScreen) loginScreen.classList.remove('hidden');
  // Volver al landing del nuevo login
  const sqAuth = document.getElementById('sq-auth');
  const sqLand = document.getElementById('sq-land');
  if(sqAuth){ sqAuth.classList.remove('sq-show'); }
  if(sqLand){ sqLand.style.display = ''; }
  loginPin = '';
  loginPending = null;
}

// ── SECTION ROUTING ──
function goSection(id, el) {
  // Close sidebar on mobile when navigating
  if(window.innerWidth <= 768) closeSidebar();
  document.querySelectorAll('.sec').forEach(s => s.classList.remove('on'));
  document.querySelectorAll('.nav-item,.mob-btn').forEach(b => b.classList.remove('on'));
  const sec = document.getElementById('sec-' + id);
  if (sec) sec.classList.add('on');
  if (el) el.classList.add('on');
  document.querySelectorAll(`[data-tab="${id}"]`).forEach(b => b.classList.add('on'));
  currentSection = id;
  if (id==='dashboard') renderDashboard();
  if (id==='clases')    renderClases();
  if (id==='live')      renderLivePicker();
  if (id==='alumnos')   renderAlumnos();
  if (id==='planilla')  renderPlanilla();
  if (id==='nutricion') renderNutricion();
  if (id==='progreso')  renderProgreso();
  if (id==='iacoach')   renderIACoach();
  if (id==='pagos')     renderPagos();
  if (id==='mi-rutina')    renderMiRutina();
  if (id==='mi-perfil')   renderAthleteView(currentUser);
  if (id==='mi-historial') renderAthHistorial(currentUser);
  if (id==='checkins')    renderCheckins();
  if (id==='admin')     { renderDB(); renderBotConfig(); }
}

function mobActive(btn) { document.querySelectorAll('.mob-btn').forEach(b => b.classList.remove('on')); btn.classList.add('on'); }
function showAdm(id, btn) {
  document.querySelectorAll('.adm-pnl').forEach(p => p.classList.remove('on'));
  document.querySelectorAll('.sub-tab').forEach(b => b.classList.remove('on'));
  document.getElementById('adm-pnl-'+id)?.classList.add('on');
  btn?.classList.add('on');
  if(id==='db') renderDB();
  if(id==='sheets') renderSheetsPanel();
  if(id==='bot') renderBotConfig();
}

function renderAll() {
  if(currentSection==='dashboard') renderDashboard();
  if(currentSection==='alumnos') renderAlumnos();
  if(currentSection==='nutricion') renderNutricion();
  if(currentSection==='progreso') renderProgreso();
  if(currentSection==='pagos') renderPagos();
  if(currentSection==='mi-perfil') renderAthleteView(currentUser);
  updateTopStreak();
  updatePayBadge();
}

function updateTopStreak() {
  // no-op — streak now shown in hero dashboard
}

function updatePayBadge() {
  if (currentUser?.role !== 'coach') return;
  const now = new Date(); const day = now.getDate();
  const urgent = athletes.filter(a => {
    const pay = a.payment || {};
    if (!pay.payday || pay.status === 'paid') return false;
    const dl = pay.payday >= day ? pay.payday - day : (pay.payday + 30) - day;
    return dl <= 3;
  }).length;
  const badge = document.getElementById('pay-badge');
  if (badge) { badge.style.display = urgent > 0 ? 'inline-flex' : 'none'; badge.textContent = urgent; }
}

// ── GLOBAL POLLER ──
let globalPoller  = null;
let _lastDataSync = 0;       // timestamp último sync de datos
const DATA_SYNC_INTERVAL = 20000; // sync cada 20s

function startGlobalPoller() {
  if (globalPoller) clearInterval(globalPoller);
  globalPoller = setInterval(pollActiveSessions, 30000);
  pollActiveSessions();
}

async function pollActiveSessions() {
  try {
    if (!Array.isArray(athletes) || !athletes.length) return;

    // ── 1. Active sessions via Firebase SDK (incluye auth token) ──
    let count = 0;
    await Promise.all(athletes.map(async a => {
      try {
        const doc = await window.db.collection('activeSessions').doc(a.id).get();
        if (doc.exists && doc.data()?.status === 'active') count++;
      } catch(e) {}
    }));
    const badge = document.getElementById('live-badge');
    if (badge) { badge.style.display = count > 0 ? 'inline-flex' : 'none'; badge.textContent = count; }
    const liveInd = document.getElementById('live-indicator');
    if (liveInd) liveInd.style.display = count > 0 ? 'flex' : 'none';
    if (count > 0 && currentSection === 'live') renderLivePicker();

    // ── 2. Sync datos desde Firebase (cada 60s) ──
    if (Date.now() - _lastDataSync >= DATA_SYNC_INTERVAL) {
      _lastDataSync = Date.now();
      await quickSyncFromFirebase();
    }
  } catch(e) {}
}

// Sync liviano via Firebase SDK — incluye auth token automáticamente
async function quickSyncFromFirebase() {
  if (!window.db) return;
  try {
    // ── Atletas ──
    const athDoc = await window.db.collection('config').doc('athletes').get();
    if (athDoc.exists) {
      const raw = athDoc.data()?.list;
      if (raw) {
        try {
          const fresh = JSON.parse(raw);
          if (Array.isArray(fresh) && fresh.length) {
            const changed = JSON.stringify(fresh) !== JSON.stringify(athletes);
            if (changed) {
              athletes = fresh;
              DB.set('athletes', athletes);
              if (currentSection === 'alumnos')   renderAlumnos();
              if (currentSection === 'dashboard')  renderDashboard();
              if (currentSection === 'pagos')      renderPagos();
              if (currentSection === 'nutricion')  renderNutricion();
              updatePayBadge();
            }
          }
        } catch(e) {}
      }
    }

    // ── Sesiones ──
    let sessionsChanged = false;
    await Promise.all(athletes.map(async a => {
      try {
        const sDoc = await window.db.collection('sessions').doc(a.id).get();
        if (!sDoc.exists) return;
        const raw = sDoc.data()?.data;
        if (!raw) return;
        const fresh = JSON.parse(raw);
        if (Array.isArray(fresh) && JSON.stringify(fresh) !== JSON.stringify(sessions[a.id])) {
          sessions[a.id] = fresh;
          sessionsChanged = true;
        }
      } catch(e) {}
    }));
    if (sessionsChanged) {
      DB.set('sessions', sessions);
      if (currentSection === 'dashboard') renderDashboard();
      if (currentSection === 'progreso')  renderProgreso();
    }

    // ── Horarios ──
    const SCHED_KEYS = ['sun','mon','tue','wed','thu','fri','sat'];
    let schedChanged = false;
    if (typeof _clSchedules !== 'undefined') {
      await Promise.all(athletes.map(async a => {
        try {
          const doc = await window.db.collection('schedules').doc(a.id).get();
          if (!doc.exists) return;
          const fresh = {};
          for (const k of SCHED_KEYS) fresh[k] = doc.data()?.[k] || null;
          if (JSON.stringify(_clSchedules[a.id] || {}) !== JSON.stringify(fresh)) {
            _clSchedules[a.id] = fresh;
            schedChanged = true;
          }
        } catch(e) {}
      }));
      if (schedChanged) { _clLoaded = true; if (currentSection === 'clases') renderClases(); }
    }

    // ── Dietas ──
    if (typeof window._dietsCache !== 'undefined') {
      await Promise.all(athletes.map(async a => {
        try {
          const doc = await window.db.collection('diets').doc(a.id).get();
          if (!doc.exists) return;
          const fresh = doc.data() || {};
          if (JSON.stringify(window._dietsCache[a.id] || {}) !== JSON.stringify(fresh)) {
            window._dietsCache[a.id] = fresh;
            if (currentSection === 'nutricion') renderNutricion();
          }
        } catch(e) {}
      }));
    }

    const si = document.getElementById('sync-status');
    if (si) si.textContent = '';

  } catch(e) {}
}

// ── ATHLETE VIEW ──
function renderAthleteView(user) {
  if (!user) return;
  if(!Array.isArray(athletes)||!athletes.length) athletes=typeof DEFAULT_ATHLETES!=='undefined'?DEFAULT_ATHLETES:[];
  const cont = document.getElementById('mi-perfil-content');
  if (!cont) return;
  try {
    const ss      = getAthSessions(user.id);
    const sorted  = [...ss].sort((x,y)=>new Date(y.date)-new Date(x.date));
    const streak  = getStreak(user.id);
    const color   = user.color || athColor(user.id);
    const now     = new Date();
    const todayKey= now.toISOString().slice(0,10);
    const isSun   = now.getDay() === 0;
    const weekAgo = new Date(now); weekAgo.setDate(weekAgo.getDate()-7);
    const weekSess= ss.filter(s=>new Date(s.date+'T12:00:00')>=weekAgo);
    const weekVol = weekSess.reduce((t,s)=>t+calcVol(s),0);
    const lastSess= sorted[0]||null;
    const todayLog= DB.get('daily_'+user.id+'_'+todayKey)||{};
    const coachNote=DB.get('notes_'+user.id)||null;
    let diet = DB.get('diet_'+user.id)||null;
    // Si no está en cache, cargar desde Firestore en background y re-render
    if(!diet && window.db){
      window.db.collection('diets').doc(user.id).get()
        .then(snap=>{ if(snap.exists){ DB.set('diet_'+user.id,snap.data()); renderAthleteView(currentUser); } })
        .catch(()=>{});
    }
    const prs={};
    ss.forEach(s=>(s.exercises||[]).forEach(ex=>{
      const mx=Math.max(0,...(ex.sets||[]).map(st=>parseFloat(st.kg)||0));
      if(mx>0&&(!prs[ex.name]||mx>prs[ex.name].kg)) prs[ex.name]={kg:mx,date:s.date};
    }));
    const topPRs=Object.entries(prs).sort((a,b)=>b[1].kg-a[1].kg).slice(0,6);
    const volFmt=v=>v>=1000?(v/1000).toFixed(1)+'k':Math.round(v)||'0';
    const C=(s,v='')=>'<div style="'+s+'">'+v+'</div>';
    const parts=[];

    parts.push('<div style="padding:16px;max-width:560px;margin:0 auto;display:flex;flex-direction:column;gap:14px">');

    // ── SUNDAY CHECK-IN BANNER ──
    if(isSun){
      const days7=[];
      for(let i=6;i>=0;i--){
        const d=new Date(now); d.setDate(d.getDate()-i);
        const dk=d.toISOString().slice(0,10);
        const dl=DB.get('daily_'+user.id+'_'+dk)||{};
        const trained=ss.some(s=>s.date===dk);
        days7.push({dk,dn:d.toLocaleDateString('es-UY',{weekday:'short'}).toUpperCase(),dl,trained});
      }
      const avgWeight=days7.filter(d=>d.dl.weight).map(d=>d.dl.weight);
      const avgW=avgWeight.length?(avgWeight.reduce((a,b)=>a+b,0)/avgWeight.length).toFixed(1):'—';
      const totalWater=days7.reduce((t,d)=>t+(parseFloat(d.dl.water)||0),0);
      const totalSteps=days7.reduce((t,d)=>t+(parseInt(d.dl.steps)||0),0);
      const trainedDays=days7.filter(d=>d.trained).length;
      const dayDots=days7.map(d=>
        '<div style="display:flex;flex-direction:column;align-items:center;gap:4px">'
        +'<div style="width:32px;height:32px;border-radius:50%;background:'+(d.trained?color:'#1a1a1a')+';display:flex;align-items:center;justify-content:center;font-size:14px">'+(d.trained?'💪':'—')+'</div>'
        +'<div style="font-size:10px;color:#555">'+d.dn.slice(0,3)+'</div>'
        +'</div>'
      ).join('');
      parts.push(`
      <div style="background:#0a0a0a;border-radius:16px;padding:22px;color:white;border:1px solid ${color}44">
        <div style="font-size:10px;color:${color};letter-spacing:2px;font-weight:700;margin-bottom:4px">DOMINGO · CHECK-IN SEMANAL</div>
        <div style="font-size:22px;font-weight:900;color:white;margin-bottom:16px">Resumen de la semana 📊</div>
        <div style="display:flex;justify-content:space-around;margin-bottom:18px">${dayDots}</div>
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px">
          <div style="background:#1a1a1a;border-radius:10px;padding:12px;text-align:center">
            <div style="font-size:22px;font-weight:900;color:${color}">${trainedDays}</div>
            <div style="font-size:10px;color:#555;margin-top:2px">ENTRENOS</div>
          </div>
          <div style="background:#1a1a1a;border-radius:10px;padding:12px;text-align:center">
            <div style="font-size:22px;font-weight:900;color:white">${volFmt(weekVol)}</div>
            <div style="font-size:10px;color:#555;margin-top:2px">KG MOVIDOS</div>
          </div>
          <div style="background:#1a1a1a;border-radius:10px;padding:12px;text-align:center">
            <div style="font-size:22px;font-weight:900;color:white">${avgW}</div>
            <div style="font-size:10px;color:#555;margin-top:2px">PESO PROM.</div>
          </div>
        </div>
        ${totalWater>0||totalSteps>0?'<div style="display:flex;gap:10px;margin-top:10px">'
          +(totalWater>0?'<div style="flex:1;background:#1a1a1a;border-radius:10px;padding:10px;text-align:center"><div style="font-size:18px;font-weight:800;color:#38bdf8">'+totalWater.toFixed(1)+' L</div><div style="font-size:10px;color:#555">AGUA TOTAL</div></div>':'')
          +(totalSteps>0?'<div style="flex:1;background:#1a1a1a;border-radius:10px;padding:10px;text-align:center"><div style="font-size:18px;font-weight:800;color:#a3e635">'+(totalSteps>=1000?(totalSteps/1000).toFixed(1)+'k':totalSteps)+'</div><div style="font-size:10px;color:#555">PASOS TOTAL</div></div>':'')
          +'</div>':''}
      </div>`);
    }

    // ── HERO RACHA ──
    if(!isSun){
      parts.push(`
      <div style="background:#0a0a0a;border-radius:16px;padding:22px;color:white">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:18px">
          <div>
            <div style="font-size:10px;color:#555;letter-spacing:2px;font-weight:700;margin-bottom:4px">RACHA</div>
            <div style="font-size:76px;font-weight:900;color:#e8ff00;line-height:1">${streak}</div>
            <div style="font-size:13px;color:#666;margin-top:4px">días seguidos</div>
          </div>
          <div style="text-align:right">
            <div style="font-size:10px;color:#555;letter-spacing:2px;font-weight:700;margin-bottom:6px">ESTA SEMANA</div>
            <div style="font-size:34px;font-weight:900;color:white;line-height:1">${weekSess.length} <span style="font-size:13px;color:#666">ses.</span></div>
            <div style="font-size:20px;font-weight:800;color:#e8ff00;margin-top:6px">${volFmt(weekVol)} kg</div>
          </div>
        </div>
        <div style="background:#1a1a1a;border-radius:4px;height:5px;overflow:hidden">
          <div style="background:#e8ff00;height:100%;width:${streak>0?Math.min(85,55+streak*4):0}%;border-radius:4px"></div>
        </div>
      </div>`);
    }

    // ── FEEDBACK DEL COACH ──
    if(coachNote&&coachNote.text){
      parts.push(`
      <div style="background:white;border:2px solid ${color}44;border-radius:16px;padding:20px">
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px">
          <div style="width:30px;height:30px;border-radius:50%;background:${color};display:flex;align-items:center;justify-content:center;font-size:14px;flex-shrink:0">💬</div>
          <div style="font-size:13px;font-weight:700;color:#0d1117">Feedback del coach${coachNote.date?' <span style="font-weight:400;color:#9ca3af;font-size:11px">· '+coachNote.date+'</span>':''}</div>
        </div>
        <div style="font-size:14px;color:#374151;line-height:1.7;font-style:italic">"${coachNote.text}"</div>
      </div>`);
    }

    // ── TRACKING DIARIO ──
    const waterOpts=[1,1.5,2,2.5,3];
    parts.push(`
    <div style="background:white;border:1px solid #e8eaed;border-radius:16px;padding:20px">
      <div style="font-size:13px;font-weight:700;color:#0d1117;margin-bottom:14px">📋 Registro de hoy</div>
      <div style="display:flex;flex-direction:column;gap:14px">
        <div>
          <div style="font-size:11px;font-weight:700;color:#9ca3af;letter-spacing:1px;margin-bottom:8px">PESO CORPORAL</div>
          <div style="display:flex;gap:8px;align-items:center">
            <div style="position:relative;flex:1">
              <input id="ath-peso" type="number" step="0.1" inputmode="decimal" placeholder="kg"
                value="${todayLog.weight||''}"
                style="width:100%;padding:11px 36px 11px 14px;border:2px solid #e8eaed;border-radius:10px;font-size:16px;font-family:inherit;box-sizing:border-box;background:#f9fafb;outline:none"
                onfocus="this.style.borderColor='${color}'" onblur="this.style.borderColor='#e8eaed'">
              <span style="position:absolute;right:12px;top:50%;transform:translateY(-50%);font-size:12px;color:#9ca3af">kg</span>
            </div>
            <button onclick="saveDaily('${user.id}','weight',document.getElementById('ath-peso').value)"
              style="background:#0a0a0a;color:#e8ff00;border:none;border-radius:10px;padding:11px 18px;font-weight:900;font-size:13px;cursor:pointer;white-space:nowrap">
              Guardar
            </button>
          </div>
          ${todayLog.weight?'<div style="font-size:11px;color:#9ca3af;margin-top:5px">Hoy: <b style="color:#374151">'+todayLog.weight+' kg</b></div>':''}
        </div>
        <div>
          <div style="font-size:11px;font-weight:700;color:#9ca3af;letter-spacing:1px;margin-bottom:8px">AGUA 💧</div>
          <div style="display:flex;gap:6px;flex-wrap:wrap">
            ${waterOpts.map(v=>'<button onclick="saveDaily(\''+user.id+'\',\'water\','+v+')"'
              +' style="flex:1;min-width:48px;padding:9px 4px;border:2px solid '+(todayLog.water==v?color:'#e8eaed')+';border-radius:9px;background:'+(todayLog.water==v?color+'15':'white')+';font-size:13px;font-weight:700;color:'+(todayLog.water==v?color:'#374151')+';cursor:pointer">'+v+'L</button>'
            ).join('')}
          </div>
        </div>
        <div>
          <div style="font-size:11px;font-weight:700;color:#9ca3af;letter-spacing:1px;margin-bottom:8px">PASOS 🚶</div>
          <div style="display:flex;gap:8px;align-items:center">
            <div style="position:relative;flex:1">
              <input id="ath-pasos" type="number" inputmode="numeric" placeholder="pasos"
                value="${todayLog.steps||''}"
                style="width:100%;padding:11px 14px;border:2px solid #e8eaed;border-radius:10px;font-size:16px;font-family:inherit;box-sizing:border-box;background:#f9fafb;outline:none"
                onfocus="this.style.borderColor='${color}'" onblur="this.style.borderColor='#e8eaed'">
            </div>
            <button onclick="saveDaily('${user.id}','steps',document.getElementById('ath-pasos').value)"
              style="background:#0a0a0a;color:#e8ff00;border:none;border-radius:10px;padding:11px 18px;font-weight:900;font-size:13px;cursor:pointer;white-space:nowrap">
              Guardar
            </button>
          </div>
          ${todayLog.steps?'<div style="font-size:11px;color:#9ca3af;margin-top:5px">Hoy: <b style="color:#374151">'+(todayLog.steps>=1000?(todayLog.steps/1000).toFixed(1)+'k':todayLog.steps)+' pasos</b></div>':''}
        </div>
      </div>
    </div>`);

    // ── DIETA ──
    if(diet && (diet.meals||diet.text||diet.plan||typeof diet==='string')) {
      const dietContent = typeof diet==='string' ? diet
        : diet.text||diet.plan
        ? (diet.text||diet.plan)
        : Object.entries(diet).filter(([k])=>k!=='id').map(([k,v])=>'<b>'+k+':</b> '+v).join('<br>');
      parts.push(`
      <div style="background:white;border:1px solid #e8eaed;border-radius:16px;padding:20px">
        <div style="font-size:13px;font-weight:700;color:#0d1117;margin-bottom:12px">🥗 Mi dieta</div>
        <div style="font-size:13px;color:#374151;line-height:1.8">${dietContent}</div>
      </div>`);
    }

    // ── ÚLTIMO ENTRENAMIENTO ──
    if(lastSess){
      const ds=Math.floor((now-new Date(lastSess.date+'T12:00:00'))/86400000);
      const vol=Math.round(calcVol(lastSess));
      const exList=(lastSess.exercises||[]).map(ex=>{
        const top=(ex.sets||[]).reduce((mx,st)=>((parseFloat(st.kg)||0)>(parseFloat(mx.kg)||0)?st:mx),{kg:0,reps:0});
        return '<div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid #f3f4f6">'
          +'<span style="font-size:13px;color:#374151">'+ex.name.split(' ').slice(0,4).join(' ')+'</span>'
          +(top.kg>0?'<span style="font-size:13px;font-weight:700;color:'+color+'">'+top.kg+' kg × '+top.reps+'</span>':'')+'</div>';
      }).join('');
      parts.push(`
      <div style="background:white;border:1px solid #e8eaed;border-radius:16px;padding:20px">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:14px">
          <div>
            <div style="font-size:13px;font-weight:700;color:#0d1117">📅 Último entrenamiento</div>
            <div style="font-size:12px;color:#9ca3af;margin-top:3px">${ds===0?'Hoy':ds===1?'Ayer':'Hace '+ds+' días'} · ${lastSess.name||'Sesión'}</div>
          </div>
          <div style="text-align:right">
            <div style="font-size:20px;font-weight:800;color:${color}">${volFmt(vol)} kg</div>
            <div style="font-size:11px;color:#9ca3af">${(lastSess.exercises||[]).length} ejercicios</div>
          </div>
        </div>
        ${exList||'<div style="color:#9ca3af;font-size:13px">Sin registro de cargas</div>'}
      </div>`);
    }

    // ── MIS RÉCORDS ──
    if(topPRs.length){
      const prRows=topPRs.map(([n,{kg}])=>
        '<div style="display:flex;justify-content:space-between;align-items:center;padding:9px 0;border-bottom:1px solid #f3f4f6">'
        +'<span style="font-size:13px;color:#374151">'+n.split(' ').slice(0,4).join(' ')+'</span>'
        +'<span style="font-size:14px;font-weight:800;color:'+color+'">'+kg+' kg</span></div>'
      ).join('');
      parts.push(`
      <div style="background:white;border:1px solid #e8eaed;border-radius:16px;padding:20px">
        <div style="font-size:13px;font-weight:700;color:#0d1117;margin-bottom:12px">🏆 Mis récords</div>
        ${prRows}
      </div>`);
    }

    parts.push('</div>');
    cont.innerHTML='<style>@keyframes sq-spin{to{transform:rotate(360deg)}}</style>'+parts.join('');
    // startLiveSessionPoller(user.id); // deshabilitado — usa REST sin auth, no necesario para atletas
  } catch(err){
    console.error('[renderAthleteView]',err);
    const c2=document.getElementById('mi-perfil-content');
    if(c2) c2.innerHTML='<div style="padding:32px;text-align:center;color:#ef4444;font-size:13px">Error: '+err.message+'</div>';
  }
}

// ── SAVE DAILY LOG ──
async function saveDaily(athId, field, value) {
  if(!value && value!==0) return;
  const parsed = field==='steps' ? parseInt(value) : parseFloat(value);
  if(isNaN(parsed)||parsed<=0) return;
  const todayKey = new Date().toISOString().slice(0,10);
  const key = 'daily_'+athId+'_'+todayKey;
  const log = DB.get(key)||{};
  log[field]=parsed; log.date=todayKey; log.athleteId=athId;
  DB.set(key, log);
  try{ await fbSet('dailyLogs', athId+'_'+todayKey, log); }catch(e){}
  toast('Guardado ✓');
  if(currentUser&&currentUser.id===athId) renderAthleteView(currentUser);
}

// Alias para el poller de sesión live en storage.js
function renderAthHoy(athId){ if(currentUser&&currentUser.id===athId) renderAthleteView(currentUser); }

// ── PLAN DEL DÍA (async desde Firebase) ──
async function loadTodayPlan(athId, color) {
  const body = document.getElementById('plan-hoy-body');
  if (!body) return;
  try {
    const snap = await window.db.collection('plans').doc(athId).get();
    if (!snap.exists) throw new Error('sin plan');
    const str = snap.data()?.data;
    if (!str) throw new Error('vacío');
    const plan = JSON.parse(str);
    const keys = Object.keys(plan).sort();
    if (!keys.length) throw new Error('vacío');

    // Mostrar tabs + primer día por defecto
    body.innerHTML = `
      <div id="plan-tabs" style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px">
        ${keys.map((k,i)=>`<button
          onclick="switchPlanDay('${k}',this)"
          data-key="${k}"
          data-exercises="${encodeURIComponent(JSON.stringify(plan[k]))}"
          data-color="${color}"
          style="padding:6px 14px;border-radius:20px;border:1.5px solid ${i===0?color:'var(--border)'};
            background:${i===0?color+'18':'transparent'};color:${i===0?color:'var(--sub)'};
            font-size:12px;font-weight:700;cursor:pointer;font-family:inherit"
          >${k}</button>`).join('')}
      </div>
      <div id="plan-day-exercises">${renderPlanDay(plan[keys[0]]||[], color)}</div>`;
  } catch(e) {
    body.innerHTML = `<div style="font-size:13px;color:var(--sub);padding:8px 0">Sin plan asignado · Pedile al coach</div>`;
  }
}

function renderPlanDay(exercises, color) {
  if (!exercises?.length) return `<div style="font-size:13px;color:var(--sub)">Sin ejercicios en este día</div>`;
  return exercises.map((ex,i)=>`
    <div style="display:flex;align-items:center;gap:12px;padding:8px 0;border-bottom:1px solid var(--border)">
      <div style="width:24px;height:24px;border-radius:50%;background:${color}20;color:${color};
        font-size:11px;font-weight:800;display:flex;align-items:center;justify-content:center;flex-shrink:0">${i+1}</div>
      <div style="flex:1">
        <div style="font-size:13px;font-weight:600;color:var(--text)">${ex.name||'Ejercicio'}</div>
        <div style="font-size:11px;color:var(--sub)">${ex.series||'?'} × ${ex.reps||'?'} · ${ex.rir||'RIR 2'}</div>
      </div>
    </div>`).join('');
}

function switchPlanDay(key, btn) {
  const color     = btn.dataset.color;
  const exercises = JSON.parse(decodeURIComponent(btn.dataset.exercises||'[]'));
  document.getElementById('plan-day-exercises').innerHTML = renderPlanDay(exercises, color);
  document.querySelectorAll('#plan-tabs button').forEach(b=>{
    b.style.borderColor='var(--border)'; b.style.background='transparent'; b.style.color='var(--sub)';
  });
  btn.style.borderColor=color; btn.style.background=color+'18'; btn.style.color=color;
}

// ── CHECKIN DE PESO ──
async function saveCheckin(athId) {
  const input  = document.getElementById('checkin-peso');
  const weight = parseFloat(input?.value);
  if (!weight||weight<30||weight>300){ toast('Peso inválido'); return; }

  const entry = { date: new Date().toISOString().slice(0,10), weight };
  DB.set('checkin_'+athId, entry);

  try {
    const snap = await window.db.collection('checkins').doc(athId).get();
    let hist = [];
    if (snap.exists) {
      try { hist = JSON.parse(snap.data()?.data||'[]'); } catch(e){}
    }
    hist = [entry, ...hist.filter(h=>h.date!==entry.date)].slice(0,90);
    await window.db.collection('checkins').doc(athId).set({ data: JSON.stringify(hist) });
    toast(`✓ ${weight}kg guardado`);
  } catch(e) {
    toast(`✓ ${weight}kg guardado localmente`);
  }
}

// ── ATHLETE HISTORIAL ──
function renderAthHistorial(user) {
  if(!user || user.role !== 'athlete') return;
  const cont = document.getElementById('mi-historial-content');
  if(!cont) return;

  const ss = getAthSessions(user.id).sort((a,b) => new Date(b.date) - new Date(a.date));
  const color = user.color || athColor(user.id);
  const volFmt = v => v>=1000 ? (v/1000).toFixed(1)+'k' : Math.round(v)||'0';
  const now = new Date();

  if(!ss.length){
    cont.innerHTML = `<div style="padding:40px;text-align:center">
      <div style="font-size:32px;margin-bottom:12px">📭</div>
      <div style="font-size:15px;font-weight:700;color:var(--text)">Sin sesiones registradas</div>
      <div style="font-size:13px;color:var(--sub);margin-top:6px">Completá tu primera rutina para verla acá</div>
    </div>`;
    return;
  }

  const rows = ss.map(s => {
    const ds = Math.floor((now - new Date(s.date+'T12:00:00')) / 86400000);
    const when = ds===0?'Hoy' : ds===1?'Ayer' : `${ds}d`;
    const vol = Math.round(calcVol(s));
    const exList = (s.exercises||[]).map(ex => {
      const top = (ex.sets||[]).reduce((mx,st) => (parseFloat(st.kg)||0)>(parseFloat(mx.kg)||0)?st:mx, {kg:0,reps:0});
      return `<div style="display:flex;justify-content:space-between;padding:5px 0;border-bottom:1px solid var(--border)">
        <span style="font-size:12px;color:var(--text);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:60%">${ex.name}</span>
        ${top.kg>0?`<span style="font-size:12px;font-weight:700;color:${color};flex-shrink:0">${top.kg}kg × ${top.reps}</span>`:''}
      </div>`;
    }).join('');
    return `
    <details style="background:var(--surf);border:1px solid var(--border);border-radius:12px;overflow:hidden;margin-bottom:10px">
      <summary style="padding:14px 16px;display:flex;align-items:center;justify-content:space-between;cursor:pointer;list-style:none;gap:12px">
        <div style="display:flex;align-items:center;gap:10px;flex:1;min-width:0">
          <div style="width:36px;height:36px;border-radius:10px;background:${color}18;color:${color};font-size:11px;font-weight:800;display:flex;align-items:center;justify-content:center;flex-shrink:0">${when}</div>
          <div style="min-width:0">
            <div style="font-size:14px;font-weight:700;color:var(--text)">${s.name||s.dia||'Sesión'}</div>
            <div style="font-size:11px;color:var(--sub);margin-top:1px">${s.date} · ${(s.exercises||[]).length} ejercicios</div>
          </div>
        </div>
        <div style="text-align:right;flex-shrink:0">
          <div style="font-size:16px;font-weight:800;color:${color}">${volFmt(vol)} kg</div>
          <div style="font-size:10px;color:var(--sub)">volumen</div>
        </div>
      </summary>
      <div style="padding:0 16px 14px;border-top:1px solid var(--border)">${exList||'<div style="font-size:12px;color:var(--sub);padding:8px 0">Sin detalle de cargas</div>'}</div>
    </details>`;
  });

  // PRs
  const prs = {};
  ss.forEach(s=>(s.exercises||[]).forEach(ex=>{
    const mx = Math.max(0,...(ex.sets||[]).map(st=>parseFloat(st.kg)||0));
    if(mx>0&&(!prs[ex.name]||mx>prs[ex.name].kg)) prs[ex.name]={kg:mx,date:s.date};
  }));
  const topPRs = Object.entries(prs).sort((a,b)=>b[1].kg-a[1].kg).slice(0,8);

  cont.innerHTML = `<div style="max-width:600px;margin:0 auto;padding:16px">
    <div style="font-size:18px;font-weight:800;color:var(--text);margin-bottom:4px">Mi Historial</div>
    <div style="font-size:13px;color:var(--sub);margin-bottom:16px">${ss.length} sesiones registradas</div>

    ${topPRs.length ? `
    <div style="background:var(--surf);border:1px solid var(--border);border-radius:12px;padding:14px 16px;margin-bottom:16px">
      <div style="font-size:11px;font-weight:700;color:var(--sub);text-transform:uppercase;letter-spacing:.08em;margin-bottom:10px">Mis récords</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px">
        ${topPRs.map(([n,{kg}])=>`
        <div style="display:flex;justify-content:space-between;align-items:center;padding:5px 0;border-bottom:1px solid var(--border)">
          <span style="font-size:12px;color:var(--text);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:70%">${n.split(' ').slice(0,3).join(' ')}</span>
          <span style="font-size:13px;font-weight:800;color:${color};flex-shrink:0">${kg}kg</span>
        </div>`).join('')}
      </div>
    </div>` : ''}

    <div id="hist-sessions">${rows.slice(0,15).join('')}</div>
    ${rows.length>15?`<button onclick="_histLoadMore()" id="hist-more-btn"
      style="width:100%;padding:12px;margin-top:6px;background:none;border:1px solid var(--border);border-radius:10px;color:var(--sub);font-size:13px;font-weight:600;cursor:pointer;font-family:inherit">
      Ver más (${rows.length-15} restantes)
    </button>`:''}
  </div>`;

  window._histAllRows = rows;
}

function _histLoadMore(){
  const cont = document.getElementById('hist-sessions');
  const btn = document.getElementById('hist-more-btn');
  if(!cont||!window._histAllRows) return;
  cont.innerHTML = window._histAllRows.join('');
  if(btn) btn.remove();
}

function exportAthleteCard(athId){
  const a=athletes.find(x=>x.id===athId);
  if(!a){return;}
  const ss=getAthSessions(athId);
  const streak=getStreak(ss);
  const adh=calcAdherence(ss);
  const color=athColor(athId);
  const prs={};
  ss.forEach(s=>(s.exercises||[]).forEach(ex=>{
    const max=Math.max(...(ex.sets||[]).map(st=>parseFloat(st.kg)||0),0);
    if(max>0&&(!prs[ex.name]||max>prs[ex.name]))prs[ex.name]=max;
  }));
  const topPRs=Object.entries(prs).sort((a,b)=>b[1]-a[1]).slice(0,5);
  const canvas=document.createElement('canvas');
  canvas.width=1080;canvas.height=1920;
  const ctx=canvas.getContext('2d');
  // Background
  ctx.fillStyle='#09090b'; ctx.fillRect(0,0,1080,1920);
  ctx.fillStyle=color+'22'; ctx.fillRect(0,0,1080,600);
  // Logo
  ctx.fillStyle=color; ctx.font='bold 48px Inter,Arial';
  ctx.fillText('⚡ SQUAD TEAM',80,100);
  // Avatar circle
  ctx.fillStyle=color+'33';
  ctx.beginPath();ctx.arc(540,320,140,0,Math.PI*2);ctx.fill();
  ctx.fillStyle=color; ctx.font='bold 120px Inter,Arial';
  ctx.textAlign='center'; ctx.fillText(athInitial(a.name),540,380);
  // Name
  ctx.fillStyle='#ffffff'; ctx.font='bold 72px Inter,Arial'; ctx.textAlign='center';
  ctx.fillText(a.name,540,540);
  ctx.fillStyle='#71717a'; ctx.font='36px Inter,Arial';
  ctx.fillText('SQUAD TEAM MEMBER',540,600);
  // Stats
  const stats=[{v:streak+'d',l:'RACHA'},{v:adh+'%',l:'ADHERENCIA'},{v:ss.length,l:'SESIONES'}];
  stats.forEach((s,i)=>{
    const x=180+i*360;
    ctx.fillStyle=color; ctx.font='bold 64px Inter,Arial'; ctx.textAlign='center';
    ctx.fillText(s.v,x,760);
    ctx.fillStyle='#71717a'; ctx.font='28px Inter,Arial';
    ctx.fillText(s.l,x,810);
  });
  // PRs
  ctx.fillStyle='#ffffff'; ctx.font='bold 40px Inter,Arial'; ctx.textAlign='left';
  ctx.fillText('🏆 PERSONAL RECORDS',80,920);
  topPRs.forEach(([name,kg],i)=>{
    ctx.fillStyle='#e4e4e7'; ctx.font='32px Inter,Arial';
    ctx.fillText(name.split(' ').slice(0,3).join(' '),80,990+i*60);
    ctx.fillStyle=color; ctx.font='bold 32px Inter,Arial'; ctx.textAlign='right';
    ctx.fillText(kg+'kg',1000,990+i*60);
    ctx.textAlign='left';
  });
  // Footer
  ctx.fillStyle='#3f3f46'; ctx.font='28px Inter,Arial'; ctx.textAlign='center';
  ctx.fillText(new Date().toLocaleDateString('es-UY',{month:'long',year:'numeric'}).toUpperCase(),540,1860);
  // Download
  const link=document.createElement('a');
  link.download=`squad-team-${a.name.toLowerCase()}.png`;
  link.href=canvas.toDataURL('image/png');
  link.click();
  toast('📸 Story exportada!');
}

// ── INIT ──
document.addEventListener('DOMContentLoaded', () => {
  const dat = document.getElementById('tb-date');
  if (dat) dat.textContent = new Date().toLocaleDateString('es-UY',{weekday:'long',day:'numeric',month:'long',year:'numeric'});
  if (!document.getElementById('toast')) { const t = document.createElement('div'); t.id = 'toast'; document.body.appendChild(t); }

  // Firebase Auth restaura la sesión automáticamente tras reload
  SQ_AUTH.onReady(profile => {
    if(profile){
      DB.set('session', profile);
      initApp(profile);
    } else {
      renderLogin();
    }
  });
});
