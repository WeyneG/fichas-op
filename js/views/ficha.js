// Tela da ficha de um personagem.
import { ATTRS, DICE, uid, normPublic, normPrivate } from '../data.js';
import { auth, msgOf } from '../store.js';
import { esc, IC, dieSel, autosize, autosizeAll, rnd, today, toast, say, resizeImage, pickFile, download, pinForm, themePicker, dieIcon, rollExpression } from '../ui.js';
import { hit, lowHp, spinDice } from '../fx.js';

// Ações que precisam do PIN
const EDIT_ACTS = new Set(['delta', 'amt', 'pip', 'full', 'lvl', 'portrait', 'portrait-remove', 'ab-use', 'ab-edit', 'ab-save',
  'ab-add', 'ab-del', 'inv-add', 'inv-del', 'con-add', 'con-del', 'ses-add', 'ses-del', 'export', 'import', 'pin-change',
  'delete', 'opt-pin', 'color', 'rdt', 'armor', 'attr-step', 'rel-photo', 'rel-grau', 'rel-uso', 'rel-reset', 'pt-add', 'pt-del', 'play']);
// Ações bloqueadas no "modo jogo" (pra não mexer sem querer durante a sessão)
const PLAY_BLOCK = new Set(['lvl', 'portrait', 'portrait-remove', 'ab-edit', 'ab-add', 'ab-del', 'inv-add', 'inv-del', 'attr-step',
  'color', 'rdt', 'delete', 'import', 'opt-pin']);
const TABS = [['ficha', 'Agente'], ['invest', 'Investigação'], ['rel', 'Relações'], ['historia', 'Histórico']];
const stepDie = (d, n) => { let i = DICE.indexOf(d); if (i < 0) return d; i = Math.max(0, Math.min(DICE.length - 1, i + n)); return DICE[i]; };
const pad2 = (n) => String(n).padStart(2, '0');

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
  const ls = (k) => { try { return localStorage.getItem(`op2:${slug}:${k}`); } catch (e) { return null; } };
  const lsSet = (k, v) => { try { localStorage.setItem(`op2:${slug}:${k}`, v); } catch (e) { /* ok */ } };
  const json = (v, d) => { try { return JSON.parse(v) ?? d; } catch (e) { return d; } };
  let tab0 = ss('tab') || 'ficha'; if (tab0 === 'notas') tab0 = 'invest'; if (!TABS.some(([k]) => k === tab0)) tab0 = 'ficha';
  const ui = {
    tab: tab0, editAb: null, confirm: null, showUnlock: false, optPin: false, showColor: false, anim: [], enter: true,
    dt: ss('dt') || '', rolls: json(ss('rolls'), []),
    play: ls('play') === '1',
    mods: Object.assign({ b1: 0, b2: 0, passo: 0, pavorD: 6, pavorOn: false }, json(ss('mods'), {})),
    sort: ss('sort') || 'nome', abTab: 'hab', abQuery: '', collapsed: new Set(json(ss('collapsed'), [])),
    pAba: 0, nAba: 0, expr: ss('expr') || '',
  };
  const saveMods = () => ssSet('mods', JSON.stringify(ui.mods));

  async function tryUnlock(p, remember) {
    const r = await store.checkPin(slug, p);
    if (!r) return null;
    pin = p; role = r;
    V = normPrivate(await store.getPrivate(slug, p));
    if (remember) { if (r === 'master') auth.setMaster(p); else auth.set(slug, p); }
    return r;
  }
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
    if (e.code === 'pin_invalido') { role = null; V = null; auth.clear(slug); say('O PIN desta ficha mudou. Desbloqueie de novo.', true); render(); return; }
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
    for (const k of ['pv', 'pd']) {
      if (incoming[k].cur !== P[k].cur && incoming[k].max === P[k].max) ui.anim.push({ k, from: P[k].cur, to: incoming[k].cur });
    }
    const tookDmg = incoming.pv.cur < P.pv.cur;
    P = incoming; render();
    if (tookDmg) hit(incoming.pv.cur === 0 ? 2 : 1);
  });

  // =================================================================
  // VIEWS
  // =================================================================
  function hero() {
    return `<section class="hero">
      <div class="portrait-w"><button class="portrait" data-act="portrait" aria-label="Trocar retrato">${
        P.portrait ? `<img src="${P.portrait}" alt="Retrato de ${esc(P.name)}">` : `<span class="ph">${IC.user}<span class="ed ed2">Adicionar retrato</span></span>`
      }</button>${P.portrait ? '<button class="link ed ed2" data-act="portrait-remove">' + (ui.confirm === 'portrait' ? 'confirmar?' : 'remover') + '</button>' : ''}</div>
      <div class="hero-main">
        <input class="name inl" data-bind="pub:name" style="--len:${Math.max(4, (P.name || '').length)}" value="${esc(P.name)}" placeholder="NOME" aria-label="Nome do personagem" spellcheck="false" autocomplete="off">
        <div class="meta">${P.pv.cur <= 0 ? '<span class="dead-chip">Caído</span>' : ''}
          ${role || P.classe ? `<span class="tag"><input class="inl fit" data-bind="pub:classe" size="${sz(P.classe)}" value="${esc(P.classe)}" placeholder="CLASSE" aria-label="Classe" spellcheck="false"></span>
          <span class="dot">•</span>` : ''}
          ${role || P.ocupacao ? `<input class="inl meta-in fit" data-bind="pub:ocupacao" size="${sz(P.ocupacao)}" value="${esc(P.ocupacao)}" placeholder="OCUPAÇÃO" aria-label="Ocupação" spellcheck="false">
          <span class="dot">•</span>` : ''}<span>Nível</span>
          <span class="stepper"><button class="ed ed2" data-act="lvl" data-d="-1" aria-label="Diminuir nível">−</button><span class="tag lvl">${P.nivel}</span><button class="ed ed2" data-act="lvl" data-d="1" aria-label="Aumentar nível">+</button></span>
        </div>
      </div></section>`;
  }
  function subnav() {
    const tabs = TABS.map(([k, l]) =>
      `<button class="stab${ui.tab === k ? ' on' : ''}" data-act="tab" data-tab="${k}">${l}${k !== 'ficha' && !role ? ' ' + IC.lock : ''}</button>`).join('');
    const lock = role
      ? `<button class="lockbtn on" data-act="lock" title="Esquecer o PIN neste aparelho">${IC.unlock}<span>${role === 'master' ? 'Mestre' : 'Desbloqueada'}</span></button>`
      : `<button class="lockbtn" data-act="unlock">${IC.lock}<span>Desbloquear</span></button>`;
    const playBtn = role ? `<button class="modebtn${ui.play ? ' on' : ''}" data-act="play" title="${ui.play ? 'Modo jogo: só PV, PD, rolagens e anotações. Clique pra editar a ficha.' : 'Modo edição. Clique pra travar a ficha durante a sessão.'}">${ui.play ? IC.play + '<span>Modo jogo</span>' : IC.pen + '<span>Modo edição</span>'}</button>` : '';
    const colorBtn = role ? `<button class="colorbtn ed2${ui.showColor ? ' on' : ''}" data-act="color" title="Cor da ficha" aria-label="Cor da ficha"><i></i><span>Cor</span></button>` : '';
    let panel = '';
    if (!role && ui.showUnlock) panel = `<div class="unlock-panel">${pinForm('unlock', 'PIN desta ficha (ou do mestre)', 'Desbloquear')}<p class="hint">O PIN fica lembrado neste aparelho.</p></div>`;
    else if (role && ui.showColor && !ui.play) panel = `<div class="unlock-panel color-panel"><span class="lb">Cor da ficha</span>${themePicker(P.theme)}<p class="hint">Muda a cor de destaque da sua ficha (e do seu card na mesa).</p></div>`;
    return `<div class="subnav"><div class="stabs">${tabs}</div>${colorBtn}${playBtn}${lock}</div>${panel}`;
  }

  // ---------- Agente ----------
  function res(key, label, verbs) {
    const r = P[key], low = r.cur <= Math.ceil(r.max * 0.25);
    let p = '';
    const an = ui.anim.find((a) => a.k === key);
    for (let i = 0; i < r.max; i++) {
      let fx = '', st = '';
      if (an && an.to < an.from && i >= an.to && i < an.from) { fx = key === 'pd' ? ' snuff' : ' brk'; st = ` style="animation-delay:${(an.from - 1 - i) * 45}ms"`; }
      if (an && an.to > an.from && i >= an.from && i < an.to) { fx = ' gain'; st = ` style="animation-delay:${(i - an.from) * 60}ms"`; }
      p += `<button class="pip${i < r.cur ? ' on' : ''}${fx}"${st} data-act="pip" data-res="${key}" data-i="${i}" aria-label="${label} ${i + 1}"></button>`;
    }
    return `<div class="res res-${key}${low ? ' low' : ''}">
      <div class="res-top"><span class="tag">${label}</span>
        <span class="res-dt" title="DT ligada ao ${label}"><button class="ed ed2" data-act="rdt" data-res="${key}" data-d="-1" aria-label="Diminuir DT">−</button><span>DT <b>${pad2(r.dt)}</b></span><button class="ed ed2" data-act="rdt" data-res="${key}" data-d="1" aria-label="Aumentar DT">+</button></span>
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
  function armorBox() {
    return `<div class="res armor"><div class="res-top"><span class="tag">Armadura</span></div>
      <div class="armor-v">${IC.shield}<b>${P.armor}</b></div>
      <div class="armor-c ed"><button class="btn sq" data-act="armor" data-d="-1" aria-label="Diminuir armadura">−</button><button class="btn sq" data-act="armor" data-d="1" aria-label="Aumentar armadura">+</button></div>
      <span class="hint">pontos de armadura</span></div>`;
  }
  function attrsCard() {
    const a = Object.keys(ATTRS).map((k) => `<div class="attr"><span class="attr-l">${ATTRS[k].label}</span>
      <div class="attr-ctl"><button class="mini ed ed2" data-act="attr-step" data-id="${k}" data-d="-1" aria-label="Diminuir ${ATTRS[k].label}">−</button>${dieSel('attr', k, P.attrs[k], ATTRS[k].label)}<button class="mini ed ed2" data-act="attr-step" data-id="${k}" data-d="1" aria-label="Aumentar ${ATTRS[k].label}">+</button></div></div>`).join('');
    return `<section class="card"><div class="sec-h"><span class="tag">Atributos</span></div><div class="attrs">${a}</div></section>`;
  }
  function bonusSel(k) {
    const v = ui.mods[k];
    return `<select class="dsel free bsel${v ? ' on' : ''}" data-mod="${k}" aria-label="Dado bônus"><option value="0"${!v ? ' selected' : ''}>—</option>${DICE.map((d) => `<option value="${d}"${v === d ? ' selected' : ''}>d${d}</option>`).join('')}</select>`;
  }
  function modsCard() {
    const m = ui.mods, active = m.b1 || m.b2 || m.passo || m.pavorOn;
    return `<section class="card mods${m.pavorOn ? ' pavor' : ''}${active ? ' active' : ''}"><div class="sec-h"><span class="tag">Modificadores</span><span class="hint">valem pras próximas rolagens de perícia</span>${active ? '<button class="link" data-act="mods-clear">zerar</button>' : ''}</div>
      <div class="mods-grid">
        <div class="mod"><span class="lb">Dados bônus</span><div class="mod-row">${bonusSel('b1')}<span class="plus">+</span>${bonusSel('b2')}</div></div>
        <div class="mod"><span class="lb">Passos da perícia</span><div class="stepper2"><button data-act="passo" data-d="-1" aria-label="Descer passo">−</button><b>${m.passo > 0 ? '+' : ''}${m.passo}</b><button data-act="passo" data-d="1" aria-label="Subir passo">+</button></div></div>
        <div class="mod"><span class="lb">Dado de Pavor</span><div class="mod-row"><div class="stepper2"><button data-act="pavor-d" data-d="-1" aria-label="Dado de pavor menor">−</button><b>d${m.pavorD}</b><button data-act="pavor-d" data-d="1" aria-label="Dado de pavor maior">+</button></div>
          <label class="chk"><input type="checkbox" class="free" id="pavor-on"${m.pavorOn ? ' checked' : ''}> Ativar</label></div></div>
      </div>
      ${m.pavorOn ? '<p class="hint pav-hint">Pavor ativo: o dado de pavor anula seus dados que tirarem menos que ele.</p>' : ''}</section>`;
  }
  function skillsCard() {
    const list = P.skills.map((sk, i) => ({ sk, i }));
    if (ui.sort === 'passo') list.sort((a, b) => b.sk.d - a.sk.d || a.sk.n.localeCompare(b.sk.n, 'pt'));
    const passo = ui.mods.passo;
    const rows = list.map(({ sk, i }) => {
      const at = ATTRS[sk.a] || ATTRS.fisico, ad = P.attrs[sk.a] || 4, eff = stepDie(sk.d, passo);
      return `<div class="sk${sk.d > 4 ? ' tr' : ''}"><span class="sk-n">${esc(sk.n)}</span><span class="sk-d">${dieSel('skill', i, sk.d, 'Dado de ' + sk.n)}${eff !== sk.d ? `<em class="shift ${eff > sk.d ? 'up' : 'down'}">d${eff}</em>` : ''}</span>
        <span class="plus">+</span><span class="adie" title="${at.label} d${ad}"><i>${ad}</i></span><span class="sk-a">${at.ab}</span>
        <button class="rollb" data-act="roll-skill" data-i="${i}" aria-label="Rolar ${esc(sk.n)}" title="Rolar d${eff} + d${ad}">${IC.die}</button></div>`;
    }).join('');
    return `<section class="card"><div class="sec-h"><span class="tag">Perícias</span>
      <div class="seg"><button class="${ui.sort === 'nome' ? 'on' : ''}" data-act="sort" data-s="nome">Nome</button><button class="${ui.sort === 'passo' ? 'on' : ''}" data-act="sort" data-s="passo">Passo</button></div></div>
      <div class="skills">${rows}</div></section>`;
  }
  function abilitiesList() {
    const q = ui.abQuery.trim().toLowerCase();
    const list = P.abilities.filter((a) => !q || (a.name + ' ' + a.text).toLowerCase().includes(q)).map((a) => {
      if (ui.editAb === a.id && role) {
        return `<div class="ab ab-edit">
          <div class="row"><div class="grow1"><label class="lb" for="ab-name">Nome</label><input class="field" id="ab-name" value="${esc(a.name)}"></div>
          <div class="w92"><label class="lb" for="ab-cost">Custo PD</label><input class="field" id="ab-cost" type="number" min="0" value="${a.cost || 0}"></div></div>
          <div><label class="lb" for="ab-text">Descrição</label><textarea class="field grow prose-ta" id="ab-text" rows="3">${esc(a.text)}</textarea></div>
          <div class="ab-act"><button class="btn pri" data-act="ab-save" data-id="${a.id}">Salvar</button><button class="link" data-act="ab-cancel">cancelar</button></div></div>`;
      }
      const armed = ui.confirm === 'ab-' + a.id, closed = ui.collapsed.has(a.id);
      return `<article class="ab${closed ? ' closed' : ''}"><header data-act="ab-toggle" data-id="${a.id}" role="button" tabindex="0" aria-expanded="${!closed}"><h3>${esc(a.name || 'Sem nome')}</h3>${a.cost ? `<span class="cost">${a.cost} PD</span>` : ''}<span class="chev">${IC.chev}</span></header>
        ${closed ? '' : `<p>${esc(a.text).replace(/\n/g, '<br>')}</p><div class="ab-act ed">
        ${a.cost ? `<button class="btn pri" data-act="ab-use" data-id="${a.id}"${P.pd.cur < a.cost ? ' disabled title="PD insuficiente"' : ''}>Usar (−${a.cost} PD)</button>` : ''}
        <button class="btn ed2" data-act="ab-edit" data-id="${a.id}">Editar</button>
        <button class="btn ed2 danger${armed ? ' armed' : ''}" data-act="ab-del" data-id="${a.id}">${armed ? 'Confirmar?' : 'Remover'}</button></div>`}</article>`;
    }).join('');
    return `<label class="search"><span>${IC.search}</span><input class="free" id="ab-q" type="search" placeholder="Buscar habilidades" value="${esc(ui.abQuery)}" autocomplete="off"></label>
      ${list || `<p class="empty">${q ? 'Nenhuma habilidade encontrada.' : 'Nenhuma habilidade ainda.'}</p>`}`;
  }
  function equipList() {
    const rows = P.inventory.map((it) => {
      const armed = ui.confirm === 'inv-' + it.id;
      return `<div class="inv-r"><input type="number" class="qty" data-list="pub:inventory" data-id="${it.id}" data-field="q" data-type="num" min="0" value="${it.q == null ? 1 : it.q}" aria-label="Quantidade">
        <input class="inl" data-list="pub:inventory" data-id="${it.id}" data-field="n" value="${esc(it.n)}" placeholder="Equipamento">
        <input class="inl inv-o" data-list="pub:inventory" data-id="${it.id}" data-field="o" value="${esc(it.o)}" placeholder="detalhe">
        <button class="x ed ed2${armed ? ' armed' : ''}" data-act="inv-del" data-id="${it.id}" aria-label="Remover equipamento" title="${armed ? 'Clique de novo para remover' : 'Remover'}">×</button></div>`;
    }).join('');
    return rows || '<p class="empty">Nenhum equipamento ainda.</p>';
  }
  function habEquipCard() {
    const hab = ui.abTab === 'hab';
    return `<section class="card habeq"><div class="tabhead">
        <button class="tab2${hab ? ' on' : ''}" data-act="abtab" data-t="hab">Habilidades</button>
        <button class="tab2${!hab ? ' on' : ''}" data-act="abtab" data-t="eq">Equipamentos</button>
        <button class="plusbtn ed ed2" data-act="${hab ? 'ab-add' : 'inv-add'}" aria-label="${hab ? 'Nova habilidade' : 'Novo equipamento'}" title="${hab ? 'Nova habilidade' : 'Novo equipamento'}">+</button></div>
      ${hab ? abilitiesList() : equipList()}</section>`;
  }
  const dieClasses = (x) => `${x.x ? ' cancel' : ''}${x.k === 'bon' ? ' bonus' : ''}${x.k === 'pav' ? ' pavor' : ''}${x.neg ? ' neg' : ''}`;
  const dieLabel = (x) => x.k === 'pav' ? 'pavor' : x.k === 'bon' ? `+d${x.d}` : `${x.neg ? '−' : ''}d${x.d}`;
  const dieTitle = (x) => x.k === 'pav' ? `Dado de pavor: ${x.v}` : x.x ? `d${x.d} tirou ${x.v}, anulado pelo pavor` : `Rolou um d${x.d} e tirou ${x.v}`;
  const face = (x) => `<span class="face${dieClasses(x)}" data-d="${x.d}" data-v="${x.v}" title="${dieTitle(x)}"><small>${dieLabel(x)}</small><b>${x.v}</b></span>`;
  const pf = (r, big) => r.dt != null ? `<span class="pf ${r.ok ? 'ok' : 'no'}">${r.ok ? 'passou' : 'falhou'}${big ? ' · DT ' + r.dt : ''}</span>` : '';
  const critTag = (r) => r.crit ? `<span class="critb ${r.crit}">${r.crit === 'crit' ? 'Sucesso crítico' : 'Falha crítica'}</span>` : '';
  function rollsCard() {
    const tray = [4, 6, 8, 10, 12, 20].map((d) => `<button class="dicon" data-act="expr-add" data-d="${d}" title="Adicionar 1d${d}">${dieIcon(d)}<span>d${d}</span></button>`).join('');
    const li = (r) => `<li class="${r.crit || ''}"><span class="h-t">${esc(r.t)}</span><span class="h-d">${r.dice.map(face).join('')}${r.mod ? `<span class="h-mod">${r.mod > 0 ? '+' : '−'}${Math.abs(r.mod)}</span>` : ''}</span>${r.dice.length > 1 || r.mod ? `<b class="h-s">${r.sum}</b>` : ''}${r.crit ? `<span class="critb sm ${r.crit}">${r.crit === 'crit' ? 'crítico' : 'falha crít.'}</span>` : ''}${pf(r)}</li>`;
    return `<section class="card"><div class="sec-h"><span class="tag">Dados</span></div>
      <div class="dtray">${tray}</div>
      <form class="exprf" data-form="expr" autocomplete="off"><input class="field free" id="expr" placeholder="Rolar dados (ex.: 2d6+1)" value="${esc(ui.expr)}" spellcheck="false">
        ${ui.expr ? '<button type="button" class="x" data-act="expr-clear" aria-label="Limpar">×</button>' : ''}<button class="btn pri" type="submit">Rolar</button></form>
      <label class="dt" title="Se preencher, compara o total dos testes de perícia com a DT">DT dos testes <input type="number" id="dt" value="${esc(ui.dt)}" placeholder="—" inputmode="numeric"></label>
      <ol class="hist">${ui.rolls.length ? ui.rolls.map(li).join('') : '<li class="empty">Toque no dado ao lado de uma perícia, ou monte uma rolagem acima.</li>'}</ol>
      ${ui.rolls.length ? '<button class="link" data-act="clear-rolls">limpar histórico</button>' : ''}</section>`;
  }
  function optionsCard() {
    const armed = ui.confirm === 'delete';
    return `<section class="card ed ed2 opts"><div class="sec-h"><span class="tag">Opções da ficha</span></div>
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
      <p class="hint">O backup é um arquivo com a ficha inteira (incluindo histórico, investigação e relações).</p></section>`;
  }
  function fichaView() {
    return `<div class="res-row">${res('pv', 'PV', ['Dano', 'Curar'])}${res('pd', 'PD', ['Gastar', 'Recuperar'])}${armorBox()}</div>
      <div class="grid"><div>${attrsCard()}${modsCard()}${skillsCard()}</div><div>${habEquipCard()}${rollsCard()}${optionsCard()}</div></div>`;
  }

  // ---------- áreas privadas ----------
  function lockedPrivate() {
    return `<div class="locked-panel">${IC.lock.replace('width="16" height="16"', 'width="30" height="30"')}
      <h2>Área privada</h2><p>Investigação, relações e histórico só aparecem para o dono da ficha e para o mestre.</p>
      ${pinForm('private', 'PIN desta ficha (ou do mestre)', 'Desbloquear')}</div>`;
  }
  const ta = (key, ph, cls = '') => `<textarea class="grow ${cls}" data-bind="priv:${key}" placeholder="${esc(ph)}" rows="2">${esc(V[key])}</textarea>`;
  const abas = (act, cur) => `<div class="abas">${[0, 1, 2, 3].map((i) => `<button class="aba${cur === i ? ' on' : ''}" data-act="${act}" data-i="${i}">Aba ${i + 1}</button>`).join('')}</div>`;
  function investView() {
    if (!role || !V) return lockedPrivate();
    const pts = V.pontos.filter((p) => (p.aba || 0) === ui.pAba).map((p) => {
      const armed = ui.confirm === 'pt-' + p.id;
      return `<article class="pt"><div class="pt-h"><input class="inl pt-t" data-list="priv:pontos" data-id="${p.id}" data-field="t" value="${esc(p.t)}" placeholder="Nova nota">
          <button class="x${armed ? ' armed' : ''}" data-act="pt-del" data-id="${p.id}" title="${armed ? 'Clique de novo para apagar' : 'Apagar'}" aria-label="Apagar nota">×</button></div>
        <div class="pt-f">${['f1', 'f2', 'f3'].map((f) => `<input class="field sm" data-list="priv:pontos" data-id="${p.id}" data-field="${f}" value="${esc(p[f] || '')}" placeholder="—">`).join('')}</div>
        <textarea class="grow field" data-list="priv:pontos" data-id="${p.id}" data-field="text" placeholder="Anote os pontos de interesse aqui." rows="3">${esc(p.text || '')}</textarea></article>`;
    }).join('');
    const ses = V.sessoes.slice().reverse().map((s) => {
      const armed = ui.confirm === 'ses-' + s.id;
      return `<article class="ses"><div class="ses-h"><input class="inl ses-t" data-list="priv:sessoes" data-id="${s.id}" data-field="title" value="${esc(s.title)}">
        <input type="date" class="ses-d" data-list="priv:sessoes" data-id="${s.id}" data-field="date" value="${esc(s.date)}" aria-label="Data">
        <button class="x${armed ? ' armed' : ''}" data-act="ses-del" data-id="${s.id}" title="${armed ? 'Clique de novo para apagar' : 'Apagar'}" aria-label="Apagar sessão">×</button></div>
        <textarea class="grow" data-list="priv:sessoes" data-id="${s.id}" data-field="text" placeholder="O que aconteceu, quem apareceu, pistas…" rows="3">${esc(s.text)}</textarea></article>`;
    }).join('');
    return `<div class="invest">
      <section class="card"><div class="sec-h"><span class="tag">Pontos de interesse</span><button class="btn sm" data-act="pt-add">+ Nota</button></div>
        ${abas('paba', ui.pAba)}<div class="pts">${pts || '<p class="empty">Nenhuma nota nesta aba.</p>'}</div></section>
      <section class="card"><div class="sec-h"><span class="tag">Anotações</span><span class="hint">só você e o mestre veem</span></div>
        ${abas('naba', ui.nAba)}<textarea class="grow notes-ta" data-nota="${ui.nAba}" placeholder="Anote o necessário aqui." rows="10">${esc(V.notasAbas[ui.nAba] || '')}</textarea></section>
      <section class="card"><div class="sec-h"><span class="tag">Diário de sessões</span></div>
        <button class="btn pri wide-btn" data-act="ses-add">+ Nova sessão</button>${ses || '<p class="empty">Nenhuma sessão registrada ainda.</p>'}</section>
    </div>`;
  }
  function relView() {
    if (!role || !V) return lockedPrivate();
    const cards = V.conexoes.map((c) => {
      const armed = ui.confirm === 'con-' + c.id, g = Math.max(1, Math.min(3, c.grau || 1));
      return `<article class="rel${c.usado ? ' used' : ''}">
        <button class="x rel-x${armed ? ' armed' : ''}" data-act="con-del" data-id="${c.id}" title="${armed ? 'Clique de novo para remover' : 'Remover'}" aria-label="Remover relação">×</button>
        <button class="rel-photo" data-act="rel-photo" data-id="${c.id}" aria-label="Foto de ${esc(c.name || 'personagem')}">${c.foto ? `<img src="${c.foto}" alt="">` : '<span>Clique para adicionar uma foto.</span>'}</button>
        <input class="inl rel-n" data-list="priv:conexoes" data-id="${c.id}" data-field="name" value="${esc(c.name)}" placeholder="Nome aqui">
        <div class="rel-g" role="group" aria-label="Grau da relação">${[1, 2, 3].map((n) => `<button class="dot3${n <= g ? ' on' : ''}" data-act="rel-grau" data-id="${c.id}" data-g="${n}" aria-label="Grau ${n}" title="Grau ${n}"></button>`).join('')}</div>
        <button class="chip rel-u${c.usado ? ' on' : ''}" data-act="rel-uso" data-id="${c.id}">${c.usado ? 'usada nesta missão' : 'disponível'}</button>
        <textarea class="grow rel-t" data-list="priv:conexoes" data-id="${c.id}" data-field="text" placeholder="Quem é, como se conheceram…" rows="2">${esc(c.text)}</textarea>
      </article>`;
    }).join('');
    const anyUsed = V.conexoes.some((c) => c.usado);
    return `<div class="sec-h"><span class="tag">Relações</span><span class="hint">grau de 1 a 3 · cada relação pode ser invocada uma vez por missão</span></div>
      <div class="rel-tools"><button class="btn" data-act="con-add">+ Adicionar personagem</button>
        ${anyUsed ? `<button class="btn ghost${ui.confirm === 'rel-reset' ? ' armed' : ''}" data-act="rel-reset">${ui.confirm === 'rel-reset' ? 'Confirmar nova missão?' : 'Nova missão (liberar todas)'}</button>` : ''}</div>
      <div class="rels">${cards || '<p class="empty">Nenhuma relação ainda.</p>'}</div>`;
  }
  function historiaView() {
    if (!role || !V) return lockedPrivate();
    return `<div class="grid wide"><div>
        <div class="sec-h"><span class="tag">Histórico de personagem</span></div>
        <div class="paper">${ta('historia', 'Escreva a história do personagem…')}</div>
      </div><div class="stack">
        <section class="card"><div class="sec-h"><span class="tag">Aparência</span></div><div class="box">${ta('aparencia', 'Como se veste, marcas, jeito…', 'prose-ta')}</div></section>
        <section class="card"><div class="sec-h"><span class="tag">Personalidade</span></div><div class="box">${ta('personalidade', 'Manias, medos, objetivos…', 'prose-ta')}</div></section>
        <section class="card"><div class="sec-h"><span class="tag">Perguntas em aberto</span></div><div class="box">${ta('perguntas', 'O que ainda não faz sentido…', 'prose-ta')}</div></section>
      </div></div>`;
  }

  // =================================================================
  // RENDER
  // =================================================================
  function focusKey(el) {
    if (!el || !root.contains(el)) return null;
    if (el.id) return '#' + el.id;
    for (const a of ['bind', 'max', 'nota', 'mod']) if (el.dataset[a] != null) return `[data-${a}="${el.dataset[a]}"]`;
    if (el.dataset.list) return `[data-list="${el.dataset.list}"][data-id="${el.dataset.id}"][data-field="${el.dataset.field}"]`;
    return null;
  }
  function render() {
    const ae = document.activeElement, fk = focusKey(ae);
    let s0 = null, s1 = null; if (fk) { try { s0 = ae.selectionStart; s1 = ae.selectionEnd; } catch (e) { /* ok */ } }
    const body = ui.tab === 'historia' ? historiaView() : ui.tab === 'invest' ? investView() : ui.tab === 'rel' ? relView() : fichaView();
    const dead = P.pv.cur <= 0;
    root.innerHTML = `<div class="sheet${role ? '' : ' locked'}${role && ui.play ? ' play' : ''}${ui.enter ? ' enter' : ''}${dead ? ' dead' : ''}">${hero()}${turnBanner()}${subnav()}${body}</div>`;
    ui.enter = false; ui.anim = [];
    lowHp(!dead && P.pv.cur <= Math.ceil(P.pv.max * 0.25));
    if (!role) root.querySelectorAll('.sheet input, .sheet select, .sheet textarea').forEach((el) => { if (el.id !== 'dt' && !el.classList.contains('free') && !el.closest('.pinf')) el.disabled = true; });
    else if (ui.play) root.querySelectorAll('.sheet [data-bind^="pub:"], .sheet select[data-sel], .sheet .maxin, .sheet [data-list="pub:inventory"]').forEach((el) => { el.disabled = true; });
    autosizeAll(root);
    if (fk) { const n = root.querySelector(fk); if (n && !n.disabled) { try { n.focus({ preventScroll: true }); } catch (e) { n.focus(); } try { if (s0 != null) n.setSelectionRange(s0, s1); } catch (e) { /* ok */ } } }
    document.title = `${P.name || 'Personagem'} — Ficha · Ordem Paranormal`;
    ctx.setAccent(P.theme);
    status();
  }

  // =================================================================
  // AÇÕES
  // =================================================================
  let confT = null;
  function confirmThen(key, fn) {
    if (ui.confirm === key) { ui.confirm = null; fn(); return; }
    ui.confirm = key; render(); clearTimeout(confT);
    confT = setTimeout(() => { if (ui.confirm === key) { ui.confirm = null; render(); } }, 3500);
  }
  const commitPub = () => { savePub(); render(); };
  const commitPriv = () => { savePriv(); render(); };
  const setRes = (k, v) => {
    const r = P[k], from = r.cur;
    r.cur = Math.max(0, Math.min(r.max, v));
    if (r.cur !== from) ui.anim.push({ k, from, to: r.cur });
    commitPub();
    if (k === 'pv' && r.cur < from) hit(r.cur === 0 || from - r.cur >= 5 ? 2 : 1);
  };
  const persistRolls = () => ssSet('rolls', JSON.stringify(ui.rolls));
  function finishRoll(r, test) {
    const dt = parseInt(ui.dt, 10);
    if (test && !isNaN(dt)) { r.dt = dt; r.ok = r.sum >= dt; }
    ui.rolls.unshift(r); ui.rolls = ui.rolls.slice(0, 20); persistRolls(); render();
    toast(`<div class="t-l">${esc(r.t)}</div><div class="t-d">${r.dice.map(face).join('')}${r.mod ? `<span class="h-mod big">${r.mod > 0 ? '+' : '−'}${Math.abs(r.mod)}</span>` : ''}</div>${r.dice.length > 1 || r.mod ? `<div class="t-s"><small>total</small><b>${r.sum}</b></div>` : ''}${critTag(r)}${pf(r, true)}`, { ms: 6500 });
    spinDice(document.querySelector('.toast'));
  }
  // Teste de perícia: dado da perícia (com passos) + dado do atributo, + bônus, + pavor
  function rollSkill(i) {
    const sk = P.skills[i]; if (!sk) return;
    const m = ui.mods, sd = stepDie(sk.d, m.passo), ad = P.attrs[sk.a] || 4;
    const main = [{ d: sd, v: rnd(sd), k: 'per' }, { d: ad, v: rnd(ad), k: 'atr' }];
    const bonus = [m.b1, m.b2].filter(Boolean).map((d) => ({ d, v: rnd(d), k: 'bon' }));
    let pav = null;
    if (m.pavorOn) { pav = { d: m.pavorD, v: rnd(m.pavorD), k: 'pav' }; main.forEach((x) => { if (x.v < pav.v) x.x = true; }); }
    const sum = main.reduce((s, x) => s + (x.x ? 0 : x.v), 0) + bonus.reduce((s, x) => s + x.v, 0);
    let crit = null;
    if (!main[0].x && !main[1].x && main[0].v === main[1].v && main[0].v > 6) crit = 'crit';
    else if ((main[0].v === 1 && main[1].v === 1) || (main[0].x && main[1].x)) crit = 'fumble';
    const tag = m.passo ? ` ${m.passo > 0 ? '▲' : '▼'}${Math.abs(m.passo)}` : '';
    finishRoll({ t: sk.n + tag, dice: [...main, ...bonus, ...(pav ? [pav] : [])], sum, crit }, true);
  }
  function rollExpr() {
    const r = rollExpression(ui.expr, rnd);
    if (!r) { say('Não entendi essa rolagem. Use algo como 2d6+1.', true); return; }
    finishRoll({ t: r.text, dice: r.dice, mod: r.mod, sum: r.sum }, false);
  }
  function exprAdd(d) {
    const parts = ui.expr ? ui.expr.toLowerCase().replace(/\s+/g, '').split('+') : [];
    const idx = parts.findIndex((p) => new RegExp(`^\\d*d${d}$`).test(p));
    if (idx >= 0) { const n = parseInt(parts[idx], 10) || 1; parts[idx] = `${n + 1}d${d}`; } else parts.push(`1d${d}`);
    ui.expr = parts.join('+'); ssSet('expr', ui.expr); render();
  }
  const find = (arr, id) => arr.find((x) => x.id === id);
  const focusSel = (sel) => setTimeout(() => { const n = root.querySelector(sel); if (n) n.focus(); }, 0);

  async function onClick(e) {
    const sw = e.target.closest('button[data-theme]');
    if (sw && root.contains(sw)) { if (role && !ui.play) { P.theme = sw.dataset.theme; commitPub(); } return; }
    const b = e.target.closest('[data-act]'); if (!b || b.disabled || !root.contains(b)) return;
    const d = b.dataset, a = d.act;
    if (EDIT_ACTS.has(a) && !role) { ui.showUnlock = true; render(); focusSel('#pin-unlock'); return; }
    if (ui.play && PLAY_BLOCK.has(a)) { say('Modo jogo: troque pra "Modo edição" pra mudar isso.'); return; }
    let it;
    switch (a) {
      case 'tab': ui.tab = d.tab; ui.editAb = null; ssSet('tab', ui.tab); render(); break;
      case 'unlock': ui.showUnlock = !ui.showUnlock; render(); if (ui.showUnlock) focusSel('#pin-unlock'); break;
      case 'color': ui.showColor = !ui.showColor; render(); break;
      case 'play': ui.play = !ui.play; lsSet('play', ui.play ? '1' : '0'); ui.showColor = false; ui.editAb = null; render();
        say(ui.play ? 'Modo jogo: ficha travada, só PV, PD, rolagens e anotações.' : 'Modo edição: pode mexer em tudo.'); break;
      case 'lock':
        flushAll();
        if (role === 'master') auth.clearMaster(); else auth.clear(slug);
        role = null; V = null; pin = ''; ui.showUnlock = false; render(); say('Ficha bloqueada neste aparelho.'); break;
      // PV / PD / armadura
      case 'delta': setRes(d.res, P[d.res].cur + (+d.d)); break;
      case 'amt': {
        const inp = root.querySelector('#amt-' + d.res), n = parseInt(inp && inp.value, 10);
        if (!n || n < 0) { if (inp) inp.focus(); return; }
        setRes(d.res, P[d.res].cur + n * (+d.sign)); break;
      }
      case 'pip': { const i = +d.i; setRes(d.res, P[d.res].cur === i + 1 ? i : i + 1); break; }
      case 'full': setRes(d.res, P[d.res].max); break;
      case 'rdt': P[d.res].dt = Math.max(1, Math.min(30, (P[d.res].dt || 7) + (+d.d))); commitPub(); break;
      case 'armor': P.armor = Math.max(0, Math.min(99, (P.armor || 0) + (+d.d))); commitPub(); break;
      case 'lvl': P.nivel = Math.max(1, Math.min(20, (P.nivel || 1) + (+d.d))); commitPub(); break;
      case 'attr-step': P.attrs[d.id] = stepDie(P.attrs[d.id], +d.d); commitPub(); break;
      // rolagens e modificadores
      case 'roll-skill': rollSkill(+d.i); break;
      case 'expr-add': exprAdd(+d.d); break;
      case 'expr-clear': ui.expr = ''; ssSet('expr', ''); render(); focusSel('#expr'); break;
      case 'clear-rolls': ui.rolls = []; persistRolls(); render(); break;
      case 'passo': ui.mods.passo = Math.max(-4, Math.min(4, ui.mods.passo + (+d.d))); saveMods(); render(); break;
      case 'pavor-d': ui.mods.pavorD = stepDie(ui.mods.pavorD, +d.d); saveMods(); render(); break;
      case 'mods-clear': ui.mods = { b1: 0, b2: 0, passo: 0, pavorD: 6, pavorOn: false }; saveMods(); render(); break;
      case 'sort': ui.sort = d.s; ssSet('sort', ui.sort); render(); break;
      // retrato
      case 'portrait': {
        const f = await pickFile('image/*'); if (!f) return;
        try { P.portrait = await resizeImage(f); commitPub(); } catch (err) { say(err.message, true); }
        break;
      }
      case 'portrait-remove': confirmThen('portrait', () => { P.portrait = null; commitPub(); }); break;
      // habilidades / equipamentos
      case 'abtab': ui.abTab = d.t; ui.editAb = null; render(); break;
      case 'ab-toggle': if (ui.collapsed.has(d.id)) ui.collapsed.delete(d.id); else ui.collapsed.add(d.id); ssSet('collapsed', JSON.stringify([...ui.collapsed])); render(); break;
      case 'ab-use': it = find(P.abilities, d.id);
        if (it && P.pd.cur >= it.cost) { setRes('pd', P.pd.cur - it.cost); toast(`${esc(it.name)} · −${it.cost} PD`, { msg: true, ms: 2600 }); } break;
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
      case 'ab-add': { const id = uid(); ui.abTab = 'hab'; ui.abQuery = ''; P.abilities.push({ id, name: '', cost: 0, text: '' }); ui.editAb = id; render(); focusSel('#ab-name'); break; }
      case 'ab-del': confirmThen('ab-' + d.id, () => { P.abilities = P.abilities.filter((x) => x.id !== d.id); commitPub(); }); break;
      case 'inv-add': ui.abTab = 'eq'; P.inventory.push({ id: uid(), q: 1, n: '', o: '' }); commitPub(); focusSel('.inv-r:last-of-type [data-field="n"]'); break;
      case 'inv-del': confirmThen('inv-' + d.id, () => { P.inventory = P.inventory.filter((x) => x.id !== d.id); commitPub(); }); break;
      // investigação
      case 'paba': ui.pAba = +d.i; render(); break;
      case 'naba': ui.nAba = +d.i; render(); break;
      case 'pt-add': { const id = uid(); V.pontos.push({ id, aba: ui.pAba, t: '', f1: '', f2: '', f3: '', text: '' }); commitPriv(); focusSel(`[data-id="${id}"][data-field="t"]`); break; }
      case 'pt-del': confirmThen('pt-' + d.id, () => { V.pontos = V.pontos.filter((x) => x.id !== d.id); commitPriv(); }); break;
      case 'ses-add': { const id = uid(); V.sessoes.push({ id, title: 'Sessão ' + (V.sessoes.length + 1), date: today(), text: '' }); commitPriv(); focusSel(`[data-id="${id}"][data-field="text"]`); break; }
      case 'ses-del': confirmThen('ses-' + d.id, () => { V.sessoes = V.sessoes.filter((x) => x.id !== d.id); commitPriv(); }); break;
      // relações
      case 'con-add': { const id = uid(); V.conexoes.push({ id, name: '', text: '', foto: null, grau: 1, usado: false }); commitPriv(); focusSel(`[data-id="${id}"][data-field="name"]`); break; }
      case 'con-del': confirmThen('con-' + d.id, () => { V.conexoes = V.conexoes.filter((x) => x.id !== d.id); commitPriv(); }); break;
      case 'rel-grau': it = find(V.conexoes, d.id); if (it) { it.grau = +d.g; commitPriv(); } break;
      case 'rel-uso': it = find(V.conexoes, d.id); if (it) { it.usado = !it.usado; commitPriv(); } break;
      case 'rel-reset': confirmThen('rel-reset', () => { V.conexoes.forEach((c) => { c.usado = false; }); commitPriv(); say('Nova missão: todas as relações liberadas.'); }); break;
      case 'rel-photo': {
        it = find(V.conexoes, d.id); if (!it) return;
        const f = await pickFile('image/*'); if (!f) return;
        try { it.foto = await resizeImage(f, 320); commitPriv(); } catch (err) { say(err.message, true); }
        break;
      }
      // opções
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
    const ef = e.target.closest('form[data-form="expr"]');
    if (ef) { e.preventDefault(); rollExpr(); return; }
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
    if (t.id === 'expr') { ui.expr = t.value; ssSet('expr', t.value); return; }
    if (t.id === 'ab-q') { ui.abQuery = t.value; render(); return; }
    if (!role) return;
    if (t.dataset.themeInput != null) { ctx.setAccent(t.value); return; }
    if (t.dataset.nota != null && V) { V.notasAbas[+t.dataset.nota] = t.value; savePriv(); return; }
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
    const t = e.target; if (!root.contains(t)) return;
    if (t.dataset.mod) { ui.mods[t.dataset.mod] = +t.value; saveMods(); render(); return; }
    if (t.id === 'pavor-on') { ui.mods.pavorOn = t.checked; saveMods(); render(); return; }
    if (!role) return;
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
    if ((e.key === 'Enter' || e.key === ' ') && t.matches && t.matches('header[data-act="ab-toggle"]')) { e.preventDefault(); t.click(); }
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
    flushAll(); unsub(); unsubMesa(); clearTimeout(encT); lowHp(false);
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
