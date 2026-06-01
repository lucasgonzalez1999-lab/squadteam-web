'use strict';
// SQUAD TEAM — Generador de stories 9:16 para anuncio en IG
// Abrir con ?promo=1
// Templates tipográficas (hero/question/etc) + mockups que recrean
// el UI real del app para anunciar features con copy de hype.

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

  // ── DRAWING HELPERS ────────────────────────────────────────────────────────
  function drawBackground(ctx){
    ctx.fillStyle = BG;
    ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = 'rgba(255,255,255,.018)';
    ctx.lineWidth = 1;
    for(let x=0; x<W; x+=96){ ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,H); ctx.stroke(); }
    for(let y=0; y<H; y+=96){ ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(W,y); ctx.stroke(); }
    const g = ctx.createRadialGradient(W/2, H+200, 0, W/2, H+200, 900);
    g.addColorStop(0, 'rgba(232,255,0,.10)');
    g.addColorStop(.5, 'rgba(232,255,0,.02)');
    g.addColorStop(1, 'rgba(232,255,0,0)');
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
    ctx.fillText(text, W/2, H - 100);
    ctx.strokeStyle = 'rgba(232,255,0,.3)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(W/2 - 60, H - 160);
    ctx.lineTo(W/2 + 60, H - 160);
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
    if(ctx.roundRect){ ctx.roundRect(x, y, w, h, r); }
    else { ctx.rect(x, y, w, h); }
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
  function renderHero(ctx, d){
    drawBackground(ctx);
    drawEyebrow(ctx, d.eyebrow, 280);
    ctx.font = '900 italic 240px "Barlow Condensed", sans-serif';
    ctx.fillStyle = TEXT;
    ctx.textAlign = 'center';
    ctx.fillText(d.line1, W/2, H/2 - 80);
    ctx.fillStyle = ACC;
    ctx.font = '900 italic 320px "Barlow Condensed", sans-serif';
    ctx.fillText(d.line2, W/2, H/2 + 180);
    drawFooter(ctx, d.footer);
  }

  function renderQuestion(ctx, d){
    drawBackground(ctx);
    drawEyebrow(ctx, d.eyebrow, 280);
    ctx.fillStyle = TEXT;
    ctx.textAlign = 'center';
    ctx.font = '900 italic 96px "Barlow Condensed", sans-serif';
    const lines = wrapText(ctx, d.headline, W - 200);
    let y = H/2 - (lines.length * 110) / 2 + 60;
    for(const line of lines){ ctx.fillText(line, W/2, y); y += 110; }
    drawFooter(ctx, d.cta);
  }

  function renderFeatures(ctx, d){
    drawBackground(ctx);
    drawEyebrow(ctx, d.eyebrow, 280);
    const bullets = (d.bullets || '').split('\n').filter(Boolean);
    ctx.textAlign = 'center';
    let y = H/2 - (bullets.length * 140) / 2 + 60;
    for(let i=0;i<bullets.length;i++){
      ctx.font = '900 italic 84px "Barlow Condensed", sans-serif';
      ctx.fillStyle = ACC;
      ctx.fillText(`0${i+1}`, W/2 - 280, y);
      ctx.font = '800 italic 78px "Barlow Condensed", sans-serif';
      ctx.fillStyle = TEXT;
      ctx.textAlign = 'left';
      ctx.fillText(bullets[i].toUpperCase(), W/2 - 200, y);
      ctx.textAlign = 'center';
      y += 140;
    }
    drawFooter(ctx, d.cta);
  }

  function renderManifesto(ctx, d){
    drawBackground(ctx);
    drawEyebrow(ctx, d.eyebrow, 280);
    ctx.fillStyle = TEXT;
    ctx.textAlign = 'center';
    ctx.font = '900 italic 96px "Barlow Condensed", sans-serif';
    const lines = wrapText(ctx, d.headline, W - 200);
    let y = H/2 - 80;
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
    drawEyebrow(ctx, d.eyebrow, 280);
    ctx.fillStyle = TEXT;
    ctx.textAlign = 'center';
    ctx.font = '900 italic 120px "Barlow Condensed", sans-serif';
    const lines = wrapText(ctx, d.headline, W - 200);
    let y = H/2 - 80;
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
    drawEyebrow(ctx, d.eyebrow, 200);
    drawHeadline(ctx, d.headline, 340);

    // Card mockup centrado
    const cx = 90, cy = 620, cw = W - 180, ch = 920;
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
    ctx.fillStyle = 'rgba(232,255,0,.15)';
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
        drawCheck(ctx, cx + cw - 120, sy + 18, 32, '#00d084');
      }
      sy += 170;
    }

    drawFooter(ctx, d.cta);
  }

  // ── MOCKUP 2: MI PLAN (pagos) ─────────────────────────────────────────────
  function renderMockPagos(ctx, d){
    drawBackground(ctx);
    drawEyebrow(ctx, d.eyebrow, 200);
    drawHeadline(ctx, d.headline, 340);

    const cx = 90, cy = 620, cw = W - 180, ch = 920;
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
    ctx.fillStyle = '#22c55e';
    ctx.font = '700 26px "Inter", sans-serif';
    ctx.fillText('Al día · próximo cobro 15 jun', cx + 40, cy + 140);

    // 3 columnas: MONTO / MÉTODO / PERÍODO
    const labels = ['MONTO','MÉTODO','PERÍODO'];
    const vals = ['$4000','Transfer','Mensual'];
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
      { date:'15 may', amt:'$4000 UYU' },
      { date:'15 abr', amt:'$4000 UYU' },
      { date:'15 mar', amt:'$4000 UYU' },
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
      drawCheck(ctx, cx + cw - 60, py - 8, 22, '#00d084');
      py += 80;
    }

    drawFooter(ctx, d.cta);
  }

  // ── MOCKUP 3: FÍSICO (grid 2×2) ───────────────────────────────────────────
  function renderMockFisico(ctx, d){
    drawBackground(ctx);
    drawEyebrow(ctx, d.eyebrow, 200);
    drawHeadline(ctx, d.headline, 340);

    const cx = 90, cy = 620, cw = W - 180, ch = 920;
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
    drawEyebrow(ctx, d.eyebrow, 200);
    drawHeadline(ctx, d.headline, 340);

    const cx = 90, cy = 620, cw = W - 180, ch = 920;
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
      ctx.fillStyle = c.val>=4 ? ACC : TEXT;
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
    drawEyebrow(ctx, d.eyebrow, 200);
    drawHeadline(ctx, d.headline, 340);

    const cx = 90, cy = 620, cw = W - 180, ch = 920;
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

    // Silueta humana simplificada
    const sx = cx + cw/2 - 100, sy = cy + 180;
    // Head
    ctx.fillStyle = '#1a1a22';
    ctx.beginPath();
    ctx.arc(sx + 100, sy + 50, 50, 0, Math.PI*2);
    ctx.fill();
    // Body
    roundedRect(ctx, sx + 30, sy + 110, 140, 260, 30);
    ctx.fill();
    // Arms
    roundedRect(ctx, sx - 30, sy + 130, 50, 220, 18);
    ctx.fill();
    roundedRect(ctx, sx + 180, sy + 130, 50, 220, 18);
    ctx.fill();
    // Legs
    roundedRect(ctx, sx + 35, sy + 380, 55, 240, 20);
    ctx.fill();
    roundedRect(ctx, sx + 110, sy + 380, 55, 240, 20);
    ctx.fill();
    // Pecho destacado lima
    ctx.fillStyle = ACC;
    roundedRect(ctx, sx + 38, sy + 130, 124, 70, 14);
    ctx.fill();
    // Hombros lima un poco menos
    ctx.fillStyle = 'rgba(232,255,0,.5)';
    ctx.beginPath();
    ctx.arc(sx + 50, sy + 140, 30, 0, Math.PI*2);
    ctx.arc(sx + 150, sy + 140, 30, 0, Math.PI*2);
    ctx.fill();

    // Top 3 lista
    const top = [
      { name:'PECHO', vol:'12.4t' },
      { name:'PIERNA', vol:'18.2t' },
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
  ];

  // Modo 2: tipográficas puras (humo / mensajes / hype)
  const TEMPLATES_TYPO = [
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
  ];

  // Selección de modo según el param
  function getMode(){
    const m = new URLSearchParams(location.search).get('promo');
    return m === '2' ? 'typo' : 'mockups';
  }
  function getTemplates(){
    return getMode() === 'typo' ? TEMPLATES_TYPO : TEMPLATES_MOCKUPS;
  }
  const TEMPLATES = getTemplates();

  // ── OVERLAY UI ─────────────────────────────────────────────────────────────
  let _templates = getTemplates();
  let _selected = _templates[0];
  let _state = { ..._selected.defaults };

  function open(){
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
        <label style="display:block;font-size:10px;font-weight:700;letter-spacing:.12em;color:#9090a8;text-transform:uppercase;margin-bottom:6px">${k}</label>
        ${String(v).includes('\n')
          ? `<textarea data-key="${k}" rows="${String(v).split('\n').length+1}" style="width:100%;background:#1a1a1f;border:1px solid #2a2a35;border-radius:8px;padding:10px 12px;color:#fff;font-family:inherit;font-size:14px;resize:vertical">${v}</textarea>`
          : `<input data-key="${k}" type="text" value="${String(v).replace(/"/g,'&quot;')}" style="width:100%;background:#1a1a1f;border:1px solid #2a2a35;border-radius:8px;padding:10px 12px;color:#fff;font-family:inherit;font-size:14px">`}
      </div>`).join('');
    const mode = getMode();
    const modeLabel = mode === 'typo' ? 'Tipográficas puras — texto + identidad' : 'Mockups del app — recreación de cada sección';
    const otherMode = mode === 'typo' ? '1' : '2';
    const otherLabel = mode === 'typo' ? 'Ver mockups' : 'Ver tipográficas';
    ov.innerHTML = `
    <div style="max-width:1200px;margin:0 auto">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:24px">
        <div>
          <div style="font-family:'Barlow Condensed',sans-serif;font-style:italic;font-weight:900;font-size:40px;line-height:.9">PROMO</div>
          <div style="font-size:12px;color:#9090a8;margin-top:4px">${modeLabel} · 1080×1920</div>
        </div>
        <div style="display:flex;gap:8px;align-items:center">
          <a href="?promo=${otherMode}" style="padding:10px 14px;background:#1a1a1f;border:1px solid #2a2a35;border-radius:10px;color:#e8ff00;font-family:inherit;font-weight:700;font-size:12px;text-decoration:none">${otherLabel} →</a>
          <button onclick="document.getElementById('promo-ov').remove()" style="background:#1a1a1f;border:1px solid #2a2a35;border-radius:10px;width:42px;height:42px;color:#fff;font-size:20px;cursor:pointer">×</button>
        </div>
      </div>

      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:20px">
        ${_templates.map(t => `
          <button onclick="PROMO.select('${t.id}')"
            style="padding:10px 16px;background:${t.id===_selected.id?'#e8ff00':'#1a1a1f'};border:1px solid ${t.id===_selected.id?'#e8ff00':'#2a2a35'};color:${t.id===_selected.id?'#000':'#fff'};border-radius:10px;font-size:12px;font-weight:700;cursor:pointer;font-family:inherit">${t.label}</button>
        `).join('')}
      </div>

      <div style="display:grid;grid-template-columns:1fr 360px;gap:24px;align-items:start">
        <div style="background:#000;border-radius:12px;overflow:hidden;aspect-ratio:9/16;max-height:80vh;display:flex;align-items:center;justify-content:center">
          <canvas id="promo-canvas" width="${W}" height="${H}" style="max-width:100%;max-height:100%;display:block"></canvas>
        </div>
        <div>
          <div id="promo-fields" oninput="PROMO.updateField(event)">${fields}</div>
          <button onclick="PROMO.download()" style="width:100%;padding:14px;background:#e8ff00;border:none;border-radius:12px;color:#000;font-family:inherit;font-weight:800;font-size:14px;letter-spacing:1.5px;cursor:pointer;text-transform:uppercase;margin-top:8px">Descargar PNG</button>
          <button onclick="PROMO.share()" style="width:100%;padding:12px;background:transparent;border:1px solid #2a2a35;border-radius:10px;color:#9090a8;font-family:inherit;font-weight:600;font-size:12px;cursor:pointer;margin-top:8px">Compartir nativo</button>
        </div>
      </div>
    </div>`;
    redraw();
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
    redraw();
  }

  function redraw(){
    const cv = document.getElementById('promo-canvas');
    if(!cv) return;
    const ctx = cv.getContext('2d');
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
        catch(e){ download(); }
      } else {
        download();
      }
    }, 'image/png');
  }

  return { open, select, updateField, download, share };
})();

const _promoParam = new URLSearchParams(location.search).get('promo');
if(_promoParam === '1' || _promoParam === '2'){
  document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => PROMO.open(), 300);
  });
}

window.PROMO = PROMO;
