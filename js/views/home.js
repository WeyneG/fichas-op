// Tela inicial: lista de personagens da mesa.
import { CONFIG } from '../config.js';
import { normPublic } from '../data.js';
import { auth, msgOf } from '../store.js';
import { esc, IC, miniBar, accentVars } from '../ui.js';
import { flashlight } from '../fx.js';

export async function mount(root, _params, ctx) {
  const { store } = ctx;
  document.title = `${CONFIG.NOME_DA_MESA} — ${CONFIG.SUBTITULO}`;
  ctx.status(store.mode === 'cloud' ? 'ok' : 'local', store.mode === 'cloud' ? 'Conectado' : 'Modo local');
  let rows = null, error = null, firstList = true;
  flashlight(true);

  function card(r) {
    const p = normPublic(r.data);
    const mine = !!auth.get(r.slug);
    return `<a class="ccard" href="/ficha/${esc(r.slug)}" data-link style="${accentVars(p.theme)}">
      <div class="cc-por">${p.portrait ? `<img src="${p.portrait}" alt="" loading="lazy">` : `<span>${IC.user}</span>`}</div>
      <div class="cc-body">
        <div class="cc-name">${esc(p.name || 'Sem nome')}${mine ? '<span class="mine">sua</span>' : ''}</div>
        <div class="cc-meta">${p.classe ? `<span class="tag sm">${esc(p.classe)}</span>` : ''}<span>${esc(p.ocupacao || '')}</span>${p.nivel ? `<span class="cc-lvl">Nível ${p.nivel}</span>` : ''}</div>
        ${miniBar('PV', p.pv, 'pv')}${miniBar('PD', p.pd, 'pd')}
      </div></a>`;
  }
  function render() {
    const banner = store.mode === 'local'
      ? `<div class="banner">${IC.lock}<div><b>Modo local.</b> As fichas ficam só neste navegador. Para sincronizar entre aparelhos e jogadores, configure o Supabase em <code>js/config.js</code> (veja o README).</div></div>` : '';
    let list;
    if (error) list = `<p class="empty">${esc(error)}</p>`;
    else if (!rows) list = '<div class="loading">Carregando personagens…</div>';
    else { list = `<div class="chars${firstList ? ' enter' : ''}">${rows.map(card).join('')}
      <a class="ccard new" href="/novo" data-link>${IC.plus}<span>Novo personagem</span></a></div>`; firstList = false; }
    root.innerHTML = `<section class="intro hero-intro">
        <span class="logo intro-logo" aria-hidden="true"></span>
        <div><p class="kicker"><span>${esc(CONFIG.SUBTITULO)}</span></p>
        <h1 class="title">${esc(CONFIG.NOME_DA_MESA)}</h1>
        <p class="lede">Escolha seu personagem. Qualquer um pode ver as fichas; para editar, use o PIN da sua.</p></div>
      </section>${banner}${list}`;
  }
  async function load() {
    try { rows = await store.list(); error = null; } catch (e) { error = msgOf(e); }
    render();
  }
  render(); await load();
  let t = null;
  const unsub = store.subscribe(null, () => { clearTimeout(t); t = setTimeout(load, 400); });
  return () => { unsub(); clearTimeout(t); flashlight(false); };
}
