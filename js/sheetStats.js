// js/sheetStats.js — Stats desde Google Sheets (cualquier formato)
// Lee planillas de rendimiento, extrae progresión por ejercicio,
// guarda en Firebase y genera Progress Card exportable.

// ── FIREBASE ─────────────────────────────────────────────────────────────────
async function stGetStats(athId){
  try{
    const snap = await window.db.collection('spreadsheetStats').doc(athId).get();
    if(!snap.exists) return null;
    const raw = snap.data()?.data;
    return raw ? JSON.parse(raw) : null;
  }catch(e){ return null; }
}

async function stSaveStats(athId, data){
  await window.db.collection('spreadsheetStats').doc(athId).set({ data: JSON.stringify(data) });
}

async function stGetGeminiKey(){
  const cached = localStorage.getItem('st_gemini_key');
  if(cached) return cached;
  try{
    const snap = await window.db.collection('config').doc('settings').get();
    if(snap.exists){
      const k = snap.data()?.geminiKey;
      if(k){ localStorage.setItem('st_gemini_key', k); return k; }
    }
  }catch(e){}
  return null;
}

async function stSaveGeminiKey(key){
  localStorage.setItem('st_gemini_key', key);
  await window.db.collection('config').doc('settings').set({ geminiKey: key }, { merge: true });
}

// ── GOOGLE SHEETS FETCH ───────────────────────────────────────────────────────
// Reutiliza ssExtractSheetId y ssFetchSheet de sheetSync.js

async function stFetchSheet(sheetId, tabName){
  // gviz endpoint soporta CORS para sheets públicos
  const encodedTab = encodeURIComponent(tabName||'');
  const url = tabName
    ? `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&sheet=${encodedTab}`
    : `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv`;
  const r = await fetch(url);
  if(!r.ok) throw new Error(`HTTP ${r.status} al leer pestaña "${tabName||'default'}"`);
  return await r.text();
}

async function stFetchAllTabs(sheetId){
  // Intenta leer lista de pestañas via Sheets API (no requiere key para sheets públicos)
  // Fallback: lee la hoja default
  const tabs = [];
  try{
    // gviz tq sin sheet devuelve la primera pestaña — usamos eso para detectar pestañas conocidas
    const defaultCsv = await stFetchSheet(sheetId, null);
    tabs.push({ name: null, csv: defaultCsv });

    // Intenta pestañas D.E.P.T. estándar
    for(let d=1;d<=7;d++){
      try{
        const csv = await stFetchSheet(sheetId, `DIA ${d}`);
        if(csv && csv.length > 50) tabs.push({ name: `DIA ${d}`, csv });
      }catch(e){ break; }
    }
  }catch(e){}
  return tabs;
}

// ── PARSERS ──────────────────────────────────────────────────────────────────

function stParseWeight(val){
  const s = String(val||'').trim().toUpperCase().replace(/\s/g,'');
  const num = parseFloat(s.replace(/[^\d.]/g,''));
  if(isNaN(num)||num===0) return null;
  if(s.includes('LBS')||s.includes('LB')) return Math.round(num*0.453592*10)/10;
  return num;
}

function stCsvRows(csv){
  // Simple CSV parser (handles quoted fields)
  return csv.split('\n').map(line=>{
    const cols=[];let cur='',inQ=false;
    for(let i=0;i<line.length;i++){
      const c=line[i];
      if(c==='"'){inQ=!inQ;}
      else if(c===','&&!inQ){cols.push(cur.trim());cur='';}
      else{cur+=c;}
    }
    cols.push(cur.trim());
    return cols;
  }).filter(r=>r.some(c=>c.length>0));
}

// Parser D.E.P.T.: para pestañas con formato 1º/2º/3º SERIE
function stParseDEPTTab(csv){
  const rows = stCsvRows(csv);
  const SS_WEEKS = 8;
  const exercises = [];
  const SKIP = /^(ejercicio|exercise|semana|week|día|dia|series|sets|reps|repeticion|kg|lbs|peso|carga|rm|note|nota|obs|bloque|block|mesociclo|meso|fase|fase|phase|gpo|grupo|#|\d+°?\s*serie)/i;
  const SERIE = /^([1-6])[°º]\s*serie/i;

  let i = 0;
  while(i < rows.length){
    const label = (rows[i][1]||rows[i][0]||'').trim();
    if(!label || SKIP.test(label)){ i++; continue; }

    // Detect week columns: find columns with numeric/week headers
    // Try to detect header row if not already done
    const exName = label;
    const actualByWeek = {};

    // Read following SERIE rows
    let k = i+1;
    while(k < rows.length){
      const rowLabel = (rows[k][1]||rows[k][0]||'').trim();
      if(!rowLabel){ k++; continue; }
      if(!SERIE.test(rowLabel) && !SKIP.test(rowLabel) && rowLabel.length > 2){ break; }
      const sm = rowLabel.match(/^([1-6])/);
      if(sm){
        const si = parseInt(sm[1])-1;
        for(let w=0;w<SS_WEEKS;w++){
          // Column layout: 2 cols per week starting at col 4
          const kgVal  = stParseWeight(rows[k][4+w*2]);
          const repsRaw = (rows[k][5+w*2]||'').toString().trim().replace(/[^0-9]/g,'');
          const reps   = parseInt(repsRaw)||null;
          if(kgVal!==null||reps){
            if(!actualByWeek[w+1]) actualByWeek[w+1]=[];
            while(actualByWeek[w+1].length<=si) actualByWeek[w+1].push(null);
            actualByWeek[w+1][si]={kg:kgVal||0,reps:reps||0};
          }
        }
      }
      k++;
    }
    if(Object.keys(actualByWeek).length) exercises.push({name:exName, actualByWeek});
    i = k;
  }
  return exercises;
}

// Parser genérico: detecta ejercicios y semanas por heurística
function stParseGeneric(csv){
  const rows = stCsvRows(csv);
  if(!rows.length) return [];

  // Detect week columns from header row
  const headerRow = rows[0];
  const weekCols = []; // {col, week}
  const WEEK_PAT = /(?:semana|week|s|w)\s*(\d+)|^(\d+)$/i;
  headerRow.forEach((cell, col)=>{
    const m = cell.trim().match(WEEK_PAT);
    if(m) weekCols.push({col, week: parseInt(m[1]||m[2])});
  });

  // If no week columns, try to detect date columns
  if(!weekCols.length){
    headerRow.forEach((cell,col)=>{
      if(/\d{1,2}[\/\-]\d{1,2}/.test(cell)) weekCols.push({col, week:col});
    });
  }

  if(!weekCols.length) return [];

  // Each data row: col 0 or 1 = exercise name, week cols = kg or volume
  const exercises = [];
  const SKIP_ROW = /^(ejercicio|exercise|fecha|date|semana|week|día|dia|kg|lbs|series|reps|peso|notas?|obs|#|\s*)$/i;

  for(let i=1;i<rows.length;i++){
    const label = (rows[i][0]||rows[i][1]||'').trim();
    if(!label || SKIP_ROW.test(label)) continue;
    if(/^\d+$/.test(label)) continue; // pure number = not an exercise

    const actualByWeek = {};
    weekCols.forEach(({col,week})=>{
      const kg = stParseWeight(rows[i][col]);
      if(kg!==null) actualByWeek[week] = [{kg, reps:0}];
    });

    if(Object.keys(actualByWeek).length > 0) exercises.push({name:label, actualByWeek});
  }
  return exercises;
}

// Gemini-powered parser (if key available)
async function stParseWithGemini(csvText, geminiKey){
  const prompt = `Sos un parser de planillas de entrenamiento físico.
Te doy el contenido CSV de una planilla de Google Sheets.
Extraé ejercicios con cargas (kg o lbs convertidas a kg) y reps por semana.

Devolvé SOLO JSON válido sin texto adicional:
{"exercises":{"Nombre Ejercicio":{"weeks":[{"week":1,"maxKg":80,"sets":[{"kg":80,"reps":8}]}]}}}

Reglas:
- Si usa lbs: convertí multiplicando por 0.4536
- Si no hay reps, usá 0
- Ignorá filas de totales, promedios, notas
- Si no encontrás ejercicios, devolvé {"exercises":{}}

CSV (primeras 3000 chars):
${csvText.slice(0,3000)}`;

  for(const model of ['gemini-2.5-flash','gemini-2.5-flash-lite']){
    try{
      const r = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiKey}`,
        {method:'POST',headers:{'Content-Type':'application/json'},
         body:JSON.stringify({contents:[{parts:[{text:prompt}]}],
           generationConfig:{temperature:0,maxOutputTokens:2048}})}
      );
      const d = await r.json();
      if(d.error){ console.warn('Gemini stats:', d.error.message); continue; }
      const txt = d.candidates?.[0]?.content?.parts?.[0]?.text||'';
      const jsonMatch = txt.match(/\{[\s\S]*\}/);
      if(jsonMatch){
        const parsed = JSON.parse(jsonMatch[0]);
        // Convert to our format
        const result = [];
        for(const [name, ex] of Object.entries(parsed.exercises||{})){
          const actualByWeek = {};
          (ex.weeks||[]).forEach(w=>{
            actualByWeek[w.week] = (w.sets||[{kg:w.maxKg||0,reps:0}]).map(s=>({kg:s.kg||0,reps:s.reps||0}));
          });
          if(Object.keys(actualByWeek).length) result.push({name, actualByWeek});
        }
        return result;
      }
    }catch(e){ console.warn('Gemini stats parse error:', e.message); }
  }
  return null;
}

// ── AGGREGATE: exercises → weekly progression ─────────────────────────────
function stAggregate(allExercises){
  // Merge same-name exercises across tabs
  const map = {};
  for(const ex of allExercises){
    const key = ex.name.trim().toUpperCase();
    if(!map[key]) map[key] = {name:ex.name, byWeek:{}};
    for(const [w, sets] of Object.entries(ex.actualByWeek||{})){
      if(!map[key].byWeek[w]) map[key].byWeek[w] = [];
      map[key].byWeek[w].push(...sets);
    }
  }

  return Object.values(map).map(ex=>{
    const weeks = Object.entries(ex.byWeek).map(([w,sets])=>{
      const kgs = sets.map(s=>s.kg).filter(k=>k>0);
      const maxKg = kgs.length ? Math.max(...kgs) : 0;
      const vol = sets.reduce((t,s)=>(s.kg||0)*(s.reps||1)+t, 0);
      return {week:parseInt(w), maxKg, volume:Math.round(vol), sets};
    }).sort((a,b)=>a.week-b.week);

    const firstKg = weeks.find(w=>w.maxKg>0)?.maxKg||0;
    const lastKg  = [...weeks].reverse().find(w=>w.maxKg>0)?.maxKg||0;
    const improvement = firstKg>0 ? Math.round((lastKg-firstKg)/firstKg*100) : 0;
    return {...ex, weeks, firstKg, lastKg, improvement};
  }).filter(ex=>ex.weeks.length>0);
}

// ── MAIN SYNC ──────────────────────────────────────────────────────────────
async function stSyncStats(athId, sheetUrl, logFn){
  const log = logFn || (()=>{});
  const sheetId = ssExtractSheetId(sheetUrl);
  if(!sheetId) throw new Error('URL de Google Sheets inválido');

  log('🔍 Leyendo planilla…');
  const tabs = await stFetchAllTabs(sheetId);
  if(!tabs.length) throw new Error('No se pudo leer la planilla');

  log(`📋 ${tabs.length} pestaña(s) encontradas`);

  const geminiKey = await stGetGeminiKey();
  let allExercises = [];

  for(const {name, csv} of tabs){
    if(!csv||csv.length<20) continue;

    // Try D.E.P.T. parser first
    const deptResult = stParseDEPTTab(csv);
    if(deptResult.length>0){
      log(`✓ ${name||'Hoja'}: ${deptResult.length} ejercicios (D.E.P.T.)`);
      allExercises.push(...deptResult);
      continue;
    }

    // Try Gemini if key available
    if(geminiKey){
      log(`🤖 ${name||'Hoja'}: interpretando con Gemini…`);
      const gemResult = await stParseWithGemini(csv, geminiKey);
      if(gemResult&&gemResult.length>0){
        log(`✓ ${name||'Hoja'}: ${gemResult.length} ejercicios (Gemini)`);
        allExercises.push(...gemResult);
        continue;
      }
    }

    // Generic heuristic fallback
    const genResult = stParseGeneric(csv);
    if(genResult.length>0){
      log(`✓ ${name||'Hoja'}: ${genResult.length} ejercicios (auto-detect)`);
      allExercises.push(...genResult);
    }
  }

  if(!allExercises.length) throw new Error('No se detectaron ejercicios con cargas. Verificá que la planilla sea pública.');

  log('📊 Procesando progresión…');
  const exercises = stAggregate(allExercises);

  const stats = {
    athId,
    sheetUrl,
    updatedAt: new Date().toISOString(),
    exercises
  };

  log('💾 Guardando en Firebase…');
  await stSaveStats(athId, stats);
  return stats;
}

// ── MODAL UI ──────────────────────────────────────────────────────────────
async function openStatsModal(athId){
  const a = athletes.find(x=>x.id===athId);
  if(!a) return;
  const color = athColor(athId);

  let existing = await stGetStats(athId);
  let geminiKey = await stGetGeminiKey();

  let ov = document.getElementById('st-modal-ov');
  if(!ov){ ov = document.createElement('div'); ov.id='st-modal-ov'; document.body.appendChild(ov); }
  ov.style.cssText = 'position:fixed;inset:0;z-index:9000;background:rgba(0,0,0,.7);backdrop-filter:blur(6px);display:flex;align-items:center;justify-content:center;padding:20px';
  ov.onclick = e=>{ if(e.target===ov) ov.remove(); };

  const lastSync = existing?.updatedAt
    ? new Date(existing.updatedAt).toLocaleString('es-UY',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'})
    : null;
  const exCount = existing?.exercises?.length||0;

  ov.innerHTML = `
<div style="background:var(--surf);border:1px solid var(--border2);border-radius:16px;width:100%;max-width:520px;overflow:hidden">
  <div style="padding:20px 22px 16px;display:flex;align-items:flex-start;justify-content:space-between;border-bottom:1px solid var(--border)">
    <div>
      <div style="font-size:15px;font-weight:800;color:var(--text)">📊 Stats de ${a.name}</div>
      <div style="font-size:12px;color:var(--sub);margin-top:2px">Importar progresión desde Google Sheets</div>
    </div>
    <button onclick="document.getElementById('st-modal-ov').remove()" style="background:none;border:1px solid var(--border);border-radius:8px;width:30px;height:30px;cursor:pointer;color:var(--sub);font-size:18px;display:flex;align-items:center;justify-content:center;flex-shrink:0">×</button>
  </div>

  <div style="padding:18px 22px;display:flex;flex-direction:column;gap:14px">

    ${existing ? `
    <div style="padding:10px 12px;background:rgba(232,255,0,.06);border:1px solid rgba(232,255,0,.2);border-radius:10px;font-size:12px;color:var(--text);display:flex;align-items:center;justify-content:space-between;gap:8px">
      <div>
        <span style="font-weight:700;color:var(--acc)">✓ ${exCount} ejercicios</span> · Última sync: ${lastSync}
      </div>
      <button onclick="stExportCard('${athId}')" style="padding:5px 10px;background:var(--surf2);border:1px solid var(--border2);border-radius:7px;color:var(--text);font-size:11px;font-weight:600;cursor:pointer;font-family:inherit;white-space:nowrap">📸 Exportar</button>
    </div>` : ''}

    <div>
      <div style="font-size:10px;font-weight:700;letter-spacing:.1em;color:var(--sub);text-transform:uppercase;margin-bottom:6px">URL de la planilla de stats</div>
      <input id="st-url" type="text" placeholder="https://docs.google.com/spreadsheets/d/..."
        value="${existing?.sheetUrl||''}"
        style="width:100%;background:var(--surf2);border:1px solid var(--border);border-radius:10px;padding:10px 13px;font-size:13px;color:var(--text);font-family:inherit;outline:none;box-sizing:border-box">
      <div style="font-size:11px;color:var(--sub);margin-top:5px">Compartir → "Cualquiera con el link puede ver". Puede ser la misma planilla del plan o una diferente.</div>
    </div>

    <details style="background:var(--surf2);border:1px solid var(--border);border-radius:10px;padding:10px 13px">
      <summary style="font-size:11px;font-weight:700;color:var(--sub);cursor:pointer;letter-spacing:.05em;text-transform:uppercase">⚙ Gemini API Key (opcional — para detectar cualquier formato)</summary>
      <div style="margin-top:10px">
        <input id="st-gkey" type="password" placeholder="AIza..."
          value="${geminiKey||''}"
          style="width:100%;background:var(--surf);border:1px solid var(--border2);border-radius:8px;padding:9px 12px;font-size:13px;color:var(--text);font-family:inherit;outline:none;box-sizing:border-box">
        <div style="font-size:11px;color:var(--sub);margin-top:5px">Sin key usa el parser automático (funciona con D.E.P.T. y formatos estándar).</div>
      </div>
    </details>

    <div id="st-log" style="display:none;padding:10px 12px;background:var(--surf2);border:1px solid var(--border);border-radius:10px;font-size:12px;color:var(--sub);max-height:130px;overflow-y:auto;font-family:monospace;line-height:1.7"></div>
  </div>

  <div style="padding:0 22px 20px;display:flex;gap:8px">
    <button onclick="document.getElementById('st-modal-ov').remove()" style="flex:1;padding:10px 0;background:none;border:1px solid var(--border);border-radius:10px;color:var(--sub);font-size:13px;font-weight:600;cursor:pointer;font-family:inherit">Cerrar</button>
    <button id="st-sync-btn" onclick="runStatsSync('${athId}')" style="flex:2;padding:10px 0;background:${color};border:none;border-radius:10px;color:${color==='#e8ff00'?'#000':'#fff'};font-size:13px;font-weight:800;cursor:pointer;font-family:inherit">Sincronizar stats</button>
  </div>
</div>`;
}

async function runStatsSync(athId){
  const url = document.getElementById('st-url')?.value.trim();
  const gKey = document.getElementById('st-gkey')?.value.trim();
  const log = document.getElementById('st-log');
  const btn = document.getElementById('st-sync-btn');

  if(!url){ toast('⚠ Pegá el URL de la planilla'); return; }

  // Save Gemini key if provided
  if(gKey) await stSaveGeminiKey(gKey);

  if(log){ log.style.display='block'; log.innerHTML=''; }
  if(btn){ btn.textContent='Sincronizando…'; btn.disabled=true; }

  const logLine = (msg)=>{
    if(log) log.innerHTML += (log.innerHTML?'<br>':'')+msg;
  };

  try{
    const stats = await stSyncStats(athId, url, logLine);
    logLine(`<br>✅ <strong style="color:var(--acc)">${stats.exercises.length} ejercicios importados</strong>`);
    if(btn){ btn.textContent='Re-sincronizar'; btn.disabled=false; }
    toast(`Stats de ${athletes.find(x=>x.id===athId)?.name||athId} actualizadas`);

    // Refresh display if stats section open
    if(currentSection==='progreso') renderProgreso();
  }catch(e){
    logLine(`<span style="color:#ef4444">❌ ${e.message}</span>`);
    if(btn){ btn.textContent='Sincronizar stats'; btn.disabled=false; }
  }
}

// ── PROGRESS CARD — Canvas Export ─────────────────────────────────────────
async function stExportCard(athId){
  const stats = await stGetStats(athId);
  const a = athletes.find(x=>x.id===athId)||{id:athId,name:athId};
  if(!stats||!stats.exercises?.length){
    toast('Sincronizá las stats primero'); return;
  }

  const color = athColor(athId);
  const W=1080, H=1350;
  const canvas = document.createElement('canvas');
  canvas.width=W; canvas.height=H;
  const ctx = canvas.getContext('2d');

  // Background
  ctx.fillStyle='#07070a';
  ctx.fillRect(0,0,W,H);

  // Subtle grid
  ctx.strokeStyle='rgba(255,255,255,.03)';
  ctx.lineWidth=1;
  for(let x=0;x<W;x+=80){ ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,H);ctx.stroke(); }
  for(let y=0;y<H;y+=80){ ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y);ctx.stroke(); }

  // Accent strip top
  ctx.fillStyle=color;
  ctx.fillRect(0,0,W,6);

  // Noise grain overlay (subtle)
  const imageData = ctx.getImageData(0,0,W,H);
  const buf = imageData.data;
  for(let i=0;i<buf.length;i+=4){
    const n=(Math.random()-.5)*8;
    buf[i]  =Math.min(255,Math.max(0,buf[i]+n));
    buf[i+1]=Math.min(255,Math.max(0,buf[i+1]+n));
    buf[i+2]=Math.min(255,Math.max(0,buf[i+2]+n));
  }
  ctx.putImageData(imageData,0,0);

  // ── Header ──
  const MARGIN = 72;

  // SQUAD TEAM wordmark
  ctx.fillStyle='rgba(255,255,255,.18)';
  ctx.font='700 22px Inter,system-ui,sans-serif';
  ctx.letterSpacing='6px';
  ctx.fillText('SQUAD TEAM',MARGIN,86);
  ctx.letterSpacing='0px';

  // Athlete name
  ctx.fillStyle='#ffffff';
  ctx.font='900 italic 108px "Barlow Condensed",Impact,sans-serif';
  ctx.fillText(a.name.toUpperCase(),MARGIN,210);

  // Block info
  const exsSorted = [...stats.exercises].sort((a,b)=>Math.abs(b.improvement)-Math.abs(a.improvement));
  const weeks = Math.max(...stats.exercises.flatMap(e=>e.weeks.map(w=>w.week)));
  ctx.fillStyle='rgba(255,255,255,.4)';
  ctx.font='500 28px Inter,system-ui,sans-serif';
  ctx.fillText(`PROGRESO · BLOQUE ${weeks} SEMANAS`, MARGIN, 260);

  // Accent line under header
  ctx.fillStyle=color;
  ctx.fillRect(MARGIN,284,W-MARGIN*2,3);

  // ── Exercise bars ──
  const TOP_N = Math.min(6, exsSorted.length);
  const barAreaTop = 320;
  const barH = (H - barAreaTop - 160) / TOP_N;

  for(let i=0;i<TOP_N;i++){
    const ex = exsSorted[i];
    const y = barAreaTop + i*barH;
    const rowH = barH - 12;

    // Exercise name
    ctx.fillStyle='rgba(255,255,255,.85)';
    ctx.font='700 32px Inter,system-ui,sans-serif';
    const nameMaxW = W - MARGIN*2 - 340;
    let exName = ex.name;
    // Truncate if too long
    while(ctx.measureText(exName).width > nameMaxW && exName.length>4) exName = exName.slice(0,-1);
    if(exName!==ex.name) exName+='…';
    ctx.fillText(exName, MARGIN, y+38);

    // Max kg
    ctx.fillStyle=color;
    ctx.font='900 italic 52px "Barlow Condensed",Impact,sans-serif';
    const kgStr = ex.lastKg>0 ? ex.lastKg+'kg' : '—';
    const kgW = ctx.measureText(kgStr).width;
    ctx.fillText(kgStr, W-MARGIN-kgW-120, y+46);

    // Improvement %
    if(ex.improvement!==0){
      const sign = ex.improvement>0?'+':'';
      ctx.fillStyle = ex.improvement>0?'rgba(0,208,132,.8)':'rgba(255,63,63,.7)';
      ctx.font='600 24px Inter,system-ui,sans-serif';
      ctx.fillText(`${sign}${ex.improvement}%`, W-MARGIN-90, y+46);
    }

    // Progress bar background
    ctx.fillStyle='rgba(255,255,255,.06)';
    ctx.beginPath();
    ctx.roundRect(MARGIN, y+58, W-MARGIN*2, 18, 9);
    ctx.fill();

    // Progress bar fill
    const maxPossibleKg = Math.max(ex.lastKg, ex.firstKg, 1);
    const fillW = Math.max(0, Math.min(1, ex.lastKg/maxPossibleKg)) * (W-MARGIN*2);
    ctx.fillStyle=color;
    ctx.globalAlpha=0.7;
    ctx.beginPath();
    ctx.roundRect(MARGIN, y+58, fillW, 18, 9);
    ctx.fill();
    ctx.globalAlpha=1;

    // Week-by-week dots (sparkline)
    if(ex.weeks.length>1){
      const maxW = ex.weeks.length;
      const maxKg = Math.max(...ex.weeks.map(w=>w.maxKg),1);
      const sparkX = MARGIN;
      const sparkW = W-MARGIN*2;
      const sparkY = y+90;
      const sparkH = 30;

      // Line
      ctx.beginPath();
      ctx.strokeStyle = color;
      ctx.globalAlpha=0.35;
      ctx.lineWidth=2;
      ex.weeks.forEach((w,wi)=>{
        const px = sparkX+(wi/(maxW-1||1))*sparkW;
        const py = sparkY+sparkH-(w.maxKg/maxKg)*sparkH;
        wi===0?ctx.moveTo(px,py):ctx.lineTo(px,py);
      });
      ctx.stroke();
      ctx.globalAlpha=1;
      ctx.lineWidth=1;
    }

    // Separator
    ctx.fillStyle='rgba(255,255,255,.05)';
    ctx.fillRect(MARGIN, y+rowH, W-MARGIN*2, 1);
  }

  // ── Footer ──
  const footY = H-60;
  ctx.fillStyle='rgba(255,255,255,.12)';
  ctx.font='700 18px Inter,system-ui,sans-serif';
  ctx.letterSpacing='4px';
  ctx.fillText('SQUAD TEAM · COACH OS', MARGIN, footY);
  ctx.letterSpacing='0px';

  // QR hint / date
  const dateStr = new Date(stats.updatedAt).toLocaleDateString('es-UY',{day:'2-digit',month:'short',year:'numeric'});
  ctx.fillStyle='rgba(255,255,255,.2)';
  ctx.font='400 18px Inter,system-ui,sans-serif';
  const dateW = ctx.measureText(dateStr).width;
  ctx.fillText(dateStr, W-MARGIN-dateW, footY);

  // Accent line bottom
  ctx.fillStyle=color;
  ctx.fillRect(0,H-6,W,6);

  // ── Download ──
  const link = document.createElement('a');
  link.download = `squad_${a.id}_progress.png`;
  link.href = canvas.toDataURL('image/png');
  link.click();
  toast('📸 Progress card descargada');
}

// ── SPARKLINE SVG (para usar en el perfil web) ───────────────────────────────
function stSparklineSvg(weeks, color, w=120, h=36){
  if(!weeks||weeks.length<2) return '';
  const vals = weeks.map(wk=>wk.maxKg).filter(v=>v>0);
  if(!vals.length) return '';
  const maxV = Math.max(...vals);
  const minV = Math.min(...vals);
  const range = maxV-minV||1;
  const pad=3;
  const pts = vals.map((v,i)=>{
    const x=pad+i/(vals.length-1)*(w-pad*2);
    const y=pad+(1-(v-minV)/range)*(h-pad*2);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');
  return `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" fill="none" xmlns="http://www.w3.org/2000/svg">
    <polyline points="${pts}" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
    <circle cx="${pts.split(' ').pop().split(',')[0]}" cy="${pts.split(' ').pop().split(',')[1]}" r="3" fill="${color}"/>
  </svg>`;
}

// ── RENDER CHARTS en sección Progreso ────────────────────────────────────────
async function stRenderInProgreso(cont){
  const html = `
<div style="padding:24px 20px;max-width:900px;margin:0 auto">
  <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:16px;margin-bottom:20px;flex-wrap:wrap">
    <div>
      <div style="font-size:20px;font-weight:800;color:var(--text);letter-spacing:-.3px">Progreso por planilla</div>
      <div style="font-size:12px;color:var(--sub);margin-top:3px">Evolución de cargas desde Google Sheets</div>
    </div>
    <select id="st-ath-sel" onchange="stShowAthStats(this.value)"
      style="padding:9px 12px;background:var(--surf2);border:1px solid var(--border2);border-radius:10px;color:var(--text);font-size:13px;font-family:inherit;outline:none">
      ${athletes.map(a=>`<option value="${a.id}">${a.name}</option>`).join('')}
    </select>
  </div>
  <div id="st-ath-charts"></div>
</div>`;
  cont.innerHTML = html;
  if(athletes.length) stShowAthStats(athletes[0].id);
}

async function stShowAthStats(athId){
  const cont = document.getElementById('st-ath-charts');
  if(!cont) return;
  const sel = document.getElementById('st-ath-sel');
  if(sel) sel.value = athId;

  cont.innerHTML = '<div style="text-align:center;padding:40px;color:var(--sub);font-size:13px">Cargando…</div>';

  const a = athletes.find(x=>x.id===athId)||{id:athId,name:athId};
  const color = athColor(athId);
  const stats = await stGetStats(athId);

  if(!stats||!stats.exercises?.length){
    cont.innerHTML = `
<div style="text-align:center;padding:60px 20px">
  <div style="font-size:32px;margin-bottom:12px">📊</div>
  <div style="font-size:15px;font-weight:700;color:var(--text);margin-bottom:6px">Sin stats para ${a.name}</div>
  <div style="font-size:13px;color:var(--sub);margin-bottom:16px">Sincronizá la planilla desde la tabla de alumnos</div>
  <button onclick="openStatsModal('${athId}')" style="padding:10px 20px;background:${color};color:${color==='#e8ff00'?'#000':'#fff'};border:none;border-radius:10px;font-size:13px;font-weight:700;cursor:pointer;font-family:inherit">📊 Conectar planilla</button>
</div>`;
    return;
  }

  const exsSorted = [...stats.exercises].sort((a,b)=>Math.abs(b.improvement)-Math.abs(a.improvement));
  const syncDate = new Date(stats.updatedAt).toLocaleDateString('es-UY',{day:'2-digit',month:'short'});

  cont.innerHTML = `
<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;gap:10px;flex-wrap:wrap">
  <div style="font-size:12px;color:var(--sub)">Última sync: <strong style="color:var(--text)">${syncDate}</strong> · ${stats.exercises.length} ejercicios</div>
  <div style="display:flex;gap:8px">
    <button onclick="openStatsModal('${athId}')" style="padding:7px 13px;background:var(--surf2);border:1px solid var(--border2);border-radius:8px;color:var(--text2);font-size:12px;font-weight:600;cursor:pointer;font-family:inherit">🔄 Re-sincronizar</button>
    <button onclick="stExportCard('${athId}')" style="padding:7px 13px;background:${color};color:${color==='#e8ff00'?'#000':'#fff'};border:none;border-radius:8px;font-size:12px;font-weight:700;cursor:pointer;font-family:inherit">📸 Exportar</button>
  </div>
</div>

<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:12px">
  ${exsSorted.map(ex=>{
    const weeks = ex.weeks.filter(w=>w.maxKg>0);
    const sign = ex.improvement>0?'+':'';
    const impColor = ex.improvement>0?'var(--green)':ex.improvement<0?'var(--red)':'var(--sub)';
    return `
<div style="background:var(--surf);border:1px solid var(--border2);border-radius:12px;padding:14px 16px">
  <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:8px;margin-bottom:10px">
    <div style="font-size:13px;font-weight:700;color:var(--text);line-height:1.3">${ex.name}</div>
    <div style="text-align:right;flex-shrink:0">
      <div style="font-size:22px;font-weight:800;color:${color};line-height:1">${ex.lastKg>0?ex.lastKg+'kg':'—'}</div>
      ${ex.improvement!==0?`<div style="font-size:11px;color:${impColor};font-weight:600">${sign}${ex.improvement}%</div>`:''}
    </div>
  </div>
  <div style="display:flex;justify-content:space-between;align-items:flex-end">
    <div style="font-size:11px;color:var(--sub)">${weeks.length} semanas · inicio ${ex.firstKg>0?ex.firstKg+'kg':'—'}</div>
    ${stSparklineSvg(ex.weeks, color)}
  </div>
</div>`;
  }).join('')}
</div>`;
}
