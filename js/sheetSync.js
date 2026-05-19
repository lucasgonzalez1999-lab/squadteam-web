// ═══════════════════════════════════════════
// SQUAD TEAM — Google Sheets Plan Sync
// Lee planillas de entreno tipo D.E.P.T. desde Google Sheets
// y las convierte al formato del bot/web.
// ═══════════════════════════════════════════

// Labels que NO son ejercicios — se ignoran en el parser
const SS_SKIP = [
  'EJERCICIOS','ENTRADA EN CALOR','SENSACIONES',
  '1º SERIE','2º SERIE','3º SERIE','4º SERIE','5º SERIE',
  '1° SERIE','2° SERIE','3° SERIE',
  'RIR (REPETICIONES EN RESERVA)','RIR',
  'TIEMPO DE PAUSA','TIEMPO DE',
  '(PUNTUAR','MOTIVACIÓN','MOTIVACION','RECUPERACIÓN','RECUPERACION',
  '¿QUÉ TAN INTENSO','¿COMO TE','¿CÓMO TE','COMENTARIO EXTRA',
  'D.E.P.T.','DÍA','DIA','ALUMNO','FECHA'
];

function ssIsSkippable(label){
  if(!label) return true;
  const u = label.trim().toUpperCase();
  if(!u) return true;
  return SS_SKIP.some(s => u.startsWith(s));
}

// Detecta una "celda de prescripción" tipo "2X", "1X", "3X"
function ssIsPrescriptionCell(v){
  if(!v) return false;
  return /^\d+\s*X\s*$/i.test(String(v).trim());
}

// ── CSV PARSER (maneja comillas y comas) ──
function ssParseCSV(text){
  const rows = [];
  const lines = text.split(/\r?\n/);
  for(const line of lines){
    if(!line && !rows.length) continue;
    const cells = [];
    let inQ = false, cur = '';
    for(let i=0;i<line.length;i++){
      const c = line[i];
      if(c === '"'){
        if(inQ && line[i+1] === '"'){ cur += '"'; i++; }
        else inQ = !inQ;
      } else if(c === ',' && !inQ){
        cells.push(cur); cur = '';
      } else {
        cur += c;
      }
    }
    cells.push(cur);
    rows.push(cells);
  }
  return rows;
}

// ── EXTRAER SHEET ID DEL URL ──
function ssExtractSheetId(url){
  if(!url) return null;
  const m = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/);
  return m ? m[1] : (url.length > 30 && !url.includes('/') ? url : null);
}

// ── FETCH UNA HOJA COMO CSV ──
async function ssFetchSheet(sheetId, sheetName){
  const url = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&headers=0&sheet=${encodeURIComponent(sheetName)}`;
  const r = await fetch(url);
  if(!r.ok) throw new Error(`No se pudo leer "${sheetName}" — verificá que el Sheet esté compartido como público`);
  return await r.text();
}

// ── PARSE PESO (LBS O KG) → siempre devuelve KG ──
function ssParseWeight(val){
  if(!val) return null;
  const s = String(val).trim().toUpperCase().replace(/\s/g,'');
  const num = parseFloat(s.replace(/[^\d.]/g,''));
  if(isNaN(num) || num === 0) return null;
  if(s.includes('LBS') || s.includes('LB')) return Math.round(num * 0.453592 * 10) / 10;
  return num;
}

// ── PARSER DE UN DÍA ──
// Devuelve: [{ name, byWeek: { 1: {sets, rir} }, actualByWeek: { 1: [{kg,reps}] } }, ...]
const SS_WEEKS = 8; // soporte hasta 8 semanas

function ssParseDay(csvText){
  const rows = ssParseCSV(csvText);
  const exercises = [];
  let i = 0;

  while(i < rows.length){
    const row   = rows[i];
    const label = (row[1] || '').trim();

    if(ssIsSkippable(label) || !label){ i++; continue; }

    const col4 = (row[4] || '').trim();
    if(!ssIsPrescriptionCell(col4)){ i++; continue; }

    // Es un ejercicio
    const exName = label.replace(/\s+/g,' ').trim();
    const prescriptions = [row];

    // Look-ahead filas de continuación (col B vacía + prescripción)
    let j = i + 1;
    while(j < rows.length){
      const nx = rows[j];
      if(!(nx[1]||'').trim() && ssIsPrescriptionCell((nx[4]||'').trim())){
        prescriptions.push(nx); j++;
      } else { break; }
    }

    // Buscar RIR en las próximas ~6 filas
    let rirRow = null;
    for(let k = j; k < Math.min(j + 6, rows.length); k++){
      if((rows[k][1]||'').trim().toUpperCase().startsWith('RIR')){ rirRow = rows[k]; break; }
    }

    // Prescripción por semana (SS_WEEKS semanas, cols 4..4+SS_WEEKS*2)
    const byWeek = {};
    for(let w = 0; w < SS_WEEKS; w++){
      const sCol = 4 + w * 2;
      const rCol = 5 + w * 2;
      const sets = prescriptions.map(p => ({
        series: (p[sCol]||'').trim(),
        reps:   (p[rCol]||'').trim()
      })).filter(s => s.series || s.reps);
      const rir = rirRow ? (rirRow[sCol]||'').trim().replace(/^RIR\s*/i,'').trim() : '';
      byWeek[w + 1] = { sets, rir };
    }

    // ── Performance real — filas "1º SERIE", "2º SERIE", etc. ──
    const actualByWeek = {};
    let k = j;
    while(k < rows.length){
      const rowLabel = (rows[k][1]||'').trim();
      // Parar si es un nuevo ejercicio real (no vacío, no skippable)
      if(rowLabel && !ssIsSkippable(rowLabel)) break;
      const sm = rowLabel.toUpperCase().replace('°','º').match(/^([1-6])º\s*SERIE/);
      if(sm){
        const si = parseInt(sm[1]) - 1; // 0-indexed
        for(let w = 0; w < SS_WEEKS; w++){
          const kg   = ssParseWeight(rows[k][4 + w * 2]);
          const reps = parseInt((rows[k][5 + w * 2]||'').trim().replace(/[^0-9]/g,'')) || null;
          if(kg !== null || reps){
            if(!actualByWeek[w + 1]) actualByWeek[w + 1] = [];
            while(actualByWeek[w + 1].length <= si) actualByWeek[w + 1].push(null);
            actualByWeek[w + 1][si] = { kg: kg || 0, reps: reps || 0 };
          }
        }
      }
      k++;
    }
    // Limpiar nulls
    for(const w of Object.keys(actualByWeek)){
      actualByWeek[w] = actualByWeek[w].filter(Boolean);
      if(!actualByWeek[w].length) delete actualByWeek[w];
    }

    exercises.push({ name: exName, byWeek, actualByWeek });
    i = k; // avanzar más allá de las filas de series
  }

  return exercises;
}

// ── IMPORTAR SESIONES HISTÓRICAS A FIREBASE ──
// Lee actualByWeek de cada ejercicio y crea registros en sessions/{athId}
async function ssImportSessions(athId, athName, plan){
  const startDate = new Date((plan.startDate || new Date().toISOString().slice(0,10)) + 'T00:00:00');

  // Traer sesiones existentes
  let existing = [];
  try{
    const snap = await window.db.collection('sessions').doc(athId).get();
    if(snap.exists) try{ existing = JSON.parse(snap.data()?.data||'[]'); }catch(e){}
  }catch(e){}

  const existingIds = new Set(existing.map(s => s.id));
  const toImport = [];

  for(const [diaKey, exercises] of Object.entries(plan.byDay || {})){
    const dayNum = parseInt(diaKey.replace(/\D/g,'')) || 1;
    // Semanas con datos reales
    const weeks = new Set();
    for(const ex of exercises){
      for(const w of Object.keys(ex.actualByWeek || {})) weeks.add(parseInt(w));
    }
    for(const weekNum of weeks){
      const sid = `${athId}_import_${diaKey.replace(/\s/g,'')}_w${weekNum}`;
      if(existingIds.has(sid)) continue; // ya importado
      const d = new Date(startDate);
      d.setDate(d.getDate() + (weekNum - 1) * 7 + (dayNum - 1));
      const dateStr = d.toISOString().slice(0, 10);
      const exs = exercises
        .filter(ex => ex.actualByWeek?.[weekNum]?.length)
        .map(ex => ({ name: ex.name, sets: ex.actualByWeek[weekNum] }));
      if(!exs.length) continue;
      toImport.push({
        id: sid, date: dateStr, name: diaKey,
        athleteName: athName || athId,
        exercises: exs,
        _imported: true, _week: weekNum
      });
    }
  }

  if(!toImport.length) return 0;
  const merged = [...toImport, ...existing].sort((a, b) => b.date.localeCompare(a.date));
  await window.db.collection('sessions').doc(athId).set({ data: JSON.stringify(merged) });
  return toImport.length;
}

// ── SYNC COMPLETO PARA UN ATLETA ──
async function ssSyncAthlete(athId, sheetUrl, startDate, dayCount=5, weekCount=SS_WEEKS){
  const sheetId = ssExtractSheetId(sheetUrl);
  if(!sheetId) throw new Error('URL de Sheet inválido');

  const byDay = {};
  for(let d = 1; d <= dayCount; d++){
    const sheetName = `DIA ${d}`;
    try {
      const csv = await ssFetchSheet(sheetId, sheetName);
      const exs = ssParseDay(csv);
      if(exs.length) byDay[sheetName] = exs;
    } catch(e){
      console.warn(`Sync ${sheetName}:`, e.message);
    }
  }

  if(!Object.keys(byDay).length){
    throw new Error('No se encontraron días en el Sheet (esperaba pestañas "DIA 1", "DIA 2", etc.)');
  }

  const plan = {
    weeks: weekCount,
    days: dayCount,
    startDate: startDate || new Date().toISOString().slice(0,10),
    sheetId,
    sheetUrl,
    lastSync: new Date().toISOString(),
    byDay
  };

  // Guardar en Firebase como plans/{athId}
  await window.db.collection('plans').doc(athId).set({ data: JSON.stringify(plan) });

  return plan;
}

// ── HELPER: calcular semana actual desde startDate ──
function ssCurrentWeek(startDate, weeks=SS_WEEKS){
  if(!startDate) return 1;
  const start = new Date(startDate + 'T00:00:00');
  const now   = new Date();
  const diffDays = Math.floor((now - start) / 86400000);
  if(diffDays < 0) return 1;
  const w = Math.floor(diffDays / 7) + 1;
  return Math.min(Math.max(w, 1), weeks);
}

// ── UI: MODAL DE SYNC POR ATLETA ──
async function openPlanSyncModal(athId){
  const a = athletes.find(x => x.id === athId);
  if(!a) return;

  // Cargar plan actual (si existe) para mostrar el URL y startDate
  let current = null;
  try{
    const snap = await window.db.collection('plans').doc(athId).get();
    if(snap.exists) try{ current = JSON.parse(snap.data()?.data||'null'); }catch(e){}
  }catch(e){}

  let ov = document.getElementById('plan-sync-ov');
  if(!ov){ ov = document.createElement('div'); ov.id = 'plan-sync-ov'; document.body.appendChild(ov); }
  ov.style.cssText = 'position:fixed;inset:0;z-index:9000;background:rgba(0,0,0,.65);backdrop-filter:blur(6px);display:flex;align-items:center;justify-content:center;padding:20px';
  ov.onclick = e => { if(e.target === ov) ov.remove(); };

  const curWeek = current?.startDate ? ssCurrentWeek(current.startDate, current.weeks || 6) : null;
  const lastSyncFmt = current?.lastSync ? new Date(current.lastSync).toLocaleString('es-UY',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'}) : null;

  ov.innerHTML = `
    <div style="background:var(--surf);border:1px solid var(--border2);border-radius:16px;width:100%;max-width:520px;overflow:hidden">
      <div style="padding:20px 22px 16px;display:flex;align-items:flex-start;justify-content:space-between;border-bottom:1px solid var(--border)">
        <div>
          <div style="font-size:15px;font-weight:800;color:var(--text)">Plan de ${a.name}</div>
          <div style="font-size:12px;color:var(--sub);margin-top:2px">Sincronizar desde Google Sheets</div>
        </div>
        <button onclick="document.getElementById('plan-sync-ov').remove()" style="background:none;border:1px solid var(--border);border-radius:8px;width:30px;height:30px;cursor:pointer;color:var(--sub);font-size:18px;line-height:1;display:flex;align-items:center;justify-content:center;flex-shrink:0">×</button>
      </div>
      <div style="padding:18px 22px;display:flex;flex-direction:column;gap:14px">
        ${current ? `
          <div style="padding:10px 12px;background:rgba(232,255,0,.06);border:1px solid rgba(232,255,0,.2);border-radius:10px;font-size:12px;color:var(--text)">
            ✓ Plan activo — ${Object.keys(current.byDay||{}).length} días · semana ${curWeek}/${current.weeks||6}
            ${lastSyncFmt ? `<div style="font-size:11px;color:var(--sub);margin-top:3px">Última sync: ${lastSyncFmt}</div>` : ''}
          </div>
        ` : ''}
        <div>
          <div style="font-size:10px;font-weight:700;letter-spacing:.1em;color:var(--sub);text-transform:uppercase;margin-bottom:6px">URL del Google Sheet</div>
          <input id="ps-url" type="text" placeholder="https://docs.google.com/spreadsheets/d/..."
            value="${current?.sheetUrl || ''}"
            style="width:100%;background:var(--surf2);border:1px solid var(--border);border-radius:10px;padding:10px 13px;font-size:13px;color:var(--text);font-family:inherit;outline:none;box-sizing:border-box">
          <div style="font-size:11px;color:var(--sub);margin-top:6px">El Sheet tiene que estar compartido como "Cualquiera con el link puede ver"</div>
        </div>
        <div style="display:flex;gap:12px">
          <div style="flex:1">
            <div style="font-size:10px;font-weight:700;letter-spacing:.1em;color:var(--sub);text-transform:uppercase;margin-bottom:6px">Inicio del bloque</div>
            <input id="ps-start" type="date"
              value="${current?.startDate || new Date().toISOString().slice(0,10)}"
              style="width:100%;background:var(--surf2);border:1px solid var(--border);border-radius:10px;padding:10px 13px;font-size:13px;color:var(--text);font-family:inherit;outline:none;box-sizing:border-box">
          </div>
          <div style="flex:0 0 100px">
            <div style="font-size:10px;font-weight:700;letter-spacing:.1em;color:var(--sub);text-transform:uppercase;margin-bottom:6px">Días</div>
            <input id="ps-days" type="number" min="1" max="7"
              value="${current?.days || 5}"
              style="width:100%;background:var(--surf2);border:1px solid var(--border);border-radius:10px;padding:10px 13px;font-size:13px;color:var(--text);font-family:inherit;outline:none;box-sizing:border-box;text-align:center">
          </div>
        </div>
        <div id="ps-log" style="display:none;padding:10px 12px;background:var(--surf2);border:1px solid var(--border);border-radius:10px;font-size:12px;color:var(--sub);max-height:120px;overflow-y:auto;font-family:monospace"></div>
      </div>
      <div style="padding:0 22px 20px;display:flex;gap:8px">
        <button onclick="document.getElementById('plan-sync-ov').remove()" style="flex:1;padding:10px 0;background:none;border:1px solid var(--border);border-radius:10px;color:var(--sub);font-size:13px;font-weight:600;cursor:pointer;font-family:inherit">Cerrar</button>
        <button id="ps-sync-btn" onclick="runPlanSync('${athId}')" style="flex:2;padding:10px 0;background:var(--acc);border:none;border-radius:10px;color:#000;font-size:13px;font-weight:800;cursor:pointer;font-family:inherit">Sincronizar plan</button>
      </div>
    </div>`;
}

async function runPlanSync(athId){
  const url   = document.getElementById('ps-url')?.value.trim();
  const start = document.getElementById('ps-start')?.value;
  const days  = parseInt(document.getElementById('ps-days')?.value) || 5;
  const log   = document.getElementById('ps-log');
  const btn   = document.getElementById('ps-sync-btn');

  if(!url){ toast('⚠ Pegá el URL del Sheet'); return; }
  if(!ssExtractSheetId(url)){ toast('⚠ URL inválido'); return; }

  if(log){ log.style.display = 'block'; log.innerHTML = '⏳ Leyendo Sheet…'; }
  if(btn){ btn.textContent = 'Sincronizando…'; btn.disabled = true; }

  try {
    const plan = await ssSyncAthlete(athId, url, start, days);
    const a = athletes.find(x => x.id === athId);

    // Importar sesiones históricas
    if(log) log.innerHTML += '<br>⏳ Importando historial de cargas…';
    const imported = await ssImportSessions(athId, a?.name || athId, plan);

    const dayList = Object.keys(plan.byDay).map(d => {
      const cnt = plan.byDay[d].length;
      const withData = plan.byDay[d].filter(ex => Object.keys(ex.actualByWeek||{}).length > 0).length;
      return `  ✓ ${d} — ${cnt} ejercicios${withData ? ` (${withData} con cargas)` : ''}`;
    }).join('\n');

    const importLine = imported > 0
      ? `\n\n📊 ${imported} sesiones históricas importadas a Firebase`
      : '\n\n📊 Sin cargas nuevas para importar';

    if(log) log.innerHTML = `<pre style="margin:0;white-space:pre-wrap;font-size:11px">✅ Plan de ${a?.name} sincronizado:\n\n${dayList}\n\nSemana actual: ${ssCurrentWeek(plan.startDate, plan.weeks)}/${plan.weeks}${importLine}</pre>`;
    if(btn){ btn.textContent = 'Re-sincronizar'; btn.disabled = false; }
    toast(`✅ Plan de ${a?.name} sincronizado${imported > 0 ? ` · ${imported} sesiones importadas` : ''}`);
  } catch(e){
    if(log) log.innerHTML = `<span style="color:#ef4444">❌ ${e.message}</span>`;
    if(btn){ btn.textContent = 'Sincronizar plan'; btn.disabled = false; }
    toast('❌ Error al sincronizar');
  }
}
