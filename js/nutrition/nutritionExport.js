// ══════════════════════════════════════════
// SQUAD TEAM — Nutrition Export v3
// Pure Canvas — no CORS, no dependencies
// 1080x1920 Instagram Story
// ══════════════════════════════════════════

const NutritionExport = {
  Y: '#e8ff00',  // neon yellow
  BK: '#0a0a0a', // black
  W: '#ffffff',  // white
  G1: '#141414', // dark card
  G2: '#1f1f1f', // border
  G3: '#555555', // muted

  async exportMeal(meal, athName) {
    if (!meal) { if(typeof toast==='function') toast('Sin datos'); return; }
    if(typeof toast==='function') toast('Generando imagen...');

    // Wait for fonts
    try { await document.fonts.ready; } catch(e) {}
    // Extra wait to ensure fonts are loaded
    await new Promise(r => setTimeout(r, 200));

    const W = 1080, H = 1920;
    const canvas = document.createElement('canvas');
    canvas.width = W; canvas.height = H;
    const ctx = canvas.getContext('2d');

    const items = meal.items || [];
    const totals = typeof MacroCalc !== 'undefined'
      ? MacroCalc.calcMeal(items)
      : items.reduce((t,i) => ({
          kcal: t.kcal + Math.round((i.food?.p100?.kcal||i.food?.macrosPor100g?.kcal||0) * i.grams / 100),
          proteina: t.proteina + Math.round((i.food?.p100?.proteina||i.food?.macrosPor100g?.proteina||0) * i.grams / 100 * 10)/10,
          carbos: t.carbos + Math.round((i.food?.p100?.carbos||i.food?.macrosPor100g?.carbos||0) * i.grams / 100 * 10)/10,
          grasas: t.grasas + Math.round((i.food?.p100?.grasas||i.food?.macrosPor100g?.grasas||0) * i.grams / 100 * 10)/10,
        }), {kcal:0,proteina:0,carbos:0,grasas:0});

    const now = new Date();
    const dateStr = now.toLocaleDateString('es-UY',{day:'numeric',month:'long',year:'numeric'}).toUpperCase();
    const mealName = (meal.name || 'COMIDA').toUpperCase();

    // ── BACKGROUND ──
    ctx.fillStyle = this.BK;
    ctx.fillRect(0, 0, W, H);

    // Subtle grid texture
    ctx.strokeStyle = 'rgba(255,255,255,0.015)';
    ctx.lineWidth = 1;
    for(let x=0;x<W;x+=80){ ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,H);ctx.stroke(); }
    for(let y=0;y<H;y+=80){ ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y);ctx.stroke(); }

    // ── TOP BAR ──
    ctx.fillStyle = this.Y;
    ctx.fillRect(0, 0, W, 8);

    // ── HEADER ──
    let y = 70;
    // Logo bolt
    ctx.font = 'bold 38px Arial';
    ctx.fillStyle = this.Y;
    ctx.textAlign = 'left';
    ctx.fillText('⚡', 60, y);

    ctx.font = 'bold 34px Arial';
    ctx.fillText('SQUAD TEAM', 108, y);

    ctx.font = '500 16px Arial';
    ctx.fillStyle = '#444';
    ctx.fillText('NUTRITION PLAN', 108, y + 24);

    // Date top right
    ctx.font = '500 16px Arial';
    ctx.fillStyle = '#444';
    ctx.textAlign = 'right';
    ctx.fillText(dateStr, W - 60, y);
    ctx.fillText('PLAN PERSONALIZADO', W - 60, y + 24);

    // ── DECORATIVE LINE ──
    y = 130;
    ctx.strokeStyle = '#1a1a1a';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(60, y); ctx.lineTo(W-60, y); ctx.stroke();

    // ── MEAL TITLE ──
    y = 160;
    ctx.font = '500 16px Arial';
    ctx.fillStyle = this.Y;
    ctx.textAlign = 'left';
    ctx.letterSpacing = '5px';
    ctx.fillText('COMIDA DEL DÍA', 60, y + 20);

    y += 50;
    // Big meal name - split if too long
    const titleFont = mealName.length > 10 ? '900 italic 96px Arial' : '900 italic 128px Arial';
    ctx.font = titleFont;
    ctx.fillStyle = this.W;
    ctx.textAlign = 'left';
    ctx.fillText(mealName, 60, y + 100);

    // ── ATHLETE STRIP ──
    y += 160;
    ctx.fillStyle = '#0d0d0d';
    ctx.fillRect(0, y, W, 72);
    ctx.strokeStyle = '#1a1a1a';
    ctx.lineWidth = 1;
    ctx.strokeRect(0, y, W, 72);

    // Green dot
    ctx.fillStyle = this.Y;
    ctx.beginPath(); ctx.arc(72, y + 36, 5, 0, Math.PI*2); ctx.fill();

    ctx.font = 'bold 22px Arial';
    ctx.fillStyle = this.W;
    ctx.textAlign = 'left';
    ctx.fillText((athName || 'ALUMNO').toUpperCase(), 92, y + 42);

    ctx.font = '600 14px Arial';
    ctx.fillStyle = '#444';
    ctx.textAlign = 'right';
    ctx.fillText('SQUAD TEAM COACHING', W - 60, y + 42);

    // ── KCAL HERO ──
    y += 100;
    ctx.font = '700 160px Arial';
    ctx.fillStyle = this.Y;
    ctx.textAlign = 'left';
    ctx.fillText(totals.kcal.toLocaleString('es').replace(/,/g,' '), 60, y + 130);

    ctx.font = '600 18px Arial';
    ctx.fillStyle = '#444';
    ctx.fillText('KCAL TOTALES · ' + mealName, 60, y + 165);

    // ── MACRO CARDS ──
    y += 200;
    const macros = [
      { label:'PROTEÍNA', val:totals.proteina, color:'#3b82f6', pct: Math.min(100, totals.proteina/2) },
      { label:'CARBOS',   val:totals.carbos,   color:'#f59e0b', pct: Math.min(100, totals.carbos/3)   },
      { label:'GRASAS',   val:totals.grasas,   color:'#ef4444', pct: Math.min(100, totals.grasas/0.8) },
    ];
    const cardW = 300, cardH = 130, cardGap = 30;
    const cardsStartX = 60;

    macros.forEach((m, i) => {
      const cx = cardsStartX + i * (cardW + cardGap);
      // Card bg
      ctx.fillStyle = '#0d0d0d';
      this._rrect(ctx, cx, y, cardW, cardH, 8);
      ctx.strokeStyle = '#1a1a1a';
      ctx.lineWidth = 1;
      this._rrectStroke(ctx, cx, y, cardW, cardH, 8);

      // Progress bar
      ctx.fillStyle = '#1a1a1a';
      ctx.fillRect(cx + 16, y + 16, cardW - 32, 3);
      ctx.fillStyle = m.color;
      ctx.fillRect(cx + 16, y + 16, (cardW - 32) * m.pct / 100, 3);

      // Value
      ctx.font = '700 48px Arial';
      ctx.fillStyle = m.color;
      ctx.textAlign = 'left';
      ctx.fillText(`${m.val}g`, cx + 16, y + 80);

      // Label
      ctx.font = '600 13px Arial';
      ctx.fillStyle = '#555';
      ctx.fillText(m.label, cx + 16, y + 110);
    });

    // ── SECTION HEADER ──
    y += cardH + 40;
    ctx.strokeStyle = '#1a1a1a';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(60, y); ctx.lineTo(W-60, y); ctx.stroke();

    ctx.font = '700 13px Arial';
    ctx.fillStyle = '#333';
    ctx.textAlign = 'left';
    ctx.fillText('ALIMENTOS', 60, y - 10);
    ctx.textAlign = 'right';
    ctx.fillText(items.length + ' ITEMS', W - 60, y - 10);

    // ── FOOD ITEMS ──
    y += 20;
    const displayItems = items.slice(0, 7);
    const rowH = Math.min(100, Math.floor((H - y - 200) / Math.max(displayItems.length, 1)));

    displayItems.forEach((item, i) => {
      const foodName = item.food?.nombre || item.food?.n || '—';
      const grams = item.grams || 0;
      const kcal = Math.round((item.food?.macrosPor100g?.kcal || item.food?.p100?.kcal || 0) * grams / 100);

      // Row bg alternating
      if (i % 2 === 0) {
        ctx.fillStyle = 'rgba(255,255,255,0.02)';
        ctx.fillRect(0, y, W, rowH);
      }

      // Grams (yellow)
      ctx.font = '700 42px Arial';
      ctx.fillStyle = this.Y;
      ctx.textAlign = 'right';
      ctx.fillText(grams, 148, y + rowH * 0.62);

      ctx.font = '500 16px Arial';
      ctx.fillStyle = '#444';
      ctx.fillText('g', 162, y + rowH * 0.62);

      // Separator
      ctx.strokeStyle = '#1f1f1f';
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(180, y + rowH * 0.2); ctx.lineTo(180, y + rowH * 0.8); ctx.stroke();

      // Food name
      ctx.font = '600 26px Arial';
      ctx.fillStyle = '#e4e4e7';
      ctx.textAlign = 'left';
      // Truncate if too long
      let name = foodName;
      while (ctx.measureText(name).width > 680 && name.length > 10) name = name.slice(0, -1);
      if (name !== foodName) name += '…';
      ctx.fillText(name, 200, y + rowH * 0.62);

      // Kcal (right)
      ctx.font = '700 26px Arial';
      ctx.fillStyle = '#2a2a2a';
      ctx.textAlign = 'right';
      ctx.fillText(kcal, W - 60, y + rowH * 0.52);
      ctx.font = '500 14px Arial';
      ctx.fillStyle = '#222';
      ctx.fillText('kcal', W - 60, y + rowH * 0.74);

      // Bottom line
      ctx.strokeStyle = '#111';
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(60, y + rowH); ctx.lineTo(W - 60, y + rowH); ctx.stroke();

      y += rowH;
    });

    // ── QUOTE ──
    y = H - 200;
    ctx.strokeStyle = '#1a1a1a';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(60, y); ctx.lineTo(W-60, y); ctx.stroke();

    y += 40;
    ctx.font = 'italic 500 28px Georgia, serif';
    ctx.fillStyle = '#333';
    ctx.textAlign = 'center';
    ctx.fillText('"Construyendo el físico desde lo diario"', W / 2, y);

    // ── FOOTER ──
    y = H - 100;
    ctx.font = 'bold 22px Arial';
    ctx.fillStyle = this.Y;
    ctx.textAlign = 'left';
    ctx.fillText('SQUAD TEAM', 60, y);

    ctx.font = '500 15px Arial';
    ctx.fillStyle = '#333';
    ctx.textAlign = 'left';
    ctx.fillText('COACHING PREMIUM · URUGUAY', 60, y + 28);

    ctx.font = '500 15px Arial';
    ctx.fillStyle = '#333';
    ctx.textAlign = 'right';
    ctx.fillText(now.toLocaleDateString('es-UY', {month:'long', year:'numeric'}).toUpperCase(), W - 60, y + 14);

    // ── BOTTOM BAR ──
    ctx.fillStyle = this.Y;
    ctx.fillRect(0, H - 8, W, 8);

    // ── DOWNLOAD ──
    const filename = `squad-${mealName.toLowerCase().replace(/\s+/g,'-')}-${(athName||'plan').toLowerCase().replace(/\s+/g,'-')}.png`;
    const link = document.createElement('a');
    link.download = filename;
    link.href = canvas.toDataURL('image/png', 1.0);
    link.click();
    if(typeof toast==='function') toast('📸 Story exportada!');
  },

  _rrect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x+r, y); ctx.lineTo(x+w-r, y); ctx.arcTo(x+w, y, x+w, y+r, r);
    ctx.lineTo(x+w, y+h-r); ctx.arcTo(x+w, y+h, x+w-r, y+h, r);
    ctx.lineTo(x+r, y+h); ctx.arcTo(x, y+h, x, y+h-r, r);
    ctx.lineTo(x, y+r); ctx.arcTo(x, y, x+r, y, r);
    ctx.closePath(); ctx.fill();
  },
  _rrectStroke(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x+r, y); ctx.lineTo(x+w-r, y); ctx.arcTo(x+w, y, x+w, y+r, r);
    ctx.lineTo(x+w, y+h-r); ctx.arcTo(x+w, y+h, x+w-r, y+h, r);
    ctx.lineTo(x+r, y+h); ctx.arcTo(x, y+h, x, y+h-r, r);
    ctx.lineTo(x, y+r); ctx.arcTo(x, y, x+r, y, r);
    ctx.closePath(); ctx.stroke();
  },

  async exportDaySummary(meals, target, athName) {
    const all = meals.flatMap(m => m.items || []);
    await this.exportMeal({ name: 'Resumen del Día', items: all }, athName);
  },

  async exportAll(meals, athName) {
    for (const m of meals) {
      await this.exportMeal(m, athName);
      await new Promise(r => setTimeout(r, 600));
    }
  }
};
