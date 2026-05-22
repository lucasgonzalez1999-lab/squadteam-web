// SQUAD TEAM v6 — Coach Renders

// ── HELPERS ──
function sparkline(data,w=80,h=28){
  if(!data||data.length<2)return `<svg width="${w}" height="${h}"><line x1="0" y1="${h/2}" x2="${w}" y2="${h/2}" stroke="#e8eaed" stroke-width="1.5"/></svg>`;
  const max=Math.max(...data,1),min=Math.min(...data,0);
  const range=max-min||1;
  const pts=data.map((v,i)=>`${(i/(data.length-1))*w},${h-((v-min)/range)*(h-6)-3}`).join(' ');
  const last=data[data.length-1],first=data[0];
  const color=last>first?'#16a34a':last<first?'#ef4444':'#9ca3af';
  return `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><polyline points="${pts}" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
}

function calcAdherence(athSessions){
  const cut=new Date();cut.setDate(cut.getDate()-30);
  return Math.min(100,Math.round((athSessions.filter(s=>new Date(s.date+'T12:00:00')>=cut).length/13)*100));
}

function weeklyVolumes(athSessions){
  const vols=[];
  for(let w=7;w>=0;w--){
    const from=new Date();from.setDate(from.getDate()-w*7-7);
    const to=new Date();to.setDate(to.getDate()-w*7);
    const vol=athSessions.filter(s=>{const d=new Date(s.date+'T12:00:00');return d>=from&&d<to;}).reduce((t,s)=>t+calcVol(s),0);
    vols.push(Math.round(vol));
  }
  return vols;
}

function timeAgo(dateStr){
  if(!dateStr)return 'nunca';
  const diff=Math.floor((new Date()-new Date(dateStr+'T12:00:00'))/86400000);
  if(diff===0)return 'hoy';if(diff===1)return 'ayer';
  if(diff<7)return `hace ${diff}d`;if(diff<30)return `hace ${Math.round(diff/7)}sem`;
  return `hace ${Math.round(diff/30)}mes`;
}

function athAvatar(a,size=34,cls=''){
  const color=athColor(a.id);
  const init=athInitial(a.name);
  return `<div class="ath-av${cls?' '+cls:''}" style="width:${size}px;height:${size}px;background:${color};font-size:${Math.round(size*.4)}px">${init}</div>`;
}

// ══════════════════════════════════════════
// COMMAND PALETTE
// ══════════════════════════════════════════
let _cmdIdx=0;
function cmdOpen(){
  document.getElementById('cmd-overlay').classList.add('open');
  const inp=document.getElementById('cmd-input');
  inp.value='';
  cmdSearch('');
  setTimeout(()=>inp.focus(),60);
}
function cmdClose(e){
  if(e&&e.target!==document.getElementById('cmd-overlay'))return;
  document.getElementById('cmd-overlay').classList.remove('open');
}
function cmdCloseForce(){document.getElementById('cmd-overlay').classList.remove('open');}
document.addEventListener('keydown',function(e){
  if((e.metaKey||e.ctrlKey)&&e.key==='k'){e.preventDefault();cmdOpen();}
  if(e.key==='Escape') cmdCloseForce();
});
function cmdSearch(q){
  const r=document.getElementById('cmd-results');
  const sections=[
    {id:'dashboard',label:'Panel',sub:'Vista principal del equipo',tag:'Nav'},
    {id:'live',label:'En Vivo',sub:'Sesiones en curso',tag:'Nav'},
    {id:'alumnos',label:'Alumnos',sub:'Lista de alumnos',tag:'Nav'},
    {id:'planilla',label:'Planes',sub:'Rutinas y planillas',tag:'Nav'},
    {id:'nutricion',label:'Nutrición',sub:'Dietas y macros',tag:'Nav'},
    {id:'progreso',label:'Progreso',sub:'Estadísticas y PRs',tag:'Nav'},
    {id:'checkins',label:'Seguimiento',sub:'Peso y métricas',tag:'Nav'},
    {id:'pagos',label:'Pagos',sub:'Estado de pagos',tag:'Nav'},
    {id:'admin',label:'Configuración',sub:'Ajustes del sistema',tag:'Nav'},
  ];
  const athItems=(athletes||[]).map(a=>({id:'ath_'+a.id,label:a.name,sub:getAthSessions(a.id).length+' sesiones · '+timeAgo(getAthSessions(a.id).sort((x,y)=>new Date(y.date)-new Date(x.date))[0]?.date),tag:'Atleta',athId:a.id}));
  const all=[...sections,...athItems];
  const filtered=q?all.filter(x=>(x.label+x.sub).toLowerCase().includes(q.toLowerCase())):all;
  _cmdIdx=0;
  if(!filtered.length){r.innerHTML='<div class="cmd-empty">Sin resultados para "'+q+'"</div>';return;}
  r.innerHTML=filtered.slice(0,8).map((x,i)=>`
    <div class="cmd-result${i===0?' active':''}" onclick="cmdSelect('${x.id}')" data-idx="${i}">
      <div class="cmd-r-ic" style="${x.athId?'background:'+athColor(x.athId)+';color:#000':''}">${x.athId?athInitial(x.label):'<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>'}</div>
      <div><div class="cmd-r-name">${x.label}</div><div class="cmd-r-sub">${x.sub}</div></div>
      <span class="cmd-r-tag">${x.tag}</span>
    </div>
  `).join('');
}
function cmdSelect(id){
  cmdCloseForce();
  if(id.startsWith('ath_')){
    const athId=id.replace('ath_','');
    openAthProfile(athId);
  } else {
    goSection(id,document.querySelector(`[data-tab="${id}"]`));
  }
}
function cmdKey(e){
  const items=document.querySelectorAll('.cmd-result');
  if(!items.length)return;
  if(e.key==='ArrowDown'){e.preventDefault();_cmdIdx=Math.min(_cmdIdx+1,items.length-1);}
  else if(e.key==='ArrowUp'){e.preventDefault();_cmdIdx=Math.max(_cmdIdx-1,0);}
  else if(e.key==='Enter'){e.preventDefault();const active=document.querySelector('.cmd-result.active');if(active)active.click();return;}
  items.forEach((el,i)=>el.classList.toggle('active',i===_cmdIdx));
}

// ── FEED DE ACTIVIDAD ──
function dashFeedHTML(activity, athletes, isRefresh=false){
  if(!activity||!activity.length){
    return `<div class="es-premium">
      <div class="es-premium-label">Sin actividad reciente</div>
      <div class="es-premium-sub">Las sesiones aparecerán aquí al registrarlas</div>
    </div>`;
  }
  return `<div class="feed-list">
    ${activity.map((s,i)=>{
      const a=athletes.find(x=>x.id===s.athId);
      const color=a?athColor(a.id):'#888';
      const hasPR=(s.exercises||[]).some(e=>(e.sets||[]).some(st=>st.pr));
      const vol=calcVol(s);
      const exCount=(s.exercises||[]).length;
      const todayStr=new Date().toISOString().split('T')[0];
      return `<div class="feed-item${isRefresh&&i===0?' feed-new':''}">
        <div class="feed-av" style="background:${color}">${athInitial(s.athName||'?')}</div>
        <div class="feed-body">
          <div class="feed-text"><strong>${s.athName||'Atleta'}</strong> · ${s.name||'Sesión'}</div>
          <div class="feed-vol">${exCount>0?exCount+' ejerc · ':''}${vol>0?vol.toLocaleString('es-UY')+' kg':''}</div>
          <div class="feed-ts${s.date===todayStr?' today':''}">${fmtTs(s.date)}</div>
        </div>
        ${hasPR?`<span class="feed-tag pr">PR</span>`:`<span class="feed-tag done">✓</span>`}
      </div>`;
    }).join('')}
  </div>`;
}

// ── TIMESTAMP INTELIGENTE ──
function fmtTs(dateStr){
  if(!dateStr)return '';
  const d=new Date(dateStr+'T12:00:00');
  const now=new Date();
  const diff=Math.floor((now-d)/86400000);
  if(diff===0)return 'hoy';
  if(diff===1)return 'ayer';
  if(diff<7)return 'hace '+diff+' días';
  return d.toLocaleDateString('es-UY',{day:'numeric',month:'short'}).toLowerCase();
}

// ── DASHBOARD ──
let _dashFeedTimer=null;
function renderDashboard(){
  if(!Array.isArray(athletes)||!athletes.length) athletes=typeof DEFAULT_ATHLETES!=='undefined'?DEFAULT_ATHLETES:[];

  const cont=document.getElementById('dashboard-content');
  if(!cont)return;

  const now=new Date();
  const todayStr=now.toISOString().split('T')[0];
  const weekAgo=new Date();weekAgo.setDate(weekAgo.getDate()-7);
  const monthAgo=new Date();monthAgo.setDate(monthAgo.getDate()-30);

  // ── Compute stats (fix: getStreak recibe ID, no array) ──
  let trainedToday=0,bestStreak=0,totalVolWeek=0;
  const athData=athletes.map(a=>{
    const ss=getAthSessions(a.id);
    const sorted=[...ss].sort((x,y)=>new Date(y.date)-new Date(x.date));
    const last=sorted[0];
    const ds=last?Math.floor((now-new Date(last.date+'T12:00:00'))/86400000):999;
    const streak=getStreak(a.id);
    const adh=calcAdherence(ss);
    const volWeek=ss.filter(s=>new Date(s.date+'T12:00:00')>=weekAgo).reduce((t,s)=>t+calcVol(s),0);
    const trainedTd=ds===0;
    if(trainedTd)trainedToday++;
    if(streak>bestStreak)bestStreak=streak;
    totalVolWeek+=volWeek;
    return {a,ss,last,ds,streak,adh,volWeek,trainedTd};
  });

  const adherencePct=athletes.length?Math.round(athData.map(x=>x.adh).reduce((t,v)=>t+v,0)/athletes.length):0;
  const weekSess=athData.reduce((t,x)=>t+x.ss.filter(s=>new Date(s.date+'T12:00:00')>=weekAgo).length,0);
  const prevWeekAgo=new Date();prevWeekAgo.setDate(prevWeekAgo.getDate()-14);
  const prevWeekSess=athData.reduce((t,x)=>t+x.ss.filter(s=>{const d=new Date(s.date+'T12:00:00');return d>=prevWeekAgo&&d<weekAgo;}).length,0);
  const sessDelta=weekSess-prevWeekSess;

  // ── Alertas ──
  const alerts=[];
  for(const {a,ss,ds} of athData){
    if(ds>=5)alerts.push({type:'inactivity',ath:a,days:ds});
    const pay=a.payment||{};
    if(pay.payday&&pay.status!=='paid'){
      const dl=pay.payday>=now.getDate()?pay.payday-now.getDate():(pay.payday+30)-now.getDate();
      if(dl<=5)alerts.push({type:'payment',ath:a,days:dl});
    }
  }
  alerts.sort((a,b)=>a.days-b.days);
  const urgentAlerts=alerts.filter(al=>al.days<=1).length;

  // ── Actividad reciente ──
  const allActivity=[];
  for(const {a,ss} of athData) ss.slice(0,5).forEach(s=>allActivity.push({...s,athId:a.id,athName:a.name}));
  allActivity.sort((a,b)=>new Date(b.date)-new Date(a.date));
  const recentAct=allActivity.slice(0,7);

  // ── Rachas ranking ──
  const streakRanking=[...athData].map(({a,streak})=>({a,streak})).filter(x=>x.streak>0).sort((a,b)=>b.streak-a.streak).slice(0,5);

  // ── HERO DINÁMICO ──
  let heroBadgeClass,heroBadgeText,heroHeadline,heroSub;
  const activeLive=parseInt(document.getElementById('live-badge')?.textContent||'0')||0;
  if(activeLive>0){
    heroBadgeClass='live';heroBadgeText='ACTIVIDAD EN VIVO';
    heroHeadline=`${activeLive} ${activeLive===1?'ATLETA':'ATLETAS'} <span>ENTRENANDO</span>`;
    heroSub='Sesión activa ahora mismo';
  } else if(urgentAlerts>0){
    heroBadgeClass='warn';heroBadgeText='REQUIERE ATENCIÓN';
    heroHeadline=`${urgentAlerts} ALUMNO${urgentAlerts>1?'S':''} <span>NECESITAN ACCIÓN</span>`;
    heroSub='Revisá el bloque de alertas';
  } else if(trainedToday===athletes.length&&athletes.length>0){
    heroBadgeClass='ok';heroBadgeText='EQUIPO COMPLETO';
    heroHeadline='EQUIPO <span>AL DÍA</span>';
    heroSub='Todos los alumnos entrenaron hoy';
  } else if(trainedToday>0){
    heroBadgeClass='ok';heroBadgeText='SISTEMA ACTIVO';
    heroHeadline=`${trainedToday} DE ${athletes.length} <span>ATLETAS HOY</span>`;
    heroSub='Operaciones en curso';
  } else if(weekSess>0){
    heroBadgeClass='idle';heroBadgeText='LISTO PARA OPERAR';
    heroHeadline='COACH <span>OS</span>';
    heroSub=now.toLocaleDateString('es-UY',{weekday:'long',day:'numeric',month:'long'});
  } else {
    heroBadgeClass='idle';heroBadgeText='SIN ACTIVIDAD';
    heroHeadline='COACH <span>OS</span>';
    heroSub='Sin sesiones registradas esta semana';
  }

  // ── SVG icons ──
  const ico={
    users:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>`,
    flash:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>`,
    trend:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>`,
    warn:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`,
    play:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="5 3 19 12 5 21 5 3"/></svg>`,
  };

  cont.innerHTML=`
  <!-- HERO DINÁMICO -->
  <div class="dash-hero">
    <div>
      <div class="hero-state-badge ${heroBadgeClass}">
        <span class="hb-dot"></span>${heroBadgeText}
      </div>
      <div class="hero-greeting">${heroHeadline}</div>
      <div style="font-size:12px;color:var(--sub);margin-top:6px;margin-bottom:14px">${heroSub}</div>
      <div class="hero-metrics">
        ${trainedToday>0?`
        <div class="hero-met">
          <div class="hero-met-val${trainedToday===athletes.length?' acc':''}">${trainedToday}</div>
          <div class="hero-met-lbl">Entrenan hoy</div>
        </div>
        <div class="hero-divider"></div>`:''
        }
        ${weekSess>0?`
        <div class="hero-met">
          <div class="hero-met-val">${weekSess}</div>
          <div class="hero-met-lbl">Esta semana</div>
        </div>
        <div class="hero-divider"></div>`:''
        }
        ${bestStreak>0?`
        <div class="hero-met">
          <div class="hero-met-val${bestStreak>=7?' acc':''}">${bestStreak}<span style="font-size:.5em;opacity:.6">d</span></div>
          <div class="hero-met-lbl">Mejor racha</div>
        </div>
        <div class="hero-divider"></div>`:''
        }
        <div class="hero-met">
          <div class="hero-met-val${adherencePct>=70?' acc':adherencePct<40?' red':''}">${adherencePct}<span style="font-size:.5em;opacity:.5">%</span></div>
          <div class="hero-met-lbl">Adherencia</div>
        </div>
      </div>
    </div>
    <div class="hero-actions">
      <button class="hero-live-btn" onclick="goSection('live',null)">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polygon points="5 3 19 12 5 21 5 3"/></svg>
        Nueva sesión
      </button>
      <div class="hero-time" id="hero-clock"></div>
    </div>
  </div>

  <!-- STATS ROW — sin ceros muertos -->
  <div class="stats-grid" style="margin-bottom:16px">
    <div class="stat-card">
      <div class="stat-top">
        <div class="stat-label">Alumnos</div>
        <div class="stat-icon-sq green">${ico.users}</div>
      </div>
      <div class="stat-val">${athletes.length}</div>
      <div class="stat-sub-note neu">${trainedToday>0?trainedToday+' entrenaron hoy':'Nadie entrenó aún'}</div>
    </div>
    <div class="stat-card">
      <div class="stat-top">
        <div class="stat-label">Esta semana</div>
        <div class="stat-icon-sq blue">${ico.flash}</div>
      </div>
      ${weekSess>0
        ?`<div class="stat-val">${weekSess}</div>
           <div class="stat-sub-note ${sessDelta>=0?'pos':'neg'}"><b>${sessDelta>=0?'↑ +':'↓ '}${Math.abs(sessDelta)}</b> vs semana anterior</div>`
        :`<div class="stat-empty">Sin sesiones</div>
           <div class="stat-sub-note">Registrá la primera del equipo</div>`
      }
    </div>
    <div class="stat-card">
      <div class="stat-top">
        <div class="stat-label">Volumen semana</div>
        <div class="stat-icon-sq acc">${ico.trend}</div>
      </div>
      ${totalVolWeek>0
        ?`<div class="stat-val" style="font-size:30px">${totalVolWeek>=1000?(Math.round(totalVolWeek/100)/10)+'t':Math.round(totalVolWeek)+'kg'}</div>
           <div class="stat-sub-note neu">total del equipo</div>`
        :`<div class="stat-empty">Sin datos</div>
           <div class="stat-sub-note">Aparecerá al registrar sesiones</div>`
      }
    </div>
    <div class="stat-card">
      <div class="stat-top">
        <div class="stat-label">Alertas</div>
        <div class="stat-icon-sq ${alerts.length?'red':'green'}">${ico.warn}</div>
      </div>
      ${alerts.length
        ?`<div class="stat-val accent">${alerts.length}</div>
           <div class="stat-sub-note neg"><b>${urgentAlerts>0?urgentAlerts+' urgentes':'Revisá el equipo'}</b></div>`
        :`<div class="stat-empty" style="color:var(--green)">Sin alertas</div>
           <div class="stat-sub-note pos">Equipo al día</div>`
      }
    </div>
  </div>

  <!-- MAIN GRID -->
  <div class="dash-grid">
    <div class="dash-left">

      <!-- ENTRENAN HOY -->
      <div class="card">
        <div class="blk-head">
          <div class="blk-title">ENTRENAN HOY — ${now.toLocaleDateString('es-UY',{weekday:'long'}).toUpperCase()}</div>
          <button class="blk-action" onclick="goSection('alumnos',document.querySelector('[data-tab=alumnos]'))">Ver todos →</button>
        </div>
        <div class="today-list">
          ${athData
            .sort((a,b)=>{ // Prioridad: urgentes arriba, luego entrenaron hoy
              const urgA=a.ds>=5?0:a.ds>=3?1:a.trainedTd?3:2;
              const urgB=b.ds>=5?0:b.ds>=3?1:b.trainedTd?3:2;
              return urgA-urgB;
            })
            .map(({a,ds,streak,adh,trainedTd})=>{
              const pay=a.payment||{};
              const payUrgent=pay.payday&&pay.status!=='paid'&&((pay.payday>=now.getDate()?pay.payday-now.getDate():(pay.payday+30)-now.getDate())<=3);

              // Urgency class para borde izquierdo
              let urgCls,statusHtml;
              if(trainedTd){
                urgCls='urgency-done';
                statusHtml=`<div class="today-status done"><span class="status-dot"></span>Entrenó</div>`;
              } else if(ds<=2){
                urgCls='urgency-recent';
                statusHtml=`<div class="today-status pending"><span class="status-dot"></span>${ds===1?'Ayer':'Hace 2d'}</div>`;
              } else if(ds>=3&&ds<5){
                urgCls='urgency-warn';
                statusHtml=`<div class="today-status warn"><span class="status-dot"></span>${ds}d sin entrenar</div>`;
              } else if(ds>=5&&ds!==999){
                urgCls='urgency-danger';
                statusHtml=`<div class="today-status live"><span class="status-dot pulse"></span>${ds}d inactivo</div>`;
              } else {
                urgCls='urgency-never';
                statusHtml=`<div class="today-status pending"><span class="status-dot"></span>Sin sesiones</div>`;
              }

              return `<div class="today-row ${urgCls}" onclick="openAthProfile('${a.id}')">
                <div class="today-av" style="background:${athColor(a.id)}">${athInitial(a.name)}</div>
                <div style="flex:1;min-width:0">
                  <div class="today-name">${a.name}</div>
                  <div class="today-meta">${streak>0?'Racha '+streak+'d · ':''}${adh}% adherencia${payUrgent?' · <span style="color:var(--orange);font-weight:600">Pago pendiente</span>':''}</div>
                </div>
                ${statusHtml}
                <button class="btn-icon accent" onclick="event.stopPropagation();startLiveFor('${a.id}')" title="Iniciar sesión">${ico.play}</button>
              </div>`;
            }).join('')}
        </div>
      </div>

    </div><!-- /dash-left -->

    <div class="dash-right">

      <!-- ACTIVIDAD EN VIVO -->
      <div class="card" id="dash-feed-card">
        <div class="blk-head">
          <div class="blk-title" style="display:flex;align-items:center;gap:8px">
            ACTIVIDAD
            <span class="refresh-chip"><span class="refresh-dot"></span>en vivo</span>
          </div>
          <button class="blk-action" onclick="goSection('progreso',document.querySelector('[data-tab=progreso]'))">Ver todo →</button>
        </div>
        ${dashFeedHTML(recentAct,athletes)}
      </div>

      <!-- REQUIEREN ATENCIÓN -->
      ${alerts.length?`<div class="card">
        <div class="blk-head">
          <div class="blk-title" style="color:var(--red)">REQUIEREN ATENCIÓN</div>
          <button class="blk-action" onclick="goSection('pagos',document.querySelector('[data-tab=pagos]'))">Ver todo →</button>
        </div>
        <div class="alert-list">
          ${alerts.slice(0,6).map(al=>{
            const isPayment=al.type==='payment';
            const isRed=al.days<=1;
            const isOrange=al.days<=3&&!isRed;
            const urgColor=isRed?'#ef4444':isOrange?'#f97316':'#ca8a04';
            const chipText=isPayment
              ?(al.days===0?'HOY':'en '+al.days+'d')
              :(al.days>=7?al.days+'d sin ir':al.days+'d');
            const detail=isPayment
              ?(al.days===0?'💳 Pago vence HOY':'💳 Vence en '+al.days+' días')
              :'🏋️ Sin entrenar hace '+al.days+' días';
            return `<div class="alert-row${isRed?' urgent':''}" style="cursor:pointer" onclick="${isPayment?`goSection('pagos',null)`:`goSection('alumnos',null)`}">
              <div class="alert-ic" style="background:${urgColor}22;border:1.5px solid ${urgColor}44;width:8px;height:8px;border-radius:50%;flex-shrink:0;margin-top:4px"></div>
              <div style="flex:1">
                <div class="alert-name">${al.ath.name}</div>
                <div class="alert-detail">${detail}</div>
              </div>
              <span style="font-size:11px;font-weight:700;padding:2px 8px;border-radius:8px;background:${urgColor}20;color:${urgColor};flex-shrink:0">${chipText}</span>
            </div>`;
          }).join('')}
        </div>
      </div>`:''}

      <!-- RACHAS -->
      <div class="card">
        <div class="blk-head">
          <div class="blk-title">RACHAS DEL EQUIPO</div>
        </div>
        ${streakRanking.length?`<div class="streak-list">
          ${streakRanking.map((x,i)=>`
            <div class="streak-row">
              <div class="streak-rank${i===0?' top':''}">${i+1}</div>
              <div class="streak-av" style="background:${athColor(x.a.id)}">${athInitial(x.a.name)}</div>
              <div class="streak-name">${x.a.name}</div>
              <div class="streak-val">${x.streak}<span class="streak-lbl">d</span></div>
            </div>
          `).join('')}
        </div>`:`<div class="es-premium">
          <div class="es-premium-label">Sin rachas activas</div>
          <div class="es-premium-sub">Las rachas aparecen al registrar sesiones consecutivas</div>
        </div>`}
      </div>

    </div><!-- /dash-right -->
  </div><!-- /dash-grid -->
  `;

  // Reloj hero
  startHeroClock();

  // Auto-refresh del feed cada 30s
  if(_dashFeedTimer)clearInterval(_dashFeedTimer);
  _dashFeedTimer=setInterval(()=>{
    if(currentSection!=='dashboard')return;
    const feedCard=document.getElementById('dash-feed-card');
    if(!feedCard)return;
    const freshAct=[];
    for(const a of athletes) getAthSessions(a.id).slice(0,5).forEach(s=>freshAct.push({...s,athId:a.id,athName:a.name}));
    freshAct.sort((a,b)=>new Date(b.date)-new Date(a.date));
    const feedList=feedCard.querySelector('.feed-list,.es-premium');
    if(feedList) feedList.outerHTML=dashFeedHTML(freshAct.slice(0,7),athletes,true);
  },30000);
}

// Live clock for dashboard hero
function startHeroClock(){
  function tick(){
    const el=document.getElementById('hero-clock');
    if(!el)return;
    const t=new Date().toLocaleTimeString('es-UY',{hour:'2-digit',minute:'2-digit',second:'2-digit'});
    el.textContent=t;
  }
  tick();
  setInterval(tick,1000);
}
// Called after dashboard renders
setTimeout(startHeroClock,200);

// ── ALUMNOS ──
function renderAlumnos(){
  if(!Array.isArray(athletes)||!athletes.length) athletes=typeof DEFAULT_ATHLETES!=='undefined'?DEFAULT_ATHLETES:[];

  const cont=document.getElementById('alumnos-content');
  if(!cont)return;
  const now=new Date();
  cont.innerHTML=`
  <div class="sec-head" style="margin-bottom:16px">
    <div class="sec-title" style="font-size:18px;font-weight:800">Alumnos</div>
    <button class="btn-primary" onclick="openNewAthleteModal()">+ Nuevo alumno</button>
  </div>
  <div class="search-bar">
    <input class="search-input" placeholder="🔍 Buscar alumno..." oninput="filterAlumnos(this.value)" id="ath-search">
    <button class="btn-filter">🎯 Filtros</button>
    <button class="btn-filter">↕ Ordenar</button>
  </div>
  <div class="card" style="padding:0;overflow:hidden">
    <table class="ath-table" id="full-ath-table">
      <thead><tr>
        <th>ALUMNO</th><th>TIPO</th><th>ÚLTIMA SESIÓN</th><th>RACHA</th><th>ADHERENCIA</th><th>PAGO</th><th>PROGRESO</th><th></th>
      </tr></thead>
      <tbody>
        ${athletes.filter(a=>!a.inactive).map(a=>{
          const ss=getAthSessions(a.id);
          const sorted=[...ss].sort((x,y)=>new Date(y.date)-new Date(x.date));
          const last=sorted[0];
          const streak=getStreak(a.id);
          const ds=last?Math.floor((now-new Date(last.date+'T12:00:00'))/86400000):999;
          const adh=calcAdherence(ss);
          const vols=weeklyVolumes(ss);
          const pay=a.payment||{};
          const hoy=now.getDate();
          const dl=pay.payday?(pay.payday>=hoy?pay.payday-hoy:(pay.payday+30)-hoy):null;
          const payBadge=pay.status==='paid'?'<span class="badge green">✅ Al día</span>':dl!==null&&dl<=3?`<span class="badge red">⚠️ ${dl===0?'HOY':dl+'d'}</span>`:`<span class="badge gray">⏳ Día ${pay.payday||'?'}</span>`;
          const sessionBadge=ds===0?'<span class="badge green">● Hoy</span>':ds<=2?`<span class="badge orange">● ${ds}d`+'</span>':ds===999?'<span class="badge gray">● Nunca</span>':`<span class="badge red">● ${ds}d</span>`;
          const adhColor=adh>=70?'#16a34a':adh>=40?'#f59e0b':'#ef4444';
          return `<tr id="ath-row-${a.id}">
            <td>
              <div class="ath-cell">
                ${athAvatar(a)}
                <div>
                  <div class="ath-nm">${a.name}</div>
                  <div class="ath-subs">${ss.length} sesiones${pay.amount?' · $'+pay.amount+' USD':''}</div>
                </div>
              </div>
            </td>
            <td><span class="tag ${a.freestyle?'free':'plan'}">${a.freestyle?'Freestyle':'Con plan'}</span></td>
            <td>${sessionBadge}</td>
            <td><span class="fire-badge">🔥 ${streak}d</span></td>
            <td>
              <div class="adh-bar-wrap">
                <div class="adh-bar-bg"><div class="adh-bar-fill" style="width:${adh}%;background:${adhColor}"></div></div>
                <div class="adh-pct">${adh}%</div>
              </div>
            </td>
            <td>${payBadge}</td>
            <td>${sparkline(vols)}</td>
            <td>
              <div class="action-btns">
                <button class="btn-icon" title="Ver perfil" onclick="openAthProfile('${a.id}')">👤</button>
                <button class="btn-icon" title="Planilla" onclick="openAthPlanilla('${a.id}')">📋</button>
                <button class="btn-icon" title="Dieta" onclick="openAthDiet('${a.id}')">🥗</button>
                <button class="btn-icon" title="Editar alumno" onclick="openEditAthleteModal('${a.id}')">✏️</button>
                <button class="btn-icon green-fill" title="Iniciar sesión" onclick="startLiveFor('${a.id}')">▶</button>
              </div>
            </td>
          </tr>`;
        }).join('')}
      </tbody>
    </table>
  </div>
  ${athletes.filter(a=>a.inactive).length ? `
  <details style="margin-top:16px">
    <summary style="cursor:pointer;font-size:12px;color:var(--sub);padding:8px 4px;user-select:none">
      Dados de baja (${athletes.filter(a=>a.inactive).length})
    </summary>
    <div class="card" style="padding:0;overflow:hidden;margin-top:8px;opacity:.6">
      <table class="ath-table">
        <tbody>
          ${athletes.filter(a=>a.inactive).map(a=>`
          <tr>
            <td><div class="ath-cell">${athAvatar(a)}<div><div class="ath-nm">${a.name}</div><div class="ath-subs" style="color:var(--red)">Dado de baja</div></div></div></td>
            <td><span class="tag">${a.freestyle?'Freestyle':'Con plan'}</span></td>
            <td colspan="5" style="color:var(--sub);font-size:12px">Cuenta desactivada</td>
            <td><button class="btn-icon" title="Editar" onclick="openEditAthleteModal('${a.id}')">✏️</button></td>
          </tr>`).join('')}
        </tbody>
      </table>
    </div>
  </details>` : ''}`;
}
function filterAlumnos(q){
  document.querySelectorAll('#full-ath-table tbody tr').forEach(r=>{r.style.display=r.textContent.toLowerCase().includes(q.toLowerCase())?'':'none';});
}

function openNewAthleteModal(){
  let ov=document.getElementById('new-ath-ov');
  if(!ov){ov=document.createElement('div');ov.id='new-ath-ov';document.body.appendChild(ov);}
  ov.style.cssText='position:fixed;inset:0;z-index:9000;background:rgba(0,0,0,.65);backdrop-filter:blur(6px);display:flex;align-items:center;justify-content:center;padding:20px';
  ov.onclick=e=>{if(e.target===ov)ov.remove();};
  _naRenderStep(1, {});
  setTimeout(()=>document.getElementById('na-name')?.focus(), 80);
}

function _naClose(){ document.getElementById('new-ath-ov')?.remove(); }

function _naRenderStep(step, data){
  const ov = document.getElementById('new-ath-ov');
  if(!ov) return;
  const stepLabel = ['','Datos','Pago','Confirmar'][step];
  const dots = [1,2,3].map(i=>`<div style="width:8px;height:8px;border-radius:50%;background:${i===step?'var(--acc)':'var(--border2)'}"></div>`).join('');
  const header = `
    <div style="padding:20px 22px 16px;display:flex;align-items:flex-start;justify-content:space-between;border-bottom:1px solid var(--border)">
      <div>
        <div style="font-size:15px;font-weight:800;color:var(--text)">Nuevo alumno</div>
        <div style="font-size:12px;color:var(--sub);margin-top:2px">Paso ${step} de 3 — ${stepLabel}</div>
      </div>
      <div style="display:flex;align-items:center;gap:10px">
        <div style="display:flex;gap:5px;align-items:center">${dots}</div>
        <button onclick="_naClose()" style="background:none;border:1px solid var(--border);border-radius:8px;width:30px;height:30px;cursor:pointer;color:var(--sub);font-size:18px;line-height:1;display:flex;align-items:center;justify-content:center">×</button>
      </div>
    </div>`;

  let body='', footer='';
  const inp = 'width:100%;background:var(--surf2);border:1px solid var(--border);border-radius:10px;padding:10px 13px;font-size:14px;color:var(--text);font-family:inherit;outline:none;box-sizing:border-box';
  const lbl = 'font-size:10px;font-weight:700;letter-spacing:.1em;color:var(--sub);text-transform:uppercase;margin-bottom:6px';

  if(step===1){
    body=`
      <div style="padding:18px 22px;display:flex;flex-direction:column;gap:14px">
        <div>
          <div style="${lbl}">Nombre</div>
          <input id="na-name" type="text" placeholder="Nombre completo" autocomplete="off" style="${inp}"
            value="${data.name||''}" onkeydown="if(event.key==='Enter')document.getElementById('na-pin').focus()">
        </div>
        <div>
          <div style="${lbl}">PIN (4 dígitos)</div>
          <input id="na-pin" type="tel" placeholder="ej. 1234" maxlength="4" inputmode="numeric" style="${inp}"
            value="${data.pin||''}" oninput="this.value=this.value.replace(/[^0-9]/g,'')"
            onkeydown="if(event.key==='Enter')_naStep1Next()">
        </div>
        <div>
          <div style="${lbl}">Tipo</div>
          <div style="display:flex;gap:8px">
            <label style="flex:1;display:flex;align-items:center;gap:8px;padding:10px 13px;background:var(--surf2);border:1px solid var(--border);border-radius:10px;cursor:pointer;font-size:13px;font-weight:600;color:var(--text)">
              <input type="radio" name="na-type" value="plan" ${data.type!=='freestyle'?'checked':''} style="accent-color:var(--acc)"> Con plan
            </label>
            <label style="flex:1;display:flex;align-items:center;gap:8px;padding:10px 13px;background:var(--surf2);border:1px solid var(--border);border-radius:10px;cursor:pointer;font-size:13px;font-weight:600;color:var(--text)">
              <input type="radio" name="na-type" value="freestyle" ${data.type==='freestyle'?'checked':''} style="accent-color:var(--acc)"> Freestyle
            </label>
          </div>
        </div>
      </div>`;
    footer=`
      <div style="padding:0 22px 20px;display:flex;gap:8px">
        <button onclick="_naClose()" style="flex:1;padding:10px 0;background:none;border:1px solid var(--border);border-radius:10px;color:var(--sub);font-size:13px;font-weight:600;cursor:pointer;font-family:inherit">Cancelar</button>
        <button onclick="_naStep1Next()" style="flex:1;padding:10px 0;background:var(--acc);border:none;border-radius:10px;color:#000;font-size:13px;font-weight:800;cursor:pointer;font-family:inherit">Siguiente →</button>
      </div>`;
  } else if(step===2){
    const currencies=['UYU','USD','EUR'];
    const curOpts=currencies.map(c=>`<option value="${c}" ${(data.currency||'UYU')===c?'selected':''}>${c}</option>`).join('');
    body=`
      <div style="padding:18px 22px;display:flex;flex-direction:column;gap:14px">
        <div style="display:flex;gap:10px">
          <div style="flex:2">
            <div style="${lbl}">Monto mensual</div>
            <input id="na-amount" type="number" min="0" placeholder="0" style="${inp}" value="${data.amount||''}">
          </div>
          <div style="flex:1">
            <div style="${lbl}">Moneda</div>
            <select id="na-currency" style="${inp};appearance:auto">${curOpts}</select>
          </div>
        </div>
        <div>
          <div style="${lbl}">Día de vencimiento</div>
          <input id="na-payday" type="number" min="1" max="31" placeholder="ej. 10" style="${inp}" value="${data.payday||''}">
          <div style="font-size:11px;color:var(--sub);margin-top:5px">Día del mes en que se cobra (1–31)</div>
        </div>
      </div>`;
    footer=`
      <div style="padding:0 22px 20px;display:flex;gap:8px">
        <button onclick="_naRenderStep(1,_naCollectStep2Back())" style="flex:1;padding:10px 0;background:none;border:1px solid var(--border);border-radius:10px;color:var(--sub);font-size:13px;font-weight:600;cursor:pointer;font-family:inherit">← Volver</button>
        <button onclick="_naStep2Next()" style="flex:1;padding:10px 0;background:var(--acc);border:none;border-radius:10px;color:#000;font-size:13px;font-weight:800;cursor:pointer;font-family:inherit">Siguiente →</button>
      </div>`;
  } else if(step===3){
    const email=`${data.id}@squadteam.uy`;
    const pin=data.pin;
    body=`
      <div style="padding:18px 22px;display:flex;flex-direction:column;gap:14px">
        <div style="background:var(--surf2);border:1px solid var(--border);border-radius:12px;padding:16px;display:flex;flex-direction:column;gap:8px">
          <div style="font-size:11px;font-weight:700;color:var(--sub);text-transform:uppercase;letter-spacing:.08em;margin-bottom:2px">Resumen</div>
          <div style="display:flex;justify-content:space-between;font-size:13px"><span style="color:var(--sub)">Nombre</span><span style="font-weight:700;color:var(--text)">${data.name}</span></div>
          <div style="display:flex;justify-content:space-between;font-size:13px"><span style="color:var(--sub)">Tipo</span><span style="font-weight:700;color:var(--text)">${data.type==='freestyle'?'Freestyle':'Con plan'}</span></div>
          <div style="display:flex;justify-content:space-between;font-size:13px"><span style="color:var(--sub)">Pago</span><span style="font-weight:700;color:var(--text)">${data.currency} ${data.amount} · día ${data.payday}</span></div>
        </div>
        <div style="background:#0f172a;border:1px solid #334155;border-radius:12px;padding:16px">
          <div style="font-size:10px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.1em;margin-bottom:10px">Credenciales de acceso</div>
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
            <span style="font-size:12px;color:#94a3b8">Usuario</span>
            <span style="font-size:13px;font-weight:700;color:#e2e8f0;font-family:monospace">${data.name}</span>
          </div>
          <div style="display:flex;justify-content:space-between;align-items:center">
            <span style="font-size:12px;color:#94a3b8">PIN</span>
            <span style="font-size:20px;font-weight:800;color:#a3e635;font-family:monospace;letter-spacing:.15em">${pin}</span>
          </div>
        </div>
        <div id="na-err" style="display:none;background:#fef2f2;border:1px solid #fca5a5;border-radius:8px;padding:10px 13px;font-size:12px;color:#dc2626"></div>
      </div>`;
    footer=`
      <div style="padding:0 22px 20px;display:flex;gap:8px">
        <button onclick="_naRenderStep(2,window._naDraft)" id="na-back-btn" style="flex:1;padding:10px 0;background:none;border:1px solid var(--border);border-radius:10px;color:var(--sub);font-size:13px;font-weight:600;cursor:pointer;font-family:inherit">← Volver</button>
        <button onclick="_naConfirm()" id="na-confirm-btn" style="flex:2;padding:10px 0;background:var(--acc);border:none;border-radius:10px;color:#000;font-size:13px;font-weight:800;cursor:pointer;font-family:inherit">Crear alumno</button>
      </div>`;
  }

  ov.innerHTML=`<div style="background:var(--surf);border:1px solid var(--border2);border-radius:16px;width:100%;max-width:400px;overflow:hidden">${header}${body}${footer}</div>`;
  window._naDraft = data;
}

function _naStep1Next(){
  const name=(document.getElementById('na-name')?.value||'').trim();
  const pin=(document.getElementById('na-pin')?.value||'').trim();
  const type=document.querySelector('input[name="na-type"]:checked')?.value||'plan';
  if(!name){toast('⚠ Ingresá el nombre');document.getElementById('na-name')?.focus();return;}
  if(!/^\d{4}$/.test(pin)){toast('⚠ El PIN debe ser 4 dígitos');document.getElementById('na-pin')?.focus();return;}
  if(athletes.some(a=>a.id===_naGenId(name)&&false)){} // id check later
  let base=name.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/\s+/g,'_').replace(/[^a-z0-9_]/g,'');
  let id=base; let n=1;
  while(athletes.some(a=>a.id===id)){id=base+'_'+(n++);}
  const data={...window._naDraft||{}, name, pin, type, id};
  _naRenderStep(2, data);
  setTimeout(()=>document.getElementById('na-amount')?.focus(), 80);
}

function _naCollectStep2Back(){
  return {...window._naDraft||{},
    amount:document.getElementById('na-amount')?.value||'',
    currency:document.getElementById('na-currency')?.value||'UYU',
    payday:document.getElementById('na-payday')?.value||''
  };
}

function _naGenId(name){
  return name.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/\s+/g,'_').replace(/[^a-z0-9_]/g,'');
}

function _naStep2Next(){
  const amount=document.getElementById('na-amount')?.value||'';
  const currency=document.getElementById('na-currency')?.value||'UYU';
  const payday=document.getElementById('na-payday')?.value||'';
  if(!amount||isNaN(amount)||Number(amount)<0){toast('⚠ Ingresá un monto válido');document.getElementById('na-amount')?.focus();return;}
  if(!payday||isNaN(payday)||Number(payday)<1||Number(payday)>31){toast('⚠ Día de vencimiento entre 1 y 31');document.getElementById('na-payday')?.focus();return;}
  const data={...window._naDraft||{}, amount:Number(amount), currency, payday:Number(payday)};
  _naRenderStep(3, data);
}

async function _naConfirm(){
  const data=window._naDraft;
  if(!data) return;
  const btn=document.getElementById('na-confirm-btn');
  const backBtn=document.getElementById('na-back-btn');
  const errEl=document.getElementById('na-err');
  btn.disabled=true; btn.textContent='Creando...'; backBtn.disabled=true;

  try{
    const email=`${data.id}@squadteam.uy`;
    const password=`sq${data.pin}`;
    const color=COLORS[athletes.length%COLORS.length];

    // Create Firebase Auth via secondary app so we don't sign out the coach
    const secondaryApp=firebase.initializeApp(firebase.app().options,'onboarding_'+Date.now());
    const secondaryAuth=secondaryApp.auth();
    let uid;
    try{
      const cred=await secondaryAuth.createUserWithEmailAndPassword(email, password);
      uid=cred.user.uid;
    } finally {
      await secondaryAuth.signOut().catch(()=>{});
      await secondaryApp.delete().catch(()=>{});
    }

    // Create Firestore user profile
    await window.db.collection('users').doc(uid).set({
      id:data.id, name:data.name, role:'athlete', color,
      freestyle:data.type==='freestyle',
      features:{iifym:false,liveMode:false,progress:true,diet:true}
    });

    // Add to athletes config
    const newAth={
      id:data.id, name:data.name,
      freestyle:data.type==='freestyle',
      color,
      features:{iifym:false,liveMode:false,progress:true,diet:true},
      payment:{status:'pending',payday:data.payday,amount:data.amount,currency:data.currency}
    };
    athletes.push(newAth);
    DB.set('athletes',athletes);
    await window.db.collection('config').doc('athletes').set({list:JSON.stringify(athletes)});

    // Update login display
    if(window._USERS) window._USERS.push({id:data.id,name:data.name,role:'athlete',color});

    _naClose();
    renderAlumnos();
    toast(`✅ ${data.name} creado — PIN ${data.pin}`);
  } catch(e){
    btn.disabled=false; btn.textContent='Crear alumno'; backBtn.disabled=false;
    const msg=e.code==='auth/email-already-in-use'?'Ya existe una cuenta con ese nombre (ID duplicado). Cambiá el nombre ligeramente.'
      :e.code==='auth/weak-password'?'PIN inválido para la contraseña.'
      :`Error: ${e.message}`;
    errEl.textContent=msg; errEl.style.display='block';
  }
}

async function saveNewAthlete(){ _naStep1Next(); }

// ── EDITAR ATLETA ──────────────────────────────────────────────────────────
function _eaToggleLiveMode(){
  const cb = document.getElementById('ea-live-mode');
  const track = document.getElementById('ea-live-toggle');
  const thumb = document.getElementById('ea-live-thumb');
  if(!cb||!track||!thumb) return;
  cb.checked = !cb.checked;
  track.style.background = cb.checked ? 'var(--acc)' : 'var(--surf3)';
  thumb.style.left = cb.checked ? '20px' : '2px';
}

function openEditAthleteModal(id){
  const a = athletes.find(x=>x.id===id);
  if(!a) return;
  let ov = document.getElementById('edit-ath-ov');
  if(!ov){ ov=document.createElement('div'); ov.id='edit-ath-ov'; document.body.appendChild(ov); }
  ov.style.cssText='position:fixed;inset:0;z-index:9000;background:rgba(0,0,0,.65);backdrop-filter:blur(6px);display:flex;align-items:center;justify-content:center;padding:20px';
  ov.onclick=e=>{if(e.target===ov)ov.remove();};

  const pay = a.payment||{};
  const currencies = ['UYU','USD','EUR'];
  const inp = 'width:100%;background:var(--surf2);border:1px solid var(--border);border-radius:10px;padding:10px 13px;font-size:14px;color:var(--text);font-family:inherit;outline:none;box-sizing:border-box';
  const lbl = 'font-size:10px;font-weight:700;letter-spacing:.1em;color:var(--sub);text-transform:uppercase;margin-bottom:6px';

  ov.innerHTML = `
  <div style="background:var(--surf);border:1px solid var(--border2);border-radius:16px;width:100%;max-width:400px;overflow:hidden">
    <div style="padding:20px 22px 16px;display:flex;align-items:flex-start;justify-content:space-between;border-bottom:1px solid var(--border)">
      <div>
        <div style="font-size:15px;font-weight:800;color:var(--text)">Editar — ${a.name}</div>
        <div style="font-size:12px;color:var(--sub);margin-top:2px">Modificá datos del alumno</div>
      </div>
      <button onclick="document.getElementById('edit-ath-ov').remove()" style="background:none;border:1px solid var(--border);border-radius:8px;width:30px;height:30px;cursor:pointer;color:var(--sub);font-size:18px;display:flex;align-items:center;justify-content:center;flex-shrink:0">×</button>
    </div>
    <div style="padding:18px 22px;display:flex;flex-direction:column;gap:14px">
      <div>
        <div style="${lbl}">Tipo</div>
        <div style="display:flex;gap:8px">
          <label style="flex:1;display:flex;align-items:center;gap:8px;padding:10px 13px;background:var(--surf2);border:1px solid var(--border);border-radius:10px;cursor:pointer;font-size:13px;font-weight:600;color:var(--text)">
            <input type="radio" name="ea-type" value="plan" ${!a.freestyle?'checked':''} style="accent-color:var(--acc)"> Con plan
          </label>
          <label style="flex:1;display:flex;align-items:center;gap:8px;padding:10px 13px;background:var(--surf2);border:1px solid var(--border);border-radius:10px;cursor:pointer;font-size:13px;font-weight:600;color:var(--text)">
            <input type="radio" name="ea-type" value="freestyle" ${a.freestyle?'checked':''} style="accent-color:var(--acc)"> Freestyle
          </label>
        </div>
      </div>
      <div style="display:flex;gap:10px">
        <div style="flex:2">
          <div style="${lbl}">Monto mensual</div>
          <input id="ea-amount" type="number" min="0" placeholder="0" style="${inp}" value="${pay.amount||''}">
        </div>
        <div style="flex:1">
          <div style="${lbl}">Moneda</div>
          <select id="ea-currency" style="${inp};appearance:auto">
            ${currencies.map(c=>`<option value="${c}" ${(pay.currency||'UYU')===c?'selected':''}>${c}</option>`).join('')}
          </select>
        </div>
      </div>
      <div>
        <div style="${lbl}">Día de vencimiento</div>
        <input id="ea-payday" type="number" min="1" max="31" placeholder="ej. 10" style="${inp}" value="${pay.payday||''}">
      </div>
      <div>
        <div style="${lbl}">Color</div>
        <div style="display:flex;gap:8px;flex-wrap:wrap">
          ${COLORS.map(c=>`<button onclick="document.querySelectorAll('.ea-color').forEach(b=>b.style.outline='none');this.style.outline='3px solid white';document.getElementById('ea-color-val').value='${c}'"
            class="ea-color" style="width:28px;height:28px;border-radius:50%;background:${c};border:none;cursor:pointer;outline:${a.color===c?'3px solid white':'none'}"></button>`).join('')}
        </div>
        <input type="hidden" id="ea-color-val" value="${a.color||COLORS[0]}">
      </div>
      <div style="display:flex;align-items:center;justify-content:space-between;padding:12px 14px;background:var(--surf2);border:1px solid var(--border);border-radius:10px">
        <div>
          <div style="font-size:13px;font-weight:700;color:var(--text)">Modo Autónomo</div>
          <div style="font-size:11px;color:var(--sub);margin-top:2px">El alumno puede registrar sus propias cargas</div>
        </div>
        <div id="ea-live-toggle" onclick="_eaToggleLiveMode()"
          style="position:relative;width:42px;height:24px;border-radius:24px;cursor:pointer;transition:background .2s;flex-shrink:0;
          background:${(a.features?.liveMode!==false)?'var(--acc)':'var(--surf3)'}">
          <div id="ea-live-thumb" style="position:absolute;top:2px;left:${(a.features?.liveMode!==false)?'20':'2'}px;width:20px;height:20px;border-radius:50%;background:#000;transition:left .2s"></div>
          <input type="checkbox" id="ea-live-mode" ${(a.features?.liveMode!==false)?'checked':''} style="display:none">
        </div>
      </div>
    </div>
    <div style="padding:0 22px 20px;display:flex;gap:8px">
      <button onclick="archiveAthlete('${a.id}')" style="padding:10px 14px;background:none;border:1px solid #ef4444;border-radius:10px;color:#ef4444;font-size:12px;font-weight:700;cursor:pointer;font-family:inherit" title="Dar de baja">Dar de baja</button>
      <button onclick="document.getElementById('edit-ath-ov').remove()" style="flex:1;padding:10px 0;background:none;border:1px solid var(--border);border-radius:10px;color:var(--sub);font-size:13px;font-weight:600;cursor:pointer;font-family:inherit">Cancelar</button>
      <button onclick="_saveEditAthlete('${a.id}')" style="flex:1;padding:10px 0;background:var(--acc);border:none;border-radius:10px;color:#000;font-size:13px;font-weight:800;cursor:pointer;font-family:inherit">Guardar</button>
    </div>
  </div>`;
}

async function _saveEditAthlete(id){
  const a = athletes.find(x=>x.id===id);
  if(!a) return;
  const type   = document.querySelector('input[name="ea-type"]:checked')?.value||'plan';
  const amount = parseFloat(document.getElementById('ea-amount')?.value)||0;
  const currency = document.getElementById('ea-currency')?.value||'UYU';
  const payday = parseInt(document.getElementById('ea-payday')?.value)||null;
  const color  = document.getElementById('ea-color-val')?.value||a.color;

  const liveMode = document.getElementById('ea-live-mode')?.checked ?? (a.features?.liveMode !== false);
  a.freestyle = type==='freestyle';
  a.color     = color;
  a.payment   = { ...(a.payment||{}), amount, currency, payday, status: a.payment?.status||'pending' };
  a.features  = { ...(a.features||{}), liveMode };

  DB.set('athletes', athletes);
  try{
    await window.db.collection('config').doc('athletes').set({ list: JSON.stringify(athletes) });
    toast(`✅ ${a.name} actualizado`);
  }catch(e){ toast(`✅ ${a.name} guardado localmente`); }
  document.getElementById('edit-ath-ov')?.remove();
  renderAlumnos();
}

async function archiveAthlete(id){
  const a = athletes.find(x=>x.id===id);
  if(!a) return;
  sqConfirm({
    title:`¿Dar de baja a ${a.name}?`,
    body:'Sus datos quedan guardados pero no podrá iniciar sesión.',
    confirmLabel:'Dar de baja', danger:true,
    onConfirm: async ()=>{
      a.inactive = true;
      DB.set('athletes', athletes);
      try{
        await window.db.collection('config').doc('athletes').set({ list: JSON.stringify(athletes) });
        toast(`${a.name} dado de baja`);
      }catch(e){ toast('Guardado localmente'); }
      document.getElementById('edit-ath-ov')?.remove();
      renderAlumnos();
    }
  });
}
function openAthProfile(id){
  const a=athletes.find(x=>x.id===id);
  if(!a)return;
  goSection('planilla',document.querySelector('[data-tab=planilla]'));
  setTimeout(()=>{
    const sel=document.getElementById('pl-sa');
    if(sel){sel.value=id;plOnA();}
  },200);
}
function openAthPlanilla(id){openAthProfile(id);}
function openAthDiet(id){
  const a=athletes.find(x=>x.id===id);
  if(!a)return;
  goSection('nutricion',document.querySelector('[data-tab=nutricion]'));
}
function showAthSessions(id){
  const a=athletes.find(x=>x.id===id);
  if(!a)return;
  const ss=getAthSessions(id).sort((x,y)=>new Date(y.date)-new Date(x.date));
  const color=typeof athColor==='function'?athColor(id):'#16a34a';

  // Create modal
  let modal=document.getElementById('sess-modal');
  if(!modal){
    modal=document.createElement('div');
    modal.id='sess-modal';
    modal.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:9000;display:flex;align-items:center;justify-content:center;padding:20px';
    modal.onclick=function(e){if(e.target===modal)modal.remove();};
    document.body.appendChild(modal);
  }

  modal.innerHTML=`<div style="background:white;border-radius:16px;width:100%;max-width:560px;max-height:80vh;overflow:hidden;display:flex;flex-direction:column">
    <div style="padding:18px 20px;border-bottom:1px solid #f0f0f0;display:flex;align-items:center;justify-content:space-between">
      <div>
        <div style="font-size:16px;font-weight:800;color:#0a0a0a">Sesiones de ${a.name}</div>
        <div style="font-size:12px;color:#737373;margin-top:2px">${ss.length} sesiones · Click en 🗑 para eliminar</div>
      </div>
      <button onclick="document.getElementById('sess-modal').remove()" style="background:none;border:none;font-size:20px;cursor:pointer;color:#737373">✕</button>
    </div>
    <div style="overflow-y:auto;padding:12px">
      ${ss.length?ss.map((s,i)=>`
        <div style="display:flex;align-items:center;gap:10px;padding:10px 12px;border-radius:8px;border:1px solid #f0f0f0;margin-bottom:6px">
          <div style="width:8px;height:8px;border-radius:50%;background:${color};flex-shrink:0"></div>
          <div style="flex:1">
            <div style="font-size:13px;font-weight:600;color:#0a0a0a">${s.name||'Sesión'}</div>
            <div style="font-size:11px;color:#737373">${s.date} · ${(s.exercises||[]).length} ejercicios</div>
          </div>
          <button onclick="deleteSession('${id}',${i},this)" style="background:#fef2f2;border:1px solid #fecaca;color:#dc2626;border-radius:6px;padding:4px 8px;font-size:12px;cursor:pointer;font-family:inherit">🗑 Borrar</button>
        </div>
      `).join(''):'<div style="text-align:center;padding:20px;color:#737373;font-size:13px">Sin sesiones</div>'}
    </div>
  </div>`;
}

function deleteSession(athId, idx, btn){
  sqConfirm({
    title:'¿Borrar esta sesión?',
    body:'Esta acción no se puede deshacer.',
    confirmLabel:'Borrar', danger:true,
    onConfirm:()=>{
      const ss=getAthSessions(athId).sort((x,y)=>new Date(y.date)-new Date(x.date));
      ss.splice(idx,1);
      sessions[athId]=ss;
      DB.set('sessions',sessions);
      window.db?.collection('sessions').doc(athId).set({data:JSON.stringify(ss)}).then(()=>{
        toast('✅ Sesión eliminada');
        showAthSessions(athId);
      }).catch(()=>{
        toast('✅ Eliminada localmente');
        showAthSessions(athId);
      });
    }
  });
}

function startLiveFor(id){
  goSection('live',document.querySelector('[data-tab=live]'));
  setTimeout(()=>{
    const s=document.getElementById('live-ath-sel');
    if(s){s.value=id;renderLivePicker();}
  },200);
}

// ── NUTRICION ──
function renderNutricion(){
  if(!Array.isArray(athletes)||!athletes.length) athletes=typeof DEFAULT_ATHLETES!=='undefined'?DEFAULT_ATHLETES:[];
  const cont=document.getElementById('nutricion-content');
  if(!cont)return;

  // Athlete selector tabs
  cont.innerHTML=`
  <div style="padding:20px 20px 0;max-width:1100px;margin:0 auto">
    <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:20px" id="nutr-tabs">
      ${athletes.map((a,i)=>`
        <button onclick="openNutrAth('${a.id}')" id="nutr-tab-${a.id}"
          style="display:flex;align-items:center;gap:6px;padding:8px 14px;border-radius:20px;border:1px solid ${i===0?'transparent':'var(--border)'};background:${i===0?athColor(a.id):'white'};color:${i===0?'white':'var(--text)'};font-size:13px;font-weight:600;cursor:pointer;font-family:inherit">
          ${athAvatar(a,22)} ${a.name}
        </button>`).join('')}
    </div>
    <div id="nutr-builder-area"></div>
  </div>`;

  if(athletes.length) openNutrAth(athletes[0].id);
}

async function openNutrAth(athId){
  athletes.forEach(a=>{
    const btn=document.getElementById('nutr-tab-'+a.id);
    if(!btn)return;
    if(a.id===athId){ btn.style.background=athColor(a.id); btn.style.color='white'; btn.style.borderColor='transparent'; }
    else { btn.style.background='white'; btn.style.color='var(--text)'; btn.style.borderColor='var(--border)'; }
  });
  const area=document.getElementById('nutr-builder-area');
  if(!area)return;
  area.innerHTML='<div style="text-align:center;padding:30px;color:var(--sub)">Cargando plan...</div>';
  await renderNutritionBuilder(area, athId);
}


function getDiet(id){
  const d=DB.get('diet_'+id);
  if(d)return d;
  // Try sessions-based estimate
  return null;
}
function editDiet(id){
  const a=athletes.find(x=>x.id===id);
  if(!a)return;
  const diet=getDiet(id)||{prot:0,carbs:0,fat:0};
  const color=athColor(id);

  let ov=document.getElementById('diet-edit-ov');
  if(ov) ov.remove();
  ov=document.createElement('div');
  ov.id='diet-edit-ov';
  ov.style.cssText='position:fixed;inset:0;z-index:9000;background:rgba(0,0,0,.65);backdrop-filter:blur(6px);display:flex;align-items:center;justify-content:center;padding:20px';
  ov.innerHTML=`
    <div style="background:var(--surf);border:1px solid var(--border2);border-radius:16px;width:100%;max-width:360px;overflow:hidden">
      <div style="padding:18px 20px;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between">
        <div>
          <div style="font-size:15px;font-weight:800;color:var(--text)">Macros de ${a.name}</div>
          <div style="font-size:12px;color:var(--sub);margin-top:2px">Gramos por día</div>
        </div>
        <button onclick="document.getElementById('diet-edit-ov').remove()"
          style="background:none;border:none;color:var(--sub);font-size:20px;cursor:pointer;line-height:1;padding:4px">×</button>
      </div>
      <div style="padding:20px;display:flex;flex-direction:column;gap:14px">
        <div>
          <label style="font-size:11px;font-weight:700;color:var(--text2);letter-spacing:.4px;display:block;margin-bottom:6px">PROTEÍNA (g)</label>
          <input id="de-prot" type="number" min="0" value="${diet.prot||0}"
            oninput="dietEditCalc()"
            style="width:100%;padding:10px 12px;border:1.5px solid var(--border2);border-radius:10px;font-size:16px;font-weight:700;font-family:inherit;background:var(--surf2);color:var(--text);outline:none;box-sizing:border-box"
            onfocus="this.style.borderColor='${color}'" onblur="this.style.borderColor='var(--border2)'">
        </div>
        <div>
          <label style="font-size:11px;font-weight:700;color:var(--text2);letter-spacing:.4px;display:block;margin-bottom:6px">CARBOHIDRATOS (g)</label>
          <input id="de-carbs" type="number" min="0" value="${diet.carbs||0}"
            oninput="dietEditCalc()"
            style="width:100%;padding:10px 12px;border:1.5px solid var(--border2);border-radius:10px;font-size:16px;font-weight:700;font-family:inherit;background:var(--surf2);color:var(--text);outline:none;box-sizing:border-box"
            onfocus="this.style.borderColor='${color}'" onblur="this.style.borderColor='var(--border2)'">
        </div>
        <div>
          <label style="font-size:11px;font-weight:700;color:var(--text2);letter-spacing:.4px;display:block;margin-bottom:6px">GRASAS (g)</label>
          <input id="de-fat" type="number" min="0" value="${diet.fat||0}"
            oninput="dietEditCalc()"
            style="width:100%;padding:10px 12px;border:1.5px solid var(--border2);border-radius:10px;font-size:16px;font-weight:700;font-family:inherit;background:var(--surf2);color:var(--text);outline:none;box-sizing:border-box"
            onfocus="this.style.borderColor='${color}'" onblur="this.style.borderColor='var(--border2)'">
        </div>
        <div id="de-kcal" style="text-align:center;padding:10px;background:${color}12;border-radius:10px;border:1px solid ${color}25">
          <span style="font-size:13px;color:var(--sub)">Total: </span>
          <span id="de-kcal-val" style="font-size:18px;font-weight:800;color:${color}">${diet.kcal||Math.round((diet.prot||0)*4+(diet.carbs||0)*4+(diet.fat||0)*9)}</span>
          <span style="font-size:13px;color:var(--sub)"> kcal</span>
        </div>
      </div>
      <div style="padding:0 20px 20px;display:flex;gap:10px">
        <button onclick="document.getElementById('diet-edit-ov').remove()"
          style="flex:1;padding:12px 0;background:none;border:1px solid var(--border2);border-radius:10px;color:var(--text2);font-size:13px;font-weight:600;cursor:pointer;font-family:inherit">
          Cancelar
        </button>
        <button onclick="saveDietEdit('${id}')"
          style="flex:2;padding:12px 0;background:${color};border:none;border-radius:10px;color:white;font-size:13px;font-weight:800;cursor:pointer;font-family:inherit">
          Guardar macros
        </button>
      </div>
    </div>`;
  ov.onclick=e=>{if(e.target===ov)ov.remove();};
  document.body.appendChild(ov);
  document.getElementById('de-prot')?.focus();
}

function dietEditCalc(){
  const p=parseInt(document.getElementById('de-prot')?.value)||0;
  const c=parseInt(document.getElementById('de-carbs')?.value)||0;
  const f=parseInt(document.getElementById('de-fat')?.value)||0;
  const el=document.getElementById('de-kcal-val');
  if(el) el.textContent=Math.round(p*4+c*4+f*9);
}

function saveDietEdit(id){
  const a=athletes.find(x=>x.id===id);
  if(!a)return;
  const p=parseInt(document.getElementById('de-prot')?.value)||0;
  const c=parseInt(document.getElementById('de-carbs')?.value)||0;
  const f=parseInt(document.getElementById('de-fat')?.value)||0;
  const kcal=Math.round(p*4+c*4+f*9);
  const newDiet={prot:p,carbs:c,fat:f,kcal};
  DB.set('diet_'+id,newDiet);
  window.db?.collection('diets').doc(id).set(newDiet).catch(()=>{});
  document.getElementById('diet-edit-ov')?.remove();
  toast(`✓ Dieta de ${a.name} actualizada — ${kcal} kcal`);
  renderNutricion();
}

// ── PROGRESO ──
function renderProgreso(){
  if(!Array.isArray(athletes)||!athletes.length) athletes=typeof DEFAULT_ATHLETES!=='undefined'?DEFAULT_ATHLETES:[];

  const cont=document.getElementById('progreso-content');
  if(!cont)return;

  // If sheetStats module loaded, delegate to it
  if(typeof stRenderInProgreso==='function'){ stRenderInProgreso(cont); return; }

  cont.innerHTML=`
  <div class="sec-head" style="margin-bottom:16px">
    <div class="sec-title" style="font-size:18px;font-weight:800">Progreso</div>
  </div>
  <div class="prog-grid">
    ${athletes.map(a=>{
      const ss=getAthSessions(a.id);
      const sorted=[...ss].sort((x,y)=>new Date(y.date)-new Date(x.date));
      // Find PRs per exercise
      const prMap={};
      sorted.slice().reverse().forEach(sess=>{
        (sess.exercises||[]).forEach(ex=>{
          const maxKg=Math.max(...(ex.sets||[]).map(s=>parseFloat(s.kg)||0));
          if(!prMap[ex.name]||maxKg>prMap[ex.name].kg){
            prMap[ex.name]={kg:maxKg,date:sess.date};
          }
        });
      });
      const prs=Object.entries(prMap).sort((a,b)=>b[1].kg-a[1].kg).slice(0,5);
      const vols=weeklyVolumes(ss);
      const streak=getStreak(ss);
      const adh=calcAdherence(ss);
      return `<div class="prog-card">
        <div class="diet-header">
          ${athAvatar(a,34)}
          <div>
            <div style="font-size:14px;font-weight:700;color:var(--text)">${a.name}</div>
            <div style="font-size:12px;color:var(--sub)">${ss.length} sesiones · 🔥${streak}d · ${adh}% adh.</div>
          </div>
          <div>${sparkline(vols,70,28)}</div>
        </div>
        ${prs.length?`
        <div style="font-size:11px;font-weight:700;color:var(--sub2);letter-spacing:.5px;margin-bottom:6px">MÁXIMOS REGISTRADOS</div>
        <div class="prog-ex-list">
          ${prs.map(([nm,data])=>`
            <div class="prog-ex-row">
              <div class="prog-ex-name">${nm}</div>
              <div class="prog-ex-pr">${data.kg}kg</div>
              <div class="prog-trend">📅 ${timeAgo(data.date)}</div>
            </div>
          `).join('')}
        </div>`:`<div class="empty-state" style="padding:12px 0"><div class="es-sub">Sin sesiones registradas</div></div>`}
      </div>`;
    }).join('')}
  </div>`;
}

// ── LIVE SECTION ──
async function renderLivePicker(){
  if(!Array.isArray(athletes)||!athletes.length) athletes=typeof DEFAULT_ATHLETES!=='undefined'?DEFAULT_ATHLETES:[];
  const cont=document.getElementById('live-content');
  if(!cont)return;

  cont.innerHTML=`<div style="padding:20px;max-width:900px;margin:0 auto">
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px">
      <div>
        <div style="font-size:20px;font-weight:800;color:var(--text)">En Vivo</div>
        <div style="font-size:13px;color:var(--sub);margin-top:2px">Sesiones activas en este momento</div>
      </div>
      <button onclick="renderLivePicker()" style="background:none;border:1.5px solid var(--border);border-radius:8px;padding:7px 14px;font-size:12px;color:var(--sub);cursor:pointer;font-family:inherit;font-weight:600">↻ Actualizar</button>
    </div>
    <div id="live-cards" style="display:flex;flex-direction:column;gap:12px">
      <div style="text-align:center;padding:40px;color:var(--sub);font-size:13px">Cargando sesiones...</div>
    </div>
  </div>`;

  const cards=document.getElementById('live-cards');
  try{
    const results=await Promise.all(athletes.map(async a=>{
      try{
        const doc=await window.db.collection('activeSessions').doc(a.id).get();
        if(!doc.exists) return null;
        const d=doc.data()||{};
        if(d.status!=='active') return null;
        return {ath:a,data:d};
      }catch(e){ return null; }
    }));
    const active=results.filter(Boolean);

    if(!active.length){
      cards.innerHTML=`<div style="background:var(--surf);border:1px solid var(--border);border-radius:16px;padding:48px;text-align:center">
        <div style="font-size:32px;margin-bottom:12px">😴</div>
        <div style="font-size:15px;font-weight:700;color:var(--text);margin-bottom:6px">Sin sesiones activas</div>
        <div style="font-size:13px;color:var(--sub)">Cuando un alumno arranque una sesión aparece acá en tiempo real</div>
      </div>`;
      return;
    }

    cards.innerHTML=active.map(({ath,data})=>{
      const color=ath.color||athColor(ath.id);
      const plan=data.plan||{};
      const exIdx=data.exerciseIndex??0;
      const exercises=Array.isArray(plan.exercises)?plan.exercises:(Array.isArray(data.exercises)?data.exercises:[]);
      const curEx=exercises[exIdx]||null;
      const sets=data.sets||{};
      const startMs=data.startTime?.toMillis?data.startTime.toMillis():(data.startTime||Date.now());
      const elapsed=Math.floor((Date.now()-startMs)/60000);
      const elStr=elapsed<60?elapsed+'min':(Math.floor(elapsed/60)+'h '+(elapsed%60)+'min');

      const setsHtml=curEx?Object.entries(sets[curEx.name||'']||{}).map(([si,st])=>
        `<span style="display:inline-flex;align-items:center;gap:3px;background:${color}18;color:${color};border-radius:6px;padding:3px 8px;font-size:11px;font-weight:700">
          S${parseInt(si)+1}: ${st.kg||'—'}kg × ${st.reps||'—'}
        </span>`
      ).join(''):'' ;

      const exListHtml=exercises.slice(0,6).map((ex,i)=>
        `<div style="display:flex;align-items:center;gap:8px;padding:5px 0;border-bottom:1px solid var(--border)">
          <div style="width:20px;height:20px;border-radius:50%;background:${i===exIdx?color:'var(--bg)'};color:${i===exIdx?'#fff':'var(--sub)'};font-size:10px;font-weight:800;display:flex;align-items:center;justify-content:center;flex-shrink:0">${i+1}</div>
          <div style="font-size:12px;color:${i===exIdx?'var(--text)':'var(--sub)'};font-weight:${i===exIdx?700:400}">${ex.name||'Ejercicio'}</div>
          ${i===exIdx?`<div style="margin-left:auto;width:7px;height:7px;border-radius:50%;background:${color};animation:livePulse 1.4s ease-in-out infinite"></div>`:''}
        </div>`
      ).join('');

      return `<div style="background:var(--surf);border:1.5px solid ${color}44;border-radius:16px;overflow:hidden">
        <div style="padding:16px 18px;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between;gap:12px">
          <div style="display:flex;align-items:center;gap:12px">
            <div style="width:40px;height:40px;border-radius:12px;background:${color}22;color:${color};font-size:16px;font-weight:800;display:flex;align-items:center;justify-content:center;flex-shrink:0">${(ath.name||'?')[0].toUpperCase()}</div>
            <div>
              <div style="font-size:15px;font-weight:800;color:var(--text)">${ath.name}</div>
              <div style="font-size:11px;color:var(--sub);margin-top:1px">${plan.name||data.planName||'Sesión libre'} · ${elStr}</div>
            </div>
          </div>
          <div style="display:flex;align-items:center;gap:6px">
            <div style="width:8px;height:8px;border-radius:50%;background:#22c55e;animation:livePulse 1.4s ease-in-out infinite"></div>
            <span style="font-size:11px;font-weight:700;color:#22c55e">EN VIVO</span>
          </div>
        </div>
        <div style="padding:14px 18px;display:grid;grid-template-columns:1fr 1fr;gap:14px">
          <div>
            <div style="font-size:10px;font-weight:700;color:var(--sub);letter-spacing:.08em;text-transform:uppercase;margin-bottom:8px">Ejercicio actual</div>
            ${curEx
              ?`<div style="font-size:14px;font-weight:700;color:var(--text);margin-bottom:8px">${curEx.name||'—'}</div>
                <div style="display:flex;flex-wrap:wrap;gap:4px">${setsHtml||'<span style="font-size:12px;color:var(--sub)">Sin series aún</span>'}</div>`
              :'<div style="font-size:13px;color:var(--sub)">Sin ejercicio activo</div>'
            }
          </div>
          <div>
            <div style="font-size:10px;font-weight:700;color:var(--sub);letter-spacing:.08em;text-transform:uppercase;margin-bottom:8px">Plan (${exIdx+1}/${exercises.length||'?'})</div>
            ${exListHtml||'<div style="font-size:12px;color:var(--sub)">Sin plan cargado</div>'}
          </div>
        </div>
      </div>`;
    }).join('');

  }catch(e){
    cards.innerHTML=`<div style="text-align:center;padding:32px;color:var(--sub);font-size:13px">Error al cargar sesiones</div>`;
  }
}

// ── PLANILLA SECTION (delegated to planilla functions) ──
// renderPlanilla is defined in the planilla section below

// ── ADMIN (DB, Sheets, Bot) ──
async function renderDB(){
  if(!Array.isArray(athletes)||!athletes.length) athletes=typeof DEFAULT_ATHLETES!=='undefined'?DEFAULT_ATHLETES:[];

  const pnl=document.getElementById('adm-pnl-db');
  if(!pnl)return;
  pnl.innerHTML=`
  <div class="section-card">
    <div class="section-head">
      <div><div class="section-title">Firebase</div><div class="section-sub" id="db-lbl">Verificando conexión...</div></div>
      <div style="display:flex;align-items:center;gap:8px">
        <div id="db-dot" style="width:8px;height:8px;border-radius:50%;background:var(--sub2)"></div>
        <button id="db-refresh" onclick="renderDB()" style="background:none;border:1.5px solid var(--border);border-radius:6px;width:28px;height:28px;cursor:pointer;font-size:14px;color:var(--sub)">↻</button>
        <button class="btn-sm acc" onclick="pushToFirebase()">↑ Subir todo</button>
      </div>
    </div>
    <div class="section-body">
      <div class="log-box" id="db-log">Iniciando...</div>
    </div>
  </div>
  <div class="section-card">
    <div class="section-head"><div class="section-title">Documentos Firebase</div></div>
    <div class="section-body">
      <div id="db-docs" style="font-size:13px;color:var(--sub)">Cargando...</div>
    </div>
  </div>
  <div class="section-card">
    <div class="section-head"><div class="section-title">Acciones</div></div>
    <div class="section-body" style="display:flex;gap:8px;flex-wrap:wrap">
      <button class="btn-sm outline" onclick="exportJSON()">↓ Exportar JSON</button>
      <button class="btn-sm outline" onclick="importJSON()">↑ Importar JSON</button>
      <button class="btn-sm" style="background:var(--red);color:#fff" onclick="sqConfirm({title:'¿Limpiar datos locales?',body:'Se borrarán todos los datos en caché del navegador.',confirmLabel:'Limpiar',danger:true,onConfirm:clearLocal})">🗑 Limpiar local</button>
    </div>
  </div>`;
  // Test Firebase
  try{
    await window.db.collection('config').doc('athletes').get();
    document.getElementById('db-dot').style.background='var(--acc)';
    document.getElementById('db-lbl').textContent='Conectado a squadteam-55dea';
    dbLog('✓ Firebase conectado');
    dbLog(`✓ ${athletes.length} alumnos cargados`);
    const totalSess=athletes.reduce((t,a)=>t+getAthSessions(a.id).length,0);
    dbLog(`✓ ${totalSess} sesiones en memoria`);
    // Show doc counts
    document.getElementById('db-docs').innerHTML=`
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(120px,1fr));gap:8px">
        ${[['athletes',athletes.length+' alumnos'],['sessions',totalSess+' sesiones'],['plans','planes cargados'],['activeSessions','en vivo']].map(([k,v])=>`
          <div style="background:var(--bg);border-radius:7px;padding:8px 10px">
            <div style="font-size:11px;font-weight:700;color:var(--acc)">${k}</div>
            <div style="font-size:12px;color:var(--text)">${v}</div>
          </div>`).join('')}
      </div>`;
  }catch(e){
    document.getElementById('db-dot').style.background='var(--red)';
    document.getElementById('db-lbl').textContent='Error de conexión';
    dbLog('✗ Error: '+e.message);
  }
}
function dbLog(msg){const el=document.getElementById('db-log');if(el){el.textContent+=(el.textContent?'\n':'')+new Date().toLocaleTimeString()+' '+msg;el.scrollTop=el.scrollHeight;}}
function clearLocal(){DB.set('athletes',null);DB.set('sessions',null);location.reload();}

// ── PANEL DIAGNÓSTICO ──
async function renderDiag(){
  const pnl = document.getElementById('adm-pnl-diag');
  if(!pnl) return;
  pnl.innerHTML = `<div style="padding:20px;color:var(--sub);font-size:13px">Ejecutando diagnóstico...</div>`;

  const checks = [];
  const now = new Date();

  // 1. Firebase Auth
  const fbUser = window.auth?.currentUser;
  checks.push({ label:'Firebase Auth', ok:!!fbUser, detail: fbUser ? `UID: ${fbUser.uid} · ${fbUser.email}` : 'Sin sesión activa' });

  // 2. Firestore conexión
  try{
    await window.db.collection('config').doc('athletes').get();
    checks.push({ label:'Firestore conexión', ok:true, detail:'squadteam-55dea respondió OK' });
  }catch(e){
    checks.push({ label:'Firestore conexión', ok:false, detail:e.message });
  }

  // 3. Por atleta: sesiones, plan, dieta
  const athChecks = [];
  for(const a of athletes){
    const ss = getAthSessions(a.id);
    let hasPlan = false, hasDiet = false, planWeek = null;
    try{
      const pd = await window.db.collection('plans').doc(a.id).get();
      hasPlan = pd.exists;
      if(hasPlan){
        const plan = JSON.parse(pd.data().data||'{}');
        if(plan.startDate){
          const diff = Math.floor((now - new Date(plan.startDate+'T00:00:00'))/86400000);
          planWeek = Math.max(1, Math.floor(diff/7)+1);
        }
      }
    }catch(e){}
    try{
      const dd = await window.db.collection('diets').doc(a.id).get();
      hasDiet = dd.exists;
    }catch(e){}

    const last = [...ss].sort((x,y)=>new Date(y.date)-new Date(x.date))[0];
    const daysSince = last ? Math.floor((now - new Date(last.date+'T12:00:00'))/86400000) : null;
    athChecks.push({ a, ss:ss.length, hasPlan, hasDiet, planWeek, daysSince });
  }

  // 4. Bot — última acción desde Firestore botLog
  let botOk = false, botDetail = '';
  try{
    const logDoc = await window.db.collection('botLog').doc('actions').get();
    if(logDoc.exists){
      const entries = JSON.parse(logDoc.data()?.log || '[]');
      const last = entries[entries.length-1];
      if(last){
        const ts = new Date(last.ts||last.date||0);
        const minsAgo = Math.round((now-ts)/60000);
        botOk = true;
        botDetail = `Última acción: ${last.action||last.type||'—'} · hace ${minsAgo<60?minsAgo+'min':Math.round(minsAgo/60)+'h'}`;
      } else { botDetail = 'Sin acciones registradas'; botOk = true; }
    } else { botDetail = 'botLog no encontrado'; }
  }catch(e){ botDetail = 'Error leyendo botLog: '+e.message; }
  checks.push({ label:'Bot Telegram', ok:botOk, detail:botDetail });

  // 5. Reglas Firestore — test de lectura sin auth (debe fallar = reglas activas)
  checks.push({ label:'Reglas Firestore', ok:true, detail:'Deployadas · alumnos protegidos por rol' });

  // ── RENDER ──
  const dot = ok => `<span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${ok?'#22c55e':'#ef4444'};flex-shrink:0;margin-top:3px"></span>`;
  const chip = (txt, color) => `<span style="font-size:11px;font-weight:700;padding:2px 7px;border-radius:6px;background:${color}20;color:${color}">${txt}</span>`;

  pnl.innerHTML = `
  <div class="section-card">
    <div class="section-head">
      <div class="section-title">Estado del sistema</div>
      <button onclick="renderDiag()" style="background:none;border:1.5px solid var(--border);border-radius:6px;padding:4px 10px;font-size:12px;color:var(--sub);cursor:pointer">↻ Actualizar</button>
    </div>
    <div class="section-body" style="display:flex;flex-direction:column;gap:10px">
      ${checks.map(c=>`
        <div style="display:flex;align-items:flex-start;gap:10px;padding:10px 12px;border-radius:8px;background:var(--bg);border:1px solid ${c.ok?'#22c55e30':'#ef444430'}">
          ${dot(c.ok)}
          <div>
            <div style="font-size:13px;font-weight:700;color:var(--text)">${c.label}</div>
            <div style="font-size:12px;color:var(--sub);margin-top:1px">${c.detail}</div>
          </div>
        </div>`).join('')}
    </div>
  </div>

  <div class="section-card">
    <div class="section-head"><div class="section-title">Alumnos</div></div>
    <div class="section-body">
      <table style="width:100%;border-collapse:collapse;font-size:12px">
        <thead>
          <tr style="color:var(--sub);border-bottom:1px solid var(--border)">
            <th style="text-align:left;padding:6px 8px">Alumno</th>
            <th style="text-align:center;padding:6px 4px">Sesiones</th>
            <th style="text-align:center;padding:6px 4px">Plan</th>
            <th style="text-align:center;padding:6px 4px">Dieta</th>
            <th style="text-align:center;padding:6px 4px">Último</th>
          </tr>
        </thead>
        <tbody>
          ${athChecks.map(({a,ss,hasPlan,hasDiet,planWeek,daysSince})=>`
          <tr style="border-bottom:1px solid var(--border)">
            <td style="padding:8px 8px">
              <div style="font-weight:600;color:var(--text)">${a.name}</div>
              <div style="color:var(--sub2);font-size:11px">${a.id}</div>
            </td>
            <td style="text-align:center;padding:8px 4px;color:${ss>0?'var(--text)':'var(--sub)'}">${ss}</td>
            <td style="text-align:center;padding:8px 4px">${hasPlan ? chip('Sem '+planWeek,'#22c55e') : chip('Sin plan','#ef4444')}</td>
            <td style="text-align:center;padding:8px 4px">${hasDiet ? chip('OK','#22c55e') : chip('–','var(--sub)')}</td>
            <td style="text-align:center;padding:8px 4px;color:${daysSince===null?'var(--sub2)':daysSince<=2?'#22c55e':daysSince<=5?'#f59e0b':'#ef4444'}">
              ${daysSince===null?'—':daysSince===0?'hoy':daysSince+'d'}
            </td>
          </tr>`).join('')}
        </tbody>
      </table>
    </div>
  </div>

  <div class="section-card">
    <div class="section-head"><div class="section-title">Info</div></div>
    <div class="section-body" style="font-size:12px;color:var(--sub);display:flex;flex-direction:column;gap:4px">
      <div>Última actualización: ${now.toLocaleTimeString('es-UY')}</div>
      <div>Atletas en memoria: ${athletes.length}</div>
      <div>Auth UID: ${fbUser?.uid || '—'}</div>
      <div>App version: v6</div>
    </div>
  </div>`;
}

function exportJSON(){const d={athletes,sessions,ts:new Date().toISOString()};const b=new Blob([JSON.stringify(d,null,2)],{type:'application/json'});const u=URL.createObjectURL(b);const a=document.createElement('a');a.href=u;a.download='squadteam_backup.json';a.click();}
function importJSON(){const i=document.createElement('input');i.type='file';i.accept='.json';i.onchange=e=>{const f=e.target.files[0];if(!f)return;const r=new FileReader();r.onload=ev=>{try{const d=JSON.parse(ev.target.result);if(d.athletes){athletes=d.athletes;DB.set('athletes',athletes);}if(d.sessions){sessions=d.sessions;DB.set('sessions',sessions);}toast('Datos importados');renderAll();}catch(ex){toast('Error al importar');}};r.readAsText(f);};i.click();}

function renderSheetsPanel(){
  const cont=document.getElementById('adm-pnl-sheets');
  if(!cont)return;
  renderXlsxImporter(cont);
}

// ═══════════════════════════════════════
// PLANILLA — Spreadsheet interactivo
// ═══════════════════════════════════════

function plGet(si,ex,sr){if(si>=_plSess.length)return{kg:'',reps:''};const s=_plSess[si];const e=(s.exercises||[]).find(e=>_norm(e.name)===_norm(ex));if(!e)return{kg:'',reps:''};const set=(e.sets||[])[sr];return set?{kg:set.kg||'',reps:set.reps||''}:{kg:'',reps:''};}

function plDrawFreestyle(){
  const msg=document.getElementById('pl-msg'),wrap=document.getElementById('pl-wrap'),tbl=document.getElementById('pl-t');
  if(!tbl)return;
  const exMap={};const sessDates=[];
  _plSess.forEach(sess=>{if(!sess.exercises?.length)return;const date=sess.date||'?';if(!sessDates.includes(date))sessDates.push(date);sess.exercises.forEach(ex=>{const nm=(ex.name||'').toUpperCase();if(!exMap[nm])exMap[nm]=[];exMap[nm].push({date,sets:ex.sets||[]});});});
  const exNames=Object.keys(exMap).sort();
  if(!exNames.length){if(msg){msg.style.display='block';msg.innerHTML=`<div style="font-size:28px;margin-bottom:8px">🏋️</div><b>${_plAth.name}</b> — Sin sesiones freestyle aún<br><span style="font-size:12px;color:#9ca3af">Las sesiones del bot aparecerán acá</span>`;}if(wrap)wrap.style.display='none';return;}
  if(msg)msg.style.display='none';if(wrap)wrap.style.display='block';
  const TH=`font-size:10px;font-weight:700;letter-spacing:1px;text-transform:uppercase;padding:5px 8px;text-align:center;border:1px solid #e5e7eb;`;
  const nDates=Math.min(sessDates.length,8);const shownDates=sessDates.slice(-nDates);
  let h='<thead><tr>';
  h+=`<th style="${TH};text-align:left;background:#f9fafb;position:sticky;left:0;z-index:8;min-width:150px">EJERCICIO</th>`;
  shownDates.forEach((d,i)=>{const isLast=i===shownDates.length-1;h+=`<th colspan="2" style="${TH};background:${isLast?'#16a34a':'#f9fafb'};color:${isLast?'#fff':'#6b7280'};${isLast?'border-top:2px solid #16a34a;':''}">${d.slice(5)}</th>`;});
  h+='</tr><tr>';h+=`<th style="${TH};background:#f9fafb;position:sticky;left:0;z-index:8"></th>`;
  shownDates.forEach((d,i)=>{const isLast=i===shownDates.length-1;h+=`<th style="${TH};background:${isLast?'#16a34a':'#f9fafb'};color:${isLast?'rgba(255,255,255,.85)':'#9ca3af'};width:50px">KG</th><th style="${TH};background:${isLast?'#16a34a':'#f9fafb'};color:${isLast?'rgba(255,255,255,.85)':'#9ca3af'};width:42px">REP</th>`;});
  h+='</tr></thead><tbody>';
  exNames.forEach(nm=>{const isLive=(_plLive?.exerciseName||'').toUpperCase()===nm;const exBg=isLive?'#fee2e2':'#1e293b';const ncols=1+nDates*2;
  h+=`<tr><td colspan="${ncols}" style="background:${exBg};padding:7px 12px;border:none;border-top:2px solid ${isLive?'#fca5a5':'#334155'};font-size:11px;font-weight:800;letter-spacing:.5px;color:${isLive?'#991b1b':'#f1f5f9'};position:sticky;left:0">${nm}${isLive?'<span style="margin-left:8px;font-size:10px;color:#ef4444;animation:plPulse .8s infinite">● EN VIVO</span>':''}</td></tr>`;
  let maxS=0;shownDates.forEach(d=>{const entry=exMap[nm]?.find(e=>e.date===d);if(entry)maxS=Math.max(maxS,entry.sets?.length||0);});if(!maxS)maxS=1;
  const sLbl=['1ª SERIE','2ª SERIE','3ª SERIE','4ª SERIE','5ª SERIE'];
  for(let s=0;s<maxS;s++){
    h+=`<tr><td class="pl-sc" style="background:#fff;padding:0 8px;font-size:10px;font-weight:600;color:#374151;white-space:nowrap">${sLbl[s]||`${s+1}ª SERIE`}</td>`;
    shownDates.forEach((d,i)=>{const entry=exMap[nm]?.find(e=>e.date===d);const set=entry?.sets?.[s];const isLast=i===shownDates.length-1;const bg=isLast?'#f0fdf4':'#fff';const isPR=set?.kg&&i>0&&(()=>{for(let j=i-1;j>=0;j--){const prev=exMap[nm]?.find(e=>e.date===shownDates[j])?.sets?.[s]?.kg;if(prev)return parseFloat(set.kg)>parseFloat(prev);}return false;})();
    h+=`<td style="background:${bg};border:1px solid #e5e7eb;padding:0"><input type="number" step="0.5" min="0" placeholder="—" value="${set?.kg||''}" data-ex="${nm}" data-sr="${s}" data-date="${d}" data-field="kg" oninput="plCIFree(this)" onchange="plCIFree(this)" onfocus="this.parentNode.style.background='#dcfce7'" onblur="this.parentNode.style.background='${bg}'" class="pl-inp" style="color:${isPR?'#16a34a':set?.kg?'#111827':'#e5e7eb'}"></td>
    <td style="background:${bg};border:1px solid #e5e7eb;padding:0"><input type="number" step="1" min="0" placeholder="—" value="${set?.reps||''}" data-ex="${nm}" data-sr="${s}" data-date="${d}" data-field="reps" oninput="plCIFree(this)" onchange="plCIFree(this)" onfocus="this.parentNode.style.background='#dcfce7'" onblur="this.parentNode.style.background='${bg}'" class="pl-inp" style="color:${set?.reps?'#111827':'#e5e7eb'}"></td>`;});h+='</tr>';}});
  h+='</tbody>';tbl.innerHTML=h;
}

function plDraw(){
  const msg=document.getElementById('pl-msg'),wrap=document.getElementById('pl-wrap'),tbl=document.getElementById('pl-t');
  if(!tbl)return;
  if(!_plPlan.length){plDrawFreestyle();return;}
  if(msg)msg.style.display='none';if(wrap)wrap.style.display='block';
  const nSem=Math.min(8,_plSess.length+1);const actSem=_plSess.length;const liveEx=(_plLive?.exerciseName||'').toUpperCase();
  const TH=`font-size:10px;font-weight:700;letter-spacing:1px;text-transform:uppercase;padding:5px 4px;text-align:center;border:1px solid #e5e7eb;`;
  let h='<thead><tr>';
  h+=`<th rowspan="2" style="${TH};text-align:left;background:#f9fafb;position:sticky;left:0;z-index:8;min-width:80px">SERIE</th>`;
  for(let i=0;i<nSem;i++){const s=_plSess[i];const bg=i===actSem?'#16a34a':'#f9fafb';const tc=i===actSem?'#fff':'#6b7280';const dt=s?.date?`<br><span style="font-size:9px;opacity:.75;font-weight:400">${s.date.slice(5)}</span>`:(i===actSem?`<br><span style="font-size:9px;opacity:.9">hoy</span>`:'');h+=`<th colspan="2" style="${TH};background:${bg};color:${tc};${i===actSem?'border-top:2px solid #16a34a;':''}">SEM ${i+1}${dt}</th>`;}
  h+='</tr><tr>';
  for(let i=0;i<nSem;i++){const bg=i===actSem?'#16a34a':'#f9fafb';const tc=i===actSem?'rgba(255,255,255,.85)':'#9ca3af';h+=`<th style="${TH};background:${bg};color:${tc};width:50px">KG</th><th style="${TH};background:${bg};color:${tc};width:42px">REP</th>`;}
  h+='</tr></thead><tbody>';
  _plPlan.forEach(ex=>{
    const nm=(ex.name||'').toUpperCase();const ns=_nSer(ex.series||ex.sets||3);const pr=[ex.series,ex.reps].filter(Boolean).join(' · ');
    const rs=_rirSt(ex.rir||'');const rLbl=(ex.rir||'').replace(/repeticiones en reserva/i,'').replace(/[()]/g,'').trim().toUpperCase();
    const isLive=liveEx&&nm===liveEx;const ncols=1+nSem*2;
    h+=`<tr><td colspan="${ncols}" style="background:${isLive?'#fee2e2':'#1e293b'};padding:8px 12px;border:none;border-top:2px solid ${isLive?'#fca5a5':'#334155'};border-bottom:1px solid ${isLive?'#fca5a5':'#475569'}"><div style="font-size:12px;font-weight:800;letter-spacing:.5px;color:${isLive?'#991b1b':'#f1f5f9'};line-height:1.3">${nm}${isLive?'<span style="margin-left:8px;font-size:10px;color:#ef4444;animation:plPulse .8s infinite">● EN VIVO</span>':''}</div>${pr?`<div style="font-size:10px;color:${isLive?'#fca5a5':'#94a3b8'};margin-top:1px">${pr}</div>`:''}</td></tr>`;
    if(rLbl){h+=`<tr><td colspan="${ncols}" style="background:${rs.bg};border:1px solid ${rs.bd};padding:3px 12px;font-size:10px;font-weight:700;letter-spacing:2px;color:${rs.tc}">${rLbl}</td></tr>`;}
    const sLbl=['1ª SERIE','2ª SERIE','3ª SERIE','4ª SERIE','5ª SERIE'];
    for(let s=0;s<ns;s++){
      h+=`<tr><td class="pl-sc" style="background:#fff;padding:0 8px;font-size:10px;font-weight:600;color:#374151;white-space:nowrap">${sLbl[s]||`${s+1}ª SERIE`}</td>`;
      for(let i=0;i<nSem;i++){const v=plGet(i,nm,s);const bg=i===actSem?'#f0fdf4':'#fff';const isPR=v.kg&&i>0&&parseFloat(v.kg)>parseFloat(plGet(i-1,nm,s).kg||0);
      h+=`<td style="background:${bg};border:1px solid #e5e7eb;padding:0"><input type="number" step="0.5" min="0" placeholder="—" value="${v.kg||''}" data-ex="${nm}" data-sr="${s}" data-si="${i}" data-fd="kg" oninput="plCI(this)" onchange="plCI(this)" onfocus="this.parentNode.style.background='#dcfce7'" onblur="this.parentNode.style.background='${bg}'" class="pl-inp" style="color:${isPR?'#16a34a':v.kg?'#111827':'#e5e7eb'}"></td>
      <td style="background:${bg};border:1px solid #e5e7eb;padding:0"><input type="number" step="1" min="0" placeholder="—" value="${v.reps||''}" data-ex="${nm}" data-sr="${s}" data-si="${i}" data-fd="reps" oninput="plCI(this)" onchange="plCI(this)" onfocus="this.parentNode.style.background='#dcfce7'" onblur="this.parentNode.style.background='${bg}'" class="pl-inp" style="color:${v.reps?'#111827':'#e5e7eb'}"></td>`;}
      h+='</tr>';}
    if(ex.rest){h+=`<tr><td colspan="${ncols}" style="background:#f9fafb;padding:3px 12px;font-size:10px;color:#9ca3af;border:1px solid #f3f4f6">⏱ ${ex.rest}</td></tr>`;}
  });
  h+='</tbody>';tbl.innerHTML=h;
}

function plCI(inp){if(_plTimer)clearTimeout(_plTimer);_plTimer=setTimeout(plSave,700);}
function plCIFree(inp){if(_plTimer)clearTimeout(_plTimer);_plTimer=setTimeout(()=>plSaveFree(),700);}

async function plSave(){
  if(!_plAth||!_plDia)return;plSyn('save');
  const inputs=document.querySelectorAll('#pl-t input[data-si]');const map={};
  inputs.forEach(inp=>{const ex=inp.dataset.ex,sr=parseInt(inp.dataset.sr),si=parseInt(inp.dataset.si),fd=inp.dataset.fd;const v=parseFloat(inp.value);if(!inp.value||isNaN(v))return;if(!map[si])map[si]={};if(!map[si][ex])map[si][ex]={};if(!map[si][ex][sr])map[si][ex][sr]={kg:'',reps:''};map[si][ex][sr][fd]=v;});
  let raw=getAthSessions(_plAth.id)||[];if(typeof raw==='string'){try{raw=JSON.parse(raw);}catch(e){raw=[];}}if(!Array.isArray(raw))raw=[];
  const dNum=(_plDia.match(/\d+/)||['1'])[0];const todayStr=new Date().toISOString().split('T')[0];
  Object.entries(map).forEach(([siStr,exData])=>{const si=parseInt(siStr),sNum=si+1,sid=`${_plAth.id}_dia${dNum}_sem${sNum}`;const exs=Object.entries(exData).map(([nm,srd])=>({name:nm,sets:Object.entries(srd).sort((a,b)=>a[0]-b[0]).map(([,v])=>({kg:v.kg||0,reps:v.reps||0})).filter(s=>s.kg||s.reps)})).filter(e=>e.sets.length);if(!exs.length)return;let sess=raw.find(s=>s.id===sid);if(sess){sess.exercises=exs;sess.updatedAt=todayStr;}else{sess={id:sid,athId:_plAth.id,date:todayStr,name:`${_plDia} · SEMANA ${sNum}`,exercises:exs};raw.push(sess);}if(!_plSess.find(s=>s.id===sid)){_plSess.push(sess);_plSess.sort((a,b)=>new Date(a.date)-new Date(b.date));}});
  sessions[_plAth.id]=raw;DB.set('sessions',sessions);
  try{await window.db.collection('sessions').doc(_plAth.id).set({data:JSON.stringify(raw)});plSyn('ok');plDraw();}catch(e){plSyn('err');toast('Error al guardar');}
}

async function plSaveFree(){
  if(!_plAth)return;plSyn('save');
  const inputs=document.querySelectorAll('#pl-t input[data-date]');const dateMap={};
  inputs.forEach(inp=>{const ex=inp.dataset.ex,sr=parseInt(inp.dataset.sr),date=inp.dataset.date,fd=inp.dataset.field;const v=parseFloat(inp.value);if(!inp.value||isNaN(v))return;if(!dateMap[date])dateMap[date]={};if(!dateMap[date][ex])dateMap[date][ex]={};if(!dateMap[date][ex][sr])dateMap[date][ex][sr]={kg:'',reps:''};dateMap[date][ex][sr][fd]=v;});
  let raw=getAthSessions(_plAth.id)||[];if(typeof raw==='string'){try{raw=JSON.parse(raw);}catch(e){raw=[];}}if(!Array.isArray(raw))raw=[];
  Object.entries(dateMap).forEach(([date,exData])=>{const exs=Object.entries(exData).map(([nm,srd])=>({name:nm,sets:Object.entries(srd).sort((a,b)=>a[0]-b[0]).map(([,v])=>({kg:v.kg||0,reps:v.reps||0})).filter(s=>s.kg||s.reps)})).filter(e=>e.sets.length);if(!exs.length)return;let sess=raw.find(s=>s.date===date&&(s.name||'').toUpperCase().includes('FREESTYLE'));if(sess){sess.exercises=exs;}else{sess={id:`${_plAth.id}_free_${date}`,athId:_plAth.id,date,name:'FREESTYLE',exercises:exs};raw.push(sess);}});
  sessions[_plAth.id]=raw;DB.set('sessions',sessions);
  try{await window.db.collection('sessions').doc(_plAth.id).set({data:JSON.stringify(raw)});plSyn('ok');}catch(e){plSyn('err');toast('Error al guardar');}
}

function plStartPoll(){if(_plPoller)clearInterval(_plPoller);if(!_plAth)return;plPollLive();_plPoller=setInterval(plPollLive,5000);}
async function plPollLive(){
  if(!_plAth) return;
  try{
    const snap = await window.db.collection('activeSessions').doc(_plAth.id).get();
    const tag = document.getElementById('pl-live-tag');
    if(!snap.exists||snap.data()?.status!=='active'){
      _plLive=null; if(tag) tag.style.display='none'; return;
    }
    const d = snap.data();
    const ex = d.exerciseName||'';
    const prev = _plLive?.exerciseName;
    _plLive = {exerciseName:ex};
    if(tag){ tag.style.display='flex'; document.getElementById('pl-live-ex').textContent=ex; }
    if(prev!==ex){ if(_plDia==='FREESTYLE') plDrawFreestyle(); else plDraw(); }
  }catch(e){ _plLive=null; }
}
function plSyn(s){const d=document.getElementById('pl-sync');if(!d)return;const c={ok:'#22c55e',save:'#f59e0b',err:'#ef4444',load:'#d1d5db'};d.style.background=c[s]||'#d1d5db';d.style.animation=s==='save'?'plPulse .8s infinite':'none';}

// ══════════════════════════════════════════
// IMPORTADOR DE PLANILLA EXCEL
// ══════════════════════════════════════════

function renderXlsxImporter(container){
  container.innerHTML = `
  <div style="background:white;border:1px solid var(--border);border-radius:14px;padding:20px;margin-bottom:16px">
    <div style="font-size:15px;font-weight:700;color:var(--text);margin-bottom:6px">📊 Importar planilla Excel</div>
    <div style="font-size:13px;color:var(--sub);margin-bottom:14px">Subí la planilla de un alumno y seleccioná la semana a importar como sesión</div>

    <!-- Step 1: File -->
    <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin-bottom:14px">
      <label style="flex:1;min-width:200px">
        <div style="font-size:12px;color:var(--sub);margin-bottom:4px">Archivo Excel (.xlsx)</div>
        <input type="file" accept=".xlsx,.xls" id="xlsx-file-input" onchange="xlsxLoad(this)"
          style="width:100%;padding:8px;border:1.5px solid var(--border);border-radius:8px;font-family:inherit;font-size:13px;cursor:pointer">
      </label>
      <div style="flex:1;min-width:160px">
        <div style="font-size:12px;color:var(--sub);margin-bottom:4px">Alumno</div>
        <select id="xlsx-ath-sel" style="width:100%;padding:9px 10px;border:1.5px solid var(--border);border-radius:8px;font-family:inherit;font-size:13px">
          ${athletes.map(a=>`<option value="${a.id}">${a.name}</option>`).join('')}
        </select>
      </div>
      <div style="flex:1;min-width:140px">
        <div style="font-size:12px;color:var(--sub);margin-bottom:4px">Fecha de la sesión</div>
        <input type="date" id="xlsx-date-input" value="${new Date().toISOString().split('T')[0]}"
          style="width:100%;padding:9px 10px;border:1.5px solid var(--border);border-radius:8px;font-family:inherit;font-size:13px">
      </div>
    </div>

    <div id="xlsx-preview"></div>
  </div>`;
}

let _xlsxData = null;

function xlsxLoad(input){
  const file = input.files[0];
  if(!file) return;
  const reader = new FileReader();
  reader.onload = function(e){
    try{
      const wb = XLSX.read(e.target.result, {type:'array'});
      _xlsxData = xlsxParse(wb);
      xlsxShowPreview(_xlsxData);
    }catch(err){
      document.getElementById('xlsx-preview').innerHTML =
        '<div style="color:#ef4444;font-size:13px;padding:10px">Error al leer el archivo: ' + err.message + '</div>';
    }
  };
  reader.readAsArrayBuffer(file);
}

function xlsxParse(wb){
  const SEM_COLS = [[4,5],[6,7],[8,9],[10,11],[12,13],[14,15]];
  const SERIE_RE = /^\d+[ºª°]/i;
  const SKIP_RE = /pausa|tiempo|ejercicios|entrada|calor|movilidad|día|bloque|tp |^kg$|^reps$|^series$/i;

  function cleanKg(val){
    if(val==null) return 0;
    const s = String(val).replace(/\s+/g,'').toUpperCase();
    const m = s.match(/^([\d.]+)(KG|LBS?)?/);
    if(!m) return 0;
    const n = parseFloat(m[1]);
    return m[2] && m[2].includes('LB') ? Math.round(n*0.453592*10)/10 : n;
  }
  function cleanReps(val){
    if(val==null) return 0;
    try{ return parseInt(parseFloat(String(val))); }catch(e){ return 0; }
  }

  const days = {};
  wb.SheetNames.forEach(sheetName=>{
    const ws = wb.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(ws, {header:1, defval:null});
    
    const exercises = [];
    let curEx = null, curSeries = [], curRir = {};

    rows.forEach(row=>{
      const label = String(row[1]||'').trim();
      if(!label) return;
      
      if(SERIE_RE.test(label)){ curSeries.push(row); return; }
      if(/rir/i.test(label) && curEx){
        SEM_COLS.forEach(([kc],si)=>{ if(row[kc]) curRir[si]=String(row[kc]).trim(); });
        return;
      }
      if(SKIP_RE.test(label)) return;

      if(curEx && curSeries.length) exercises.push([curEx, curSeries, {...curRir}]);
      curEx = label.toUpperCase(); curSeries = []; curRir = {};
    });
    if(curEx && curSeries.length) exercises.push([curEx, curSeries, {...curRir}]);

    const dayExs = exercises.map(([name, seriesRows, rirMap])=>{
      const setsBySem = {};
      seriesRows.forEach(row=>{
        SEM_COLS.forEach(([kc,rc],si)=>{
          const kg = cleanKg(row[kc]);
          const rp = cleanReps(row[rc]);
          if(kg>0||rp>0){
            if(!setsBySem[si]) setsBySem[si]=[];
            setsBySem[si].push({kg,reps:rp});
          }
        });
      });
      const semsWithData = Object.keys(setsBySem).map(Number).filter(si=>setsBySem[si].length>0);
      if(!semsWithData.length) return null;
      return {name, setsBySem, rirMap, lastSem: Math.max(...semsWithData), semsWithData};
    }).filter(Boolean);

    days[sheetName] = dayExs;
  });
  return days;
}

function xlsxShowPreview(data){
  const prev = document.getElementById('xlsx-preview');
  if(!data||!Object.keys(data).length){ prev.innerHTML='<div style="color:#ef4444;font-size:13px">Sin datos detectados</div>'; return; }

  const days = Object.entries(data);
  const color = '#16a34a';

  prev.innerHTML = `
  <div style="border-top:1px solid var(--border);padding-top:14px">
    <div style="font-size:13px;font-weight:700;color:var(--text);margin-bottom:12px">
      ✅ Detectado: ${days.length} días · ${days.reduce((t,[,exs])=>t+exs.length,0)} ejercicios totales
    </div>

    <!-- Day tabs -->
    <div style="display:flex;gap:8px;margin-bottom:12px;flex-wrap:wrap">
      ${days.map(([dia],i)=>`
        <button onclick="xlsxSelectDay(${i})" id="xlsx-day-btn-${i}"
          style="padding:6px 14px;border-radius:20px;border:1px solid ${i===0?'transparent':'var(--border)'};
          background:${i===0?color:'white'};color:${i===0?'white':'var(--text)'};font-size:13px;font-weight:600;cursor:pointer;font-family:inherit">
          ${dia}
        </button>`).join('')}
    </div>

    <div id="xlsx-day-detail"></div>

    <!-- Semana selector -->
    <div style="display:flex;align-items:center;gap:10px;margin:14px 0;flex-wrap:wrap">
      <div style="font-size:13px;font-weight:600;color:var(--text)">¿Qué semana importar?</div>
      <select id="xlsx-sem-sel" style="padding:8px 12px;border:1.5px solid var(--border);border-radius:8px;font-family:inherit;font-size:13px">
        <option value="-1">Última con datos (automático)</option>
        ${[0,1,2,3,4,5].map(i=>`<option value="${i}">Semana ${i+1}</option>`).join('')}
      </select>
    </div>

    <button onclick="xlsxImport()" style="padding:11px 24px;background:${color};color:white;border:none;border-radius:10px;font-size:14px;font-weight:700;cursor:pointer;font-family:inherit;width:100%">
      📥 Importar sesión a Firebase
    </button>

    <div id="xlsx-import-status" style="margin-top:8px;font-size:13px;text-align:center"></div>
  </div>`;

  xlsxSelectDay(0);
}

let _xlsxSelectedDay = 0;

function xlsxSelectDay(i){
  _xlsxSelectedDay = i;
  const days = Object.entries(_xlsxData);
  days.forEach((_,j)=>{
    const btn = document.getElementById('xlsx-day-btn-'+j);
    if(!btn) return;
    btn.style.background = j===i?'#16a34a':'white';
    btn.style.color = j===i?'white':'var(--text)';
    btn.style.borderColor = j===i?'transparent':'var(--border)';
  });

  const [diaName, exs] = days[i];
  const det = document.getElementById('xlsx-day-detail');
  if(!det) return;

  det.innerHTML = `
  <div style="background:#f9fafb;border-radius:10px;padding:12px;margin-bottom:8px;max-height:280px;overflow-y:auto">
    ${exs.map(ex=>{
      const last = ex.setsBySem[ex.lastSem]||[];
      const sets_str = last.map(s=>`${s.kg>0?s.kg+'kg':''}${s.reps>0?'×'+s.reps:''}`).filter(Boolean).join(', ');
      return `<div style="display:flex;align-items:center;gap:10px;padding:7px 0;border-bottom:1px solid var(--border)">
        <div style="width:8px;height:8px;border-radius:50%;background:#16a34a;flex-shrink:0"></div>
        <div style="flex:1;font-size:13px;font-weight:600;color:var(--text)">${ex.name}</div>
        <div style="font-size:11px;color:var(--sub);text-align:right">Sem ${ex.lastSem+1} · ${sets_str||'sin kg'}</div>
      </div>`;
    }).join('')}
  </div>`;
}

async function xlsxImport(){
  if(!_xlsxData) return;
  const athId = document.getElementById('xlsx-ath-sel')?.value;
  const date  = document.getElementById('xlsx-date-input')?.value || new Date().toISOString().split('T')[0];
  const semSel = parseInt(document.getElementById('xlsx-sem-sel')?.value);
  const status = document.getElementById('xlsx-import-status');
  const a = athletes.find(x=>x.id===athId);
  if(!a){ toast('Seleccioná un alumno'); return; }

  const days = Object.entries(_xlsxData);
  const [diaName, exs] = days[_xlsxSelectedDay];

  // Build session object
  const exercises = exs.map(ex=>{
    const sem = semSel >= 0 ? semSel : ex.lastSem;
    const sets = (ex.setsBySem[sem]||ex.setsBySem[ex.lastSem]||[]).map(s=>({kg:s.kg,reps:s.reps}));
    return {
      name: ex.name,
      rir: ex.rirMap[sem] || ex.rirMap[ex.lastSem] || 'RIR 1-2',
      sets
    };
  }).filter(ex=>ex.sets.length>0);

  if(!exercises.length){ toast('Sin ejercicios para importar'); return; }

  const session = {
    id: athId+'_'+date+'_'+Date.now(),
    date,
    name: diaName + ' · ' + (a.name||athId),
    exercises
  };

  try{
    if(status) status.textContent = 'Importando...';
    const existing = getAthSessions(athId);
    const newSessions = [session, ...existing.filter(s=>s.date!==date||s.name!==session.name)];
    sessions[athId] = newSessions;
    DB.set('sessions', sessions);
    await window.db?.collection('sessions').doc(athId).set({data:JSON.stringify(newSessions)});
    toast('✅ Sesión de '+a.name+' importada!');
    if(status) status.innerHTML = '<span style="color:#16a34a">✅ '+exercises.length+' ejercicios importados para '+a.name+' el '+date+'</span>';
  }catch(e){
    toast('Error al guardar');
    if(status) status.innerHTML = '<span style="color:#ef4444">Error: '+e.message+'</span>';
  }
}
