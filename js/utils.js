// ═══════════════════════════════════════════
// SQUAD TEAM — Utilities
// ═══════════════════════════════════════════

// ── DATE ──
function today(){ return new Date().toISOString().split('T')[0]; }
function fmtDate(d){ return new Date(d+'T12:00:00').toLocaleDateString('es-UY',{day:'2-digit',month:'short',year:'numeric'}).toUpperCase(); }
function fmtDateShort(d){ return new Date(d+'T12:00:00').toLocaleDateString('es-UY',{day:'2-digit',month:'short'}).toUpperCase(); }

// ── ATHLETE HELPERS ──
function getAth(id){ return athletes.find(a=>a.id===id); }
function getAthSessions(id){ return sessions[id]||[]; }
function calcVol(s){ return Math.round((s.exercises||[]).reduce((sum,ex)=>sum+(ex.sets||[]).reduce((s2,st)=>(parseFloat(st.kg)||0)*(parseInt(st.reps)||0)+s2,0),0)); }
function getPRs(id){ return (sessions[id]||[]).filter(s=>(s.exercises||[]).some(e=>e.sets.some(st=>st.pr))).length; }
function getLastWeekSessions(id){ const c=new Date();c.setDate(c.getDate()-7);return(sessions[id]||[]).filter(s=>new Date(s.date)>=c).length; }
function getLastDataForEx(athId,exName){
  const ss=(sessions[athId]||[]).sort((a,b)=>new Date(b.date)-new Date(a.date));
  for(const s of ss){ const ex=s.exercises.find(e=>e.name===exName);if(ex)return ex; }
  return null;
}
function getStreak(id){
  const ss=(sessions[id]||[]).map(s=>s.date).sort().reverse();
  if(!ss.length)return 0;
  let streak=0,cur=new Date();
  for(let i=0;i<60;i++){
    const d=cur.toISOString().split('T')[0];
    if(ss.includes(d)) streak++;
    else if(streak>0) break;
    cur.setDate(cur.getDate()-1);
  }
  return streak;
}
function updateStreak(id){
  const s=getStreak(id);
  const el=document.getElementById('streak-val');
  const pill=document.getElementById('streak-pill');
  if(el) el.textContent=s;
  if(pill) pill.classList.toggle('active',s>=3);
}

// ── OVERLOAD ALGORITHM ──
function calcOverload(athId,exName){
  const unit = DB.get('units_'+athId) || getAth(athId)?.units || 'kg';
  const step = unit === 'lbs' ? 5 : 2.5;
  const roundStep = v => Math.round(v/step)*step;

  const ss=getAthSessions(athId).sort((a,b)=>new Date(b.date)-new Date(a.date));
  const hist=[];
  for(const s of ss){ const ex=s.exercises.find(e=>e.name===exName);if(ex)hist.push(ex);if(hist.length>=3)break; }
  if(!hist.length) return null;
  const last=hist[0],prev=hist[1]||null;
  const validSets=last.sets.filter(s=>s.kg>0);
  if(!validSets.length) return null;
  const maxKg=Math.max(...validSets.map(s=>s.kg));
  const avgReps=validSets.reduce((sum,s)=>sum+(s.reps||0),0)/validSets.length;
  const rir=last.rir||'RIR 1-2';
  const stagnant=prev&&Math.max(...prev.sets.filter(s=>s.kg>0).map(s=>s.kg)||[0])>=maxKg;
  // Deload check
  if(hist.length>=3&&stagnant){
    const allSame=hist.every(h=>Math.max(...h.sets.filter(s=>s.kg>0).map(s=>s.kg)||[0])<=maxKg);
    if(allSame) return{suggestedKg:roundStep(maxKg*.9),action:'deload',icon:'😮‍💨',color:'var(--blue)',label:'DELOAD',reasoning:'3 sesiones sin progreso. Semana al 90%.',confidence:'alta',unit};
  }
  let suggestedKg=maxKg,action='maintain',reasoning='',confidence='media';
  if(rir.includes('0-1')){
    if(avgReps>=12){suggestedKg=maxKg+step;action='increase';reasoning='Al límite del RIR con buenas reps. Subí la carga.';confidence='alta';}
    else{action='maintain';reasoning='Mantené el peso y mejorá las reps.';confidence='alta';}
  }else if(rir.includes('1-2')){
    if(avgReps>=12){suggestedKg=maxKg+step;action='increase';reasoning='Buen volumen con RIR 1-2. Podés subir.';confidence='alta';}
    else if(avgReps>=8){suggestedKg=maxKg+step;action='increase';reasoning='Progreso sólido. Subí un escalón.';confidence='media';}
    else{action='maintain';reasoning='Mejorá las reps antes de subir peso.';confidence='media';}
  }else{
    if(avgReps>=10){suggestedKg=maxKg+step*2;action='increase';reasoning='Tenés margen. Subí más agresivo.';confidence='alta';}
    else{suggestedKg=maxKg+step;action='increase';reasoning='Subida moderada para progresar.';confidence='media';}
  }
  if(stagnant&&action==='maintain'){suggestedKg=maxKg+step;action='increase';reasoning='2 sesiones iguales. Probá una subida mínima.';confidence:'baja';}
  suggestedKg=roundStep(suggestedKg);
  const icons={increase:'📈',maintain:'✅',deload:'😮‍💨'};
  const colors={increase:'var(--green)',maintain:'var(--acc)',deload:'var(--blue)'};
  return{suggestedKg,lastKg:maxKg,action,icon:icons[action],color:colors[action],label:{increase:'SUBIR',maintain:'MANTENER',deload:'DELOAD'}[action],reasoning,confidence,unit};
}

// ── CHART ──
function linechart(canvas, labels, data, color='#16a34a'){
  if(!canvas || !data?.length) return;
  const ctx = canvas.getContext('2d');
  const W = canvas.clientWidth || 320;
  const H = 140;
  const DPR = window.devicePixelRatio || 1;
  canvas.width  = W * DPR;
  canvas.height = H * DPR;
  canvas.style.height = H + 'px';
  ctx.scale(DPR, DPR);
  ctx.clearRect(0, 0, W, H);

  const PAD = { top:16, right:12, bottom:28, left:48 };
  const CW = W - PAD.left - PAD.right;
  const CH = H - PAD.top  - PAD.bottom;

  // ── SCALE — always start above 0, never go below ──
  const dataMin = Math.min(...data);
  const dataMax = Math.max(...data);
  const range   = dataMax - dataMin || 1;
  const mn = Math.max(0, dataMin - range * 0.15);
  const mx = dataMax + range * 0.15;

  const px = i => PAD.left + i * CW / (data.length - 1 || 1);
  const py = v => PAD.top  + CH - (v - mn) / (mx - mn) * CH;

  // ── GRID LINES ──
  ctx.strokeStyle = '#f0f0f0';
  ctx.lineWidth   = 1;
  for(let i = 0; i <= 3; i++){
    const y = PAD.top + CH * i / 3;
    ctx.beginPath(); ctx.moveTo(PAD.left, y); ctx.lineTo(W - PAD.right, y); ctx.stroke();
  }

  // ── AREA FILL ──
  ctx.beginPath();
  data.forEach((v, i) => i === 0 ? ctx.moveTo(px(i), py(v)) : ctx.lineTo(px(i), py(v)));
  ctx.lineTo(px(data.length-1), PAD.top + CH);
  ctx.lineTo(px(0), PAD.top + CH);
  ctx.closePath();
  const grad = ctx.createLinearGradient(0, PAD.top, 0, PAD.top + CH);
  grad.addColorStop(0, color + '33');
  grad.addColorStop(1, color + '05');
  ctx.fillStyle = grad;
  ctx.fill();

  // ── LINE ──
  ctx.beginPath();
  data.forEach((v, i) => i === 0 ? ctx.moveTo(px(i), py(v)) : ctx.lineTo(px(i), py(v)));
  ctx.strokeStyle = color;
  ctx.lineWidth   = 2;
  ctx.lineJoin    = 'round';
  ctx.stroke();

  // ── DOTS ──
  data.forEach((v, i) => {
    const isLast = i === data.length - 1;
    ctx.beginPath();
    ctx.arc(px(i), py(v), isLast ? 5 : 3, 0, Math.PI * 2);
    ctx.fillStyle   = '#fff';
    ctx.strokeStyle = color;
    ctx.lineWidth   = isLast ? 2.5 : 1.5;
    ctx.fill();
    ctx.stroke();
  });

  // ── X LABELS ──
  ctx.fillStyle  = '#aaa';
  ctx.font       = '10px system-ui,sans-serif';
  ctx.textAlign  = 'center';
  const step = Math.ceil(labels.length / 5);
  labels.forEach((l, i) => {
    if(i % step === 0 || i === labels.length - 1)
      ctx.fillText(l, px(i), H - 6);
  });

  // ── Y LABELS ──
  ctx.textAlign = 'right';
  ctx.fillStyle = '#bbb';
  [mn, (mn+mx)/2, mx].forEach(v => {
    ctx.fillText(Math.round(v)+'kg', PAD.left - 5, py(v) + 4);
  });
}

// ── ACHIEVEMENTS ──
function checkAchievements(){
  athletes.forEach(a=>{
    const ss=getAthSessions(a.id);const stored=DB.get('ach_'+a.id)||{};
    ACHIEVEMENTS.forEach(ach=>{
      if(stored[ach.id]) return;
      let unlock=false;
      const total=ss.length,prs=getPRs(a.id),streak=getStreak(a.id),vol=ss.reduce((s,x)=>s+calcVol(x),0);
      if(ach.id==='first'&&total>=1) unlock=true;
      if(ach.id==='sess10'&&total>=10) unlock=true;
      if(ach.id==='sess25'&&total>=25) unlock=true;
      if(ach.id==='pr5'&&prs>=5) unlock=true;
      if(ach.id==='pr10'&&prs>=10) unlock=true;
      if(ach.id==='vol100k'&&vol>=100000) unlock=true;
      if(ach.id==='streak7'&&streak>=7) unlock=true;
      if(ach.id==='streak14'&&streak>=14) unlock=true;
      if(ach.id==='week1'&&streak>=7) unlock=true;
      if(ach.id==='variety'&&ss.some(s=>new Set(s.exercises.map(e=>e.name)).size>=5)) unlock=true;
      if(unlock){ stored[ach.id]=Date.now();DB.set('ach_'+a.id,stored); }
    });
  });
}
function getAchProgress(ac,ss,total){
  const prs=ss.filter(s=>s.exercises.some(e=>e.sets.some(st=>st.pr))).length;
  const streak=0;const vol=ss.reduce((s,x)=>s+calcVol(x),0);
  if(ac.id==='first')   return Math.min(100,total*100);
  if(ac.id==='sess10')  return Math.min(100,total/10*100);
  if(ac.id==='sess25')  return Math.min(100,total/25*100);
  if(ac.id==='pr5')     return Math.min(100,prs/5*100);
  if(ac.id==='pr10')    return Math.min(100,prs/10*100);
  if(ac.id==='vol100k') return Math.min(100,vol/100000*100);
  if(ac.id==='streak7') return Math.min(100,streak/7*100);
  if(ac.id==='streak14')return Math.min(100,streak/14*100);
  return 0;
}

// ── TOAST ──
let _toastTimer;
function toast(msg){
  const el=document.getElementById('toast');
  if(!el) return;
  clearTimeout(_toastTimer);
  el.textContent=msg;el.classList.add('show');
  _toastTimer=setTimeout(()=>el.classList.remove('show'),2200);
}

// ── RIR CLASS ──
function rirClass(r){
  if(!r) return '';
  if(r.includes('2-3')||r.includes('3')) return 'r23';
  if(r.includes('1-2')) return 'r12';
  return 'r01';
}

// ── LIVE TENDENCY ──
function liveCheck(inp,prevKg){
  const v=parseFloat(inp.value)||0;
  const id=inp.id.replace('kg_','').split('_');
  const hint=document.getElementById('th_'+id[0]+'_'+id[1]);
  if(!v||!prevKg){inp.className='slog-inp';if(hint)hint.textContent='';return;}
  if(v>prevKg){inp.className='slog-inp up';if(hint){hint.className='tend-hint';hint.textContent='▲ +'+Math.round((v-prevKg)*10)/10+'kg';hint.style.color='var(--green)';}}
  else if(v<prevKg){inp.className='slog-inp down';if(hint){hint.className='tend-hint';hint.textContent='▼ -'+Math.round((prevKg-v)*10)/10+'kg';hint.style.color='var(--red)';}}
  else{inp.className='slog-inp same';if(hint){hint.className='tend-hint';hint.textContent='= igual';hint.style.color='var(--sub)';}}
}
