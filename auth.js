// ======== Config ========
const CLAVE = "informes@";         // tu contraseña actual
const SESSION_HOURS = 12;          // cuánto dura el “recordar” (horas)
const STORAGE_KEY = 'ga_auth_until';

// ======== Helpers ========
const $ = (id) => document.getElementById(id);
const passInput = $('auth-pass');
const btnOk = $('auth-ok');
const btnShow = $('auth-show');
const btnBio = $('auth-bio');
const btnRemember = $('auth-remember');
const msg = $('auth-msg');
const overlay = $('auth-overlay');

const now = () => Date.now();
const ms = (h) => h*60*60*1000;
const isSessionValid = () => now() < Number(localStorage.getItem(STORAGE_KEY) || 0);
const rememberSession = () => localStorage.setItem(STORAGE_KEY, String(now() + ms(SESSION_HOURS)));
const openGate = () => { overlay.style.display='flex'; setTimeout(()=>passInput?.focus(), 50); };
const closeGate = () => { overlay.style.display='none'; };
const wrong = () => {
  const card = $('auth-card'); if (!card) return;
  card.classList.remove('shake'); void card.offsetWidth; card.classList.add('shake');
  msg.textContent = 'Contraseña incorrecta. Intenta nuevamente.';
};

// Mostrar/ocultar
btnShow?.addEventListener('click', ()=>{
  passInput.type = passInput.type === 'password' ? 'text' : 'password';
});

// Login con contraseña
btnOk?.addEventListener('click', ()=>{
  if (passInput.value === CLAVE) {
    rememberSession();
    closeGate();
    msg.textContent = 'Acceso concedido.';
  } else {
    wrong();
  }
});
passInput?.addEventListener('keydown', (e)=>{ if(e.key==='Enter') btnOk.click(); });

// ======== WebAuthn helpers (b64url) ========
const b64uToAB = (b64u) => {
  const pad = '='.repeat((4 - (b64u.length % 4)) % 4);
  const b64 = (b64u.replace(/-/g, '+').replace(/_/g, '/')) + pad;
  const bin = atob(b64);
  const buf = new ArrayBuffer(bin.length);
  const view = new Uint8Array(buf);
  for (let i=0;i<bin.length;i++) view[i] = bin.charCodeAt(i);
  return buf;
};
const abToB64u = (buf) => {
  const bytes = new Uint8Array(buf);
  let bin = '';
  for (let i=0;i<bytes.byteLength;i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/,'');
};

// Alias de usuario (si sólo usas una clave global)
const getUsername = () => 'gestor_autos_user';

// Registrar passkey (tras entrar con contraseña)
btnRemember?.addEventListener('click', async ()=>{
  const username = getUsername();
  try{
    if(!('PublicKeyCredential' in window)) throw new Error('Este dispositivo no soporta passkeys');
    const pre = await fetch('/api/webauthn/generate-registration-options', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ username, displayName: username })
    });
    const { publicKey, error } = await pre.json();
    if (error) throw new Error(error);

    publicKey.challenge = b64uToAB(publicKey.challenge);
    publicKey.user.id = b64uToAB(publicKey.user.id);

    const cred = await navigator.credentials.create({ publicKey });
    const payload = {
      id: cred.id, rawId: abToB64u(cred.rawId), type: cred.type,
      response: {
        attestationObject: abToB64u(cred.response.attestationObject),
        clientDataJSON: abToB64u(cred.response.clientDataJSON)
      }
    };

    const vr = await fetch('/api/webauthn/verify-registration', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ username, credential: payload })
    });
    const data = await vr.json();
    if(!vr.ok) throw new Error(data.error || 'No se pudo registrar la passkey');

    msg.textContent = '✅ Passkey guardada. La próxima vez podrás entrar con Face ID/huella.';
  } catch(e) {
    msg.textContent = `No se pudo registrar la passkey: ${e.message}`;
  }
});

// Login con passkey (Face ID / huella)
btnBio?.addEventListener('click', async ()=>{
  const username = getUsername();
  try{
    if(!('PublicKeyCredential' in window)) throw new Error('Sin soporte passkeys');
    const pre = await fetch('/api/webauthn/generate-authentication-options', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ username })
    });
    const { publicKey, error } = await pre.json();
    if (error) throw new Error(error);

    publicKey.challenge = b64uToAB(publicKey.challenge);
    if (publicKey.allowCredentials) {
      publicKey.allowCredentials = publicKey.allowCredentials.map(c => ({...c, id: b64uToAB(c.id)}));
    }

    const cred = await navigator.credentials.get({ publicKey });
    const payload = {
      id: cred.id, rawId: abToB64u(cred.rawId), type: cred.type,
      response: {
        authenticatorData: abToB64u(cred.response.authenticatorData),
        clientDataJSON: abToB64u(cred.response.clientDataJSON),
        signature: abToB64u(cred.response.signature),
        userHandle: cred.response.userHandle ? abToB64u(cred.response.userHandle) : null
      }
    };

    const vr = await fetch('/api/webauthn/verify-authentication', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ username, credential: payload })
    });
    const data = await vr.json();
    if(!vr.ok) throw new Error(data.error || 'No se pudo autenticar');

    rememberSession();
    closeGate();
  } catch(e){
    msg.textContent = `Biometría no disponible: ${e.message}. Usa la contraseña.`;
  }
});

// Abrir modal al cargar si no hay sesión
if (!isSessionValid()) openGate();
