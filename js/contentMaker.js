'use strict';
// SQUAD TEAM — Generador de contenido multi-formato
// ?gen=1 → YouTube 16:9 · IG Historia 9:16 · IG Cuadrado 1:1
// Templates declarativos con schema de fields; el editor arma la UI sola.

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

  const FORMATS = {
    youtube:  { w:1280, h:720,  label:'YouTube',  ratio:'16/9', maxH:'55vh' },
    historia: { w:1080, h:1920, label:'Historia',  ratio:'9/16', maxH:'80vh' },
    cuadrado: { w:1080, h:1080, label:'Cuadrado',  ratio:'1/1',  maxH:'70vh' },
  };

  let _fmt      = 'youtube';
  let _photo    = null;
  let _photoName = '';
  let _templates = [];
  let _selected  = null;
  let _state     = {};
  let _raf       = null;

  // Logo cacheado en background; cuando carga, dispara redraw.
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

  // Reduce tamaño hasta que entre. Si text vacío, devuelve fallback seguro.
  function fitText(ctx, text, maxW, maxH, opts){
    const o = opts || {};
    const family = o.family || '"Barlow Condensed",sans-serif';
    const weight = o.weight || '900 italic';
    const lineHRatio = o.lineH || 1.05;
    const safeText = text || ' ';
    let size = o.start || 200;
    const min = o.min || 40;
    while(size >= min){
      ctx.font = `${weight} ${size}px ${family}`;
      const lines = wrapText(ctx, safeText, maxW);
      const lineH = Math.round(size * lineHRatio);
      if(lines.length * lineH <= maxH){
        return { size, lines: lines.length?lines:[' '], lineH };
      }
      size -= 4;
    }
    ctx.font = `${weight} ${size}px ${family}`;
    const lines = wrapText(ctx, safeText, maxW);
    return { size, lines: lines.length?lines:[' '], lineH: Math.round(size * lineHRatio) };
  }

  // Si el user setea fixedSize > 0, override; si no, fitText.
  function fitOrFixed(ctx, text, maxW, maxH, opts){
    const o = opts || {};
    if (o.fixedSize && o.fixedSize > 0) {
      const family = o.family || '"Barlow Condensed",sans-serif';
      const weight = o.weight || '900 italic';
      const lineHRatio = o.lineH || 1.05;
      ctx.font = `${weight} ${o.fixedSize}px ${family}`;
      const safeText = text || ' ';
      const lines = wrapText(ctx, safeText, maxW);
      return {
        size: o.fixedSize,
        lines: lines.length ? lines : [' '],
        lineH: Math.round(o.fixedSize * lineHRatio),
      };
    }
    return fitText(ctx, text, maxW, maxH, o);
  }

  // Aplica un translate al bloque de texto sin mover la foto/watermark.
  // posY (slider %) + textOffsetX/Y (drag, en px del canvas).
  function withTextOffset(ctx, H, d, fn){
    const dy = ((d.posY || 0) / 100) * H + (d.textOffsetY || 0);
    const dx = (d.textOffsetX || 0);
    ctx.save();
    ctx.translate(dx, dy);
    try { fn(); } finally { ctx.restore(); }
  }

  // ── PHOTO + COMPOSITION ─────────────────────────────────────────────────────
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
    ctx.fillStyle = `rgba(0,0,0,${darken||0.40})`;
    ctx.fillRect(0,0,W,H);
  }

  function gradientBottom(ctx, W, H, fromFrac, strength){
    const g = ctx.createLinearGradient(0, H*fromFrac, 0, H);
    g.addColorStop(0,'rgba(0,0,0,0)');
    g.addColorStop(1,`rgba(0,0,0,${strength||0.88})`);
    ctx.fillStyle = g;
    ctx.fillRect(0, H*fromFrac, W, H*(1-fromFrac));
  }

  function drawPill(ctx, text, x, y, fontSize, bg, fg){
    const fs = fontSize || 28;
    ctx.font = `800 ${fs}px "Inter",sans-serif`;
    const tw = ctx.measureText(text).width;
    const ph = fs*2, pw = tw + fs*1.6;
    ctx.fillStyle = bg || ACC;
    ctx.beginPath(); ctx.roundRect(x, y-ph*0.75, pw, ph, ph/2); ctx.fill();
    ctx.fillStyle = fg || BLACK;
    ctx.textAlign = 'left';
    ctx.fillText(text, x + fs*0.8, y + fs*0.3);
    return pw;
  }

  function drawWatermark(ctx, W, H){
    const logo = ensureLogo();
    if(!logo) return;
    const sz = Math.round(W*0.065);
    ctx.globalAlpha = 0.75;
    ctx.drawImage(logo, W - sz - Math.round(W*0.03), Math.round(H*0.03), sz, sz);
    ctx.globalAlpha = 1;
  }

  function overlay(d, fallback){
    return (d.overlay != null ? d.overlay/100 : fallback);
  }

  // ── RENDERERS ───────────────────────────────────────────────────────────────

  // YouTube — Pregunta (eyebrow pill + headline auto-fit con acento)
  function renderYTPregunta(ctx, W, H, d){
    drawPhoto(ctx, W, H, overlay(d, 0.40));
    gradientBottom(ctx, W, H, 0.25, 0.78);

    withTextOffset(ctx, H, d, () => {
      const padX = 60;
      if(d.eyebrow){
        drawPill(ctx, d.eyebrow.toUpperCase(), padX, H*0.18, Math.round(H*0.04));
      }
      const head = (d.headline||'').toUpperCase();
      const maxW = W - padX*2, maxH = H*0.55;
      const fit  = fitOrFixed(ctx, head, maxW, maxH, {
        start: Math.round(H*0.20), min: 60, lineH: 1.05, fixedSize: d.headlineSize,
      });
      const totalH = fit.lines.length * fit.lineH;
      let y = H*0.92 - totalH + fit.lineH;
      const ac = (d.acento||'').toUpperCase();
      ctx.font = `900 italic ${fit.size}px "Barlow Condensed",sans-serif`;
      ctx.textAlign = 'left';
      const head1 = d.headlineColor || WHITE;
      const head2 = d.acentoColor   || ACC;
      for(let i=0; i<fit.lines.length; i++){
        const line = fit.lines[i];
        const isLast = i === fit.lines.length - 1;
        if(isLast && ac && line.endsWith(ac)){
          const pre = line.slice(0, line.length - ac.length);
          ctx.fillStyle = head1; ctx.fillText(pre, padX, y);
          const preW = ctx.measureText(pre).width;
          ctx.fillStyle = head2; ctx.fillText(ac, padX + preW, y);
        } else {
          ctx.fillStyle = head1;
          ctx.fillText(line, padX, y);
        }
        y += fit.lineH;
      }
    });

    if(d.watermark !== false) drawWatermark(ctx, W, H);
  }

  // YouTube — Dos líneas
  function renderYTDosLineas(ctx, W, H, d){
    drawPhoto(ctx, W, H, overlay(d, 0.40));
    gradientBottom(ctx, W, H, 0.25, 0.94);

    withTextOffset(ctx, H, d, () => {
      const padX = 60, maxW = W - padX*2;
      const f1 = fitOrFixed(ctx, (d.line1||'').toUpperCase(), maxW, H*0.22,
        { start: Math.round(H*0.20), min: 50, fixedSize: d.line1Size });
      const f2 = fitOrFixed(ctx, (d.line2||'').toUpperCase(), maxW, H*0.30,
        { start: Math.round(H*0.27), min: 60, fixedSize: d.line2Size });

      ctx.textAlign = 'left';
      ctx.fillStyle = d.line1Color || WHITE;
      ctx.font = `900 italic ${f1.size}px "Barlow Condensed",sans-serif`;
      ctx.fillText(f1.lines[0], padX, H*0.67);

      ctx.fillStyle = d.line2Color || ACC;
      ctx.font = `900 italic ${f2.size}px "Barlow Condensed",sans-serif`;
      ctx.fillText(f2.lines[0], padX, H*0.95);
    });

    if(d.watermark !== false) drawWatermark(ctx, W, H);
  }

  // YouTube — Número
  function renderYTNumero(ctx, W, H, d){
    drawPhoto(ctx, W, H, overlay(d, 0.45));
    gradientBottom(ctx, W, H, 0.0, 0.72);

    withTextOffset(ctx, H, d, () => {
      const padX = 40, maxW = W - padX*2;
      const fn = fitOrFixed(ctx, (d.numero||'#1'), maxW, H*0.65,
        { start: Math.round(H*0.55), min: 80, fixedSize: d.numeroSize });
      const fl = fitOrFixed(ctx, (d.label||'').toUpperCase(), maxW, H*0.22,
        { start: Math.round(H*0.18), min: 40, fixedSize: d.labelSize });

      ctx.textAlign = 'left';
      ctx.fillStyle = d.numeroColor || ACC;
      ctx.font = `900 italic ${fn.size}px "Barlow Condensed",sans-serif`;
      ctx.fillText(fn.lines[0], padX, H*0.80);

      ctx.fillStyle = d.labelColor || WHITE;
      ctx.font = `900 italic ${fl.size}px "Barlow Condensed",sans-serif`;
      ctx.fillText(fl.lines[0], padX, H*0.97);
    });

    if(d.watermark !== false) drawWatermark(ctx, W, H);
  }

  // Historia — Shock (numero + unidad + line2)
  function renderHisShock(ctx, W, H, d){
    drawPhoto(ctx, W, H, overlay(d, 0.30));
    gradientBottom(ctx, W, H, 0.42, 0.94);

    withTextOffset(ctx, H, d, () => {
      const padX = 80, maxW = W - padX*2;
      const numTxt = (d.numero||'+35');
      const uniTxt = (d.unidad||'AÑOS').toUpperCase();
      const numSz  = d.numeroSize > 0 ? d.numeroSize : Math.round(H*0.20);

      ctx.textAlign = 'left';
      ctx.fillStyle = d.numeroColor || ACC;
      ctx.font = `900 italic ${numSz}px "Barlow Condensed",sans-serif`;
      ctx.fillText(numTxt, padX, H*0.71);
      const numW = ctx.measureText(numTxt).width;

      ctx.fillStyle = d.unidadColor || WHITE;
      ctx.font = `900 italic ${Math.round(numSz*0.42)}px "Barlow Condensed",sans-serif`;
      ctx.fillText(uniTxt, padX+numW+14, H*0.71 - numSz*0.09);

      const fit = fitOrFixed(ctx, (d.line2||'').toUpperCase(), maxW, H*0.18,
        { start: Math.round(H*0.105), min: 50, fixedSize: d.line2Size });
      ctx.fillStyle = d.line2Color || WHITE;
      ctx.font = `900 italic ${fit.size}px "Barlow Condensed",sans-serif`;
      let y = H*0.94 - (fit.lines.length-1) * fit.lineH;
      for(const l of fit.lines){ ctx.fillText(l, padX, y); y += fit.lineH; }
    });

    if(d.watermark !== false) drawWatermark(ctx, W, H);
  }

  // Historia — Caso
  function renderHisCaso(ctx, W, H, d){
    drawPhoto(ctx, W, H, overlay(d, 0.35));
    gradientBottom(ctx, W, H, 0.48, 0.95);

    withTextOffset(ctx, H, d, () => {
      const pillFs = Math.round(H*0.022);
      drawPill(ctx, (d.label||'CASO DE ÉXITO').toUpperCase(), 80, H*0.64, pillFs,
        d.labelBg || ACC, d.labelFg || BLACK);

      const padX = 80, maxW = W - padX*2;
      const fit = fitOrFixed(ctx, (d.headline||'').toUpperCase(), maxW, H*0.28,
        { start: Math.round(H*0.115), min: 56, fixedSize: d.headlineSize });

      ctx.textAlign = 'left';
      ctx.fillStyle = d.headlineColor || WHITE;
      ctx.font = `900 italic ${fit.size}px "Barlow Condensed",sans-serif`;
      let y = H*0.95 - (fit.lines.length-1) * fit.lineH;
      for(const l of fit.lines){ ctx.fillText(l, padX, y); y += fit.lineH; }

      // Línea lateral lima, altura derivada del área del texto
      const top = H*0.62;
      const bottom = Math.max(top + 40, H*0.95);
      ctx.fillStyle = d.barColor || ACC;
      ctx.fillRect(40, top, 6, bottom - top - fit.lineH*0.6);
    });

    if(d.watermark !== false) drawWatermark(ctx, W, H);
  }

  // Historia — Pregunta
  function renderHisPregunta(ctx, W, H, d){
    drawPhoto(ctx, W, H, overlay(d, 0.50));
    const vg = ctx.createRadialGradient(W/2, H/2, H*0.15, W/2, H/2, H*0.65);
    vg.addColorStop(0,'rgba(0,0,0,0)');
    vg.addColorStop(1,'rgba(0,0,0,0.65)');
    ctx.fillStyle = vg; ctx.fillRect(0,0,W,H);

    withTextOffset(ctx, H, d, () => {
      const padX = 90, maxW = W - padX*2;
      const fit = fitOrFixed(ctx, (d.headline||'').toUpperCase(), maxW, H*0.45,
        { start: Math.round(H*0.10), min: 50, lineH: 1.08, fixedSize: d.headlineSize });

      ctx.textAlign = 'center';
      ctx.fillStyle = d.headlineColor || WHITE;
      ctx.font = `900 italic ${fit.size}px "Barlow Condensed",sans-serif`;
      const totalH = fit.lines.length * fit.lineH;
      let y = H/2 - totalH/2 + fit.lineH;
      for(const l of fit.lines){ ctx.fillText(l, W/2, y); y += fit.lineH; }

      ctx.fillStyle = d.markColor || ACC;
      ctx.font = `900 italic ${Math.round(H*0.075)}px "Barlow Condensed",sans-serif`;
      ctx.fillText('?', W/2, y + Math.round(H*0.04));
    });

    if(d.watermark !== false) drawWatermark(ctx, W, H);
  }

  // Cuadrado — Post
  function renderSqPost(ctx, W, H, d){
    drawPhoto(ctx, W, H, overlay(d, 0.35));
    gradientBottom(ctx, W, H, 0.42, 0.94);

    withTextOffset(ctx, H, d, () => {
      if(d.label){
        drawPill(ctx, d.label.toUpperCase(), 60, H*0.62, Math.round(H*0.028),
          d.labelBg || ACC, d.labelFg || BLACK);
      }
      const padX = 60, maxW = W - padX*2;
      const fit = fitOrFixed(ctx, (d.headline||'').toUpperCase(), maxW, H*0.30,
        { start: Math.round(H*0.135), min: 50, fixedSize: d.headlineSize });

      ctx.textAlign = 'left';
      ctx.fillStyle = d.headlineColor || WHITE;
      ctx.font = `900 italic ${fit.size}px "Barlow Condensed",sans-serif`;
      let y = H*0.95 - (fit.lines.length-1) * fit.lineH;
      for(const l of fit.lines){ ctx.fillText(l, padX, y); y += fit.lineH; }
    });

    if(d.watermark !== false) drawWatermark(ctx, W, H);
  }

  // Cuadrado — Dos líneas
  function renderSqDosLineas(ctx, W, H, d){
    drawPhoto(ctx, W, H, overlay(d, 0.45));
    gradientBottom(ctx, W, H, 0.35, 0.92);

    withTextOffset(ctx, H, d, () => {
      const padX = 60, maxW = W - padX*2;
      const f1 = fitOrFixed(ctx, (d.line1||'').toUpperCase(), maxW, H*0.18,
        { start: Math.round(H*0.165), min: 50, fixedSize: d.line1Size });
      const f2 = fitOrFixed(ctx, (d.line2||'').toUpperCase(), maxW, H*0.24,
        { start: Math.round(H*0.215), min: 60, fixedSize: d.line2Size });

      ctx.textAlign = 'left';
      ctx.fillStyle = d.line1Color || WHITE;
      ctx.font = `900 italic ${f1.size}px "Barlow Condensed",sans-serif`;
      ctx.fillText(f1.lines[0], padX, H*0.72);

      ctx.fillStyle = d.line2Color || ACC;
      ctx.font = `900 italic ${f2.size}px "Barlow Condensed",sans-serif`;
      ctx.fillText(f2.lines[0], padX, H*0.935);
    });

    if(d.watermark !== false) drawWatermark(ctx, W, H);
  }

  // Cuadrado — Número
  function renderSqNumero(ctx, W, H, d){
    drawPhoto(ctx, W, H, overlay(d, 0.40));
    gradientBottom(ctx, W, H, 0.0, 0.75);

    withTextOffset(ctx, H, d, () => {
      const padX = 50, maxW = W - padX*2;
      const fn = fitOrFixed(ctx, (d.numero||'+500'), maxW, H*0.45,
        { start: Math.round(H*0.42), min: 80, fixedSize: d.numeroSize });
      ctx.textAlign = 'left';
      ctx.fillStyle = d.numeroColor || ACC;
      ctx.font = `900 italic ${fn.size}px "Barlow Condensed",sans-serif`;
      ctx.fillText(fn.lines[0], padX, H*0.70);

      const fl = fitOrFixed(ctx, (d.label||'').toUpperCase(), maxW, H*0.22,
        { start: Math.round(H*0.10), min: 36, fixedSize: d.labelSize });
      ctx.fillStyle = d.labelColor || WHITE;
      ctx.font = `900 italic ${fl.size}px "Barlow Condensed",sans-serif`;
      let y = H*0.95 - (fl.lines.length-1) * fl.lineH;
      for(const l of fl.lines){ ctx.fillText(l, padX, y); y += fl.lineH; }
    });

    if(d.watermark !== false) drawWatermark(ctx, W, H);
  }

  // ── SCHEMA ──────────────────────────────────────────────────────────────────
  const COMMON_FIELDS = {
    overlay:   { type:'range',  label:'Overlay foto',      min:0,  max:90, step:5, default:40, unit:'%' },
    posY:      { type:'range',  label:'Posición vertical', min:-15, max:15, step:1, default:0,  unit:'%' },
    watermark: { type:'toggle', label:'Watermark',         default:true },
  };

  const ALL_TEMPLATES = {
    youtube: [
      {
        id:'yt-pregunta', label:'Pregunta', fn:renderYTPregunta,
        fields:{
          eyebrow:       { type:'text',     label:'Eyebrow',        default:'SIN FILTRO' },
          headline:      { type:'textarea', label:'Titular',        default:'¿Tu coach todavía te manda PDFs?' },
          acento:        { type:'text',     label:'Palabra acento', default:'PDFs?' },
          headlineColor: { type:'color',    label:'Color titular',  default:'#ffffff' },
          acentoColor:   { type:'color',    label:'Color acento',   default:'#e8ff00' },
          headlineSize:  { type:'range',    label:'Tamaño titular', min:0, max:280, step:4, default:0, unit:'px', autoLabel:'Auto' },
        }
      },
      {
        id:'yt-doslineas', label:'Dos líneas', fn:renderYTDosLineas,
        fields:{
          line1:      { type:'text',  label:'Línea 1', default:'COACHING' },
          line2:      { type:'text',  label:'Línea 2', default:'SIN EXCEL' },
          line1Color: { type:'color', label:'Color línea 1', default:'#ffffff' },
          line2Color: { type:'color', label:'Color línea 2', default:'#e8ff00' },
          line1Size:  { type:'range', label:'Tamaño línea 1', min:0, max:240, step:4, default:0, unit:'px', autoLabel:'Auto' },
          line2Size:  { type:'range', label:'Tamaño línea 2', min:0, max:280, step:4, default:0, unit:'px', autoLabel:'Auto' },
        }
      },
      {
        id:'yt-numero', label:'Número', fn:renderYTNumero,
        fields:{
          numero:      { type:'text',  label:'Número', default:'+500' },
          label:       { type:'text',  label:'Etiqueta', default:'ATLETAS EN LA APP' },
          numeroColor: { type:'color', label:'Color número', default:'#e8ff00' },
          labelColor:  { type:'color', label:'Color etiqueta', default:'#ffffff' },
          numeroSize:  { type:'range', label:'Tamaño número', min:0, max:600, step:8, default:0, unit:'px', autoLabel:'Auto' },
          labelSize:   { type:'range', label:'Tamaño etiqueta', min:0, max:200, step:4, default:0, unit:'px', autoLabel:'Auto' },
        }
      },
    ],
    historia: [
      {
        id:'his-shock', label:'Shock', fn:renderHisShock,
        fields:{
          numero:      { type:'text',  label:'Número',   default:'+35' },
          unidad:      { type:'text',  label:'Unidad',   default:'AÑOS' },
          line2:       { type:'text',  label:'Bajada',   default:'NO QUERÉS ESTO' },
          numeroColor: { type:'color', label:'Color número',   default:'#e8ff00' },
          unidadColor: { type:'color', label:'Color unidad',   default:'#ffffff' },
          line2Color:  { type:'color', label:'Color bajada',   default:'#ffffff' },
          numeroSize:  { type:'range', label:'Tamaño número',  min:0, max:600, step:8, default:0, unit:'px', autoLabel:'Auto' },
          line2Size:   { type:'range', label:'Tamaño bajada',  min:0, max:300, step:4, default:0, unit:'px', autoLabel:'Auto' },
        }
      },
      {
        id:'his-caso', label:'Caso', fn:renderHisCaso,
        fields:{
          label:         { type:'text',  label:'Pill',          default:'CASO DE ÉXITO' },
          headline:      { type:'textarea', label:'Titular',    default:'SIENDO COACH Y PADRE' },
          labelBg:       { type:'color', label:'Fondo pill',    default:'#e8ff00' },
          labelFg:       { type:'color', label:'Texto pill',    default:'#000000' },
          headlineColor: { type:'color', label:'Color titular', default:'#ffffff' },
          barColor:      { type:'color', label:'Color barra',   default:'#e8ff00' },
          headlineSize:  { type:'range', label:'Tamaño titular', min:0, max:280, step:4, default:0, unit:'px', autoLabel:'Auto' },
        }
      },
      {
        id:'his-pregunta', label:'Pregunta', fn:renderHisPregunta,
        fields:{
          headline:      { type:'textarea', label:'Titular',    default:'¿Cuándo fue la última vez que mediste tu progreso real?' },
          headlineColor: { type:'color',    label:'Color titular', default:'#ffffff' },
          markColor:     { type:'color',    label:'Color signo "?"', default:'#e8ff00' },
          headlineSize:  { type:'range',    label:'Tamaño titular', min:0, max:240, step:4, default:0, unit:'px', autoLabel:'Auto' },
          overlay:       { type:'range',    label:'Overlay foto', min:0, max:90, step:5, default:50, unit:'%' },
        }
      },
    ],
    cuadrado: [
      {
        id:'sq-post', label:'Post', fn:renderSqPost,
        fields:{
          label:         { type:'text',  label:'Pill',         default:'SQUAD TEAM' },
          headline:      { type:'textarea', label:'Titular',   default:'TU PLAN EN UNA PANTALLA' },
          labelBg:       { type:'color', label:'Fondo pill',   default:'#e8ff00' },
          labelFg:       { type:'color', label:'Texto pill',   default:'#000000' },
          headlineColor: { type:'color', label:'Color titular', default:'#ffffff' },
          headlineSize:  { type:'range', label:'Tamaño titular', min:0, max:280, step:4, default:0, unit:'px', autoLabel:'Auto' },
        }
      },
      {
        id:'sq-doslineas', label:'Dos líneas', fn:renderSqDosLineas,
        fields:{
          line1:      { type:'text',  label:'Línea 1', default:'SIN EXCEL' },
          line2:      { type:'text',  label:'Línea 2', default:'SIN PAPELES' },
          line1Color: { type:'color', label:'Color línea 1', default:'#ffffff' },
          line2Color: { type:'color', label:'Color línea 2', default:'#e8ff00' },
          line1Size:  { type:'range', label:'Tamaño línea 1', min:0, max:240, step:4, default:0, unit:'px', autoLabel:'Auto' },
          line2Size:  { type:'range', label:'Tamaño línea 2', min:0, max:280, step:4, default:0, unit:'px', autoLabel:'Auto' },
        }
      },
      {
        id:'sq-numero', label:'Número', fn:renderSqNumero,
        fields:{
          numero:      { type:'text',  label:'Número', default:'+500' },
          label:       { type:'text',  label:'Etiqueta', default:'ATLETAS YA TIENEN SU PLAN' },
          numeroColor: { type:'color', label:'Color número', default:'#e8ff00' },
          labelColor:  { type:'color', label:'Color etiqueta', default:'#ffffff' },
          numeroSize:  { type:'range', label:'Tamaño número', min:0, max:600, step:8, default:0, unit:'px', autoLabel:'Auto' },
          labelSize:   { type:'range', label:'Tamaño etiqueta', min:0, max:200, step:4, default:0, unit:'px', autoLabel:'Auto' },
        }
      },
    ],
  };

  // Merge: template.fields gana sobre COMMON_FIELDS (permite overrides por template).
  function mergedFields(template){
    return { ...COMMON_FIELDS, ...template.fields };
  }
  function buildState(template){
    const out = {};
    const merged = mergedFields(template);
    for(const [k, def] of Object.entries(merged)) out[k] = def.default;
    return out;
  }

  // ── UI ──────────────────────────────────────────────────────────────────────
  function ensureStyles(){
    if(document.getElementById('cgen-styles')) return;
    const s = document.createElement('style');
    s.id = 'cgen-styles';
    s.textContent = `
      #cgen-ov{position:fixed;inset:0;z-index:99999;background:#0a0a0d;color:#fff;font-family:"Inter",sans-serif;overflow-y:auto;padding:24px;}
      #cgen-ov .cg-grid{display:grid;grid-template-columns:1fr 360px;gap:24px;align-items:start;}
      @media(max-width:960px){#cgen-ov .cg-grid{grid-template-columns:1fr;}}
      @media(max-width:480px){#cgen-ov{padding:14px!important;}}
      #cgen-ov .cg-chips{display:flex;gap:8px;overflow-x:auto;scrollbar-width:none;padding-bottom:4px;margin-bottom:16px;}
      #cgen-ov .cg-chips::-webkit-scrollbar{display:none;}
      #cgen-ov .cg-chips button{flex-shrink:0;}
      #cgen-ov .cg-upload{display:flex;align-items:center;gap:12px;width:100%;padding:14px 16px;background:#1a1a1f;border:2px dashed #2a2a35;border-radius:12px;color:#9090a8;font-size:12px;font-weight:700;cursor:pointer;margin-bottom:14px;box-sizing:border-box;letter-spacing:.06em;text-transform:uppercase;}
      #cgen-ov .cg-upload:hover{border-color:#e8ff00;color:#e8ff00;}
      #cgen-ov .cg-upload.has-photo{border-style:solid;border-color:#2a2a35;color:#fff;}
      #cgen-ov .cg-thumb{width:42px;height:42px;border-radius:8px;object-fit:cover;flex-shrink:0;background:#000;}
      #cgen-ov .cg-thumb-empty{width:42px;height:42px;border-radius:8px;flex-shrink:0;background:#11141a;display:flex;align-items:center;justify-content:center;color:#3a3a44;font-size:22px;}
      #cgen-ov .cg-field{margin-bottom:12px;}
      #cgen-ov .cg-field label.cg-l{display:block;font-size:10px;font-weight:700;letter-spacing:.12em;color:#9090a8;text-transform:uppercase;margin-bottom:5px;}
      #cgen-ov .cg-input,#cgen-ov textarea.cg-input{width:100%;background:#1a1a1f;border:1px solid #2a2a35;border-radius:8px;padding:9px 12px;color:#fff;font-family:inherit;font-size:14px;box-sizing:border-box;resize:vertical;}
      #cgen-ov .cg-row{display:flex;gap:10px;align-items:center;}
      #cgen-ov input[type=color].cg-color{appearance:none;-webkit-appearance:none;width:42px;height:36px;border:1px solid #2a2a35;border-radius:8px;background:#1a1a1f;padding:2px;cursor:pointer;}
      #cgen-ov input[type=color].cg-color::-webkit-color-swatch{border:none;border-radius:6px;}
      #cgen-ov input[type=color].cg-color::-moz-color-swatch{border:none;border-radius:6px;}
      #cgen-ov .cg-hex{font-family:'Roboto Mono',monospace;font-size:11px;color:#9090a8;letter-spacing:.05em;}
      #cgen-ov input[type=range].cg-range{flex:1;accent-color:#e8ff00;}
      #cgen-ov .cg-val{min-width:46px;text-align:right;font-family:'Roboto Mono',monospace;font-size:11px;color:#fff;}
      #cgen-ov .cg-val.auto{color:#9090a8;}
      #cgen-ov .cg-toggle{display:flex;align-items:center;justify-content:space-between;padding:10px 12px;background:#1a1a1f;border:1px solid #2a2a35;border-radius:8px;cursor:pointer;user-select:none;}
      #cgen-ov .cg-toggle input{display:none;}
      #cgen-ov .cg-toggle .cg-sw{width:34px;height:20px;border-radius:10px;background:#2a2a35;position:relative;transition:background .15s;}
      #cgen-ov .cg-toggle .cg-sw::after{content:'';position:absolute;top:2px;left:2px;width:16px;height:16px;border-radius:50%;background:#9090a8;transition:left .15s,background .15s;}
      #cgen-ov .cg-toggle input:checked + .cg-sw{background:#e8ff00;}
      #cgen-ov .cg-toggle input:checked + .cg-sw::after{left:16px;background:#000;}
      #cgen-ov #cgen-canvas{touch-action:none;cursor:grab;}
      #cgen-ov #cgen-canvas.dragging{cursor:grabbing;}
      #cgen-ov .cg-hint{font-size:10px;color:#6a6a78;text-align:center;margin:6px 0 12px;letter-spacing:.06em;text-transform:uppercase;}
    `;
    document.head.appendChild(s);
  }

  function inputText(key, def, value){
    return `
      <div class="cg-field">
        <label class="cg-l">${escapeHtml(def.label||key)}</label>
        <input class="cg-input" data-key="${escapeHtml(key)}" data-type="text" type="text" value="${escapeHtml(value)}">
      </div>`;
  }
  function inputTextarea(key, def, value){
    return `
      <div class="cg-field">
        <label class="cg-l">${escapeHtml(def.label||key)}</label>
        <textarea class="cg-input" data-key="${escapeHtml(key)}" data-type="text" rows="2">${escapeHtml(value)}</textarea>
      </div>`;
  }
  function inputColor(key, def, value){
    return `
      <div class="cg-field">
        <label class="cg-l">${escapeHtml(def.label||key)}</label>
        <div class="cg-row">
          <input class="cg-color" data-key="${escapeHtml(key)}" data-type="color" type="color" value="${escapeHtml(value)}">
          <span class="cg-hex">${escapeHtml(value)}</span>
        </div>
      </div>`;
  }
  function inputRange(key, def, value){
    const n = Number(value) || 0;
    const isAuto = def.autoLabel && n === 0;
    const display = isAuto ? def.autoLabel : `${n}${def.unit||''}`;
    return `
      <div class="cg-field">
        <label class="cg-l">${escapeHtml(def.label||key)}</label>
        <div class="cg-row">
          <input class="cg-range" data-key="${escapeHtml(key)}" data-type="range"
            type="range" min="${def.min}" max="${def.max}" step="${def.step||1}" value="${n}">
          <span class="cg-val ${isAuto?'auto':''}">${escapeHtml(display)}</span>
        </div>
      </div>`;
  }
  function inputToggle(key, def, value){
    const checked = value ? 'checked' : '';
    return `
      <div class="cg-field">
        <label class="cg-toggle">
          <span class="cg-l" style="margin:0">${escapeHtml(def.label||key)}</span>
          <span>
            <input data-key="${escapeHtml(key)}" data-type="toggle" type="checkbox" ${checked}>
            <span class="cg-sw"></span>
          </span>
        </label>
      </div>`;
  }
  function renderField(key, def, value){
    switch(def.type){
      case 'text':     return inputText(key, def, value);
      case 'textarea': return inputTextarea(key, def, value);
      case 'color':    return inputColor(key, def, value);
      case 'range':    return inputRange(key, def, value);
      case 'toggle':   return inputToggle(key, def, value);
      default:         return '';
    }
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
    _state     = buildState(_selected);
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

    const merged = mergedFields(_selected);
    const fieldsHtml = Object.entries(merged)
      .map(([k, def]) => renderField(k, def, _state[k]))
      .join('');

    const thumb = _photo
      ? `<img class="cg-thumb" src="${_photo.src}" alt="">`
      : `<div class="cg-thumb-empty">+</div>`;
    const uploadText = _photo ? (escapeHtml(_photoName||'Foto cargada')+' · Cambiar') : 'Subir foto de fondo';
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
          <div class="${uploadClass}" onclick="document.getElementById('cgen-file').click()">
            ${thumb}<span>${uploadText}</span>
          </div>
          <div id="cgen-fields" oninput="CGEN.updateField(event)" onchange="CGEN.updateField(event)">${fieldsHtml}</div>
          <div class="cg-hint">Arrastrá el texto sobre la imagen para moverlo</div>
          <button onclick="CGEN.download()" style="width:100%;padding:14px;background:#e8ff00;border:none;border-radius:12px;color:#000;font-family:inherit;font-weight:800;font-size:14px;letter-spacing:1.5px;cursor:pointer;text-transform:uppercase;margin-top:4px">Descargar PNG</button>
          <div style="display:flex;gap:8px;margin-top:8px">
            <button onclick="CGEN.centerText()" style="flex:1;padding:10px;background:transparent;border:1px solid #2a2a35;border-radius:10px;color:#9090a8;font-family:inherit;font-weight:600;font-size:12px;cursor:pointer">Centrar texto</button>
            <button onclick="CGEN.reset()" style="flex:1;padding:10px;background:transparent;border:1px solid #2a2a35;border-radius:10px;color:#9090a8;font-family:inherit;font-weight:600;font-size:12px;cursor:pointer">Reset</button>
          </div>
        </div>
      </div>
    </div>`;
    attachDragHandlers();
    scheduleRedraw();
  }

  let _drag = null;
  function attachDragHandlers(){
    const cv = document.getElementById('cgen-canvas');
    if(!cv) return;
    const onDown = (e) => {
      cv.setPointerCapture(e.pointerId);
      cv.classList.add('dragging');
      const r = cv.getBoundingClientRect();
      _drag = {
        startX: e.clientX, startY: e.clientY,
        originX: _state.textOffsetX || 0,
        originY: _state.textOffsetY || 0,
        scaleX: cv.width / r.width,
        scaleY: cv.height / r.height,
      };
      e.preventDefault();
    };
    const onMove = (e) => {
      if(!_drag) return;
      const dx = (e.clientX - _drag.startX) * _drag.scaleX;
      const dy = (e.clientY - _drag.startY) * _drag.scaleY;
      _state.textOffsetX = Math.round(_drag.originX + dx);
      _state.textOffsetY = Math.round(_drag.originY + dy);
      scheduleRedraw();
    };
    const onUp = () => { _drag = null; cv.classList.remove('dragging'); };
    cv.addEventListener('pointerdown', onDown);
    cv.addEventListener('pointermove', onMove);
    cv.addEventListener('pointerup', onUp);
    cv.addEventListener('pointercancel', onUp);
  }

  function centerText(){
    _state.textOffsetX = 0;
    _state.textOffsetY = 0;
    _state.posY = 0;
    renderUI();
  }

  function setFormat(f){
    if(!ALL_TEMPLATES[f]) return;
    _fmt       = f;
    _templates = ALL_TEMPLATES[_fmt];
    _selected  = _templates[0];
    _state     = buildState(_selected);
    renderUI();
  }

  function selectTemplate(id){
    const t = _templates.find(x => x.id === id);
    if(!t) return;
    _selected = t;
    _state    = buildState(_selected);
    renderUI();
  }

  function onPhoto(e){
    const file = e.target.files[0];
    if(!file) return;
    if(!file.type || !file.type.startsWith('image/')){
      e.target.value = '';
      alert('El archivo no es una imagen.'); // sustituir por toast custom si tenés uno global
      return;
    }
    _photoName = file.name || '';
    const reader = new FileReader();
    reader.onload = ev => {
      const img = new Image();
      img.onload = () => { _photo = img; renderUI(); };
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
  }

  // Parser único: el dataset.type decide cómo se interpreta el value.
  function updateField(e){
    const el = e.target;
    const key = el.getAttribute('data-key');
    const type = el.getAttribute('data-type');
    if(!key || !type) return;
    let v;
    if(type === 'toggle')      v = el.checked;
    else if(type === 'range')  v = Number(el.value);
    else                       v = el.value;
    _state[key] = v;

    // refrescar microvisuales (hex label / valor de range) sin re-render completo
    if(type === 'color'){
      const sib = el.parentElement && el.parentElement.querySelector('.cg-hex');
      if(sib) sib.textContent = v;
    } else if(type === 'range'){
      const sib = el.parentElement && el.parentElement.querySelector('.cg-val');
      if(sib){
        const merged = mergedFields(_selected);
        const def = merged[key];
        const isAuto = def && def.autoLabel && Number(v) === 0;
        sib.textContent = isAuto ? def.autoLabel : `${v}${def && def.unit || ''}`;
        sib.classList.toggle('auto', !!isAuto);
      }
    }
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
    _state = buildState(_selected);
    renderUI();
  }

  return { open, setFormat, selectTemplate, onPhoto, updateField, download, reset, centerText };
})();

const _genParam = new URLSearchParams(location.search).get('gen');
if(_genParam === '1'){
  document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => CGEN.open(), 300);
  });
}
window.CGEN = CGEN;
