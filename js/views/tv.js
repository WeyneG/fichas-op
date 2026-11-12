// Modo TV: tela de exibição para deixar num notebook/TV na mesa.
// Só lê dados PÚBLICOS (mesmo com PIN de mestre salvo no aparelho):
// combate como os jogadores veem, ameaças reveladas e vida do grupo.
import { CONFIG } from '../config.js';
import { normPublic } from '../data.js';
import { msgOf } from '../store.js';
import { esc, IC, accentVars } from '../ui.js';
import { fxEnabled } from '../fx.js';

const STATUS_CLS = { 'Ileso': 'ok', 'Ferido': 'mid', 'Muito ferido': 'bad', 'Caído': 'down' };

export async function mount(root, _params, ctx) {
  const { store } = ctx;
  document.title = `${CONFIG.NOME_DA_MESA} — TV`;
  ctx.status('ok', 'TV');
  let pcs = [], npcs = [], enc = { active: false }, error = null;
  let lastTurnKey = '';
  let seenNpcs = null; // ids das ameaças já mostradas
  const revealQueue = []; let revealing = false;

  // ---------------- manter a tela ligada ----------------
  let lock = null;
  async function keepAwake() {
    try { if ('wakeLock' in navigator && document.visibilityState === 'visible') lock = await navigator.wakeLock.request('screen'); }
    catch (e) { /* navegador sem suporte: tudo bem */ }
  }
  const onVis = () => { if (document.visibilityState === 'visible') keepAwake(); };
  document.addEventListener('visibilitychange', onVis);
  keepAwake();

  // ---------------- helpers ----------------
  const pcBy = (slug) => pcs.find((r) => r.slug === slug);
  const pcPub = (slug) => { const r = pcBy(slug); return r ? normPublic(r.data) : null; };
  function entryInfo(e) {
    if (!e) return null;
    if (e.kind === 'pc') {
      const p = pcPub(e.ref);
      return { name: p ? (p.name || 'Sem nome') : (e.name || '—'), portrait: p && p.portrait, theme: p && p.theme, npc: false };
    }
    return { name: e.name || '???', portrait: null, theme: null, npc: true };
  }
  const avatar = (info, cls) => `<span class="${cls}${info && info.npc ? ' npc' : ''}">${info && info.portrait ? `<img src="${info.portrait}" alt="">` : (info && info.npc ? IC.threat : IC.user)}</span>`;
  function bar(r, cls) {
    const pct = r.max > 0 ? Math.max(0, Math.min(100, (r.cur / r.max) * 100)) : 0;
    const low = r.cur <= Math.ceil(r.max * 0.25);
    return `<div class="tv-bar ${cls}${low ? ' low' : ''}"><span class="tv-bar-l">${cls.toUpperCase()}</span><span class="tv-bar-t"><i style="width:${pct}%"></i></span><b>${r.cur}<small>/${r.max}</small></b></div>`;
  }
  function partyCard(r, curRef) {
    const p = normPublic(r.data);
    const down = p.pv.cur <= 0;
    return `<div class="tv-pc${r.slug === curRef ? ' cur' : ''}${down ? ' down' : ''}" style="${accentVars(p.theme)}">
      <div class="tv-pc-h">${avatar({ portrait: p.portrait }, 'tv-pc-av')}<span class="tv-pc-n">${esc(p.name || 'Sem nome')}</span></div>
      ${bar(p.pv, 'pv')}${bar(p.pd, 'pd')}</div>`;
  }

  // ---------------- views ----------------
  function idleView() {
    return `<div class="tv-idle">
        <span class="logo tv-logo" aria-hidden="true"></span>
        <p class="tv-kicker">${esc(CONFIG.SUBTITULO)}</p>
        <h1 class="tv-title">${esc(CONFIG.NOME_DA_MESA)}</h1>
      </div>
      <div class="tv-party">${pcs.map((r) => partyCard(r, null)).join('')}</div>`;
  }
  function combatView() {
    const order = enc.order || [];
    const idx = order.findIndex((e) => e.id === enc.current);
    const cur = idx >= 0 ? order[idx] : null;
    const info = cur ? entryInfo(cur) : (enc.hiddenTurn ? { name: '???', npc: true } : null);
    const next = idx >= 0 && order.length > 1 ? entryInfo(order[(idx + 1) % order.length]) : null;
    const style = info && info.theme ? accentVars(info.theme) : '';
    const rows = order.map((e) => {
      const i = entryInfo(e), on = e.id === enc.current;
      return `<li class="tv-ord${on ? ' cur' : ''}${i.npc ? ' npc' : ''}" style="${i.theme ? accentVars(i.theme) : ''}">${avatar(i, 'tv-ord-av')}<span class="tv-ord-n">${esc(i.name)}</span><span class="tv-ord-i">${esc(e.init)}</span></li>`;
    }).join('');
    const threats = npcs.map((n) => {
      const d = n.data || {}, st = d.status || 'Ileso';
      return `<div class="tv-threat"><span class="tv-threat-ic">${IC.threat}</span><span class="tv-threat-n">${esc(d.name || '???')}</span>
        ${d.pv ? `<b class="tv-threat-pv">${d.pv.cur}<small>/${d.pv.max}</small></b>` : ''}<span class="st st-${STATUS_CLS[st] || 'ok'}">${esc(st)}</span></div>`;
    }).join('');
    return `<div class="tv-combat">
        <section class="tv-now${info && info.npc ? ' npc' : ''}" style="${style}">
          <p class="tv-round">${IC.sword}<span>Rodada <b>${enc.round || 1}</b></span></p>
          ${avatar(info, 'tv-now-av')}
          <p class="tv-now-k">Vez de</p>
          <h1 class="tv-now-n">${esc(info ? info.name : '—')}</h1>
          ${next ? `<p class="tv-next">próximo: <b>${esc(next.name)}</b></p>` : ''}
        </section>
        <aside class="tv-side">
          <h2 class="tv-h">Ordem</h2>
          <ol class="tv-order">${rows}</ol>
          ${threats ? `<h2 class="tv-h">Ameaças</h2><div class="tv-threats">${threats}</div>` : ''}
        </aside>
      </div>
      <div class="tv-party">${pcs.map((r) => partyCard(r, cur && cur.kind === 'pc' ? cur.ref : null)).join('')}</div>`;
  }
  function render() {
    const turnKey = enc.active ? `${enc.round}:${enc.current || (enc.hiddenTurn ? 'h' : '')}` : 'idle';
    const changed = turnKey !== lastTurnKey && lastTurnKey !== '';
    lastTurnKey = turnKey;
    // pinta o site com a cor de quem está na vez
    const order = enc.order || [];
    const cur = enc.active ? order.find((e) => e.id === enc.current) : null;
    const curInfo = cur ? entryInfo(cur) : null;
    ctx.setAccent(curInfo && curInfo.theme ? curInfo.theme : null);
    root.innerHTML = `<div class="tv${enc.active ? ' in-combat' : ''}${changed ? ' swap pulse' : ''}">
      ${error ? `<p class="tv-err">${esc(error)}</p>` : ''}
      ${enc.active ? combatView() : idleView()}
      <div class="tv-foot"><span class="tv-clock" id="tv-clock"></span><a class="tv-exit" href="/" data-link>sair da TV</a></div>
    </div>`;
    tick();
  }
  // ameaça revelada: entra em tela cheia com glitch
  function runReveal() {
    if (revealing || !revealQueue.length) return;
    if (!fxEnabled()) { revealQueue.length = 0; return; }
    revealing = true;
    const name = revealQueue.shift();
    const el = document.createElement('div');
    el.className = 'tv-reveal';
    el.innerHTML = `<div class="tv-reveal-in"><span class="tv-reveal-ic">${IC.threat}</span><small>Ameaça</small><strong data-text="${esc(name)}">${esc(name)}</strong></div>`;
    document.body.appendChild(el);
    setTimeout(() => el.classList.add('out'), 2600);
    setTimeout(() => { el.remove(); revealing = false; runReveal(); }, 3200);
  }

  function tick() {
    const el = root.querySelector('#tv-clock');
    if (el) el.textContent = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  }
  const clock = setInterval(tick, 15000);

  // ---------------- dados ----------------
  async function load() {
    try {
      const [p, n, e] = await Promise.all([store.list(), store.listNpcs(), store.getEncounter()]);
      pcs = p || []; npcs = n || []; enc = e || { active: false }; error = null;
      const ids = new Set(npcs.map((x) => x.id));
      if (seenNpcs) npcs.filter((x) => !seenNpcs.has(x.id)).forEach((x) => revealQueue.push((x.data && x.data.name) || '???'));
      seenNpcs = ids;
      runReveal();
    } catch (e) { error = msgOf(e); }
    render();
  }
  root.innerHTML = '<div class="loading">Ligando a TV…</div>';
  await load();
  let t = null;
  const refresh = () => { clearTimeout(t); t = setTimeout(load, 250); };
  const unsub1 = store.subscribe(null, refresh);
  const unsub2 = store.subscribeMesa ? store.subscribeMesa(refresh) : () => {};
  // segurança extra: se a conexão em tempo real cair, atualiza a cada 30s
  const poll = setInterval(load, 30000);

  return () => {
    unsub1(); unsub2(); clearTimeout(t); clearInterval(poll); clearInterval(clock);
    document.removeEventListener('visibilitychange', onVis);
    try { if (lock) lock.release(); } catch (e) { /* ok */ }
    document.querySelectorAll('.tv-reveal').forEach((x) => x.remove());
  };
}
