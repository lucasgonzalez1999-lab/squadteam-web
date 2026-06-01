'use strict';
// ── SQUAD TEAM — Progreso Físico (fotos) ──
// Sube fotos a Cloudinary (unsigned), guarda URLs en Firestore
// progressPhotos/{athId} con {data: JSON.stringify([{date, angle, url, publicId, w, h}])}

const PP_ANGLES = [
  { id:'frente',     label:'Frente' },
  { id:'perfil_izq', label:'Perfil izq.' },
  { id:'perfil_der', label:'Perfil der.' },
  { id:'espalda',    label:'Espalda' },
];
let _ppSelAth = null;
let _ppPhotos = [];

async function ppLoad(athId){
  try{
    const doc = await window.db.collection('progressPhotos').doc(athId).get();
    if(!doc.exists) return [];
    const raw = doc.data()?.data;
    return raw ? JSON.parse(raw) : [];
  }catch(e){ return []; }
}

async function ppSave(athId, photos){
  await window.db.collection('progressPhotos').doc(athId).set({ data: JSON.stringify(photos) });
}

// Resize antes de upload — iPhone foto = 5MB → ~400KB
async function ppCompress(file, maxDim=1600, quality=0.82){
  return new Promise((resolve, reject)=>{
    const img = new Image();
    img.onload = ()=>{
      const ratio = Math.min(maxDim/img.width, maxDim/img.height, 1);
      const w = Math.round(img.width*ratio), h = Math.round(img.height*ratio);
      const canvas = document.createElement('canvas');
      canvas.width = w; canvas.height = h;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, w, h);
      canvas.toBlob(b=> b ? resolve({ blob:b, w, h }) : reject(new Error('compress')), 'image/jpeg', quality);
    };
    img.onerror = ()=>reject(new Error('img load'));
    img.src = URL.createObjectURL(file);
  });
}

async function ppUpload(file, athId, date, angle){
  const cloud  = window.CLOUDINARY_CLOUD;
  const preset = window.CLOUDINARY_PRESET;
  if(!cloud || !preset) throw new Error('Cloudinary no configurado');

  const { blob, w, h } = await ppCompress(file);
  const fd = new FormData();
  fd.append('file', blob);
  fd.append('upload_preset', preset);
  fd.append('folder', `progress/${athId}`);
  fd.append('public_id', `${date}_${angle}_${Date.now()}`);

  const res = await fetch(`https://api.cloudinary.com/v1_1/${cloud}/image/upload`, {
    method:'POST', body: fd
  });
  const data = await res.json();
  if(!res.ok || !data.secure_url){
    throw new Error(data.error?.message || 'Upload falló');
  }
  return { url:data.secure_url, publicId:data.public_id, w, h };
}

// ── MAIN RENDER ──
function renderFisico(){
  if(!Array.isArray(athletes)||!athletes.length) athletes = typeof DEFAULT_ATHLETES!=='undefined'?DEFAULT_ATHLETES:[];
  const cont = document.getElementById('fisico-content');
  if(!cont) return;

  // Atleta logueado: solo ve sus propias fotos, sin selector
  const isAth = (typeof currentUser!=='undefined' && currentUser && currentUser.role==='athlete');
  if(isAth){
    cont.innerHTML = `<div style="padding:20px;max-width:900px;margin:0 auto"><div id="pp-area"></div></div>`;
    ppSelectAth(currentUser.id);
    return;
  }

  const active = athletes.filter(a=>!a.inactive);
  cont.innerHTML = `
  <div style="padding:20px;max-width:1100px;margin:0 auto">
    <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:20px" id="pp-tabs">
      ${active.map(a=>`
        <button onclick="ppSelectAth('${a.id}')" id="pp-tab-${a.id}"
          style="display:flex;align-items:center;gap:6px;padding:8px 14px;border-radius:20px;
          border:1px solid var(--border);background:var(--surf);color:var(--text);
          font-size:13px;font-weight:600;cursor:pointer;font-family:inherit">
          <div style="width:22px;height:22px;border-radius:50%;background:${athColor(a.id)};color:#000;
            display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:800">${athInitial(a.name)}</div>
          ${a.name}
        </button>`).join('')}
    </div>
    <div id="pp-area"></div>
  </div>`;

  if(active.length) ppSelectAth(active[0].id);
}

async function ppSelectAth(athId){
  _ppSelAth = athId;
  document.querySelectorAll('[id^=pp-tab-]').forEach(btn=>{
    btn.style.background = 'var(--surf)';
    btn.style.color = 'var(--text)';
    btn.style.borderColor = 'var(--border)';
  });
  const sel = document.getElementById('pp-tab-'+athId);
  if(sel){
    sel.style.background = athColor(athId);
    sel.style.color = '#000';
    sel.style.borderColor = 'transparent';
  }
  const area = document.getElementById('pp-area');
  if(!area) return;
  area.innerHTML = '<div style="text-align:center;padding:30px;color:var(--sub)">Cargando fotos...</div>';
  _ppPhotos = await ppLoad(athId);
  ppRenderGrid();
}

function ppRenderGrid(){
  const area = document.getElementById('pp-area');
  if(!area || !_ppSelAth) return;
  let ath = (athletes||[]).find(a=>a.id===_ppSelAth);
  if(!ath && typeof currentUser!=='undefined' && currentUser?.id===_ppSelAth){
    ath = { id:currentUser.id, name:currentUser.name, color:currentUser.color };
  }
  if(!ath) return;

  // Agrupar por fecha
  const byDate = {};
  for(const p of _ppPhotos){
    if(!byDate[p.date]) byDate[p.date] = {};
    byDate[p.date][p.angle] = p;
  }
  const dates = Object.keys(byDate).sort((a,b)=>b.localeCompare(a));
  const today = new Date().toISOString().split('T')[0];

  area.innerHTML = `
  <div style="background:var(--surf);border:1px solid var(--border);border-radius:14px;padding:16px 20px;margin-bottom:16px">
    <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;margin-bottom:14px">
      <div>
        <div style="font-size:15px;font-weight:800;color:var(--text)">${ath.name} — Progreso físico</div>
        <div style="font-size:12px;color:var(--sub);margin-top:2px">${dates.length} fecha${dates.length!==1?'s':''} · ${_ppPhotos.length} foto${_ppPhotos.length!==1?'s':''}</div>
      </div>
      <div style="display:flex;gap:8px">
        ${dates.length>=2?`<button onclick="ppOpenCompare()" style="padding:9px 14px;background:var(--surf2);border:1px solid var(--border);border-radius:10px;color:var(--text);font-size:12px;font-weight:700;cursor:pointer;font-family:inherit">⇆ Comparar</button>`:''}
        <button onclick="ppOpenUpload()" style="padding:9px 16px;background:var(--acc);border:none;border-radius:10px;color:#000;font-size:13px;font-weight:800;cursor:pointer;font-family:inherit">+ Subir</button>
      </div>
    </div>

    ${dates.length===0
      ? `<div style="text-align:center;padding:40px 20px;color:var(--sub)">
          <div style="font-size:36px;margin-bottom:10px">📸</div>
          <div style="font-size:14px;font-weight:600;color:var(--text);margin-bottom:6px">Sin fotos cargadas</div>
          <div style="font-size:12px">Subí la primera foto para empezar el seguimiento físico</div>
        </div>`
      : `<div style="overflow-x:auto;-webkit-overflow-scrolling:touch">
          <table style="width:100%;border-collapse:separate;border-spacing:8px;min-width:600px">
            <thead>
              <tr>
                <th style="width:90px;text-align:left;font-size:10px;font-weight:700;color:var(--sub);letter-spacing:.1em;text-transform:uppercase;padding:6px 4px">Fecha</th>
                ${PP_ANGLES.map(ang=>`<th style="font-size:10px;font-weight:700;color:var(--sub);letter-spacing:.1em;text-transform:uppercase;padding:6px 4px;text-align:center">${ang.label}</th>`).join('')}
              </tr>
            </thead>
            <tbody>
              ${dates.map(d=>{
                const dObj = new Date(d+'T12:00:00');
                const dStr = dObj.toLocaleDateString('es-UY',{day:'2-digit',month:'short'});
                const isToday = d===today;
                return `<tr>
                  <td style="vertical-align:top;padding-top:10px">
                    <div style="font-size:13px;font-weight:700;color:var(--text)">${dStr}</div>
                    <div style="font-size:11px;color:var(--sub);margin-top:2px">${isToday?'Hoy':dObj.getFullYear()}</div>
                  </td>
                  ${PP_ANGLES.map(ang=>{
                    const p = byDate[d]?.[ang.id];
                    if(!p) return `<td style="vertical-align:top">
                      <div style="aspect-ratio:3/4;background:var(--surf2);border:1px dashed var(--border);border-radius:8px;display:flex;align-items:center;justify-content:center;color:var(--sub);font-size:11px;cursor:pointer"
                        onclick="ppOpenUpload('${d}','${ang.id}')">+ subir</div>
                    </td>`;
                    return `<td style="vertical-align:top">
                      <div style="position:relative;aspect-ratio:3/4;border-radius:8px;overflow:hidden;background:#000;cursor:pointer"
                        onclick="ppOpenLightbox('${p.url}','${ath.name} · ${dStr} · ${ang.label}')">
                        <img src="${p.url.replace('/upload/','/upload/c_fill,w_300,h_400,q_auto,f_auto/')}"
                          style="width:100%;height:100%;object-fit:cover;display:block" loading="lazy">
                        <button onclick="event.stopPropagation();ppDelete('${p.publicId||''}','${p.date}','${p.angle}')"
                          style="position:absolute;top:4px;right:4px;background:rgba(0,0,0,.7);border:none;color:#fff;width:24px;height:24px;border-radius:50%;cursor:pointer;font-size:14px;display:flex;align-items:center;justify-content:center">×</button>
                      </div>
                    </td>`;
                  }).join('')}
                </tr>`;
              }).join('')}
            </tbody>
          </table>
        </div>`}
  </div>`;
}

function ppOpenUpload(prefillDate, prefillAngle){
  const today = new Date().toISOString().split('T')[0];
  let ov = document.getElementById('pp-up-ov');
  if(!ov){ ov=document.createElement('div'); ov.id='pp-up-ov'; document.body.appendChild(ov); }
  ov.style.cssText='position:fixed;inset:0;z-index:9000;background:rgba(0,0,0,.7);backdrop-filter:blur(6px);display:flex;align-items:center;justify-content:center;padding:20px';
  ov.onclick = e=>{ if(e.target===ov) ov.remove(); };

  const inp = 'width:100%;background:var(--surf2);border:1px solid var(--border);border-radius:10px;padding:10px 13px;font-size:14px;color:var(--text);font-family:inherit;outline:none;box-sizing:border-box';
  const lbl = 'font-size:10px;font-weight:700;letter-spacing:.1em;color:var(--sub);text-transform:uppercase;margin-bottom:6px;display:block';

  ov.innerHTML = `
  <div style="background:var(--surf);border:1px solid var(--border2);border-radius:16px;width:100%;max-width:420px;padding:22px;display:flex;flex-direction:column;gap:14px">
    <div style="display:flex;align-items:center;justify-content:space-between">
      <div style="font-size:15px;font-weight:800;color:var(--text)">Subir foto</div>
      <button onclick="document.getElementById('pp-up-ov').remove()" style="background:none;border:1px solid var(--border);border-radius:8px;width:30px;height:30px;cursor:pointer;color:var(--sub);font-size:18px;display:flex;align-items:center;justify-content:center">×</button>
    </div>
    <div>
      <label style="${lbl}">Fecha</label>
      <input id="pp-date" type="date" value="${prefillDate||today}" max="${today}" style="${inp}">
    </div>
    <div>
      <label style="${lbl}">Ángulo</label>
      <select id="pp-angle" style="${inp};appearance:auto">
        ${PP_ANGLES.map(a=>`<option value="${a.id}" ${a.id===prefillAngle?'selected':''}>${a.label}</option>`).join('')}
      </select>
    </div>
    <div>
      <label style="${lbl}">Foto</label>
      <input id="pp-file" type="file" accept="image/*" capture="environment" style="${inp};padding:8px 13px">
    </div>
    <div id="pp-up-msg" style="font-size:12px;color:var(--sub);min-height:16px"></div>
    <div style="display:flex;gap:8px">
      <button onclick="document.getElementById('pp-up-ov').remove()" style="flex:1;padding:11px 0;background:none;border:1px solid var(--border);border-radius:10px;color:var(--sub);font-size:13px;font-weight:600;cursor:pointer;font-family:inherit">Cancelar</button>
      <button id="pp-up-btn" onclick="ppDoUpload()" style="flex:1;padding:11px 0;background:var(--acc);border:none;border-radius:10px;color:#000;font-size:13px;font-weight:800;cursor:pointer;font-family:inherit">Subir</button>
    </div>
  </div>`;
}

async function ppDoUpload(){
  const date  = document.getElementById('pp-date').value;
  const angle = document.getElementById('pp-angle').value;
  const file  = document.getElementById('pp-file').files?.[0];
  const msg   = document.getElementById('pp-up-msg');
  const btn   = document.getElementById('pp-up-btn');
  if(!date || !angle || !file){ msg.textContent='Faltan datos'; msg.style.color='#ef4444'; return; }
  if(!_ppSelAth){ msg.textContent='Sin alumno'; msg.style.color='#ef4444'; return; }

  btn.disabled = true; btn.textContent = 'Subiendo...'; msg.style.color='var(--sub)'; msg.textContent='Comprimiendo y subiendo...';
  try{
    const up = await ppUpload(file, _ppSelAth, date, angle);
    // Reemplazar si ya existe esa fecha+ángulo
    _ppPhotos = _ppPhotos.filter(p=>!(p.date===date && p.angle===angle));
    _ppPhotos.push({ date, angle, url:up.url, publicId:up.publicId, w:up.w, h:up.h, uploadedAt:new Date().toISOString() });
    await ppSave(_ppSelAth, _ppPhotos);
    document.getElementById('pp-up-ov')?.remove();
    toast('Foto subida');
    ppRenderGrid();
  } catch(e){
    msg.textContent = e.message || 'Error al subir';
    msg.style.color = '#ef4444';
    btn.disabled = false; btn.textContent = 'Subir';
  }
}

async function ppDelete(publicId, date, angle){
  sqConfirm({
    title:'¿Borrar esta foto?',
    body:'Esta acción no se puede deshacer.',
    confirmLabel:'Borrar', danger:true,
    onConfirm: async ()=>{
      _ppPhotos = _ppPhotos.filter(p=>!(p.date===date && p.angle===angle));
      try{
        await ppSave(_ppSelAth, _ppPhotos);
        toast('Foto eliminada');
      }catch(e){ toast('Error al guardar'); }
      ppRenderGrid();
    }
  });
}

function ppOpenLightbox(url, caption){
  let ov = document.getElementById('pp-lb-ov');
  if(!ov){ ov=document.createElement('div'); ov.id='pp-lb-ov'; document.body.appendChild(ov); }
  ov.style.cssText='position:fixed;inset:0;z-index:9500;background:rgba(0,0,0,.92);display:flex;align-items:center;justify-content:center;padding:20px;flex-direction:column;gap:14px';
  ov.onclick = ()=> ov.remove();
  ov.innerHTML = `
    <img src="${url}" style="max-width:100%;max-height:80vh;object-fit:contain;border-radius:8px">
    <div style="color:#fff;font-size:13px;font-weight:600">${caption||''}</div>
    <div style="color:#888;font-size:11px">Tap para cerrar</div>`;
}

function ppOpenCompare(){
  const dates = [...new Set(_ppPhotos.map(p=>p.date))].sort((a,b)=>b.localeCompare(a));
  if(dates.length<2){ toast('Necesitás al menos 2 fechas'); return; }
  let ov = document.getElementById('pp-cmp-ov');
  if(!ov){ ov=document.createElement('div'); ov.id='pp-cmp-ov'; document.body.appendChild(ov); }
  ov.style.cssText='position:fixed;inset:0;z-index:9000;background:rgba(0,0,0,.85);backdrop-filter:blur(6px);display:flex;align-items:center;justify-content:center;padding:14px;overflow-y:auto';
  ov.onclick = e=>{ if(e.target===ov) ov.remove(); };

  const inp = 'background:var(--surf2);border:1px solid var(--border);border-radius:8px;padding:8px 12px;font-size:13px;color:var(--text);font-family:inherit';
  ov.innerHTML = `
  <div style="background:var(--surf);border:1px solid var(--border2);border-radius:16px;width:100%;max-width:900px;padding:20px">
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px">
      <div style="font-size:15px;font-weight:800;color:var(--text)">Comparador</div>
      <button onclick="document.getElementById('pp-cmp-ov').remove()" style="background:none;border:1px solid var(--border);border-radius:8px;width:30px;height:30px;cursor:pointer;color:var(--sub);font-size:18px">×</button>
    </div>
    <div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:14px">
      <div style="flex:1;min-width:140px">
        <div style="font-size:10px;font-weight:700;letter-spacing:.1em;color:var(--sub);text-transform:uppercase;margin-bottom:6px">Antes</div>
        <select id="pp-cmp-a" onchange="ppCmpRender()" style="${inp};width:100%">
          ${dates.map((d,i)=>`<option value="${d}" ${i===dates.length-1?'selected':''}>${new Date(d+'T12:00:00').toLocaleDateString('es-UY',{day:'2-digit',month:'short',year:'numeric'})}</option>`).join('')}
        </select>
      </div>
      <div style="flex:1;min-width:140px">
        <div style="font-size:10px;font-weight:700;letter-spacing:.1em;color:var(--sub);text-transform:uppercase;margin-bottom:6px">Después</div>
        <select id="pp-cmp-b" onchange="ppCmpRender()" style="${inp};width:100%">
          ${dates.map((d,i)=>`<option value="${d}" ${i===0?'selected':''}>${new Date(d+'T12:00:00').toLocaleDateString('es-UY',{day:'2-digit',month:'short',year:'numeric'})}</option>`).join('')}
        </select>
      </div>
    </div>
    <div id="pp-cmp-grid"></div>
  </div>`;
  ppCmpRender();
}

function ppCmpRender(){
  const a = document.getElementById('pp-cmp-a')?.value;
  const b = document.getElementById('pp-cmp-b')?.value;
  const grid = document.getElementById('pp-cmp-grid');
  if(!a||!b||!grid) return;
  const byDate = (date)=> _ppPhotos.filter(p=>p.date===date).reduce((m,p)=>{m[p.angle]=p;return m;},{});
  const pa = byDate(a), pb = byDate(b);
  grid.innerHTML = `<div style="display:grid;grid-template-columns:repeat(${PP_ANGLES.length},1fr);gap:10px">
    ${PP_ANGLES.map(ang=>`
      <div>
        <div style="font-size:10px;font-weight:700;letter-spacing:.1em;color:var(--sub);text-transform:uppercase;text-align:center;margin-bottom:6px">${ang.label}</div>
        <div style="display:flex;flex-direction:column;gap:6px">
          ${pa[ang.id]
            ? `<img src="${pa[ang.id].url.replace('/upload/','/upload/c_fill,w_300,h_400,q_auto,f_auto/')}" style="width:100%;aspect-ratio:3/4;object-fit:cover;border-radius:6px;background:#000">`
            : `<div style="aspect-ratio:3/4;background:var(--surf2);border:1px dashed var(--border);border-radius:6px;display:flex;align-items:center;justify-content:center;color:var(--sub);font-size:10px">sin foto</div>`}
          ${pb[ang.id]
            ? `<img src="${pb[ang.id].url.replace('/upload/','/upload/c_fill,w_300,h_400,q_auto,f_auto/')}" style="width:100%;aspect-ratio:3/4;object-fit:cover;border-radius:6px;background:#000">`
            : `<div style="aspect-ratio:3/4;background:var(--surf2);border:1px dashed var(--border);border-radius:6px;display:flex;align-items:center;justify-content:center;color:var(--sub);font-size:10px">sin foto</div>`}
        </div>
      </div>
    `).join('')}
  </div>`;
}
