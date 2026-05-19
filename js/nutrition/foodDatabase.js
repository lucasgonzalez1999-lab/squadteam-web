// ══════════════════════════════════════════
// SQUAD TEAM — Food Database
// Base local + Firebase cache + API ready
// ══════════════════════════════════════════

const FOOD_CATEGORIES = {
  proteinas:   { label: 'Proteínas',   icon: '🍗' },
  carbohidratos:{ label: 'Carbohidratos', icon: '🍚' },
  grasas:      { label: 'Grasas',      icon: '🥑' },
  frutas:      { label: 'Frutas',      icon: '🍌' },
  vegetales:   { label: 'Vegetales',   icon: '🥦' },
  lacteos:     { label: 'Lácteos',     icon: '🥛' },
  suplementos: { label: 'Suplementos', icon: '💊' },
  snacks:      { label: 'Snacks',      icon: '🫙' },
  personalizado:{ label: 'Personalizado', icon: '⭐' },
};

const BASE_FOODS = [
  // PROTEÍNAS
  { id:'pollo_pecho', nombre:'Pecho de pollo', categoria:'proteinas', unidadBase:'g', macrosPor100g:{ kcal:165, proteina:31, carbos:0, grasas:3.6 } },
  { id:'carne_molida_magra', nombre:'Carne molida magra (90%)', categoria:'proteinas', unidadBase:'g', macrosPor100g:{ kcal:176, proteina:20, carbos:0, grasas:10 } },
  { id:'salmon', nombre:'Salmón', categoria:'proteinas', unidadBase:'g', macrosPor100g:{ kcal:208, proteina:20, carbos:0, grasas:13 } },
  { id:'atun_lata', nombre:'Atún en lata (al agua)', categoria:'proteinas', unidadBase:'g', macrosPor100g:{ kcal:116, proteina:26, carbos:0, grasas:1 } },
  { id:'claras_huevo', nombre:'Claras de huevo', categoria:'proteinas', unidadBase:'g', macrosPor100g:{ kcal:52, proteina:11, carbos:0.7, grasas:0.2 } },
  { id:'huevo_entero', nombre:'Huevo entero', categoria:'proteinas', unidadBase:'unidad', macrosPor100g:{ kcal:155, proteina:13, carbos:1.1, grasas:11 }, pesoUnidad:60 },
  { id:'cerdo_lomo', nombre:'Lomo de cerdo', categoria:'proteinas', unidadBase:'g', macrosPor100g:{ kcal:143, proteina:26, carbos:0, grasas:3.5 } },
  { id:'pavo_pecho', nombre:'Pechuga de pavo', categoria:'proteinas', unidadBase:'g', macrosPor100g:{ kcal:135, proteina:30, carbos:0, grasas:1 } },

  // CARBOHIDRATOS
  { id:'arroz_blanco_crudo', nombre:'Arroz blanco crudo', categoria:'carbohidratos', unidadBase:'g', macrosPor100g:{ kcal:365, proteina:7, carbos:80, grasas:0.7 } },
  { id:'avena_cruda', nombre:'Avena cruda', categoria:'carbohidratos', unidadBase:'g', macrosPor100g:{ kcal:389, proteina:17, carbos:66, grasas:7 } },
  { id:'papa_cruda', nombre:'Papa cruda', categoria:'carbohidratos', unidadBase:'g', macrosPor100g:{ kcal:77, proteina:2, carbos:17, grasas:0.1 } },
  { id:'boniato', nombre:'Boniato/Batata', categoria:'carbohidratos', unidadBase:'g', macrosPor100g:{ kcal:86, proteina:1.6, carbos:20, grasas:0.1 } },
  { id:'pan_integral', nombre:'Pan integral', categoria:'carbohidratos', unidadBase:'g', macrosPor100g:{ kcal:247, proteina:13, carbos:41, grasas:4 } },
  { id:'pasta_cruda', nombre:'Pasta (espagueti crudo)', categoria:'carbohidratos', unidadBase:'g', macrosPor100g:{ kcal:371, proteina:13, carbos:74, grasas:1.5 } },
  { id:'galletas_arroz', nombre:'Galletas de arroz', categoria:'carbohidratos', unidadBase:'g', macrosPor100g:{ kcal:387, proteina:8, carbos:82, grasas:3 } },
  { id:'quinoa_cruda', nombre:'Quinoa cruda', categoria:'carbohidratos', unidadBase:'g', macrosPor100g:{ kcal:368, proteina:14, carbos:64, grasas:6 } },
  { id:'lentejas_crudas', nombre:'Lentejas crudas', categoria:'carbohidratos', unidadBase:'g', macrosPor100g:{ kcal:353, proteina:25, carbos:60, grasas:1 } },

  // GRASAS
  { id:'aceite_oliva', nombre:'Aceite de oliva', categoria:'grasas', unidadBase:'g', macrosPor100g:{ kcal:884, proteina:0, carbos:0, grasas:100 } },
  { id:'mantequilla_mani', nombre:'Mantequilla de maní', categoria:'grasas', unidadBase:'g', macrosPor100g:{ kcal:588, proteina:25, carbos:20, grasas:50 } },
  { id:'almendras', nombre:'Almendras', categoria:'grasas', unidadBase:'g', macrosPor100g:{ kcal:579, proteina:21, carbos:22, grasas:50 } },
  { id:'aguacate', nombre:'Aguacate/Palta', categoria:'grasas', unidadBase:'g', macrosPor100g:{ kcal:160, proteina:2, carbos:9, grasas:15 } },
  { id:'nueces', nombre:'Nueces', categoria:'grasas', unidadBase:'g', macrosPor100g:{ kcal:654, proteina:15, carbos:14, grasas:65 } },
  { id:'semillas_chia', nombre:'Semillas de chía', categoria:'grasas', unidadBase:'g', macrosPor100g:{ kcal:486, proteina:17, carbos:42, grasas:31 } },

  // FRUTAS
  { id:'banana', nombre:'Banana/Plátano', categoria:'frutas', unidadBase:'g', macrosPor100g:{ kcal:89, proteina:1.1, carbos:23, grasas:0.3 } },
  { id:'manzana', nombre:'Manzana', categoria:'frutas', unidadBase:'g', macrosPor100g:{ kcal:52, proteina:0.3, carbos:14, grasas:0.2 } },
  { id:'frutillas', nombre:'Frutillas/Fresas', categoria:'frutas', unidadBase:'g', macrosPor100g:{ kcal:32, proteina:0.7, carbos:8, grasas:0.3 } },
  { id:'arandanos', nombre:'Arándanos', categoria:'frutas', unidadBase:'g', macrosPor100g:{ kcal:57, proteina:0.7, carbos:14, grasas:0.3 } },
  { id:'mango', nombre:'Mango', categoria:'frutas', unidadBase:'g', macrosPor100g:{ kcal:60, proteina:0.8, carbos:15, grasas:0.4 } },
  { id:'kiwi', nombre:'Kiwi', categoria:'frutas', unidadBase:'g', macrosPor100g:{ kcal:61, proteina:1.1, carbos:15, grasas:0.5 } },

  // VEGETALES
  { id:'brocoli', nombre:'Brócoli', categoria:'vegetales', unidadBase:'g', macrosPor100g:{ kcal:34, proteina:2.8, carbos:7, grasas:0.4 } },
  { id:'espinaca', nombre:'Espinaca', categoria:'vegetales', unidadBase:'g', macrosPor100g:{ kcal:23, proteina:2.9, carbos:3.6, grasas:0.4 } },
  { id:'tomate', nombre:'Tomate', categoria:'vegetales', unidadBase:'g', macrosPor100g:{ kcal:18, proteina:0.9, carbos:3.9, grasas:0.2 } },
  { id:'pepino', nombre:'Pepino', categoria:'vegetales', unidadBase:'g', macrosPor100g:{ kcal:15, proteina:0.7, carbos:3.6, grasas:0.1 } },
  { id:'lechuga', nombre:'Lechuga', categoria:'vegetales', unidadBase:'g', macrosPor100g:{ kcal:15, proteina:1.4, carbos:2.9, grasas:0.2 } },
  { id:'zanahoria', nombre:'Zanahoria', categoria:'vegetales', unidadBase:'g', macrosPor100g:{ kcal:41, proteina:0.9, carbos:10, grasas:0.2 } },

  // LÁCTEOS
  { id:'leche_desc', nombre:'Leche descremada', categoria:'lacteos', unidadBase:'ml', macrosPor100g:{ kcal:35, proteina:3.4, carbos:5, grasas:0.1 } },
  { id:'yogur_griego', nombre:'Yogur griego natural', categoria:'lacteos', unidadBase:'g', macrosPor100g:{ kcal:59, proteina:10, carbos:3.6, grasas:0.4 } },
  { id:'queso_cottage', nombre:'Queso cottage', categoria:'lacteos', unidadBase:'g', macrosPor100g:{ kcal:98, proteina:11, carbos:3.4, grasas:4.3 } },
  { id:'queso_magro', nombre:'Queso bajo en grasa', categoria:'lacteos', unidadBase:'g', macrosPor100g:{ kcal:98, proteina:14, carbos:1.5, grasas:3.5 } },

  // SUPLEMENTOS
  { id:'whey_protein', nombre:'Whey Protein', categoria:'suplementos', unidadBase:'g', macrosPor100g:{ kcal:400, proteina:80, carbos:8, grasas:5 } },
  { id:'caseina', nombre:'Caseína', categoria:'suplementos', unidadBase:'g', macrosPor100g:{ kcal:380, proteina:82, carbos:6, grasas:2 } },
  { id:'creatina', nombre:'Creatina monohidrato', categoria:'suplementos', unidadBase:'g', macrosPor100g:{ kcal:0, proteina:0, carbos:0, grasas:0 } },
  { id:'dextrose', nombre:'Dextrosa', categoria:'suplementos', unidadBase:'g', macrosPor100g:{ kcal:380, proteina:0, carbos:95, grasas:0 } },
];

// ── FOOD DB SERVICE ──
const FoodDB = {
  _cache: null,

  async getAll(){
    if(this._cache) return this._cache;
    const custom = DB.get('foods_custom') || [];
    // Try Firebase custom foods
    try{
      const doc = await window.db?.collection('foods').doc('custom').get();
      if(doc?.exists){
        const d = doc.data();
        let fb = d.items;
        if(typeof fb==='string') try{ fb=JSON.parse(fb); }catch(e){ fb=[]; }
        if(Array.isArray(fb) && fb.length) {
          this._cache = [...BASE_FOODS, ...fb];
          DB.set('foods_custom', fb);
          return this._cache;
        }
      }
    }catch(e){}
    this._cache = [...BASE_FOODS, ...custom];
    return this._cache;
  },

  search(query, category=''){
    const q = (query||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim();
    const foods = this._cache || BASE_FOODS;
    return foods.filter(f=>{
      const name = f.nombre.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
      const catMatch = !category || f.categoria === category;
      const nameMatch = !q || name.includes(q);
      return catMatch && nameMatch;
    }).slice(0, 20);
  },

  getById(id){
    return (this._cache || BASE_FOODS).find(f=>f.id===id)||null;
  },

  async addCustom(food){
    const custom = DB.get('foods_custom') || [];
    food.id = 'custom_' + Date.now();
    food.fuente = 'custom';
    custom.push(food);
    DB.set('foods_custom', custom);
    this._cache = null; // invalidate cache
    await window.db?.collection('foods').doc('custom').set({items:JSON.stringify(custom)}).catch(()=>{});
    return food;
  },

  async deleteCustom(id){
    let custom = DB.get('foods_custom') || [];
    custom = custom.filter(f=>f.id!==id);
    DB.set('foods_custom', custom);
    this._cache = null;
    await window.db?.collection('foods').doc('custom').set({items:JSON.stringify(custom)}).catch(()=>{});
  }
};

// Pre-load cache
FoodDB.getAll().then(()=>{}).catch(()=>{});
