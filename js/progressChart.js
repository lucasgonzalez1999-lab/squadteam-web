// ═══════════════════════════════════════════
// SQUAD TEAM — Progress Chart & Instagram Export
// ═══════════════════════════════════════════

// ── DATA ──
function getExProgressData(athId, exName){
  return getAthSessions(athId)
    .filter(s=>s.exercises.some(e=>e.name===exName))
    .sort((a,b)=>new Date(a.date)-new Date(b.date))
    .map(s=>{
      const ex=s.exercises.find(e=>e.name===exName);
      const valid=ex.sets.filter(st=>(st.kg||0)>0&&(st.reps||0)>0);
      return{
        date:s.date,
        kg:valid.length?Math.max(...valid.map(st=>st.kg)):0,
        vol:Math.round(valid.reduce((sum,st)=>sum+st.kg*st.reps,0)),
        hasPR:ex.sets.some(st=>st.pr)
      };
    }).filter(d=>d.kg>0);
}

function linearTrend(vals){
  const n=vals.length; if(n<2) return null;
  const sx=vals.reduce((s,_,i)=>s+i,0);
  const sy=vals.reduce((s,v)=>s+v,0);
  const sxy=vals.reduce((s,v,i)=>s+i*v,0);
  const sxx=vals.reduce((s,_,i)=>s+i*i,0);
  const m=(n*sxy-sx*sy)/(n*sxx-sx*sx);
  const b=(sy-m*sx)/n;
  return{start:b, end:m*(n-1)+b};
}

// ── MODAL ──
function showProgressChart(athId, exName){
  document.getElementById('prog-modal')?.remove();
  const ath=getAth(athId);
  const color=ath?.color||'#e8ff00';
  const data=getExProgressData(athId,exName);

  const m=document.createElement('div');
  m.id='prog-modal';
  m.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.7);z-index:1500;display:flex;align-items:center;justify-content:center;padding:16px';
  m.innerHTML=`
  <div style="background:var(--bg);border-radius:16px;padding:20px;max-width:620px;width:100%;max-height:92vh;overflow-y:auto">
    <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:14px">
      <div>
        <div style="font-size:11px;font-weight:700;color:var(--sub);letter-spacing:.5px">${ath?.name||athId}</div>
        <div style="font-size:17px;font-weight:800;color:var(--text)">${exName}</div>
      </div>
      <button onclick="document.getElementById('prog-modal').remove()"
        style="background:none;border:none;font-size:22px;cursor:pointer;color:var(--sub);line-height:1;margin-top:-4px">×</button>
    </div>

    ${!data.length
      ? `<div style="padding:32px;text-align:center;color:var(--sub);font-size:13px">Sin sesiones registradas para este ejercicio</div>`
      : `<canvas id="prog-canvas" style="width:100%;border-radius:10px;background:var(--surf)"></canvas>
         <div id="prog-stats" style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-top:12px"></div>
         <button onclick="exportProgressIG('${athId}','${exName.replace(/'/g,"\\'")}')"
           style="width:100%;margin-top:12px;padding:13px;background:${color};color:#000;border:none;border-radius:12px;
           font-weight:800;font-size:14px;cursor:pointer;font-family:inherit">
           📲 Exportar para Instagram
         </button>`
    }
  </div>`;
  document.body.appendChild(m);
  m.addEventListener('click',e=>{if(e.target===m)m.remove();});

  if(data.length){
    setTimeout(()=>{
      const c=document.getElementById('prog-canvas');
      if(c) drawChart(c,data,color,false);
      renderStats(athId,exName,data);
    },40);
  }
}

// ── IN-APP CHART ──
function drawChart(canvas, data, color, isExport, W, H){
  const isDark=!document.body.classList.contains('light');
  W=W||(canvas.clientWidth||520);
  H=H||220;
  const DPR=isExport?2:(window.devicePixelRatio||1);
  canvas.width=W*DPR; canvas.height=H*DPR;
  if(!isExport) canvas.style.height=H+'px';
  const ctx=canvas.getContext('2d');
  ctx.scale(DPR,DPR);
  ctx.clearRect(0,0,W,H);

  const kgs=data.map(d=>d.kg);
  const vols=data.map(d=>d.vol);
  const maxVol=Math.max(...vols)||1;
  const PAD={top:isExport?8:16,right:14,bottom:30,left:46};
  const CW=W-PAD.left-PAD.right, CH=H-PAD.top-PAD.bottom;
  const range=Math.max(...kgs)-Math.min(...kgs)||1;
  const mn=Math.max(0,Math.min(...kgs)-range*.2);
  const mx=Math.max(...kgs)+range*.2;
  const px=i=>PAD.left+i*CW/(data.length-1||1);
  const py=v=>PAD.top+CH-(v-mn)/(mx-mn)*CH;

  const textCol=isExport?'rgba(255,255,255,.45)':(isDark?'#555':'#aaa');
  const gridCol=isExport?'rgba(255,255,255,.07)':(isDark?'#222':'#f0f0f0');
  const bgCol  =isExport?'#000':(isDark?'#1a1a1a':'#fff');

  // Grid
  ctx.strokeStyle=gridCol; ctx.lineWidth=1;
  for(let i=0;i<=3;i++){
    const y=PAD.top+CH*i/3;
    ctx.beginPath();ctx.moveTo(PAD.left,y);ctx.lineTo(W-PAD.right,y);ctx.stroke();
  }

  // Volume bars
  data.forEach((d,i)=>{
    const bh=(d.vol/maxVol)*CH*.22;
    ctx.fillStyle=isExport?'rgba(255,255,255,.07)':(isDark?'rgba(255,255,255,.05)':'rgba(0,0,0,.07)');
    ctx.fillRect(px(i)-5,PAD.top+CH-bh,10,bh);
  });

  // Trend line
  const tr=linearTrend(kgs);
  if(tr&&data.length>=3){
    ctx.beginPath();
    ctx.moveTo(px(0),py(tr.start));ctx.lineTo(px(data.length-1),py(tr.end));
    ctx.strokeStyle=color+'55'; ctx.lineWidth=1.5;
    ctx.setLineDash([5,4]); ctx.stroke(); ctx.setLineDash([]);
  }

  // Area
  ctx.beginPath();
  data.forEach((d,i)=>i===0?ctx.moveTo(px(i),py(d.kg)):ctx.lineTo(px(i),py(d.kg)));
  ctx.lineTo(px(data.length-1),PAD.top+CH);ctx.lineTo(px(0),PAD.top+CH);ctx.closePath();
  const grad=ctx.createLinearGradient(0,PAD.top,0,PAD.top+CH);
  grad.addColorStop(0,color+'38');grad.addColorStop(1,color+'00');
  ctx.fillStyle=grad;ctx.fill();

  // Line
  ctx.beginPath();
  data.forEach((d,i)=>i===0?ctx.moveTo(px(i),py(d.kg)):ctx.lineTo(px(i),py(d.kg)));
  ctx.strokeStyle=color;ctx.lineWidth=2.5;ctx.lineJoin='round';ctx.stroke();

  // PR markers + dots
  data.forEach((d,i)=>{
    if(d.hasPR){
      ctx.beginPath();ctx.arc(px(i),py(d.kg),10,0,Math.PI*2);
      ctx.fillStyle=color+'22';ctx.fill();
      ctx.font='bold 13px system-ui';ctx.fillStyle=color;ctx.textAlign='center';
      ctx.fillText('★',px(i),py(d.kg)-12);
    }
    const isLast=i===data.length-1;
    ctx.beginPath();ctx.arc(px(i),py(d.kg),isLast?5.5:3.5,0,Math.PI*2);
    ctx.fillStyle=bgCol;ctx.strokeStyle=color;ctx.lineWidth=isLast?3:2;
    ctx.fill();ctx.stroke();
    if(isLast){
      ctx.font='bold 11px system-ui';ctx.fillStyle=color;ctx.textAlign='center';
      ctx.fillText(d.kg+'kg',px(i),py(d.kg)-12);
    }
  });

  // X labels
  ctx.fillStyle=textCol;ctx.font='10px system-ui';ctx.textAlign='center';
  const step=Math.ceil(data.length/5);
  data.forEach((d,i)=>{
    if(i%step===0||i===data.length-1) ctx.fillText(fmtDateShort(d.date),px(i),H-6);
  });

  // Y labels
  ctx.textAlign='right';ctx.fillStyle=textCol;
  [mn,(mn+mx)/2,mx].forEach(v=>ctx.fillText(Math.round(v)+'kg',PAD.left-5,py(v)+4));
}

// ── STATS ──
function renderStats(athId, exName, data){
  const el=document.getElementById('prog-stats');
  if(!el) return;
  const pr=Math.max(...data.map(d=>d.kg));
  const delta=data[data.length-1].kg-data[0].kg;
  const prs=data.filter(d=>d.hasPR).length;
  el.innerHTML=[
    {label:'PR',value:pr+'kg'},
    {label:'Progreso total',value:(delta>=0?'+':'')+delta+'kg'},
    {label:'PRs logrados',value:prs},
  ].map(s=>`
    <div style="background:var(--surf);border:1px solid var(--border);border-radius:10px;padding:10px 12px;text-align:center">
      <div style="font-size:18px;font-weight:800;color:var(--text)">${s.value}</div>
      <div style="font-size:11px;color:var(--sub);margin-top:2px">${s.label}</div>
    </div>`).join('');
}

// ── EXPORT PNG ──
async function exportProgressIG(athId, exName){
  const ath=getAth(athId);
  const color=ath?.color||'#e8ff00';
  const data=getExProgressData(athId,exName);
  if(!data.length){toast('Sin datos para exportar');return;}

  const W=900, H=660;
  const offscreen=document.createElement('canvas');
  offscreen.width=W; offscreen.height=H;
  const ctx=offscreen.getContext('2d');

  // Card background (semi-transparent dark)
  pcRoundRect(ctx,0,0,W,H,28);
  ctx.fillStyle='rgba(0,0,0,0.76)';ctx.fill();

  // Accent top bar
  const pr=Math.max(...data.map(d=>d.kg));
  const delta=data[data.length-1].kg-data[0].kg;
  ctx.fillStyle=color;
  ctx.fillRect(0,0,W,5);

  // Exercise name
  ctx.textAlign='left';
  ctx.font='bold 44px system-ui,sans-serif';
  ctx.fillStyle='#fff';
  pcFitText(ctx,exName.toUpperCase(),40,62,W-260);

  // Athlete name
  ctx.font='500 20px system-ui,sans-serif';
  ctx.fillStyle='rgba(255,255,255,.55)';
  ctx.fillText(ath?.name||athId,40,90);

  // PR badge
  const prLabel='PR: '+pr+'kg';
  ctx.font='bold 20px system-ui,sans-serif';
  const bw=ctx.measureText(prLabel).width+32;
  pcRoundRect(ctx,W-bw-32,28,bw,38,8);
  ctx.fillStyle=color;ctx.fill();
  ctx.fillStyle='#000';ctx.textAlign='center';
  ctx.fillText(prLabel,W-bw/2-32,52);

  // Progress delta
  ctx.textAlign='left';
  ctx.font='600 17px system-ui,sans-serif';
  ctx.fillStyle=delta>=0?'#4ade80':'#f87171';
  ctx.fillText((delta>=0?'+':'')+delta+'kg desde el inicio · '+data.length+' sesiones',40,118);

  // Chart
  const chartW=W-60, chartH=400;
  const chartCanvas=document.createElement('canvas');
  chartCanvas.width=chartW*2; chartCanvas.height=chartH*2;
  chartCanvas.style.width=chartW+'px'; chartCanvas.style.height=chartH+'px';
  chartCanvas.clientWidth=chartW;
  drawChart(chartCanvas,data,color,true,chartW,chartH);
  ctx.drawImage(chartCanvas,30,138,chartW,chartH);

  // Logo + brand — pill container bottom right
  await new Promise(res=>{
    const img=new Image();
    img.onload=()=>{
      const lh=52, lw=Math.round(img.naturalWidth*lh/img.naturalHeight);
      const label='SQUAD TEAM';
      ctx.font='800 18px system-ui,sans-serif';
      const tw=ctx.measureText(label).width;
      const gap=10, pad=16;
      const pillW=lw+gap+tw+pad*2, pillH=lh+16;
      const px2=W-pillW-20, py2=H-pillH-16;
      // Pill background
      pcRoundRect(ctx,px2,py2,pillW,pillH,pillH/2);
      ctx.fillStyle='rgba(255,255,255,0.10)';ctx.fill();
      pcRoundRect(ctx,px2,py2,pillW,pillH,pillH/2);
      ctx.strokeStyle='rgba(255,255,255,0.18)';ctx.lineWidth=1.5;ctx.stroke();
      // Logo icon
      ctx.globalAlpha=1;
      ctx.drawImage(img,px2+pad,py2+(pillH-lh)/2,lw,lh);
      // Text
      ctx.font='800 18px system-ui,sans-serif';
      ctx.fillStyle='rgba(255,255,255,0.9)';
      ctx.textAlign='left';
      ctx.fillText(label,px2+pad+lw+gap,py2+pillH/2+7);
      res();
    };
    img.onerror=res;
    img.src='icons/logo-transparent.png';
  });

  // Download
  offscreen.toBlob(blob=>{
    const a=document.createElement('a');
    a.href=URL.createObjectURL(blob);
    a.download=exName.replace(/\s+/g,'-').toLowerCase()+'-progreso.png';
    a.click();
    URL.revokeObjectURL(a.href);
    toast('✓ Imagen descargada');
  },'image/png');
}

// ── HELPERS ──
function pcRoundRect(ctx,x,y,w,h,r){
  ctx.beginPath();
  ctx.moveTo(x+r,y);ctx.lineTo(x+w-r,y);ctx.arcTo(x+w,y,x+w,y+r,r);
  ctx.lineTo(x+w,y+h-r);ctx.arcTo(x+w,y+h,x+w-r,y+h,r);
  ctx.lineTo(x+r,y+h);ctx.arcTo(x,y+h,x,y+h-r,r);
  ctx.lineTo(x,y+r);ctx.arcTo(x,y,x+r,y,r);ctx.closePath();
}
function pcFitText(ctx,text,x,y,maxW){
  let size=44;
  ctx.font=`bold ${size}px system-ui,sans-serif`;
  while(ctx.measureText(text).width>maxW&&size>20){size--;ctx.font=`bold ${size}px system-ui,sans-serif`;}
  ctx.fillText(text,x,y);
}
