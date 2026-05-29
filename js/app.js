
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
    `<div class="user-btn-role">${u.role==='coach'?'Coach':'Atleta'}</div>` +
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
  const logoSub2 = document.getElementById('logo-sub'); if(logoSub2) logoSub2.textContent = user.role==='coach'?'Coach OS':(user.name||'ATHLETE').toUpperCase();

  // Load data
  load();
  curSeg = athletes[0]?.id || '';
  curLive = athletes[0]?.id || '';

  // Route by role
  if (user.role === 'coach' || user.role === 'owner') {
    window.isOwner = !!(user.isOwner || user.role === 'owner');
    const fr = document.getElementById('foot-role');
    if (fr) fr.textContent = window.isOwner ? 'Admin' : 'Entrenador';
    const badge = document.getElementById('owner-badge');
    if (badge) badge.style.display = window.isOwner ? 'inline-block' : 'none';
    showCoachUI();
    renderDashboard();
    const ok = await pullFromFirebase();
    if (ok) renderAll();
    startGlobalPoller();
    if (!localStorage.getItem('sq_coach_tour_done') && typeof initCoachTour === 'function') initCoachTour();
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
  if (av) { av.title = 'Cerrar sesión'; av.onclick = confirmLogout; }
  goSection('mi-perfil', null);
}

// ── GENERIC CONFIRM MODAL ──
function sqConfirm({ title, body='', confirmLabel='Confirmar', danger=false, onConfirm }){
  let ov = document.getElementById('sq-confirm-ov');
  if(ov) ov.remove();
  ov = document.createElement('div');
  ov.id = 'sq-confirm-ov';
  ov.style.cssText = 'position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,.6);backdrop-filter:blur(4px);display:flex;align-items:center;justify-content:center;padding:20px';
  const btnBg = danger ? '#ef4444' : 'var(--acc)';
  const btnColor = danger ? 'white' : '#000';
  ov.innerHTML = `
    <div style="background:var(--surf);border:1px solid var(--border2);border-radius:16px;padding:24px;max-width:300px;width:100%">
      <div style="font-size:15px;font-weight:800;color:var(--text);margin-bottom:${body?'8px':'20px'}">${title}</div>
      ${body?`<div style="font-size:13px;color:var(--sub);margin-bottom:20px;line-height:1.5">${body}</div>`:''}
      <div style="display:flex;gap:10px">
        <button onclick="document.getElementById('sq-confirm-ov').remove()"
          style="flex:1;padding:11px 0;background:none;border:1px solid var(--border2);border-radius:10px;color:var(--text2);font-size:13px;font-weight:600;cursor:pointer;font-family:inherit">
          Cancelar
        </button>
        <button id="sq-confirm-action-btn"
          style="flex:1;padding:11px 0;background:${btnBg};border:none;border-radius:10px;color:${btnColor};font-size:13px;font-weight:700;cursor:pointer;font-family:inherit">
          ${confirmLabel}
        </button>
      </div>
    </div>`;
  ov.onclick = e => { if(e.target === ov) ov.remove(); };
  document.getElementById('sq-confirm-action-btn')?.remove(); // prevent duplicate
  document.body.appendChild(ov);
  document.getElementById('sq-confirm-action-btn').onclick = () => { ov.remove(); onConfirm(); };
}

function confirmLogout() {
  let ov = document.getElementById('logout-confirm-ov');
  if (ov) return;
  ov = document.createElement('div');
  ov.id = 'logout-confirm-ov';
  ov.style.cssText = 'position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,.6);backdrop-filter:blur(4px);display:flex;align-items:center;justify-content:center;padding:20px';
  ov.innerHTML = `
    <div style="background:var(--surf);border:1px solid var(--border2);border-radius:16px;padding:24px;max-width:280px;width:100%;text-align:center">
      <div style="font-size:28px;margin-bottom:12px">👋</div>
      <div style="font-size:15px;font-weight:800;color:var(--text);margin-bottom:6px">¿Cerrar sesión?</div>
      <div style="font-size:13px;color:var(--sub);margin-bottom:20px">Vas a tener que volver a ingresar tu PIN.</div>
      <div style="display:flex;gap:10px">
        <button onclick="document.getElementById('logout-confirm-ov').remove()"
          style="flex:1;padding:11px 0;background:none;border:1px solid var(--border2);border-radius:10px;color:var(--text2);font-size:13px;font-weight:600;cursor:pointer;font-family:inherit">
          Cancelar
        </button>
        <button onclick="document.getElementById('logout-confirm-ov').remove();doLogout()"
          style="flex:1;padding:11px 0;background:#ef4444;border:none;border-radius:10px;color:white;font-size:13px;font-weight:700;cursor:pointer;font-family:inherit">
          Cerrar sesión
        </button>
      </div>
    </div>`;
  ov.onclick = e => { if (e.target === ov) ov.remove(); };
  document.body.appendChild(ov);
}

function doLogout() {
  if(typeof destroyDopamine==='function') destroyDopamine();
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
  if (id==='alumnos')   renderAlumnos();
  if (id==='planilla')  renderPlanilla();
  if (id==='nutricion') renderNutricion();
  if (id==='progreso')  renderProgreso();
  if (id==='pagos')     renderPagos();
  if (id==='mi-rutina')    renderMiRutina();
  if (id==='mi-perfil')   renderAthleteView(currentUser);
  if (id==='mi-historial') renderAthHistorial(currentUser);
  if (id==='checkins')    renderCheckins();
  if (id==='admin')     renderDB();
}

function mobActive(btn) { document.querySelectorAll('.mob-btn').forEach(b => b.classList.remove('on')); btn.classList.add('on'); }
function showAdm(id, btn) {
  document.querySelectorAll('.adm-pnl').forEach(p => p.classList.remove('on'));
  document.querySelectorAll('.sub-tab').forEach(b => b.classList.remove('on'));
  document.getElementById('adm-pnl-'+id)?.classList.add('on');
  btn?.classList.add('on');
  if(id==='db') renderDB();
  if(id==='sheets') renderSheetsPanel();
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
  globalPoller = setInterval(async () => {
    try {
      if (Date.now() - _lastDataSync >= DATA_SYNC_INTERVAL) {
        _lastDataSync = Date.now();
        await quickSyncFromFirebase();
      }
    } catch(e) {}
  }, 30000);
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
            <div style="font-size:clamp(72px,20vw,120px);font-family:'Barlow Condensed',sans-serif;font-weight:900;color:var(--acc);line-height:1">${streak}</div>
            <div style="font-size:11px;letter-spacing:2px;color:var(--sub);text-transform:uppercase;margin-top:4px">DÍAS CONSECUTIVOS</div>
          </div>
          <div style="text-align:right">
            <div style="font-size:10px;color:#555;letter-spacing:2px;font-weight:700;margin-bottom:6px">ESTA SEMANA</div>
            <div style="font-size:34px;font-weight:900;color:white;line-height:1">${weekSess.length} <span style="font-size:13px;color:#666">ses.</span></div>
            <div style="font-size:20px;font-weight:800;color:var(--acc);margin-top:6px">${volFmt(weekVol)} kg</div>
          </div>
        </div>
        <div style="background:#1a1a1a;border-radius:4px;height:5px;overflow:hidden">
          <div style="background:var(--acc);height:100%;width:${streak>0?Math.min(85,55+streak*4):0}%;border-radius:4px"></div>
        </div>
      </div>`);

      // ── CTA ENTRENAMIENTO ──
      const _DOW_ES = ['domingo','lunes','martes','miércoles','jueves','viernes','sábado'];
      const _todayDow = new Date().getDay();
      const _todayName = _DOW_ES[_todayDow].toLowerCase();
      const _byDay = (_mrPlan && _mrAthId === user.id ? _mrPlan.byDay : null) || {};
      const _days = Object.keys(_byDay);
      let _todayDay = _days.find(d => d.toLowerCase().includes(_todayName));
      if(!_todayDay && _days.length > 0 && _todayDow !== 0){
        _todayDay = _days[(_todayDow - 1) % _days.length];
      }
      const _todayEx = _todayDay ? (_byDay[_todayDay] || []) : [];

      if(_days.length > 0){
        if(_todayEx.length > 0){
          parts.push(`<div class="hoy-cta">
            <div class="hoy-cta-label">HOY · ${_todayDay.toUpperCase()}</div>
            <button class="btn-primary full-width" onclick="goSection('mi-rutina',document.querySelector('[data-tab=mi-rutina]'))">ENTRENAR →</button>
          </div>`);
        } else {
          let _nextDay = '';
          for(let i = 1; i <= 7; i++){
            const nd = _DOW_ES[(_todayDow + i) % 7].toLowerCase();
            const found = _days.find(d => d.toLowerCase().includes(nd));
            if(found && (_byDay[found]||[]).length > 0){ _nextDay = found; break; }
          }
          parts.push(`<div class="hoy-cta">
            <div class="hoy-cta-label">HOY · DESCANSO</div>
            ${_nextDay ? '<div class="hoy-cta-sub">Tu próximo entreno: '+_nextDay+'</div>' : ''}
          </div>`);
        }
      }
      // Load plan in background if not yet available
      if(!_days.length && window.db && typeof mrLoadPlan === 'function' && !_mrPlan){
        mrLoadPlan(user.id).then(p => {
          if(p){ _mrPlan = p; _mrAthId = user.id; if(currentUser && currentSection === 'mi-perfil') renderAthleteView(currentUser); }
        }).catch(()=>{});
      }
    }

    // ── FEEDBACK DEL COACH ──
    if(coachNote&&coachNote.text){
      parts.push(`
      <div style="background:var(--surf);border:2px solid ${color}44;border-radius:16px;padding:20px">
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px">
          <div style="width:30px;height:30px;border-radius:50%;background:${color};display:flex;align-items:center;justify-content:center;font-size:14px;flex-shrink:0">💬</div>
          <div style="font-size:13px;font-weight:700;color:var(--text)">Feedback del coach${coachNote.date?' <span style="font-weight:400;color:var(--sub);font-size:11px">· '+coachNote.date+'</span>':''}</div>
        </div>
        <div style="font-size:14px;color:var(--sub);line-height:1.7;font-style:italic">"${coachNote.text}"</div>
      </div>`);
    }

    // ── TRACKING DIARIO ──
    const waterOpts=[1,1.5,2,2.5,3];
    const waterIsCustom = todayLog.water != null && !waterOpts.includes(+todayLog.water);
    const waterCustomLabel = waterIsCustom
      ? (Number.isInteger(+todayLog.water) ? todayLog.water+'L' : (+todayLog.water).toString().replace('.',',')+'L')
      : 'Otro';
    const stepsFmt = todayLog.steps ? Number(todayLog.steps).toLocaleString('es-AR') : '';
    parts.push(`
    <div style="background:var(--surf);border:1px solid var(--border);border-radius:16px;padding:20px">
      <div style="font-size:13px;font-weight:700;color:var(--text);margin-bottom:14px">📋 Registro de hoy</div>
      <div style="display:flex;flex-direction:column;gap:14px">
        <div>
          <div style="font-size:11px;font-weight:700;color:var(--sub);letter-spacing:1px;margin-bottom:8px">PESO CORPORAL</div>
          <div style="display:flex;gap:8px;align-items:center">
            <div style="position:relative;flex:1">
              <input id="ath-peso" type="number" step="0.1" inputmode="decimal" placeholder="kg"
                value="${todayLog.weight||''}"
                style="width:100%;padding:11px 36px 11px 14px;border:2px solid var(--border);border-radius:10px;font-size:16px;font-family:inherit;box-sizing:border-box;background:var(--bg);color:var(--text);outline:none"
                onfocus="this.style.borderColor='${color}'" onblur="this.style.borderColor='var(--border)'">
              <span style="position:absolute;right:12px;top:50%;transform:translateY(-50%);font-size:12px;color:var(--sub)">kg</span>
            </div>
            <button onclick="saveDaily('${user.id}','weight',document.getElementById('ath-peso').value)"
              style="background:var(--acc);color:#000;border:none;border-radius:10px;padding:11px 18px;font-weight:900;font-size:13px;cursor:pointer;white-space:nowrap;font-family:inherit">
              Guardar
            </button>
          </div>
          ${todayLog.weight?'<div style="font-size:11px;color:var(--sub);margin-top:5px">Hoy: <b style="color:var(--text)">'+todayLog.weight+' kg</b></div>':''}
        </div>
        <div>
          <div style="font-size:11px;font-weight:700;color:var(--sub);letter-spacing:1px;margin-bottom:8px">AGUA 💧</div>
          <div style="display:flex;gap:6px;flex-wrap:wrap">
            ${waterOpts.map(v=>'<button onclick="saveDaily(\''+user.id+'\',\'water\','+v+')"'
              +' style="flex:1;min-width:48px;padding:9px 4px;border:2px solid '+(todayLog.water==v?color:'var(--border)')+';border-radius:9px;background:'+(todayLog.water==v?color+'15':'var(--surf2)')+';font-size:13px;font-weight:700;color:'+(todayLog.water==v?color:'var(--text)')+';cursor:pointer;font-family:inherit">'+v+'L</button>'
            ).join('')}
            <button onclick="openCustomWaterInput(this,'${user.id}')"
              style="flex:1;min-width:48px;padding:9px 4px;border:2px solid ${waterIsCustom?color:'var(--border)'};border-radius:9px;background:${waterIsCustom?color+'15':'var(--surf2)'};font-size:13px;font-weight:700;color:${waterIsCustom?color:'var(--text)'};cursor:pointer;font-family:inherit">${waterCustomLabel}</button>
          </div>
        </div>
        <div>
          <div style="font-size:11px;font-weight:700;color:var(--sub);letter-spacing:1px;margin-bottom:8px">PASOS 🚶</div>
          <div style="display:flex;gap:8px;align-items:center">
            <div style="position:relative;flex:1">
              <input id="ath-pasos" type="text" inputmode="numeric" placeholder="pasos"
                value="${stepsFmt}"
                oninput="this.value=this.value.replace(/[^0-9]/g,'').replace(/\\B(?=(\\d{3})+(?!\\d))/g,'.')"
                style="width:100%;padding:11px 14px;border:2px solid var(--border);border-radius:10px;font-size:16px;font-family:inherit;box-sizing:border-box;background:var(--bg);color:var(--text);outline:none"
                onfocus="this.style.borderColor='${color}'" onblur="this.style.borderColor='var(--border)'">
            </div>
            <button onclick="saveDaily('${user.id}','steps',document.getElementById('ath-pasos').value.replace(/\\./g,''))"
              style="background:var(--acc);color:#000;border:none;border-radius:10px;padding:11px 18px;font-weight:900;font-size:13px;cursor:pointer;white-space:nowrap;font-family:inherit">
              Guardar
            </button>
          </div>
          ${todayLog.steps?'<div style="font-size:11px;color:var(--sub);margin-top:5px">Hoy: <b style="color:var(--text)">'+Number(todayLog.steps).toLocaleString('es-AR')+' pasos</b></div>':''}
        </div>
      </div>
    </div>`);

    // ── DIETA ──
    if(diet && (diet.kcal||diet.prot||diet.carbs||diet.fat) && !diet.meals) {
      // Simple macros format saved by coach via editDiet modal
      const macros = [
        {label:'Proteína', val:diet.prot||0, unit:'g', color:'#3b82f6'},
        {label:'Carbos',   val:diet.carbs||0,unit:'g', color:'#f59e0b'},
        {label:'Grasas',   val:diet.fat||0,  unit:'g', color:'#ef4444'},
      ];
      parts.push(`
      <div style="background:var(--surf);border:1px solid var(--border);border-radius:16px;padding:20px">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px">
          <div style="font-size:14px;font-weight:800;color:var(--text)">🥗 Mis macros</div>
          <div style="font-size:20px;font-weight:800;color:${color}">${diet.kcal||Math.round((diet.prot||0)*4+(diet.carbs||0)*4+(diet.fat||0)*9)}<span style="font-size:12px;font-weight:500;color:var(--sub);margin-left:3px">kcal</span></div>
        </div>
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px">
          ${macros.map(m=>`
          <div style="background:${m.color}12;border:1px solid ${m.color}25;border-radius:12px;padding:12px;text-align:center">
            <div style="font-size:20px;font-weight:800;color:${m.color}">${m.val}<span style="font-size:12px;font-weight:500">${m.unit}</span></div>
            <div style="font-size:11px;color:var(--sub);margin-top:3px">${m.label}</div>
          </div>`).join('')}
        </div>
      </div>`);
    } else if(diet && (diet.meals||diet.text||diet.plan||typeof diet==='string')) {
      const dietContent = typeof diet==='string' ? diet
        : diet.text||diet.plan
        ? (diet.text||diet.plan)
        : Object.entries(diet).filter(([k])=>k!=='id').map(([k,v])=>'<b>'+k+':</b> '+v).join('<br>');
      parts.push(`
      <div style="background:var(--surf);border:1px solid var(--border);border-radius:16px;padding:20px">
        <div style="font-size:14px;font-weight:800;color:var(--text);margin-bottom:12px">🥗 Mi dieta</div>
        <div style="font-size:13px;color:var(--text2);line-height:1.8">${dietContent}</div>
      </div>`);
    }

    // ── ÚLTIMO ENTRENAMIENTO ──
    if(lastSess){
      const ds=Math.floor((now-new Date(lastSess.date+'T12:00:00'))/86400000);
      const vol=Math.round(calcVol(lastSess));
      const exList=(lastSess.exercises||[]).map(ex=>{
        const top=(ex.sets||[]).reduce((mx,st)=>((parseFloat(st.kg)||0)>(parseFloat(mx.kg)||0)?st:mx),{kg:0,reps:0});
        return '<div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid var(--border)">'
          +'<span style="font-size:13px;color:var(--text)">'+ex.name.split(' ').slice(0,4).join(' ')+'</span>'
          +(top.kg>0?'<span style="font-size:13px;font-weight:700;color:'+color+'">'+top.kg+' kg × '+top.reps+'</span>':'')+'</div>';
      }).join('');
      parts.push(`
      <div style="background:var(--surf);border:1px solid var(--border);border-radius:16px;padding:20px">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:14px">
          <div>
            <div style="font-size:13px;font-weight:700;color:var(--text)">📅 Último entrenamiento</div>
            <div style="font-size:12px;color:var(--sub);margin-top:3px">${ds===0?'Hoy':ds===1?'Ayer':'Hace '+ds+' días'} · ${lastSess.name||'Sesión'}</div>
          </div>
          <div style="text-align:right">
            <div style="font-size:20px;font-weight:800;color:${color}">${volFmt(vol)} kg</div>
            <div style="font-size:11px;color:var(--sub)">${(lastSess.exercises||[]).length} ejercicios</div>
          </div>
        </div>
        ${exList||'<div style="color:var(--sub);font-size:13px">Sin registro de cargas</div>'}
      </div>`);
    }

    // ── MIS RÉCORDS ──
    if(topPRs.length){
      const prRows=topPRs.map(([n,{kg}])=>
        '<div style="display:flex;justify-content:space-between;align-items:center;padding:9px 0;border-bottom:1px solid var(--border)">'
        +'<span style="font-size:13px;color:var(--text)">'+n.split(' ').slice(0,4).join(' ')+'</span>'
        +'<span style="font-size:14px;font-weight:800;color:'+color+'">'+kg+' kg</span></div>'
      ).join('');
      parts.push(`
      <div style="background:var(--surf);border:1px solid var(--border);border-radius:16px;padding:20px">
        <div style="font-size:13px;font-weight:700;color:var(--text);margin-bottom:12px">Mis récords</div>
        ${prRows}
      </div>`);
    }

    // ── PERFIL VACÍO ──
    if(!lastSess && !topPRs.length){
      parts.push(`<div class="sq-empty"><span class="sq-empty-title">Tu perfil está vacío</span><span class="sq-empty-sub">Completá tu primera sesión para que aparezca tu progreso.</span></div>`);
    }

    // ── CONFIGURACIÓN ──
    const curUnit = DB.get('units_'+user.id) || 'kg';
    parts.push(`
    <div style="background:var(--surf);border:1px solid var(--border);border-radius:16px;padding:20px">
      <div style="font-size:13px;font-weight:700;color:var(--text);margin-bottom:12px">⚙️ Configuración</div>
      <div style="display:flex;align-items:center;justify-content:space-between">
        <span style="font-size:13px;color:var(--text)">Unidad de peso</span>
        <div style="display:flex;gap:4px;background:var(--bg);border-radius:8px;padding:3px">
          <button onclick="setAthUnits('${user.id}','kg')" style="padding:5px 14px;border-radius:6px;border:none;font-size:12px;font-weight:700;cursor:pointer;font-family:inherit;
            background:${'kg'===curUnit?'var(--surf2)':'transparent'};color:${'kg'===curUnit?'var(--text)':'var(--sub)'};
            box-shadow:${'kg'===curUnit?'0 1px 3px rgba(0,0,0,.3)':'none'}">KG</button>
          <button onclick="setAthUnits('${user.id}','lbs')" style="padding:5px 14px;border-radius:6px;border:none;font-size:12px;font-weight:700;cursor:pointer;font-family:inherit;
            background:${'lbs'===curUnit?'var(--surf2)':'transparent'};color:${'lbs'===curUnit?'var(--text)':'var(--sub)'};
            box-shadow:${'lbs'===curUnit?'0 1px 3px rgba(0,0,0,.3)':'none'}">LBS</button>
        </div>
      </div>
    </div>`);

    parts.push('</div>');
    cont.innerHTML='<style>@keyframes sq-spin{to{transform:rotate(360deg)}}</style>'+parts.join('');
    // startLiveSessionPoller(user.id); // deshabilitado — usa REST sin auth, no necesario para atletas
  } catch(err){
    console.error('[renderAthleteView]',err);
    const c2=document.getElementById('mi-perfil-content');
    if(c2) c2.innerHTML='<div style="padding:32px;text-align:center;color:#ef4444;font-size:13px">Error: '+err.message+'</div>';
  }
}

// ── ATHLETE UNITS SETTING ──
function setAthUnits(athId, units){
  DB.set('units_'+athId, units);
  if(window.db) swallow(window.db.collection('athletes').doc(athId).set({units},{merge:true}), 'app:saveUnits');
  if(currentUser&&currentUser.id===athId) renderAthleteView(currentUser);
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

// Reemplaza el botón "Otro" por un input inline para litros custom.
function openCustomWaterInput(btn, athId){
  const input = document.createElement('input');
  input.type = 'number';
  input.step = '0.1';
  input.min = '0';
  input.inputMode = 'decimal';
  input.placeholder = 'L';
  const acc = getComputedStyle(document.documentElement).getPropertyValue('--acc').trim() || '#d9ff00';
  input.style.cssText = 'flex:1;min-width:64px;padding:9px 6px;border:2px solid '+acc+';border-radius:9px;background:var(--bg);color:var(--text);font-size:13px;font-weight:700;outline:none;font-family:inherit;text-align:center;';

  let committed = false;
  const commit = () => {
    if(committed) return;
    committed = true;
    const raw = input.value.trim();
    if(!raw){
      if(currentUser && currentUser.id===athId) renderAthleteView(currentUser);
      return;
    }
    const v = parseFloat(String(raw).replace(',','.'));
    if(!isNaN(v) && v > 0){
      saveDaily(athId, 'water', v);
    } else {
      toast('Valor inválido');
      if(currentUser && currentUser.id===athId) renderAthleteView(currentUser);
    }
  };

  input.addEventListener('keydown', e => {
    if(e.key === 'Enter'){ e.preventDefault(); input.blur(); }
    if(e.key === 'Escape'){
      committed = true;
      if(currentUser && currentUser.id===athId) renderAthleteView(currentUser);
    }
  });
  input.addEventListener('blur', commit);

  btn.replaceWith(input);
  input.focus();
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
    cont.innerHTML = `<div style="max-width:600px;margin:0 auto;padding:16px">
      <div style="font-size:18px;font-weight:800;color:var(--text);margin-bottom:4px">Mi Historial</div>
      <div style="font-size:13px;color:var(--sub);margin-bottom:16px">0 sesiones registradas</div>
      <div id="mm-host"></div>
      <div class="sq-empty"><span class="sq-empty-title">Sin sesiones todavía</span><span class="sq-empty-sub">Registrá tu primer entrenamiento para verlo acá.</span></div>
    </div>`;
    const hostEmpty = cont.querySelector('#mm-host');
    if(hostEmpty && window.MuscleMap) MuscleMap.mount(hostEmpty, []);
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

    <div id="mm-host"></div>

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

  const mmHost = cont.querySelector('#mm-host');
  if(mmHost && window.MuscleMap) MuscleMap.mount(mmHost, ss);

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
  ctx.fillText('SQUAD TEAM',80,100);
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
  ctx.fillText('PERSONAL RECORDS',80,920);
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

// ── MODO ENTRENAR ALUMNO ──
// El coach asume la identidad del alumno para cargar sets desde su panel.
// Se usa para entrenamientos presenciales: la sesión queda guardada en el
// alumno correcto (PRs, perfil muscular, gráficos), y se taggea con
// ── MODO ENTRENAR — stack multi-alumno ───────────────────────
// miRutina.js y otros módulos leen _coachOriginalProfile para
// detectar que el coach está en modo entrenar y taggear la sesión.
let _previewCoachProfile = null;
let _trainingStack = []; // [{athId, name, color, profile}]
window._prevAthMap = {};

Object.defineProperty(window, '_coachOriginalProfile', {
  get(){ return _previewCoachProfile; }
});

function openPreviewPicker() {
  const ath = Array.isArray(athletes) ? athletes.filter(a => !a.inactive) : [];
  window._prevAthMap = {};
  ath.forEach(a => { window._prevAthMap[a.id] = a; });
  let ov = document.getElementById('preview-picker-ov');
  if (!ov) { ov = document.createElement('div'); ov.id = 'preview-picker-ov'; document.body.appendChild(ov); }
  ov.onclick = e => { if (e.target === ov) ov.remove(); };
  ov.style.cssText = 'position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,.65);backdrop-filter:blur(6px);display:flex;align-items:center;justify-content:center;padding:20px';
  ov.innerHTML = `
    <div style="background:var(--surf);border:1px solid var(--border2);border-radius:18px;width:100%;max-width:360px;overflow:hidden">
      <div style="padding:20px 22px 14px;border-bottom:1px solid var(--border)">
        <div style="font-size:15px;font-weight:800;color:var(--text)">Entrenar alumno</div>
        <div style="font-size:12px;color:var(--sub);margin-top:4px">Elegí un alumno para cargar su sesión</div>
      </div>
      <div style="padding:10px;max-height:60vh;overflow-y:auto">
        ${ath.map(a => {
          const color = a.color || athColor(a.id);
          const inStack = _trainingStack.some(x => x.athId === a.id);
          return `<button onclick="enterTrainingMode('${a.id}');document.getElementById('preview-picker-ov')?.remove()"
            style="width:100%;display:flex;align-items:center;gap:12px;padding:11px 12px;border-radius:12px;border:none;background:${inStack?'var(--surf2)':'none'};cursor:pointer;text-align:left;font-family:inherit;-webkit-tap-highlight-color:transparent"
            onmouseover="this.style.background='var(--surf2)'" onmouseout="this.style.background='${inStack?'var(--surf2)':'none'}'">
            <div style="width:36px;height:36px;border-radius:10px;background:${color}22;color:${color};font-size:14px;font-weight:800;display:flex;align-items:center;justify-content:center;flex-shrink:0">${(a.name||'?')[0].toUpperCase()}</div>
            <div style="flex:1;font-size:14px;font-weight:600;color:var(--text)">${a.name}</div>
            ${inStack ? `<div style="font-size:10px;color:${color};font-weight:700">abierto</div>` : ''}
          </button>`;
        }).join('')}
        ${!ath.length ? '<div style="padding:20px;text-align:center;color:var(--sub);font-size:13px">No hay atletas cargados</div>' : ''}
      </div>
    </div>`;
}

function enterTrainingMode(athId) {
  const a = window._prevAthMap[athId] || (Array.isArray(athletes) ? athletes.find(x => x.id === athId) : null);
  if (!a) return;

  // Guardar coach la primera vez
  if (!_previewCoachProfile) _previewCoachProfile = currentUser;

  // Agregar al stack si no está
  if (!_trainingStack.find(x => x.athId === athId)) {
    const profile = { id: a.id, name: a.name, role: 'athlete', color: a.color || athColor(a.id) };
    _trainingStack.push({ athId, name: a.name, color: a.color || athColor(a.id), profile });
  }
  switchTrainingAth(athId);
}
window.enterPreviewMode = enterTrainingMode;

function switchTrainingAth(athId) {
  const item = _trainingStack.find(x => x.athId === athId);
  if (!item) return;
  currentUser = item.profile;
  showAthleteUI(item.profile);
  ['foot-av','top-av'].forEach(id => {
    const el = document.getElementById(id);
    if (el) { el.textContent = athInitial(item.name); el.style.background = item.color + '20'; el.style.color = item.color; }
  });
  const fn = document.getElementById('foot-name'); if (fn) fn.textContent = item.name;
  const fr = document.getElementById('foot-role'); if (fr) fr.textContent = 'Entrenando · Coach';
  const tit = document.getElementById('tb-title'); if (tit) tit.textContent = item.name.toUpperCase();
  const sub = document.getElementById('logo-sub'); if (sub) sub.textContent = 'Modo Entrenar';
  _renderTrainingBanner();
  toast('Entrenando con ' + item.name);
}

function closeTrainingAth(athId) {
  const idx = _trainingStack.findIndex(x => x.athId === athId);
  if (idx === -1) return;
  const isActive = currentUser?.id === athId;
  if (isActive && _hasUnsavedTrainingDraft(athId)) {
    const ok = confirm('Tenés sets sin guardar de ' + _trainingStack[idx].name + '.\n\n¿Cerrar igual?');
    if (!ok) return;
  }
  _trainingStack.splice(idx, 1);
  if (_trainingStack.length === 0) { exitTrainingMode(); return; }
  if (isActive) switchTrainingAth(_trainingStack[Math.max(0, idx - 1)].athId);
  else _renderTrainingBanner();
}

function _renderTrainingBanner() {
  const banner = document.getElementById('preview-banner');
  if (!banner) return;
  banner.style.display = 'flex';
  const chipsEl = document.getElementById('training-chips');
  if (!chipsEl) return;
  const activeId = currentUser?.id;
  chipsEl.innerHTML = _trainingStack.map(item =>
    `<button class="tr-chip${item.athId === activeId ? ' active' : ''}" onclick="switchTrainingAth('${item.athId}')">
      <span class="tr-chip-dot" style="background:${item.color}"></span>
      <span>${item.name.split(' ')[0]}</span>
      <span class="tr-chip-x" onclick="closeTrainingAth('${item.athId}');event.stopPropagation()">×</span>
    </button>`
  ).join('');
}

function enterSelfAthleteMode() {
  const coach = currentUser;
  const profile = { id: coach.id, name: coach.name, role: 'athlete', color: coach.color || athColor(coach.id) };
  _previewCoachProfile = coach;
  _trainingStack = [{ athId: coach.id, name: coach.name, color: profile.color, profile }];
  currentUser = profile;
  showAthleteUI(profile);
  ['foot-av','top-av'].forEach(id => {
    const el = document.getElementById(id);
    if (el) { el.textContent = athInitial(profile.name); el.style.background = profile.color + '20'; el.style.color = profile.color; }
  });
  const fn = document.getElementById('foot-name'); if (fn) fn.textContent = profile.name;
  const fr = document.getElementById('foot-role'); if (fr) fr.textContent = 'Coach · Alumno';
  const tit = document.getElementById('tb-title'); if (tit) tit.textContent = profile.name.toUpperCase();
  const sub = document.getElementById('logo-sub'); if (sub) sub.textContent = 'Mi Entreno';
  _renderTrainingBanner();
  toast('Modo entrenamiento');
}

function _hasUnsavedTrainingDraft(athId){
  if(!athId) return false;
  const todayKey = new Date().toISOString().slice(0,10);
  for(let i = 0; i < localStorage.length; i++){
    const key = localStorage.key(i) || '';
    if(key.startsWith('mr_draft_'+athId+'_'+todayKey+'_')){
      try {
        const raw = localStorage.getItem(key);
        if(!raw) continue;
        const draft = JSON.parse(raw);
        if(draft && typeof draft === 'object'){
          for(const exName in draft){
            const sets = draft[exName] || {};
            for(const k in sets){ const v = sets[k] || {}; if(v.kg || v.reps) return true; }
          }
        }
      } catch(_){}
    }
  }
  return false;
}

function exitTrainingMode() {
  if (!_previewCoachProfile) return;
  const athId = currentUser?.id;
  if(_hasUnsavedTrainingDraft(athId)){
    const ok = confirm('Tenés sets sin guardar en ' + (currentUser?.name || 'este alumno') + '.\n\n¿Salir igual?');
    if(!ok) return;
  }
  _trainingStack = [];
  currentUser = _previewCoachProfile;
  _previewCoachProfile = null;
  const banner = document.getElementById('preview-banner');
  if (banner) banner.style.display = 'none';
  showCoachUI();
  const u = currentUser;
  ['foot-av','top-av'].forEach(id => {
    const el = document.getElementById(id);
    if (el) { el.textContent = athInitial(u.name); el.style.background = (u.color || athColor(u.id)) + '20'; el.style.color = u.color || athColor(u.id); }
  });
  const fn = document.getElementById('foot-name'); if (fn) fn.textContent = u.name;
  const fr = document.getElementById('foot-role'); if (fr) fr.textContent = window.isOwner ? 'Admin' : 'Entrenador';
  const tit = document.getElementById('tb-title'); if (tit) tit.textContent = 'SQUAD TEAM';
  const sub = document.getElementById('logo-sub'); if (sub) sub.textContent = 'Coach OS';
  goSection('dashboard', null);
  toast('De vuelta al panel');
}
window.exitPreviewMode = exitTrainingMode;

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
