// js/coachTour.js — Onboarding tour for new coaches. Mounts a DOM overlay, no side effects.
'use strict';

function initCoachTour() {
  if (localStorage.getItem('sq_coach_tour_done') === 'true') return;

  const steps = [
    {
      selector: '[data-tab="alumnos"]',
      title: 'TUS ALUMNOS',
      text: 'Desde acá agregás y gestionás cada alumno. Es el primer paso.',
    },
    {
      selector: '[data-tab="planilla"]',
      title: 'LA PLANILLA',
      text: 'Asignás la rutina semanal de cada alumno. Podés importar desde Excel.',
    },
    {
      selector: '[data-tab="pagos"]',
      title: 'LOS PAGOS',
      text: 'Configurás el día de cobro una sola vez. El sistema hace el seguimiento.',
    },
    {
      selector: '[data-tab="checkins"]',
      title: 'LOS CHECK-INS',
      text: 'Cada semana tus alumnos completan una revisión. Vos la respondés acá.',
    },
    {
      selector: '[data-tab="dashboard"]',
      title: 'LISTO.',
      text: 'Eso es todo lo que necesitás para arrancar.',
      finalBtn: 'ENTRAR AL PANEL',
    },
  ];

  let current  = 0;
  let prevEl   = null;
  let prevSaved = null;

  const overlay = document.createElement('div');
  overlay.style.cssText = 'position:fixed;inset:0;z-index:8000;background:rgba(9,9,11,.88);';
  document.body.appendChild(overlay);

  const panel = document.createElement('div');
  panel.style.cssText = [
    'position:fixed;bottom:24px;left:50%;transform:translateX(-50%);',
    'width:calc(100% - 32px);max-width:480px;z-index:8100;',
    'background:var(--surf);padding:24px;border-radius:var(--radius);',
    'box-shadow:0 8px 40px rgba(0,0,0,.6);',
  ].join('');
  document.body.appendChild(panel);

  function getTarget(sel) {
    const all = [...document.querySelectorAll(sel)];
    return all.find(el => el.offsetParent !== null) || all[0] || null;
  }

  function highlight(el) {
    if (!el) return;
    prevSaved = {
      position:      el.style.position,
      zIndex:        el.style.zIndex,
      outline:       el.style.outline,
      outlineOffset: el.style.outlineOffset,
      borderRadius:  el.style.borderRadius,
    };
    if (getComputedStyle(el).position === 'static') el.style.position = 'relative';
    el.style.zIndex        = '8001';
    el.style.outline       = '2px solid var(--acc)';
    el.style.outlineOffset = '3px';
    el.style.borderRadius  = 'var(--radius)';
    prevEl = el;
  }

  function clearHighlight() {
    if (!prevEl || !prevSaved) return;
    Object.assign(prevEl.style, prevSaved);
    prevEl   = null;
    prevSaved = null;
  }

  function render(idx) {
    clearHighlight();
    const step    = steps[idx];
    const isFinal = idx === steps.length - 1;
    highlight(getTarget(step.selector));

    panel.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
        <span style="font-family:'Barlow Condensed',sans-serif;font-size:12px;font-weight:700;color:var(--acc);letter-spacing:.5px">${idx + 1} / ${steps.length}</span>
        <button id="sq-tour-skip" style="background:none;border:none;cursor:pointer;font-size:12px;color:var(--sub);font-family:inherit;padding:4px 8px;letter-spacing:.3px">SALTAR</button>
      </div>
      <div style="font-family:'Barlow Condensed',sans-serif;font-weight:700;font-size:22px;color:var(--text);text-transform:uppercase;letter-spacing:.5px;margin-bottom:6px">${step.title}</div>
      <div style="font-size:14px;color:var(--sub);line-height:1.5;margin-bottom:20px">${step.text}</div>
      <div style="display:flex;justify-content:flex-end">
        <button id="sq-tour-next" style="background:var(--acc);color:#000;border:none;border-radius:8px;padding:11px 24px;font-size:13px;font-weight:700;cursor:pointer;font-family:inherit;letter-spacing:.3px">
          ${isFinal ? (step.finalBtn || 'ENTRAR AL PANEL') : 'SIGUIENTE →'}
        </button>
      </div>`;

    panel.querySelector('#sq-tour-skip').onclick = finish;
    panel.querySelector('#sq-tour-next').onclick  = () => {
      if (isFinal) finish();
      else render(++current);
    };
  }

  function finish() {
    localStorage.setItem('sq_coach_tour_done', 'true');
    clearHighlight();
    overlay.remove();
    panel.remove();
  }

  render(0);
}
