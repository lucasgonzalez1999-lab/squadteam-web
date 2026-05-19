// ══════════════════════════════════════════
// SQUAD TEAM — Meal Builder
// Constructor visual de comidas por alumno
// ══════════════════════════════════════════

// State
let _nbAth   = null;  // Athlete being edited
let _nbPlan  = null;  // Current nutrition plan
let _nbSearch = '';
let _nbSearchCat = '';
let _nbAddingTo = null; // meal index where we're adding

// ── LOAD / SAVE PLAN ──
async function nbLoadPlan(athId){
  _nbAth = athletes.find(a=>a.id===athId);
  if(!_nbAth) return null;

  // Try Firebase
  try{
    const doc = await window.db?.collection('nutritionPlans').doc(athId).get();
    if(doc?.exists){
      const d = doc.data();
      let plan = d.plan;
      if(typeof plan==='string') try{ plan=JSON.parse(plan); }catch(e){ plan=null; }
      if(plan){ _nbPlan=plan; DB.set('nutr_plan_'+athId, plan); return plan; }
    }
  }catch(e){}

  // Fallback to localStorage
  const local = DB.get('nutr_plan_'+athId);
  if(local){ _nbPlan=local; return local; }

  // Default empty plan with athlete's macro targets
  const diet = _nbAth.diet || {};
  _nbPlan = {
    athId,
    target: { kcal: diet.kcal||2500, proteina: diet.prot||180, carbos: diet.carbs||280, grasas: diet.fat||65 },
    meals: [
      { name:'Desayuno', items:[] },
      { name:'Almuerzo', items:[] },
      { name:'Merienda', items:[] },
      { name:'Cena', items:[] },
    ]
  };
  return _nbPlan;
}

async function nbSavePlan(){
  if(!_nbPlan || !_nbAth) return;
  DB.set('nutr_plan_'+_nbAth.id, _nbPlan);
  try{
    await window.db?.collection('nutritionPlans').doc(_nbAth.id).set({plan:JSON.stringify(_nbPlan)});
  }catch(e){}
}

// ── RENDER FULL NUTRITION SECTION ──
async function renderNutritionBuilder(cont, athId){
  await FoodDB.getAll(); // ensure cache loaded
  const plan = await nbLoadPlan(athId);
  if(!plan) return;
  const day = MacroCalc.calcDay(plan.meals);
  const diff = MacroCalc.diff(day, plan.target);
  const suggestions = MacroCalc.suggest(diff);
  const color = typeof athColor === 'function' ? athColor(athId) : '#16a34a';

  cont.innerHTML = `
  <div style="padding:20px;max-width:1100px;margin:0 auto" id="nb-root">

    <!-- Header -->
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;flex-wrap:wrap;gap:10px">
      <div>
        <div style="font-size:18px;font-weight:800;color:var(--text)">Nutrition — ${_nbAth.name}</div>
        <div style="font-size:13px;color:var(--sub);margin-top:2px">Constructor de dieta · todos los cambios se guardan automáticamente</div>
      </div>
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        <button onclick="nbAddMeal()" style="padding:8px 14px;border-radius:8px;border:1px solid var(--border2);background:var(--surf2);color:var(--text);font-size:13px;font-weight:600;cursor:pointer;font-family:inherit">+ Comida</button>
        <button onclick="nbAutoCuadrar()" style="padding:8px 14px;border-radius:8px;border:1px solid var(--border2);background:var(--surf2);color:var(--text);font-size:13px;font-weight:600;cursor:pointer;font-family:inherit">Auto-cuadrar</button>
        <button onclick="NutritionExport.exportDaySummary(_nbPlan.meals,_nbPlan.target,'${_nbAth.name}')" style="padding:8px 14px;border-radius:8px;background:#0a0a0a;color:#e8ff00;border:none;font-size:13px;font-weight:700;cursor:pointer;font-family:inherit">📸 Exportar día</button>
      </div>
    </div>

    <!-- Targets + Totals -->
    <div style="background:var(--surf);border:1px solid var(--border);border-radius:14px;padding:16px;margin-bottom:20px;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
        <div style="font-size:11px;font-weight:700;color:var(--sub);letter-spacing:1.5px;text-transform:uppercase">Progreso del día</div>
        <button onclick="nbEditTarget()" style="font-size:12px;color:var(--text2);background:none;border:none;cursor:pointer;font-weight:600">Editar objetivo</button>
      </div>
      <div id="nb-targets-bar">${nbTargetsBarHTML(day, plan.target, color)}</div>
    </div>

    <!-- Smart suggestions -->
    ${suggestions.length ? `
    <div style="background:var(--surf);border:1px solid var(--border);border-radius:14px;padding:16px;margin-bottom:20px;" id="nb-suggestions">
      <div style="font-size:11px;font-weight:700;color:var(--sub);letter-spacing:1.5px;text-transform:uppercase;margin-bottom:10px">Sugerencias</div>
      ${suggestions.map(s=>`
        <div style="display:flex;align-items:flex-start;gap:10px;padding:9px 0;border-bottom:1px solid var(--border)">
          <div style="width:6px;height:6px;border-radius:50%;background:var(--acc);margin-top:5px;flex-shrink:0"></div>
          <div><div style="font-size:13px;font-weight:600;color:var(--text)">${s.text}</div>
          <div style="font-size:12px;color:var(--sub)">${s.action}</div></div>
        </div>`).join('')}
    </div>` : ''}

    <!-- Quick text mode -->
    <div style="background:var(--surf);border:1px solid var(--border);border-radius:14px;padding:16px;margin-bottom:20px;">
      <div style="font-size:11px;font-weight:700;color:var(--sub);letter-spacing:1.5px;text-transform:uppercase;margin-bottom:8px">Modo rápido</div>
      <div style="font-size:12px;color:var(--sub);margin-bottom:10px">Escribí los alimentos en texto libre, el sistema los detecta automáticamente</div>
      <select id="nb-quick-meal" style="padding:8px 10px;border:1px solid var(--border);border-radius:8px;font-family:inherit;font-size:13px;margin-bottom:8px;width:100%;background:var(--surf2);color:var(--text)">
        ${plan.meals.map((m,i)=>`<option value="${i}">${m.name}</option>`).join('')}
      </select>
      <textarea id="nb-quick-input" placeholder="100 avena&#10;30 whey&#10;120 banana&#10;20 mantequilla mani" style="width:100%;padding:10px;border:1px solid var(--border);border-radius:8px;font-family:inherit;font-size:13px;height:90px;resize:vertical;background:var(--surf2);color:var(--text)"></textarea>
      <button onclick="nbParseQuick()" style="margin-top:8px;padding:8px 16px;background:var(--acc);color:#000;border:none;border-radius:8px;font-size:13px;font-weight:700;cursor:pointer;font-family:inherit">Agregar</button>
    </div>

    <!-- Meals -->
    <div style="display:grid;gap:16px" id="nb-meals">
      ${plan.meals.map((meal,i)=>nbMealCardHTML(meal,i,color)).join('')}
    </div>

    <!-- Food search modal (hidden) -->
    <div id="nb-search-modal" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,.75);z-index:9100;align-items:flex-end;justify-content:center;padding:0;backdrop-filter:blur(4px)">
      <div style="background:var(--surf2);border:1px solid var(--border2);border-radius:20px 20px 0 0;width:100%;max-width:600px;max-height:80vh;overflow:hidden;display:flex;flex-direction:column;position:relative">
        <div style="padding:16px 16px 8px;border-bottom:1px solid var(--border)">
          <div style="font-size:13px;font-weight:700;color:var(--text);margin-bottom:10px;letter-spacing:.5px;text-transform:uppercase">Buscar alimento</div>
          <input id="nb-search-input" type="search" placeholder="Buscar..." autocomplete="off"
            style="width:100%;padding:10px 12px;border:1px solid var(--border2);border-radius:10px;font-size:14px;font-family:inherit;outline:none;background:var(--surf3);color:var(--text)"
            oninput="nbSearchFoods(this.value)" autofocus>
          <div style="display:flex;gap:6px;margin-top:8px;overflow-x:auto;padding-bottom:4px">
            <button onclick="nbSetCat('')" class="nb-cat-btn nb-cat-active">Todos</button>
            ${Object.entries(FOOD_CATEGORIES).map(([id,{label,icon}])=>`<button onclick="nbSetCat('${id}')" class="nb-cat-btn">${label}</button>`).join('')}
          </div>
        </div>
        <div id="nb-search-results" style="overflow-y:auto;padding:8px 16px;flex:1"></div>
        <div style="padding:12px 16px;border-top:1px solid var(--border)">
          <button onclick="nbOpenAddCustom()" style="width:100%;padding:10px;border:1px dashed var(--border2);border-radius:8px;font-size:13px;color:var(--sub);background:none;cursor:pointer;font-family:inherit">+ Agregar alimento personalizado</button>
        </div>
        <button onclick="nbCloseSearch()" style="position:absolute;top:14px;right:14px;background:none;border:none;font-size:20px;cursor:pointer;color:var(--sub)">✕</button>
      </div>
    </div>

    <!-- Add custom food modal -->
    <div id="nb-custom-modal" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,.75);z-index:9200;align-items:center;justify-content:center;padding:20px;backdrop-filter:blur(4px)">
      <div style="background:var(--surf2);border:1px solid var(--border2);border-radius:16px;width:100%;max-width:480px;padding:20px">
        <div style="font-size:13px;font-weight:700;color:var(--text);margin-bottom:16px;letter-spacing:.5px;text-transform:uppercase">Agregar alimento personalizado</div>
        <input id="nc-nombre" placeholder="Nombre" style="width:100%;padding:9px 12px;border:1px solid var(--border);border-radius:8px;margin-bottom:8px;font-family:inherit;font-size:14px;background:var(--surf3);color:var(--text)">
        <select id="nc-cat" style="width:100%;padding:9px 12px;border:1px solid var(--border);border-radius:8px;margin-bottom:8px;font-family:inherit;font-size:14px;background:var(--surf3);color:var(--text)">
          ${Object.entries(FOOD_CATEGORIES).map(([id,{label}])=>`<option value="${id}">${label}</option>`).join('')}
        </select>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:12px">
          <input id="nc-kcal" type="number" placeholder="kcal /100g" style="padding:9px 12px;border:1px solid var(--border);border-radius:8px;font-family:inherit;font-size:14px;background:var(--surf3);color:var(--text)">
          <input id="nc-prot" type="number" placeholder="Proteína g/100g" style="padding:9px 12px;border:1px solid var(--border);border-radius:8px;font-family:inherit;font-size:14px;background:var(--surf3);color:var(--text)">
          <input id="nc-carbs" type="number" placeholder="Carbos g/100g" style="padding:9px 12px;border:1px solid var(--border);border-radius:8px;font-family:inherit;font-size:14px;background:var(--surf3);color:var(--text)">
          <input id="nc-fat" type="number" placeholder="Grasas g/100g" style="padding:9px 12px;border:1px solid var(--border);border-radius:8px;font-family:inherit;font-size:14px;background:var(--surf3);color:var(--text)">
        </div>
        <div style="display:flex;gap:8px">
          <button onclick="nbSaveCustomFood()" style="flex:1;padding:10px;background:var(--acc);color:#000;border:none;border-radius:8px;font-size:14px;font-weight:700;cursor:pointer;font-family:inherit">Guardar</button>
          <button onclick="document.getElementById('nb-custom-modal').style.display='none'" style="flex:1;padding:10px;background:var(--surf3);border:1px solid var(--border);border-radius:8px;font-size:14px;cursor:pointer;font-family:inherit;color:var(--text2)">Cancelar</button>
        </div>
      </div>
    </div>
  </div>
  <style>
    .nb-cat-btn{padding:5px 10px;border-radius:8px;border:1px solid var(--border);background:var(--surf3);color:var(--text2);font-size:12px;white-space:nowrap;cursor:pointer;font-family:inherit;transition:all .12s}
    .nb-cat-active{background:var(--acc);color:#000;border-color:var(--acc);font-weight:700}
  </style>`;

  // Load initial search results
  nbSearchFoods('');
}

function nbTargetsBarHTML(day, target, color){
  const macros = [
    { label:'Kcal', cur:day.kcal, tgt:target.kcal, unit:'', color:'#f59e0b' },
    { label:'Proteína', cur:day.proteina, tgt:target.proteina, unit:'g', color:'#3b82f6' },
    { label:'Carbos', cur:day.carbos, tgt:target.carbos, unit:'g', color:'#f97316' },
    { label:'Grasas', cur:day.grasas, tgt:target.grasas, unit:'g', color:'#ef4444' },
  ];
  return `<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px">
    ${macros.map(m=>{
      const pct = Math.min(Math.round((m.cur/Math.max(m.tgt,1))*100), 120);
      const over = pct > 100;
      return `<div>
        <div style="display:flex;justify-content:space-between;margin-bottom:4px">
          <span style="font-size:12px;font-weight:600;color:var(--sub)">${m.label}</span>
          <span style="font-size:12px;font-weight:700;color:${over?'#ef4444':m.color}">${m.cur}${m.unit} / ${m.tgt}${m.unit}</span>
        </div>
        <div style="height:5px;background:var(--surf3);border-radius:4px;overflow:hidden">
          <div style="height:100%;width:${Math.min(pct,100)}%;background:${over?'#ef4444':m.color};border-radius:4px;transition:width .3s"></div>
        </div>
        <div style="font-size:11px;color:var(--sub);margin-top:2px;text-align:right">${pct}%</div>
      </div>`;
    }).join('')}
  </div>`;
}

function nbMealCardHTML(meal, idx, color){
  const totals = MacroCalc.calcMeal(meal.items || []);
  return `<div style="background:var(--surf);border:1px solid var(--border);border-radius:14px;overflow:hidden;" id="nb-meal-${idx}">
    <div style="padding:14px 16px;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between;background:var(--surf2)">
      <div style="display:flex;align-items:center;gap:8px">
        <span style="font-size:13px;font-weight:800;color:var(--text)">${meal.name}</span>
        <span style="font-size:12px;font-weight:700;color:${color}">${totals.kcal} kcal</span>
        <span style="font-size:11px;color:var(--sub)">${totals.proteina}P · ${totals.carbos}C · ${totals.grasas}G</span>
      </div>
      <div style="display:flex;gap:4px">
        <button onclick="nbOpenSearch(${idx})" style="padding:5px 12px;background:var(--acc);color:#000;border:none;border-radius:6px;font-size:12px;font-weight:700;cursor:pointer;font-family:inherit">+ Agregar</button>
        <button onclick="NutritionExport.exportMeal(_nbPlan.meals[${idx}],'${_nbAth?.name||''}')" style="padding:5px 8px;background:var(--surf3);border:1px solid var(--border);border-radius:6px;font-size:12px;cursor:pointer;color:var(--text2)" title="Exportar">Export</button>
        <button onclick="nbDeleteMeal(${idx})" style="padding:5px 8px;background:none;border:1px solid var(--border);border-radius:6px;font-size:12px;cursor:pointer;color:var(--red)" title="Eliminar">✕</button>
      </div>
    </div>
    <div style="padding:8px">
      ${(meal.items||[]).length === 0 ? `<div style="text-align:center;padding:16px;color:var(--sub);font-size:13px">Sin alimentos · Click en "+ Agregar"</div>` :
        (meal.items||[]).map((item,fi)=>{
          const m = MacroCalc.calcFood(item.food, item.grams);
          return `<div style="display:flex;align-items:center;gap:8px;padding:8px 6px;border-radius:8px;transition:background .1s" onmouseover="this.style.background='#18181f'" onmouseout="this.style.background='transparent'">
            <div style="flex-shrink:0;display:flex;align-items:center;gap:3px">
              <input type="number" value="${item.grams}" min="1" max="2000" step="5"
                style="width:62px;padding:5px 7px;border:1px solid var(--border);border-radius:6px;font-size:14px;font-weight:700;text-align:right;font-family:inherit;color:var(--acc);background:var(--surf3)"
                onchange="nbUpdateGrams(${idx},${fi},this.value)">
              <span style="font-size:12px;color:var(--sub);font-weight:500">g</span>
            </div>
            <div style="flex:1;min-width:0">
              <div style="font-size:13px;font-weight:600;color:var(--text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${item.food.nombre}</div>
              <div style="font-size:11px;color:var(--sub)">${m.kcal} kcal · ${m.proteina}P ${m.carbos}C ${m.grasas}G</div>
            </div>
            <button onclick="nbRemoveItem(${idx},${fi})" style="background:none;border:none;color:#ef4444;cursor:pointer;padding:4px;font-size:14px">✕</button>
          </div>`;
        }).join('')}
    </div>
  </div>`;
}

// ── SEARCH ──
function nbOpenSearch(mealIdx){
  _nbAddingTo = mealIdx;
  const modal = document.getElementById('nb-search-modal');
  if(!modal) return;
  modal.style.display='flex';
  setTimeout(()=>document.getElementById('nb-search-input')?.focus(), 100);
  nbSearchFoods('');
}

function nbCloseSearch(){
  const modal = document.getElementById('nb-search-modal');
  if(modal) modal.style.display='none';
  _nbAddingTo = null;
}

let _nbSearchTimer = null;
function nbSearchFoods(q){
  clearTimeout(_nbSearchTimer);
  _nbSearchTimer = setTimeout(()=>{
    _nbSearch = q;
    const results = FoodDB.search(q, _nbSearchCat);
    const cont = document.getElementById('nb-search-results');
    if(!cont) return;
    const color = typeof athColor==='function' && _nbAth ? athColor(_nbAth.id) : '#16a34a';

    cont.innerHTML = results.map(food=>{
      const cat = FOOD_CATEGORIES[food.categoria];
      return `<div style="display:flex;align-items:center;gap:10px;padding:10px 0;border-bottom:1px solid var(--border);cursor:pointer;transition:background .1s" onmouseover="this.style.background='#18181f'" onmouseout="this.style.background=''" onclick="nbSelectFood('${food.id}')">
        <span style="font-size:16px;width:24px;text-align:center;opacity:.7">${cat?.icon||'·'}</span>
        <div style="flex:1">
          <div style="font-size:14px;font-weight:600;color:var(--text)">${food.nombre}</div>
          <div style="font-size:11px;color:var(--sub)">${food.macrosPor100g.kcal}kcal · ${food.macrosPor100g.proteina}P ${food.macrosPor100g.carbos}C ${food.macrosPor100g.grasas}G por 100g</div>
        </div>
        <div style="display:flex;flex-direction:column;align-items:flex-end;gap:3px">
          <input type="number" id="nb-grams-${food.id}" value="100" min="1" max="1000" step="5" onclick="event.stopPropagation()"
            style="width:64px;padding:5px 7px;border:1px solid var(--border2);border-radius:7px;font-size:14px;font-weight:700;text-align:center;font-family:inherit;color:var(--acc);background:var(--surf3)">
          <span style="font-size:10px;color:var(--sub)">gramos</span>
        </div>
      </div>`;
    }).join('') || '<div style="text-align:center;padding:20px;color:var(--sub);font-size:13px">Sin resultados</div>';
  }, 200);
}

function nbSetCat(cat){
  _nbSearchCat = cat;
  document.querySelectorAll('.nb-cat-btn').forEach(b=>{
    b.classList.remove('nb-cat-active');
    if((!cat&&b.textContent.trim()==='Todos')||b.onclick?.toString().includes(`'${cat}'`)) b.classList.add('nb-cat-active');
  });
  nbSearchFoods(_nbSearch);
}

function nbSelectFood(foodId){
  const food = FoodDB.getById(foodId);
  if(!food || _nbAddingTo === null) return;
  const gramsInput = document.getElementById('nb-grams-'+foodId);
  const grams = parseFloat(gramsInput?.value)||100;
  _nbPlan.meals[_nbAddingTo].items.push({ food, grams });
  nbSavePlan();
  nbCloseSearch();
  nbRefresh();
}

function nbRefresh(){
  const cont = document.getElementById('checkins-content') || document.getElementById('nutricion-content');
  if(!cont) return;
  const day = MacroCalc.calcDay(_nbPlan.meals);
  const diff = MacroCalc.diff(day, _nbPlan.target);
  const color = typeof athColor==='function' && _nbAth ? athColor(_nbAth.id) : '#16a34a';

  // Update targets bar
  const bar = document.getElementById('nb-targets-bar');
  if(bar) bar.innerHTML = nbTargetsBarHTML(day, _nbPlan.target, color);

  // Update suggestions
  const sugDiv = document.getElementById('nb-suggestions');
  const suggs = MacroCalc.suggest(diff);
  if(sugDiv){
    sugDiv.innerHTML = `<div style="font-size:11px;font-weight:700;color:var(--sub);letter-spacing:1.5px;text-transform:uppercase;margin-bottom:10px">Sugerencias</div>` +
      suggs.map(s=>`<div style="display:flex;align-items:flex-start;gap:10px;padding:9px 0;border-bottom:1px solid var(--border)"><div style="width:6px;height:6px;border-radius:50%;background:var(--acc);margin-top:5px;flex-shrink:0"></div><div><div style="font-size:13px;font-weight:600;color:var(--text)">${s.text}</div><div style="font-size:12px;color:var(--sub)">${s.action}</div></div></div>`).join('');
  }

  // Update meal cards
  const mealsDiv = document.getElementById('nb-meals');
  if(mealsDiv) mealsDiv.innerHTML = _nbPlan.meals.map((m,i)=>nbMealCardHTML(m,i,color)).join('');
}

function nbUpdateGrams(mealIdx, itemIdx, val){
  if(!_nbPlan) return;
  _nbPlan.meals[mealIdx].items[itemIdx].grams = parseFloat(val)||0;
  nbSavePlan();
  nbRefresh();
}

function nbRemoveItem(mealIdx, itemIdx){
  if(!_nbPlan) return;
  _nbPlan.meals[mealIdx].items.splice(itemIdx, 1);
  nbSavePlan();
  nbRefresh();
}

function nbDeleteMeal(idx){
  if(!_nbPlan||!confirm('¿Eliminar esta comida?')) return;
  _nbPlan.meals.splice(idx, 1);
  nbSavePlan();
  nbRefresh();
}

function nbAddMeal(){
  if(!_nbPlan) return;
  const name = prompt('Nombre de la comida (ej: "Pre-entreno"):') || `Comida ${_nbPlan.meals.length+1}`;
  _nbPlan.meals.push({ name, items:[] });
  nbSavePlan();
  nbRefresh();
}

function nbEditTarget(){
  if(!_nbPlan) return;
  const t = _nbPlan.target;
  const kcal = prompt('Kcal objetivo:', t.kcal);
  if(!kcal) return;
  const prot = prompt('Proteína (g):', t.proteina);
  const carbs = prompt('Carbos (g):', t.carbos);
  const fat = prompt('Grasas (g):', t.grasas);
  _nbPlan.target = { kcal:parseFloat(kcal)||t.kcal, proteina:parseFloat(prot)||t.proteina, carbos:parseFloat(carbs)||t.carbos, grasas:parseFloat(fat)||t.grasas };
  nbSavePlan();
  nbRefresh();
}

function nbAutoCuadrar(){
  if(!_nbPlan) return;
  const n = prompt('¿Cuántas comidas?', _nbPlan.meals.length);
  if(!n) return;
  const newMeals = MacroCalc.autoCuadrar(_nbPlan.target, parseInt(n)||4);
  _nbPlan.meals = newMeals;
  nbSavePlan();
  nbRefresh();
  if(typeof toast==='function') toast('⚡ Dieta auto-cuadrada!');
}

// ── QUICK TEXT MODE ──
function nbParseQuick(){
  const mealIdx = parseInt(document.getElementById('nb-quick-meal')?.value)||0;
  const text = document.getElementById('nb-quick-input')?.value||'';
  if(!text.trim()||!_nbPlan) return;

  const lines = text.trim().split('\n');
  let added = 0;
  lines.forEach(line=>{
    const m = line.trim().match(/^(\d+(?:\.\d+)?)\s+(.+)$/);
    if(!m) return;
    const grams = parseFloat(m[1]);
    const query = m[2].toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim();
    const found = FoodDB.search(query)[0];
    if(found){
      _nbPlan.meals[mealIdx].items.push({ food:found, grams });
      added++;
    }
  });
  if(added){
    nbSavePlan(); nbRefresh();
    document.getElementById('nb-quick-input').value='';
    if(typeof toast==='function') toast(`✓ ${added} alimentos agregados`);
  } else {
    if(typeof toast==='function') toast('No se reconocieron alimentos. Revisá los nombres.');
  }
}

// ── CUSTOM FOOD ──
function nbOpenAddCustom(){
  document.getElementById('nb-custom-modal').style.display='flex';
}

async function nbSaveCustomFood(){
  const nombre = document.getElementById('nc-nombre')?.value?.trim();
  if(!nombre){ if(typeof toast==='function') toast('Ingresá un nombre'); return; }
  const food = {
    nombre,
    categoria: document.getElementById('nc-cat')?.value||'personalizado',
    unidadBase: 'g',
    macrosPor100g: {
      kcal:    parseFloat(document.getElementById('nc-kcal')?.value)||0,
      proteina:parseFloat(document.getElementById('nc-prot')?.value)||0,
      carbos:  parseFloat(document.getElementById('nc-carbs')?.value)||0,
      grasas:  parseFloat(document.getElementById('nc-fat')?.value)||0,
    }
  };
  await FoodDB.addCustom(food);
  document.getElementById('nb-custom-modal').style.display='none';
  if(typeof toast==='function') toast(`✓ "${nombre}" agregado a tu base de datos`);
  nbSearchFoods(_nbSearch);
}
