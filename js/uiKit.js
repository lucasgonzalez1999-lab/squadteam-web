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

      /* LOADER — escudo TS girando + arco lima + breath */
      .sqk-loader{
        display:inline-flex; flex-direction:column; align-items:center; gap:14px;
        font:600 12px/1 "Inter",system-ui,sans-serif; color:#9090a8;
        letter-spacing:.06em; text-transform:uppercase;
      }
      .sqk-loader-ring{
        position:relative; width:64px; height:64px;
        animation:sqk-breath 1.8s ease-in-out infinite;
      }
      /* Escudo TS procesado en JS al boot: negro -> alpha, croppeado a solo el
         escudo (sin el wordmark embebido). La URL se inyecta como CSS variable
         --sqk-logo. Mientras se procesa, fallback a contain del PNG raw. */
      .sqk-loader-shield{
        position:absolute; inset:8px;
        background:var(--sqk-logo, url('icons/icon-512.png')) center / contain no-repeat;
        animation:sqk-spin 1.1s linear infinite;
      }
      /* Arco lima trazando alrededor del escudo, sentido opuesto al spin. */
      .sqk-loader-arc{
        position:absolute; inset:0; pointer-events:none;
        animation:sqk-spin-back 1.4s linear infinite;
      }
      .sqk-loader-arc::before{
        content:''; position:absolute; inset:0;
        border-radius:50%;
        border:2px solid transparent;
        border-top-color:#e8ff00;
        border-right-color:rgba(232,255,0,.35);
      }
      .sqk-loader-text{ opacity:.7; }
      @keyframes sqk-spin{ from{ transform:rotate(0); } to{ transform:rotate(360deg); } }
      @keyframes sqk-spin-back{ from{ transform:rotate(0); } to{ transform:rotate(-360deg); } }
      @keyframes sqk-breath{
        0%,100%{ transform:scale(1); }
        50%{ transform:scale(1.04); }
      }

      /* Fullscreen loader (login / acciones bloqueantes) */
      .sqk-loader-fs{
        position:fixed; inset:0; z-index:99998;
        background:rgba(4,4,4,0.88);
        backdrop-filter:blur(6px); -webkit-backdrop-filter:blur(6px);
        display:flex; align-items:center; justify-content:center;
        opacity:0; transition:opacity .2s ease;
      }
      .sqk-loader-fs.show{ opacity:1; }
    `;
    document.head.appendChild(s);
  }

  // ─── LOGO PROCESSING ───────────────────────────────────────────────────────
  // El icon-512.png es maskable: tiene fondo negro hardcoded + el wordmark
  // SQUAD TEAM embebido debajo del escudo. Para el loader queremos SOLO el
  // escudo, transparente. Procesamos una vez al boot y guardamos la data URL
  // en una CSS variable global.
  let _logoProcessed = false;
  function ensureLogoProcessed(){
    if(_logoProcessed) return;
    _logoProcessed = true;
    const src = new Image();
    src.onload = () => {
      try {
        const c = document.createElement('canvas');
        c.width = src.width; c.height = src.height;
        const cx = c.getContext('2d');
        cx.drawImage(src, 0, 0);
        const data = cx.getImageData(0, 0, c.width, c.height);
        const p = data.data;
        let minX = c.width, minY = c.height, maxX = 0, maxY = 0;
        for(let y=0; y<c.height; y++){
          for(let x=0; x<c.width; x++){
            const i = (y*c.width + x) * 4;
            if(p[i] < 24 && p[i+1] < 24 && p[i+2] < 24){
              p[i+3] = 0;
            } else if(p[i+3] > 32){
              if(x < minX) minX = x; if(x > maxX) maxX = x;
              if(y < minY) minY = y; if(y > maxY) maxY = y;
            }
          }
        }
        cx.putImageData(data, 0, 0);
        // Detectar gap entre el escudo y el wordmark (filas vacías >= 6).
        let symEnd = maxY, gapStart = -1, gapLen = 0;
        for(let y=minY; y<=maxY; y++){
          let rowHas = false;
          for(let x=minX; x<=maxX; x++){
            if(p[(y*c.width + x)*4 + 3] > 32){ rowHas = true; break; }
          }
          if(rowHas){
            if(gapLen >= 6 && gapStart > minY){ symEnd = gapStart; break; }
            gapStart = -1; gapLen = 0;
          } else {
            if(gapStart < 0) gapStart = y;
            gapLen++;
          }
        }
        const cw = Math.max(1, maxX - minX);
        const ch = Math.max(1, symEnd - minY);
        const out = document.createElement('canvas');
        out.width = cw; out.height = ch;
        out.getContext('2d').drawImage(c, minX, minY, cw, ch, 0, 0, cw, ch);
        const dataUrl = out.toDataURL('image/png');
        document.documentElement.style.setProperty('--sqk-logo', `url('${dataUrl}')`);
      } catch(_){}
    };
    src.src = 'icons/icon-512.png';
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

  // ─── LOADER ────────────────────────────────────────────────────────────────
  // HTML reutilizable para reemplazar los "Cargando..." inline.
  function sqLoaderHTML(text){
    ensureStyles();
    ensureLogoProcessed();
    const t = text || 'Cargando…';
    return `
      <div class="sqk-loader" role="status" aria-label="${escapeHtml(t)}">
        <div class="sqk-loader-ring">
          <div class="sqk-loader-arc"></div>
          <div class="sqk-loader-shield"></div>
        </div>
        <div class="sqk-loader-text">${escapeHtml(t)}</div>
      </div>`;
  }
  function escapeHtml(s){
    return String(s == null ? '' : s).replace(/&/g,'&amp;').replace(/</g,'&lt;')
      .replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
  }
  // Overlay fullscreen — para login o acciones bloqueantes.
  function sqShowLoader(text){
    ensureStyles();
    let ov = document.getElementById('sqk-loader-fs');
    if(!ov){
      ov = document.createElement('div');
      ov.id = 'sqk-loader-fs';
      ov.className = 'sqk-loader-fs';
      document.body.appendChild(ov);
    }
    ov.innerHTML = sqLoaderHTML(text);
    requestAnimationFrame(() => ov.classList.add('show'));
  }
  function sqHideLoader(){
    const ov = document.getElementById('sqk-loader-fs');
    if(!ov) return;
    ov.classList.remove('show');
    setTimeout(() => ov.remove(), 220);
  }

  return { toast: sqToast, sheet: sqSheet, animateNumber: sqAnimateNumber, confetti: sqConfettiLime,
           loaderHTML: sqLoaderHTML, showLoader: sqShowLoader, hideLoader: sqHideLoader };
})();

// Globals retro-compatibles
window.sqToast      = SQK.toast;
window.sqSheet      = SQK.sheet;
window.sqAnimateN   = SQK.animateNumber;
window.sqCelebrate  = SQK.confetti;
window.sqLoaderHTML = SQK.loaderHTML;
window.sqShowLoader = SQK.showLoader;
window.sqHideLoader = SQK.hideLoader;

// Reemplaza el toast viejo manteniendo retro-compat: toast(msg) sigue funcionando
// pero ahora muestra el toast nuevo apilable.
window.toast = (msg) => SQK.toast(typeof msg === 'string' ? msg : String(msg ?? ''));

// Pre-procesa el logo al boot para que el primer loader ya tenga el escudo
// limpio. Si la pagina ya cargó, va directo; si no, espera al DOMContentLoaded.
if(document.readyState !== 'loading') SQK.loaderHTML('');
else document.addEventListener('DOMContentLoaded', () => SQK.loaderHTML(''));

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
