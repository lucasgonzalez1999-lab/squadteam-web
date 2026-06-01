'use strict';
// SQUAD TEAM — Generador de slides 9:16 para IG stories
// Abrir con ?promo=1 o vía atajo en el panel coach
// Genera PNG 1080×1920 con la identidad visual del app

const PROMO = (() => {
  const W = 1080, H = 1920;
  const HANDLE = '@sqteam.uy';
  const ACC = '#e8ff00';
  const BG = '#040404';
  const TEXT = '#ffffff';
  const SUB = '#9090a8';

  const TEMPLATES = [
    {
      id:'hero',
      label:'Tipográfica',
      defaults:{
        eyebrow:'PRÓXIMAMENTE',
        line1:'SQUAD',
        line2:'TEAM',
        footer:HANDLE,
      },
    },
    {
      id:'question',
      label:'Pregunta',
      defaults:{
        eyebrow:'PENSALO',
        headline:'¿Tu coach todavía te manda PDFs?',
        cta:HANDLE,
      },
    },
    {
      id:'features',
      label:'Features',
      defaults:{
        eyebrow:'TODO EN UNA APP',
        bullets:'Tu plan\nTus pagos\nTus check-ins',
        cta:HANDLE,
      },
    },
    {
      id:'manifesto',
      label:'Manifiesto',
      defaults:{
        eyebrow:'NUEVA FORMA',
        headline:'Coaching como debería ser.',
        sub:'Limpio. Sin Excel. Sin grupos de WhatsApp.',
        cta:HANDLE,
      },
    },
    {
      id:'cta',
      label:'Call to action',
      defaults:{
        eyebrow:'SE VIENE',
        headline:'Sumate a la beta.',
        sub:'Tu coach lo va a agradecer.',
        cta:HANDLE,
      },
    },
  ];

  // ── DRAWING HELPERS ────────────────────────────────────────────────────────
  function drawBackground(ctx){
    ctx.fillStyle = BG;
    ctx.fillRect(0, 0, W, H);
    // Grid sutil
    ctx.strokeStyle = 'rgba(255,255,255,.018)';
    ctx.lineWidth = 1;
    const step = 96;
    for(let x=0; x<W; x+=step){ ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,H); ctx.stroke(); }
    for(let y=0; y<H; y+=step){ ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(W,y); ctx.stroke(); }
    // Glow inferior
    const g = ctx.createRadialGradient(W/2, H+200, 0, W/2, H+200, 900);
    g.addColorStop(0, 'rgba(232,255,0,.10)');
    g.addColorStop(.5, 'rgba(232,255,0,.02)');
    g.addColorStop(1, 'rgba(232,255,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  }

  function drawEyebrow(ctx, text, y){
    ctx.font = '700 28px "Inter", sans-serif';
    ctx.fillStyle = SUB;
    ctx.textAlign = 'center';
    // tracking manual
    const letters = text.toUpperCase().split('');
    const tracking = 12;
    let totalW = 0;
    ctx.font = '700 28px "Inter", sans-serif';
    for(const l of letters) totalW += ctx.measureText(l).width + tracking;
    totalW -= tracking;
    let x = W/2 - totalW/2;
    for(const l of letters){
      ctx.fillText(l, x + ctx.measureText(l).width/2, y);
      x += ctx.measureText(l).width + tracking;
    }
    // dot lima a la izquierda del eyebrow
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
    // pequeña línea encima
    ctx.strokeStyle = 'rgba(232,255,0,.3)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(W/2 - 60, H - 160);
    ctx.lineTo(W/2 + 60, H - 160);
    ctx.stroke();
  }

  function wrapText(ctx, text, maxWidth){
    const words = text.split(' ');
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

  // ── TEMPLATES ──────────────────────────────────────────────────────────────
  function renderHero(ctx, d){
    drawBackground(ctx);
    drawEyebrow(ctx, d.eyebrow, 280);
    // SQUAD
    ctx.font = '900 italic 240px "Barlow Condensed", sans-serif';
    ctx.fillStyle = TEXT;
    ctx.textAlign = 'center';
    ctx.fillText(d.line1, W/2, H/2 - 80);
    // TEAM en lima
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
      // número grande lima
      ctx.font = '900 italic 84px "Barlow Condensed", sans-serif';
      ctx.fillStyle = ACC;
      ctx.fillText(`0${i+1}`, W/2 - 280, y);
      // texto blanco
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
    // sub
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
    // botón fake lima
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

  const RENDER = {
    hero: renderHero,
    question: renderQuestion,
    features: renderFeatures,
    manifesto: renderManifesto,
    cta: renderCta,
  };

  // ── OVERLAY UI ─────────────────────────────────────────────────────────────
  let _selected = TEMPLATES[0];
  let _state = { ...TEMPLATES[0].defaults };

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
        ${v.includes('\n')
          ? `<textarea data-key="${k}" rows="${v.split('\n').length+1}" style="width:100%;background:#1a1a1f;border:1px solid #2a2a35;border-radius:8px;padding:10px 12px;color:#fff;font-family:inherit;font-size:14px;resize:vertical">${v}</textarea>`
          : `<input data-key="${k}" type="text" value="${v.replace(/"/g,'&quot;')}" style="width:100%;background:#1a1a1f;border:1px solid #2a2a35;border-radius:8px;padding:10px 12px;color:#fff;font-family:inherit;font-size:14px">`}
      </div>`).join('');
    ov.innerHTML = `
    <div style="max-width:1200px;margin:0 auto">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:24px">
        <div>
          <div style="font-family:'Barlow Condensed',sans-serif;font-style:italic;font-weight:900;font-size:40px;line-height:.9">PROMO</div>
          <div style="font-size:12px;color:#9090a8;margin-top:4px">Generador de stories 1080×1920</div>
        </div>
        <button onclick="document.getElementById('promo-ov').remove()" style="background:#1a1a1f;border:1px solid #2a2a35;border-radius:10px;width:42px;height:42px;color:#fff;font-size:20px;cursor:pointer">×</button>
      </div>

      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:20px">
        ${TEMPLATES.map(t => `
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
    const t = TEMPLATES.find(x => x.id === id);
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
    const fn = RENDER[_selected.id];
    if(fn) fn(ctx, _state);
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

// Auto-open con ?promo=1
if(location.search.includes('promo=1')){
  document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => PROMO.open(), 300);
  });
}

window.PROMO = PROMO;
