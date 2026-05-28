// ══════════════════════════════════════════
// SQUAD TEAM — Muscle Map Share
// Exporta el perfil muscular como imagen 1080×1920 (story 9:16)
// y abre la share sheet nativa (WhatsApp / IG Stories / etc.).
// ══════════════════════════════════════════

(function(){
'use strict';

// ── Frases auto-generadas según el macro grupo dominante ──
const AUTO_PHRASES = {
  PECHO:   'Semana de pecho',
  ESPALDA: 'Semana de espalda',
  PIERNA:  'Semana de pierna',
  BRAZO:   'Semana de brazo',
  HOMBRO:  'Semana de hombro',
  CORE:    'Semana de core'
};

function autoPhrase(macroName){
  return AUTO_PHRASES[macroName] || 'Mi semana';
}

// ── Canvas builder ─────────────────────────
// W=1080 H=1920 (story 9:16). Devuelve Promise<Blob>.
async function buildCanvas({ svgEl, weekLabel, dominantMacro, phrase }){
  const W = 1080, H = 1920;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');

  // ── Fondo ──
  ctx.fillStyle = '#0a0a0a';
  ctx.fillRect(0, 0, W, H);

  // ── Halo lima radial detrás del body ──
  const haloGrad = ctx.createRadialGradient(W/2, H/2 + 40, 60, W/2, H/2 + 40, 700);
  haloGrad.addColorStop(0,    'rgba(217,255,0,0.18)');
  haloGrad.addColorStop(0.45, 'rgba(217,255,0,0.06)');
  haloGrad.addColorStop(1,    'rgba(217,255,0,0)');
  ctx.fillStyle = haloGrad;
  ctx.fillRect(0, 0, W, H);

  // ── Header: barra lima + SQUAD TEAM ──
  ctx.fillStyle = '#d9ff00';
  ctx.fillRect(80, 110, 8, 36);
  ctx.fillStyle = '#d9ff00';
  ctx.font = '700 28px Inter, system-ui, sans-serif';
  ctx.textBaseline = 'top';
  ctx.fillText('SQUAD TEAM', 108, 113);

  // ── Título ──
  ctx.fillStyle = '#ededf2';
  ctx.font = '900 italic 88px "Barlow Condensed", Impact, sans-serif';
  ctx.textBaseline = 'top';
  ctx.fillText('TU PERFIL MUSCULAR', 80, 210);

  // ── Subtítulo (semana) ──
  ctx.fillStyle = '#6b6b8a';
  ctx.font = '700 32px Inter, system-ui, sans-serif';
  ctx.letterSpacing = '2px';
  ctx.fillText((weekLabel || '').toUpperCase(), 80, 314);

  // ── Body: serializa el SVG actual y lo dibuja ──
  await drawSvg(ctx, svgEl, 240, 400, 600, 1100);

  // ── "MÚSCULO DOMINANTE" label ──
  ctx.fillStyle = '#5a5a72';
  ctx.font = '700 28px Inter, system-ui, sans-serif';
  ctx.textBaseline = 'top';
  ctx.textAlign = 'center';
  ctx.fillText('MÚSCULO DOMINANTE', W/2, 1540);

  // ── Nombre del músculo dominante (grande, lima) ──
  ctx.fillStyle = '#d9ff00';
  ctx.font = '900 italic 128px "Barlow Condensed", Impact, sans-serif';
  ctx.shadowColor = 'rgba(217,255,0,0.55)';
  ctx.shadowBlur = 28;
  ctx.fillText(dominantMacro || '—', W/2, 1580);
  ctx.shadowBlur = 0;

  // ── Frase motivacional ──
  ctx.fillStyle = '#ededf2';
  ctx.font = '500 38px Inter, system-ui, sans-serif';
  ctx.fillText(phrase || '', W/2, 1740);

  // ── Footer ──
  ctx.fillStyle = '#48485a';
  ctx.font = '600 26px Inter, system-ui, sans-serif';
  ctx.fillText('squadteam.app', W/2, 1830);

  return new Promise(resolve => canvas.toBlob(resolve, 'image/png', 0.95));
}

// Dibuja un <svg> existente sobre un canvas context.
function drawSvg(ctx, svgEl, x, y, w, h){
  return new Promise((resolve, reject) => {
    // Clonamos el SVG sin la scan-line ni nada de DOM externo
    const clone = svgEl.cloneNode(true);
    clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    clone.setAttribute('width', w);
    clone.setAttribute('height', h);
    // Quitar atributos de estilo que rompen el render standalone
    clone.removeAttribute('class');

    const xml = new XMLSerializer().serializeToString(clone);
    const svg64 = btoa(unescape(encodeURIComponent(xml)));
    const dataUri = 'data:image/svg+xml;base64,' + svg64;

    const img = new Image();
    img.onload = () => {
      ctx.drawImage(img, x, y, w, h);
      resolve();
    };
    img.onerror = (e) => reject(e);
    img.src = dataUri;
  });
}

// ── Share / fallback download ──
async function shareOrDownload(blob){
  const file = new File([blob], 'squadteam-perfil.png', { type: 'image/png' });

  // Web Share API con files (iOS 15+, Android Chrome 89+)
  if (navigator.canShare && navigator.canShare({ files: [file] })){
    try {
      await navigator.share({
        files: [file],
        title: 'Mi perfil muscular',
        text: 'Mi semana en Squad Team'
      });
      return { ok: true, method: 'share' };
    } catch(err){
      if (err && err.name === 'AbortError') return { ok: false, method: 'abort' };
      // si falla, caemos al download
    }
  }

  // Fallback: descarga
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'squadteam-perfil.png';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return { ok: true, method: 'download' };
}

// ── Modal ──
function openModal({ svgEl, weekLabel, dominantMacro }){
  // Limpiamos si quedó uno previo
  document.querySelectorAll('.mm-share-modal').forEach(n => n.remove());

  const initialPhrase = autoPhrase(dominantMacro);

  const overlay = document.createElement('div');
  overlay.className = 'mm-share-modal';
  overlay.innerHTML = `
    <div class="mm-share-backdrop"></div>
    <div class="mm-share-card" role="dialog" aria-label="Compartir perfil muscular">
      <button type="button" class="mm-share-close" aria-label="Cerrar">×</button>
      <h3 class="mm-share-title">COMPARTIR PROGRESO</h3>
      <div class="mm-share-preview-wrap">
        <canvas class="mm-share-preview" width="540" height="960"></canvas>
        <div class="mm-share-loading">Generando preview…</div>
      </div>
      <label class="mm-share-label">FRASE</label>
      <input type="text" class="mm-share-input" maxlength="60"
        value="${initialPhrase.replace(/"/g,'&quot;')}"
        placeholder="Escribí algo épico…"/>
      <button type="button" class="mm-share-go">
        <span class="mm-share-go-label">COMPARTIR</span>
      </button>
    </div>
  `;
  document.body.appendChild(overlay);
  document.body.style.overflow = 'hidden';

  const close = () => {
    document.body.style.overflow = '';
    overlay.remove();
  };
  overlay.querySelector('.mm-share-backdrop').addEventListener('click', close);
  overlay.querySelector('.mm-share-close').addEventListener('click', close);

  const previewCanvas = overlay.querySelector('.mm-share-preview');
  const loadingEl     = overlay.querySelector('.mm-share-loading');
  const inputEl       = overlay.querySelector('.mm-share-input');
  const goBtn         = overlay.querySelector('.mm-share-go');
  const goLabel       = overlay.querySelector('.mm-share-go-label');

  let lastBlob = null;
  let renderToken = 0;

  async function renderPreview(){
    const myToken = ++renderToken;
    loadingEl.style.display = 'flex';
    try {
      await (document.fonts && document.fonts.ready);
    } catch(_){}
    const blob = await buildCanvas({
      svgEl,
      weekLabel,
      dominantMacro,
      phrase: inputEl.value.trim() || autoPhrase(dominantMacro)
    });
    if (myToken !== renderToken) return;
    lastBlob = blob;

    const img = new Image();
    img.onload = () => {
      if (myToken !== renderToken) return;
      const pctx = previewCanvas.getContext('2d');
      pctx.clearRect(0, 0, previewCanvas.width, previewCanvas.height);
      pctx.drawImage(img, 0, 0, previewCanvas.width, previewCanvas.height);
      loadingEl.style.display = 'none';
    };
    img.src = URL.createObjectURL(blob);
  }

  // Debounce input
  let inputTimer = null;
  inputEl.addEventListener('input', () => {
    clearTimeout(inputTimer);
    inputTimer = setTimeout(renderPreview, 220);
  });

  goBtn.addEventListener('click', async () => {
    if (!lastBlob) return;
    goBtn.setAttribute('disabled', '');
    goLabel.textContent = 'COMPARTIENDO…';
    const result = await shareOrDownload(lastBlob);
    if (result.method === 'download'){
      goLabel.textContent = '¡DESCARGADO!';
    } else {
      goLabel.textContent = '¡LISTO!';
    }
    setTimeout(close, 900);
  });

  renderPreview();
}

// ── Export ──
window.MuscleMapShare = {
  open: openModal,
  autoPhrase
};

})();
