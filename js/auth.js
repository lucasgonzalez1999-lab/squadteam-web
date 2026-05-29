'use strict';
// ── SQUAD TEAM — Firebase Auth wrapper ──

const SQ_AUTH = (() => {

  // Email convention: {userId}@squadteam.uy — nunca se verifica, es solo un identificador
  function toEmail(userId){ return `${userId}@squadteam.uy`; }
  // Firebase requiere mínimo 6 chars — prefijo fijo compensa contraseñas cortas
  function toPass(pin){ return `sq${pin}`; }

  async function signIn(userId, pin){
    await window.auth.signInWithEmailAndPassword(toEmail(userId), toPass(pin));
    const uid  = window.auth.currentUser.uid;
    try {
      const doc = await window.db.collection('users').doc(uid).get();
      if(doc.exists) return doc.data();
    } catch(e) {}
    // No Firestore doc yet — build profile from local athletes list
    const local = (window._loginUsers || []).find(u => u.id === userId);
    if(local) return { id:local.id, name:local.name, role:local.role||'athlete', color:local.color };
    throw new Error('Perfil no encontrado');
  }

  async function signOut(){
    await window.auth.signOut();
  }

  // Llama cb(profile) si hay sesión activa, cb(null) si no hay
  function onReady(cb){
    window.auth.onAuthStateChanged(async user => {
      if(!user){ cb(null); return; }
      try{
        const doc = await window.db.collection('users').doc(user.uid).get();
        if(doc.exists){ cb(doc.data()); return; }
      }catch(e){}
      // No Firestore doc — try session cache or local athletes list
      const cached = (typeof DB !== 'undefined') ? DB.get('session') : null;
      if(cached){ cb(cached); return; }
      const local = (window._loginUsers || []).find(u => u.id === user.email?.split('@')[0]);
      cb(local ? { id:local.id, name:local.name, role:local.role||'athlete', color:local.color } : null);
    });
  }

  return { signIn, signOut, onReady };
})();
