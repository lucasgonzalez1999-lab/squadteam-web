// SQUAD TEAM — Clases Presenciales

const DAYS_KEYS  = ['sun','mon','tue','wed','thu','fri','sat'];
const DAYS_ES    = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];
const DAYS_FULL  = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];
let _clSchedules  = {};   // {athId: {mon:'09:00', tue:null, ...}}
let _clLoaded     = false;
let _clLoading    = false;
let _editingAthId = null;
let _clViewDayIdx = new Date().getDay(); // día que el coach está viendo (0=dom)

// ── FIRESTORE ──
async function loadAllSchedules(force=false){
  if(_clLoaded && !force) return;
  if(_clLoading) return;
  _clLoading = true;
  _clSchedules = {};
  const list = Array.isArray(athletes) ? athletes : [];
  await Promise.all(list.map(async a => {
    try{
      const snap = await window.db.collection('schedules').doc(a.id).get();
      if(!snap.exists) return;
      const d = snap.data()||{};
      const sched = {};
      for(const k of DAYS_KEYS) sched[k] = d[k] || null;
      _clSchedules[a.id] = sched;
    }catch(e){}
  }));
  _clLoaded = true;
  _clLoading = false;
}

async function saveClaseSchedule(athId, slots){
  const data = {};
  for(const k of DAYS_KEYS) data[k] = slots[k] || null;
  await window.db.collection('schedules').doc(athId).set(data);
  _clSchedules[athId] = {...slots};
}

// ── HELPERS ──
function todayDayKey(){ return DAYS_KEYS[new Date().getDay()]; }

function fmtHM(t){
  // "09:00" → "9:00"
  if(!t) return '';
  const [h,m] = t.split(':');
  return `${parseInt(h)}:${m}`;
}

// ── SELECCIÓN DE DÍA ──
function clSelectDay(idx){
  _clViewDayIdx = idx;
  const el = document.getElementById('clases-content');
  if(el && currentUser?.role === 'coach') _renderClasesCoach(el);
}

// ── MAIN RENDER ──
function renderClases(){
  const el = document.getElementById('clases-content');
  if(!el) return;

  if(!_clLoaded){
    el.innerHTML = `<div class="cl-loading"><div class="cl-spin"></div>Cargando horarios…</div>`;
    loadAllSchedules().then(() => renderClases());
    return;
  }

  if(currentUser?.role === 'coach'){
    _renderClasesCoach(el);
  } else {
    _renderClasesAthlete(el);
  }
}

// ── COACH VIEW ──
function _renderClasesCoach(el){
  const now      = new Date();
  const todayIdx = now.getDay();
  const todayKey = DAYS_KEYS[todayIdx];

  // Día que se está viendo (puede ser distinto de hoy)
  const viewIdx  = _clViewDayIdx;
  const viewKey  = DAYS_KEYS[viewIdx];
  const isToday  = viewIdx === todayIdx;

  // Clases del día seleccionado
  const todayClases = (Array.isArray(athletes) ? athletes : [])
    .map(a => ({a, time: _clSchedules[a.id]?.[viewKey] || null}))
    .filter(x => x.time)
    .sort((a,b) => a.time.localeCompare(b.time));

  // Week grid
  const weekData = DAYS_KEYS.map((key, idx) => {
    const list = (Array.isArray(athletes) ? athletes : [])
      .map(a => ({a, time: _clSchedules[a.id]?.[key] || null}))
      .filter(x => x.time)
      .sort((a,b) => a.time.localeCompare(b.time));
    return {key, idx, list};
  });

  // Total classes this week
  const totalWeek = weekData.reduce((t, d) => t + d.list.length, 0);

  el.innerHTML = `
    <div class="cl-wrap">

      <!-- HEADER -->
      <div class="cl-header">
        <div class="cl-header-left">
          <div class="cl-title">Clases</div>
          <div class="cl-subtitle">${now.toLocaleDateString('es-UY',{weekday:'long',day:'numeric',month:'long'})} · ${totalWeek} esta semana</div>
        </div>
        <button class="btn-primary cl-add-btn" onclick="openClasesModal()">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Horario
        </button>
      </div>

      <!-- HOY / DÍA SELECCIONADO -->
      <div class="cl-section">
        <div class="cl-section-head">
          <span class="cl-section-label">${isToday ? 'Hoy' : 'Día'}</span>
          <span class="cl-section-day">${DAYS_FULL[viewIdx]}</span>
        </div>
        ${todayClases.length ? `
          <div class="cl-today-list">
            ${todayClases.map(({a, time}) => `
              <div class="cl-today-card" onclick="openClasesModal('${a.id}')">
                <div class="cl-today-time">${fmtHM(time)}</div>
                <div class="cl-today-sep"></div>
                <div class="cl-today-av" style="background:${athColor(a.id)}">${athInitial(a.name)}</div>
                <div class="cl-today-name">${a.name}</div>
                ${isToday ? '<div class="cl-today-pulse"></div>' : ''}
              </div>
            `).join('')}
          </div>
        ` : `<div class="cl-empty-state">Sin clases ${isToday ? 'hoy' : 'este día'} · <span onclick="openClasesModal()" style="color:var(--acc);cursor:pointer">Agregar horario</span></div>`}
      </div>

      <!-- SEMANA -->
      <div class="cl-section">
        <div class="cl-section-head">
          <span class="cl-section-label">Semana</span>
        </div>
        <div class="cl-week-grid">
          ${weekData.map(({key, idx, list}) => `
            <div class="cl-day-col${idx === todayIdx ? ' is-today' : ''}${idx === viewIdx ? ' is-selected' : ''}" onclick="clSelectDay(${idx})">
              <div class="cl-day-head">
                <span class="cl-day-abbr">${DAYS_ES[idx]}</span>
                ${list.length ? `<span class="cl-day-cnt">${list.length}</span>` : ''}
              </div>
              <div class="cl-day-slots">
                ${list.map(({a, time}) => `
                  <div class="cl-slot" onclick="openClasesModal('${a.id}')" title="${a.name} · ${fmtHM(time)}">
                    <div class="cl-slot-av" style="background:${athColor(a.id)}">${athInitial(a.name)}</div>
                    <div class="cl-slot-txt">
                      <div class="cl-slot-name">${a.name.split(' ')[0]}</div>
                      <div class="cl-slot-time">${fmtHM(time)}</div>
                    </div>
                  </div>
                `).join('')}
                ${!list.length ? `<div class="cl-day-free"></div>` : ''}
              </div>
            </div>
          `).join('')}
        </div>
      </div>

      <!-- POR ATLETA -->
      <div class="cl-section">
        <div class="cl-section-head">
          <span class="cl-section-label">Alumnos</span>
        </div>
        <div class="cl-ath-list">
          ${(Array.isArray(athletes)?athletes:[]).map(a => {
            const sched = _clSchedules[a.id] || {};
            const activeDays = DAYS_KEYS.filter(k => sched[k]);
            return `
              <div class="cl-ath-row" onclick="openClasesModal('${a.id}')">
                <div class="cl-ath-av" style="background:${athColor(a.id)}">${athInitial(a.name)}</div>
                <div class="cl-ath-body">
                  <div class="cl-ath-name">${a.name}</div>
                  <div class="cl-ath-pills">
                    ${activeDays.length
                      ? activeDays.map(k => `<span class="cl-pill">${DAYS_ES[DAYS_KEYS.indexOf(k)]} <b>${fmtHM(sched[k])}</b></span>`).join('')
                      : `<span class="cl-pill cl-pill-empty">Sin horario</span>`
                    }
                  </div>
                </div>
                <svg class="cl-ath-chevron" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
              </div>
            `;
          }).join('')}
        </div>
      </div>

    </div>

    <!-- MODAL -->
    <div class="cl-modal-overlay hidden" id="cl-modal-overlay" onclick="closeClasesModal(event)">
      <div class="cl-modal" id="cl-modal">
        <div class="cl-modal-hd">
          <div>
            <div class="cl-modal-title" id="cl-modal-title">Horario</div>
            <div class="cl-modal-sub" id="cl-modal-sub">Seleccioná días y horarios</div>
          </div>
          <button class="cl-modal-x" onclick="closeClasesModalForce()">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
        <div class="cl-modal-body" id="cl-modal-body"></div>
        <div class="cl-modal-ft" id="cl-modal-ft">
          <button class="btn-ghost" onclick="closeClasesModalForce()">Cancelar</button>
          <button class="btn-primary" id="cl-save-btn" onclick="saveClasesFromModal()">Guardar</button>
        </div>
      </div>
    </div>
  `;
}

// ── ATHLETE VIEW ──
function _renderClasesAthlete(el){
  const user     = currentUser;
  const sched    = _clSchedules[user?.id] || {};
  const now      = new Date();
  const todayKey = todayDayKey();
  const todayIdx = now.getDay();
  const todayTime = sched[todayKey];
  const color    = user?.color || athColor(user?.id);

  el.innerHTML = `
    <div class="cl-wrap cl-athlete-wrap">
      <div class="cl-header">
        <div class="cl-header-left">
          <div class="cl-title">Mis clases</div>
          <div class="cl-subtitle">${now.toLocaleDateString('es-UY',{weekday:'long',day:'numeric',month:'long'})}</div>
        </div>
      </div>

      <!-- HOY card -->
      ${todayTime ? `
        <div class="cl-ath-today" style="border-color:${color}40">
          <div class="cl-ath-today-label" style="color:${color}">HOY</div>
          <div class="cl-ath-today-time" style="color:${color}">${fmtHM(todayTime)}</div>
          <div class="cl-ath-today-tag">Clase presencial</div>
        </div>
      ` : `
        <div class="cl-ath-rest">
          <div class="cl-ath-rest-day">${DAYS_FULL[todayIdx]}</div>
          <div class="cl-ath-rest-txt">Día de descanso</div>
        </div>
      `}

      <!-- Semana -->
      <div class="cl-section-label-sm">Tu semana</div>
      <div class="cl-ath-week">
        ${DAYS_KEYS.map((key, idx) => {
          const time    = sched[key];
          const isToday = idx === todayIdx;
          return `
            <div class="cl-aw-row${isToday ? ' cl-aw-today' : ''}${time ? ' cl-aw-has' : ''}">
              <span class="cl-aw-day">${DAYS_ES[idx]}</span>
              ${time
                ? `<span class="cl-aw-time">${fmtHM(time)}</span>`
                : `<span class="cl-aw-off">—</span>`
              }
            </div>
          `;
        }).join('')}
      </div>
    </div>
  `;
}

// ── MODAL ──
function openClasesModal(athId){
  if(currentUser?.role !== 'coach') return;
  _editingAthId = athId || null;

  const overlay = document.getElementById('cl-modal-overlay');
  const body    = document.getElementById('cl-modal-body');
  const ft      = document.getElementById('cl-modal-ft');
  if(!overlay || !body) return;

  const savBtn = document.getElementById('cl-save-btn');

  if(athId){
    const a     = (Array.isArray(athletes)?athletes:[]).find(x => x.id === athId);
    const sched = _clSchedules[athId] || {};
    const col   = athColor(athId);
    document.getElementById('cl-modal-title').innerHTML =
      `<span class="cl-modal-av" style="background:${col}">${athInitial(a?.name||'?')}</span>${a?.name || athId}`;
    document.getElementById('cl-modal-sub').textContent = 'Días y horarios de clase presencial';
    body.innerHTML = `
      <div class="cl-editor">
        ${DAYS_KEYS.map((key, idx) => {
          const time = sched[key] || '';
          return `
            <div class="cl-ed-row" id="cl-ed-${key}${time ? ' active' : ''}">
              <label class="cl-ed-check">
                <input type="checkbox" id="cd-${key}" ${time ? 'checked' : ''} onchange="clToggleDay('${key}')">
                <span class="cl-ed-box"></span>
              </label>
              <span class="cl-ed-label">${DAYS_FULL[idx]}</span>
              <input type="time" class="cl-ed-time" id="ct-${key}"
                value="${time || '09:00'}" step="900"
                style="${time ? '' : 'opacity:0;pointer-events:none'}">
            </div>
          `;
        }).join('')}
      </div>
    `;
    if(savBtn) savBtn.style.display = '';
    if(ft) ft.style.display = '';
  } else {
    // Picker
    document.getElementById('cl-modal-title').textContent = 'Editar horario';
    document.getElementById('cl-modal-sub').textContent   = 'Seleccioná un alumno';
    body.innerHTML = `
      <div class="cl-picker">
        ${(Array.isArray(athletes)?athletes:[]).map(a => {
          const has = Object.values(_clSchedules[a.id] || {}).some(Boolean);
          return `
            <div class="cl-pick-item" onclick="openClasesModal('${a.id}')">
              <div class="cl-pick-av" style="background:${athColor(a.id)}">${athInitial(a.name)}</div>
              <span class="cl-pick-name">${a.name}</span>
              ${has ? `<span class="cl-pick-tick">✓</span>` : ''}
            </div>
          `;
        }).join('')}
      </div>
    `;
    if(savBtn) savBtn.style.display = 'none';
    if(ft) ft.style.display = 'none';
  }

  overlay.classList.remove('hidden');
  requestAnimationFrame(() => overlay.classList.add('cl-open'));
}

function clToggleDay(key){
  const cb = document.getElementById('cd-'+key);
  const ti = document.getElementById('ct-'+key);
  if(!ti) return;
  if(cb.checked){
    ti.style.opacity = '1';
    ti.style.pointerEvents = 'auto';
  } else {
    ti.style.opacity = '0';
    ti.style.pointerEvents = 'none';
  }
}

function closeClasesModal(e){
  if(e && e.target !== document.getElementById('cl-modal-overlay')) return;
  closeClasesModalForce();
}

function closeClasesModalForce(){
  const overlay = document.getElementById('cl-modal-overlay');
  if(!overlay) return;
  overlay.classList.remove('cl-open');
  setTimeout(() => overlay.classList.add('hidden'), 220);
}

async function saveClasesFromModal(){
  if(!_editingAthId) return;
  const btn = document.getElementById('cl-save-btn');
  if(btn){ btn.textContent = 'Guardando…'; btn.disabled = true; }

  const slots = {};
  for(const k of DAYS_KEYS){
    const cb = document.getElementById('cd-'+k);
    const ti = document.getElementById('ct-'+k);
    slots[k] = (cb?.checked && ti?.value) ? ti.value : null;
  }

  try{
    await saveClaseSchedule(_editingAthId, slots);
    closeClasesModalForce();
    toast('Horario guardado ✓');
    renderClases();
  }catch(e){
    toast('Error al guardar');
    if(btn){ btn.textContent = 'Guardar'; btn.disabled = false; }
  }
}
