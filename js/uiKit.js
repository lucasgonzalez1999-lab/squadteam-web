'use strict';
// SQUAD TEAM — UI Kit en vanilla (estilo Kowalski sin React).
// Helpers: toast stack, bottom sheet, número animado, confetti lima.
// Mantiene retro-compat con `toast(msg)` global.

const SQK = (() => {

  // ─── STYLES INJECT ─────────────────────────────────────────────────────────
  function ensureStyles(){
    if(document.getElementById('sqk-styles')) return;
    const s = document.createElement('style');
    s.id = 'sqk-styles';
    s.textContent = `
      /* TOAST STACK */
      #sqk-toasts{
        position:fixed; left:50%; bottom:calc(24px + env(safe-area-inset-bottom));
        transform:translateX(-50%);
        display:flex; flex-direction:column-reverse; gap:8px;
        z-index:99999; pointer-events:none;
        max-width:min(420px, calc(100vw - 32px));
      }
      .sqk-t{
        pointer-events:auto;
        background:#16181c; border:1px solid #1f1f24; border-radius:10px;
        padding:12px 16px;
        font:500 13px/1.35 "Inter",system-ui,sans-serif;
        color:#fff;
        box-shadow:0 8px 24px rgba(0,0,0,.6);
        display:flex; gap:10px; align-items:flex-start;
        transform:translateY(16px); opacity:0;
        transition:transform .32s cubic-bezier(.16,1,.3,1), opacity .2s ease;
        touch-action:pan-y;
      }
      .sqk-t.show{ transform:translateY(0); opacity:1; }
      .sqk-t.success{ border-left:2px solid #00d084; }
      .sqk-t.error  { border-left:2px solid #ff3f3f; }
      .sqk-t.warn   { border-left:2px solid #ff9500; }
      .sqk-t.loading{ border-left:2px solid #e8ff00; }
      .sqk-t-body{ flex:1; min-width:0; }
      .sqk-t-title{ font-weight:500; letter-spacing:-.005em; }
      .sqk-t-desc{ color:#9090a8; font-size:11px; margin-top:2px; }
      .sqk-t-spin{
        width:14px; height:14px; flex-shrink:0; margin-top:2px;
        border:1.5px solid #1f1f24; border-top-color:#e8ff00;
        border-radius:50%; animation:sqk-spin .8s linear infinite;
      }
      @keyframes sqk-spin{ to{ transform:rotate(360deg); } }

      /* SHEET */
      .sqk-sh-backdrop{
        position:fixed; inset:0; z-index:99996;
        background:rgba(0,0,0,.72);
        background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='200' height='200' filter='url(%23n)' opacity='.4'/%3E%3C/svg%3E");
        background-size:160px;
        opacity:0; transition:opacity .24s ease;
      }
      .sqk-sh-backdrop.show{ opacity:1; }
      .sqk-sh{
        position:fixed; left:50%; right:auto; bottom:0; z-index:99997;
        width:100%; max-width:520px;
        transform:translateX(-50%) translateY(100%);
        background:#0a0b0d; border:1px solid #1f1f24; border-bottom:none;
        border-radius:16px 16px 0 0;
        max-height:92vh; display:flex; flex-direction:column;
        transition:transform .36s cubic-bezier(.16,1,.3,1);
        padding-bottom:env(safe-area-inset-bottom);
      }
      .sqk-sh.show{ transform:translateX(-50%) translateY(0); }
      @media (max-width: 520px){
        .sqk-sh{ left:0; right:0; max-width:none; transform:translateY(100%); border-radius:0; }
        .sqk-sh.show{ transform:translateY(0); }
      }
      .sqk-sh-handle{
        flex:0 0 auto; display:flex; justify-content:center;
        padding:10px 0 6px; touch-action:none; cursor:grab;
      }
      .sqk-sh-handle::after{
        content:''; width:32px; height:3px; background:#e8ff00; border-radius:2px;
      }
      .sqk-sh-handle:active{ cursor:grabbing; }
      .sqk-sh-title{
        padding:0 20px 14px;
        font:900 italic 24px/1 "Barlow Condensed",sans-serif;
        text-transform:uppercase; color:#fff; letter-spacing:-.005em;
        border-bottom:1px solid #1f1f24; margin-bottom:14px;
      }
      .sqk-sh-body{ flex:1; overflow-y:auto; padding:0 20px 20px;
        -webkit-overflow-scrolling:touch; overscroll-behavior:contain; }
    `;
    document.head.appendChild(s);
  }

  // ─── TOAST STACK ───────────────────────────────────────────────────────────
  // Reemplaza el toast monolítico viejo. Soporta tipos + descripción +
  // promise (Kowalski-style: loading → success/error automático).
  function ensureToastsRoot(){
    let r = document.getElementById('sqk-toasts');
    if(r) return r;
    r = document.createElement('div'); r.id = 'sqk-toasts';
    document.body.appendChild(r);
    return r;
  }

  function buildToast(opts){
    const el = document.createElement('div');
    el.className = 'sqk-t ' + (opts.type || '');
    let inner = '';
    if(opts.type === 'loading'){
      inner = '<div class="sqk-t-spin"></div>';
    }
    inner += `<div class="sqk-t-body"><div class="sqk-t-title"></div>${opts.description ? '<div class="sqk-t-desc"></div>' : ''}</div>`;
    el.innerHTML = inner;
    el.querySelector('.sqk-t-title').textContent = opts.title;
    if(opts.description){
      el.querySelector('.sqk-t-desc').textContent = opts.description;
    }
    return el;
  }

  function attachSwipe(el, onDismiss){
    let startY = 0, currY = 0, active = false;
    el.addEventListener('pointerdown', (e) => {
      active = true; startY = e.clientY; currY = startY;
      el.setPointerCapture(e.pointerId);
      el.style.transition = 'none';
    });
    el.addEventListener('pointermove', (e) => {
      if(!active) return;
      currY = e.clientY;
      const dy = Math.max(0, currY - startY);
      el.style.transform = `translateY(${dy}px)`;
      el.style.opacity = String(Math.max(0, 1 - dy / 120));
    });
    el.addEventListener('pointerup', () => {
      active = false;
      el.style.transition = '';
      const dy = currY - startY;
      if(dy > 60) onDismiss();
      else { el.style.transform = 'translateY(0)'; el.style.opacity = '1'; }
    });
    el.addEventListener('pointercancel', () => {
      active = false;
      el.style.transition = '';
      el.style.transform = 'translateY(0)'; el.style.opacity = '1';
    });
  }

  function showToast(opts){
    ensureStyles();
    const root = ensureToastsRoot();
    const el = buildToast(opts);
    root.appendChild(el);
    requestAnimationFrame(() => el.classList.add('show'));

    const dismiss = () => {
      el.classList.remove('show');
      setTimeout(() => el.remove(), 320);
    };
    attachSwipe(el, dismiss);

    let timer = null;
    if(opts.duration !== Infinity){
      timer = setTimeout(dismiss, opts.duration || 2400);
    }

    return {
      update(newOpts){
        if(timer) clearTimeout(timer);
        const updated = buildToast({ ...opts, ...newOpts });
        // Mantenemos el mismo nodo, reemplazamos solo el contenido + clase
        el.className = updated.className + ' show';
        el.innerHTML = updated.innerHTML;
        if(newOpts.duration !== Infinity){
          timer = setTimeout(dismiss, newOpts.duration || 2400);
        }
      },
      dismiss,
    };
  }

  function sqToast(input, opts){
    if(typeof input === 'string'){
      return showToast({ title: input, ...(opts || {}) });
    }
    return showToast(input || {});
  }
  sqToast.success = (msg, opts) => showToast({ title: msg, type: 'success', ...(opts || {}) });
  sqToast.error   = (msg, opts) => showToast({ title: msg, type: 'error',   ...(opts || {}) });
  sqToast.warn    = (msg, opts) => showToast({ title: msg, type: 'warn',    ...(opts || {}) });
  sqToast.loading = (msg, opts) => showToast({ title: msg, type: 'loading', duration: Infinity, ...(opts || {}) });

  // Sonner-style promise: muestra loading → success/error según resuelva.
  sqToast.promise = async (promise, msgs) => {
    const t = sqToast.loading(msgs.loading || 'Cargando…');
    try{
      const value = await promise;
      const title = typeof msgs.success === 'function' ? msgs.success(value) : (msgs.success || 'Listo');
      t.update({ title, type: 'success', duration: 2400 });
      return value;
    }catch(e){
      const title = typeof msgs.error === 'function' ? msgs.error(e) : (msgs.error || 'Falló');
      t.update({ title, type: 'error', duration: 3000 });
      throw e;
    }
  };

  // ─── BOTTOM SHEET ──────────────────────────────────────────────────────────
  // Sheet con drag-to-dismiss. content puede ser string HTML, Node o función
  // que recibe el body para mutar.
  function sqSheet({ title, content, onClose, closeOnBackdrop = true }){
    ensureStyles();

    const backdrop = document.createElement('div');
    backdrop.className = 'sqk-sh-backdrop';

    const sheet = document.createElement('div');
    sheet.className = 'sqk-sh';
    sheet.innerHTML = `
      <div class="sqk-sh-handle" aria-label="Arrastrar para cerrar"></div>
      ${title ? `<div class="sqk-sh-title"></div>` : ''}
      <div class="sqk-sh-body"></div>
    `;
    if(title) sheet.querySelector('.sqk-sh-title').textContent = title;

    const body = sheet.querySelector('.sqk-sh-body');
    if(typeof content === 'string') body.innerHTML = content;
    else if(content instanceof Node) body.appendChild(content);
    else if(typeof content === 'function') content(body);

    document.body.appendChild(backdrop);
    document.body.appendChild(sheet);
    document.body.style.overflow = 'hidden';

    requestAnimationFrame(() => {
      backdrop.classList.add('show');
      sheet.classList.add('show');
    });

    const isCenteredOnClose = () => window.innerWidth > 520;
    let closed = false;
    function close(){
      if(closed) return; closed = true;
      backdrop.classList.remove('show');
      sheet.classList.remove('show');
      sheet.style.transform = (isCenteredOnClose() ? 'translateX(-50%) ' : '') + 'translateY(100%)';
      setTimeout(() => {
        backdrop.remove(); sheet.remove();
        document.body.style.overflow = '';
        if(onClose) onClose();
      }, 360);
    }

    if(closeOnBackdrop){
      backdrop.addEventListener('click', close);
    }

    // Drag desde el handle (UX nativa-style).
    // En desktop el sheet está centrado con translateX(-50%), así que el drag
    // tiene que preservar ese eje X. En mobile el sheet ocupa todo el ancho.
    const handle = sheet.querySelector('.sqk-sh-handle');
    let dragY = 0, startY = 0, dragging = false;
    const isCentered = () => window.innerWidth > 520;
    const tx = () => isCentered() ? 'translateX(-50%) ' : '';
    handle.addEventListener('pointerdown', (e) => {
      dragging = true; startY = e.clientY; dragY = 0;
      handle.setPointerCapture(e.pointerId);
      sheet.style.transition = 'none';
    });
    handle.addEventListener('pointermove', (e) => {
      if(!dragging) return;
      dragY = Math.max(0, e.clientY - startY);
      sheet.style.transform = `${tx()}translateY(${dragY}px)`;
      backdrop.style.opacity = String(Math.max(0, 1 - dragY / 400));
    });
    handle.addEventListener('pointerup', () => {
      dragging = false;
      sheet.style.transition = '';
      backdrop.style.transition = '';
      if(dragY > 140) close();
      else {
        sheet.style.transform = `${tx()}translateY(0)`;
        backdrop.style.opacity = '';
      }
    });

    return { close, sheet, body };
  }

  // ─── ANIMATED NUMBER ───────────────────────────────────────────────────────
  // Cuenta de 0 (o el valor actual) a `to` en `ms` con easing.
  // Útil para stats del dashboard.
  function sqAnimateNumber(el, to, ms = 700){
    if(!el) return;
    const from = parseFloat(el.dataset.sqkVal || '0') || 0;
    const start = performance.now();
    const ease = (t) => 1 - Math.pow(1 - t, 3);  // easeOutCubic
    function tick(now){
      const t = Math.min(1, (now - start) / ms);
      const v = from + (to - from) * ease(t);
      el.textContent = Math.round(v).toLocaleString('es-UY');
      if(t < 1) requestAnimationFrame(tick);
      else { el.dataset.sqkVal = String(to); el.textContent = to.toLocaleString('es-UY'); }
    }
    requestAnimationFrame(tick);
  }

  // ─── CONFETTI LIMA ─────────────────────────────────────────────────────────
  // Cuadrados lima + blanco con física simple. Vanilla puro, sin libs.
  // Disparalo en PRs, racha milestone, sesión 100, etc.
  function sqConfettiLime({ count = 60, origin = { x: 0.5, y: 0.7 } } = {}){
    const canvas = document.createElement('canvas');
    canvas.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:99998';
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    document.body.appendChild(canvas);
    const ctx = canvas.getContext('2d');

    const colors = ['#e8ff00', '#d9ff00', '#ffffff'];
    const ox = origin.x * canvas.width;
    const oy = origin.y * canvas.height;

    const particles = Array.from({ length: count }, () => {
      const angle = (-Math.PI / 2) + (Math.random() - 0.5) * (Math.PI * 0.55);
      const velocity = 7 + Math.random() * 6;
      return {
        x: ox, y: oy,
        vx: Math.cos(angle) * velocity,
        vy: Math.sin(angle) * velocity,
        size: 3 + Math.random() * 4,
        rot: Math.random() * Math.PI * 2,
        vrot: (Math.random() - 0.5) * 0.3,
        color: colors[Math.floor(Math.random() * colors.length)],
        life: 1,
      };
    });

    let raf;
    function tick(){
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      let alive = 0;
      for(const p of particles){
        p.vy += 0.22;       // gravity
        p.vx *= 0.99;
        p.x += p.vx; p.y += p.vy; p.rot += p.vrot;
        p.life -= 0.012;
        if(p.life <= 0 || p.y > canvas.height + 20) continue;
        alive++;
        ctx.save();
        ctx.globalAlpha = Math.max(0, p.life);
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size/2, -p.size/2, p.size, p.size);
        ctx.restore();
      }
      if(alive > 0) raf = requestAnimationFrame(tick);
      else canvas.remove();
    }
    raf = requestAnimationFrame(tick);
  }

  return { toast: sqToast, sheet: sqSheet, animateNumber: sqAnimateNumber, confetti: sqConfettiLime };
})();

// Globals retro-compatibles
window.sqToast    = SQK.toast;
window.sqSheet    = SQK.sheet;
window.sqAnimateN = SQK.animateNumber;
window.sqCelebrate = SQK.confetti;

// Reemplaza el toast viejo manteniendo retro-compat: toast(msg) sigue funcionando
// pero ahora muestra el toast nuevo apilable.
window.toast = (msg) => SQK.toast(typeof msg === 'string' ? msg : String(msg ?? ''));

// PR celebration: confetti lima + toast cuando un set rompe el PR del ejercicio.
// El evento sq:pr:broken lo dispara miRutina.js cuando detecta kg > prevPR.
document.addEventListener('sq:pr:broken', (e) => {
  const d = e.detail || {};
  SQK.confetti();
  SQK.toast.success(`Nuevo PR · ${d.exercise || ''}`, {
    description: `${d.kg} ${d.unit || 'kg'} × ${d.reps || ''} reps`,
    duration: 3200,
  });
});
