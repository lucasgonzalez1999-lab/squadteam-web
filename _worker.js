/**
 * Squad Team — Cloudflare Worker
 *
 * Handles API routes; all other requests are served as static assets.
 *
 * Required secret (set once via Cloudflare dashboard → Workers → Settings → Variables):
 *   FIREBASE_SERVICE_ACCOUNT  ← paste the full JSON from Firebase Console →
 *                               Project Settings → Service accounts →
 *                               Generate new private key
 */

const FIREBASE_PROJECT = 'squadteam-55dea';
const FIREBASE_API_KEY = 'AIzaSyA9I05xscqMsotp_Ke7D9sbHw2pqHP9DQY';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: CORS });
    }

    if (url.pathname === '/api/admin/resetPin' && request.method === 'POST') {
      return handleResetPin(request, env);
    }

    if (url.pathname === '/api/push/send' && request.method === 'POST') {
      return handlePushSend(request, env);
    }

    // All non-API requests → static assets
    return env.ASSETS.fetch(request);
  },
};

/* ─── Push send (FCM v1) ─────────────────────────────────────── */

async function handlePushSend(request, env) {
  try {
    if (!env.FIREBASE_SERVICE_ACCOUNT) return errJson('Service account no configurado', 503);

    const authHeader = request.headers.get('Authorization') || '';
    if (!authHeader.startsWith('Bearer ')) return errJson('No autorizado', 401);

    const idToken   = authHeader.slice(7);
    const callerUid = await verifyIdToken(idToken);
    if (!callerUid) return errJson('Token inválido', 401);

    const adminToken = await getAdminToken(env);
    const callerDoc  = await firestoreGet(`users/${callerUid}`, adminToken);
    if (callerDoc?.role !== 'coach' && callerDoc?.role !== 'owner' && !callerDoc?.isOwner) {
      return errJson('Solo coaches pueden enviar push', 403);
    }

    const { athId, title, body, link } = await request.json();
    if (!athId || !title) return errJson('athId + title requeridos', 400);

    const tokenDoc = await firestoreGet(`fcmTokens/${athId}`, adminToken);
    const fcmToken = tokenDoc?.token;
    if (!fcmToken) return errJson('El alumno no activó notificaciones', 404);

    const payload = {
      message: {
        token: fcmToken,
        notification: { title, body: body || '' },
        data: { link: link || '/' },
        webpush: { fcm_options: { link: link || '/' } },
      },
    };

    const res = await fetch(
      `https://fcm.googleapis.com/v1/projects/${FIREBASE_PROJECT}/messages:send`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${adminToken}` },
        body: JSON.stringify(payload),
      }
    );
    const data = await res.json();
    if (!res.ok) {
      // Token inválido → limpiar Firestore
      if (data.error?.status === 'NOT_FOUND' || data.error?.status === 'UNREGISTERED') {
        await fetch(
          `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT}/databases/(default)/documents/fcmTokens/${athId}`,
          { method: 'DELETE', headers: { 'Authorization': `Bearer ${adminToken}` } }
        );
      }
      return errJson(data.error?.message || 'FCM error', res.status);
    }

    return okJson({ ok: true });
  } catch (e) {
    return errJson(e.message || 'Error interno', 500);
  }
}

/* ─── Admin PIN reset ────────────────────────────────────────── */

async function handleResetPin(request, env) {
  try {
    if (!env.FIREBASE_SERVICE_ACCOUNT) {
      return errJson('El worker no tiene configurado FIREBASE_SERVICE_ACCOUNT. Añadilo en Cloudflare → Workers → Settings → Variables.', 503);
    }

    // 1. Validate caller's Firebase ID token
    const authHeader = request.headers.get('Authorization') || '';
    if (!authHeader.startsWith('Bearer ')) return errJson('No autorizado', 401);

    const idToken    = authHeader.slice(7);
    const callerUid  = await verifyIdToken(idToken);
    if (!callerUid)  return errJson('Token inválido', 401);

    // 2. Get service-account admin token
    const adminToken = await getAdminToken(env);

    // 3. Check caller has coach or owner role
    // Primary: Firestore users/{uid}.role === 'coach'|'owner'
    // Fallback: COACH_UIDS env var (comma-separated list of allowed UIDs)
    const callerDoc   = await firestoreGet(`users/${callerUid}`, adminToken);
    const fsAllowed   = callerDoc?.role === 'coach' || callerDoc?.role === 'owner' || callerDoc?.isOwner === true || callerDoc?.isOwner === 'true';
    const envAllowed  = (env.COACH_UIDS || '').split(',').map(s => s.trim()).filter(Boolean).includes(callerUid);
    if (!fsAllowed && !envAllowed) {
      return errJson(
        `Permitido solo para coaches. ` +
        `(uid=${callerUid}, doc=${callerDoc ? 'ok' : 'missing'}, role=${callerDoc?.role ?? 'null'}) ` +
        `Agrega tu UID a la variable COACH_UIDS en Cloudflare si tu doc de Firestore no tiene role:coach.`,
        403
      );
    }

    // 4. Parse body
    const { athId, newPin } = await request.json();
    if (!athId || !newPin || String(newPin).trim().length < 4) {
      return errJson('Parámetros inválidos (athId + newPin mínimo 4 chars)', 400);
    }
    const pinStr = String(newPin).trim();

    // 5. Resolve athlete's Firebase Auth UID by email — create account if missing
    const email   = `${athId}@squadteam.uy`;
    const athLook = await fetchAdmin(
      `https://identitytoolkit.googleapis.com/v1/projects/${FIREBASE_PROJECT}/accounts:lookup`,
      adminToken, { email: [email] }
    );
    let athUid = athLook.users?.[0]?.localId;

    if (!athUid) {
      // Account doesn't exist yet — create it
      const createRes = await fetchAdmin(
        `https://identitytoolkit.googleapis.com/v1/projects/${FIREBASE_PROJECT}/accounts`,
        adminToken, { email, password: `sq${pinStr}`, displayName: athId }
      );
      if (createRes.error) return errJson('No se pudo crear cuenta: ' + (createRes.error.message || 'error'), 500);
      athUid = createRes.localId;
    }

    // 6. Force-update Firebase Auth password (admin, no current password needed)
    const updateRes = await fetchAdmin(
      `https://identitytoolkit.googleapis.com/v1/projects/${FIREBASE_PROJECT}/accounts:update`,
      adminToken, { localId: athUid, password: `sq${pinStr}` }
    );
    if (updateRes.error) return errJson(updateRes.error.message || 'Error al actualizar Auth', 500);

    // 7. Sync Firestore pins/{athId}
    await fetch(
      `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT}/databases/(default)/documents/pins/${athId}`,
      {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${adminToken}` },
        body:    JSON.stringify({ fields: { pin: { stringValue: pinStr } } }),
      }
    );

    return okJson({ ok: true, message: 'PIN actualizado correctamente' });

  } catch (e) {
    return errJson(e.message || 'Error interno', 500);
  }
}

/* ─── Firebase ID token validation ──────────────────────────── */

async function verifyIdToken(idToken) {
  // Use Firebase's own lookup endpoint — it validates the token server-side
  const res  = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${FIREBASE_API_KEY}`,
    { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ idToken }) }
  );
  const data = await res.json();
  return data.users?.[0]?.localId ?? null;
}

/* ─── Service account → Google access token ─────────────────── */

async function getAdminToken(env) {
  const sa  = typeof env.FIREBASE_SERVICE_ACCOUNT === 'string'
    ? JSON.parse(env.FIREBASE_SERVICE_ACCOUNT)
    : env.FIREBASE_SERVICE_ACCOUNT;
  const now = Math.floor(Date.now() / 1000);

  const header  = b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const payload = b64url(JSON.stringify({
    iss:   sa.client_email,
    sub:   sa.client_email,
    aud:   'https://oauth2.googleapis.com/token',
    scope: 'https://www.googleapis.com/auth/identitytoolkit https://www.googleapis.com/auth/datastore',
    iat:   now,
    exp:   now + 3600,
  }));

  const sigInput = `${header}.${payload}`;
  const keyPem   = sa.private_key
    .replace(/-----BEGIN PRIVATE KEY-----/g, '')
    .replace(/-----END PRIVATE KEY-----/g,   '')
    .replace(/\n/g, '');

  const keyData  = Uint8Array.from(atob(keyPem), c => c.charCodeAt(0));
  const cryptoKey = await crypto.subtle.importKey(
    'pkcs8', keyData,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false, ['sign']
  );
  const sigBytes = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', cryptoKey, new TextEncoder().encode(sigInput));
  const jwt      = `${sigInput}.${b64url_arr(new Uint8Array(sigBytes))}`;

  const tokenRes  = await fetch('https://oauth2.googleapis.com/token', {
    method:  'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body:    `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${jwt}`,
  });
  const tokenData = await tokenRes.json();
  if (!tokenData.access_token) throw new Error('No se pudo obtener admin token: ' + JSON.stringify(tokenData));
  return tokenData.access_token;
}

/* ─── Helpers ────────────────────────────────────────────────── */

async function fetchAdmin(url, adminToken, body) {
  const res = await fetch(url, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${adminToken}` },
    body:    JSON.stringify(body),
  });
  return res.json();
}

async function firestoreGet(docPath, adminToken) {
  const res = await fetch(
    `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT}/databases/(default)/documents/${docPath}`,
    { headers: { 'Authorization': `Bearer ${adminToken}` } }
  );
  if (!res.ok) return null;
  const doc = await res.json();
  if (!doc.fields) return null;
  return Object.fromEntries(
    Object.entries(doc.fields).map(([k, v]) => [k, v.stringValue ?? v.integerValue ?? v.booleanValue ?? null])
  );
}

function b64url(str) {
  return btoa(str).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}
function b64url_arr(arr) {
  return btoa(String.fromCharCode(...arr)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}
function okJson(data) {
  return new Response(JSON.stringify(data), { status: 200, headers: { 'Content-Type': 'application/json', ...CORS } });
}
function errJson(msg, code) {
  return new Response(JSON.stringify({ error: msg }), { status: code, headers: { 'Content-Type': 'application/json', ...CORS } });
}
