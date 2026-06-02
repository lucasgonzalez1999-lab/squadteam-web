'use strict';
// SQUAD TEAM — Generador de stories 9:16 para anuncio en IG
// Abrir con ?promo=1
// Templates tipográficas (hero/question/etc) + mockups que recrean
// el UI real del app para anunciar features con copy de hype.

// Polyfill local: Canvas roundRect en navegadores viejos. utils.js ya
// tiene uno global, pero este archivo es autocontenido y puede cargarse
// antes que utils en algún escenario de testing.
if (typeof CanvasRenderingContext2D !== 'undefined'
    && !CanvasRenderingContext2D.prototype.roundRect) {
  CanvasRenderingContext2D.prototype.roundRect = function(x, y, w, h, r){
    const rr = typeof r === 'number' ? [r,r,r,r] : (Array.isArray(r) ? r : [r,r,r,r]);
    const [tl,tr,br,bl] = rr;
    this.beginPath();
    this.moveTo(x+tl, y);
    this.lineTo(x+w-tr, y);
    this.quadraticCurveTo(x+w, y, x+w, y+tr);
    this.lineTo(x+w, y+h-br);
    this.quadraticCurveTo(x+w, y+h, x+w-br, y+h);
    this.lineTo(x+bl, y+h);
    this.quadraticCurveTo(x, y+h, x, y+h-bl);
    this.lineTo(x, y+tl);
    this.quadraticCurveTo(x, y, x+tl, y);
    this.closePath();
    return this;
  };
}

const PROMO = (() => {
  const W = 1080, H = 1920;
  const HANDLE = '@sqteam.uy';
  const ACC = '#e8ff00';
  const BG = '#040404';
  const TEXT = '#ffffff';
  const SUB = '#9090a8';
  const SURF = '#0e0e12';
  const SURF2 = '#16181c';
  const BORDER = '#1f1f24';
  const GREEN  = '#00d084';

  // Safe areas de Instagram stories (avatar arriba, send message abajo)
  const SAFE_TOP    = 320;
  const SAFE_BOTTOM = 1640;

  // ── DRAWING HELPERS ────────────────────────────────────────────────────────
  function drawBackground(ctx){
    ctx.fillStyle = BG;
    ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = 'rgba(255,255,255,.018)';
    ctx.lineWidth = 1;
    for(let x=0; x<W; x+=96){ ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,H); ctx.stroke(); }
    for(let y=0; y<H; y+=96){ ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(W,y); ctx.stroke(); }
    const g = ctx.createRadialGradient(W/2, H+200, 0, W/2, H+200, 900);
    g.addColorStop(0, withAlpha(ACC, 0.10));
    g.addColorStop(.5, withAlpha(ACC, 0.02));
    g.addColorStop(1, withAlpha(ACC, 0));
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  }

  function drawEyebrow(ctx, text, y){
    ctx.fillStyle = SUB;
    ctx.font = '700 28px "Inter", sans-serif';
    ctx.textAlign = 'center';
    const letters = (text||'').toUpperCase().split('');
    const tracking = 12;
    let totalW = 0;
    for(const l of letters) totalW += ctx.measureText(l).width + tracking;
    totalW -= tracking;
    let x = W/2 - totalW/2;
    for(const l of letters){
      ctx.fillText(l, x + ctx.measureText(l).width/2, y);
      x += ctx.measureText(l).width + tracking;
    }
    ctx.fillStyle = ACC;
    ctx.beginPath();
    ctx.arc(W/2 - totalW/2 - 28, y - 10, 7, 0, Math.PI*2);
    ctx.fill();
  }

  function drawFooter(ctx, text){
    ctx.font = '700 32px "Inter", sans-serif';
    ctx.fillStyle = ACC;
    ctx.textAlign = 'center';
    ctx.fillText(text, W/2, SAFE_BOTTOM + 60);
    ctx.strokeStyle = withAlpha(ACC, 0.3);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(W/2 - 60, SAFE_BOTTOM);
    ctx.lineTo(W/2 + 60, SAFE_BOTTOM);
    ctx.stroke();
  }

  function wrapText(ctx, text, maxWidth){
    const words = (text||'').split(' ');
    const lines = [];
    let line = '';
    for(const w of words){
      const test = line ? line + ' ' + w : w;
      if(ctx.measureText(test).width <= maxWidth) line = test;
      else { if(line) lines.push(line); line = w; }
    }
    if(line) lines.push(line);
    return lines;
  }

  function drawHeadline(ctx, text, yStart, color){
    ctx.fillStyle = color || TEXT;
    ctx.textAlign = 'center';
    ctx.font = '900 italic 76px "Barlow Condensed", sans-serif';
    const lines = wrapText(ctx, text, W - 160);
    let y = yStart;
    for(const line of lines){ ctx.fillText(line, W/2, y); y += 84; }
    return y;
  }

  function roundedRect(ctx, x, y, w, h, r){
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, r);
  }

  function escapeHtml(s){
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  // Color con alpha derivado del ACC actual. Centralizar para que
  // unificar el accent (#e8ff00 → #d9ff00) requiera cambiar 1 línea.
  function withAlpha(hex, a){
    const r = parseInt(hex.slice(1,3),16);
    const g = parseInt(hex.slice(3,5),16);
    const b = parseInt(hex.slice(5,7),16);
    return `rgba(${r},${g},${b},${a})`;
  }

  // $4.000 (es-UY agramatical sin separador de miles)
  function fmtMoney(n, currency){
    const sep = Number(n).toLocaleString('es-UY');
    return '$' + sep + (currency ? ' ' + currency : '');
  }

  let _redrawHandle = null;
  function scheduleRedraw(){
    if(_redrawHandle) return;
    _redrawHandle = requestAnimationFrame(() => {
      _redrawHandle = null;
      redraw();
    });
  }

  function drawCheck(ctx, cx, cy, size, color){
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = size * 0.16;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(cx - size*0.34, cy + size*0.04);
    ctx.lineTo(cx - size*0.06, cy + size*0.30);
    ctx.lineTo(cx + size*0.38, cy - size*0.26);
    ctx.stroke();
    ctx.restore();
  }

  // Siluetas de pose canvas-native (size = altura aproximada)
  function drawPoseFront(ctx, cx, cy, size, color){
    ctx.save();
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = size * 0.04;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    const s = size / 200;
    // cabeza
    ctx.beginPath();
    ctx.arc(cx, cy - 70*s, 22*s, 0, Math.PI*2);
    ctx.stroke();
    // cuello + tronco
    ctx.beginPath();
    ctx.moveTo(cx, cy - 48*s); ctx.lineTo(cx, cy - 36*s);
    ctx.moveTo(cx - 50*s, cy - 36*s); ctx.lineTo(cx + 50*s, cy - 36*s);
    ctx.lineTo(cx + 38*s, cy + 50*s); ctx.lineTo(cx - 38*s, cy + 50*s);
    ctx.closePath(); ctx.stroke();
    // brazos
    ctx.beginPath();
    ctx.moveTo(cx - 50*s, cy - 30*s); ctx.lineTo(cx - 64*s, cy + 50*s);
    ctx.moveTo(cx + 50*s, cy - 30*s); ctx.lineTo(cx + 64*s, cy + 50*s);
    ctx.stroke();
    // piernas
    ctx.beginPath();
    ctx.moveTo(cx - 22*s, cy + 50*s); ctx.lineTo(cx - 22*s, cy + 130*s);
    ctx.moveTo(cx + 22*s, cy + 50*s); ctx.lineTo(cx + 22*s, cy + 130*s);
    ctx.stroke();
    ctx.restore();
  }

  function drawPoseProfile(ctx, cx, cy, size, color, mirror){
    ctx.save();
    if(mirror){ ctx.translate(2*cx, 0); ctx.scale(-1, 1); }
    ctx.strokeStyle = color;
    ctx.lineWidth = size * 0.04;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    const s = size / 200;
    // cabeza
    ctx.beginPath();
    ctx.arc(cx, cy - 70*s, 22*s, 0, Math.PI*2);
    ctx.stroke();
    // tronco perfil (más angosto)
    ctx.beginPath();
    ctx.moveTo(cx, cy - 48*s); ctx.lineTo(cx, cy - 36*s);
    ctx.moveTo(cx - 22*s, cy - 36*s); ctx.lineTo(cx + 22*s, cy - 36*s);
    ctx.lineTo(cx + 24*s, cy + 50*s); ctx.lineTo(cx - 18*s, cy + 50*s);
    ctx.closePath(); ctx.stroke();
    // brazo anterior visible (curva al frente)
    ctx.beginPath();
    ctx.moveTo(cx + 18*s, cy - 30*s);
    ctx.quadraticCurveTo(cx + 38*s, cy, cx + 30*s, cy + 40*s);
    ctx.stroke();
    // piernas perfil
    ctx.beginPath();
    ctx.moveTo(cx - 8*s, cy + 50*s); ctx.lineTo(cx - 10*s, cy + 130*s);
    ctx.moveTo(cx + 14*s, cy + 50*s); ctx.lineTo(cx + 12*s, cy + 130*s);
    ctx.stroke();
    ctx.restore();
  }

  // Carga la silueta real del Mapa Muscular del app desde FRONT_PATHS
  // (declarado en muscleMap.js, accesible globalmente en classic scripts).
  // Rasteriza una vez como Image y la cachea.
  let _bodyFrontImg = null;
  let _bodyFrontLoading = false;
  function ensureBodyFrontImg(){
    if(_bodyFrontImg || _bodyFrontLoading) return _bodyFrontImg;
    if(typeof FRONT_PATHS === 'undefined') return null;
    _bodyFrontLoading = true;
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="40 150 620 1210"><g fill="#2a2a32" stroke="#1a1a22" stroke-width="1.5">${FRONT_PATHS}</g></svg>`;
    const blob = new Blob([svg], { type:'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      _bodyFrontImg = img;
      _bodyFrontLoading = false;
      URL.revokeObjectURL(url);
      scheduleRedraw();
    };
    img.onerror = () => { _bodyFrontLoading = false; URL.revokeObjectURL(url); };
    img.src = url;
    return null;
  }

  // Wordmark "SQUAD TEAM" dibujado en canvas — nítido a cualquier escala.
  // size = altura aproximada del bloque. color = blanco por defecto.
  function drawWordmark(ctx, cx, cy, size, color){
    const c = color || '#ffffff';
    ctx.save();
    ctx.fillStyle = c;
    ctx.strokeStyle = c;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';

    // SQUAD grande, italic
    const sqSize = size * 0.55;
    ctx.font = `900 italic ${sqSize}px "Barlow Condensed", sans-serif`;
    ctx.fillText('SQUAD', cx, cy);

    // Línea horizontal fina
    const lineY = cy + size*0.08;
    const lineW = size * 0.85;
    ctx.lineWidth = Math.max(2, size*0.012);
    ctx.beginPath();
    ctx.moveTo(cx - lineW/2, lineY);
    ctx.lineTo(cx + lineW/2, lineY);
    ctx.stroke();

    // TEAM más chico debajo, con tracking ancho
    const teamSize = size * 0.22;
    ctx.font = `800 ${teamSize}px "Inter", sans-serif`;
    const letters = 'TEAM'.split('');
    const tracking = teamSize * 0.55;
    let totalW = 0;
    for(const l of letters) totalW += ctx.measureText(l).width;
    totalW += tracking * (letters.length - 1);
    let x = cx - totalW/2;
    for(const l of letters){
      const w = ctx.measureText(l).width;
      ctx.fillText(l, x + w/2, cy + size*0.32);
      x += w + tracking;
    }
    ctx.restore();
  }

  // Dibuja la silueta del app + tint global con destaque por grupo via overlay
  // de zonas semi-transparentes en lima. Más simple que portar 30 paths.
  function drawAppBodyFront(ctx, ox, oy, w, h, highlightedZones){
    const img = ensureBodyFrontImg();
    if(!img){
      // Mientras carga, placeholder oscuro
      ctx.fillStyle = '#1a1a22';
      ctx.fillRect(ox, oy, w, h);
      return;
    }
    ctx.drawImage(img, ox, oy, w, h);

    // Zonas para tintar — coordenadas en viewBox 40-660 x 150-1360 = 620w × 1210h
    // Las escalamos a w×h
    const zones = {
      pecho:     { x:0.30, y:0.16, w:0.40, h:0.10 },  // pecho frontal
      hombros_l: { x:0.13, y:0.13, w:0.18, h:0.08 },
      hombros_r: { x:0.69, y:0.13, w:0.18, h:0.08 },
      cuadriceps:{ x:0.27, y:0.55, w:0.46, h:0.16 },
      abs:       { x:0.40, y:0.27, w:0.20, h:0.13 },
      biceps_l:  { x:0.07, y:0.25, w:0.13, h:0.13 },
      biceps_r:  { x:0.80, y:0.25, w:0.13, h:0.13 },
    };

    const list = (highlightedZones && highlightedZones.zones) || [];
    const tier = (highlightedZones && highlightedZones.tier) || {};
    for(const zoneKey of list){
      const z = zones[zoneKey];
      if(!z) continue;
      ctx.fillStyle = tier[zoneKey] || withAlpha(ACC, 0.55);
      ctx.fillRect(ox + z.x*w, oy + z.y*h, z.w*w, z.h*h);
    }
  }

  // Silueta brutalist con overlays por grupo muscular (front body) — fallback
  function drawBodyFront(ctx, ox, oy, scale, tierColors){
    const tc = tierColors || {};
    const muted = '#1a1a22';
    ctx.save();
    ctx.translate(ox, oy);
    ctx.scale(scale, scale);
    ctx.fillStyle = muted;
    // cabeza
    ctx.beginPath(); ctx.ellipse(100, 38, 22, 28, 0, 0, Math.PI*2); ctx.fill();
    // cuello
    ctx.beginPath();
    ctx.moveTo(88,62); ctx.lineTo(112,62);
    ctx.lineTo(114,86); ctx.lineTo(86,86);
    ctx.closePath(); ctx.fill();
    // tronco
    ctx.beginPath();
    ctx.moveTo(58,86); ctx.lineTo(142,86);
    ctx.lineTo(156,124); ctx.lineTo(150,200);
    ctx.lineTo(138,258); ctx.lineTo(132,296);
    ctx.lineTo(68,296); ctx.lineTo(62,258);
    ctx.lineTo(50,200); ctx.lineTo(44,124);
    ctx.closePath(); ctx.fill();
    // brazos
    ctx.beginPath();
    ctx.moveTo(44,92); ctx.lineTo(62,86);
    ctx.lineTo(58,130); ctx.lineTo(62,200);
    ctx.lineTo(56,252); ctx.lineTo(48,296);
    ctx.lineTo(30,296); ctx.lineTo(26,252);
    ctx.lineTo(30,200); ctx.lineTo(32,130);
    ctx.closePath(); ctx.fill();
    ctx.beginPath();
    ctx.moveTo(156,92); ctx.lineTo(138,86);
    ctx.lineTo(142,130); ctx.lineTo(138,200);
    ctx.lineTo(144,252); ctx.lineTo(152,296);
    ctx.lineTo(170,296); ctx.lineTo(174,252);
    ctx.lineTo(170,200); ctx.lineTo(168,130);
    ctx.closePath(); ctx.fill();
    // piernas
    ctx.beginPath();
    ctx.moveTo(68,296); ctx.lineTo(99,296);
    ctx.lineTo(98,400); ctx.lineTo(95,480);
    ctx.lineTo(66,480); ctx.lineTo(64,400);
    ctx.closePath(); ctx.fill();
    ctx.beginPath();
    ctx.moveTo(132,296); ctx.lineTo(101,296);
    ctx.lineTo(102,400); ctx.lineTo(105,480);
    ctx.lineTo(134,480); ctx.lineTo(136,400);
    ctx.closePath(); ctx.fill();

    // Overlays por grupo muscular
    const overlay = (color, points) => {
      ctx.fillStyle = color || muted;
      ctx.beginPath();
      ctx.moveTo(points[0][0], points[0][1]);
      for(let i=1; i<points.length; i++) ctx.lineTo(points[i][0], points[i][1]);
      ctx.closePath(); ctx.fill();
    };
    overlay(tc.chestLeft,     [[72,102],[98,102],[98,150],[60,148],[58,130]]);
    overlay(tc.chestRight,    [[128,102],[102,102],[102,150],[140,148],[142,130]]);
    overlay(tc.shoulderLeft,  [[52,90],[74,88],[70,122],[46,122],[44,100]]);
    overlay(tc.shoulderRight, [[148,90],[126,88],[130,122],[154,122],[156,100]]);
    overlay(tc.bicepsLeft,    [[30,128],[60,132],[56,198],[34,196]]);
    overlay(tc.bicepsRight,   [[170,128],[140,132],[144,198],[166,196]]);
    overlay(tc.abs,           [[82,155],[118,155],[122,258],[78,258]]);
    overlay(tc.quadsLeft,     [[70,304],[98,304],[97,402],[66,402]]);
    overlay(tc.quadsRight,    [[130,304],[102,304],[103,402],[134,402]]);
    ctx.restore();
  }

  function drawPoseBack(ctx, cx, cy, size, color){
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = size * 0.04;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    const s = size / 200;
    // cabeza
    ctx.beginPath();
    ctx.arc(cx, cy - 70*s, 22*s, 0, Math.PI*2);
    ctx.stroke();
    // tronco
    ctx.beginPath();
    ctx.moveTo(cx, cy - 48*s); ctx.lineTo(cx, cy - 36*s);
    ctx.moveTo(cx - 50*s, cy - 36*s); ctx.lineTo(cx + 50*s, cy - 36*s);
    ctx.lineTo(cx + 38*s, cy + 50*s); ctx.lineTo(cx - 38*s, cy + 50*s);
    ctx.closePath(); ctx.stroke();
    // línea central (espina)
    ctx.beginPath();
    ctx.moveTo(cx, cy - 36*s); ctx.lineTo(cx, cy + 50*s);
    ctx.stroke();
    // trapecio sutil (V invertida arriba)
    ctx.beginPath();
    ctx.moveTo(cx - 30*s, cy - 30*s);
    ctx.lineTo(cx, cy - 10*s);
    ctx.lineTo(cx + 30*s, cy - 30*s);
    ctx.stroke();
    // brazos
    ctx.beginPath();
    ctx.moveTo(cx - 50*s, cy - 30*s); ctx.lineTo(cx - 64*s, cy + 50*s);
    ctx.moveTo(cx + 50*s, cy - 30*s); ctx.lineTo(cx + 64*s, cy + 50*s);
    ctx.stroke();
    // piernas
    ctx.beginPath();
    ctx.moveTo(cx - 22*s, cy + 50*s); ctx.lineTo(cx - 22*s, cy + 130*s);
    ctx.moveTo(cx + 22*s, cy + 50*s); ctx.lineTo(cx + 22*s, cy + 130*s);
    ctx.stroke();
    ctx.restore();
  }

  // ── TEMPLATES TIPOGRÁFICAS ────────────────────────────────────────────────
  function renderIntro(ctx, d){
    drawBackground(ctx);
    drawEyebrow(ctx, d.eyebrow, SAFE_TOP);

    // Palabra gigante centrada
    ctx.fillStyle = TEXT;
    ctx.textAlign = 'center';
    ctx.font = '900 italic 380px "Barlow Condensed", sans-serif';
    const word = (d.word || '').toUpperCase();
    ctx.fillText(word, W/2, (SAFE_TOP + SAFE_BOTTOM)/2 + 60);

    // Línea lima fina horizontal bajo la palabra
    ctx.strokeStyle = ACC;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(W/2 - 100, (SAFE_TOP + SAFE_BOTTOM)/2 + 130);
    ctx.lineTo(W/2 + 100, (SAFE_TOP + SAFE_BOTTOM)/2 + 130);
    ctx.stroke();

    // Subtítulo dramático
    if(d.sub){
      ctx.fillStyle = SUB;
      ctx.font = '500 38px "Inter", sans-serif';
      const lines = wrapText(ctx, d.sub, W - 240);
      let y = (SAFE_TOP + SAFE_BOTTOM)/2 + 220;
      for(const line of lines){ ctx.fillText(line, W/2, y); y += 50; }
    }
    drawFooter(ctx, d.cta);
  }

  function renderHero(ctx, d){
    drawBackground(ctx);
    drawEyebrow(ctx, d.eyebrow, SAFE_TOP);
    ctx.font = '900 italic 240px "Barlow Condensed", sans-serif';
    ctx.fillStyle = TEXT;
    ctx.textAlign = 'center';
    ctx.fillText(d.line1, W/2, SAFE_TOP + 460);
    ctx.fillStyle = ACC;
    ctx.font = '900 italic 320px "Barlow Condensed", sans-serif';
    ctx.fillText(d.line2, W/2, SAFE_TOP + 720);
    drawFooter(ctx, d.footer);
  }

  function renderQuestion(ctx, d){
    drawBackground(ctx);
    drawEyebrow(ctx, d.eyebrow, SAFE_TOP);
    ctx.fillStyle = TEXT;
    ctx.textAlign = 'center';
    ctx.font = '900 italic 96px "Barlow Condensed", sans-serif';
    const lines = wrapText(ctx, d.headline, W - 200);
    let y = (SAFE_TOP + SAFE_BOTTOM)/2 - (lines.length * 110) / 2 + 60;
    for(const line of lines){ ctx.fillText(line, W/2, y); y += 110; }
    drawFooter(ctx, d.cta);
  }

  function renderFeatures(ctx, d){
    drawBackground(ctx);
    drawEyebrow(ctx, d.eyebrow, SAFE_TOP);
    const bullets = (d.bullets || '').split('\n').filter(Boolean);
    // Pre-medir el ancho del bullet más ancho para centrar el bloque
    ctx.font = '800 italic 78px "Barlow Condensed", sans-serif';
    let maxTextW = 0;
    for(const b of bullets){
      const w = ctx.measureText(b.toUpperCase()).width;
      if(w > maxTextW) maxTextW = w;
    }
    const numW = 110, numGap = 80;
    const blockW = numW + numGap + maxTextW;
    const blockX = W/2 - blockW/2;
    let y = (SAFE_TOP + SAFE_BOTTOM)/2 - (bullets.length * 140) / 2 + 60;
    for(let i=0;i<bullets.length;i++){
      ctx.font = '900 italic 84px "Barlow Condensed", sans-serif';
      ctx.fillStyle = ACC;
      ctx.textAlign = 'left';
      ctx.fillText(`0${i+1}`, blockX, y);
      ctx.font = '800 italic 78px "Barlow Condensed", sans-serif';
      ctx.fillStyle = TEXT;
      ctx.fillText(bullets[i].toUpperCase(), blockX + numW + numGap, y);
      y += 140;
    }
    drawFooter(ctx, d.cta);
  }

  function renderManifesto(ctx, d){
    drawBackground(ctx);
    drawEyebrow(ctx, d.eyebrow, SAFE_TOP);
    ctx.fillStyle = TEXT;
    ctx.textAlign = 'center';
    ctx.font = '900 italic 96px "Barlow Condensed", sans-serif';
    const lines = wrapText(ctx, d.headline, W - 200);
    let y = (SAFE_TOP + SAFE_BOTTOM)/2 - 80;
    for(const line of lines){ ctx.fillText(line, W/2, y); y += 110; }
    if(d.sub){
      ctx.fillStyle = SUB;
      ctx.font = '500 36px "Inter", sans-serif';
      const subLines = wrapText(ctx, d.sub, W - 240);
      y += 30;
      for(const sl of subLines){ ctx.fillText(sl, W/2, y); y += 50; }
    }
    drawFooter(ctx, d.cta);
  }

  function renderCta(ctx, d){
    drawBackground(ctx);
    drawEyebrow(ctx, d.eyebrow, SAFE_TOP);
    ctx.fillStyle = TEXT;
    ctx.textAlign = 'center';
    ctx.font = '900 italic 120px "Barlow Condensed", sans-serif';
    const lines = wrapText(ctx, d.headline, W - 200);
    let y = (SAFE_TOP + SAFE_BOTTOM)/2 - 80;
    for(const line of lines){ ctx.fillText(line, W/2, y); y += 130; }
    if(d.sub){
      ctx.fillStyle = SUB;
      ctx.font = '500 38px "Inter", sans-serif';
      ctx.fillText(d.sub, W/2, y + 30);
    }
    const btnW = 480, btnH = 110, btnY = H - 320;
    ctx.fillStyle = ACC;
    if(ctx.roundRect){
      ctx.beginPath();
      ctx.roundRect(W/2 - btnW/2, btnY, btnW, btnH, 18);
      ctx.fill();
    } else {
      ctx.fillRect(W/2 - btnW/2, btnY, btnW, btnH);
    }
    ctx.fillStyle = '#000';
    ctx.font = '800 36px "Inter", sans-serif';
    ctx.fillText(d.cta.toUpperCase(), W/2, btnY + 70);
  }

  // ── MOCKUP 1: RUTINA DEL DÍA ──────────────────────────────────────────────
  function renderMockRutina(ctx, d){
    drawBackground(ctx);
    drawEyebrow(ctx, d.eyebrow, SAFE_TOP);
    drawHeadline(ctx, d.headline, SAFE_TOP + 140);

    // Card mockup centrado
    const cx = 90, cy = SAFE_TOP + 320, cw = W - 180, ch = 920;
    ctx.fillStyle = SURF;
    roundedRect(ctx, cx, cy, cw, ch, 28); ctx.fill();
    ctx.strokeStyle = BORDER; ctx.lineWidth = 2;
    roundedRect(ctx, cx, cy, cw, ch, 28); ctx.stroke();

    // Header del card: nombre del ejercicio + RIR
    ctx.fillStyle = TEXT;
    ctx.textAlign = 'left';
    ctx.font = '900 italic 52px "Barlow Condensed", sans-serif';
    ctx.fillText('PRESS BANCA', cx + 40, cy + 90);
    // RIR pill
    const pillX = cx + cw - 200, pillY = cy + 50, pillW = 160, pillH = 50;
    ctx.fillStyle = withAlpha(ACC, 0.15);
    roundedRect(ctx, pillX, pillY, pillW, pillH, 25); ctx.fill();
    ctx.fillStyle = ACC;
    ctx.textAlign = 'center';
    ctx.font = '700 22px "Inter", sans-serif';
    ctx.fillText('RIR 1-2', pillX + pillW/2, pillY + 33);

    // Línea separadora
    ctx.strokeStyle = BORDER;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(cx + 40, cy + 140);
    ctx.lineTo(cx + cw - 40, cy + 140);
    ctx.stroke();

    // 4 sets — número | peso | reps | check/PR
    const sets = [
      { kg:80, reps:10, status:'done' },
      { kg:80, reps:10, status:'done' },
      { kg:85, reps:9,  status:'pr' },
      { kg:85, reps:8,  status:'done' },
    ];
    let sy = cy + 200;
    for(let i=0; i<sets.length; i++){
      const s = sets[i];
      // Número
      ctx.fillStyle = SUB;
      ctx.textAlign = 'left';
      ctx.font = '700 24px "Inter", sans-serif';
      ctx.fillText('SET ' + (i+1), cx + 40, sy);
      // Peso
      ctx.fillStyle = TEXT;
      ctx.font = '900 italic 64px "Barlow Condensed", sans-serif';
      ctx.fillText(s.kg + 'kg', cx + 200, sy + 18);
      // ×
      ctx.fillStyle = SUB;
      ctx.font = '500 36px "Inter", sans-serif';
      ctx.fillText('×', cx + 450, sy + 10);
      // Reps
      ctx.fillStyle = TEXT;
      ctx.font = '900 italic 64px "Barlow Condensed", sans-serif';
      ctx.fillText(s.reps + '', cx + 510, sy + 18);
      // Status
      if(s.status === 'pr'){
        // PR badge lima
        const bx = cx + cw - 200, by = sy - 20, bw = 160, bh = 50;
        ctx.fillStyle = ACC;
        roundedRect(ctx, bx, by, bw, bh, 25); ctx.fill();
        ctx.fillStyle = '#000';
        ctx.textAlign = 'center';
        ctx.font = '800 26px "Inter", sans-serif';
        ctx.fillText('PR', bx + bw/2, by + 35);
      } else {
        // Check verde dibujado en canvas (consistente cross-platform)
        drawCheck(ctx, cx + cw - 120, sy + 18, 32, GREEN);
      }
      sy += 170;
    }

    drawFooter(ctx, d.cta);
  }

  // ── MOCKUP 2: MI PLAN (pagos) ─────────────────────────────────────────────
  function renderMockPagos(ctx, d){
    drawBackground(ctx);
    drawEyebrow(ctx, d.eyebrow, SAFE_TOP);
    drawHeadline(ctx, d.headline, SAFE_TOP + 140);

    const cx = 90, cy = SAFE_TOP + 320, cw = W - 180, ch = 920;
    ctx.fillStyle = SURF;
    roundedRect(ctx, cx, cy, cw, ch, 28); ctx.fill();
    ctx.strokeStyle = BORDER; ctx.lineWidth = 2;
    roundedRect(ctx, cx, cy, cw, ch, 28); ctx.stroke();

    // Title MI PLAN
    ctx.fillStyle = TEXT;
    ctx.textAlign = 'left';
    ctx.font = '900 italic 56px "Barlow Condensed", sans-serif';
    ctx.fillText('MI PLAN', cx + 40, cy + 90);
    // subtitle
    ctx.fillStyle = GREEN;
    ctx.font = '700 26px "Inter", sans-serif';
    ctx.fillText('Al día · próximo cobro 15 jun', cx + 40, cy + 140);

    // 3 columnas: MONTO / MÉTODO / PERÍODO
    const labels = ['MONTO','MÉTODO','PERÍODO'];
    const vals = [fmtMoney(4000),'Transfer','Mensual'];
    const subVals = ['UYU','',''];
    const colW = (cw - 80) / 3;
    let cy2 = cy + 230;
    for(let i=0; i<3; i++){
      const x = cx + 40 + i*colW;
      ctx.fillStyle = SUB;
      ctx.font = '700 20px "Inter", sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(labels[i], x, cy2);
      ctx.fillStyle = TEXT;
      ctx.font = '900 italic 64px "Barlow Condensed", sans-serif';
      ctx.fillText(vals[i], x, cy2 + 80);
      if(subVals[i]){
        ctx.fillStyle = SUB;
        ctx.font = '500 22px "Inter", sans-serif';
        ctx.fillText(subVals[i], x, cy2 + 115);
      }
    }

    // Separator + ÚLTIMOS PAGOS
    const sy = cy + 430;
    ctx.strokeStyle = BORDER; ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(cx + 40, sy);
    ctx.lineTo(cx + cw - 40, sy);
    ctx.stroke();

    ctx.fillStyle = SUB;
    ctx.font = '700 22px "Inter", sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('ÚLTIMOS PAGOS', cx + 40, sy + 60);

    const pays = [
      { date:'15 may', amt:fmtMoney(4000,'UYU') },
      { date:'15 abr', amt:fmtMoney(4000,'UYU') },
      { date:'15 mar', amt:fmtMoney(4000,'UYU') },
    ];
    let py = sy + 130;
    for(const p of pays){
      ctx.fillStyle = TEXT;
      ctx.font = '500 30px "Inter", sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(p.date, cx + 40, py);
      ctx.font = '700 30px "Inter", sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(p.amt, cx + cw - 100, py);
      // check dibujado en canvas
      drawCheck(ctx, cx + cw - 60, py - 8, 22, GREEN);
      py += 80;
    }

    drawFooter(ctx, d.cta);
  }

  // ── MOCKUP 3: FÍSICO (grid 2×2) ───────────────────────────────────────────
  function renderMockFisico(ctx, d){
    drawBackground(ctx);
    drawEyebrow(ctx, d.eyebrow, SAFE_TOP);
    drawHeadline(ctx, d.headline, SAFE_TOP + 140);

    const cx = 90, cy = SAFE_TOP + 320, cw = W - 180, ch = 920;
    ctx.fillStyle = SURF;
    roundedRect(ctx, cx, cy, cw, ch, 28); ctx.fill();
    ctx.strokeStyle = BORDER; ctx.lineWidth = 2;
    roundedRect(ctx, cx, cy, cw, ch, 28); ctx.stroke();

    // Header
    ctx.fillStyle = TEXT;
    ctx.textAlign = 'left';
    ctx.font = '900 italic 50px "Barlow Condensed", sans-serif';
    ctx.fillText('PROGRESO FÍSICO', cx + 40, cy + 80);
    ctx.fillStyle = SUB;
    ctx.font = '500 24px "Inter", sans-serif';
    ctx.fillText('Domingo · 4/4 fotos', cx + 40, cy + 120);

    // Grid 2×2 con siluetas placeholder
    const gridX = cx + 50, gridY = cy + 180, gap = 24;
    const slotW = (cw - 100 - gap) / 2;
    const slotH = (ch - 280) / 2 - gap/2;
    const poseDrawers = [
      { label:'Frente',     fn:(c,x,y,s)=>drawPoseFront(c,x,y,s,'#3a3a44') },
      { label:'Perfil izq.',fn:(c,x,y,s)=>drawPoseProfile(c,x,y,s,'#3a3a44',false) },
      { label:'Perfil der.',fn:(c,x,y,s)=>drawPoseProfile(c,x,y,s,'#3a3a44',true) },
      { label:'Espalda',    fn:(c,x,y,s)=>drawPoseBack(c,x,y,s,'#3a3a44') },
    ];
    for(let i=0; i<4; i++){
      const col = i % 2, row = Math.floor(i / 2);
      const sx = gridX + col * (slotW + gap);
      const sy = gridY + row * (slotH + gap);
      // Filled slot with gradient
      const grad = ctx.createLinearGradient(sx, sy, sx, sy+slotH);
      grad.addColorStop(0, '#1a1a22');
      grad.addColorStop(1, '#0a0a0d');
      ctx.fillStyle = grad;
      roundedRect(ctx, sx, sy, slotW, slotH, 16); ctx.fill();
      // Border
      ctx.strokeStyle = '#26262e'; ctx.lineWidth = 2;
      roundedRect(ctx, sx, sy, slotW, slotH, 16); ctx.stroke();
      // Pose silhouette canvas-native
      poseDrawers[i].fn(ctx, sx + slotW/2, sy + slotH/2 - 10, 200);
      // Label bottom
      ctx.fillStyle = TEXT;
      ctx.font = '700 26px "Inter", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(poseDrawers[i].label, sx + slotW/2, sy + slotH - 24);
    }

    drawFooter(ctx, d.cta);
  }

  // ── MOCKUP 4: CHECK-IN SEMANAL ────────────────────────────────────────────
  function renderMockCheckin(ctx, d){
    drawBackground(ctx);
    drawEyebrow(ctx, d.eyebrow, SAFE_TOP);
    drawHeadline(ctx, d.headline, SAFE_TOP + 140);

    const cx = 90, cy = SAFE_TOP + 320, cw = W - 180, ch = 920;
    ctx.fillStyle = SURF;
    roundedRect(ctx, cx, cy, cw, ch, 28); ctx.fill();
    ctx.strokeStyle = BORDER; ctx.lineWidth = 2;
    roundedRect(ctx, cx, cy, cw, ch, 28); ctx.stroke();

    // Eyebrow
    ctx.fillStyle = ACC;
    ctx.textAlign = 'left';
    ctx.font = '800 24px "Inter", sans-serif';
    ctx.fillText('CHECK-IN SEMANAL', cx + 40, cy + 70);
    // Semana
    ctx.fillStyle = TEXT;
    ctx.font = '900 italic 60px "Barlow Condensed", sans-serif';
    ctx.fillText('SEMANA 22', cx + 40, cy + 140);
    ctx.fillStyle = SUB;
    ctx.font = '500 24px "Inter", sans-serif';
    ctx.fillText('27 may — 2 jun', cx + 40, cy + 180);

    // Scores en grid
    const cats = [
      { label:'Entrenos', val:5 },
      { label:'Dieta', val:4 },
      { label:'Pasos', val:4 },
      { label:'Sueño', val:3 },
      { label:'Adherencia', val:5 },
    ];
    let sy = cy + 250;
    const colW = (cw - 80) / 5;
    for(let i=0; i<cats.length; i++){
      const c = cats[i];
      const x = cx + 40 + i*colW + colW/2;
      // Número grande
      if(c.val >= 4)      ctx.fillStyle = ACC;
      else if(c.val >= 3) ctx.fillStyle = '#ff9500';
      else                 ctx.fillStyle = '#ff3f3f';
      ctx.textAlign = 'center';
      ctx.font = '900 italic 76px "Barlow Condensed", sans-serif';
      ctx.fillText(c.val + '', x, sy + 70);
      // Dots
      const dotR = 8, dotGap = 14;
      const totalDots = 5;
      const startX = x - ((totalDots-1) * dotGap) / 2;
      for(let j=0; j<totalDots; j++){
        ctx.beginPath();
        ctx.arc(startX + j*dotGap, sy + 110, dotR/2, 0, Math.PI*2);
        ctx.fillStyle = j < c.val ? ACC : '#2a2a30';
        ctx.fill();
      }
      // Label
      ctx.fillStyle = SUB;
      ctx.font = '700 20px "Inter", sans-serif';
      ctx.fillText(c.label.toUpperCase(), x, sy + 160);
    }

    // Objetivos
    const oy = cy + 470;
    ctx.fillStyle = SUB;
    ctx.font = '700 22px "Inter", sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('OBJETIVOS', cx + 40, oy);
    const objs = [
      { text:'Llegar a 3 entrenos esta semana', done:true },
      { text:'No saltarse el almuerzo', done:true },
      { text:'8.000 pasos diarios mínimo', done:false },
    ];
    let oy2 = oy + 50;
    for(const o of objs){
      // checkbox
      ctx.fillStyle = o.done ? ACC : 'transparent';
      ctx.strokeStyle = o.done ? ACC : SUB;
      ctx.lineWidth = 2;
      roundedRect(ctx, cx + 40, oy2 - 24, 34, 34, 8);
      ctx.fill(); ctx.stroke();
      if(o.done){
        drawCheck(ctx, cx + 57, oy2 - 7, 20, '#000');
      }
      // texto
      ctx.fillStyle = TEXT;
      ctx.font = '500 26px "Inter", sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(o.text, cx + 96, oy2 + 4);
      oy2 += 60;
    }

    drawFooter(ctx, d.cta);
  }

  // ── MOCKUP 5: MUSCLE MAP ──────────────────────────────────────────────────
  function renderMockMuscle(ctx, d){
    drawBackground(ctx);
    drawEyebrow(ctx, d.eyebrow, SAFE_TOP);
    drawHeadline(ctx, d.headline, SAFE_TOP + 140);

    const cx = 90, cy = SAFE_TOP + 320, cw = W - 180, ch = 920;
    ctx.fillStyle = SURF;
    roundedRect(ctx, cx, cy, cw, ch, 28); ctx.fill();
    ctx.strokeStyle = BORDER; ctx.lineWidth = 2;
    roundedRect(ctx, cx, cy, cw, ch, 28); ctx.stroke();

    // Title
    ctx.fillStyle = TEXT;
    ctx.textAlign = 'left';
    ctx.font = '900 italic 50px "Barlow Condensed", sans-serif';
    ctx.fillText('VOLUMEN POR MÚSCULO', cx + 40, cy + 80);
    ctx.fillStyle = SUB;
    ctx.font = '500 24px "Inter", sans-serif';
    ctx.fillText('Últimas 4 semanas', cx + 40, cy + 120);

    // Silueta del Mapa Muscular real del app (FRONT_PATHS de muscleMap.js)
    const figH = ch - 360;
    const figW = figH * 0.51; // ratio del viewBox 620/1210
    const oxFig = cx + cw/2 - figW/2;
    const oyFig = cy + 170;
    drawAppBodyFront(ctx, oxFig, oyFig, figW, figH, {
      zones: ['pecho','cuadriceps','hombros_l','hombros_r'],
      tier: {
        pecho:      withAlpha(ACC, 0.6),
        cuadriceps: withAlpha(ACC, 0.45),
        hombros_l:  withAlpha(ACC, 0.3),
        hombros_r:  withAlpha(ACC, 0.3),
      }
    });

    // Top músculos (orden descendente por volumen)
    const top = [
      { name:'PIERNA',  vol:'18.2t' },
      { name:'PECHO',   vol:'12.4t' },
      { name:'ESPALDA', vol:'9.8t' },
    ];
    let ty = cy + ch - 220;
    ctx.textAlign = 'left';
    ctx.fillStyle = SUB;
    ctx.font = '700 22px "Inter", sans-serif';
    ctx.fillText('TOP MÚSCULOS', cx + 40, ty);
    ty += 50;
    for(const t of top){
      ctx.fillStyle = TEXT;
      ctx.font = '700 28px "Inter", sans-serif';
      ctx.fillText(t.name, cx + 40, ty);
      ctx.fillStyle = ACC;
      ctx.font = '900 italic 36px "Barlow Condensed", sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(t.vol, cx + cw - 40, ty);
      ctx.textAlign = 'left';
      ty += 50;
    }

    drawFooter(ctx, d.cta);
  }

  // ── MOCKUP 6: PERSONAL RECORD ────────────────────────────────────────────
  function renderMockPR(ctx, d){
    drawBackground(ctx);
    drawEyebrow(ctx, d.eyebrow, SAFE_TOP);
    drawHeadline(ctx, d.headline, SAFE_TOP + 140);

    const cx = 90, cy = SAFE_TOP + 320, cw = W - 180, ch = 920;
    ctx.fillStyle = SURF;
    roundedRect(ctx, cx, cy, cw, ch, 28); ctx.fill();
    ctx.strokeStyle = BORDER; ctx.lineWidth = 2;
    roundedRect(ctx, cx, cy, cw, ch, 28); ctx.stroke();

    // PR badge + exercise name
    ctx.fillStyle = ACC;
    roundedRect(ctx, cx + 40, cy + 52, 118, 48, 24); ctx.fill();
    ctx.fillStyle = '#000';
    ctx.font = '800 26px "Inter", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('PR', cx + 99, cy + 85);

    ctx.fillStyle = TEXT;
    ctx.textAlign = 'left';
    ctx.font = '900 italic 56px "Barlow Condensed", sans-serif';
    ctx.fillText((d.exercise || 'SENTADILLA').toUpperCase(), cx + 178, cy + 89);

    // Peso nuevo — gigante y lima
    ctx.fillStyle = ACC;
    ctx.textAlign = 'center';
    ctx.font = '900 italic 300px "Barlow Condensed", sans-serif';
    ctx.fillText(d.kg || '120', W/2, cy + 430);

    ctx.fillStyle = TEXT;
    ctx.font = '900 italic 100px "Barlow Condensed", sans-serif';
    ctx.fillText('KG', W/2, cy + 530);

    // Separador
    ctx.strokeStyle = BORDER; ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(cx + 40, cy + 610);
    ctx.lineTo(cx + cw - 40, cy + 610);
    ctx.stroke();

    // Anterior + delta
    ctx.fillStyle = SUB;
    ctx.font = '700 24px "Inter", sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('ANTERIOR', cx + 40, cy + 690);
    ctx.fillStyle = TEXT;
    ctx.font = '900 italic 72px "Barlow Condensed", sans-serif';
    ctx.fillText(d.prev || '110 KG', cx + 40, cy + 780);

    ctx.fillStyle = GREEN;
    ctx.font = '900 italic 60px "Barlow Condensed", sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText('+' + (d.delta || '10') + ' KG', cx + cw - 40, cy + 780);

    drawFooter(ctx, d.cta);
  }

  // ── TIPOGRÁFICA: COUNTDOWN ────────────────────────────────────────────────
  function renderCountdown(ctx, d){
    drawBackground(ctx);
    drawEyebrow(ctx, d.eyebrow, SAFE_TOP);

    const midY = (SAFE_TOP + SAFE_BOTTOM) / 2;

    // Número gigante lima
    ctx.fillStyle = ACC;
    ctx.textAlign = 'center';
    ctx.font = '900 italic 460px "Barlow Condensed", sans-serif';
    ctx.fillText(d.days || '7', W/2, midY + 60);

    // "DÍAS" debajo en blanco
    ctx.fillStyle = TEXT;
    ctx.font = '900 italic 120px "Barlow Condensed", sans-serif';
    ctx.fillText('DÍAS', W/2, midY + 200);

    if(d.sub){
      ctx.fillStyle = SUB;
      ctx.font = '500 38px "Inter", sans-serif';
      const lines = wrapText(ctx, d.sub, W - 240);
      let y = midY + 300;
      for(const line of lines){ ctx.fillText(line, W/2, y); y += 52; }
    }

    drawFooter(ctx, d.cta);
  }

  // ── TIPOGRÁFICA: SOCIAL PROOF ─────────────────────────────────────────────
  function renderSocialProof(ctx, d){
    drawBackground(ctx);
    drawEyebrow(ctx, d.eyebrow, SAFE_TOP);

    const midY = (SAFE_TOP + SAFE_BOTTOM) / 2;

    // Número grande
    ctx.fillStyle = TEXT;
    ctx.textAlign = 'center';
    ctx.font = '900 italic 340px "Barlow Condensed", sans-serif';
    ctx.fillText(d.count || '47', W/2, midY - 20);

    // Línea lima
    ctx.strokeStyle = ACC;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(W/2 - 140, midY + 80);
    ctx.lineTo(W/2 + 140, midY + 80);
    ctx.stroke();

    // Noun lima
    ctx.fillStyle = ACC;
    ctx.font = '900 italic 100px "Barlow Condensed", sans-serif';
    ctx.fillText((d.noun || 'ATLETAS').toUpperCase(), W/2, midY + 200);

    // Subtítulo
    if(d.sub){
      ctx.fillStyle = SUB;
      ctx.font = '500 38px "Inter", sans-serif';
      const lines = wrapText(ctx, d.sub, W - 240);
      let y = midY + 300;
      for(const line of lines){ ctx.fillText(line, W/2, y); y += 52; }
    }

    drawFooter(ctx, d.cta);
  }

  // ── MARCOS (PNG con transparencia — overlay sobre fotos) ─────────────────
  // Ninguno llama a drawBackground(). El canvas queda transparente.
  // Wordmark vectorial: no se pixela a ninguna escala.

  // Sello: wordmark gigante centrado + fade abajo + handle italic
  function renderFrameSello(ctx, d){
    drawWordmark(ctx, W/2, H/2 - 80, 460, '#ffffff');

    const g = ctx.createLinearGradient(0, H*0.62, 0, H);
    g.addColorStop(0, 'rgba(0,0,0,0)');
    g.addColorStop(1, 'rgba(0,0,0,0.82)');
    ctx.fillStyle = g;
    ctx.fillRect(0, H*0.62, W, H*0.38);

    ctx.fillStyle = '#ffffff';
    ctx.font = '700 italic 44px "Barlow Condensed", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(d.handle || HANDLE, W/2, H - 110);
  }

  // Esquina: wordmark chico abajo-izq + handle arriba-der con punto lima
  function renderFrameEsquina(ctx, d){
    drawWordmark(ctx, 180, H - 130, 130, '#ffffff');

    const pad = 64;
    ctx.fillStyle = '#ffffff';
    ctx.font = '700 italic 38px "Barlow Condensed", sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(d.handle || HANDLE, W - pad, pad + 30);

    // Punto lima de acento
    ctx.fillStyle = ACC;
    ctx.beginPath();
    ctx.arc(W - pad - ctx.measureText(d.handle || HANDLE).width - 24, pad + 18, 8, 0, Math.PI*2);
    ctx.fill();
  }

  // Tapa: bandas arriba y abajo + wordmark arriba + handle italic abajo
  function renderFrameTapa(ctx, d){
    const topY = SAFE_TOP - 60, topH = 220;
    const botY = SAFE_BOTTOM;
    const botH = H - botY;

    ctx.fillStyle = 'rgba(4,4,4,0.92)';
    ctx.fillRect(0, topY, W, topH);
    ctx.fillRect(0, botY, W, botH);

    // Línea fina lima entre la foto y la banda inferior
    ctx.fillStyle = ACC;
    ctx.fillRect(0, botY - 4, W, 4);

    drawWordmark(ctx, W/2, topY + 130, 150, '#ffffff');

    ctx.fillStyle = '#ffffff';
    ctx.font = '700 italic 42px "Barlow Condensed", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(d.handle || HANDLE, W/2, botY + 80);
  }

  // Borde: marco redondeado + ticks en las 4 esquinas + wordmark abajo
  function renderFrameBorde(ctx, d){
    const color = (d.color || '').toLowerCase() === 'lima' ? ACC : '#ffffff';
    const pad   = 32;
    const w = W - pad*2, h = H - pad*2;

    ctx.strokeStyle = color;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.roundRect(pad, pad, w, h, 24);
    ctx.stroke();

    // Ticks en las 4 esquinas — detalle brutalist
    const tick = 36;
    ctx.lineWidth = 6;
    ctx.lineCap = 'square';
    [[pad, pad, 1, 1], [pad+w, pad, -1, 1], [pad, pad+h, 1, -1], [pad+w, pad+h, -1, -1]]
      .forEach(([x, y, sx, sy]) => {
        ctx.beginPath();
        ctx.moveTo(x, y + sy*tick);
        ctx.lineTo(x, y);
        ctx.lineTo(x + sx*tick, y);
        ctx.stroke();
      });

    drawWordmark(ctx, W/2, H - 200, 180, color);

    ctx.fillStyle = color;
    ctx.font = '700 italic 38px "Barlow Condensed", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(d.handle || HANDLE, W/2, H - 90);
  }

  // ── TEMPLATES ──────────────────────────────────────────────────────────────
  // Modo 1: mockups del UI real (anuncia features)
  const TEMPLATES_MOCKUPS = [
    { id:'mock-rutina', label:'Rutina', renderer:renderMockRutina,
      defaults:{ eyebrow:'CARGÁ TU SESIÓN', headline:'Tu plan del mes. En una pantalla.', cta:HANDLE } },
    { id:'mock-pagos', label:'Pagos', renderer:renderMockPagos,
      defaults:{ eyebrow:'TUS PAGOS', headline:'Tu coach ya no te dice cuánto debés.', cta:HANDLE } },
    { id:'mock-fisico', label:'Físico', renderer:renderMockFisico,
      defaults:{ eyebrow:'PROGRESO REAL', headline:'Tu progreso físico, sin Excel.', cta:HANDLE } },
    { id:'mock-checkin', label:'Check-in', renderer:renderMockCheckin,
      defaults:{ eyebrow:'CADA DOMINGO', headline:'Tu coach te explica la semana.', cta:HANDLE } },
    { id:'mock-muscle', label:'Volumen', renderer:renderMockMuscle,
      defaults:{ eyebrow:'TU CUERPO HABLA', headline:'Tu volumen, músculo por músculo.', cta:HANDLE } },
    { id:'mock-pr', label:'Record', renderer:renderMockPR,
      defaults:{ eyebrow:'NUEVO RECORD', headline:'Cuando el número dice todo.', exercise:'SENTADILLA', kg:'120', prev:'110 KG', delta:'10', cta:HANDLE } },
  ];

  // Modo 2: tipográficas puras (humo / mensajes / hype)
  const TEMPLATES_TYPO = [
    { id:'intro', label:'Intro', renderer:renderIntro,
      defaults:{ eyebrow:'PRÓXIMAMENTE EN URUGUAY', word:'BASTA.', sub:'Basta del Excel y los PDFs.', cta:HANDLE } },
    { id:'hero', label:'Hero', renderer:renderHero,
      defaults:{ eyebrow:'PRÓXIMAMENTE', line1:'SQUAD', line2:'TEAM', footer:HANDLE } },
    { id:'question', label:'Pregunta', renderer:renderQuestion,
      defaults:{ eyebrow:'PENSALO', headline:'¿Tu coach todavía te manda PDFs?', cta:HANDLE } },
    { id:'features', label:'Features', renderer:renderFeatures,
      defaults:{ eyebrow:'TODO EN UNA APP', bullets:'Tu plan\nTus pagos\nTus check-ins', cta:HANDLE } },
    { id:'manifesto', label:'Manifiesto', renderer:renderManifesto,
      defaults:{ eyebrow:'NUEVA FORMA', headline:'Coaching como debería ser.', sub:'Limpio. Sin Excel. Sin grupos de WhatsApp.', cta:HANDLE } },
    { id:'cta', label:'Call to action', renderer:renderCta,
      defaults:{ eyebrow:'SE VIENE', headline:'Sumate a la beta.', sub:'Tu coach lo va a agradecer.', cta:HANDLE } },
    { id:'countdown', label:'Countdown', renderer:renderCountdown,
      defaults:{ eyebrow:'SE VIENE', days:'7', sub:'Para el lanzamiento oficial.', cta:HANDLE } },
    { id:'social-proof', label:'Social', renderer:renderSocialProof,
      defaults:{ eyebrow:'YA ADENTRO', count:'47', noun:'ATLETAS', sub:'ya tienen su plan en la app.', cta:HANDLE } },
  ];

  // Modo 3: marcos PNG transparentes para overlay en historias
  const TEMPLATES_FRAMES = [
    { id:'frame-sello',   label:'Sello',   renderer:renderFrameSello,
      defaults:{ handle:HANDLE } },
    { id:'frame-esquina', label:'Esquina', renderer:renderFrameEsquina,
      defaults:{ handle:HANDLE } },
    { id:'frame-tapa',    label:'Tapa',    renderer:renderFrameTapa,
      defaults:{ handle:HANDLE } },
    { id:'frame-borde',   label:'Borde',   renderer:renderFrameBorde,
      defaults:{ handle:HANDLE, color:'blanco' } },
  ];

  // Selección de modo según el param
  function getMode(){
    const m = new URLSearchParams(location.search).get('promo');
    if(m === '2') return 'typo';
    if(m === '3') return 'frames';
    return 'mockups';
  }
  function getTemplates(){
    const m = getMode();
    if(m === 'typo')   return TEMPLATES_TYPO;
    if(m === 'frames') return TEMPLATES_FRAMES;
    return TEMPLATES_MOCKUPS;
  }
  const TEMPLATES = getTemplates();

  // ── OVERLAY UI ─────────────────────────────────────────────────────────────
  let _templates = getTemplates();
  let _selected = _templates[0];
  let _state = { ..._selected.defaults };

  function ensurePromoStyles(){
    if(document.getElementById('promo-styles')) return;
    const s = document.createElement('style');
    s.id = 'promo-styles';
    s.textContent = `
      #promo-ov .promo-grid {
        display: grid;
        grid-template-columns: 1fr 360px;
        gap: 24px;
        align-items: start;
      }
      @media (max-width: 960px) {
        #promo-ov .promo-grid { grid-template-columns: 1fr; }
        #promo-ov .promo-canvas-wrap { max-height: 60vh; }
      }
      @media (max-width: 480px) {
        #promo-ov { padding: 14px !important; }
      }
      #promo-ov .promo-chips {
        display: flex;
        gap: 8px;
        margin-bottom: 20px;
        overflow-x: auto;
        scrollbar-width: none;
        -ms-overflow-style: none;
        padding-bottom: 4px;
      }
      #promo-ov .promo-chips::-webkit-scrollbar { display: none; }
      #promo-ov .promo-chips button { flex-shrink: 0; }
    `;
    document.head.appendChild(s);
  }

  function open(){
    ensurePromoStyles();
    let ov = document.getElementById('promo-ov');
    if(ov) ov.remove();
    ov = document.createElement('div');
    ov.id = 'promo-ov';
    ov.style.cssText = 'position:fixed;inset:0;z-index:99999;background:#0a0a0d;color:#fff;font-family:"Inter",sans-serif;overflow-y:auto;padding:24px';
    document.body.appendChild(ov);
    renderUI();
  }

  function renderUI(){
    const ov = document.getElementById('promo-ov');
    if(!ov) return;
    const fields = Object.entries(_state).map(([k,v]) => `
      <div style="margin-bottom:14px">
        <label style="display:block;font-size:10px;font-weight:700;letter-spacing:.12em;color:#9090a8;text-transform:uppercase;margin-bottom:6px">${escapeHtml(k)}</label>
        ${String(v).includes('\n')
          ? `<textarea data-key="${escapeHtml(k)}" rows="${String(v).split('\n').length+1}" style="width:100%;background:#1a1a1f;border:1px solid #2a2a35;border-radius:8px;padding:10px 12px;color:#fff;font-family:inherit;font-size:14px;resize:vertical">${escapeHtml(v)}</textarea>`
          : `<input data-key="${escapeHtml(k)}" type="text" value="${escapeHtml(v)}" style="width:100%;background:#1a1a1f;border:1px solid #2a2a35;border-radius:8px;padding:10px 12px;color:#fff;font-family:inherit;font-size:14px">`}
      </div>`).join('');
    const mode = getMode();
    const modeLabelMap = {
      mockups: 'Mockups del app — recreación de cada sección',
      typo:    'Tipográficas puras — texto + identidad',
      frames:  'Marcos PNG transparentes — overlay sobre fotos',
    };
    const modeLabel = modeLabelMap[mode];
    const modeNav = [
      { p:'1', label:'Mockups', m:'mockups' },
      { p:'2', label:'Tipográficas', m:'typo' },
      { p:'3', label:'Marcos', m:'frames' },
    ].map(({p,label,m}) => {
      const active = m === mode;
      return `<a href="?promo=${p}" style="padding:8px 14px;background:${active?ACC:'#1a1a1f'};border:1px solid ${active?ACC:'#2a2a35'};border-radius:8px;color:${active?'#000':'#9090a8'};font-family:inherit;font-weight:700;font-size:11px;text-decoration:none;white-space:nowrap">${label}</a>`;
    }).join('');
    const canvasBg = mode === 'frames' ? '#555' : '#000';
    const extraHint = mode === 'frames'
      ? `<div style="font-size:11px;color:#9090a8;text-align:center;margin-top:10px;line-height:1.5">PNG con fondo transparente · pegalo como sticker en Instagram</div>`
      : '';
    ov.innerHTML = `
    <div style="max-width:1200px;margin:0 auto">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:24px">
        <div>
          <div style="font-family:'Barlow Condensed',sans-serif;font-style:italic;font-weight:900;font-size:40px;line-height:.9">PROMO</div>
          <div style="font-size:12px;color:#9090a8;margin-top:4px">${modeLabel} · 1080×1920</div>
        </div>
        <div style="display:flex;gap:6px;align-items:center">
          ${modeNav}
          <button onclick="document.getElementById('promo-ov').remove()" style="background:#1a1a1f;border:1px solid #2a2a35;border-radius:10px;width:42px;height:42px;color:#fff;font-size:20px;cursor:pointer;margin-left:4px">×</button>
        </div>
      </div>

      <div class="promo-chips">
        ${_templates.map(t => `
          <button onclick="PROMO.select('${t.id}')"
            style="padding:10px 16px;background:${t.id===_selected.id?ACC:'#1a1a1f'};border:1px solid ${t.id===_selected.id?ACC:'#2a2a35'};color:${t.id===_selected.id?'#000':'#fff'};border-radius:10px;font-size:12px;font-weight:700;cursor:pointer;font-family:inherit">${t.label}</button>
        `).join('')}
      </div>

      <div class="promo-grid">
        <div class="promo-canvas-wrap" style="background:${canvasBg};border-radius:12px;overflow:hidden;aspect-ratio:9/16;max-height:80vh;display:flex;align-items:center;justify-content:center">
          <canvas id="promo-canvas" width="${W}" height="${H}" style="max-width:100%;max-height:100%;display:block"></canvas>
        </div>
        <div>
          <div id="promo-fields" oninput="PROMO.updateField(event)">${fields}</div>
          <button onclick="PROMO.download()" style="width:100%;padding:14px;background:${ACC};border:none;border-radius:12px;color:#000;font-family:inherit;font-weight:800;font-size:14px;letter-spacing:1.5px;cursor:pointer;text-transform:uppercase;margin-top:8px">Descargar PNG</button>
          ${extraHint}
          <button onclick="PROMO.share()" style="width:100%;padding:12px;background:transparent;border:1px solid #2a2a35;border-radius:10px;color:#9090a8;font-family:inherit;font-weight:600;font-size:12px;cursor:pointer;margin-top:8px">Compartir nativo</button>
          <div style="display:flex;gap:8px;margin-top:8px">
            <button onclick="PROMO.reset()" style="flex:1;padding:10px;background:transparent;border:1px solid #2a2a35;border-radius:10px;color:#9090a8;font-family:inherit;font-weight:600;font-size:12px;cursor:pointer">Reset a defaults</button>
            <button onclick="PROMO.copyText()" style="flex:1;padding:10px;background:transparent;border:1px solid #2a2a35;border-radius:10px;color:#9090a8;font-family:inherit;font-weight:600;font-size:12px;cursor:pointer">Copiar texto</button>
          </div>
        </div>
      </div>
    </div>`;
    scheduleRedraw();
  }

  function select(id){
    const t = _templates.find(x => x.id === id);
    if(!t) return;
    _selected = t;
    _state = { ...t.defaults };
    renderUI();
  }

  function updateField(e){
    const el = e.target;
    const key = el.getAttribute('data-key');
    if(!key) return;
    _state[key] = el.value;
    scheduleRedraw();
  }

  function redraw(){
    const cv = document.getElementById('promo-canvas');
    if(!cv) return;
    const ctx = cv.getContext('2d');
    ctx.clearRect(0, 0, W, H);
    if(_selected?.renderer) _selected.renderer(ctx, _state);
  }

  function download(){
    const cv = document.getElementById('promo-canvas');
    if(!cv) return;
    cv.toBlob(blob => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `squadteam-${_selected.id}-${Date.now()}.png`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    }, 'image/png');
  }

  async function share(){
    const cv = document.getElementById('promo-canvas');
    if(!cv) return;
    cv.toBlob(async blob => {
      const file = new File([blob], `squadteam-${_selected.id}.png`, { type:'image/png' });
      if(navigator.canShare && navigator.canShare({ files:[file] })){
        try{ await navigator.share({ files:[file], title:'Squad Team' }); }
        catch(e){ if(e?.name !== 'AbortError') download(); }
      } else {
        download();
      }
    }, 'image/png');
  }

  function reset(){
    _state = { ..._selected.defaults };
    renderUI();
  }

  function promoToast(msg){
    let t = document.getElementById('promo-toast');
    if(!t){
      t = document.createElement('div');
      t.id = 'promo-toast';
      t.style.cssText = 'position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:#1a1a1f;border:1px solid #2a2a35;border-radius:10px;padding:10px 18px;color:#fff;font-family:inherit;font-size:13px;z-index:100000;opacity:0;transition:opacity .2s';
      document.body.appendChild(t);
    }
    t.textContent = msg;
    t.style.opacity = '1';
    clearTimeout(t._h);
    t._h = setTimeout(() => t.style.opacity = '0', 1800);
  }

  async function copyText(){
    const parts = [];
    for(const [k,v] of Object.entries(_state)){
      if(v) parts.push(`${k.toUpperCase()}: ${v}`);
    }
    try{
      await navigator.clipboard.writeText(parts.join('\n'));
      promoToast('Copy copiado.');
    }catch(e){ promoToast('No se pudo copiar.'); }
  }

  return { open, select, updateField, download, share, reset, copyText };
})();

const _promoParam = new URLSearchParams(location.search).get('promo');
if(_promoParam === '1' || _promoParam === '2' || _promoParam === '3'){
  document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => PROMO.open(), 300);
  });
}

window.PROMO = PROMO;
