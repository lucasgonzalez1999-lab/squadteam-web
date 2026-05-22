// js/dopamine.js — Dopamine System V1
// Read-only: listens to events from miRutina.js, never modifies training state.
// Three features: Spark micro-feedback, PR Overlay, HECHO. screen.

'use strict';

let _dpAthId = null;
let _dpColor = '#e8ff00';
let _dpEnabled = false;
let _prOverlayActive = false;
let _dpPRsBroken = 0;

function initDopamine(athId, color) {
  if (_dpEnabled && _dpAthId === athId) return;
  destroyDopamine();
  _dpAthId = athId;
  _dpColor = color || '#e8ff00';
  _dpEnabled = true;
  _prOverlayActive = false;
  _dpPRsBroken = 0;
  _dpInjectStyles();
  document.addEventListener('sq:set:done',      _dpHandleSetDone);
  document.addEventListener('sq:pr:broken',     _dpHandlePR);
  document.addEventListener('sq:session:saved', _dpHandleSessionSaved);
}

function destroyDopamine() {
  if (!_dpEnabled) return;
  _dpEnabled = false;
  document.removeEventListener('sq:set:done',      _dpHandleSetDone);
  document.removeEventListener('sq:pr:broken',     _dpHandlePR);
  document.removeEventListener('sq:session:saved', _dpHandleSessionSaved);
  document.getElementById('sq-pr-overlay')?.remove();
  document.getElementById('sq-hecho-ov')?.remove();
}

function _dpInjectStyles() {
  if (document.getElementById('sq-dp-styles')) return;
  const s = document.createElement('style');
  s.id = 'sq-dp-styles';
  s.textContent = `
    .sq-spark-label {
      font-size:11px;font-weight:800;letter-spacing:.05em;
      padding:2px 6px;text-align:center;pointer-events:none;
      opacity:0;transform:translateY(4px);
      transition:opacity .18s ease,transform .18s ease;
    }
    .sq-spark-label.visible { opacity:1;transform:translateY(0); }
    @keyframes sq-spark-glow {
      0%   { box-shadow:0 0 0 0 transparent; }
      40%  { box-shadow:0 0 0 3px var(--sq-spark,#e8ff00)44; }
      100% { box-shadow:0 0 0 0 transparent; }
    }
    .sq-spark-inp { animation:sq-spark-glow .65s ease forwards; }
    @media (prefers-reduced-motion:reduce) {
      .sq-spark-label { transition:none; }
      .sq-spark-inp   { animation:none; }
    }
  `;
  document.head.appendChild(s);
}

// ── SPARK ─────────────────────────────────────────────────────────────────────
function _dpHandleSetDone(e) {
  try {
    if (!_dpEnabled) return;
    const { athId, sparkDelta, rowId } = e.detail;
    if (athId !== _dpAthId || !sparkDelta || sparkDelta <= 0) return;

    const row = document.getElementById(rowId);
    if (!row) return;

    row.querySelectorAll('.sq-spark-label').forEach(el => el.remove());

    const inp = row.querySelector('input[type="number"]');
    if (inp) {
      inp.style.setProperty('--sq-spark', _dpColor);
      inp.classList.remove('sq-spark-inp');
      void inp.offsetWidth; // reflow to restart animation
      inp.classList.add('sq-spark-inp');
    }

    const label = document.createElement('div');
    label.className = 'sq-spark-label';
    label.style.color = _dpColor;
    label.textContent = `+${sparkDelta}kg`;
    row.appendChild(label);
    requestAnimationFrame(() => requestAnimationFrame(() => label.classList.add('visible')));
    setTimeout(() => {
      label.classList.remove('visible');
      setTimeout(() => label.remove(), 200);
    }, 1200);
  } catch(_) {}
}

// ── PR OVERLAY ────────────────────────────────────────────────────────────────
function _dpHandlePR(e) {
  try {
    if (!_dpEnabled || _prOverlayActive) return;
    const { athId, exercise, kg, prevKg, weeksSince } = e.detail;
    if (athId !== _dpAthId || !kg || !prevKg || kg <= prevKg) return;

    _prOverlayActive = true;
    _dpPRsBroken++;

    document.getElementById('sq-pr-overlay')?.remove();

    const ov = document.createElement('div');
    ov.id = 'sq-pr-overlay';
    const c = _dpColor;
    const exLabel = exercise.split(' ').slice(0, 3).join(' ').toUpperCase();
    const weekStr = weeksSince == null ? ''
      : weeksSince <= 0 ? 'primer récord'
      : `${weeksSince} semana${weeksSince !== 1 ? 's' : ''} desde el último`;

    ov.style.cssText = `position:fixed;bottom:0;left:0;right:0;z-index:8800;
      background:linear-gradient(180deg,#0e0e12,#06060a);
      border-top:2px solid ${c};border-radius:20px 20px 0 0;
      padding:22px 24px 44px;transform:translateY(100%);
      transition:transform .35s cubic-bezier(.16,1,.3,1);
      box-shadow:0 -12px 60px rgba(0,0,0,.8);`;

    ov.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px">
        <div style="font-size:9px;font-weight:800;color:${c};letter-spacing:.25em">NUEVO RÉCORD</div>
        <div style="font-size:9px;color:#333;letter-spacing:.1em">${exLabel}</div>
      </div>
      <div style="display:flex;align-items:flex-end;gap:10px;margin-bottom:${weekStr ? '8px' : '0'}">
        <div style="font-size:52px;font-weight:900;font-family:'Barlow Condensed',Impact,sans-serif;font-style:italic;color:#252525;line-height:1">${prevKg}</div>
        <div style="font-size:20px;color:#252525;padding-bottom:6px;font-weight:300">→</div>
        <div id="sq-pr-count" style="font-size:80px;font-weight:900;font-family:'Barlow Condensed',Impact,sans-serif;font-style:italic;color:${c};line-height:.9;text-shadow:0 0 40px ${c}55">${prevKg}</div>
        <div style="font-size:20px;font-weight:700;color:${c}88;padding-bottom:8px">kg</div>
      </div>
      ${weekStr ? `<div style="font-size:11px;color:#444">${weekStr}</div>` : ''}`;

    document.body.appendChild(ov);
    requestAnimationFrame(() => requestAnimationFrame(() => { ov.style.transform = 'translateY(0)'; }));

    // Count-up from prevKg to kg
    const counter = ov.querySelector('#sq-pr-count');
    const t0 = Date.now(), dur = 550;
    const tick = () => {
      const p = Math.min((Date.now() - t0) / dur, 1);
      const ease = 1 - Math.pow(1 - p, 3);
      const val = prevKg + (kg - prevKg) * ease;
      if (counter) counter.textContent = p >= 1 ? kg : val.toFixed(1).replace(/\.0$/, '');
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);

    setTimeout(() => {
      ov.style.transition = 'transform .3s cubic-bezier(.4,0,1,1)';
      ov.style.transform = 'translateY(110%)';
      setTimeout(() => { ov.remove(); _prOverlayActive = false; }, 300);
    }, 1700);
  } catch(_) { _prOverlayActive = false; }
}

// ── HECHO. SCREEN ─────────────────────────────────────────────────────────────
function _dpHandleSessionSaved(e) {
  try {
    if (!_dpEnabled) return;
    const { athId, volume, sets, fbOk, weekdayAvg } = e.detail;
    if (athId !== _dpAthId || !fbOk) return;

    document.getElementById('sq-hecho-ov')?.remove();

    const prsBroken = _dpPRsBroken;
    _dpPRsBroken = 0;

    const c = _dpColor;
    const volFmt = v => v >= 1000 ? (v / 1000).toFixed(1) + 'k' : String(Math.round(v) || '—');

    let weekdayLine = '';
    if (weekdayAvg > 0 && volume > 0) {
      const delta = volume - weekdayAvg;
      const pct = Math.round(Math.abs(delta) / weekdayAvg * 100);
      if (pct >= 3) weekdayLine = delta > 0
        ? `+${pct}% vs tu promedio del día`
        : `${pct}% por debajo de tu promedio`;
    }

    const stats = [
      volume > 0    && { val: volFmt(volume), lbl: 'KG MOVIDOS', col: 'var(--text)' },
      sets > 0      && { val: sets,           lbl: 'SERIES',     col: 'var(--text)' },
      prsBroken > 0 && { val: prsBroken,      lbl: 'RÉCORDS',    col: c },
    ].filter(Boolean);

    const ov = document.createElement('div');
    ov.id = 'sq-hecho-ov';
    ov.style.cssText = `position:fixed;inset:0;z-index:9500;background:#050507;
      display:flex;flex-direction:column;align-items:center;justify-content:center;
      padding:32px;opacity:0;transition:opacity .35s ease;`;

    ov.innerHTML = `
      <div style="max-width:300px;width:100%;text-align:center">
        <div style="font-size:9px;font-weight:800;color:#252525;letter-spacing:.25em;margin-bottom:16px">SESIÓN COMPLETADA</div>
        <div style="font-family:'Barlow Condensed',Impact,sans-serif;font-weight:900;font-style:italic;
          font-size:clamp(88px,22vw,118px);color:${c};line-height:.82;
          margin-bottom:22px;text-shadow:0 0 60px ${c}33;letter-spacing:-2px">HECHO.</div>
        ${stats.length ? `
        <div style="display:flex;justify-content:center;gap:${stats.length > 2 ? '16px' : '26px'};margin-bottom:${weekdayLine ? '10px' : '0'}">
          ${stats.map(s => `<div style="text-align:center">
            <div style="font-size:${stats.length > 2 ? '22px' : '27px'};font-weight:800;color:${s.col}">${s.val}</div>
            <div style="font-size:9px;font-weight:700;color:#282828;letter-spacing:.12em;margin-top:3px">${s.lbl}</div>
          </div>`).join('')}
        </div>` : ''}
        ${weekdayLine ? `<div style="font-size:11px;color:#333;margin-top:10px">${weekdayLine}</div>` : ''}
        <div style="height:1px;background:linear-gradient(90deg,transparent,${c}44,transparent);margin:18px 0"></div>
        <button id="sq-hecho-close"
          style="background:none;border:1px solid #1a1a1a;border-radius:10px;padding:9px 22px;
          font-size:11px;font-weight:700;color:#2a2a2a;cursor:pointer;font-family:inherit;
          letter-spacing:.06em;-webkit-tap-highlight-color:transparent">
          Cerrar
        </button>
      </div>`;

    document.body.appendChild(ov);
    requestAnimationFrame(() => requestAnimationFrame(() => { ov.style.opacity = '1'; }));

    const closeTimer = setTimeout(() => {
      ov.style.opacity = '0';
      setTimeout(() => ov.remove(), 350);
    }, 5000);

    ov.querySelector('#sq-hecho-close').addEventListener('click', () => {
      clearTimeout(closeTimer);
      ov.remove();
    });
  } catch(_) {}
}
