// Tela da ficha de um personagem.
import { ATTRS, uid, normPublic, normPrivate } from '../data.js';
import { auth, msgOf } from '../store.js';
import { esc, IC, dieSel, autosize, autosizeAll, rnd, today, toast, say, resizeImage, pickFile, download, pinForm, themePicker } from '../ui.js';

const EDIT_ACTS = new Set(['delta', 'amt', 'pip', 'full', 'lvl', 'portrait', 'portrait-remove', 'ab-use', 'ab-edit', 'ab-save',
  'ab-add', 'ab-del', 'inv-add', 'inv-del', 'con-add', 'con-del', 'ses-add', 'ses-del', 'export', 'import', 'pin-change',
  'delete', 'opt-pin', 'color']);

export async function mount(root, { slug }, ctx) {
  const { store } = ctx;
  root.innerHTML = '<div class="loading">Abrindo ficha…</div>';

  let row;
  try { row = await store.get(slug); } catch (e) { root.innerHTML = errorView(msgOf(e)); return; }
  if (!row) { root.innerHTML = errorView('Essa ficha não existe (ou foi excluída).'); return; }

  let P = normPublic(row.data);
  let V = null;
  let pin = '';
  let role = null;

  const ss = (k) => { try { return sessionStorage.getItem(`op2:${slug}:${k}`); } catch (e) { return null; } };
  const ssSet = (k, v) => { try { sessionStorage.setItem(`op2:${slug}:${k}`, v); } catch (e) { /* ok */ } };
  const ui = {
    tab: ss('tab') || 'ficha', editAb: null, confirm: null, showUnlock: false, optPin: false, showColor: false,
    dt: ss('dt') || '', rolls: (() => { try { return JSON.parse(ss('rolls') || '[]'); } catch (e) { return []; } })(),
  };

  async function tryUnlock(p, remember) {
    const r = await store.checkPin(slug, p);
    if (!r) return null;
    pin = p; role = r;
    V = normPrivate(await store.getPrivate(slug, p));
    if (remember) { if (r === 'master') auth.setMaster(p); else auth.set(slug, p); }
    return r;
  }
  // PIN lembrado neste aparelho?
  for (const [p, isOwn] of [[auth.get(slug), true], [auth.master(), false]]) {
    if (!p || role) continue;
    try { if (!(await tryUnlock(p, false)) && isOwn) auth.clear(slug); } catch (e) { /* offline: segue só leitura */ }
  }

  // ---------------- salvar ----------------
  let pubDirty = false, privDirty = false, savingPub = false, savingPriv = false, offline = false;
  let pubT = null, privT = null;
  function status() {
    if (!role) { ctx.status('local', 'Só leitura'); return; }
    if (offline) ctx.status('bad', 'Sem conexão — tentando…');
    else if (pubDirty || privDirty || savingPub || savingPriv) ctx.status('pending', 'Salvando…');
    else ctx.status('ok', store.mode === 'cloud' ? 'Salvo na nuvem' : 'Salvo neste navegador');
  }
  function savePub(ms = 700) { if (!role) return; pubDirty = true; clearTimeout(pubT); pubT = setTimeout(flushPub, ms); status(); }
  function savePriv(ms = 1200) { if (!role) return; privDirty = true; clearTimeout(privT); privT = setTimeout(flushPriv, ms); status(); }
  function onSaveError(e, retry) {
    if (e.code === 'pin_invalido') {
      role = null; V = null; auth.clear(slug); say('O PIN desta ficha mudou. Desbloqueie de novo.', true); render(); return;
    }
    if (e.code === 'muito_grande') { say(msgOf(e), true); return; }
    offline = true; setTimeout(retry, 5000);
  }
  async function flushPub() {
    if (!pubDirty || !role) { status(); return; }
    if (savingPub) { pubT = setTimeout(flushPub, 500); return; }
    savingPub = true; pubDirty = false; status();
    try { await store.savePublic(slug, pin, JSON.parse(JSON.stringify(P))); offline = false; }
    catch (e) { pubDirty = true; onSaveError(e, flushPub); }
    finally { savingPub = false; status(); }
  }
  async function flushPriv() {
    if (!privDirty || !role) { status(); return; }
    if (savingPriv) { privT = setTimeout(flushPriv, 500); return; }
    savingPriv = true; privDirty = false; status();
    try { await store.savePrivate(slug, pin, JSON.parse(JSON.stringify(V))); offline = false; }
    catch (e) { privDirty = true; onSaveError(e, flushPriv); }
    finally { savingPriv = false; status(); }
  }
  const flushAll = () => { flushPub(); flushPriv(); };
  window.addEventListener('pagehide', flushAll);

  // ---------------- combate (aviso de turno) ----------------
  let enc = { active: false };
  let wasMyTurn = false;
  function turnInfo() {
    if (!enc || !enc.active) return null;
    const cur = (enc.order || []).find((e) => e.id === enc.current);
    const mine = !!cur && cur.kind === 'pc' && cur.ref === slug;
    return { mine, round: enc.round || 1, who: cur ? cur.name : (enc.hiddenTurn ? '???' : '—') };
  }
  async function loadEnc() {
    try { enc = await store.getEncounter(); } catch (e) { return; }
    const ti = turnInfo();
    const mine = !!(ti && ti.mine);
    if (mine && !wasMyTurn) {
      try { if (navigator.vibrate) navigator.vibrate([120, 60, 120]); } catch (e) { /* ok */ }
      toast(`${IC.sword}<span>É a sua vez!</span>`, { msg: true, ms: 3500 });
    }
    wasMyTurn = mine;
    render();
  }
  let encT = null;
  const unsubMesa = store.subscribeMesa ? store.subscribeMesa(() => { clearTimeout(encT); encT = setTimeout(loadEnc, 250); }) : () => {};
  function turnBanner() {
    const ti = turnInfo(); if (!ti) return '';
    return ti.mine
      ? `<a class="turn-banner mine" href="/mesa" data-link>${IC.sword}<b>É a sua vez!</b><span>Rodada ${ti.round}</span></a>`
      : `<a class="turn-banner" href="/mesa" data-link>${IC.sword}<span>Combate · Rodada ${ti.round} · vez de <b>${esc(ti.who)}</b></span><span class="tb-go">ver mesa →</span></a>`;
  }

  // ---------------- tempo real ----------------
  const unsub = store.subscribe(slug, (ev) => {
    if (ev.type === 'delete') { say('Esta ficha foi excluída.', true); ctx.navigate('/'); return; }
    if (ev.type !== 'upsert' || pubDirty || savingPub) return;
    const incoming = normPublic(ev.row.data);
    if (JSON.stringify(incoming) === JSON.stringify(P)) return;
    P = incoming; render();
  });

  // ---------------- views ----------------
  function hero() {
    return `<section class="hero">
      <div class="portrait-w"><button class="portrait" data-act="portrait" aria-label="Trocar retrato">${
        P.portrait ? `<img src="${P.portrait}" alt="Retrato de ${esc(P.name)}">` : `<span class="ph">${IC.user}<span class="ed">Adicionar retrato</span></span>`
      }</button>${P.portrait ? '<button class="link ed" data-act="portrait-remove">' + (ui.confirm === 'portrait' ? 'confirmar?' : 'remover') + '</button>' : ''}</div>
      <div class="hero-main">
        <input class="name inl" data-bind="pub:name" style="--len:${Math.max(4, (P.name || '').length)}" value="${esc(P.name)}" placeholder="NOME" aria-label="Nome do personagem" spellcheck="false" autocomplete="off">
        <div class="meta">
          ${role || P.classe ? `<span class="tag"><input class="inl fit" data-bind="pub:classe" size="${sz(P.classe)}" value="${esc(P.classe)}" placeholder="CLASSE" aria-label="Classe" spellcheck="false"></span>
          <span class="dot">•</span>` : ''}
          ${role || P.ocupacao ? `<input class="inl meta-in fit" data-bind="pub:ocupacao" size="${sz(P.ocupacao)}" value="${esc(P.ocupacao)}" placeholder="OCUPAÇÃO" aria-label="Ocupação" spellcheck="false">
          <span class="dot">•</span>` : ''}<span>Nível</span>
          <span class="stepper"><button class="ed" data-act="lvl" data-d="-1" aria-label="Diminuir nível">−</button><span class="tag lvl">${P.nivel}</span><button class="ed" data-act="lvl" data-d="1" aria-label="Aumentar nível">+</button></span>
        </div>
      </div></section>`;
  }
  function subnav() {
    const tabs = [['ficha', 'Ficha'], ['historia', 'Histórico'], ['notas', 'Anotações']].map(([k, l]) =>
      `<button class="stab${ui.tab === k ? ' on' : ''}" data-act="tab" data-tab="${k}">${l}${k !== 'ficha' && !role ? ' ' + IC.lock : ''}</button>`).join('');
    const lock = role
      ? `<button class="lockbtn on" data-act="lock" title="Esquecer o PIN neste aparelho">${IC.unlock}<span>${role === 'master' ? 'Mestre' : 'Editando'}</span></button>`
      : `<button class="lockbtn" data-act="unlock">${IC.lock}<span>Desbloquear</span></button>`;
    const colorBtn = role ? `<button class="colorbtn${ui.showColor ? ' on' : ''}" data-act="color" title="Cor da ficha" aria-label="Cor da ficha"><i></i><span>Cor</span></button>` : '';
    let panel = '';
    if (!role && ui.showUnlock) panel = `<div class="unlock-panel">${pinForm('unlock', 'PIN desta ficha (ou do mestre)', 'Desbloquear')}<p class="hint">O PIN fica lembrado neste aparelho.</p></div>`;
    else if (role && ui.showColor) panel = `<div class="unlock-panel color-panel"><span class="lb">Cor da ficha</span>${themePicker(P.theme)}<p class="hint">Muda a cor de destaque da sua ficha (e do seu card na mesa).</p></div>`;
    return `<div class="subnav"><div class="stabs">${tabs}</div>${colorBtn}${lock}</div>${panel}`;
  }
  function res(key, label, verbs) {
    const r = P[key], low = r.cur <= Math.ceil(r.max * 0.25);
    let p = '';
    for (let i = 0; i < r.max; i++) p += `<button class="pip${i < r.cur ? ' on' : ''}" data-act="pip" data-res="${key}" data-i="${i}" aria-label="${label} ${i + 1}"></button>`;
    return `<div class="res res-${key}${low ? ' low' : ''}">
      <div class="res-top"><span class="tag">${label}</span>
        <span class="res-num"><b>${r.cur}</b><small>/ <input type="number" class="maxin" data-max="${key}" min="1" max="99" value="${r.max}" aria-label="${label} máximo"></small></span></div>
      <div class="pips">${p}</div>
      <div class="ctrls ed">
        <button class="btn sq" data-act="delta" data-res="${key}" data-d="-1">−1</button>
        <button class="btn sq" data-act="delta" data-res="${key}" data-d="1">+1</button><span class="sep"></span>
        <input type="number" class="amt" id="amt-${key}" min="1" placeholder="qtd" inputmode="numeric" aria-label="Quantidade">
        <button class="btn" data-act="amt" data-res="${key}" data-sign="-1">${verbs[0]}</button>
        <button class="btn" data-act="amt" data-res="${key}" data-sign="1">${verbs[1]}</button>
        <button class="btn ghost push" data-act="full" data-res="${key}">Restaurar</button>
      </div></div>`;
  }
  function attrsCard() {
    const a = Object.keys(ATTRS).map((k) => `<div class="attr"><span class="attr-l">${ATTRS[k].label}</span>${dieSel('attr', k, P.attrs[k], ATTRS[k].label)}</div>`).join('');
    return `<section class="card"><div class="sec-h"><span class="tag">Atributos</span></div><div class="attrs">${a}</div></section>`;
  }
  function skillsCard() {
    const rows = P.skills.map((sk, i) => {
      const at = ATTRS[sk.a] || ATTRS.fisico, ad = P.attrs[sk.a] || 4;
      return `<div class="sk${sk.d > 4 ? ' tr' : ''}"><span class="sk-n">${esc(sk.n)}</span>${dieSel('skill', i, sk.d, 'Dado de ' + sk.n)}
        <span class="plus">+</span><span class="adie" title="${at.label} d${ad}"><i>${ad}</i></span><span class="sk-a">${at.ab}</span>
        <button class="rollb" data-act="roll-skill" data-i="${i}" aria-label="Rolar ${esc(sk.n)}" title="Rolar d${sk.d} + d${ad}">${IC.die}</button></div>`;
    }).join('');
    return `<section class="card"><div class="sec-h"><span class="tag">Perícias</span><span class="hint">dado da perícia + dado do atributo</span></div><div class="skills">${rows}</div></section>`;
  }
  function abilitiesCard() {
    const list = P.abilities.map((a) => {
      if (ui.editAb === a.id && role) {
        return `<div class="ab ab-edit">
          <div class="row"><div class="grow1"><label class="lb" for="ab-name">Nome</label><input class="field" id="ab-name" value="${esc(a.name)}"></div>
          <div class="w92"><label class="lb" for="ab-cost">Custo PD</label><input class="field" id="ab-cost" type="number" min="0" value="${a.cost || 0}"></div></div>
          <div><label class="lb" for="ab-text">Descrição</label><textarea class="field grow prose-ta" id="ab-text" rows="3">${esc(a.text)}</textarea></div>
          <div class="ab-act"><button class="btn pri" data-act="ab-save" data-id="${a.id}">Salvar</button><button class="link" data-act="ab-cancel">cancelar</button></div></div>`;
      }
      const armed = ui.confirm === 'ab-' + a.id;
      return `<article class="ab"><header><h3>${esc(a.name || 'Sem nome')}</h3>${a.cost ? `<span class="cost">${a.cost} PD</span>` : ''}</header>
        <p>${esc(a.text).replace(/\n/g, '<br>')}</p><div class="ab-act ed">
        ${a.cost ? `<button class="btn pri" data-act="ab-use" data-id="${a.id}"${P.pd.cur < a.cost ? ' disabled title="PD insuficiente"' : ''}>Usar (−${a.cost} PD)</button>` : ''}
        <button class="link" data-act="ab-edit" data-id="${a.id}">editar</button>
        <button class="link danger${armed ? ' armed' : ''}" data-act="ab-del" data-id="${a.id}">${armed ? 'clique de novo para excluir' : 'excluir'}</button></div></article>`;
    }).join('');
    return `<section class="card"><div class="sec-h"><span class="tag">Habilidades</span></div>${list || '<p class="empty">Nenhuma habilidade ainda.</p>'}<button class="btn ghost add ed" data-act="ab-add">+ Nova habilidade</button></section>`;
  }
  const face = (x) => `<span class="face" title="Rolou um d${x.d} e tirou ${x.v}"><small>d${x.d}</small><b>${x.v}</b></span>`;
  const pf = (r, big) => r.dt != null ? `<span class="pf ${r.ok ? 'ok' : 'no'}">${r.ok ? 'passou' : 'falhou'}${big ? ' · DT ' + r.dt : ''}</span>` : '';
  function rollsCard() {
    const tray = [4, 6, 8, 10, 12, 20].map((d) => `<button class="btn" data-act="roll-die" data-d="${d}">d${d}</button>`).join('');
    const li = (r) => `<li><span class="h-t">${esc(r.t)}</span><span class="h-d">${r.dice.map(face).join('')}</span>${r.dice.length > 1 ? `<b class="h-s">${r.sum}</b>` : ''}${pf(r)}</li>`;
    return `<section class="card"><div class="sec-h"><span class="tag">Rolagens</span></div>
      <div class="tray">${tray}<label class="dt" title="Se preencher, compara a soma com a DT">DT <input type="number" id="dt" value="${esc(ui.dt)}" placeholder="—" inputmode="numeric"></label></div>
      <ol class="hist">${ui.rolls.length ? ui.rolls.map(li).join('') : '<li class="empty">Toque no dado ao lado de uma perícia para rolar.</li>'}</ol>
      ${ui.rolls.length ? '<button class="link" data-act="clear-rolls">limpar histórico</button>' : ''}</section>`;
  }
  function invCard() {
    const rows = P.inventory.map((it) => {
      const armed = ui.confirm === 'inv-' + it.id;
      return `<div class="inv-r"><input type="number" class="qty" data-list="pub:inventory" data-id="${it.id}" data-field="q" data-type="num" min="0" value="${it.q == null ? 1 : it.q}" aria-label="Quantidade">
        <input class="inl" data-list="pub:inventory" data-id="${it.id}" data-field="n" value="${esc(it.n)}" placeholder="Item">
        <input class="inl inv-o" data-list="pub:inventory" data-id="${it.id}" data-field="o" value="${esc(it.o)}" placeholder="detalhe">
        <button class="x ed${armed ? ' armed' : ''}" data-act="inv-del" data-id="${it.id}" aria-label="Remover item" title="${armed ? 'Clique de novo para remover' : 'Remover'}">×</button></div>`;
    }).join('');
    return `<section class="card"><div class="sec-h"><span class="tag">Inventário</span></div>${rows || '<p class="empty">Nada na mochila ainda.</p>'}<button class="btn ghost add ed" data-act="inv-add">+ Item</button></section>`;
  }
  function optionsCard() {
    const armed = ui.confirm === 'delete';
    return `<section class="card ed opts"><div class="sec-h"><span class="tag">Opções da ficha</span></div>
      <div class="opt-row">
        <button class="btn" data-act="export">Exportar backup</button>
        <button class="btn" data-act="import">Importar backup</button>
        <button class="btn" data-act="opt-pin">Trocar PIN</button>
        <button class="btn danger push${armed ? ' armed' : ''}" data-act="delete">${armed ? 'Clique de novo pra excluir' : 'Excluir personagem'}</button>
      </div>
      ${ui.optPin ? `<form class="pinf pin-change" data-pinform="change" autocomplete="off">
        <div class="row"><div class="grow1"><label class="lb" for="np1">Novo PIN</label><input class="field pin" id="np1" type="password" inputmode="numeric" maxlength="8" placeholder="4 a 8 números"></div>
        <div class="grow1"><label class="lb" for="np2">Repita</label><input class="field pin" id="np2" type="password" inputmode="numeric" maxlength="8"></div>
        <button class="btn pri" type="submit">Salvar PIN</button></div><p class="pin-err" aria-live="polite"></p></form>` : ''}
      <p class="hint">O backup é um arquivo com a ficha inteira (incluindo histórico e anotações).</p></section>`;
  }
  function fichaView() {
    return `<div class="res-row">${res('pv', 'PV', ['Dano', 'Curar'])}${res('pd', 'PD', ['Gastar', 'Recuperar'])}</div>
      <div class="grid"><div>${attrsCard()}${skillsCard()}</div><div>${abilitiesCard()}${rollsCard()}${invCard()}${optionsCard()}</div></div>`;
  }
  function lockedPrivate() {
    return `<div class="locked-panel">${IC.lock.replace('width="16" height="16"', 'width="30" height="30"')}
      <h2>Área privada</h2><p>Histórico e anotações só aparecem para o dono da ficha e para o mestre.</p>
      ${pinForm('private', 'PIN desta ficha (ou do mestre)', 'Desbloquear')}</div>`;
  }
  const ta = (key, ph, cls = '') => `<textarea class="grow ${cls}" data-bind="priv:${key}" placeholder="${esc(ph)}" rows="2">${esc(V[key])}</textarea>`;
  function historiaView() {
    if (!role || !V) return lockedPrivate();
    const cons = V.conexoes.map((c) => {
      const armed = ui.confirm === 'con-' + c.id;
      return `<div class="con"><div class="con-h"><input class="inl con-n" data-list="priv:conexoes" data-id="${c.id}" data-field="name" value="${esc(c.name)}" placeholder="Nome">
        <button class="x${armed ? ' armed' : ''}" data-act="con-del" data-id="${c.id}" title="${armed ? 'Clique de novo para remover' : 'Remover'}" aria-label="Remover conexão">×</button></div>
        <textarea class="grow prose-ta" data-list="priv:conexoes" data-id="${c.id}" data-field="text" placeholder="Quem é, como se conheceram…" rows="1">${esc(c.text)}</textarea></div>`;
    }).join('');
    return `<div class="grid wide"><div>
        <div class="sec-h"><span class="tag">Histórico de personagem</span></div>
        <div class="paper">${ta('historia', 'Escreva a história do personagem…')}</div>
      </div><div class="stack">
        <section class="card"><div class="sec-h"><span class="tag">Aparência</span></div><div class="box">${ta('aparencia', 'Como se veste, marcas, jeito…', 'prose-ta')}</div></section>
        <section class="card"><div class="sec-h"><span class="tag">Personalidade</span></div><div class="box">${ta('personalidade', 'Manias, medos, objetivos…', 'prose-ta')}</div></section>
        <section class="card"><div class="sec-h"><span class="tag">Conexões</span></div>${cons}<button class="btn ghost add" data-act="con-add">+ Pessoa</button></section>
        <section class="card"><div class="sec-h"><span class="tag">Perguntas em aberto</span></div><div class="box">${ta('perguntas', 'O que ainda não faz sentido…', 'prose-ta')}</div></section>
      </div></div>`;
  }
  function notasView() {
    if (!role || !V) return lockedPrivate();
    const ses = V.sessoes.slice().reverse().map((s) => {
      const armed = ui.confirm === 'ses-' + s.id;
      return `<article class="ses"><div class="ses-h"><input class="inl ses-t" data-list="priv:sessoes" data-id="${s.id}" data-field="title" value="${esc(s.title)}">
        <input type="date" class="ses-d" data-list="priv:sessoes" data-id="${s.id}" data-field="date" value="${esc(s.date)}" aria-label="Data">
        <button class="x${armed ? ' armed' : ''}" data-act="ses-del" data-id="${s.id}" title="${armed ? 'Clique de novo para apagar' : 'Apagar'}" aria-label="Apagar sessão">×</button></div>
        <textarea class="grow" data-list="priv:sessoes" data-id="${s.id}" data-field="text" placeholder="O que aconteceu, quem apareceu, pistas…" rows="3">${esc(s.text)}</textarea></article>`;
    }).join('');
    return `<div class="grid"><div>
        <section class="card"><div class="sec-h"><span class="tag">Anotações</span><span class="hint">só você e o mestre veem</span></div>
        ${ta('notas', 'Pistas, nomes, lugares, coisas que o mestre falou…', 'notes-ta')}</section>
      </div><div>
        <section class="card"><div class="sec-h"><span class="tag">Diário de sessões</span></div>
        <button class="btn pri wide-btn" data-act="ses-add">+ Nova sessão</button>
        ${ses || '<p class="empty">Nenhuma sessão registrada ainda.</p>'}</section>
      </div></div>`;
  }

  // ---------------- render ----------------
  function focusKey(el) {
    if (!el || !root.contains(el)) return null;
    if (el.id) return '#' + el.id;
    for (const a of ['bind', 'max']) if (el.dataset[a]) return `[data-${a}="${el.dataset[a]}"]`;
    if (el.dataset.list) return `[data-list="${el.dataset.list}"][data-id="${el.dataset.id}"][data-field="${el.dataset.field}"]`;
    return null;
  }
  function render() {
    const ae = document.activeElement, fk = focusKey(ae);
    let s0 = null, s1 = null; if (fk) { try { s0 = ae.selectionStart; s1 = ae.selectionEnd; } catch (e) { /* ok */ } }
    const body = ui.tab === 'historia' ? historiaView() : ui.tab === 'notas' ? notasView() : fichaView();
    root.innerHTML = `<div class="sheet${role ? '' : ' locked'}">${hero()}${turnBanner()}${subnav()}${body}</div>`;
    if (!role) root.querySelectorAll('.sheet input, .sheet select, .sheet textarea').forEach((el) => { if (el.id !== 'dt' && !el.closest('.pinf')) el.disabled = true; });
    autosizeAll(root);
    if (fk) { const n = root.querySelector(fk); if (n && !n.disabled) { try { n.focus({ preventScroll: true }); } catch (e) { n.focus(); } try { if (s0 != null) n.setSelectionRange(s0, s1); } catch (e) { /* ok */ } } }
    document.title = `${P.name || 'Personagem'} — Ficha · Ordem Paranormal`;
    ctx.setAccent(P.theme);
    status();
  }

  // ---------------- ações ----------------
  let confT = null;
  function confirmThen(key, fn) {
    if (ui.confirm === key) { ui.confirm = null; fn(); return; }
    ui.confirm = key; render(); clearTimeout(confT);
    confT = setTimeout(() => { if (ui.confirm === key) { ui.confirm = null; render(); } }, 3500);
  }
  const commitPub = () => { savePub(); render(); };
  const commitPriv = () => { savePriv(); render(); };
  const setRes = (k, v) => { const r = P[k]; r.cur = Math.max(0, Math.min(r.max, v)); commitPub(); };
  const persistRolls = () => ssSet('rolls', JSON.stringify(ui.rolls));
  function doRoll(label, dice) {
    const res = dice.map((d) => ({ d, v: rnd(d) }));
    const sum = res.reduce((s, x) => s + x.v, 0);
    const r = { t: label, dice: res, sum };
    const dt = parseInt(ui.dt, 10); if (!isNaN(dt) && dice.length > 1) { r.dt = dt; r.ok = sum >= dt; }
    ui.rolls.unshift(r); ui.rolls = ui.rolls.slice(0, 15); persistRolls(); render();
    toast(`<div class="t-l">${esc(label)}</div><div class="t-d">${res.map(face).join('')}</div>${res.length > 1 ? `<div class="t-s"><small>soma</small><b>${sum}</b></div>` : ''}${pf(r, true)}`);
  }
  const find = (arr, id) => arr.find((x) => x.id === id);
  const focusSel = (sel) => setTimeout(() => { const n = root.querySelector(sel); if (n) n.focus(); }, 0);

  async function onClick(e) {
    const sw = e.target.closest('button[data-theme]');
    if (sw && root.contains(sw)) { if (role) { P.theme = sw.dataset.theme; commitPub(); } return; }
    const b = e.target.closest('[data-act]'); if (!b || b.disabled || !root.contains(b)) return;
    const d = b.dataset, a = d.act;
    if (EDIT_ACTS.has(a) && !role) { ui.showUnlock = true; render(); focusSel('#pin-unlock'); return; }
    let it;
    switch (a) {
      case 'tab': ui.tab = d.tab; ui.editAb = null; ssSet('tab', ui.tab); render(); break;
      case 'unlock': ui.showUnlock = !ui.showUnlock; render(); if (ui.showUnlock) focusSel('#pin-unlock'); break;
      case 'color': ui.showColor = !ui.showColor; render(); break;
      case 'lock':
        flushAll();
        if (role === 'master') auth.clearMaster(); else auth.clear(slug);
        role = null; V = null; pin = ''; ui.showUnlock = false; render(); say('Ficha bloqueada neste aparelho.'); break;
      case 'delta': setRes(d.res, P[d.res].cur + (+d.d)); break;
      case 'amt': {
        const inp = root.querySelector('#amt-' + d.res), n = parseInt(inp && inp.value, 10);
        if (!n || n < 0) { if (inp) inp.focus(); return; }
        setRes(d.res, P[d.res].cur + n * (+d.sign)); break;
      }
      case 'pip': { const i = +d.i; setRes(d.res, P[d.res].cur === i + 1 ? i : i + 1); break; }
      case 'full': setRes(d.res, P[d.res].max); break;
      case 'lvl': P.nivel = Math.max(1, Math.min(20, (P.nivel || 1) + (+d.d))); commitPub(); break;
      case 'roll-skill': { const sk = P.skills[+d.i]; if (sk) doRoll(sk.n, [sk.d, P.attrs[sk.a] || 4]); break; }
      case 'roll-die': doRoll('d' + d.d, [+d.d]); break;
      case 'clear-rolls': ui.rolls = []; persistRolls(); render(); break;
      case 'portrait': {
        const f = await pickFile('image/*'); if (!f) return;
        try { P.portrait = await resizeImage(f); commitPub(); } catch (err) { say(err.message, true); }
        break;
      }
      case 'portrait-remove': confirmThen('portrait', () => { P.portrait = null; commitPub(); }); break;
      case 'ab-use': it = find(P.abilities, d.id);
        if (it && P.pd.cur >= it.cost) { P.pd.cur -= it.cost; commitPub(); toast(`${esc(it.name)} · −${it.cost} PD`, { msg: true, ms: 2600 }); } break;
      case 'ab-edit': ui.editAb = d.id; render(); focusSel('#ab-name'); break;
      case 'ab-cancel': {
        it = find(P.abilities, ui.editAb);
        if (it && !it.name && !it.text) { P.abilities = P.abilities.filter((x) => x !== it); savePub(); }
        ui.editAb = null; render(); break;
      }
      case 'ab-save': it = find(P.abilities, d.id); if (it) {
        it.name = (root.querySelector('#ab-name').value || '').trim() || 'Sem nome';
        it.cost = Math.max(0, parseInt(root.querySelector('#ab-cost').value, 10) || 0);
        it.text = root.querySelector('#ab-text').value || '';
      } ui.editAb = null; commitPub(); break;
      case 'ab-add': { const id = uid(); P.abilities.push({ id, name: '', cost: 0, text: '' }); ui.editAb = id; render(); focusSel('#ab-name'); break; }
      case 'ab-del': confirmThen('ab-' + d.id, () => { P.abilities = P.abilities.filter((x) => x.id !== d.id); commitPub(); }); break;
      case 'inv-add': P.inventory.push({ id: uid(), q: 1, n: '', o: '' }); commitPub(); focusSel('.inv-r:last-of-type [data-field="n"]'); break;
      case 'inv-del': confirmThen('inv-' + d.id, () => { P.inventory = P.inventory.filter((x) => x.id !== d.id); commitPub(); }); break;
      case 'con-add': { const id = uid(); V.conexoes.push({ id, name: '', text: '' }); commitPriv(); focusSel(`[data-id="${id}"][data-field="name"]`); break; }
      case 'con-del': confirmThen('con-' + d.id, () => { V.conexoes = V.conexoes.filter((x) => x.id !== d.id); commitPriv(); }); break;
      case 'ses-add': { const id = uid(); V.sessoes.push({ id, title: 'Sessão ' + (V.sessoes.length + 1), date: today(), text: '' }); commitPriv(); focusSel(`[data-id="${id}"][data-field="text"]`); break; }
      case 'ses-del': confirmThen('ses-' + d.id, () => { V.sessoes = V.sessoes.filter((x) => x.id !== d.id); commitPriv(); }); break;
      case 'export':
        download(`ficha-${slug}-${today()}.json`, JSON.stringify({ tipo: 'ficha-op2', slug, public: P, private: V }, null, 2));
        say('Backup baixado.'); break;
      case 'import': {
        const f = await pickFile('application/json,.json'); if (!f) return;
        try {
          const j = JSON.parse(await f.text());
          if (!j || !j.public) throw new Error();
          P = normPublic(j.public); if (j.private) V = normPrivate(j.private);
          savePub(200); if (j.private) savePriv(200); render(); say('Backup importado.');
        } catch (err) { say('Esse arquivo não é um backup de ficha válido.', true); }
        break;
      }
      case 'opt-pin': ui.optPin = !ui.optPin; render(); if (ui.optPin) focusSel('#np1'); break;
      case 'delete': confirmThen('delete', async () => {
        try { await store.remove(slug, pin); auth.clear(slug); say('Personagem excluído.'); ctx.navigate('/'); }
        catch (err) { say(msgOf(err), true); render(); }
      }); break;
    }
  }
  async function onSubmit(e) {
    const f = e.target.closest('form[data-pinform]'); if (!f) return;
    e.preventDefault();
    const errEl = f.querySelector('.pin-err'), kind = f.dataset.pinform;
    const btn = f.querySelector('button[type=submit]');
    if (kind === 'change') {
      const a = f.querySelector('#np1').value.trim(), b2 = f.querySelector('#np2').value.trim();
      if (!/^[0-9]{4,8}$/.test(a)) { errEl.textContent = 'Use de 4 a 8 números.'; return; }
      if (a !== b2) { errEl.textContent = 'Os PINs não batem.'; return; }
      btn.disabled = true;
      try {
        await store.changePin(slug, pin, a);
        if (role === 'owner') { pin = a; auth.set(slug, a); }
        ui.optPin = false; render(); say('PIN alterado.');
      } catch (err) { errEl.textContent = msgOf(err); btn.disabled = false; }
      return;
    }
    const p = f.querySelector('input.pin').value.trim();
    if (!p) return;
    btn.disabled = true; errEl.textContent = '';
    try {
      const r = await tryUnlock(p, true);
      if (!r) { errEl.textContent = 'PIN incorreto.'; btn.disabled = false; f.querySelector('input.pin').select(); return; }
      ui.showUnlock = false; render(); say(r === 'master' ? 'Desbloqueado como mestre.' : 'Ficha desbloqueada.');
    } catch (err) { errEl.textContent = msgOf(err); btn.disabled = false; }
  }
  function parseScope(v) { const [sc, key] = v.split(':'); return { obj: sc === 'priv' ? V : P, priv: sc === 'priv', key }; }
  const val = (t) => { if (t.dataset.type === 'num') { const n = parseInt(t.value, 10); return isNaN(n) ? 0 : n; } return t.value; };
  function onInput(e) {
    const t = e.target; if (!root.contains(t)) return;
    if (t.tagName === 'TEXTAREA' && t.classList.contains('grow')) autosize(t);
    if (t.classList.contains('fit')) t.size = sz(t.value);
    if (t.classList.contains('name')) t.style.setProperty('--len', Math.max(4, t.value.length));
    if (t.id === 'dt') { ui.dt = t.value; ssSet('dt', t.value); return; }
    if (!role) return;
    if (t.dataset.themeInput != null) { ctx.setAccent(t.value); return; } // prévia ao arrastar
    if (t.dataset.bind) {
      const { obj, priv, key } = parseScope(t.dataset.bind); if (!obj) return;
      obj[key] = t.value; priv ? savePriv() : savePub(); return;
    }
    if (t.dataset.list) {
      const { obj, priv, key } = parseScope(t.dataset.list); if (!obj) return;
      const it = find(obj[key] || [], t.dataset.id); if (it) { it[t.dataset.field] = val(t); priv ? savePriv() : savePub(); }
    }
  }
  function onChange(e) {
    const t = e.target; if (!root.contains(t) || !role) return;
    if (t.dataset.themeInput != null) { P.theme = t.value; commitPub(); return; }
    if (t.dataset.sel === 'attr') { P.attrs[t.dataset.id] = +t.value; commitPub(); return; }
    if (t.dataset.sel === 'skill') { P.skills[+t.dataset.id].d = +t.value; commitPub(); return; }
    if (t.dataset.max) {
      const k = t.dataset.max, m = Math.max(1, Math.min(99, parseInt(t.value, 10) || 1));
      P[k].max = m; if (P[k].cur > m) P[k].cur = m; commitPub();
    }
  }
  function onKey(e) {
    const t = e.target;
    if (e.key === 'Enter' && t.classList && t.classList.contains('amt') && role) {
      e.preventDefault(); const k = t.id.replace('amt-', ''), n = parseInt(t.value, 10);
      if (n > 0) { t.value = ''; setRes(k, P[k].cur - n); }
    }
  }
  const onResize = () => autosizeAll(root);

  root.addEventListener('click', onClick);
  root.addEventListener('submit', onSubmit);
  root.addEventListener('input', onInput);
  root.addEventListener('change', onChange);
  root.addEventListener('keydown', onKey);
  window.addEventListener('resize', onResize);
  render();
  loadEnc();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => autosizeAll(root));

  return () => {
    flushAll(); unsub(); unsubMesa(); clearTimeout(encT);
    window.removeEventListener('pagehide', flushAll);
    window.removeEventListener('resize', onResize);
    root.removeEventListener('click', onClick); root.removeEventListener('submit', onSubmit);
    root.removeEventListener('input', onInput); root.removeEventListener('change', onChange); root.removeEventListener('keydown', onKey);
  };
}

function sz(v) { return Math.max(4, String(v || '').length + 2); }
function errorView(msg) {
  return `<div class="locked-panel"><h2>Ops</h2><p>${esc(msg)}</p><a class="btn pri" href="/" data-link>Voltar para os personagens</a></div>`;
}
