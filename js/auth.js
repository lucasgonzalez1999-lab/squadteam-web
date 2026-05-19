'use strict';
// ── SQUAD TEAM — Firebase Auth wrapper ──

const SQ_AUTH = (() => {

  // Email convention: {userId}@squadteam.uy — nunca se verifica, es solo un identificador
  function toEmail(userId){ return `${userId}@squadteam.uy`; }
  // Password: prefijo fijo + PIN (Firebase requiere mínimo 6 chars)
  function toPass(pin){ return `sq${pin}`; }

  async function signIn(userId, pin){
    await window.auth.signInWithEmailAndPassword(toEmail(userId), toPass(pin));
    const uid  = window.auth.currentUser.uid;
    const doc  = await window.db.collection('users').doc(uid).get();
    if(!doc.exists) throw new Error('Perfil no encontrado en Firestore');
    return doc.data(); // {id, name, role, color}
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
        cb(doc.exists ? doc.data() : null);
      }catch(e){ cb(null); }
    });
  }

  return { signIn, signOut, onReady };
})();
