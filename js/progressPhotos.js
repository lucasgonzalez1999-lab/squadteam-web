'use strict';
// ── SQUAD TEAM — Progreso Físico (fotos ancladas al check-in) v2 ──
// Modelo:
//   physiqueSettings/{athId}   doc { interval, lastPhotoCheckinId, updatedBy, updatedAt }
//   physiquePhotos/{athId}     doc { data: JSON.stringify([
//     { sessionId, date, source:'checkin'|'adhoc',
//       photos: { [poseId]: { url, publicId, w, h } },
//       createdAt }
//   ]) }

// ── 4 POSES (grid 2×2) ─────────────────────────────────────────────────────
const PP_POSES = [
  { id:'frente_relax', label:'Frente',     icon:'🧍' },
  { id:'perfil_izq',   label:'Perfil izq.',icon:'🚶‍♂️' },
  { id:'perfil_der',   label:'Perfil der.',icon:'🚶' },
  { id:'espalda_relax',label:'Espalda',    icon:'🔙' },
];
const PP_POSE_BY_ID = Object.fromEntries(PP_POSES.map(p=>[p.id,p]));

// ── FIRESTORE DATA LAYER ───────────────────────────────────────────────────
async function ppGetSettings(athId){
  try{
    const doc = await window.db.collection('physiqueSettings').doc(athId).get();
    if(!doc.exists) return { interval:4, lastPhotoCheckinId:null };
    const d = doc.data() || {};
    return {
      interval: parseInt(d.interval)||4,
      lastPhotoCheckinId: d.lastPhotoCheckinId || null,
      updatedBy: d.updatedBy || null,
      updatedAt: d.updatedAt || null,
    };
  }catch(e){ return { interval:4, lastPhotoCheckinId:null }; }
}

async function ppSaveSettings(athId, settings){
  await window.db.collection('physiqueSettings').doc(athId).set({
    interval: settings.interval || 4,
    lastPhotoCheckinId: settings.lastPhotoCheckinId || null,
    updatedBy: settings.updatedBy || 'coach',
    updatedAt: new Date().toISOString(),
  }, { merge:true });
}

async function ppLoadSessions(athId){
  try{
    const doc = await window.db.collection('physiquePhotos').doc(athId).get();
    if(!doc.exists) return [];
    const raw = doc.data()?.data;
    return raw ? JSON.parse(raw) : [];
  }catch(e){ return []; }
}

async function ppSaveSessions(athId, sessions){
  await window.db.collection('physiquePhotos').doc(athId).set({ data: JSON.stringify(sessions) });
}

// ── ISO WEEK HELPERS ───────────────────────────────────────────────────────
function ppIsoWeek(d){
  const date = new Date(d);
  date.setHours(0,0,0,0);
  date.setDate(date.getDate()+3-(date.getDay()+6)%7);
  const week1 = new Date(date.getFullYear(),0,4);
  return 1+Math.round(((date-week1)/86400000-3+(week1.getDay()+6)%7)/7);
}

// Build ckId for any date — must match the format from checkin.js (ck_YYYY_W##)
function ppCheckinIdFor(date){
  const d = new Date(date);
  const w = ppIsoWeek(d);
  // Determine ISO year (week 1 of next year may start in Dec of current year)
  const tmp = new Date(d);
  tmp.setDate(tmp.getDate()+3-(tmp.getDay()+6)%7);
  const isoYear = tmp.getFullYear();
  return `ck_${isoYear}_W${String(w).padStart(2,'0')}`;
}

// Parse ckId → {year, week}
function ppParseCheckinId(ckId){
  const m = /^ck_(\d{4})_W(\d{1,2})$/.exec(ckId||'');
  if(!m) return null;
  return { year: parseInt(m[1]), week: parseInt(m[2]) };
}

// Diff in weeks between two ckIds (b - a). Returns null if either invalid.
function ppWeeksBetweenCheckins(idA, idB){
  const a = ppParseCheckinId(idA), b = ppParseCheckinId(idB);
  if(!a || !b) return null;
  // Approximate: 52 weeks per year. Good enough for our use case.
  return (b.year - a.year) * 52 + (b.week - a.week);
}

function ppDateOfSunday(date){
  // Returns the Sunday >= date as YYYY-MM-DD
  const d = new Date(date);
  const dow = d.getDay(); // 0=Sun
  const add = dow === 0 ? 0 : (7 - dow);
  d.setDate(d.getDate() + add);
  return d.toISOString().split('T')[0];
}

function ppDaysUntilNextSunday(date){
  const d = new Date(date);
  const dow = d.getDay();
  return dow === 0 ? 0 : (7 - dow);
}

function ppDaysBetween(dateA, dateB){
  const a = new Date(dateA+'T12:00:00'), b = new Date(dateB+'T12:00:00');
  return Math.round((b-a)/86400000);
}

function ppFmtDate(dateStr){
  if(!dateStr) return '';
  const d = new Date(dateStr+'T12:00:00');
  return d.toLocaleDateString('es-UY',{day:'numeric',month:'short'}).replace('.','');
}

// ── CORE DECISION ──────────────────────────────────────────────────────────
function checkinRequiresPhotos(checkinId, settings){
  if(!settings || !settings.lastPhotoCheckinId) return true;
  const weeks = ppWeeksBetweenCheckins(settings.lastPhotoCheckinId, checkinId);
  if(weeks === null) return true;
  return weeks >= (settings.interval || 4);
}

// Cuántos check-ins de fotos se saltó el alumno
function ppCountSkippedCheckins(settings, sessions, today){
  if(!settings?.lastPhotoCheckinId) return 0;
  const lastId = settings.lastPhotoCheckinId;
  const nowCk = ppCheckinIdFor(today);
  const weeksSince = ppWeeksBetweenCheckins(lastId, nowCk);
  if(weeksSince === null) return 0;
  const expected = Math.floor(weeksSince / (settings.interval||4));
  // Count actual checkin sessions after lastId
  const after = (sessions||[]).filter(s=>s.source==='checkin' && s.sessionId && s.sessionId>lastId).length;
  return Math.max(0, expected - after);
}

// ── PHOTO GRID — REUSABLE COMPONENT ────────────────────────────────────────
// Renders the 2×2 photo grid into `container` for athId+sessionId.
// source: 'checkin' | 'adhoc'
// onChange(photosByPose) callback — called after each successful upload/delete.
// session = current session record (null if new). Returns API to query state.
async function ppRenderPhotoGrid({ container, athId, sessionId, source, dateLabel, onChange }){
  if(!container) return null;
  const sessions = await ppLoadSessions(athId);
  let session = sessions.find(s=>s.sessionId===sessionId) ||
    { sessionId, date: source==='adhoc' ? sessionId : ppDateOfSunday(new Date().toISOString().split('T')[0]),
      source, photos:{}, createdAt:new Date().toISOString() };

  function count(){ return Object.keys(session.photos||{}).length; }

  function render(){
    container.innerHTML = `
    <div class="pp-grid">
      ${PP_POSES.map(pose=>{
        const p = session.photos?.[pose.id];
        const slotId = `pp-slot-${sessionId}-${pose.id}`;
        if(p){
          return `<div class="pp-slot pp-slot-filled" onclick="ppLightbox('${p.url}','${pose.label}${dateLabel?' · '+dateLabel:''}')">
            <img src="${p.url.replace('/upload/','/upload/c_fill,w_300,h_400,q_auto,f_auto/')}" loading="lazy">
            <div class="pp-slot-label">${pose.label}</div>
            <button class="pp-slot-x" onclick="event.stopPropagation();ppSlotDelete_('${sessionId}','${pose.id}')">×</button>
          </div>`;
        }
        return `<label for="${slotId}" class="pp-slot pp-slot-empty"
          ondragover="event.preventDefault();this.classList.add('drag')"
          ondragleave="this.classList.remove('drag')"
          ondrop="event.preventDefault();this.classList.remove('drag');ppSlotUpload_('${sessionId}','${pose.id}',event.dataTransfer.files,this)">
          <div class="pp-slot-icon">${pose.icon}</div>
          <div class="pp-slot-label">${pose.label}</div>
          <div class="pp-slot-hint">Soltá o tocá</div>
          <input id="${slotId}" type="file" accept="image/*" style="display:none"
            onchange="ppSlotUpload_('${sessionId}','${pose.id}',this.files,this.parentElement)">
        </label>`;
      }).join('')}
    </div>`;
  }

  // Stash the session in a registry so static handlers can find it
  ppGridRegistry[sessionId] = {
    session, athId, sessionId, source, render, onChange,
    container, dateLabel
  };
  render();

  return {
    getCount: count,
    getSession: ()=>session,
    rerender: render,
  };
}

const ppGridRegistry = {};

async function ppSlotUpload_(sessionId, poseId, fileList, slotEl){
  const reg = ppGridRegistry[sessionId];
  if(!reg) return;
  const file = fileList?.[0];
  if(!file) return;

  if(slotEl){
    slotEl.classList.add('pp-slot-loading');
    slotEl.innerHTML = `<div class="pp-slot-icon">⏳</div><div class="pp-slot-hint">Subiendo...</div>`;
  }
  try{
    const up = await ppUpload(file, reg.athId, reg.session.date || sessionId, poseId);
    if(!reg.session.photos) reg.session.photos = {};
    reg.session.photos[poseId] = { url:up.url, publicId:up.publicId, w:up.w, h:up.h };
    await ppPersistSession(reg.athId, reg.session);
    if(reg.onChange) reg.onChange(reg.session.photos);
    reg.render();
  }catch(e){
    if(typeof toast==='function') toast(e.message || 'Error al subir');
    reg.render();
  }
}

async function ppSlotDelete_(sessionId, poseId){
  const reg = ppGridRegistry[sessionId];
  if(!reg) return;
  sqConfirm({
    title:'¿Borrar esta foto?',
    body:'Esta acción no se puede deshacer.',
    confirmLabel:'Borrar', danger:true,
    onConfirm: async ()=>{
      if(reg.session.photos) delete reg.session.photos[poseId];
      await ppPersistSession(reg.athId, reg.session);
      if(reg.onChange) reg.onChange(reg.session.photos);
      if(typeof toast==='function') toast('Foto eliminada');
      reg.render();
    }
  });
}

async function ppPersistSession(athId, session){
  const sessions = await ppLoadSessions(athId);
  const idx = sessions.findIndex(s=>s.sessionId===session.sessionId);
  if(idx>=0) sessions[idx] = session;
  else sessions.push(session);
  await ppSaveSessions(athId, sessions);
}

// ── CLOUDINARY UPLOAD ──────────────────────────────────────────────────────
async function ppCompress(file, maxDim=1600, quality=0.82){
  return new Promise((resolve, reject)=>{
    const img = new Image();
    img.onload = ()=>{
      const ratio = Math.min(maxDim/img.width, maxDim/img.height, 1);
      const w = Math.round(img.width*ratio), h = Math.round(img.height*ratio);
      const canvas = document.createElement('canvas');
      canvas.width = w; canvas.height = h;
      canvas.getContext('2d').drawImage(img, 0, 0, w, h);
      canvas.toBlob(b=> b ? resolve({ blob:b, w, h }) : reject(new Error('compress')), 'image/jpeg', quality);
    };
    img.onerror = ()=>reject(new Error('img load'));
    img.src = URL.createObjectURL(file);
  });
}

async function ppUpload(file, athId, date, poseId){
  const cloud  = window.CLOUDINARY_CLOUD;
  const preset = window.CLOUDINARY_PRESET;
  if(!cloud || !preset) throw new Error('Cloudinary no configurado');
  const { blob, w, h } = await ppCompress(file);
  const fd = new FormData();
  fd.append('file', blob);
  fd.append('upload_preset', preset);
  fd.append('folder', `physique/${athId}`);
  fd.append('public_id', `${date}_${poseId}_${Date.now()}`);
  const res = await fetch(`https://api.cloudinary.com/v1_1/${cloud}/image/upload`, { method:'POST', body:fd });
  const data = await res.json();
  if(!res.ok || !data.secure_url) throw new Error(data.error?.message || 'Upload falló');
  return { url:data.secure_url, publicId:data.public_id, w, h };
}

// ── LIGHTBOX ───────────────────────────────────────────────────────────────
function ppLightbox(url, caption){
  let ov = document.getElementById('pp-lb-ov');
  if(!ov){ ov=document.createElement('div'); ov.id='pp-lb-ov'; document.body.appendChild(ov); }
  ov.style.cssText='position:fixed;inset:0;z-index:9500;background:rgba(0,0,0,.92);display:flex;align-items:center;justify-content:center;padding:20px;flex-direction:column;gap:14px';
  ov.onclick = ()=> ov.remove();
  ov.innerHTML = `
    <img src="${url}" style="max-width:100%;max-height:80vh;object-fit:contain;border-radius:8px">
    <div style="color:#fff;font-size:13px;font-weight:600">${caption||''}</div>
    <div style="color:#888;font-size:11px">Tap para cerrar</div>`;
}

// ── FÍSICO SECTION — READ-ONLY VIEW + EMPTY STATE + AD-HOC SHEET ──────────
let _ppCurAth = null;
let _ppCurSessions = [];
let _ppCurSettings = null;

function renderFisico(){
  if(!Array.isArray(athletes)||!athletes.length) athletes = typeof DEFAULT_ATHLETES!=='undefined'?DEFAULT_ATHLETES:[];
  const cont = document.getElementById('fisico-content');
  if(!cont) return;

  const isAth = (typeof currentUser!=='undefined' && currentUser && currentUser.role==='athlete');
  if(isAth){
    cont.innerHTML = `<div class="pp-wrap"><div id="pp-area"></div></div>`;
    ppSelectAth(currentUser.id);
    return;
  }
  const active = athletes.filter(a=>!a.inactive);
  cont.innerHTML = `
  <div class="pp-wrap">
    <div class="pp-ath-tabs" id="pp-tabs">
      ${active.map(a=>`
        <button onclick="ppSelectAth('${a.id}')" id="pp-tab-${a.id}" class="pp-ath-tab">
          <div class="pp-ath-av" style="background:${athColor(a.id)}">${athInitial(a.name)}</div>
          ${a.name}
        </button>`).join('')}
    </div>
    <div id="pp-area"></div>
  </div>`;
  if(active.length) ppSelectAth(active[0].id);
}

async function ppSelectAth(athId){
  _ppCurAth = athId;
  document.querySelectorAll('.pp-ath-tab').forEach(t=>t.classList.remove('on'));
  document.getElementById('pp-tab-'+athId)?.classList.add('on');
  const area = document.getElementById('pp-area');
  if(!area) return;
  area.innerHTML = '<div class="pp-loading">Cargando fotos...</div>';
  [_ppCurSessions, _ppCurSettings] = await Promise.all([
    ppLoadSessions(athId),
    ppGetSettings(athId),
  ]);
  ppRenderFisicoArea();
}

function ppGetSubtitle(){
  const sessions = _ppCurSessions || [];
  const settings = _ppCurSettings || { interval:4, lastPhotoCheckinId:null };
  if(!sessions.length) return null;
  const today = new Date().toISOString().split('T')[0];
  const nextSunday = ppDateOfSunday(today);
  const nextCkId = ppCheckinIdFor(nextSunday);
  const requiresNext = checkinRequiresPhotos(nextCkId, settings);
  const daysToSunday = ppDaysUntilNextSunday(today);

  if(requiresNext){
    return { text:`Próximas fotos: domingo ${ppFmtDate(nextSunday)} · en ${daysToSunday} día${daysToSunday!==1?'s':''}`, cls: daysToSunday<=1?'acc':'sub' };
  }
  const weeksGap = ppWeeksBetweenCheckins(settings.lastPhotoCheckinId, nextCkId) || 0;
  const weeksToNext = (settings.interval||4) - weeksGap;
  if(weeksToNext > 0){
    const last = sessions[sessions.length-1];
    return { text:`Última: ${last?.source==='checkin'?'domingo ':''}${ppFmtDate(last?.date)} · próxima en ${weeksToNext} semana${weeksToNext!==1?'s':''}`, cls:'sub' };
  }
  const skipped = ppCountSkippedCheckins(settings, sessions, today);
  if(skipped>0){
    return { text:`Te saltaste ${skipped} foto${skipped>1?'s':''}. La próxima es el domingo ${ppFmtDate(nextSunday)}.`, cls:'warn' };
  }
  return null;
}

function ppRenderFisicoArea(){
  const area = document.getElementById('pp-area');
  if(!area || !_ppCurAth) return;
  let ath = (athletes||[]).find(a=>a.id===_ppCurAth);
  if(!ath && typeof currentUser!=='undefined' && currentUser?.id===_ppCurAth){
    ath = { id:currentUser.id, name:currentUser.name, color:currentUser.color };
  }
  if(!ath) return;
  const sessions = (_ppCurSessions||[]).slice().sort((a,b)=>(b.sessionId||'').localeCompare(a.sessionId||''));
  const settings = _ppCurSettings || { interval:4 };
  const sub = ppGetSubtitle();
  const isAth = (typeof currentUser!=='undefined' && currentUser && currentUser.role==='athlete');

  if(sessions.length===0){
    // Empty state
    area.innerHTML = `
    <div class="pp-empty">
      <div class="pp-empty-headline">SACÁ TU PRIMERA SERIE.</div>
      <div class="pp-empty-sub">EN 90 DÍAS VAS A QUERER VOLVER A VERLA.</div>
      <button class="pp-cta-primary" onclick="ppGoToCheckin()">EMPEZAR EN EL PRÓXIMO CHECK-IN</button>
      <button class="pp-cta-secondary" onclick="ppOpenAdhocSheet()">Subir ahora sin esperar →</button>
      <div class="pp-empty-foot">Tu coach te las pide cada ${settings.interval||4} semana${settings.interval===1?'':'s'} en el check-in.</div>
    </div>`;
    return;
  }

  area.innerHTML = `
  <div class="pp-card">
    <div class="pp-card-head">
      <div>
        <div class="pp-card-title">${ath.name} — Progreso físico</div>
        ${sub?`<div class="pp-card-sub ${sub.cls||'sub'}">${sub.text}</div>`:''}
      </div>
      <div class="pp-card-actions">
        ${sessions.length>=2?`<button class="pp-btn-ghost" onclick="ppOpenCompare()">⇆ Comparar</button>`:''}
        <button class="pp-btn-outline" onclick="ppOpenAdhocSheet()">+ Nueva fecha</button>
      </div>
    </div>

    <div class="pp-timeline">
      ${sessions.map(s=>{
        const photoCount = Object.keys(s.photos||{}).length;
        const dStr = ppFmtDate(s.date);
        const yStr = new Date((s.date||'')+'T12:00:00').getFullYear();
        const src = s.source==='checkin' ? 'Check-in' : 'Ad-hoc';
        return `
        <div class="pp-tl-row" onclick="ppOpenSessionView('${s.sessionId}')">
          <div class="pp-tl-date">
            <div class="pp-tl-day">${dStr}</div>
            <div class="pp-tl-year">${yStr} · ${src}</div>
          </div>
          <div class="pp-tl-thumbs">
            ${PP_POSES.map(pose=>{
              const p = s.photos?.[pose.id];
              return p
                ? `<div class="pp-tl-thumb"><img src="${p.url.replace('/upload/','/upload/c_fill,w_120,h_160,q_auto,f_auto/')}" loading="lazy"></div>`
                : `<div class="pp-tl-thumb pp-tl-empty"></div>`;
            }).join('')}
          </div>
          <div class="pp-tl-meta">
            <div class="pp-tl-count">${photoCount}/${PP_POSES.length}</div>
          </div>
        </div>`;
      }).join('')}
    </div>
  </div>`;
}

function ppGoToCheckin(){
  if(typeof goSection==='function') goSection('checkins', document.querySelector('[data-tab=checkins]'));
  if(typeof toast==='function') toast('Las fotos van con tu próximo check-in del domingo.');
}

function ppOpenSessionView(sessionId){
  const s = _ppCurSessions.find(x=>x.sessionId===sessionId);
  if(!s) return;
  let ov = document.getElementById('pp-sv-ov');
  if(!ov){ ov=document.createElement('div'); ov.id='pp-sv-ov'; document.body.appendChild(ov); }
  ov.className = 'pp-sheet-ov';
  ov.onclick = e=>{ if(e.target===ov) ov.remove(); };
  ov.innerHTML = `
  <div class="pp-sheet">
    <div class="pp-sheet-head">
      <div>
        <div class="pp-sheet-title">${ppFmtDate(s.date)} · ${s.source==='checkin'?'Check-in':'Ad-hoc'}</div>
        <div class="pp-sheet-sub">${Object.keys(s.photos||{}).length}/4 fotos</div>
      </div>
      <button class="pp-x-btn" onclick="document.getElementById('pp-sv-ov').remove()">×</button>
    </div>
    <div id="pp-sv-grid"></div>
  </div>`;
  ppRenderPhotoGrid({
    container: document.getElementById('pp-sv-grid'),
    athId: _ppCurAth,
    sessionId,
    source: s.source,
    dateLabel: ppFmtDate(s.date),
    onChange: async ()=>{
      _ppCurSessions = await ppLoadSessions(_ppCurAth);
      ppRenderFisicoArea();
    }
  });
}

// ── BOTTOM SHEET AD-HOC ────────────────────────────────────────────────────
let _ppAhSheetApi = null;
function ppOpenAdhocSheet(prefillDate){
  const today = new Date().toISOString().split('T')[0];
  const date = prefillDate || today;
  const sessionId = date;

  // Fallback al overlay viejo si por algún motivo sqSheet no está disponible
  // (uiKit.js no cargó). No queremos romper la feature.
  if(typeof sqSheet !== 'function'){
    let ov = document.getElementById('pp-ah-ov');
    if(!ov){ ov=document.createElement('div'); ov.id='pp-ah-ov'; document.body.appendChild(ov); }
    ov.className = 'pp-sheet-ov';
    ov.onclick = e=>{ if(e.target===ov) ov.remove(); };
    ov.innerHTML = `
    <div class="pp-sheet">
      <div class="pp-sheet-head">
        <div>
          <div class="pp-sheet-title">Subir fotos</div>
          <div class="pp-sheet-sub">Sesión suelta — no cuenta para el ciclo del check-in</div>
        </div>
        <button class="pp-x-btn" onclick="document.getElementById('pp-ah-ov').remove()">×</button>
      </div>
      <div class="pp-sheet-row">
        <label class="pp-sheet-lbl">Fecha</label>
        <input id="pp-ah-date" type="date" value="${date}" max="${today}" class="pp-sheet-inp" onchange="ppAdhocDateChange()">
      </div>
      <div id="pp-ah-grid"></div>
      <div class="pp-sheet-foot">
        <button class="pp-sheet-close" onclick="document.getElementById('pp-ah-ov').remove()">GUARDAR Y CERRAR</button>
      </div>
    </div>`;
    ppMountAdhocGrid(sessionId);
    return;
  }

  _ppAhSheetApi = sqSheet({
    title: 'Subir fotos',
    content: `
      <div class="pp-sheet-sub" style="margin:-4px 0 14px;color:#9090a8;font-size:12px">
        Sesión suelta — no cuenta para el ciclo del check-in
      </div>
      <div class="pp-sheet-row" style="margin-bottom:14px">
        <label class="pp-sheet-lbl" style="display:block;font-size:10px;font-weight:700;letter-spacing:.12em;color:#9090a8;text-transform:uppercase;margin-bottom:6px">Fecha</label>
        <input id="pp-ah-date" type="date" value="${date}" max="${today}"
          class="pp-sheet-inp"
          style="width:100%;background:#16181c;border:1px solid #1f1f24;border-radius:8px;padding:9px 12px;color:#fff;font-family:inherit;font-size:14px"
          onchange="ppAdhocDateChange()">
      </div>
      <div id="pp-ah-grid"></div>
      <button id="pp-ah-close-btn"
        style="width:100%;margin-top:14px;padding:14px;background:#e8ff00;border:none;border-radius:10px;color:#000;font-family:inherit;font-weight:800;font-size:13px;letter-spacing:1.5px;cursor:pointer;text-transform:uppercase">
        Guardar y cerrar
      </button>
    `,
    onClose: ()=>{ _ppAhSheetApi = null; },
  });
  document.getElementById('pp-ah-close-btn')?.addEventListener('click', ()=>{
    _ppAhSheetApi?.close();
  });
  ppMountAdhocGrid(sessionId);
}

let _ppAdhocApi = null;
async function ppMountAdhocGrid(sessionId){
  _ppAdhocApi = await ppRenderPhotoGrid({
    container: document.getElementById('pp-ah-grid'),
    athId: _ppCurAth,
    sessionId,
    source: 'adhoc',
    dateLabel: ppFmtDate(sessionId),
    onChange: async ()=>{
      _ppCurSessions = await ppLoadSessions(_ppCurAth);
      // No tocar settings.lastPhotoCheckinId — adhoc no rompe el ritual
      ppRenderFisicoArea();
    }
  });
}

function ppAdhocDateChange(){
  const newDate = document.getElementById('pp-ah-date')?.value;
  if(!newDate) return;
  // Re-mount grid with new sessionId
  ppMountAdhocGrid(newDate);
  // Update title in header
  const sub = document.querySelector('#pp-ah-ov .pp-sheet-sub');
  if(sub) sub.textContent = 'Sesión suelta — no cuenta para el ciclo del check-in';
}

// ── COMPARADOR ─────────────────────────────────────────────────────────────
function ppOpenCompare(){
  const dates = (_ppCurSessions||[]).map(s=>({id:s.sessionId, date:s.date})).sort((a,b)=>b.id.localeCompare(a.id));
  if(dates.length<2){ if(typeof toast==='function') toast('Necesitás al menos 2 sesiones'); return; }
  let ov = document.getElementById('pp-cmp-ov');
  if(!ov){ ov=document.createElement('div'); ov.id='pp-cmp-ov'; document.body.appendChild(ov); }
  ov.className = 'pp-sheet-ov';
  ov.onclick = e=>{ if(e.target===ov) ov.remove(); };

  ov.innerHTML = `
  <div class="pp-sheet pp-sheet-wide">
    <div class="pp-sheet-head">
      <div class="pp-sheet-title">Comparador</div>
      <button class="pp-x-btn" onclick="document.getElementById('pp-cmp-ov').remove()">×</button>
    </div>
    <div class="pp-cmp-pickers">
      <div>
        <div class="pp-sheet-lbl">Antes</div>
        <select id="pp-cmp-a" onchange="ppCmpRender()" class="pp-sheet-inp">
          ${dates.map((d,i)=>`<option value="${d.id}" ${i===dates.length-1?'selected':''}>${ppFmtDate(d.date)}</option>`).join('')}
        </select>
      </div>
      <div>
        <div class="pp-sheet-lbl">Después</div>
        <select id="pp-cmp-b" onchange="ppCmpRender()" class="pp-sheet-inp">
          ${dates.map((d,i)=>`<option value="${d.id}" ${i===0?'selected':''}>${ppFmtDate(d.date)}</option>`).join('')}
        </select>
      </div>
    </div>
    <div id="pp-cmp-grid"></div>
  </div>`;
  ppCmpRender();
}

function ppCmpRender(){
  const aId = document.getElementById('pp-cmp-a')?.value;
  const bId = document.getElementById('pp-cmp-b')?.value;
  const grid = document.getElementById('pp-cmp-grid');
  if(!aId||!bId||!grid) return;
  const sa = (_ppCurSessions||[]).find(s=>s.sessionId===aId);
  const sb = (_ppCurSessions||[]).find(s=>s.sessionId===bId);
  grid.innerHTML = `<div class="pp-cmp-grid">
    ${PP_POSES.map(pose=>{
      const pa = sa?.photos?.[pose.id], pb = sb?.photos?.[pose.id];
      return `<div class="pp-cmp-col">
        <div class="pp-cmp-lbl">${pose.label}</div>
        <div class="pp-cmp-pair">
          ${pa ? `<img src="${pa.url.replace('/upload/','/upload/c_fill,w_300,h_400,q_auto,f_auto/')}">` : `<div class="pp-cmp-empty">sin foto</div>`}
          ${pb ? `<img src="${pb.url.replace('/upload/','/upload/c_fill,w_300,h_400,q_auto,f_auto/')}">` : `<div class="pp-cmp-empty">sin foto</div>`}
        </div>
      </div>`;
    }).join('')}
  </div>`;
}

// ── INTEGRACIÓN CON CHECK-IN ───────────────────────────────────────────────
// Llamado desde checkin.js cuando renderiza el check-in del alumno.
// Devuelve el HTML del bloque "FOTOS DEL MES" o '' si no toca.
window.ppShouldShowInCheckin = async function(athId, checkinId){
  const settings = await ppGetSettings(athId);
  return checkinRequiresPhotos(checkinId, settings);
};

window.ppRenderCheckinBlock = async function({ container, athId, checkinId, dateLabel, onPhotosCountChange }){
  if(!container) return null;
  // Header + grid container
  container.innerHTML = `
  <div class="pp-ck-block">
    <div class="pp-ck-head">
      <div class="pp-ck-title">FOTOS DEL MES</div>
      <div class="pp-ck-sub" id="pp-ck-sub">0/4 fotos</div>
    </div>
    <div id="pp-ck-grid"></div>
  </div>`;

  const api = await ppRenderPhotoGrid({
    container: document.getElementById('pp-ck-grid'),
    athId,
    sessionId: checkinId,
    source: 'checkin',
    dateLabel,
    onChange: (photos)=>{
      const n = Object.keys(photos||{}).length;
      const sub = document.getElementById('pp-ck-sub');
      if(sub) sub.textContent = `${n}/4 fotos`;
      if(onPhotosCountChange) onPhotosCountChange(n);
    }
  });
  // Initial count notify
  const n0 = api ? api.getCount() : 0;
  const sub = document.getElementById('pp-ck-sub');
  if(sub) sub.textContent = `${n0}/4 fotos`;
  if(onPhotosCountChange) onPhotosCountChange(n0);
  return api;
};

// Marca el check-in como "fotos subidas" → updates lastPhotoCheckinId
window.ppMarkCheckinDone = async function(athId, checkinId){
  const s = await ppGetSettings(athId);
  if(s.lastPhotoCheckinId !== checkinId){
    s.lastPhotoCheckinId = checkinId;
    s.updatedBy = 'system';
    await ppSaveSettings(athId, s);
  }
};

window.ppGetSettingsExt   = ppGetSettings;
window.ppSaveSettingsExt  = ppSaveSettings;
window.checkinRequiresPhotos = checkinRequiresPhotos;
window.ppRenderPhotoGrid = ppRenderPhotoGrid;
window.ppLoadSessions    = ppLoadSessions;
