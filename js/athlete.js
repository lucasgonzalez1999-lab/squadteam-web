// ═══════════════════════════════════════════
// SQUAD TEAM — Athlete View
// 3 tabs: Hoy | Progreso | Dieta
// Extremely simple, one action at a time
// ═══════════════════════════════════════════

function renderAthHoy(id){
  const a=getAth(id);const ss=getAthSessions(id).sort((a,b)=>new Date(b.date)-new Date(a.date));
  const cont=document.getElementById('ath-hoy');if(!cont)return;
  const color=a?.color||'var(--acc)';
  const streak=getStreak(id);
  const checkin=DB.get('checkin_'+id+'_'+today());
  const hasToday=ss.length&&ss[0].date===today();
  let html='';

  // ── LIVE SESSION BANNER ──
  const liveSession = window._liveSession;
  if(liveSession && liveSession.status==='active'){
    const ex = liveSession.plan?.[liveSession.exerciseIndex];
    const sets = liveSession.sets||[];
    html+=`<div style="background:#000;border-radius:var(--radius);padding:16px;margin-bottom:var(--s2);border:2px solid ${color};animation:pulse 2s infinite">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px">
        <div style="width:8px;height:8px;border-radius:50%;background:${color};animation:pulse 1s infinite"></div>
        <div style="font-size:12px;font-weight:700;color:${color};letter-spacing:2px">ENTRENO EN VIVO</div>
        <div style="font-size:11px;color:rgba(255,255,255,0.4);margin-left:auto">${liveSession.dia}</div>
      </div>
      ${ex?`<div style="font-size:18px;font-weight:800;color:#fff;margin-bottom:6px">${ex.name}</div>
      <div style="font-size:13px;color:rgba(255,255,255,0.5)">${ex.series} × ${ex.reps} · ${ex.rir}</div>`:
      '<div style="color:rgba(255,255,255,0.5);font-size:13px">Cargando...</div>'}
      ${sets.length?`<div style="margin-top:10px;display:flex;gap:6px;flex-wrap:wrap">
        ${sets.filter(s=>s.exName===ex?.name).map(s=>`<span style="background:${color}22;color:${color};padding:4px 10px;border-radius:99px;font-size:12px;font-weight:600">${s.kg}kg×${s.reps}</span>`).join('')}
      </div>`:''}
    </div>`;
  }

  // ── STREAK + CALENDAR ── compact card
  const sc=streak>=8?'var(--acc)':streak>=4?'var(--orange)':streak>=1?'var(--text)':'var(--sub2)';
  const streakLabel=streak===0?'Empezá hoy':streak===1?'Primer día 🌱':streak+'🔥';
  const trained=new Set(ss.map(s=>s.date));
  let calHtml='';
  for(let i=27;i>=0;i--){const d=new Date();d.setDate(d.getDate()-i);const dk=d.toISOString().split('T')[0];calHtml+=`<div class="hday ${trained.has(dk)?'trained':''} ${dk===today()?'today':''}"></div>`;}

  html+=`<div style="background:var(--surf);border:1px solid var(--border);border-radius:var(--radius);padding:14px 16px;margin-bottom:var(--s2);box-shadow:var(--shadow)">
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">
      <div style="display:flex;align-items:center;gap:8px">
        <div style="font-size:22px;font-weight:800;color:${sc}">${streak>0?streak+'🔥':'—'}</div>
        <div style="font-size:12px;color:var(--sub)">${streak===1?'día seguido':streak>1?'días seguidos':'Sin racha activa'}</div>
      </div>
      <div style="font-size:11px;color:var(--sub2)">Últimos 28 días</div>
    </div>
    <div class="habit-cal">${calHtml}</div>
  </div>`;

  // ── TODAY indicator (compact, no card) ──
  if(hasToday){
    const last=ss[0];const v=calcVol(last);
    html+=`<div style="display:flex;align-items:center;gap:8px;padding:10px 14px;background:var(--acc-light);border-radius:var(--radius-sm);margin-bottom:var(--s2);border:1px solid var(--acc-mid)">
      <span style="font-size:16px">✓</span>
      <div style="font-size:13px;font-weight:600;color:var(--acc)">Entrenaste hoy</div>
      <div style="font-size:12px;color:var(--sub);margin-left:4px">· ${last.name}</div>
    </div>`;
  } else {
    const myTpls=templates.filter(t=>t.exercises?.length>0);
    if(myTpls.length){
      html+=`<div class="section-card" style="margin-bottom:var(--s2)">
        <div style="padding:14px 16px 0">
          <div style="font-size:13px;font-weight:700;margin-bottom:10px">¿Qué entrenás hoy?</div>`;
      myTpls.slice(0,3).forEach(t=>{
        html+=`<button class="tpl-option" onclick="athStartLive('${id}','${t.id}')"><span class="tpl-option-name">${t.name}</span><span class="tpl-option-meta">${t.exercises.length} ej. ›</span></button>`;
      });
      html+=`</div></div>`;
    }
  }

  // ── LAST SESSIONS ──
  if(ss.length){
    html+=`<div class="section-card" style="margin-top:var(--s2)">
      <div class="section-head"><div class="section-title">Últimas sesiones</div></div>`;
    ss.slice(0,4).forEach(s=>{
      const v=calcVol(s);const prc=s.exercises.reduce((n,e)=>n+e.sets.filter(st=>st.pr).length,0);
      html+=`<div class="feed-item" style="padding:10px 16px;border-bottom:1px solid var(--border)">
        <div style="width:34px;height:34px;border-radius:50%;background:${color}22;color:${color};display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:700;flex-shrink:0">${s.exercises.length}</div>
        <div style="flex:1"><div style="font-size:13px;font-weight:600">${s.name||'Sesión'}</div>
          <div style="font-size:11px;color:var(--sub)">${fmtDate(s.date)} · ${v} kg${prc?' · '+prc+' PR 🏆':''}</div></div>
      </div>`;
    });
    html+=`</div>`;
  }

  cont.innerHTML=html;
}


function renderAthProgreso(id){
  const a=getAth(id);const ss=getAthSessions(id).sort((a,b)=>new Date(b.date)-new Date(a.date));
  const cont=document.getElementById('ath-progreso');if(!cont)return;
  const color=a?.color||'#16a34a';
  const total=ss.length,prs=getPRs(id),vol=ss.reduce((s,x)=>s+calcVol(x),0),streak=getStreak(id);
  let html='';

  // EXPORT BUTTON
  html+=`<button onclick="exportProgressCard('${id}')" class="btn btn-acc btn-full" style="margin-bottom:20px;display:flex;align-items:center;justify-content:center;gap:8px">
    <span style="font-size:18px">📸</span> Compartir mi progreso
  </button>`;

  // HERO STATS
  html+=`<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:16px">
    <div class="prog-stat-card" style="flex-direction:column;align-items:center;text-align:center;padding:12px 8px">
      <div style="font-size:22px;margin-bottom:4px">🏋️</div>
      <div class="prog-stat-val" style="color:${color};font-size:22px">${total}</div>
      <div class="prog-stat-lbl" style="font-size:9px">Sesiones</div>
    </div>
    <div class="prog-stat-card" style="flex-direction:column;align-items:center;text-align:center;padding:12px 8px">
      <div style="font-size:22px;margin-bottom:4px">🏆</div>
      <div class="prog-stat-val" style="color:#ca8a04;font-size:22px">${prs}</div>
      <div class="prog-stat-lbl" style="font-size:9px">PRs</div>
    </div>
    <div class="prog-stat-card" style="flex-direction:column;align-items:center;text-align:center;padding:12px 8px">
      <div style="font-size:22px;margin-bottom:4px">🔥</div>
      <div class="prog-stat-val" style="color:#ea580c;font-size:22px">${streak}</div>
      <div class="prog-stat-lbl" style="font-size:9px">Racha</div>
    </div>
    <div class="prog-stat-card" style="flex-direction:column;align-items:center;text-align:center;padding:12px 8px">
      <div style="font-size:22px;margin-bottom:4px">📦</div>
      <div class="prog-stat-val" style="color:#2563eb;font-size:22px">${vol>999?(vol/1000).toFixed(1)+'k':vol}</div>
      <div class="prog-stat-lbl" style="font-size:9px">Vol kg</div>
    </div>
  </div>`;

  if(!total){html+=`<div class="empty"><div class="ei">📭</div><p>Todavía no hay sesiones.</p></div>`;cont.innerHTML=html;return;}

  // VOLUMEN SEMANAL
  const weeklyVols=[],weeklyLabels=[];
  for(let w=7;w>=0;w--){
    const from=new Date();from.setDate(from.getDate()-w*7-6);
    const to=new Date();to.setDate(to.getDate()-w*7);
    const wVol=ss.filter(s=>{const d=new Date(s.date+'T12:00:00');return d>=from&&d<=to;}).reduce((n,s)=>n+calcVol(s),0);
    weeklyVols.push(wVol);
    weeklyLabels.push(to.toLocaleDateString('es-UY',{day:'2-digit',month:'short'}));
  }
  const maxVol=Math.max(...weeklyVols,1);
  html+=`<div class="section-card" style="margin-bottom:16px;overflow:hidden">
    <div class="section-head"><div><div class="section-title">📊 Volumen semanal</div><div class="section-sub">Últimas 8 semanas</div></div></div>
    <div style="padding:0 16px 16px">
      <div style="display:flex;align-items:flex-end;gap:3px;height:72px;margin-bottom:6px">
        ${weeklyVols.map((v,i)=>{
          const h=Math.max(4,Math.round(v/maxVol*88));
          return `<div style="flex:1;display:flex;flex-direction:column;align-items:center">
            <div style="width:100%;height:${h}px;background:${i===7?color:color+'44'};border-radius:4px 4px 0 0" title="${v} kg"></div>
          </div>`;
        }).join('')}
      </div>
      <div style="display:flex;gap:4px">
        ${weeklyLabels.map((l,i)=>`<div style="flex:1;font-size:8px;color:var(--sub);text-align:center;overflow:hidden;white-space:nowrap">${i%2===0?l:''}</div>`).join('')}
      </div>
    </div>
  </div>`;

  // MEJORAS
  const imps=[];
  const exAll=new Set(ss.flatMap(s=>s.exercises.map(e=>e.name)));
  exAll.forEach(ex=>{
    const ws=ss.map(s=>{const e=s.exercises.find(x=>x.name===ex);return e?Math.max(0,...e.sets.filter(st=>st.kg>0).map(st=>st.kg)):0;}).filter(w=>w>0);
    if(ws.length<2)return;
    const first=ws[ws.length-1],last=ws[0];
    if(last>first)imps.push({name:ex,from:first,to:last,pct:Math.round((last-first)/first*100)});
  });
  imps.sort((a,b)=>b.pct-a.pct);
  if(imps.length){
    html+=`<div class="section-card" style="margin-bottom:16px">
      <div class="section-head"><div><div class="section-title">📈 Mejoras registradas</div></div></div>
      <div>`;
    imps.slice(0,5).forEach(({name,from,to,pct},i)=>{
      const barW=Math.min(100,pct*2);
      html+=`<div style="padding:12px 16px;border-bottom:${i<4?'1px solid var(--border)':'none'}">
        <div style="display:flex;justify-content:space-between;margin-bottom:6px">
          <div style="font-size:13px;font-weight:600">${name.split(' ').slice(0,3).join(' ')}</div>
          <div style="font-size:18px;font-weight:800;color:var(--acc)">+${pct}%</div>
        </div>
        <div style="display:flex;align-items:center;gap:8px">
          <div style="flex:1;height:6px;background:var(--border);border-radius:99px;overflow:hidden">
            <div style="width:${barW}%;height:100%;background:linear-gradient(90deg,#bbf7d0,#16a34a);border-radius:99px"></div>
          </div>
          <div style="font-size:11px;color:var(--sub);white-space:nowrap">${from}kg → <strong>${to}kg</strong></div>
        </div>
      </div>`;
    });
    html+=`</div></div>`;
    const top=imps[0];
    if(top&&ss.length>=3){
      const rw=ss.slice(0,3).map(s=>{const e=s.exercises.find(x=>x.name===top.name);return e?Math.max(0,...e.sets.filter(st=>st.kg>0).map(st=>st.kg)):0;}).filter(w=>w>0);
      if(rw.length>=2){const g=(rw[0]-rw[rw.length-1])/rw.length;const proj=Math.round((rw[0]+g*4)*4)/4;if(proj>rw[0])html+=`<div class="projection" style="margin-bottom:16px">📈 A este ritmo, en 4 semanas podrías llegar a <b>${proj}kg</b> en ${top.name.split(' ').slice(0,2).join(' ')}.</div>`;}
    }
  }

  // GRÁFICA POR EJERCICIO
  const exFreq={};ss.forEach(s=>s.exercises.forEach(e=>{exFreq[e.name]=(exFreq[e.name]||0)+1;}));
  const topExes=Object.keys(exFreq).sort((a,b)=>exFreq[b]-exFreq[a]).slice(0,5);
  if(topExes.length){
    html+=`<div class="section-card" style="margin-bottom:16px">
      <div class="section-head"><div><div class="section-title">📉 Evolución por ejercicio</div></div></div>
      <div style="padding:0 16px 16px">
        <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:12px" id="prog-ex-sel">
          ${topExes.map((ex,i)=>`<button onclick="selectProgEx(this,'${ex.replace(/'/g,"\\'")}','${id}','${color}')" class="prog-ex-chip ${i===0?'on':''}">${ex.split(' ').slice(0,2).join(' ')}</button>`).join('')}
        </div>
        <canvas id="prog-ex-chart" height="150" style="width:100%"></canvas>
        <div style="font-size:11px;color:var(--sub);margin-top:6px;text-align:center" id="prog-ex-label"></div>
      </div>
    </div>`;
  }

  // TIMELINE
  html+=`<div class="section-card">
    <div class="section-head"><div><div class="section-title">🗓 Historial</div></div></div>
    <div>`;
  ss.slice(0,6).forEach((s,i)=>{
    const v=calcVol(s);const prc=s.exercises.reduce((n,e)=>n+e.sets.filter(st=>st.pr).length,0);
    const last=i===Math.min(5,ss.length-1);
    html+=`<div style="display:flex;gap:12px;padding:12px 16px;border-bottom:${last?'none':'1px solid var(--border)'} ">
      <div style="display:flex;flex-direction:column;align-items:center;flex-shrink:0;padding-top:3px">
        <div style="width:10px;height:10px;border-radius:50%;background:${prc?'var(--acc)':'var(--border2)'}"></div>
        ${!last?'<div style="width:2px;flex:1;background:var(--border);margin-top:3px;margin-bottom:-3px"></div>':''} 
      </div>
      <div style="flex:1;min-width:0;padding-bottom:${!last?'4px':'0'}">
        <div style="font-size:13px;font-weight:600">${s.name||'Sesión'} ${prc?'🏆':''}</div>
        <div style="font-size:11px;color:var(--sub);margin-top:2px">${fmtDate(s.date)} · ${v} kg · ${s.exercises.length} ejercicios${prc?' · '+prc+' PR':''}</div>
      </div>
    </div>`;
  });
  html+=`</div></div>`;

  cont.innerHTML=html;
  if(topExes.length) setTimeout(()=>{const btn=document.querySelector('.prog-ex-chip.on');if(btn)selectProgEx(btn,topExes[0],id,color);},80);
}

function selectProgEx(btn,exName,id,color){
  document.querySelectorAll('.prog-ex-chip').forEach(b=>b.classList.remove('on'));
  if(btn)btn.classList.add('on');
  const ss=getAthSessions(id).sort((a,b)=>new Date(b.date)-new Date(a.date));
  const cd=[],cl=[];
  [...ss].reverse().forEach(s=>{
    const ex=s.exercises.find(e=>e.name===exName);
    if(!ex)return;
    const mx=Math.max(0,...ex.sets.filter(st=>st.kg>0).map(st=>st.kg));
    if(mx){cd.push(mx);cl.push(fmtDateShort(s.date));}
  });
  const cv=document.getElementById('prog-ex-chart');
  if(cv&&cd.length>=2){
    linechart(cv,cl,cd,color);
    const lbl=document.getElementById('prog-ex-label');
    if(lbl){const best=Math.max(...cd),first=cd[0];const pct=first>0?Math.round((best-first)/first*100):0;lbl.textContent=`${exName.split(' ').slice(0,3).join(' ')} · Mejor: ${best}kg${pct>0?' · +'+pct+'% de mejora':''}`;}
  }
}

function renderAthDieta(id){
  const diet = DB.get('diet_'+id);
  const cont = document.getElementById('ath-dieta'); if(!cont) return;
  if(!diet?.meals?.length){
    cont.innerHTML=`<div class="empty"><div class="ei">🥗</div><p>Tu dieta no está cargada aún.<br>Tu entrenador la va a subir pronto.</p></div>`;
    return;
  }

  // Load today's food log
  const log = DB.get('foodlog_'+id+'_'+today()) || {foods:[], kcal:0, prot:0, carbs:0, fat:0};
  const targets = {
    kcal: parseFloat(diet.kcal)||0,
    prot: parseFloat(diet.prot)||0,
    carbs:parseFloat(diet.carbs)||0,
    fat:  parseFloat(diet.fat)||0,
  };

  // ── HEADER ──
  let html = `<div style="margin-bottom:12px">
    <div class="label" style="margin-bottom:2px">${diet.name||'Tu dieta'}</div>
    <div style="font-size:11px;color:var(--sub)">Tocá 📸 en cada comida para exportar el overlay de Instagram</div>
  </div>`;

  // ── MACRO SEMÁFORO ──
  html += `<div class="iifym-semaforo">`;
  const macros = [
    {key:'kcal', label:'Kcal', color:'var(--acc)',    consumed:log.kcal,  target:targets.kcal,  unit:''},
    {key:'prot', label:'Prot', color:'var(--blue)',   consumed:log.prot,  target:targets.prot,  unit:'g'},
    {key:'carbs',label:'Carbs',color:'var(--orange)', consumed:log.carbs, target:targets.carbs, unit:'g'},
    {key:'fat',  label:'Grasas',color:'var(--yellow)',consumed:log.fat,   target:targets.fat,   unit:'g'},
  ];
  macros.forEach(m=>{
    const pct = m.target>0 ? Math.min(100,Math.round(m.consumed/m.target*100)) : 0;
    const remaining = Math.max(0, Math.round((m.target - m.consumed)*10)/10);
    const over = m.consumed > m.target*1.05;
    const statusColor = over ? 'var(--red)' : pct>=90 ? 'var(--yellow)' : m.color;
    html += `<div class="iifym-macro-bar">
      <div class="imb-head">
        <span class="imb-label">${m.label}</span>
        <span class="imb-vals">
          <strong style="color:${statusColor}">${Math.round(m.consumed*10)/10}${m.unit}</strong>
          <span style="color:var(--sub)"> / ${m.target}${m.unit}</span>
        </span>
      </div>
      <div class="imb-track">
        <div class="imb-fill" style="width:${pct}%;background:${statusColor}"></div>
      </div>
      <div class="imb-remain" style="color:${over?'var(--red)':'var(--sub)'}">
        ${over ? '⚠ '+Math.round((m.consumed-m.target)*10)/10+m.unit+' sobre el objetivo' : remaining+m.unit+' restantes hoy'}
      </div>
    </div>`;
  });
  html += `</div>`;

  // ── MODO FLEXIBLE — solo si habilitado por el coach ──
  if(getAthFeature(id,'iifym')){
  html += `<div class="iifym-add-section">
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">
      <div>
        <div style="font-size:14px;font-weight:700">🔄 Modo flexible</div>
        <div style="font-size:11px;color:var(--sub);margin-top:1px">Comé lo que quieras dentro de tus macros</div>
      </div>
      <button class="btn btn-ghost btn-sm" onclick="clearFoodLog('${id}')">Limpiar día</button>
    </div>
    <div style="display:flex;gap:8px;margin-bottom:8px">
      <input class="iifym-search-inp" id="iifym-search" type="text"
        placeholder="Buscar alimento... (ej: banana, arroz, yogur)"
        onkeydown="if(event.key==='Enter')iifymSearch('${id}')">
      <button class="btn btn-acc btn-sm" onclick="iifymSearch('${id}')">Buscar</button>
    </div>
    <div id="iifym-results"></div>
  </div>`;

  // ── TODAY'S LOG ──
  if(log.foods?.length){
    html += `<div class="section-card" style="margin-bottom:16px">
      <div class="section-head"><div class="section-title">📋 Lo que comiste hoy</div></div>
      <div>`;
    log.foods.forEach((f,fi)=>{
          html += `<div class="iifym-log-item" id="logitem-${fi}">
        <div style="flex:1;min-width:0">
          <div style="font-size:13px;font-weight:600">${f.name}</div>
          <div style="font-size:11px;color:var(--sub);margin-top:2px;font-family:var(--F-m)">${f.qty}g · ${f.kcal} kcal · P:${f.prot}g C:${f.carbs}g G:${f.fat}g</div>
        </div>
        <div style="display:flex;align-items:center;gap:6px;flex-shrink:0">
          <button onclick="exportMealStory('${id}',${fi})"
            style="background:var(--acc-light);border:1px solid var(--acc-mid);border-radius:6px;padding:5px 10px;font-size:11px;font-weight:600;color:var(--acc);cursor:pointer;white-space:nowrap;-webkit-tap-highlight-color:transparent">
            📸 Story
          </button>
          <button onclick="removeFoodLog('${id}',${fi})"
            style="background:none;border:none;color:var(--sub2);font-size:18px;cursor:pointer;padding:0 2px">✕</button>
        </div>
      </div>`;
    });
    html += `</div></div>`;
  }

  // ── CALCULADORA DE SUSTITUCIONES ──
  html += `<div class="section-card" style="margin-bottom:16px">
    <div class="section-head">
      <div>
        <div class="section-title">⚖️ ¿No tenés un alimento?</div>
        <div class="section-sub">Calculá cuánto necesitás de otro para los mismos macros</div>
      </div>
    </div>
    <div style="padding:0 16px 16px">
      <div style="display:flex;gap:8px;margin-bottom:8px">
        <input class="iifym-search-inp" id="sub-from" placeholder="Alimento original (ej: avena)"
          onkeydown="if(event.key==='Enter')searchSubstitute()">
        <span style="display:flex;align-items:center;font-size:18px">→</span>
        <input class="iifym-search-inp" id="sub-to" placeholder="Sustituto (ej: arroz)">
      </div>
      <div style="display:flex;gap:8px;margin-bottom:8px">
        <input type="number" id="sub-qty" placeholder="Cantidad (g)" min="1" max="1000" value="100"
          style="width:120px;background:var(--bg);border:1px solid var(--border);border-radius:var(--radius-sm);color:var(--text);padding:8px 10px;font-size:13px;outline:none">
        <button class="btn btn-acc" style="flex:1" onclick="calcSubstitute()">Calcular equivalencia</button>
      </div>
      <div id="sub-result"></div>
    </div>
  </div>`;

  // ── DIETA PLANIFICADA (colapsable) ──
  html += `<div class="section-card" style="margin-bottom:16px">
    <div class="section-head" style="cursor:pointer" onclick="this.nextElementSibling.classList.toggle('hidden')">
      <div><div class="section-title">📅 Plan del día</div><div class="section-sub">Dieta sugerida por tu coach</div></div>
      <span style="color:var(--sub);font-size:12px">▼</span>
    </div>
    <div>
      <div class="macro-row" style="padding:0 16px;margin-top:8px">
        <div class="macro-cell m-kcal"><div class="mv">${diet.kcal||'—'}</div><div class="ml">kcal</div></div>
        <div class="macro-cell m-prot"><div class="mv">${diet.prot||'—'}g</div><div class="ml">prot</div></div>
        <div class="macro-cell m-carbs"><div class="mv">${diet.carbs||'—'}g</div><div class="ml">carbos</div></div>
        <div class="macro-cell m-fat"><div class="mv">${diet.fat||'—'}g</div><div class="ml">grasa</div></div>
      </div>
      ${diet.meals.map((m,mi)=>`
        <div class="meal-item" style="margin:0 16px 6px;margin-top:0">
          <div class="meal-head" onclick="this.nextElementSibling.classList.toggle('open');this.querySelector('.meal-arrow').style.transform=this.nextElementSibling.classList.contains('open')?'rotate(180deg)':''">
            <span class="meal-time">${m.time||'—'}</span>
            <span class="meal-name">${m.name||'Comida'}</span>
            <span class="meal-kcal">${m.kcal?m.kcal+' kcal':''}</span>
            <button onclick="event.stopPropagation();exportPlanMeal('${id}',${mi})"
              style="background:var(--acc);color:#000;border:none;border-radius:6px;padding:3px 10px;font-size:11px;font-weight:700;cursor:pointer;flex-shrink:0;-webkit-tap-highlight-color:transparent">📸</button>
            <span class="meal-arrow" style="transition:transform .2s">▼</span>
          </div>
          <div class="meal-body" style="display:none;white-space:pre-line;padding:10px 16px;font-size:12px;color:var(--text2);line-height:1.8;border-top:1px solid var(--border)">${m.foods||''}</div>
        </div>`).join('')}
      ${diet.notes?`<div style="margin:8px 16px 12px;border-left:2px solid var(--acc);padding:8px 12px;font-size:12px;color:var(--sub);line-height:1.7">📌 ${diet.notes}</div>`:''}
    </div>
  </div>`;

  // ── ALIMENTOS FAVORITOS ──
  const favs = DB.get('foodfavs_'+id) || [];
  if(favs.length){
    html += `<div class="section-card">
      <div class="section-head"><div class="section-title">⭐ Mis favoritos</div></div>
      <div style="padding:0 16px 12px;display:flex;flex-wrap:wrap;gap:6px">
        ${favs.map((f,fi)=>`<button class="iifym-fav-chip" onclick="addFavToLog('${id}',${fi})">
          ${f.name.split(' ').slice(0,2).join(' ')} · ${f.kcalPer100} kcal/100g
        </button>`).join('')}
      </div>
    </div>`;
  }

  } // end iifym check
  cont.innerHTML = html;
}


// ── BASE DE ALIMENTOS OFFLINE (fallback cuando la API no responde) ──
const FOOD_DB_OFFLINE = [
  {name:'Avena',            kcal:389, prot:17,  carbs:66, fat:7},
  {name:'Arroz blanco',     kcal:365, prot:7,   carbs:80, fat:1},
  {name:'Arroz integral',   kcal:350, prot:8,   carbs:73, fat:3},
  {name:'Pollo pechuga',    kcal:165, prot:31,  carbs:0,  fat:4},
  {name:'Huevo entero',     kcal:155, prot:13,  carbs:1,  fat:11},
  {name:'Clara de huevo',   kcal:52,  prot:11,  carbs:1,  fat:0},
  {name:'Banana',           kcal:89,  prot:1,   carbs:23, fat:0},
  {name:'Manzana',          kcal:52,  prot:0,   carbs:14, fat:0},
  {name:'Pan integral',     kcal:265, prot:9,   carbs:49, fat:4},
  {name:'Pan blanco',       kcal:265, prot:8,   carbs:53, fat:3},
  {name:'Pasta',            kcal:371, prot:13,  carbs:75, fat:2},
  {name:'Boniato',          kcal:86,  prot:2,   carbs:20, fat:0},
  {name:'Papa',             kcal:77,  prot:2,   carbs:17, fat:0},
  {name:'Lenteja',          kcal:352, prot:25,  carbs:60, fat:1},
  {name:'Garbanzos',        kcal:364, prot:19,  carbs:61, fat:6},
  {name:'Atún en agua',     kcal:130, prot:29,  carbs:0,  fat:1},
  {name:'Salmón',           kcal:208, prot:20,  carbs:0,  fat:13},
  {name:'Carne vacuna',     kcal:250, prot:26,  carbs:0,  fat:16},
  {name:'Queso cottage',    kcal:98,  prot:11,  carbs:3,  fat:4},
  {name:'Yogur griego',     kcal:97,  prot:9,   carbs:4,  fat:5},
  {name:'Leche entera',     kcal:61,  prot:3,   carbs:5,  fat:3},
  {name:'Leche descremada', kcal:34,  prot:3,   carbs:5,  fat:0},
  {name:'Manteca de maní',  kcal:588, prot:25,  carbs:20, fat:50},
  {name:'Almendras',        kcal:579, prot:21,  carbs:22, fat:50},
  {name:'Aceite de oliva',  kcal:884, prot:0,   carbs:0,  fat:100},
  {name:'Brócoli',          kcal:34,  prot:3,   carbs:7,  fat:0},
  {name:'Espinaca',         kcal:23,  prot:3,   carbs:4,  fat:0},
  {name:'Zanahoria',        kcal:41,  prot:1,   carbs:10, fat:0},
  {name:'Tomate',           kcal:18,  prot:1,   carbs:4,  fat:0},
  {name:'Proteína whey',    kcal:400, prot:80,  carbs:8,  fat:5},
];

function searchFoodOffline(q){
  const ql = q.toLowerCase();
  return FOOD_DB_OFFLINE.filter(f=>f.name.toLowerCase().includes(ql)).slice(0,5);
}


// ── IIFYM SEARCH ──
async function iifymSearch(athId){
  const inp = document.getElementById('iifym-search');
  const res = document.getElementById('iifym-results');
  if(!inp||!res) return;
  const q = inp.value.trim(); if(!q){ toast('Escribí un alimento'); return; }
  res.innerHTML = `<div class="iifym-searching">🔍 Buscando "${q}"...</div>`;
  try{
    let data;
    try{
      const url1=`https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(q)}&search_simple=1&action=process&json=1&page_size=6&fields=product_name,nutriments,brands&lc=es`;
      const r=await Promise.race([
        fetch(url1,{headers:{'User-Agent':'SQUAD TEAM App'},mode:'cors'}),
        new Promise((_,rej)=>setTimeout(()=>rej(new Error('timeout')),5000))
      ]);
      data=await r.json();
    }catch(apiErr){
      // Fallback to offline DB
      const offline=searchFoodOffline(q);
      if(offline.length){
        res.innerHTML=`<div style="font-size:10px;color:var(--sub);padding:4px 0;font-family:var(--F-m)">📦 Base de datos local</div>`+
        offline.map((f,i)=>`<div class="iifym-result">
          <div style="flex:1;min-width:0">
            <div class="iifym-result-name">${f.name}</div>
            <div class="iifym-result-macros">
              <span style="color:var(--acc);font-weight:700">${f.kcal} kcal</span>
              <span style="color:var(--blue)">P ${f.prot}g</span>
              <span style="color:var(--orange)">C ${f.carbs}g</span>
              <span style="color:var(--yellow)">G ${f.fat}g</span>
              <span style="color:var(--sub2)">/ 100g</span>
            </div>
          </div>
          <div style="display:flex;flex-direction:column;align-items:flex-end;gap:6px;flex-shrink:0">
            <div style="display:flex;align-items:center;gap:4px">
              <input type="number" id="iifym-qty-${i}" value="100" min="1" max="2000" onclick="event.stopPropagation()"
                style="width:60px;background:var(--bg);border:1px solid var(--border);border-radius:6px;color:var(--text);font-size:12px;padding:4px 6px;text-align:center;outline:none;-webkit-appearance:none">
              <span style="font-size:11px;color:var(--sub)">g</span>
            </div>
            <div style="display:flex;gap:4px">
              <button class="btn btn-acc btn-sm" onclick="addToLog('${athId}','${'"'+f.name+'"'}',${f.kcal},${f.prot},${f.carbs},${f.fat},${i})">+ Agregar</button>
              <button onclick="saveFav('${athId}','${'"'+f.name+'"'}',${f.kcal},${f.prot},${f.carbs},${f.fat})"
                style="background:none;border:1px solid var(--border);border-radius:6px;padding:5px 8px;cursor:pointer;font-size:12px;color:var(--sub)">⭐</button>
            </div>
          </div>
        </div>`).join('');
        return;
      }
      throw apiErr;
    }
    const products = (data.products||[]).filter(p=>p.product_name&&p.nutriments&&(p.nutriments['energy-kcal_100g']||p.nutriments['energy-kcal'])).slice(0,5);
    if(!products.length){ res.innerHTML=`<div class="iifym-no-result">Sin resultados. Probá en inglés.</div>`; return; }
    res.innerHTML = products.map((p,i)=>{
      const n=p.nutriments;
      const kcal=Math.round(n['energy-kcal_100g']||n['energy-kcal']||0);
      const prot=Math.round((n['proteins_100g']||0)*10)/10;
      const carb=Math.round((n['carbohydrates_100g']||0)*10)/10;
      const fat=Math.round((n['fat_100g']||0)*10)/10;
      const name=p.product_name.slice(0,50);
      return `<div class="iifym-result">
        <div style="flex:1;min-width:0">
          <div class="iifym-result-name">${name}</div>
          <div class="iifym-result-macros">
            <span style="color:var(--acc);font-weight:700">${kcal} kcal</span>
            <span style="color:var(--blue)">P ${prot}g</span>
            <span style="color:var(--orange)">C ${carb}g</span>
            <span style="color:var(--yellow)">G ${fat}g</span>
            <span style="color:var(--sub2)">/ 100g</span>
          </div>
        </div>
        <div style="display:flex;flex-direction:column;align-items:flex-end;gap:6px;flex-shrink:0">
          <div style="display:flex;align-items:center;gap:4px">
            <input type="number" id="iifym-qty-${i}" value="100" min="1" max="2000"
              onclick="event.stopPropagation()"
              style="width:60px;background:var(--bg);border:1px solid var(--border);border-radius:6px;color:var(--text);font-size:12px;padding:4px 6px;text-align:center;outline:none;-webkit-appearance:none">
            <span style="font-size:11px;color:var(--sub)">g</span>
          </div>
          <div style="display:flex;gap:4px">
            <button class="btn btn-acc btn-sm" onclick="addToLog('${athId}','${name.replace(/'/g,"\\'")}',${kcal},${prot},${carb},${fat},${i})">+ Agregar</button>
            <button onclick="saveFav('${athId}','${name.replace(/'/g,"\\'")}',${kcal},${prot},${carb},${fat})"
              style="background:none;border:1px solid var(--border);border-radius:6px;padding:5px 8px;cursor:pointer;font-size:12px;color:var(--sub)" title="Guardar favorito">⭐</button>
          </div>
        </div>
      </div>`;
    }).join('');
  }catch(e){
    res.innerHTML=`<div class="iifym-no-result">Error de conexión.</div>`;
  }
}

function addToLog(athId, name, kcalP100, protP100, carbsP100, fatP100, idx){
  const qtyEl = document.getElementById('iifym-qty-'+idx);
  const qty = parseFloat(qtyEl?.value)||100;
  const log = DB.get('foodlog_'+athId+'_'+today()) || {foods:[], kcal:0, prot:0, carbs:0, fat:0};
  const food = {
    name, qty,
    kcal:  Math.round(kcalP100*qty/100),
    prot:  Math.round(protP100*qty/100*10)/10,
    carbs: Math.round(carbsP100*qty/100*10)/10,
    fat:   Math.round(fatP100*qty/100*10)/10,
    kcalPer100:kcalP100, protPer100:protP100, carbsPer100:carbsP100, fatPer100:fatP100,
  };
  log.foods.push(food);
  log.kcal  = Math.round(log.foods.reduce((s,f)=>s+f.kcal,0));
  log.prot  = Math.round(log.foods.reduce((s,f)=>s+f.prot,0)*10)/10;
  log.carbs = Math.round(log.foods.reduce((s,f)=>s+f.carbs,0)*10)/10;
  log.fat   = Math.round(log.foods.reduce((s,f)=>s+f.fat,0)*10)/10;
  DB.set('foodlog_'+athId+'_'+today(), log);
  if(window.db) fbSet('foodlogs', athId+'_'+today(), {...log, athId, date:today()});
  document.getElementById('iifym-search').value='';
  document.getElementById('iifym-results').innerHTML='';
  renderAthDieta(athId);
  toast('✓ '+name.split(' ').slice(0,2).join(' ')+' agregado al log');
}

function removeFoodLog(athId, fi){
  const log = DB.get('foodlog_'+athId+'_'+today()) || {foods:[]};
  log.foods.splice(fi,1);
  log.kcal  = Math.round(log.foods.reduce((s,f)=>s+f.kcal,0));
  log.prot  = Math.round(log.foods.reduce((s,f)=>s+f.prot,0)*10)/10;
  log.carbs = Math.round(log.foods.reduce((s,f)=>s+f.carbs,0)*10)/10;
  log.fat   = Math.round(log.foods.reduce((s,f)=>s+f.fat,0)*10)/10;
  DB.set('foodlog_'+athId+'_'+today(), log);
  renderAthDieta(athId);
}

function clearFoodLog(athId){
  sqConfirm({
    title:'¿Limpiar el registro de hoy?',
    body:'Se borrarán todos los alimentos registrados hoy.',
    confirmLabel:'Limpiar', danger:true,
    onConfirm:()=>{ DB.del('foodlog_'+athId+'_'+today()); renderAthDieta(athId); toast('Log del día limpiado'); }
  });
}

function saveFav(athId, name, kcalP100, protP100, carbsP100, fatP100){
  const favs = DB.get('foodfavs_'+athId) || [];
  if(favs.find(f=>f.name===name)){ toast('Ya está en favoritos'); return; }
  favs.push({name, kcalPer100:kcalP100, protPer100:protP100, carbsPer100:carbsP100, fatPer100:fatP100});
  DB.set('foodfavs_'+athId, favs);
  toast('⭐ '+name.split(' ').slice(0,2).join(' ')+' guardado');
  renderAthDieta(athId);
}

function addFavToLog(athId, fi){
  const favs = DB.get('foodfavs_'+athId)||[];
  const f = favs[fi]; if(!f) return;
  addToLog(athId, f.name, f.kcalPer100, f.protPer100, f.carbsPer100, f.fatPer100, 'fav');
}

// ── CALCULADORA DE SUSTITUCIONES ──
async function calcSubstitute(){
  const fromInp = document.getElementById('sub-from');
  const toInp   = document.getElementById('sub-to');
  const qtyInp  = document.getElementById('sub-qty');
  const resEl   = document.getElementById('sub-result');
  if(!fromInp||!toInp||!resEl) return;
  const fromQ = fromInp.value.trim();
  const toQ   = toInp.value.trim();
  const qty   = parseFloat(qtyInp?.value)||100;
  if(!fromQ||!toQ){ toast('Completá los dos campos'); return; }
  resEl.innerHTML=`<div class="iifym-searching">Calculando equivalencia...</div>`;
  try{
    const search = async(q)=>{
      // Try offline first
      const offline = searchFoodOffline(q);
      if(offline.length) return {name:offline[0].name, kcal:offline[0].kcal, prot:offline[0].prot, carbs:offline[0].carbs, fat:offline[0].fat};
      // Then try API
      try{
        const r=await Promise.race([
          fetch(`https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(q)}&search_simple=1&action=process&json=1&page_size=1&fields=product_name,nutriments`,
            {headers:{'User-Agent':'SQUAD TEAM App'},mode:'cors'}),
          new Promise((_,rej)=>setTimeout(()=>rej(new Error('timeout')),5000))
        ]);
        const d=await r.json();
        const p=d.products?.[0];
        if(!p) return null;
        const n=p.nutriments;
        return{name:p.product_name, kcal:n['energy-kcal_100g']||0, prot:n['proteins_100g']||0, carbs:n['carbohydrates_100g']||0, fat:n['fat_100g']||0};
      }catch(e){ return null; }
    };
    const [from, to] = await Promise.all([search(fromQ), search(toQ)]);
    if(!from){ resEl.innerHTML=`<div class="iifym-no-result">No encontré "${fromQ}"</div>`; return; }
    if(!to){   resEl.innerHTML=`<div class="iifym-no-result">No encontré "${toQ}"</div>`; return; }
    // Calculate: qty grams of "from" = ? grams of "to" (matching kcal)
    const fromKcal = from.kcal * qty/100;
    const toQty    = to.kcal > 0 ? Math.round(fromKcal / to.kcal * 100) : 0;
    const toKcal   = Math.round(to.kcal * toQty/100);
    const toProt   = Math.round(to.prot * toQty/100*10)/10;
    const toCarbs  = Math.round(to.carbs * toQty/100*10)/10;
    const toFat    = Math.round(to.fat * toQty/100*10)/10;
    resEl.innerHTML=`<div class="sub-result-card">
      <div class="sub-equiv">
        <div class="sub-side">
          <div class="sub-qty-big">${qty}g</div>
          <div class="sub-food-name">${from.name.slice(0,30)}</div>
          <div class="sub-macros-mini">${Math.round(fromKcal)} kcal</div>
        </div>
        <div class="sub-equals">=</div>
        <div class="sub-side sub-side-right">
          <div class="sub-qty-big" style="color:var(--acc)">${toQty}g</div>
          <div class="sub-food-name">${to.name.slice(0,30)}</div>
          <div class="sub-macros-mini">${toKcal} kcal · P:${toProt}g C:${toCarbs}g G:${toFat}g</div>
        </div>
      </div>
      <div style="font-size:11px;color:var(--sub);text-align:center;margin-top:8px">Equivalencia por calorías. Los macros pueden variar.</div>
    </div>`;
  }catch(e){
    resEl.innerHTML=`<div class="iifym-no-result">Sin conexión. Intentá de nuevo.</div>`;
  }
}

function athCheckin(id,val,btn){
  DB.set('checkin_'+id+'_'+today(),val);
  document.querySelectorAll('.checkin-btn').forEach(b=>{ b.classList.remove('sel-loaded','sel-normal','sel-heavy'); });
  btn.classList.add(val==='cargado'?'sel-loaded':val==='normal'?'sel-normal':'sel-heavy');
  if(window.db) fbSet('checkins',id+'_'+today(),{athId:id,date:today(),val});
  toast(val==='cargado'?'💪 Listo para entrenar!':val==='normal'?'👍 Jornada normal':'😮‍💨 Lo tenemos en cuenta');
}

function athStartLive(athId, tplId){
  curLive = athId;
  hideScreen('ath-page');
  showScreen('live-screen');
  lsStart(tplId);
}

function renderAthAchs(id){
  const stored=DB.get('ach_'+id)||{};
  const ss=getAthSessions(id);const total=ss.length;
  const cont=document.getElementById('ath-achs');if(!cont)return;
  const unlocked=ACHIEVEMENTS.filter(a=>stored[a.id]);
  const locked=ACHIEVEMENTS.filter(a=>!stored[a.id]);
  let html=`<div class="stat-card" style="border-left-color:var(--acc);margin-bottom:16px">
    <div class="stat-val" style="color:var(--acc)">${unlocked.length} / ${ACHIEVEMENTS.length}</div>
    <div class="stat-lbl">Logros desbloqueados</div>
  </div>`;
  if(unlocked.length){
    html+='<div class="label" style="margin-bottom:8px">Desbloqueados</div><div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:8px;margin-bottom:16px">';
    unlocked.forEach(a=>{html+=`<div class="card card-p" style="border-top:2px solid var(--acc);text-align:center"><div style="font-size:28px;margin-bottom:6px">${a.icon}</div><div style="font-family:'Barlow Condensed',sans-serif;font-size:12px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:var(--acc)">${a.name}</div><div style="font-size:9px;color:var(--sub);font-family:'Roboto Mono',monospace;margin-top:3px">${a.desc}</div></div>`;});
    html+='</div>';
  }
  if(locked.length){
    html+='<div class="label" style="margin-bottom:8px">Por desbloquear</div><div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:8px">';
    locked.forEach(a=>{const pct=getAchProgress(a,ss,total);html+=`<div class="card card-p" style="opacity:.35;text-align:center"><div style="font-size:28px;margin-bottom:6px">${a.icon}</div><div style="font-family:'Barlow Condensed',sans-serif;font-size:12px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase">${a.name}</div><div style="font-size:9px;color:var(--sub);font-family:'Roboto Mono',monospace;margin-top:3px">${a.desc}</div><div style="background:var(--border);height:2px;margin-top:8px;overflow:hidden"><div style="width:${pct}%;height:100%;background:var(--acc)"></div></div></div>`;});
    html+='</div>';
  }
  cont.innerHTML=html;
}

// ══════════════════════════════════════════
// EXPORTAR PROGRESO — Tarjeta para redes
// ══════════════════════════════════════════

let _exportAthId = '';

function exportProgressCard(id){
  _exportAthId = id;
  openModal('m-export');
  setTimeout(()=>drawProgressCard(id), 100);
}

function drawProgressCard(id){
  const a   = getAth(id); if(!a) return;
  const ss  = getAthSessions(id).sort((a,b)=>new Date(b.date)-new Date(a.date));
  const col = a.color || '#16a34a';
  const total   = ss.length;
  const prs     = getPRs(id);
  const streak  = getStreak(id);
  const vol     = ss.reduce((s,x)=>s+calcVol(x),0);
  const weekSess= getLastWeekSessions(id);

  // Best improvements
  const imps = [];
  const exAll = new Set(ss.flatMap(s=>s.exercises.map(e=>e.name)));
  exAll.forEach(ex=>{
    const ws=ss.map(s=>{const e=s.exercises.find(x=>x.name===ex);return e?Math.max(0,...e.sets.filter(st=>st.kg>0).map(st=>st.kg)):0;}).filter(w=>w>0);
    if(ws.length<2)return;
    const first=ws[ws.length-1],last=ws[0];
    if(last>first)imps.push({name:ex,from:first,to:last,pct:Math.round((last-first)/first*100)});
  });
  imps.sort((a,b)=>b.pct-a.pct);

  const cv = document.getElementById('export-canvas');
  const SIZE = 1080;
  cv.width  = SIZE;
  cv.height = SIZE;
  cv.style.width  = '100%';
  cv.style.height = 'auto';

  const ctx = cv.getContext('2d');
  const DPR = 1; // Canvas is already 1080px

  // ── BACKGROUND ──
  ctx.fillStyle = '#0a0a0a';
  ctx.fillRect(0, 0, SIZE, SIZE);

  // Subtle grain
  for(let i=0;i<40000;i++){
    const x=Math.random()*SIZE, y=Math.random()*SIZE;
    const v=Math.floor(Math.random()*20);
    ctx.fillStyle=`rgba(${v},${v},${v},0.4)`;
    ctx.fillRect(x,y,1,1);
  }

  // Top accent bar
  ctx.fillStyle = col;
  ctx.fillRect(0, 0, SIZE, 5);

  // Bottom accent bar
  ctx.fillStyle = col+'33';
  ctx.fillRect(0, SIZE-3, SIZE, 3);

  // ── LOGO TOP LEFT ──
  ctx.font = '900 38px "Arial Narrow",Arial,sans-serif';
  ctx.letterSpacing = '6px';
  ctx.fillStyle = '#fff';
  ctx.fillText('SQUAD', 64, 76);
  ctx.fillStyle = col;
  ctx.fillText(' TEAM', 64+ctx.measureText('SQUAD').width, 76);

  // Tag top right
  ctx.font = '400 22px "Courier New",monospace';
  ctx.letterSpacing = '2px';
  ctx.fillStyle = '#333';
  ctx.textAlign = 'right';
  ctx.fillText('squadteamuy.netlify.app', SIZE-64, 76);
  ctx.textAlign = 'left';
  ctx.letterSpacing = '0px';

  // ── ATHLETE NAME ──
  ctx.font = '900 96px "Arial Narrow",Arial,sans-serif';
  ctx.fillStyle = '#fff';
  ctx.fillText(a.name.toUpperCase(), 64, 200);

  // Underline
  const nameW = ctx.measureText(a.name.toUpperCase()).width;
  ctx.fillStyle = col;
  ctx.fillRect(64, 214, Math.min(nameW, SIZE-128), 4);

  // Date range
  if(ss.length>=2){
    const first = ss[ss.length-1].date;
    const last  = ss[0].date;
    ctx.font = '400 26px "Courier New",monospace';
    ctx.fillStyle = '#444';
    ctx.fillText(`${fmtDate(first)} → ${fmtDate(last)}`, 64, 260);
  }

  // ── STAT CARDS (2x2 grid) ──
  const stats = [
    { val: total,          lbl: 'Sesiones',      icon:'🏋️', color: col },
    { val: prs,            lbl: 'PRs',           icon:'🏆', color: '#ca8a04' },
    { val: streak+'🔥',   lbl: 'Racha',         icon:'🔥', color: '#ea580c' },
    { val: vol>999?(vol/1000).toFixed(1)+'k':vol, lbl:'Kg totales', icon:'📦', color:'#2563eb' },
  ];

  const cw = (SIZE-128-30)/2; // card width
  const ch = 160;
  const startY = 300;
  stats.forEach((st,i)=>{
    const cx = 64 + (i%2)*(cw+30);
    const cy = startY + Math.floor(i/2)*(ch+20);
    // Card bg
    ctx.fillStyle = '#111';
    roundRect(ctx, cx, cy, cw, ch, 14);
    ctx.fill();
    // Top accent
    ctx.fillStyle = st.color;
    roundRect(ctx, cx, cy, cw, 4, [4,4,0,0]);
    ctx.fill();
    // Value
    ctx.font = '900 64px "Arial Narrow",Arial,sans-serif';
    ctx.fillStyle = st.color;
    ctx.fillText(String(st.val), cx+20, cy+82);
    // Label
    ctx.font = '400 22px "Courier New",monospace';
    ctx.fillStyle = '#555';
    ctx.letterSpacing = '1px';
    ctx.fillText(st.lbl.toUpperCase(), cx+20, cy+ch-20);
    ctx.letterSpacing = '0px';
  });

  // ── BEST IMPROVEMENTS ──
  const impsY = startY + 2*(ch+20) + 40;
  ctx.font = '700 28px "Courier New",monospace';
  ctx.fillStyle = '#333';
  ctx.letterSpacing = '2px';
  ctx.fillText('MEJORAS', 64, impsY);
  ctx.letterSpacing = '0px';

  const topImps = imps.slice(0,3);
  topImps.forEach((imp,i)=>{
    const iy = impsY + 30 + i*90;
    const exShort = imp.name.split(' ').slice(0,3).join(' ');
    // Background
    ctx.fillStyle = '#0d0d0d';
    ctx.fillRect(64, iy, SIZE-128, 76);
    // Left accent
    ctx.fillStyle = col;
    ctx.fillRect(64, iy, 4, 76);
    // Exercise name
    ctx.font = '600 26px Arial,sans-serif';
    ctx.fillStyle = '#ccc';
    ctx.fillText(exShort, 84, iy+28);
    // kg range
    ctx.font = '400 22px "Courier New",monospace';
    ctx.fillStyle = '#444';
    ctx.fillText(`${imp.from}kg → ${imp.to}kg`, 84, iy+56);
    // Percentage
    ctx.font = '900 38px "Arial Narrow",Arial,sans-serif';
    ctx.fillStyle = col;
    ctx.textAlign = 'right';
    ctx.fillText('+'+imp.pct+'%', SIZE-80, iy+52);
    ctx.textAlign = 'left';
  });

  if(!topImps.length){
    ctx.font = '400 24px Arial,sans-serif';
    ctx.fillStyle = '#333';
    ctx.fillText('Progreso en construcción...', 84, impsY+60);
  }

  // ── FOOTER ──
  ctx.fillStyle = '#111';
  ctx.fillRect(0, SIZE-90, SIZE, 90);
  ctx.fillStyle = col+'44';
  ctx.fillRect(0, SIZE-90, SIZE, 1);

  ctx.font = '700 26px Arial,sans-serif';
  ctx.fillStyle = '#fff';
  ctx.fillText('SQUAD TEAM', 64, SIZE-46);
  ctx.font = '400 20px "Courier New",monospace';
  ctx.fillStyle = '#333';
  ctx.fillText('ENTRENAMIENTO PERSONALIZADO', 64, SIZE-20);

  ctx.font = '900 28px "Arial Narrow",Arial,sans-serif';
  ctx.fillStyle = col;
  ctx.textAlign = 'right';
  ctx.fillText(weekSess + ' sesiones esta semana', SIZE-64, SIZE-38);
  ctx.font = '400 18px "Courier New",monospace';
  ctx.fillStyle = '#333';
  ctx.fillText('@sqteam.uy', SIZE-64, SIZE-18);
  ctx.textAlign = 'left';
}

// Helper: rounded rect path
function roundRect(ctx, x, y, w, h, r){
  const radii = Array.isArray(r) ? r : [r,r,r,r];
  ctx.beginPath();
  ctx.moveTo(x+radii[0], y);
  ctx.lineTo(x+w-radii[1], y);
  ctx.quadraticCurveTo(x+w, y, x+w, y+radii[1]);
  ctx.lineTo(x+w, y+h-radii[2]);
  ctx.quadraticCurveTo(x+w, y+h, x+w-radii[2], y+h);
  ctx.lineTo(x+radii[3], y+h);
  ctx.quadraticCurveTo(x, y+h, x, y+h-radii[3]);
  ctx.lineTo(x, y+radii[0]);
  ctx.quadraticCurveTo(x, y, x+radii[0], y);
  ctx.closePath();
}

function downloadProgressCard(){
  const cv = document.getElementById('export-canvas');
  const a  = getAth(_exportAthId);
  const link = document.createElement('a');
  link.download = `squadteam_${(a?.name||'progreso').toLowerCase()}_${new Date().toISOString().split('T')[0]}.png`;
  link.href = cv.toDataURL('image/png', 1.0);
  link.click();
  toast('✓ Imagen guardada');
}

async function shareProgressCard(){
  const cv = document.getElementById('export-canvas');
  const a  = getAth(_exportAthId);
  try{
    cv.toBlob(async(blob)=>{
      const file = new File([blob], `progreso_${a?.name||'squadteam'}.png`, {type:'image/png'});
      if(navigator.share && navigator.canShare({files:[file]})){
        await navigator.share({
          files:[file],
          title:`Mi progreso en SQUAD TEAM`,
          text:`${a?.name} — ${getAthSessions(_exportAthId).length} sesiones completadas 💪`
        });
      } else {
        // Fallback: download
        downloadProgressCard();
      }
    },'image/png',1.0);
  }catch(e){
    downloadProgressCard();
  }
}

// ══════════════════════════════════════════
// EXPORTAR DIETA — Stories para redes
// ══════════════════════════════════════════

let _exportDietId = '';

function exportDietCard(id){
  _exportDietId = id;
  // Reuse same export modal, different canvas
  openModal('m-export');
  document.querySelector('#m-export .modal-title').textContent = '📸 Compartir mi dieta';
  setTimeout(()=>drawDietCard(id), 100);
}

function drawDietCard(id){
  const a    = getAth(id); if(!a) return;
  const diet = DB.get('diet_'+id);
  const log  = DB.get('foodlog_'+id+'_'+today()) || {foods:[]};
  if(!diet){ toast('Sin dieta cargada'); return; }

  // Use log foods if available, else use plan meals
  const useLive = log.foods?.length > 0;

  const cv = document.getElementById('export-canvas');
  const W  = 1080, H = 1350; // 4:5 — ideal para feed y stories
  cv.width = W; cv.height = H;
  cv.style.width  = '100%';
  cv.style.height = 'auto';

  const ctx = cv.getContext('2d');

  // ── BACKGROUND ──
  ctx.fillStyle = '#fafaf8';
  ctx.fillRect(0,0,W,H);

  // Subtle texture dots
  for(let i=0;i<3000;i++){
    ctx.fillStyle=`rgba(0,0,0,${Math.random()*.03})`;
    ctx.beginPath();ctx.arc(Math.random()*W,Math.random()*H,.8,0,Math.PI*2);ctx.fill();
  }

  // Top green band
  ctx.fillStyle = a.color||'#16a34a';
  ctx.fillRect(0,0,W,8);

  // ── HEADER ──
  // Logo area
  ctx.fillStyle = '#111';
  ctx.font = '900 32px "Arial Narrow",Arial,sans-serif';
  ctx.letterSpacing='5px';
  ctx.fillText('SQUAD TEAM', 64, 72);
  ctx.letterSpacing='0px';

  // Date top right
  const dateStr = new Date().toLocaleDateString('es-UY',{weekday:'long',day:'numeric',month:'long'});
  ctx.font='400 22px Arial,sans-serif';
  ctx.fillStyle='#999';
  ctx.textAlign='right';
  ctx.fillText(dateStr.toUpperCase(), W-64, 72);
  ctx.textAlign='left';

  // Divider
  ctx.fillStyle='#e5e5e5';
  ctx.fillRect(64,88,W-128,1);

  // ── ATHLETE + PLAN NAME ──
  ctx.font='800 72px Arial,sans-serif';
  ctx.fillStyle='#111';
  ctx.fillText(a.name, 64, 178);

  ctx.font='500 28px Arial,sans-serif';
  ctx.fillStyle='#888';
  ctx.fillText(diet.name||'Mi plan nutricional', 64, 218);

  // ── TOTAL MACROS ROW ──
  const totals = [
    {val:diet.kcal||0,  lbl:'Kcal',     color:a.color||'#16a34a'},
    {val:(diet.prot||0)+'g',  lbl:'Proteína', color:'#2563eb'},
    {val:(diet.carbs||0)+'g', lbl:'Carbos',   color:'#ea580c'},
    {val:(diet.fat||0)+'g',   lbl:'Grasas',   color:'#ca8a04'},
  ];
  const tw=(W-128)/4;
  totals.forEach((t,i)=>{
    const tx=64+i*tw;
    ctx.fillStyle=t.color+'18';
    roundRect(ctx,tx,244,tw-12,100,10);ctx.fill();
    ctx.fillStyle=t.color;
    ctx.font='800 36px Arial,sans-serif';
    ctx.textAlign='center';
    ctx.fillText(t.val, tx+tw/2-6, 298);
    ctx.font='400 18px Arial,sans-serif';
    ctx.fillStyle='#999';
    ctx.fillText(t.lbl, tx+tw/2-6, 322);
  });
  ctx.textAlign='left';

  // Divider
  ctx.fillStyle='#e5e5e5';
  ctx.fillRect(64,364,W-128,1);

  // ── SECTION LABEL ──
  ctx.font='700 22px Arial,sans-serif';
  ctx.fillStyle='#aaa';
  ctx.letterSpacing='3px';
  ctx.fillText(useLive ? 'LO QUE COMÍ HOY' : 'MI PLAN DEL DÍA', 64, 406);
  ctx.letterSpacing='0px';

  // ── MEALS ──
  const meals = useLive
    ? [{name:'Registro del día', kcal:log.kcal, prot:log.prot, carbs:log.carbs, fat:log.fat, foods: log.foods, time:''}]
    : (diet.meals||[]);

  let my = 430;
  const mealColors = [a.color||'#16a34a','#2563eb','#ea580c','#ca8a04','#7c3aed','#0891b2'];

  meals.slice(0,5).forEach((meal,mi)=>{
    if(my > H-160) return;
    const mcolor = mealColors[mi % mealColors.length];
    const mKcal  = meal.kcal || 0;
    const mProt  = meal.prot || 0;
    const mCarbs = meal.carbs || 0;
    const mFat   = meal.fat || 0;

    // Meal card bg
    ctx.fillStyle = '#fff';
    ctx.shadowColor='rgba(0,0,0,.06)';ctx.shadowBlur=12;ctx.shadowOffsetY=2;
    roundRect(ctx,64,my,W-128,mKcal?118:90,12);ctx.fill();
    ctx.shadowColor='transparent';ctx.shadowBlur=0;ctx.shadowOffsetY=0;

    // Left color bar
    ctx.fillStyle=mcolor;
    roundRect(ctx,64,my,6,mKcal?118:90,[12,0,0,12]);ctx.fill();

    // Time badge
    if(meal.time){
      ctx.fillStyle=mcolor+'22';
      roundRect(ctx,82,my+14,90,28,6);ctx.fill();
      ctx.font='700 18px "Courier New",monospace';
      ctx.fillStyle=mcolor;
      ctx.textAlign='center';
      ctx.fillText(meal.time, 127, my+32);
      ctx.textAlign='left';
    }

    // Meal name
    const nameX = meal.time ? 188 : 88;
    ctx.font='700 28px Arial,sans-serif';
    ctx.fillStyle='#111';
    ctx.fillText((meal.name||'Comida').slice(0,28), nameX, my+36);

    // Foods list (if from log)
    if(useLive && meal.foods?.length){
      const foodStr = meal.foods.slice(0,3).map(f=>`${f.qty}g ${f.name.split(' ').slice(0,2).join(' ')}`).join(' · ');
      ctx.font='400 18px Arial,sans-serif';
      ctx.fillStyle='#999';
      ctx.fillText(foodStr.slice(0,55), nameX, my+60);
    } else if(meal.foods){
      // From text plan
      const foods = typeof meal.foods==='string' ? meal.foods : '';
      const firstLine = foods.split('\n')[0]?.slice(0,50)||'';
      if(firstLine){
        ctx.font='400 18px Arial,sans-serif';
        ctx.fillStyle='#999';
        ctx.fillText(firstLine, nameX, my+60);
      }
    }

    // Macro chips
    if(mKcal){
      const chips=[
        {v:mKcal+' kcal', c:mcolor},
        {v:'P '+mProt+'g', c:'#2563eb'},
        {v:'C '+mCarbs+'g',c:'#ea580c'},
        {v:'G '+mFat+'g',  c:'#ca8a04'},
      ];
      let cx=88;
      chips.forEach(ch=>{
        ctx.font='600 17px Arial,sans-serif';
        const tw=ctx.measureText(ch.v).width+20;
        ctx.fillStyle=ch.c+'18';
        roundRect(ctx,cx,my+74,tw,26,6);ctx.fill();
        ctx.fillStyle=ch.c;
        ctx.textAlign='center';
        ctx.fillText(ch.v,cx+tw/2,my+91);
        ctx.textAlign='left';
        cx+=tw+8;
      });
      my+=130;
    } else {
      my+=102;
    }
  });

  // ── FOOTER ──
  ctx.fillStyle='#111';
  ctx.fillRect(0,H-80,W,80);
  ctx.fillStyle=a.color||'#16a34a';
  ctx.font='700 24px Arial,sans-serif';
  ctx.fillText('SQUAD TEAM', 64, H-42);
  ctx.fillStyle='#555';
  ctx.font='400 18px Arial,sans-serif';
  ctx.fillText('ENTRENAMIENTO PERSONALIZADO', 64, H-18);
  ctx.fillStyle='#444';
  ctx.textAlign='right';
  ctx.font='400 18px Arial,sans-serif';
  ctx.fillText('squadteamuy.netlify.app', W-64, H-28);
  ctx.textAlign='left';

  // Override download to use diet name
  window._exportDietMode = true;
}

// Override download/share for diet mode
const _origDownload = downloadProgressCard;
const _origShare    = shareProgressCard;

function downloadProgressCard(){
  const cv = document.getElementById('export-canvas');
  const id = window._exportDietMode ? _exportDietId : _exportAthId;
  const a  = getAth(id);
  const link = document.createElement('a');
  const prefix = window._exportDietMode ? 'overlay' : 'progreso';
  link.download = `squadteam_${prefix}_${(a?.name||'alumno').toLowerCase()}_${new Date().toISOString().split('T')[0]}.png`;
  // Always PNG to preserve transparency
  link.href = cv.toDataURL('image/png', 1.0);
  link.click();
  toast('✓ Overlay guardado');
  window._exportDietMode = false;
}

async function shareProgressCard(){
  const cv = document.getElementById('export-canvas');
  const id = window._exportDietMode ? _exportDietId : _exportAthId;
  const a  = getAth(id);
  const prefix = window._exportDietMode ? 'dieta' : 'progreso';
  try{
    cv.toBlob(async(blob)=>{
      const file=new File([blob],`${prefix}_${a?.name||'squadteam'}.png`,{type:'image/png'});
      if(navigator.share&&navigator.canShare({files:[file]})){
        await navigator.share({files:[file],title:`Mi ${prefix} en SQUAD TEAM`});
      } else { downloadProgressCard(); }
    },'image/png',1.0);
  }catch(e){ downloadProgressCard(); }
  window._exportDietMode = false;
}

// ══════════════════════════════════════════
// MEAL STORY EXPORT — 1080x1920 por comida
// ══════════════════════════════════════════

function exportPlanMeal(athId, mi){
  const diet = DB.get('diet_'+athId); if(!diet?.meals?.[mi]) return;
  const meal = diet.meals[mi];
  const a    = getAth(athId);
  // Build food object from plan meal
  const food = {
    name:  meal.name||'Comida '+(mi+1),
    qty:   100,
    kcal:  meal.kcal||0,
    prot:  meal.prot||0,
    carbs: meal.carbs||0,
    fat:   meal.fat||0,
    foods: meal.foods||'',
  };
  window._exportDietMode = true;
  _exportDietId = athId;
  openModal('m-export');
  const titleEl = document.querySelector('#m-export .modal-title');
  if(titleEl) titleEl.textContent = '📸 Overlay — '+meal.name;
  setTimeout(()=>drawMealStory(food, a, diet), 80);
}

function exportMealStory(athId, fi){
  const log  = DB.get('foodlog_'+athId+'_'+today()) || {foods:[]};
  const food = log.foods[fi]; if(!food) return;
  const a    = getAth(athId);
  const diet = DB.get('diet_'+athId);

  window._exportDietMode = true;
  _exportDietId = athId;
  openModal('m-export');

  // Update modal for overlay mode
  const titleEl = document.querySelector('#m-export .modal-title');
  if(titleEl) titleEl.textContent = '📸 Overlay para Story';

  // Update download button label
  const dlBtn = document.querySelector('#m-export .btn-acc');
  if(dlBtn) dlBtn.innerHTML = '⬇ Descargar overlay (PNG transparente)';

  // Add usage tip
  const tipEl = document.querySelector('#m-export .modal-body > div:last-child');
  if(tipEl) tipEl.innerHTML = `
    <div style="background:var(--acc-light);border-radius:var(--radius-sm);padding:10px 14px;font-size:12px;color:var(--text2);line-height:1.8;margin-top:8px">
      <strong>Cómo usarlo en Instagram:</strong><br>
      1. Guardá la imagen<br>
      2. En Stories, subí tu foto de la comida<br>
      3. Tocá el ícono de stickers → Foto → elegí este overlay<br>
      4. Posicionalo en la parte de abajo
    </div>`;

  setTimeout(()=>drawMealStory(food, a, diet), 80);
}

function drawMealStory(food, a, diet){
  const cv = document.getElementById('export-canvas');
  const W=1080, H=1920;
  cv.width=W; cv.height=H;
  cv.style.width='100%'; cv.style.height='auto';
  const ctx = cv.getContext('2d');
  const col = a?.color||'#16a34a';

  // ── FULLY TRANSPARENT ──
  ctx.clearRect(0,0,W,H);

  // ── CARD DIMENSIONS — sits in bottom 42% of screen ──
  const CX=40, CY=H*0.58, CW=W-80, CH=H*0.40;
  const R=32;

  // ── GLASSMORPHISM CARD ──
  ctx.save();
  roundRectPath(ctx,CX,CY,CW,CH,R);
  ctx.clip();

  // Deep black base
  ctx.fillStyle='rgba(6,6,8,0.88)';
  ctx.fillRect(CX,CY,CW,CH);

  // Grain texture
  for(let i=0;i<6000;i++){
    const opacity=Math.random()*0.04;
    ctx.fillStyle=`rgba(255,255,255,${opacity})`;
    ctx.fillRect(CX+Math.random()*CW, CY+Math.random()*CH, 1,1);
  }

  // Color atmosphere — top left glow
  const atm=ctx.createRadialGradient(CX+100,CY+80,0,CX+100,CY+80,300);
  atm.addColorStop(0, col+'28');
  atm.addColorStop(1,'transparent');
  ctx.fillStyle=atm;
  ctx.fillRect(CX,CY,CW,CH);

  ctx.restore();

  // ── CARD BORDER ──
  roundRectPath(ctx,CX,CY,CW,CH,R);
  ctx.strokeStyle='rgba(255,255,255,0.06)';
  ctx.lineWidth=1.5;
  ctx.stroke();

  // ── TOP ACCENT LINE ──
  ctx.save();
  roundRectPath(ctx,CX,CY,CW,4,[R,R,0,0]);
  ctx.clip();
  const lineGrad=ctx.createLinearGradient(CX,0,CX+CW,0);
  lineGrad.addColorStop(0,'transparent');
  lineGrad.addColorStop(0.3,col);
  lineGrad.addColorStop(0.7,col);
  lineGrad.addColorStop(1,'transparent');
  ctx.fillStyle=lineGrad;
  ctx.fillRect(CX,CY,CW,4);
  ctx.restore();

  // ── CONTENT ──
  const px=CX+44;
  let cy=CY+56;

  // Label pill
  const pillW=300, pillH=44;
  roundRectPath(ctx,px,cy,pillW,pillH,99);
  ctx.fillStyle='rgba(255,255,255,0.06)';
  ctx.fill();
  roundRectPath(ctx,px,cy,pillW,pillH,99);
  ctx.strokeStyle=col+'40';ctx.lineWidth=1;ctx.stroke();
  ctx.font='600 18px -apple-system,Arial,sans-serif';
  ctx.letterSpacing='3px';
  ctx.fillStyle=col;
  ctx.textAlign='center';
  ctx.fillText('● LO QUE COMO HOY',px+pillW/2,cy+28);
  ctx.textAlign='left';ctx.letterSpacing='0px';
  cy+=70;

  // Food name — impacto
  const nameWords=(food.name||'Comida').toUpperCase().split(' ');
  ctx.font=`900 ${nameWords.join(' ').length>12?78:92}px -apple-system,Arial Black,Arial,sans-serif`;
  ctx.fillStyle='#ffffff';
  let line='',lines=[];
  nameWords.forEach(w=>{
    const t=line?line+' '+w:w;
    if(ctx.measureText(t).width>CW-88){lines.push(line);line=w;}else line=t;
  });
  if(line)lines.push(line);
  lines.slice(0,2).forEach(l=>{ctx.fillText(l,px,cy);cy+=100;});
  cy+=4;

  // Quantity
  ctx.font='500 30px -apple-system,Arial,sans-serif';
  ctx.fillStyle=col+'cc';
  ctx.fillText(`${food.qty}g`, px, cy);
  cy+=52;

  // ── DIVIDER ──
  ctx.strokeStyle='rgba(255,255,255,0.07)';
  ctx.lineWidth=1;
  ctx.beginPath();ctx.moveTo(px,cy);ctx.lineTo(CX+CW-44,cy);ctx.stroke();
  cy+=32;

  // ── MACROS — 2x2 grid ──
  const macros=[
    {emoji:'🔥',lbl:'CALORÍAS', val:String(food.kcal),  color:col},
    {emoji:'💪',lbl:'PROTEÍNA', val:food.prot+'g',       color:'#5b9ef4'},
    {emoji:'⚡',lbl:'CARBOS',   val:food.carbs+'g',      color:'#f4895b'},
    {emoji:'🥑',lbl:'GRASAS',   val:food.fat+'g',        color:'#f4c85b'},
  ];
  const mw=(CW-88-24)/2, mh=130;
  macros.forEach((m,i)=>{
    const mx=px+(i%2)*(mw+24);
    const my=cy+Math.floor(i/2)*(mh+16);
    // Card
    roundRectPath(ctx,mx,my,mw,mh,18);
    ctx.fillStyle='rgba(255,255,255,0.04)';ctx.fill();
    roundRectPath(ctx,mx,my,mw,mh,18);
    ctx.strokeStyle='rgba(255,255,255,0.06)';ctx.lineWidth=1;ctx.stroke();
    // Top micro-line
    roundRectPath(ctx,mx,my,mw,3,[18,18,0,0]);
    ctx.fillStyle=m.color+'88';ctx.fill();
    // Value
    ctx.font=`800 48px -apple-system,Arial Black,Arial,sans-serif`;
    ctx.fillStyle=m.color;
    ctx.textAlign='center';
    ctx.fillText(m.val,mx+mw/2,my+65);
    // Label
    ctx.font='500 18px -apple-system,Arial,sans-serif';
    ctx.fillStyle='rgba(255,255,255,0.35)';
    ctx.letterSpacing='1.5px';
    ctx.fillText(m.lbl,mx+mw/2,my+95);
    ctx.letterSpacing='0px';
    ctx.textAlign='left';
  });
  cy+=2*mh+16+28;

  // ── CTA ──
  ctx.font='500 24px -apple-system,Arial,sans-serif';
  ctx.fillStyle='rgba(255,255,255,0.22)';
  ctx.fillText('Plan nutricional personalizado · ',px,cy);
  ctx.font='700 24px -apple-system,Arial,sans-serif';
  ctx.fillStyle=col+'cc';
  const w1=ctx.measureText('Plan nutricional personalizado · ').width;
  ctx.fillText('Preguntame →',px+w1,cy);

  // ── ATHLETE NAME ──
  if(a){
    ctx.font='900 36px -apple-system,Arial Black,Arial,sans-serif';
    ctx.letterSpacing='2px';
    ctx.fillStyle='rgba(255,255,255,0.12)';
    ctx.textAlign='right';
    ctx.fillText(a.name.toUpperCase(),CX+CW-44,CY+CH-28);
    ctx.textAlign='left';ctx.letterSpacing='0px';
  }

  // ── SUBTLE LOGO ──
  ctx.font='500 20px -apple-system,Arial,sans-serif';
  ctx.letterSpacing='4px';
  ctx.fillStyle='rgba(255,255,255,0.10)';
  ctx.fillText('SQUAD TEAM',px,CY+CH-28);
  ctx.letterSpacing='0px';
}

function roundRectPath(ctx, x, y, w, h, r){
  const radii = Array.isArray(r)?r:[r,r,r,r];
  ctx.beginPath();
  ctx.moveTo(x+radii[0],y);
  ctx.lineTo(x+w-radii[1],y);ctx.quadraticCurveTo(x+w,y,x+w,y+radii[1]);
  ctx.lineTo(x+w,y+h-radii[2]);ctx.quadraticCurveTo(x+w,y+h,x+w-radii[2],y+h);
  ctx.lineTo(x+radii[3],y+h);ctx.quadraticCurveTo(x,y+h,x,y+h-radii[3]);
  ctx.lineTo(x,y+radii[0]);ctx.quadraticCurveTo(x,y,x+radii[0],y);
  ctx.closePath();
}
function renderAthProg(id){
  const cont=document.getElementById('ath-prog'); if(!cont)return;
  const ss=getAthSessions(id).sort((a,b)=>new Date(b.date)-new Date(a.date));
  const a=getAth(id);
  const color=a?.color||'#16a34a';
  const total=ss.length, prs=getPRs(id), vol=ss.reduce((s,x)=>s+calcVol(x),0), streak=getStreak(id);
  let html='';

  // ── EXPORT BUTTON ──
  html+=`<button onclick="exportProgressCard('${id}')" class="btn btn-acc btn-full" style="margin-bottom:16px;display:flex;align-items:center;justify-content:center;gap:8px">
    <span>📸</span> Compartir mi progreso
  </button>`;

  // ── STAT CARDS ──
  html+=`<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:16px">
    ${[
      {icon:'🏋️', val:total, lbl:'Sesiones', c:color},
      {icon:'🏆', val:prs,   lbl:'PRs',      c:'#ca8a04'},
      {icon:'🔥', val:streak,lbl:'Racha',    c:'#ea580c'},
      {icon:'📦', val:vol>999?(vol/1000).toFixed(1)+'k':vol, lbl:'Vol kg', c:'#2563eb'},
    ].map(s=>`<div class="prog-stat-card" style="flex-direction:column;align-items:center;text-align:center;padding:10px 6px">
      <div style="font-size:18px;margin-bottom:2px">${s.icon}</div>
      <div style="font-size:18px;font-weight:800;color:${s.c};line-height:1">${s.val}</div>
      <div style="font-size:9px;color:var(--sub);margin-top:2px;text-transform:uppercase;letter-spacing:.5px">${s.lbl}</div>
    </div>`).join('')}
  </div>`;

  if(!total){html+=`<div class="empty"><div class="ei">📭</div><p>Todavía no hay sesiones.</p></div>`;cont.innerHTML=html;return;}

  // ── VOLUMEN SEMANAL (compacto) ──
  const weeklyVols=[],weeklyLabels=[];
  for(let w=7;w>=0;w--){
    const from=new Date();from.setDate(from.getDate()-w*7-6);
    const to=new Date();to.setDate(to.getDate()-w*7);
    const wVol=ss.filter(s=>{const d=new Date(s.date+'T12:00:00');return d>=from&&d<=to;}).reduce((n,s)=>n+calcVol(s),0);
    weeklyVols.push(wVol);
    weeklyLabels.push(to.toLocaleDateString('es-UY',{day:'2-digit',month:'short'}));
  }
  const maxVol=Math.max(...weeklyVols,1);
  const thisWeekVol=weeklyVols[7];
  const lastWeekVol=weeklyVols[6];
  const weekDiff=lastWeekVol>0?Math.round((thisWeekVol-lastWeekVol)/lastWeekVol*100):0;
  
  html+=`<div class="section-card" style="margin-bottom:12px">
    <div style="padding:14px 16px 0;display:flex;align-items:center;justify-content:space-between">
      <div>
        <div style="font-size:13px;font-weight:700">Volumen semanal</div>
        <div style="font-size:11px;color:var(--sub)">Esta semana: <strong style="color:${color}">${thisWeekVol>999?(thisWeekVol/1000).toFixed(1)+'k':thisWeekVol}kg</strong>
          ${weekDiff>0?'<span style="color:var(--acc);font-size:10px">↑'+Math.abs(weekDiff)+'% vs semana anterior</span>':weekDiff<0?'<span style="color:var(--red);font-size:10px">↓'+Math.abs(weekDiff)+'% vs semana anterior</span>':''}
        </div>
      </div>
    </div>
    <div style="padding:10px 16px 14px">
      <div style="display:flex;align-items:flex-end;gap:3px;height:60px;margin-bottom:6px">
        ${weeklyVols.map((v,i)=>{
          const h=Math.max(3,Math.round(v/maxVol*60));
          const isThis=i===7;
          return `<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:2px">
            <div style="width:100%;height:${h}px;background:${isThis?color:color+'33'};border-radius:3px 3px 0 0;transition:height .3s" title="${Math.round(v)}kg"></div>
          </div>`;
        }).join('')}
      </div>
      <div style="display:flex;gap:3px">
        ${weeklyLabels.map((l,i)=>`<div style="flex:1;font-size:8px;color:var(--sub2);text-align:center;overflow:hidden;white-space:nowrap">${i%2===0||i===7?l:''}</div>`).join('')}
      </div>
    </div>
  </div>`;

  // ── ÚLTIMAS CARGAS POR EJERCICIO ──
  // Build map: exercise -> last session data + prev session for comparison
  const exMap={};
  ss.forEach(s=>{
    s.exercises.forEach(ex=>{
      if(!exMap[ex.name]) exMap[ex.name]={sessions:[]};
      const maxKg=Math.max(0,...ex.sets.filter(st=>st.kg>0).map(st=>parseFloat(st.kg)));
      const maxReps=ex.sets.length?ex.sets[ex.sets.length-1].reps||ex.sets[0].reps:0;
      const hasRir=ex.sets.some(st=>st.rir!==undefined&&st.rir!==null);
      const rir=hasRir?ex.sets.find(st=>st.rir!==undefined)?.rir:null;
      if(maxKg>0) exMap[ex.name].sessions.push({date:s.date, kg:maxKg, reps:maxReps, rir, setCount:ex.sets.length});
    });
  });

  const exFreq={};
  ss.forEach(s=>s.exercises.forEach(e=>{exFreq[e.name]=(exFreq[e.name]||0)+1;}));
  const topExes=Object.keys(exFreq).sort((a,b)=>exFreq[b]-exFreq[a]).slice(0,8);

  if(topExes.length){
    html+=`<div class="section-card" style="margin-bottom:12px">
      <div style="padding:14px 16px 0">
        <div style="font-size:13px;font-weight:700">Últimas cargas</div>
        <div style="font-size:11px;color:var(--sub)">Máximo levantado por ejercicio</div>
      </div>
      <div style="padding:8px 0">`;

    topExes.forEach((exName,i)=>{
      const data=exMap[exName];
      if(!data?.sessions?.length) return;
      const last=data.sessions[0];
      const prev=data.sessions[1];
      const diff=prev&&prev.kg>0?Math.round((last.kg-prev.kg)/prev.kg*100):null;
      const arrow=diff===null?'':diff>0?`<span style="color:var(--acc);font-size:10px;font-weight:700">↑${diff}%</span>`:diff<0?`<span style="color:var(--red);font-size:10px;font-weight:700">↓${Math.abs(diff)}%</span>`:`<span style="color:var(--sub2);font-size:10px">—</span>`;
      const exShort=exName.split(' ').slice(0,3).join(' ');
      const isLast=i===topExes.length-1;
      
      html+=`<div style="display:flex;align-items:center;gap:10px;padding:10px 16px;border-bottom:${isLast?'none':'1px solid var(--border)'}">
        <div style="width:8px;height:8px;border-radius:50%;background:${color};flex-shrink:0"></div>
        <div style="flex:1;min-width:0">
          <div style="font-size:12px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${exShort}</div>
          <div style="font-size:10px;color:var(--sub);margin-top:1px">${last.setCount} series · ${fmtDateShort(last.date)}</div>
        </div>
        <div style="text-align:right;flex-shrink:0">
          <div style="font-size:15px;font-weight:800;color:${color}">${last.kg}kg</div>
          <div style="display:flex;align-items:center;gap:4px;justify-content:flex-end">
            <span style="font-size:10px;color:var(--sub)">${last.reps||'—'}reps</span>
            ${last.rir!==null&&last.rir!==undefined?`<span style="font-size:9px;background:var(--acc-light);color:var(--acc);padding:1px 5px;border-radius:99px;font-weight:600">RIR${last.rir}</span>`:''}
            ${arrow}
          </div>
        </div>
      </div>`;
    });

    html+=`</div></div>`;
  }

  // ── TOP MEJORAS (compacto) ──
  const imps=[];
  Object.keys(exMap).forEach(exName=>{
    const sessions=exMap[exName]?.sessions||[];
    if(sessions.length<2)return;
    const first=sessions[sessions.length-1].kg;
    const last=sessions[0].kg;
    if(last>first&&first>0) imps.push({name:exName,from:first,to:last,pct:Math.round((last-first)/first*100)});
  });
  imps.sort((a,b)=>b.pct-a.pct);

  if(imps.length){
    html+=`<div class="section-card" style="margin-bottom:12px">
      <div style="padding:14px 16px 0">
        <div style="font-size:13px;font-weight:700">Mejores progresos</div>
      </div>
      <div style="padding:8px 0">`;
    imps.slice(0,4).forEach(({name,from,to,pct},i)=>{
      const barW=Math.min(100,Math.sqrt(pct)*8);
      const isLast=i===Math.min(3,imps.length-1);
      html+=`<div style="padding:10px 16px;border-bottom:${isLast?'none':'1px solid var(--border)'}">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:5px">
          <div style="font-size:12px;font-weight:600;flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${name.split(' ').slice(0,3).join(' ')}</div>
          <div style="display:flex;align-items:center;gap:8px;flex-shrink:0;margin-left:8px">
            <div style="font-size:10px;color:var(--sub)">${from}kg → ${to}kg</div>
            <div style="font-size:14px;font-weight:800;color:var(--acc)">+${pct}%</div>
          </div>
        </div>
        <div style="height:4px;background:var(--border);border-radius:99px;overflow:hidden">
          <div style="width:${barW}%;height:100%;background:linear-gradient(90deg,${color}66,${color});border-radius:99px"></div>
        </div>
      </div>`;
    });
    html+=`</div></div>`;

    // Proyección
    const top=imps[0];
    if(top&&ss.length>=3){
      const rw=ss.slice(0,3).map(s=>{const e=s.exercises.find(x=>x.name===top.name);return e?Math.max(0,...e.sets.filter(st=>st.kg>0).map(st=>st.kg)):0;}).filter(w=>w>0);
      if(rw.length>=2){
        const g=(rw[0]-rw[rw.length-1])/rw.length;
        const proj=Math.round((rw[0]+g*4)*4)/4;
        if(proj>rw[0]) html+=`<div class="projection" style="margin-bottom:12px">📈 A este ritmo, en 4 semanas podrías llegar a <b>${proj}kg</b> en ${top.name.split(' ').slice(0,2).join(' ')}.</div>`;
      }
    }
  }

  // ── GRÁFICA EVOLUCIÓN ──
  if(topExes.length){
    html+=`<div class="section-card">
      <div style="padding:14px 16px 0">
        <div style="font-size:13px;font-weight:700">Evolución por ejercicio</div>
      </div>
      <div style="padding:12px 16px 14px">
        <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:12px" id="prog-ex-sel">
          ${topExes.slice(0,5).map((ex,i)=>`<button onclick="selectProgEx(this,'${ex.replace(/'/g,"\'")}','${id}','${color}')" class="prog-ex-chip ${i===0?'on':''}">${ex.split(' ').slice(0,2).join(' ')}</button>`).join('')}
        </div>
        <canvas id="prog-ex-chart" height="120" style="width:100%"></canvas>
        <div style="font-size:11px;color:var(--sub);margin-top:6px;text-align:center" id="prog-ex-label"></div>
      </div>
    </div>`;
  }

  cont.innerHTML=html;
  if(topExes.length) setTimeout(()=>{const btn=document.querySelector('.prog-ex-chip.on');if(btn)selectProgEx(btn,topExes[0],id,color);},80);
}


