// ======== Config ========
const CLAVE = "informes@";
const SESSION_HOURS = 12;
const STORAGE_KEY = 'ga_auth_until';

// ======== Helpers ========
const $ = (id) => document.getElementById(id);
const overlay = $('auth-overlay');
const form = $('auth-form');
const userInput = $('auth-user');
const passInput = $('auth-pass');
const btnShow = $('auth-show');
const msg = $('auth-msg');

const now = () => Date.now();
const ms = (h) => h*60*60*1000;
const isSessionValid = () => now() < Number(localStorage.getItem(STORAGE_KEY) || 0);
const rememberSession = () => localStorage.setItem(STORAGE_KEY, String(now() + ms(SESSION_HOURS)));
const openGate = () => { overlay.style.display='flex'; setTimeout(()=>userInput?.focus(), 50); };
const closeGate = () => { overlay.style.display='none'; };
const wrong = () => {
  const card = $('auth-card'); if (!card) return;
  card.classList.remove('shake'); void card.offsetWidth; card.classList.add('shake');
  msg.textContent = 'Contraseña incorrecta. Intenta nuevamente.';
};

// Mostrar/ocultar password
btnShow?.addEventListener('click', ()=>{
  passInput.type = passInput.type === 'password' ? 'text' : 'password';
});

// Envío del formulario (login)
form?.addEventListener('submit', async (e)=>{
  e.preventDefault();
  const username = (userInput.value || '').trim() || 'usuario';
  const password = passInput.value || '';

  // Tu validación local (como antes)
  if (password === CLAVE) {
    rememberSession();
    closeGate();
    msg.textContent = 'Acceso concedido.';

    // OPCIONAL: intenta guardar en el gestor de contraseñas del navegador
    try {
      if ('PasswordCredential' in window && 'credentials' in navigator) {
        const cred = new window.PasswordCredential({
          id: username,          // lo que aparezca como usuario
          name: username,
          password,              // la clave que quieres que recuerde el gestor
        });
        await navigator.credentials.store(cred);
        // En iPhone/Safari, iCloud Keychain suele mostrar su propio diálogo al detectar el form.
      }
    } catch (err) {
      // Silencioso si no está soportado
      console.debug('No se pudo guardar en Credential Management API:', err);
    }

  } else {
    wrong();
  }
});

// Abrir modal al cargar si no hay sesión
if (!isSessionValid()) openGate();
