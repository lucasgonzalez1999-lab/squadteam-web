// ═══════════════════════════════════════════
// SQUAD TEAM — Storage Layer
// Firebase primary, localStorage fallback
// ═══════════════════════════════════════════

// ── LOCAL CACHE ──
const _mem = {};
const DB = {
  get(k){
    if(_mem[k]!==undefined) return JSON.parse(JSON.stringify(_mem[k]));
    try{ const v=localStorage.getItem('sq_'+k); if(v){ _mem[k]=JSON.parse(v); return JSON.parse(JSON.stringify(_mem[k])); } }catch(e){}
    return null;
  },
  set(k,v){ _mem[k]=JSON.parse(JSON.stringify(v)); try{ localStorage.setItem('sq_'+k,JSON.stringify(v)); }catch(e){} },
  del(k){ delete _mem[k]; try{ localStorage.removeItem('sq_'+k); }catch(e){} },
};

// ── FIREBASE HELPERS (safe) ──
async function fbSet(col,id,data){
  if(!window.db) return false;
  try{ await window.db.collection(col).doc(id).set(data); return true; }catch(e){ console.warn('fbSet',e); return false; }
}
async function fbGet(col,id){
  if(!window.db) return null;
  try{ const d=await window.db.collection(col).doc(id).get(); return d.exists?d.data():null; }catch(e){ return null; }
}
async function fbGetAll(col){
  if(!window.db) return [];
  try{ const s=await window.db.collection(col).get(); return s.docs.map(d=>({id:d.id,...d.data()})); }catch(e){ return []; }
}

// ── SYNC STATUS ──
function syncStatus(msg,type='info'){
  const el=document.getElementById('sync-status');
  if(!el) return;
  el.textContent=msg;
  el.style.color={ok:'var(--green)',err:'var(--red)',info:'#4fc3f7',warn:'#ff9a3c'}[type]||'var(--sub)';
  if(type==='ok') setTimeout(()=>{ if(el.textContent===msg) el.textContent=''; },3000);
}

// ── SAFE PARSERS ──
// Garantiza que Firebase siempre devuelva arrays, nunca strings
function _parseList(val){
  if(!val) return null;
  if(Array.isArray(val)) return val.length ? val : null;
  if(typeof val === 'string'){ try{ const p=JSON.parse(val); return Array.isArray(p)?p:null; }catch(e){ return null; } }
  if(val.list) return _parseList(val.list);
  return null;
}
function _parseArrField(val){
  if(!val) return null;
  if(Array.isArray(val)) return val;
  if(typeof val === 'string'){ try{ const p=JSON.parse(val); return Array.isArray(p)?p:[]; }catch(e){ return []; } }
  if(val.data) return _parseArrField(val.data);
  return null;
}


// ── LOAD ──
function load(){
  athletes = _parseList(DB.get('athletes')) || DEFAULT_ATHLETES;
  templates = DB.get('templates') || DEFAULT_TEMPLATES;
  sessions  = DB.get('sessions')  || {};

  // Ensure sessions values are always arrays
  for(const key of Object.keys(sessions)){
    if(!Array.isArray(sessions[key])){
      // Could be {data: "JSON string"} format from Firebase script
      if(sessions[key]?.data){
        try{ sessions[key] = JSON.parse(sessions[key].data); }catch(e){ sessions[key]=[]; }
      } else {
        sessions[key] = [];
      }
    }
  }

  // Backfill features/color from defaults if missing
  athletes = athletes.map(a=>{
    const def = DEFAULT_ATHLETES.find(d=>d.id===a.id);
    if(!def) return a;
    return { ...a, color: a.color||def.color, features: a.features||def.features };
  });

  // Inject default sessions if missing
  if(!sessions.joaquin?.length){ sessions.joaquin=DEFAULT_SESSIONS_JOAQUIN; DB.set('sessions',sessions); }
  if(!sessions.juan?.length)   { sessions.juan=DEFAULT_SESSIONS_JUAN;       DB.set('sessions',sessions); }

  // Inject Adrian and Joaquin plans if available and missing
  if(typeof DEFAULT_SESSIONS_ADRIAN!=='undefined'&&!sessions.adrian?.length){ sessions.adrian=DEFAULT_SESSIONS_ADRIAN; DB.set('sessions',sessions); }

  // Inject Juan templates if missing
  if(!templates.find(t=>t.id==='tj1s')) templates=[...templates,...DEFAULT_TEMPLATES.filter(t=>t.id.startsWith('tj')),...[DEFAULT_TEMPLATES.find(t=>t.id==='tj1s')].filter(Boolean)];
}

// ── SAVE (local + firebase) ──
function save(){
  DB.set('athletes',athletes);
  DB.set('templates',templates);
  DB.set('sessions',sessions);
  pushToFirebase();
}

// ── PULL FROM FIREBASE (on init) ──
async function pullFromFirebase(){
  if(!window.db){ syncStatus('Offline — datos locales','warn'); return false; }
  try{
    syncStatus('Sincronizando...','info');
    const athData=await fbGet('config','athletes');
    const _a=_parseList(athData?.list||athData); if(_a) athletes=_a;
    const tplData=await fbGet('config','templates');
    const _t=_parseList(tplData?.list||tplData); if(_t) templates=_t;
    for(const a of athletes){
      const s=await fbGet('sessions',a.id);
      const remote=_parseArrField(s?.data||s);
      if(remote){
        const local=sessions[a.id]||[];
        if(!local.length){ sessions[a.id]=remote; }
        else{
          // Merge: start with remote, add local sessions missing from remote
          const merged=[...remote];
          for(const ls of local){
            const lkey=ls.id||(ls.date+'_'+(ls.dia||ls.name||''));
            const exists=remote.some(rs=>{
              const rkey=rs.id||(rs.date+'_'+(rs.dia||rs.name||''));
              return rkey===lkey;
            });
            if(!exists) merged.push(ls);
          }
          sessions[a.id]=merged.sort((x,y)=>(y.date||'').localeCompare(x.date||''));
          // Re-push to Firestore if local had unsaved sessions
          if(merged.length>remote.length){
            fbSet('sessions',a.id,{data:JSON.stringify(sessions[a.id])}).catch(()=>{});
          }
        }
      }
      const diet=await fbGet('diets',a.id);
      if(diet) DB.set('diet_'+a.id,diet);
      const notes=await fbGet('notes',a.id);
      if(notes?.text) DB.set('notes_'+a.id,notes.text);
    }
    // Also sync coach sessions (coaches are not in athletes array)
    if(typeof COACHES!=='undefined'){
      for(const cid of Object.keys(COACHES)){
        const cs=await fbGet('sessions',cid);
        const cr=_parseArrField(cs?.data||cs);
        if(cr){
          const cl=sessions[cid]||[];
          if(!cl.length){ sessions[cid]=cr; }
          else{
            const cm=[...cr];
            for(const ls of cl){
              const lk=ls.id||(ls.date+'_'+(ls.dia||ls.name||''));
              if(!cr.some(rs=>(rs.id||(rs.date+'_'+(rs.dia||rs.name||'')))=== lk)) cm.push(ls);
            }
            sessions[cid]=cm.sort((x,y)=>(y.date||'').localeCompare(x.date||''));
            if(cm.length>cr.length) fbSet('sessions',cid,{data:JSON.stringify(sessions[cid])}).catch(()=>{});
          }
        }
      }
    }
    DB.set('athletes',athletes);
    DB.set('templates',templates);
    DB.set('sessions',sessions);
    // Auto-push local athletes que no estan en Firebase
    if(!athData?.list?.length && athletes.length > 0){
      await fbSet('config','athletes',{list:JSON.stringify(athletes)});
    }
    syncStatus('✓ Sincronizado','ok');
    return true;
  }catch(e){
    syncStatus('Error: '+e.message,'err');
    return false;
  }
}

// ── ACTIVE SESSION LISTENER ──
// Polls Firebase every 5 seconds when athlete is logged in
let _livePoller = null;

function startLiveSessionPoller(athId){
  if(_livePoller) clearInterval(_livePoller);
  _livePoller = setInterval(async()=>{
    try{
      const snap = await window.db.collection('activeSessions').doc(athId).get();
      if(!snap.exists||snap.data()?.status!=='active'){
        if(window._liveSession){ window._liveSession=null; renderAthHoy(athId); }
        return;
      }
      const d = snap.data();
      const prev = window._liveSession;
      window._liveSession = {
        status: 'active',
        dia:    d.dia||'',
        exerciseIndex: parseInt(d.exerciseIndex||0),
        exerciseName:  d.exerciseName||'',
        plan:   typeof d.plan==='string' ? JSON.parse(d.plan||'[]') : (d.plan||[]),
        sets:   typeof d.sets==='string' ? JSON.parse(d.sets||'[]') : (d.sets||[]),
        startTime: parseInt(d.startTime||0)
      };
      const changed = !prev||prev.exerciseIndex!==window._liveSession.exerciseIndex||prev.sets?.length!==window._liveSession.sets?.length;
      if(changed) renderAthHoy(athId);
    }catch(e){}
  }, 5000);
}

function stopLiveSessionPoller(){
  if(_livePoller){ clearInterval(_livePoller); _livePoller=null; }
  window._liveSession = null;
}
