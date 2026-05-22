// js/pagos.js — Sección PAGOS v2
// Reemplaza renderPagos de coach.js con vista premium y completa.
// Compatible con la estructura existente: athlete.payment {status,payday,amount,lastPaid}
// Agrega: currency, historial en Firebase, recordatorios.

'use strict';

// ── FIREBASE ──────────────────────────────────────────────────────────────────
async function pgGetHistory(athId){
  try{
    const doc = await window.db.collection('paymentHistory').doc(athId).get();
    if(!doc.exists) return [];
    const raw = doc.data()?.data;
    return raw ? JSON.parse(raw) : [];
  }catch(e){ return []; }
}

async function pgSaveHistory(athId, list){
  await window.db.collection('paymentHistory').doc(athId).set({ data: JSON.stringify(list) });
}

async function pgGetReminderLog(athId){
  try{
    const doc = await window.db.collection('reminderLog').doc(athId).get();
    if(!doc.exists) return [];
    const raw = doc.data()?.data;
    return raw ? JSON.parse(raw) : [];
  }catch(e){ return []; }
}

async function pgSaveReminderLog(athId, list){
  await window.db.collection('reminderLog').doc(athId).set({ data: JSON.stringify(list) });
}

function pgSaveAthletes(){
  DB.set('athletes', athletes);
  window.db?.collection('config').doc('athletes').set({list:JSON.stringify(athletes)}).catch(()=>{});
}

// ── STATUS CALCULATOR ─────────────────────────────────────────────────────────
const PG_MONTHS = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
function pgFmt(d){ return `${d.getDate()} ${PG_MONTHS[d.getMonth()]}`; }
function pgFmtFull(dateStr){
  if(!dateStr) return '—';
  const d = new Date(dateStr+'T12:00:00');
  return `${d.getDate()} ${PG_MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

function payCalc(a){
  if(a.guest) return {status:'guest', daysUntil:null, period:'', nextDueStr:'', daysOverdue:0};
  const pay = a.payment || {};
  const now  = new Date();
  const todayDay = now.getDate();

  if(!pay.payday && !pay.amount) return { status:'unconfigured', daysUntil:null, period:'', nextDueStr:'', daysOverdue:0 };

  const payday  = pay.payday || 1;
  const daysRaw = payday - todayDay;   // >0 = upcoming, <0 = past this month

  // ── Is paid for current billing cycle? ──
  let paidThisPeriod = false;
  if(pay.lastPaid){
    const lp = new Date(pay.lastPaid + 'T12:00:00');
    // Cycle start = payday of this month (if payday <= today) or payday of last month
    const cycleYear  = payday <= todayDay ? now.getFullYear() : (now.getMonth()===0?now.getFullYear()-1:now.getFullYear());
    const cycleMonth = payday <= todayDay ? now.getMonth() : (now.getMonth()===0?11:now.getMonth()-1);
    const cycleStart = new Date(cycleYear, cycleMonth, payday);
    paidThisPeriod = lp >= cycleStart;
  }

  // ── Status ──
  let status, daysUntil = 0, daysOverdue = 0;
  if(paidThisPeriod){
    status = 'paid';
    daysUntil = daysRaw >= 0 ? daysRaw : 30 + daysRaw;   // days until next cycle
  } else if(daysRaw < 0){
    status   = 'overdue';
    daysOverdue = -daysRaw;
    daysUntil   = daysRaw;
  } else if(daysRaw === 0){
    status = 'overdue'; daysOverdue = 0;
  } else if(daysRaw <= 7){
    status = 'upcoming'; daysUntil = daysRaw;
  } else {
    status = 'pending'; daysUntil = daysRaw;
  }

  // ── Period covered ──
  let period = '';
  if(pay.lastPaid && payday){
    const lp = new Date(pay.lastPaid+'T12:00:00');
    const ps = new Date(lp.getFullYear(), lp.getMonth(), payday);
    if(ps > lp) ps.setMonth(ps.getMonth()-1);
    const pe = new Date(ps); pe.setMonth(pe.getMonth()+1); pe.setDate(pe.getDate()-1);
    period = `${pgFmt(ps)} — ${pgFmt(pe)}`;
  } else if(payday){
    const ps = new Date(now.getFullYear(), now.getMonth(), payday);
    if(payday > todayDay) ps.setMonth(ps.getMonth()-1);
    const pe = new Date(ps); pe.setMonth(pe.getMonth()+1); pe.setDate(pe.getDate()-1);
    period = `${pgFmt(ps)} — ${pgFmt(pe)}`;
  }

  // ── Next due date ──
  const nd = new Date(now.getFullYear(), now.getMonth(), payday);
  if(payday < todayDay) nd.setMonth(nd.getMonth()+1);
  const nextDueStr = pgFmt(nd);

  return { status, daysUntil, daysOverdue, period, nextDueStr, paidThisPeriod };
}

// ── MAIN RENDER ───────────────────────────────────────────────────────────────
function renderPagos(){
  if(!Array.isArray(athletes)||!athletes.length) athletes = typeof DEFAULT_ATHLETES!=='undefined'?DEFAULT_ATHLETES:[];
  const cont = document.getElementById('pagos-content');
  if(!cont) return;

  const now = new Date();
  const guests = athletes.filter(a => a.guest);
  const calcs = athletes.filter(a => !a.guest).map(a=>({ a, pay:a.payment||{}, calc:payCalc(a) }));

  // ── Metrics ──
  const overdue  = calcs.filter(x=>x.calc.status==='overdue');
  const upcoming = calcs.filter(x=>x.calc.status==='upcoming');
  const paid     = calcs.filter(x=>x.calc.status==='paid');
  const pending  = calcs.filter(x=>x.calc.status==='pending');
  const noconf   = calcs.filter(x=>x.calc.status==='unconfigured');

  const totalExpected = calcs.reduce((t,x)=>t+(parseFloat(x.pay.amount)||0),0);
  const totalPaid = paid.reduce((t,x)=>t+(parseFloat(x.pay.amount)||0),0);
  const totalPending = calcs.filter(x=>x.calc.status!=='paid'&&x.calc.status!=='unconfigured').reduce((t,x)=>t+(parseFloat(x.pay.amount)||0),0);

  const monthName = now.toLocaleDateString('es-UY',{month:'long',year:'numeric'});

  // ── Sort: vencidos → próximos → pendientes → pagados → sin config ──
  const sorted = [
    ...overdue.sort((a,b)=>b.calc.daysOverdue-a.calc.daysOverdue),
    ...upcoming.sort((a,b)=>a.calc.daysUntil-b.calc.daysUntil),
    ...pending,
    ...paid,
    ...noconf
  ];

  // ── Reminder messages ──
  const reminders = [
    ...overdue.map(x=>({ a:x.a, pay:x.pay, calc:x.calc,
      msg:`Hola ${x.a.name}, tu pago de $${x.pay.amount||'?'} USD venció hace ${x.calc.daysOverdue} día${x.calc.daysOverdue!==1?'s':''}. Cuando puedas regularizalo así seguimos con el seguimiento. ¡Gracias!` })),
    ...upcoming.filter(x=>x.calc.daysUntil<=3).map(x=>({ a:x.a, pay:x.pay, calc:x.calc,
      msg:`Hola ${x.a.name}, te recordamos que tu pago de $${x.pay.amount||'?'} USD vence ${x.calc.daysUntil===0?'hoy':x.calc.daysUntil===1?'mañana':'en '+x.calc.daysUntil+' días'} (día ${x.pay.payday}). ¡Gracias!` }))
  ];

  // ── Resumen mensual ──
  const collectionPct = totalExpected > 0 ? Math.round((totalPaid/totalExpected)*100) : 0;
  const barColor = collectionPct>=80?'#22c55e':collectionPct>=50?'#f59e0b':'#ef4444';

  cont.innerHTML = `
<div class="pg-wrap">

  <!-- Header -->
  <div class="pg-topbar">
    <div>
      <div class="pg-title">PAGOS</div>
      <div class="pg-sub">${monthName.charAt(0).toUpperCase()+monthName.slice(1)}</div>
    </div>
  </div>

  <!-- Resumen mensual -->
  <div style="background:var(--surf);border:1px solid var(--border);border-radius:14px;padding:16px 20px;margin-bottom:16px">
    <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:10px">
      <div style="font-size:12px;font-weight:700;color:var(--sub);letter-spacing:.5px">COBRADO ESTE MES</div>
      <div style="font-size:13px;font-weight:700;color:${barColor}">${collectionPct}%</div>
    </div>
    <div style="height:6px;background:var(--border);border-radius:3px;overflow:hidden;margin-bottom:10px">
      <div style="height:100%;width:${collectionPct}%;background:${barColor};border-radius:3px;transition:width .4s ease"></div>
    </div>
    <div style="display:flex;justify-content:space-between;font-size:12px;color:var(--sub)">
      <span>Cobrado: <strong style="color:var(--text)">$${totalPaid}</strong></span>
      <span>Pendiente: <strong style="color:${totalPending>0?'#f59e0b':'var(--sub)'}">$${totalPending}</strong></span>
      <span>Total esperado: <strong style="color:var(--text)">$${totalExpected}</strong></span>
    </div>
  </div>

  <!-- Summary metrics -->
  <div class="pg-metrics">
    <div class="pg-metric">
      <div class="pg-metric-val" style="color:var(--green)">$${totalPaid}</div>
      <div class="pg-metric-lbl">Cobrado</div>
    </div>
    <div class="pg-metric">
      <div class="pg-metric-val" style="color:var(--orange)">$${totalPending}</div>
      <div class="pg-metric-lbl">Pendiente</div>
    </div>
    <div class="pg-metric sep">
      <div class="pg-metric-val" style="color:var(--red)">${overdue.length}</div>
      <div class="pg-metric-lbl">Vencido${overdue.length!==1?'s':''}</div>
    </div>
    <div class="pg-metric">
      <div class="pg-metric-val" style="color:var(--orange)">${upcoming.length}</div>
      <div class="pg-metric-lbl">Próx. 7d</div>
    </div>
    <div class="pg-metric">
      <div class="pg-metric-val" style="color:var(--sub)">$${totalExpected}</div>
      <div class="pg-metric-lbl">Total esperado</div>
    </div>
  </div>

  <!-- Cards -->
  <div class="pg-list" id="pg-list">
    ${sorted.map(({a,pay,calc}) => pgCard(a, pay, calc)).join('')}
  </div>

  <!-- Recordatorios -->
  ${guests.length ? `
  <div style="background:var(--surf);border:1px solid var(--border);border-radius:14px;padding:14px 18px;margin-top:4px">
    <div style="font-size:10px;font-weight:700;color:var(--sub);letter-spacing:.1em;text-transform:uppercase;margin-bottom:10px">Invitados · ${guests.length}</div>
    <div style="display:flex;flex-direction:column;gap:2px">
      ${guests.map(a=>{const color=athColor(a.id);return`
      <div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid var(--border)">
        <div style="width:30px;height:30px;border-radius:9px;background:${color}22;color:${color};font-size:12px;font-weight:800;display:flex;align-items:center;justify-content:center;flex-shrink:0">${athInitial(a.name)}</div>
        <div style="flex:1;font-size:13px;font-weight:600;color:var(--text)">${a.name}</div>
        <span style="font-size:10px;font-weight:700;color:var(--sub);letter-spacing:.05em;background:var(--surf2);padding:3px 8px;border-radius:5px">INVITADO</span>
      </div>`;}).join('')}
    </div>
  </div>` : ''}

  ${reminders.length ? `
  <div class="pg-remind-section">
    <div class="pg-remind-title">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
      RECORDATORIOS LISTOS PARA ENVIAR
    </div>
    <div class="pg-remind-list">
      ${reminders.map(r=>`
      <div class="pg-remind-item" id="pgr-${r.a.id}">
        <div class="pg-remind-ath">
          <div class="pg-remind-av" style="background:${athColor(r.a.id)}22;color:${athColor(r.a.id)}">${athInitial(r.a.name)}</div>
          <div>
            <div class="pg-remind-name">${r.a.name}</div>
            <div class="pg-remind-why">${r.calc.status==='overdue'?`Vencido hace ${r.calc.daysOverdue}d`:`Vence en ${r.calc.daysUntil}d`}</div>
          </div>
        </div>
        <div class="pg-remind-msg">"${r.msg}"</div>
        <div class="pg-remind-btns">
          <button class="pg-rbtn" onclick="pgCopyReminder('${r.a.id}','${encodeURIComponent(r.msg)}')">📋 Copiar</button>
          <button class="pg-rbtn sent" onclick="pgMarkReminderSent('${r.a.id}')">✓ Enviado</button>
        </div>
      </div>`).join('')}
    </div>
  </div>` : ''}

</div>

<!-- Modals container -->
<div id="pg-modal-bg" class="pg-modal-bg hidden" onclick="pgModalClose(event)">
  <div class="pg-modal" id="pg-modal"></div>
</div>`;

  updatePayBadge();
}

function pgCard(a, pay, calc){
  const color = athColor(a.id);
  const currency = pay.currency || 'USD';
  const amount = pay.amount ? `$${pay.amount} ${currency}` : '—';

  // Status config
  const STATUS = {
    paid:        { cls:'pg-status-paid',     dot:'#00d084', label:'AL DÍA',    icon:'✓' },
    upcoming:    { cls:'pg-status-upcoming', dot:'#ff9500', label:'POR VENCER', icon:'!' },
    overdue:     { cls:'pg-status-overdue',  dot:'#ff3f3f', label:'VENCIDO',   icon:'✕' },
    pending:     { cls:'pg-status-pending',  dot:'#48485a', label:'PENDIENTE',  icon:'·' },
    unconfigured:{ cls:'pg-status-noconf',   dot:'#2e2e3a', label:'SIN CONFIG', icon:'?' }
  };
  const st = STATUS[calc.status] || STATUS.pending;

  // Days info
  let daysInfo = '';
  if(calc.status==='paid')
    daysInfo = `Próx. venc: ${calc.nextDueStr} · en ${calc.daysUntil}d`;
  else if(calc.status==='overdue')
    daysInfo = `Venció hace ${calc.daysOverdue} día${calc.daysOverdue!==1?'s':''} · Día ${pay.payday} de cada mes`;
  else if(calc.status==='upcoming')
    daysInfo = `Vence ${calc.daysUntil===0?'HOY':calc.daysUntil===1?'mañana':'en '+calc.daysUntil+'d'} · Día ${pay.payday}`;
  else if(pay.payday)
    daysInfo = `Día ${pay.payday} de cada mes`;
  else
    daysInfo = 'Fecha de pago sin configurar';

  // Last paid
  const lastPaidStr = pay.lastPaid ? `Pagó: ${pgFmtFull(pay.lastPaid)}` : 'Sin pago registrado';

  // Last reminder
  let lastReminderStr = '';
  if(pay.lastReminder){
    const lr = new Date(pay.lastReminder+'T12:00:00');
    const daysAgo = Math.floor((new Date()-lr)/86400000);
    lastReminderStr = daysAgo===0?'Recordatorio enviado hoy':daysAgo===1?'Recordatorio enviado ayer':`Recordatorio hace ${daysAgo}d`;
  }

  return `
<div class="pg-card ${st.cls}" id="pgcard-${a.id}">
  <div class="pg-card-accent" style="background:${st.dot}"></div>

  <div class="pg-card-body">
    <div class="pg-card-top">
      <div class="pg-card-ath">
        <div class="pg-av" style="background:${color}22;color:${color}">${athInitial(a.name)}</div>
        <div>
          <div class="pg-card-name">${a.name}</div>
          <div class="pg-card-days">${daysInfo}</div>
        </div>
      </div>
      <div class="pg-card-right">
        <div class="pg-amount">${amount}</div>
        <div class="pg-status-badge ${st.cls}">${st.label}</div>
      </div>
    </div>

    <div class="pg-card-mid">
      ${calc.period ? `<div class="pg-period">📅 Período: <strong>${calc.period}</strong></div>` : ''}
      ${pay.lastPaid ? `<div class="pg-lastpaid">${lastPaidStr}</div>` : ''}
      ${lastReminderStr ? `<div class="pg-lastpaid" style="color:var(--sub2);font-size:11px">💬 ${lastReminderStr}</div>` : ''}
    </div>

    <div class="pg-card-actions">
      ${calc.status!=='paid'
        ? `<button class="pg-act-primary" onclick="pgOpenMarkPaid('${a.id}')">✓ Marcar pagado</button>`
        : `<button class="pg-act-ghost" onclick="pgMarkUnpaid('${a.id}')">↩ Revertir</button>`
      }
      <button class="pg-act-ghost" onclick="pgOpenEdit('${a.id}')">✎ Editar</button>
      <button class="pg-act-ghost" onclick="pgOpenHistory('${a.id}')">📋 Historial</button>
      ${calc.status==='overdue'||calc.status==='upcoming'
        ? `<button class="pg-act-ghost" onclick="pgCopyReminderInline('${a.id}')">💬 Copiar recordatorio</button>`
        : ''}
    </div>
  </div>
</div>`;
}

// ── MARK PAID MODAL ───────────────────────────────────────────────────────────
function pgOpenMarkPaid(athId){
  const a   = athletes.find(x=>x.id===athId);
  const pay = a?.payment||{};
  const today = new Date().toISOString().split('T')[0];
  const color = athColor(athId);
  const calc = payCalc(a);

  pgModalShow(`
<div class="pg-modal-title">✓ Registrar pago — ${a.name}</div>
<div class="pg-modal-sub">Se guardará en el historial del alumno</div>

<div class="pg-mfield">
  <label class="pg-mlabel">FECHA DE PAGO</label>
  <input class="pg-minput" type="date" id="pgm-date" value="${today}">
</div>
<div class="pg-mrow">
  <div class="pg-mfield" style="flex:2">
    <label class="pg-mlabel">MONTO</label>
    <input class="pg-minput" type="number" id="pgm-amount" value="${pay.amount||''}" placeholder="0" min="0" step="1">
  </div>
  <div class="pg-mfield" style="flex:1">
    <label class="pg-mlabel">MONEDA</label>
    <select class="pg-minput" id="pgm-currency">
      <option value="USD" ${(pay.currency||'USD')==='USD'?'selected':''}>USD</option>
      <option value="UYU" ${pay.currency==='UYU'?'selected':''}>UYU</option>
    </select>
  </div>
</div>
<div class="pg-mfield">
  <label class="pg-mlabel">MÉTODO</label>
  <select class="pg-minput" id="pgm-method">
    <option value="transfer">Transferencia</option>
    <option value="cash">Efectivo</option>
    <option value="mp">Mercado Pago</option>
    <option value="other">Otro</option>
  </select>
</div>
<div class="pg-mfield">
  <label class="pg-mlabel">PERÍODO CUBIERTO</label>
  <input class="pg-minput" type="text" id="pgm-period" value="${calc.period||''}" placeholder="ej: 1 may — 31 may">
</div>
<div class="pg-mfield">
  <label class="pg-mlabel">NOTA (opcional)</label>
  <input class="pg-minput" type="text" id="pgm-note" placeholder="Observaciones...">
</div>
<div class="pg-mactions">
  <button class="pg-mbtn-ghost" onclick="pgModalBg().classList.add('hidden')">Cancelar</button>
  <button class="pg-mbtn-primary" onclick="pgConfirmPaid('${athId}')" style="background:${color};color:${color==='#e8ff00'?'#000':'#fff'}">Confirmar pago</button>
</div>`);
}

async function pgConfirmPaid(athId){
  const a = athletes.find(x=>x.id===athId);
  if(!a) return;
  const date     = document.getElementById('pgm-date')?.value || new Date().toISOString().split('T')[0];
  const amount   = parseFloat(document.getElementById('pgm-amount')?.value)||0;
  const currency = document.getElementById('pgm-currency')?.value||'USD';
  const method   = document.getElementById('pgm-method')?.value||'transfer';
  const period   = document.getElementById('pgm-period')?.value.trim()||'';
  const note     = document.getElementById('pgm-note')?.value.trim()||'';

  // Update athlete payment
  if(!a.payment) a.payment = {};
  a.payment.status   = 'paid';
  a.payment.lastPaid = date;
  if(amount)    a.payment.amount   = amount;
  if(currency)  a.payment.currency = currency;
  pgSaveAthletes();

  // Save to history
  const hist = await pgGetHistory(athId);
  hist.unshift({ id:`pay_${date}_${Date.now()}`, date, amount, currency, method, period, note });
  await pgSaveHistory(athId, hist.slice(0, 100)); // keep last 100

  pgModalBg().classList.add('hidden');
  toast(`✅ Pago de ${a.name} registrado`);
  renderPagos();
}

function pgMarkUnpaid(athId){
  const a = athletes.find(x=>x.id===athId);
  if(!a) return;
  if(!a.payment) a.payment = {};
  a.payment.status = 'pending';
  pgSaveAthletes();
  toast(`Pago de ${a.name} marcado como pendiente`);
  renderPagos(); updatePayBadge();
}

// ── EDIT MODAL ────────────────────────────────────────────────────────────────
function pgOpenEdit(athId){
  const a   = athletes.find(x=>x.id===athId);
  const pay = a?.payment||{};
  const color = athColor(athId);

  pgModalShow(`
<div class="pg-modal-title">✎ Configurar pago — ${a.name}</div>
<div class="pg-modal-sub">Configuración del ciclo mensual</div>

<div class="pg-mrow">
  <div class="pg-mfield" style="flex:2">
    <label class="pg-mlabel">MONTO MENSUAL</label>
    <input class="pg-minput" type="number" id="pge-amount" value="${pay.amount||''}" placeholder="0" min="0" step="1">
  </div>
  <div class="pg-mfield" style="flex:1">
    <label class="pg-mlabel">MONEDA</label>
    <select class="pg-minput" id="pge-currency">
      <option value="USD" ${(pay.currency||'USD')==='USD'?'selected':''}>USD</option>
      <option value="UYU" ${pay.currency==='UYU'?'selected':''}>UYU</option>
    </select>
  </div>
</div>
<div class="pg-mfield">
  <label class="pg-mlabel">DÍA DE VENCIMIENTO (1-31)</label>
  <input class="pg-minput" type="number" id="pge-payday" value="${pay.payday||''}" min="1" max="31" placeholder="ej: 15">
  <div class="pg-mhint">El alumno paga el día X de cada mes</div>
</div>
<div class="pg-mactions">
  <button class="pg-mbtn-ghost" onclick="pgModalBg().classList.add('hidden')">Cancelar</button>
  <button class="pg-mbtn-primary" onclick="pgSaveEdit('${athId}')" style="background:${color};color:${color==='#e8ff00'?'#000':'#fff'}">Guardar</button>
</div>`);
}

function pgSaveEdit(athId){
  const a = athletes.find(x=>x.id===athId);
  if(!a) return;
  if(!a.payment) a.payment = {};
  const amount   = parseFloat(document.getElementById('pge-amount')?.value)||0;
  const currency = document.getElementById('pge-currency')?.value||'USD';
  const payday   = parseInt(document.getElementById('pge-payday')?.value)||null;
  if(amount)   a.payment.amount   = amount;
  if(currency) a.payment.currency = currency;
  if(payday)   a.payment.payday   = payday;
  pgSaveAthletes();
  pgModalBg().classList.add('hidden');
  toast(`✅ Configuración de ${a.name} guardada`);
  renderPagos(); updatePayBadge();
}

// ── HISTORY MODAL ─────────────────────────────────────────────────────────────
async function pgOpenHistory(athId){
  const a = athletes.find(x=>x.id===athId);
  const color = athColor(athId);
  pgModalShow(`<div class="pg-modal-title">📋 Historial — ${a.name}</div><div style="text-align:center;padding:20px;color:var(--sub);font-size:13px">Cargando...</div>`);

  const hist = await pgGetHistory(athId);

  const METHOD_LABEL = { transfer:'Transferencia', cash:'Efectivo', mp:'Mercado Pago', other:'Otro' };

  const box = document.getElementById('pg-modal');
  if(!box) return;
  box.innerHTML = `
<div class="pg-modal-title">📋 Historial de pagos — ${a.name}</div>
${hist.length===0 ? `<div style="text-align:center;padding:30px;color:var(--sub);font-size:13px">Sin pagos registrados</div>` :
  `<div class="pg-hist-list">
    ${hist.map(h=>`
    <div class="pg-hist-item">
      <div class="pg-hist-date">${pgFmtFull(h.date)}</div>
      <div class="pg-hist-details">
        <span class="pg-hist-amount" style="color:${color}">$${h.amount} ${h.currency||'USD'}</span>
        <span class="pg-hist-method">${METHOD_LABEL[h.method]||h.method||'—'}</span>
        ${h.period?`<span class="pg-hist-period">📅 ${h.period}</span>`:''}
        ${h.note?`<span class="pg-hist-note">"${h.note}"</span>`:''}
      </div>
    </div>`).join('')}
  </div>`}
<div class="pg-mactions" style="margin-top:16px">
  <button class="pg-mbtn-ghost" onclick="pgModalBg().classList.add('hidden')">Cerrar</button>
  <button class="pg-mbtn-primary" onclick="pgOpenMarkPaid('${athId}')" style="background:${color};color:${color==='#e8ff00'?'#000':'#fff'}">+ Registrar pago</button>
</div>`;
}

// ── REMINDERS ─────────────────────────────────────────────────────────────────
function pgCopyReminder(athId, encodedMsg){
  const msg = decodeURIComponent(encodedMsg);
  navigator.clipboard?.writeText(msg).then(()=>{ toast('📋 Mensaje copiado'); })
    .catch(()=>{ prompt('Copiá este mensaje:', msg); });
}

function pgCopyReminderInline(athId){
  const a = athletes.find(x=>x.id===athId);
  if(!a) return;
  const pay = a.payment||{};
  const calc = payCalc(a);
  let msg = '';
  if(calc.status==='overdue')
    msg = `Hola ${a.name}, tu pago de $${pay.amount||'?'} ${pay.currency||'USD'} venció hace ${calc.daysOverdue} día${calc.daysOverdue!==1?'s':''}. Cuando puedas regularizalo así seguimos con el seguimiento. ¡Gracias!`;
  else
    msg = `Hola ${a.name}, te recordamos que tu pago de $${pay.amount||'?'} ${pay.currency||'USD'} vence ${calc.daysUntil===0?'hoy':calc.daysUntil===1?'mañana':'en '+calc.daysUntil+' días'} (día ${pay.payday}). ¡Gracias!`;
  navigator.clipboard?.writeText(msg).then(()=>{ toast('📋 Recordatorio copiado'); })
    .catch(()=>{ prompt('Copiá este mensaje:', msg); });
}

async function pgMarkReminderSent(athId){
  const el = document.getElementById('pgr-'+athId);
  if(el) el.style.opacity='0.4';
  toast('✓ Recordatorio registrado');
  const a = athletes.find(x=>x.id===athId);
  if(!a) return;
  const today = new Date().toISOString().split('T')[0];
  // Persistir en athlete
  if(!a.payment) a.payment = {};
  a.payment.lastReminder = today;
  pgSaveAthletes();
  // Log en Firestore
  const log = await pgGetReminderLog(athId);
  const calc = payCalc(a);
  log.unshift({ date: today, status: calc.status, amount: a.payment?.amount, ts: new Date().toISOString() });
  pgSaveReminderLog(athId, log.slice(0, 50)).catch(()=>{});
}

// ── MODAL HELPERS ──────────────────────────────────────────────────────────────
function pgModalBg(){ return document.getElementById('pg-modal-bg'); }
function pgModalShow(html){
  const bg=pgModalBg(); const box=document.getElementById('pg-modal');
  if(!bg||!box) return;
  box.innerHTML=html; bg.classList.remove('hidden');
}
function pgModalClose(e){ if(e.target===pgModalBg()) pgModalBg().classList.add('hidden'); }

// ── BOT HELPERS (usados desde lib/briefs.js y lib/actions.js) ─────────────────
// Estas funciones se exponen para que el bot las pueda usar vía contexto
function pgGetOverdue(athList){
  return (athList||athletes).filter(a=>payCalc(a).status==='overdue');
}
function pgGetUpcoming(athList, days=3){
  return (athList||athletes).filter(a=>{ const c=payCalc(a); return c.status==='upcoming'&&c.daysUntil<=days; });
}
function pgReminderMsg(a, type){
  const pay=a.payment||{}; const calc=payCalc(a);
  if(type==='overdue'||calc.status==='overdue')
    return `Hola ${a.name}, tu pago de $${pay.amount||'?'} ${pay.currency||'USD'} venció hace ${calc.daysOverdue} día${calc.daysOverdue!==1?'s':''}. Cuando puedas regularizalo así seguimos con el seguimiento. ¡Gracias!`;
  return `Hola ${a.name}, te recordamos que tu pago de $${pay.amount||'?'} ${pay.currency||'USD'} vence ${calc.daysUntil===0?'hoy':calc.daysUntil===1?'mañana':'en '+calc.daysUntil+' días'} (día ${pay.payday}). ¡Gracias!`;
}

// Keep backwards compat with coach.js (called from updatePayBadge etc.)
function markPaid(id){ pgOpenMarkPaid(id); }
function markUnpaid(id){ pgMarkUnpaid(id); }
function setPayAmount(id,val){ const a=athletes.find(x=>x.id===id);if(!a)return;if(!a.payment)a.payment={};a.payment.amount=parseFloat(val)||0;pgSaveAthletes();toast(`💰 ${a.name}: $${a.payment.amount}`);updatePayBadge(); }
function setPayDay(id,val){ const a=athletes.find(x=>x.id===id);if(!a)return;if(!a.payment)a.payment={};a.payment.payday=parseInt(val)||null;pgSaveAthletes();renderPagos();updatePayBadge(); }
