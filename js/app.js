// Roteador e casca do site.
import { CONFIG } from './config.js';
import { getStore } from './store.js';
import { esc, IC, accentVars } from './ui.js';
import { initFx, fxEnabled, lowHp } from './fx.js';
import { initRules, closeRules } from './rules.js';

const app = document.getElementById('app');
let cleanup = null;
let store = null;
let seq = 0;

function shell() {
  app.innerHTML = `
    <header class="top"><div class="top-in">
      <a class="brand" href="/" data-link><span class="logo" aria-hidden="true"></span><span class="bt">${esc(CONFIG.NOME_DA_MESA)}</span></a>
      <nav class="tabs">
        <a class="tab" href="/" data-link data-nav="home">Personagens</a>
        <a class="tab" href="/mesa" data-link data-nav="mesa">Mesa</a>
      </nav>
      <button class="rulesbtn" data-rules="" title="Regras rápidas" aria-label="Abrir regras rápidas"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M4 5.5C4 4.7 4.7 4 5.5 4H11v16H5.5c-.8 0-1.5-.7-1.5-1.5z"/><path d="M20 5.5c0-.8-.7-1.5-1.5-1.5H13v16h5.5c.8 0 1.5-.7 1.5-1.5z"/></svg><span>Regras</span></button>
      <button class="fxbtn" data-fx-toggle aria-pressed="true" title="Efeitos visuais" aria-label="Ligar ou desligar efeitos visuais"><svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/><path d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z"/></svg></button>
      <span class="status" id="status"><i></i><span></span></span>
    </div></header>
    <main class="wrap" id="view"></main>`;
}

function setStatus(cls, text) {
  const el = document.getElementById('status');
  if (!el) return;
  el.className = 'status ' + cls;
  el.querySelector('span').textContent = text;
}

// Pinta o site com a cor da ficha aberta (null = cinza padrão)
function setAccent(hex) {
  document.documentElement.style.cssText = hex ? accentVars(hex) : '';
}

export function navigate(path, replace) {
  if (path !== location.pathname) history[replace ? 'replaceState' : 'pushState']({}, '', path);
  route();
}

async function route() {
  const my = ++seq;
  if (cleanup) { try { cleanup(); } catch (e) { console.error(e); } cleanup = null; }
  const path = location.pathname.replace(/\/+$/, '') || '/';
  let name = 'notfound', params = {};
  if (path === '/' || path === '/index.html') name = 'home';
  else if (path === '/novo') name = 'novo';
  else if (path === '/mesa') name = 'mesa';
  else if (path === '/tv') name = 'tv';
  else { const m = path.match(/^\/ficha\/([a-z0-9-]+)$/); if (m) { name = 'ficha'; params = { slug: m[1] }; } }

  setAccent(null);
  document.body.classList.toggle('tv-mode', name === 'tv');
  document.querySelectorAll('[data-nav]').forEach((a) => a.classList.toggle('on', a.dataset.nav === (name === 'mesa' ? 'mesa' : name === 'home' ? 'home' : '')));

  lowHp(false); closeRules();
  // cada tela ganha um container novo (assim os eventos antigos somem junto)
  const old = document.getElementById('view');
  if (fxEnabled() && old && old.childElementCount && !old.classList.contains('view-out')) {
    old.classList.add('view-out');
    await new Promise((r) => setTimeout(r, 170));
    if (my !== seq) return;
  }
  const view = document.createElement('main');
  view.className = 'wrap view-in view-' + name; view.id = 'view';
  old.replaceWith(view);
  window.scrollTo(0, 0);

  if (name === 'notfound') {
    view.innerHTML = `<div class="locked-panel"><h2>Página não encontrada</h2><a class="btn pri" href="/" data-link>Ir para os personagens</a></div>`;
    return;
  }
  const mod = await import(`./views/${name}.js`);
  if (my !== seq) return;
  const ctx = { store, navigate, status: setStatus, setAccent };
  const c = await mod.mount(view, params, ctx);
  if (my !== seq) { if (c) c(); return; }
  cleanup = c || null;
}

document.addEventListener('click', (e) => {
  const a = e.target.closest('a[data-link]');
  if (!a || e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
  e.preventDefault();
  navigate(a.getAttribute('href'));
});
window.addEventListener('popstate', route);

(async function start() {
  shell();
  initFx();
  initRules();
  setStatus('pending', 'Conectando…');
  store = await getStore();
  route();
})();
