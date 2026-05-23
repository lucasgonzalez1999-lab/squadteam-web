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

  let current = 0;

  // Spotlight box — positioned over the target, box-shadow creates the dark overlay
  const spot = document.createElement('div');
  spot.style.cssText = [
    'position:fixed;z-index:8001;pointer-events:none;',
    'border:2px solid var(--acc);border-radius:var(--radius);',
    'transition:top .3s ease,left .3s ease,width .3s ease,height .3s ease;',
  ].join('');
  document.body.appendChild(spot);

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
    // prefer the visible one (sidebar on desktop, bottom nav on mobile)
    return all.find(el => el.offsetParent !== null) || all[0] || null;
  }

  function positionSpot(el) {
    if (!el) {
      // No target — full-screen dark overlay
      spot.style.cssText += 'top:50%;left:50%;width:0;height:0;border:none;' +
        'box-shadow:0 0 0 4000px rgba(9,9,11,.88);';
      return;
    }
    const pad = 6;
    const r = el.getBoundingClientRect();
    spot.style.top    = (r.top  - pad) + 'px';
    spot.style.left   = (r.left - pad) + 'px';
    spot.style.width  = (r.width  + pad * 2) + 'px';
    spot.style.height = (r.height + pad * 2) + 'px';
    spot.style.border = '2px solid var(--acc)';
    spot.style.boxShadow = '0 0 0 4000px rgba(9,9,11,.88)';
  }

  function render(idx) {
    const step    = steps[idx];
    const isFinal = idx === steps.length - 1;
    positionSpot(getTarget(step.selector));

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
    panel.querySelector('#sq-tour-next').onclick  = () => isFinal ? finish() : render(++current);
  }

  function finish() {
    localStorage.setItem('sq_coach_tour_done', 'true');
    spot.remove();
    panel.remove();
  }

  render(0);
}
