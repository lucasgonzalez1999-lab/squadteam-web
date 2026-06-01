'use strict';
// SQUAD TEAM — Generador de contenido multi-formato
// ?gen=1 → YouTube 16:9 · IG Historia 9:16 · IG Cuadrado 1:1
// El usuario sube una foto de fondo; el canvas pone texto encima.

if (typeof CanvasRenderingContext2D !== 'undefined'
    && !CanvasRenderingContext2D.prototype.roundRect) {
  CanvasRenderingContext2D.prototype.roundRect = function(x,y,w,h,r){
    const rr=typeof r==='number'?[r,r,r,r]:(Array.isArray(r)?r:[r,r,r,r]);
    const [tl,tr,br,bl]=rr;
    this.beginPath();
    this.moveTo(x+tl,y); this.lineTo(x+w-tr,y);
    this.quadraticCurveTo(x+w,y,x+w,y+tr);
    this.lineTo(x+w,y+h-br);
    this.quadraticCurveTo(x+w,y+h,x+w-br,y+h);
    this.lineTo(x+bl,y+h);
    this.quadraticCurveTo(x,y+h,x,y+h-bl);
    this.lineTo(x,y+tl);
    this.quadraticCurveTo(x,y,x+tl,y);
    this.closePath(); return this;
  };
}

const CGEN = (() => {
  const ACC   = '#e8ff00';
  const WHITE = '#ffffff';
  const BLACK = '#000000';
  const SUB   = '#cccccc';

  const FORMATS = {
    youtube:  { w:1280, h:720,  label:'YouTube',  ratio:'16/9', maxH:'55vh' },
    historia: { w:1080, h:1920, label:'Historia',  ratio:'9/16', maxH:'80vh' },
    cuadrado: { w:1080, h:1080, label:'Cuadrado',  ratio:'1/1',  maxH:'70vh' },
  };

  let _fmt      = 'youtube';
  let _photo    = null;
  let _templates = [];
  let _selected  = null;
  let _state     = {};
  let _raf       = null;

  // Logo Squad cacheado
  let _logo = null, _logoLoading = false;
  function ensureLogo(){
    if(_logo || _logoLoading) return _logo;
    _logoLoading = true;
    const img = new Image();
    img.onload = () => { _logo = img; _logoLoading = false; scheduleRedraw(); };
    img.onerror = () => { _logoLoading = false; };
    img.src = 'icons/logo-transparent.png';
    return null;
  }

  function scheduleRedraw(){
    if(_raf) return;
    _raf = requestAnimationFrame(() => { _raf = null; redraw(); });
  }

  function withAlpha(hex, a){
    const r=parseInt(hex.slice(1,3),16), g=parseInt(hex.slice(3,5),16), b=parseInt(hex.slice(5,7),16);
    return `rgba(${r},${g},${b},${a})`;
  }

  function escapeHtml(s){
    return String(s==null?'':s)
      .replace(/&/g,'&amp;').replace(/</g,'&lt;')
      .replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
  }

  function wrapText(ctx, text, maxWidth){
    const words=(text||'').split(' ');
    const lines=[]; let line='';
    for(const w of words){
      const t=line?line+' '+w:w;
      if(ctx.measureText(t).width<=maxWidth) line=t;
      else{ if(line) lines.push(line); line=w; }
    }
    if(line) lines.push(line);
    return lines;
  }

  // Reduce font size hasta que el texto wrappeado entre en (maxW, maxH).
  // Devuelve { size, lines, lineH }. Usado para evitar overflow.
  function fitText(ctx, text, maxW, maxH, opts){
    const o = opts || {};
    const family = o.family || '"Barlow Condensed",sans-serif';
    const weight = o.weight || '900 italic';
    const lineHRatio = o.lineH || 1.0;
    let size = o.start || 200;
    const min = o.min || 40;
    while(size >= min){
      ctx.font = `${weight} ${size}px ${family}`;
      const lines = wrapText(ctx, text, maxW);
      const lineH = Math.round(size * lineHRatio);
      if(lines.length * lineH <= maxH){
        return { size, lines, lineH };
      }
      size -= 4;
    }
    ctx.font = `${weight} ${size}px ${family}`;
    const lines = wrapText(ctx, text, maxW);
    return { size, lines, lineH: Math.round(size * lineHRatio) };
  }

  // ── PHOTO UTILS ─────────────────────────────────────────────────────────────
  // Dibuja la foto escalada a cover + overlay oscuro encima
  function drawPhoto(ctx, W, H, darken){
    if(!_photo){
      ctx.fillStyle = '#111111';
      ctx.fillRect(0,0,W,H);
      ctx.fillStyle = '#2a2a2a';
      ctx.font = `700 ${Math.round(W*0.022)}px "Inter",sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText('Subí una foto de fondo', W/2, H/2);
      return;
    }
    const scale = Math.max(W/_photo.width, H/_photo.height);
    const sw = _photo.width*scale, sh = _photo.height*scale;
    ctx.drawImage(_photo, (W-sw)/2, (H-sh)/2, sw, sh);
    ctx.fillStyle = `rgba(0,0,0,${darken||0.45})`;
    ctx.fillRect(0,0,W,H);
  }

  // Gradiente vertical que oscurece la mitad inferior para legibilidad del texto
  function gradientBottom(ctx, W, H, fromFrac, strength){
    const g = ctx.createLinearGradient(0, H*fromFrac, 0, H);
    g.addColorStop(0,'rgba(0,0,0,0)');
    g.addColorStop(1,`rgba(0,0,0,${strength||0.88})`);
    ctx.fillStyle = g;
    ctx.fillRect(0, H*fromFrac, W, H*(1-fromFrac));
  }

  // Pill de label (fondo lima, texto negro)
  function drawPill(ctx, text, x, y, fontSize){
    const fs = fontSize || 28;
    ctx.font = `800 ${fs}px "Inter",sans-serif`;
    const tw = ctx.measureText(text).width;
    const ph = fs*2, pw = tw + fs*1.6;
    ctx.fillStyle = ACC;
    ctx.beginPath(); ctx.roundRect(x, y-ph*0.75, pw, ph, ph/2); ctx.fill();
    ctx.fillStyle = BLACK;
    ctx.textAlign = 'left';
    ctx.fillText(text, x + fs*0.8, y + fs*0.3);
    return pw;
  }

  // Watermark del logo en esquina
  function drawWatermark(ctx, W, H){
    const logo = ensureLogo();
    if(!logo) return;
    const sz = Math.round(W*0.065);
    ctx.globalAlpha = 0.75;
    ctx.drawImage(logo, W - sz - Math.round(W*0.03), Math.round(H*0.03), sz, sz);
    ctx.globalAlpha = 1;
  }

  // ── YOUTUBE TEMPLATES (1280×720) ────────────────────────────────────────────

  // Pregunta dramática — eyebrow arriba, headline grande auto-fit
  function renderYTPregunta(ctx, W, H, d){
    drawPhoto(ctx, W, H, 0.40);
    gradientBottom(ctx, W, H, 0.25, 0.78);

    const padX = 60;

    // Eyebrow pill arriba
    if(d.eyebrow){
      drawPill(ctx, d.eyebrow.toUpperCase(), padX, H*0.18, Math.round(H*0.04));
    }

    // Headline auto-fit en el área central-inferior
    const head = (d.headline||'').toUpperCase();
    const maxW = W - padX*2;
    const maxH = H*0.55;
    const fit  = fitText(ctx, head, maxW, maxH, { start: Math.round(H*0.20), min: 60, lineH: 1.0 });

    const totalH = fit.lines.length * fit.lineH;
    let y = H*0.92 - totalH + fit.lineH; // baseline de primera línea
    const ac = (d.acento||'').toUpperCase();
    ctx.font = `900 italic ${fit.size}px "Barlow Condensed",sans-serif`;
    ctx.textAlign = 'left';
    for(let i=0; i<fit.lines.length; i++){
      const line = fit.lines[i];
      const isLast = i === fit.lines.length - 1;
      if(isLast && ac && line.endsWith(ac)){
        const pre = line.slice(0, line.length - ac.length);
        ctx.fillStyle = WHITE; ctx.fillText(pre, padX, y);
        const preW = ctx.measureText(pre).width;
        ctx.fillStyle = ACC; ctx.fillText(ac, padX + preW, y);
      } else {
        ctx.fillStyle = WHITE;
        ctx.fillText(line, padX, y);
      }
      y += fit.lineH;
    }
    drawWatermark(ctx, W, H);
  }

  // Dos líneas de impacto — blanco arriba, lima abajo (auto-fit)
  function renderYTDosLineas(ctx, W, H, d){
    drawPhoto(ctx, W, H, 0.4);
    gradientBottom(ctx, W, H, 0.25, 0.94);

    const padX = 60, maxW = W - padX*2;
    const f1 = fitText(ctx, (d.line1||'').toUpperCase(), maxW, H*0.22,
      { start: Math.round(H*0.20), min: 50 });
    const f2 = fitText(ctx, (d.line2||'').toUpperCase(), maxW, H*0.30,
      { start: Math.round(H*0.27), min: 60 });

    ctx.textAlign = 'left';
    ctx.fillStyle = WHITE;
    ctx.font = `900 italic ${f1.size}px "Barlow Condensed",sans-serif`;
    ctx.fillText(f1.lines[0], padX, H*0.67);

    ctx.fillStyle = ACC;
    ctx.font = `900 italic ${f2.size}px "Barlow Condensed",sans-serif`;
    ctx.fillText(f2.lines[0], padX, H*0.95);

    drawWatermark(ctx, W, H);
  }

  // Número shock — número gigante lima, label blanco (auto-fit)
  function renderYTNumero(ctx, W, H, d){
    drawPhoto(ctx, W, H, 0.45);
    gradientBottom(ctx, W, H, 0.0, 0.72);

    const padX = 40, maxW = W - padX*2;
    const fn = fitText(ctx, (d.numero||'#1'), maxW, H*0.65,
      { start: Math.round(H*0.55), min: 80 });
    const fl = fitText(ctx, (d.label||'').toUpperCase(), maxW, H*0.22,
      { start: Math.round(H*0.18), min: 40 });

    ctx.textAlign = 'left';
    ctx.fillStyle = ACC;
    ctx.font = `900 italic ${fn.size}px "Barlow Condensed",sans-serif`;
    ctx.fillText(fn.lines[0], padX, H*0.80);

    ctx.fillStyle = WHITE;
    ctx.font = `900 italic ${fl.size}px "Barlow Condensed",sans-serif`;
    ctx.fillText(fl.lines[0], padX, H*0.97);

    drawWatermark(ctx, W, H);
  }

  // ── HISTORIA TEMPLATES (1080×1920) ──────────────────────────────────────────

  // Número + unidad + segunda línea — "+35 AÑOS / NO QUERÉS ESTO"
  function renderHisShock(ctx, W, H, d){
    drawPhoto(ctx, W, H, 0.30);
    gradientBottom(ctx, W, H, 0.42, 0.94);

    const padX = 80, maxW = W - padX*2;

    // Número + unidad en una línea — fit conjunto
    const numTxt = (d.numero||'+35');
    const uniTxt = (d.unidad||'AÑOS').toUpperCase();
    const numSz  = Math.round(H*0.20);
    ctx.textAlign = 'left';
    ctx.fillStyle = ACC;
    ctx.font = `900 italic ${numSz}px "Barlow Condensed",sans-serif`;
    ctx.fillText(numTxt, padX, H*0.71);
    const numW = ctx.measureText(numTxt).width;
    ctx.fillStyle = WHITE;
    ctx.font = `900 italic ${Math.round(numSz*0.42)}px "Barlow Condensed",sans-serif`;
    ctx.fillText(uniTxt, padX+numW+14, H*0.71 - numSz*0.09);

    // Segunda línea auto-fit
    const fit = fitText(ctx, (d.line2||'').toUpperCase(), maxW, H*0.18,
      { start: Math.round(H*0.105), min: 50 });
    ctx.fillStyle = WHITE;
    ctx.font = `900 italic ${fit.size}px "Barlow Condensed",sans-serif`;
    let y = H*0.94 - (fit.lines.length-1) * fit.lineH;
    for(const l of fit.lines){ ctx.fillText(l, padX, y); y += fit.lineH; }

    drawWatermark(ctx, W, H);
  }

  // Caso de éxito — label pill + titular grande (auto-fit)
  function renderHisCaso(ctx, W, H, d){
    drawPhoto(ctx, W, H, 0.35);
    gradientBottom(ctx, W, H, 0.48, 0.95);

    const pillFs = Math.round(H*0.022);
    drawPill(ctx, (d.label||'CASO DE ÉXITO').toUpperCase(), 80, H*0.64, pillFs);

    const padX = 80, maxW = W - padX*2;
    const fit = fitText(ctx, (d.headline||'').toUpperCase(), maxW, H*0.28,
      { start: Math.round(H*0.115), min: 56 });

    ctx.textAlign = 'left';
    ctx.fillStyle = WHITE;
    ctx.font = `900 italic ${fit.size}px "Barlow Condensed",sans-serif`;
    let y = H*0.95 - (fit.lines.length-1) * fit.lineH;
    const yStart = y;
    for(const l of fit.lines){ ctx.fillText(l, padX, y); y += fit.lineH; }

    // Línea lima al costado izquierdo
    ctx.fillStyle = ACC;
    ctx.fillRect(40, H*0.62, 6, y - H*0.62 - fit.lineH*0.6);

    drawWatermark(ctx, W, H);
  }

  // Pregunta al centro — texto grande centrado (auto-fit)
  function renderHisPregunta(ctx, W, H, d){
    drawPhoto(ctx, W, H, 0.5);
    const vg = ctx.createRadialGradient(W/2, H/2, H*0.15, W/2, H/2, H*0.65);
    vg.addColorStop(0,'rgba(0,0,0,0)');
    vg.addColorStop(1,'rgba(0,0,0,0.65)');
    ctx.fillStyle = vg; ctx.fillRect(0,0,W,H);

    const padX = 90, maxW = W - padX*2;
    const fit = fitText(ctx, (d.headline||'').toUpperCase(), maxW, H*0.45,
      { start: Math.round(H*0.10), min: 50, lineH: 1.08 });

    ctx.textAlign = 'center';
    ctx.fillStyle = WHITE;
    ctx.font = `900 italic ${fit.size}px "Barlow Condensed",sans-serif`;
    const totalH = fit.lines.length * fit.lineH;
    let y = H/2 - totalH/2 + fit.lineH;
    for(const l of fit.lines){ ctx.fillText(l, W/2, y); y += fit.lineH; }

    ctx.fillStyle = ACC;
    ctx.font = `900 italic ${Math.round(H*0.075)}px "Barlow Condensed",sans-serif`;
    ctx.fillText('?', W/2, y + Math.round(H*0.04));

    drawWatermark(ctx, W, H);
  }

  // ── CUADRADO TEMPLATES (1080×1080) ──────────────────────────────────────────

  // Post feed — label + titular en tercio inferior (auto-fit)
  function renderSqPost(ctx, W, H, d){
    drawPhoto(ctx, W, H, 0.35);
    gradientBottom(ctx, W, H, 0.42, 0.94);

    if(d.label){
      drawPill(ctx, d.label.toUpperCase(), 60, H*0.62, Math.round(H*0.028));
    }

    const padX = 60, maxW = W - padX*2;
    const fit = fitText(ctx, (d.headline||'').toUpperCase(), maxW, H*0.30,
      { start: Math.round(H*0.135), min: 50 });

    ctx.textAlign = 'left';
    ctx.fillStyle = WHITE;
    ctx.font = `900 italic ${fit.size}px "Barlow Condensed",sans-serif`;
    let y = H*0.95 - (fit.lines.length-1) * fit.lineH;
    for(const l of fit.lines){ ctx.fillText(l, padX, y); y += fit.lineH; }

    drawWatermark(ctx, W, H);
  }

  // Dos líneas — blanco + lima (auto-fit)
  function renderSqDosLineas(ctx, W, H, d){
    drawPhoto(ctx, W, H, 0.45);
    gradientBottom(ctx, W, H, 0.35, 0.92);

    const padX = 60, maxW = W - padX*2;
    const f1 = fitText(ctx, (d.line1||'').toUpperCase(), maxW, H*0.18,
      { start: Math.round(H*0.165), min: 50 });
    const f2 = fitText(ctx, (d.line2||'').toUpperCase(), maxW, H*0.24,
      { start: Math.round(H*0.215), min: 60 });

    ctx.textAlign = 'left';
    ctx.fillStyle = WHITE;
    ctx.font = `900 italic ${f1.size}px "Barlow Condensed",sans-serif`;
    ctx.fillText(f1.lines[0], padX, H*0.72);

    ctx.fillStyle = ACC;
    ctx.font = `900 italic ${f2.size}px "Barlow Condensed",sans-serif`;
    ctx.fillText(f2.lines[0], padX, H*0.935);

    drawWatermark(ctx, W, H);
  }

  // Número impacto cuadrado (auto-fit)
  function renderSqNumero(ctx, W, H, d){
    drawPhoto(ctx, W, H, 0.4);
    gradientBottom(ctx, W, H, 0.0, 0.75);

    const padX = 50, maxW = W - padX*2;

    // Número auto-fit
    const fn = fitText(ctx, (d.numero||'+500'), maxW, H*0.45,
      { start: Math.round(H*0.42), min: 80 });
    ctx.textAlign = 'left';
    ctx.fillStyle = ACC;
    ctx.font = `900 italic ${fn.size}px "Barlow Condensed",sans-serif`;
    ctx.fillText(fn.lines[0], padX, H*0.70);

    // Label auto-fit en máximo 2 líneas, baseline final en H*0.95
    const fl = fitText(ctx, (d.label||'').toUpperCase(), maxW, H*0.22,
      { start: Math.round(H*0.10), min: 36 });
    ctx.fillStyle = WHITE;
    ctx.font = `900 italic ${fl.size}px "Barlow Condensed",sans-serif`;
    let y = H*0.95 - (fl.lines.length-1) * fl.lineH;
    for(const l of fl.lines){ ctx.fillText(l, padX, y); y += fl.lineH; }

    drawWatermark(ctx, W, H);
  }

  // ── TABLA DE TEMPLATES ───────────────────────────────────────────────────────
  const ALL_TEMPLATES = {
    youtube: [
      { id:'yt-pregunta',  label:'Pregunta',   fn:renderYTPregunta,
        defaults:{ eyebrow:'SIN FILTRO', headline:'¿Tu coach todavía te manda PDFs?', acento:'PDFs?' } },
      { id:'yt-doslineas', label:'Dos líneas',  fn:renderYTDosLineas,
        defaults:{ line1:'COACHING', line2:'SIN EXCEL' } },
      { id:'yt-numero',    label:'Número',      fn:renderYTNumero,
        defaults:{ numero:'+500', label:'ATLETAS EN LA APP' } },
    ],
    historia: [
      { id:'his-shock',    label:'Shock',       fn:renderHisShock,
        defaults:{ numero:'+35', unidad:'AÑOS', line2:'NO QUERÉS ESTO' } },
      { id:'his-caso',     label:'Caso',        fn:renderHisCaso,
        defaults:{ label:'CASO DE ÉXITO', headline:'SIENDO COACH Y PADRE' } },
      { id:'his-pregunta', label:'Pregunta',    fn:renderHisPregunta,
        defaults:{ headline:'¿Cuándo fue la última vez que mediste tu progreso real?' } },
    ],
    cuadrado: [
      { id:'sq-post',      label:'Post',        fn:renderSqPost,
        defaults:{ label:'SQUAD TEAM', headline:'TU PLAN EN UNA PANTALLA' } },
      { id:'sq-doslineas', label:'Dos líneas',  fn:renderSqDosLineas,
        defaults:{ line1:'SIN EXCEL', line2:'SIN PAPELES' } },
      { id:'sq-numero',    label:'Número',      fn:renderSqNumero,
        defaults:{ numero:'+500', label:'ATLETAS YA TIENEN SU PLAN' } },
    ],
  };

  // ── UI ───────────────────────────────────────────────────────────────────────
  function ensureStyles(){
    if(document.getElementById('cgen-styles')) return;
    const s = document.createElement('style');
    s.id = 'cgen-styles';
    s.textContent = `
      #cgen-ov{position:fixed;inset:0;z-index:99999;background:#0a0a0d;color:#fff;font-family:"Inter",sans-serif;overflow-y:auto;padding:24px;}
      #cgen-ov .cg-grid{display:grid;grid-template-columns:1fr 340px;gap:24px;align-items:start;}
      @media(max-width:960px){#cgen-ov .cg-grid{grid-template-columns:1fr;}}
      @media(max-width:480px){#cgen-ov{padding:14px!important;}}
      #cgen-ov .cg-chips{display:flex;gap:8px;overflow-x:auto;scrollbar-width:none;padding-bottom:4px;margin-bottom:16px;}
      #cgen-ov .cg-chips::-webkit-scrollbar{display:none;}
      #cgen-ov .cg-chips button{flex-shrink:0;}
      #cgen-ov .cg-upload{width:100%;padding:22px 16px;background:#1a1a1f;border:2px dashed #2a2a35;border-radius:12px;color:#9090a8;font-size:13px;font-weight:700;cursor:pointer;text-align:center;margin-bottom:14px;box-sizing:border-box;letter-spacing:.06em;text-transform:uppercase;}
      #cgen-ov .cg-upload:hover{border-color:#e8ff00;color:#e8ff00;}
      #cgen-ov .cg-upload.has-photo{border-style:solid;border-color:#2a2a35;color:#fff;}
    `;
    document.head.appendChild(s);
  }

  function open(){
    ensureStyles();
    let ov = document.getElementById('cgen-ov');
    if(ov) ov.remove();
    ov = document.createElement('div');
    ov.id = 'cgen-ov';
    document.body.appendChild(ov);
    _templates = ALL_TEMPLATES[_fmt];
    _selected  = _templates[0];
    _state     = { ..._selected.defaults };
    renderUI();
  }

  function renderUI(){
    const ov = document.getElementById('cgen-ov');
    if(!ov) return;
    const fmt = FORMATS[_fmt];

    const fmtNav = ['youtube','historia','cuadrado'].map(f => {
      const active = f === _fmt;
      return `<button onclick="CGEN.setFormat('${f}')" style="padding:8px 16px;background:${active?'#e8ff00':'#1a1a1f'};border:1px solid ${active?'#e8ff00':'#2a2a35'};border-radius:8px;color:${active?'#000':'#9090a8'};font-weight:700;font-size:12px;cursor:pointer;font-family:inherit">${FORMATS[f].label}</button>`;
    }).join('');

    const chips = _templates.map(t => {
      const active = t.id === _selected.id;
      return `<button onclick="CGEN.selectTemplate('${t.id}')" style="padding:9px 16px;background:${active?'#e8ff00':'#1a1a1f'};border:1px solid ${active?'#e8ff00':'#2a2a35'};color:${active?'#000':'#fff'};border-radius:10px;font-size:12px;font-weight:700;cursor:pointer;font-family:inherit">${t.label}</button>`;
    }).join('');

    const fields = Object.entries(_state).map(([k,v]) => `
      <div style="margin-bottom:12px">
        <label style="display:block;font-size:10px;font-weight:700;letter-spacing:.12em;color:#9090a8;text-transform:uppercase;margin-bottom:5px">${escapeHtml(k)}</label>
        <input data-key="${escapeHtml(k)}" type="text" value="${escapeHtml(v)}" style="width:100%;background:#1a1a1f;border:1px solid #2a2a35;border-radius:8px;padding:9px 12px;color:#fff;font-family:inherit;font-size:14px;box-sizing:border-box">
      </div>`).join('');

    const uploadLabel = _photo ? 'Cambiar foto' : '+ Subir foto de fondo';
    const uploadClass = _photo ? 'cg-upload has-photo' : 'cg-upload';

    ov.innerHTML = `
    <div style="max-width:1300px;margin:0 auto">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;flex-wrap:wrap;gap:12px">
        <div>
          <div style="font-family:'Barlow Condensed',sans-serif;font-style:italic;font-weight:900;font-size:40px;line-height:.9">GENERADOR</div>
          <div style="font-size:12px;color:#9090a8;margin-top:4px">${fmt.w}×${fmt.h} · ${fmt.label}</div>
        </div>
        <div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap">
          ${fmtNav}
          <button onclick="document.getElementById('cgen-ov').remove()" style="background:#1a1a1f;border:1px solid #2a2a35;border-radius:10px;width:40px;height:40px;color:#fff;font-size:20px;cursor:pointer;margin-left:4px">×</button>
        </div>
      </div>

      <div class="cg-chips">${chips}</div>

      <div class="cg-grid">
        <div style="background:#111;border-radius:12px;overflow:hidden;aspect-ratio:${fmt.ratio};max-height:${fmt.maxH};display:flex;align-items:center;justify-content:center">
          <canvas id="cgen-canvas" width="${fmt.w}" height="${fmt.h}" style="max-width:100%;max-height:100%;display:block"></canvas>
        </div>
        <div>
          <input type="file" id="cgen-file" accept="image/*" style="display:none" onchange="CGEN.onPhoto(event)">
          <div class="${uploadClass}" onclick="document.getElementById('cgen-file').click()">${uploadLabel}</div>
          <div oninput="CGEN.updateField(event)">${fields}</div>
          <button onclick="CGEN.download()" style="width:100%;padding:14px;background:#e8ff00;border:none;border-radius:12px;color:#000;font-family:inherit;font-weight:800;font-size:14px;letter-spacing:1.5px;cursor:pointer;text-transform:uppercase;margin-top:10px">Descargar PNG</button>
          <button onclick="CGEN.reset()" style="width:100%;padding:10px;background:transparent;border:1px solid #2a2a35;border-radius:10px;color:#9090a8;font-family:inherit;font-weight:600;font-size:12px;cursor:pointer;margin-top:8px">Reset</button>
        </div>
      </div>
    </div>`;
    scheduleRedraw();
  }

  function setFormat(f){
    if(!ALL_TEMPLATES[f]) return;
    _fmt       = f;
    _templates = ALL_TEMPLATES[_fmt];
    _selected  = _templates[0];
    _state     = { ..._selected.defaults };
    renderUI();
  }

  function selectTemplate(id){
    const t = _templates.find(x => x.id === id);
    if(!t) return;
    _selected = t;
    _state    = { ..._selected.defaults };
    renderUI();
  }

  function onPhoto(e){
    const file = e.target.files[0];
    if(!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const img = new Image();
      img.onload = () => { _photo = img; renderUI(); };
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
  }

  function updateField(e){
    const key = e.target.getAttribute('data-key');
    if(!key) return;
    _state[key] = e.target.value;
    scheduleRedraw();
  }

  function redraw(){
    const cv = document.getElementById('cgen-canvas');
    if(!cv || !_selected) return;
    const fmt = FORMATS[_fmt];
    const ctx = cv.getContext('2d');
    ctx.clearRect(0, 0, fmt.w, fmt.h);
    _selected.fn(ctx, fmt.w, fmt.h, _state);
  }

  function download(){
    const cv = document.getElementById('cgen-canvas');
    if(!cv) return;
    cv.toBlob(blob => {
      const url = URL.createObjectURL(blob);
      const a   = document.createElement('a');
      a.href    = url;
      a.download = `squadteam-${_selected.id}-${Date.now()}.png`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    }, 'image/png');
  }

  function reset(){
    _state = { ..._selected.defaults };
    renderUI();
  }

  return { open, setFormat, selectTemplate, onPhoto, updateField, download, reset };
})();

const _genParam = new URLSearchParams(location.search).get('gen');
if(_genParam === '1'){
  document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => CGEN.open(), 300);
  });
}
window.CGEN = CGEN;
