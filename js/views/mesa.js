// Mesa: grupo ao vivo + rodadas de combate + ameaças (NPCs).
// Jogadores veem a ordem de turnos e as ameaças reveladas.
// Com o PIN do mestre: controla o combate, cria/esconde NPCs e mexe em PV de todos.
import { normPublic, uid } from '../data.js';
import { auth, msgOf } from '../store.js';
import { esc, IC, say, pinForm, accentVars } from '../ui.js';

const STATUS_CLS = { 'Ileso': 'ok', 'Ferido': 'mid', 'Muito ferido': 'bad', 'Caído': 'down' };
export function npcStatus(pv) {
  if (!pv || pv.cur <= 0) return 'Caído';
  const r = pv.cur / (pv.max || 1);
  if (r >= 1) return 'Ileso';
  if (r > 0.5) return 'Ferido';
  return 'Muito ferido';
}

export async function mount(root, _params, ctx) {
  const { store } = ctx;
  document.title = 'Mesa — Ordem Paranormal';
  let master = '';
  let pcs = [];          // [{slug, data}]
  let npcs = [];         // mestre: [{id, visible, sort, s:{name,pv,showHp,notes}}] | jogador: [{id, data}]
  let enc = { active: false }; // mestre: completo | jogador: público
  let error = null;
  const ui = { newNpc: false, confirm: null };
  const pending = new Map();
  const saving = new Set();

  const saved = auth.master();
  if (saved) { try { if (await store.checkMaster(saved)) master = saved; else auth.clearMaster(); } catch (e) { /* offline */ } }

  // ---------------- helpers ----------------
  const pcBy = (slug) => pcs.find((r) => r.slug === slug);
  const npcBy = (id) => npcs.find((n) => n.id === id);
  const normNpc = (n) => ({
    id: n.id, visible: !!n.visible, sort: n.sort || 0,
    s: Object.assign({ name: (n.data && n.data.name) || 'Ameaça', pv: { cur: 10, max: 10 }, showHp: false, notes: '' }, n.secret || {}),
  });
  const normEnc = (e) => Object.assign({ active: false, round: 1, turn: 0, order: [] }, e || {});
  function nameOf(e) {
    if (e.kind === 'pc') { const r = pcBy(e.ref); return r ? (normPublic(r.data).name || 'Sem nome') : '(removido)'; }
    const n = npcBy(e.ref); if (!n) return e.name || '(removido)';
    return master ? n.s.name : (n.data && n.data.name) || e.name || '???';
  }
  function npcPublic(n) {
    const d = { name: n.s.name || '???', status: npcStatus(n.s.pv) };
    if (n.s.showHp) d.pv = { cur: n.s.pv.cur, max: n.s.pv.max };
    return d;
  }
  function encPublic() {
    if (!enc.active) return { active: false };
    const vis = enc.order.filter((e) => e.kind === 'pc' || (npcBy(e.ref) && npcBy(e.ref).visible));
    const cur = enc.order[enc.turn];
    const curVis = !!cur && vis.includes(cur);
    return {
      active: true, round: enc.round,
      order: vis.map((e) => ({ id: e.id, kind: e.kind, ref: e.ref, init: e.init, name: nameOf(e) })),
      current: curVis ? cur.id : null, hiddenTurn: !!cur && !curVis,
    };
  }

  // ---------------- salvar ----------------
  function status() {
    if (pending.size || saving.size) ctx.status('pending', 'Salvando…');
    else ctx.status(master ? 'ok' : 'local', master ? 'Mestre' : 'Só leitura');
  }
  function schedule(key, fn, ms = 500) {
    clearTimeout(pending.get(key));
    pending.set(key, setTimeout(async () => {
      pending.delete(key); saving.add(key); status();
      try { await fn(); }
      catch (e) {
        say(msgOf(e), true);
        if (e.code === 'pin_invalido') { master = ''; auth.clearMaster(); load(); }
      } finally { saving.delete(key); status(); }
    }, ms));
    status();
  }
  const saveEnc = () => schedule('enc', () => store.saveEncounter(master, encPublic(), enc));
  const saveNpc = (n) => schedule('npc:' + n.id, () => store.saveNpc(master, { id: n.id, visible: n.visible, sort: n.sort, data: npcPublic(n), secret: n.s }));
  const savePc = (r) => schedule('pc:' + r.slug, () => store.savePublic(r.slug, master, r.data), 600);

  // ---------------- carregar ----------------
  const snap = () => JSON.stringify([pcs, npcs, enc, error, master]);
  let lastSnap = '';
  async function load() {
    try {
      const fresh = await store.list();
      pcs = fresh.map((r) => (pending.has('pc:' + r.slug) || saving.has('pc:' + r.slug)) ? (pcBy(r.slug) || r) : r);
      const busyMesa = [...pending.keys(), ...saving].some((k) => k === 'enc' || k.startsWith('npc:'));
      if (master) {
        if (!busyMesa) {
          const md = await store.masterData(master);
          npcs = (md.npcs || []).map(normNpc);
          enc = normEnc(md.encounter);
        }
      } else {
        const [n, e] = await Promise.all([store.listNpcs(), store.getEncounter()]);
        npcs = n || []; enc = e || { active: false };
      }
      error = null;
    } catch (e) {
      if (e.code === 'pin_invalido' && master) { master = ''; auth.clearMaster(); return load(); }
      error = msgOf(e);
    }
    const now = snap();
    if (now !== lastSnap) { lastSnap = now; render(); }
  }

  // ---------------- views ----------------
  function bar(key, label, r, act, id) {
    const pct = r.max > 0 ? Math.max(0, Math.min(100, (r.cur / r.max) * 100)) : 0;
    const low = r.cur <= Math.ceil(r.max * 0.25);
    const btn = (d, s) => master ? `<button class="tb-btn" data-act="${act}" data-id="${esc(id)}" data-k="${key}" data-d="${d}" aria-label="${label} ${s}">${s}</button>` : '';
    return `<div class="tbar ${key}${low ? ' low' : ''}"><span class="tbar-l">${label}</span>${btn(-1, '−')}
      <span class="tbar-t"><i style="width:${pct}%"></i></span>${btn(1, '+')}<b>${r.cur}<small>/${r.max}</small></b></div>`;
  }
  function avatar(e) {
    if (e.kind === 'pc') {
      const r = pcBy(e.ref), p = r ? normPublic(r.data) : null;
      return `<span class="ord-av">${p && p.portrait ? `<img src="${p.portrait}" alt="">` : IC.user}</span>`;
    }
    return `<span class="ord-av npc-av">${IC.threat}</span>`;
  }
  function themeOf(e) { if (e.kind !== 'pc') return ''; const r = pcBy(e.ref); return r ? accentVars(normPublic(r.data).theme) : ''; }

  function combatPlayer() {
    if (!enc.active) return '';
    const cur = (enc.order || []).find((e) => e.id === enc.current);
    const who = cur ? esc(nameOf(cur)) : (enc.hiddenTurn ? '???' : '—');
    const rows = (enc.order || []).map((e) => `<li class="ord${e.id === enc.current ? ' cur' : ''}" style="${themeOf(e)}">
        <span class="ord-mark">${e.id === enc.current ? 'VEZ' : ''}</span>${avatar(e)}<span class="ord-name">${esc(nameOf(e))}</span><span class="ord-init" title="Iniciativa">${esc(e.init)}</span></li>`).join('');
    return `<section class="card combat"><div class="combat-head"><span class="tag">${IC.sword} Combate</span><span class="round">Rodada <b>${enc.round || 1}</b></span></div>
      <div class="now" style="${cur ? themeOf(cur) : ''}"><small>Vez de</small><strong>${who}</strong></div>
      <ol class="order">${rows}</ol></section>`;
  }
  function combatMaster() {
    if (!enc.active) {
      return `<section class="card combat idle"><div class="combat-head"><span class="tag">${IC.sword} Combate</span></div>
        <p class="muted">Nenhum combate em andamento. Ao iniciar, entram todos os personagens e as ameaças visíveis — depois você ajusta a iniciativa, ordena e adiciona/remove quem quiser.</p>
        <button class="btn pri" data-act="enc-start">Iniciar combate</button></section>`;
    }
    const inOrder = new Set(enc.order.map((e) => e.kind + ':' + e.ref));
    const addOpts = [
      ...pcs.filter((r) => !inOrder.has('pc:' + r.slug)).map((r) => `<option value="pc:${esc(r.slug)}">${esc(normPublic(r.data).name || r.slug)}</option>`),
      ...npcs.filter((n) => !inOrder.has('npc:' + n.id)).map((n) => `<option value="npc:${esc(n.id)}">${esc(n.s.name)}${n.visible ? '' : ' (escondido)'}</option>`),
    ].join('');
    const rows = enc.order.map((e, i) => {
      const isCur = i === enc.turn;
      const hidden = e.kind === 'npc' && npcBy(e.ref) && !npcBy(e.ref).visible;
      const armed = ui.confirm === 'rm-' + e.id;
      return `<li class="ord${isCur ? ' cur' : ''}${hidden ? ' hid' : ''}" style="${themeOf(e)}">
        <button class="ord-mark as-btn" data-act="enc-set" data-id="${e.id}" title="Dar a vez">${isCur ? 'VEZ' : '▶'}</button>${avatar(e)}
        <span class="ord-name">${esc(nameOf(e))}${hidden ? ` <span class="hid-badge">${IC.eyeOff} escondido</span>` : ''}</span>
        <input class="ord-in" type="number" inputmode="numeric" data-init="${e.id}" value="${esc(e.init)}" aria-label="Iniciativa de ${esc(nameOf(e))}" title="Iniciativa">
        <span class="ord-ctl"><button class="mini" data-act="enc-up" data-id="${e.id}" aria-label="Subir"${i === 0 ? ' disabled' : ''}>▲</button><button class="mini" data-act="enc-down" data-id="${e.id}" aria-label="Descer"${i === enc.order.length - 1 ? ' disabled' : ''}>▼</button>
        <button class="mini x${armed ? ' armed' : ''}" data-act="enc-rm" data-id="${e.id}" aria-label="Tirar do combate" title="${armed ? 'Clique de novo' : 'Tirar do combate'}">×</button></span></li>`;
    }).join('');
    const cur = enc.order[enc.turn];
    return `<section class="card combat"><div class="combat-head"><span class="tag">${IC.sword} Combate</span><span class="round">Rodada <b>${enc.round}</b></span>
        <button class="link danger${ui.confirm === 'end' ? ' armed' : ''}" data-act="enc-end">${ui.confirm === 'end' ? 'confirmar fim?' : 'encerrar combate'}</button></div>
      <div class="now" style="${cur ? themeOf(cur) : ''}"><small>Vez de</small><strong>${cur ? esc(nameOf(cur)) : '—'}</strong></div>
      <div class="turn-ctl"><button class="btn big" data-act="enc-prev">◀ Anterior</button><button class="btn pri big" data-act="enc-next">Próximo ▶</button></div>
      <ol class="order">${rows || '<li class="empty">Ninguém no combate.</li>'}</ol>
      <div class="order-tools"><button class="btn" data-act="enc-sort" title="Maior iniciativa primeiro">Ordenar por iniciativa</button>
        ${addOpts ? `<span class="addto"><select class="field sm" id="enc-add">${addOpts}</select><button class="btn" data-act="enc-add">+ Adicionar</button></span>` : ''}</div>
      <p class="hint">Escondidos aparecem pros jogadores como "???" quando for a vez deles.</p></section>`;
  }
  function threatsPlayer() {
    if (!npcs.length) return '';
    const cards = npcs.map((n) => {
      const d = n.data || {};
      const st = d.status || 'Ileso';
      return `<article class="npc-card pub"><div class="npc-h"><span class="npc-ic">${IC.threat}</span><span class="npc-name">${esc(d.name || '???')}</span>
        <span class="st st-${STATUS_CLS[st] || 'ok'}">${esc(st)}</span></div>${d.pv ? bar('pv', 'PV', d.pv, '', n.id) : ''}</article>`;
    }).join('');
    return `<section class="sec"><div class="sec-h"><span class="tag">Ameaças</span></div><div class="npc-grid">${cards}</div></section>`;
  }
  function threatsMaster() {
    const inOrder = new Set((enc.order || []).map((e) => 'npc:' + e.ref));
    const cards = npcs.map((n) => {
      const armed = ui.confirm === 'del-' + n.id;
      return `<article class="npc-card${n.visible ? '' : ' hidden'}">
        <div class="npc-h"><span class="npc-ic">${IC.threat}</span>
          <input class="inl npc-name" data-npc="${n.id}" data-f="name" value="${esc(n.s.name)}" aria-label="Nome">
          <span class="st st-${STATUS_CLS[npcStatus(n.s.pv)]}">${npcStatus(n.s.pv)}</span></div>
        ${bar('pv', 'PV', n.s.pv, 'npc-d', n.id)}
        <div class="npc-row"><input type="number" class="amt" id="amt-${n.id}" min="1" placeholder="qtd" inputmode="numeric" aria-label="Quantidade">
          <button class="btn" data-act="npc-amt" data-id="${n.id}" data-sign="-1">Dano</button><button class="btn" data-act="npc-amt" data-id="${n.id}" data-sign="1">Curar</button>
          <label class="maxl">máx <input type="number" class="maxin" data-npc="${n.id}" data-f="max" min="1" max="999" value="${n.s.pv.max}"></label></div>
        <div class="npc-row toggles">
          <button class="chip${n.visible ? ' on' : ''}" data-act="npc-vis" data-id="${n.id}">${n.visible ? IC.eye + ' Visível' : IC.eyeOff + ' Escondido'}</button>
          <button class="chip${n.s.showHp ? ' on' : ''}" data-act="npc-hp" data-id="${n.id}" title="Se desligado, os jogadores só veem o estado (Ileso, Ferido…)">PV ${n.s.showHp ? 'aberto' : 'oculto'}</button>
          ${enc.active && !inOrder.has('npc:' + n.id) ? `<button class="chip" data-act="npc-combat" data-id="${n.id}">+ Combate</button>` : ''}
          <button class="link danger${armed ? ' armed' : ''}" data-act="npc-del" data-id="${n.id}">${armed ? 'confirmar?' : 'excluir'}</button></div>
        <textarea class="field npc-notes" data-npc="${n.id}" data-f="notes" rows="2" placeholder="Notas do mestre (só você vê)">${esc(n.s.notes)}</textarea>
      </article>`;
    }).join('');
    const form = ui.newNpc ? `<form class="card npc-form" data-form="npc" autocomplete="off">
        <div class="row"><div class="grow1"><label class="lb" for="nn-name">Nome</label><input class="field" id="nn-name" maxlength="40" placeholder="Ex.: Cultista, Criatura de Sangue"></div>
        <div class="w92"><label class="lb" for="nn-pv">PV</label><input class="field" id="nn-pv" type="number" min="1" value="10"></div></div>
        <div class="row checks"><label><input type="checkbox" id="nn-vis"> Já aparece pros jogadores</label>
        <label><input type="checkbox" id="nn-hp"> Mostrar PV exato</label>
        ${enc.active ? '<label><input type="checkbox" id="nn-cb" checked> Entrar no combate</label>' : ''}</div>
        <div class="form-act"><button type="button" class="link" data-act="npc-cancel">cancelar</button><button class="btn pri" type="submit">Criar ameaça</button></div></form>` : '';
    return `<section class="sec"><div class="sec-h"><span class="tag">Ameaças</span><span class="hint">criaturas e NPCs</span></div>
      ${form}<div class="npc-grid">${cards}</div>
      ${ui.newNpc ? '' : '<button class="btn ghost add" data-act="npc-new">+ Nova ameaça</button>'}</section>`;
  }
  function pcCard(r) {
    const p = normPublic(r.data);
    return `<article class="tcard" data-slug="${esc(r.slug)}" style="${accentVars(p.theme)}">
      <a class="tc-head" href="/ficha/${esc(r.slug)}" data-link>
        <div class="tc-por">${p.portrait ? `<img src="${p.portrait}" alt="">` : IC.user}</div>
        <div><div class="tc-name">${esc(p.name || 'Sem nome')}</div>
        <div class="tc-meta">${esc([p.classe, p.ocupacao, p.nivel ? 'Nível ' + p.nivel : ''].filter(Boolean).join(' · '))}</div></div>
      </a>${bar('pv', 'PV', p.pv, 'adj', r.slug)}${bar('pd', 'PD', p.pd, 'adj', r.slug)}</article>`;
  }
  function render() {
    const head = master
      ? `<div class="mesa-bar on">${IC.unlock}<span>Modo mestre ativo.</span><button class="link" data-act="leave">sair do modo mestre</button></div>`
      : `<details class="mesa-bar"><summary>${IC.lock}<span>Sou o mestre</span></summary>${pinForm('master', 'PIN do mestre', 'Entrar')}</details>`;
    let body;
    if (error) body = `<p class="empty">${esc(error)}</p>`;
    else {
      const group = pcs.length ? `<div class="table-grid">${pcs.map(pcCard).join('')}</div>` : '<p class="empty">Nenhum personagem ainda. <a href="/novo" data-link>Criar o primeiro</a>.</p>';
      body = (master ? combatMaster() + threatsMaster() : combatPlayer() + threatsPlayer())
        + `<section class="sec"><div class="sec-h"><span class="tag">Grupo</span></div>${group}</section>`;
    }
    const ae = document.activeElement;
    const keep = ae && root.contains(ae) && (ae.dataset.npc || ae.dataset.init) ? (ae.dataset.npc ? `[data-npc="${ae.dataset.npc}"][data-f="${ae.dataset.f}"]` : `[data-init="${ae.dataset.init}"]`) : null;
    let s0 = null; try { s0 = keep ? ae.selectionStart : null; } catch (e) { /* ok */ }
    lastSnap = snap();
    root.innerHTML = `<section class="intro small mesa-intro"><div><p class="kicker">${IC.table}<span>Ao vivo</span></p><h1 class="title">Mesa</h1></div><a class="btn ghost tv-link" href="/tv" data-link title="Abrir no notebook ligado na TV">Modo TV</a></section>${head}${body}`;
    if (keep) { const n = root.querySelector(keep); if (n) { n.focus({ preventScroll: true }); try { if (s0 != null) n.setSelectionRange(s0, s0); } catch (e) { /* ok */ } } }
    status();
  }

  // ---------------- ações ----------------
  let confT = null;
  function confirmThen(key, fn) {
    if (ui.confirm === key) { ui.confirm = null; fn(); return; }
    ui.confirm = key; render(); clearTimeout(confT);
    confT = setTimeout(() => { if (ui.confirm === key) { ui.confirm = null; render(); } }, 3500);
  }
  const curId = () => (enc.order[enc.turn] || {}).id;
  const keepTurn = (id) => { const i = enc.order.findIndex((e) => e.id === id); enc.turn = i < 0 ? Math.min(enc.turn, Math.max(0, enc.order.length - 1)) : i; };
  const commitEnc = () => { saveEnc(); render(); };
  const entry = (kind, ref) => ({ id: uid(), kind, ref, init: 0 });

  function onClick(e) {
    const b = e.target.closest('[data-act]'); if (!b || b.disabled || !root.contains(b)) return;
    const d = b.dataset; let n, r;
    if (d.act === 'leave') { master = ''; auth.clearMaster(); load(); return; }
    if (!master) return;
    switch (d.act) {
      case 'adj':
        r = pcBy(d.id); if (!r) return; r.data = normPublic(r.data);
        r.data[d.k].cur = Math.max(0, Math.min(r.data[d.k].max, r.data[d.k].cur + (+d.d)));
        savePc(r); render(); break;
      // combate
      case 'enc-start':
        enc = { active: true, round: 1, turn: 0, order: [...pcs.map((x) => entry('pc', x.slug)), ...npcs.filter((x) => x.visible).map((x) => entry('npc', x.id))] };
        commitEnc(); say('Combate iniciado. Ajuste a iniciativa e ordene.'); break;
      case 'enc-next':
        if (!enc.order.length) return;
        enc.turn++; if (enc.turn >= enc.order.length) { enc.turn = 0; enc.round++; }
        commitEnc(); break;
      case 'enc-prev':
        if (!enc.order.length) return;
        enc.turn--; if (enc.turn < 0) { if (enc.round > 1) { enc.round--; enc.turn = enc.order.length - 1; } else enc.turn = 0; }
        commitEnc(); break;
      case 'enc-set': keepTurn(d.id); commitEnc(); break;
      case 'enc-sort': {
        const keep = curId(), fresh = enc.round === 1 && enc.turn === 0;
        enc.order = enc.order.map((x, i) => [x, i]).sort((a, b2) => (Number(b2[0].init) || 0) - (Number(a[0].init) || 0) || a[1] - b2[1]).map((x) => x[0]);
        if (fresh) enc.turn = 0; else keepTurn(keep);
        commitEnc(); break;
      }
      case 'enc-up': case 'enc-down': {
        const keep = curId(), i = enc.order.findIndex((x) => x.id === d.id), j = i + (d.act === 'enc-up' ? -1 : 1);
        if (i < 0 || j < 0 || j >= enc.order.length) return;
        [enc.order[i], enc.order[j]] = [enc.order[j], enc.order[i]]; keepTurn(keep); commitEnc(); break;
      }
      case 'enc-rm': confirmThen('rm-' + d.id, () => {
        const keep = curId(); const i = enc.order.findIndex((x) => x.id === d.id);
        enc.order.splice(i, 1);
        if (keep === d.id) enc.turn = Math.min(i, Math.max(0, enc.order.length - 1)); else keepTurn(keep);
        commitEnc();
      }); break;
      case 'enc-add': {
        const sel = root.querySelector('#enc-add'); if (!sel || !sel.value) return;
        const [kind, ref] = sel.value.split(':'); const keep = curId();
        enc.order.push(entry(kind, ref)); keepTurn(keep); commitEnc(); break;
      }
      case 'enc-end': confirmThen('end', () => { enc = { active: false, round: 1, turn: 0, order: [] }; commitEnc(); say('Combate encerrado.'); }); break;
      // ameaças
      case 'npc-new': ui.newNpc = true; render(); setTimeout(() => { const i = root.querySelector('#nn-name'); if (i) i.focus(); }, 0); break;
      case 'npc-cancel': ui.newNpc = false; render(); break;
      case 'npc-d': n = npcBy(d.id); if (!n) return;
        n.s.pv.cur = Math.max(0, Math.min(n.s.pv.max, n.s.pv.cur + (+d.d))); saveNpc(n); if (enc.active) saveEnc(); render(); break;
      case 'npc-amt': {
        n = npcBy(d.id); const inp = root.querySelector('#amt-' + d.id), v = parseInt(inp && inp.value, 10);
        if (!n || !v) { if (inp) inp.focus(); return; }
        n.s.pv.cur = Math.max(0, Math.min(n.s.pv.max, n.s.pv.cur + v * (+d.sign))); saveNpc(n); if (enc.active) saveEnc(); render(); break;
      }
      case 'npc-vis': n = npcBy(d.id); if (!n) return; n.visible = !n.visible; saveNpc(n); if (enc.active) saveEnc(); render();
        say(n.visible ? `${n.s.name} agora aparece pros jogadores.` : `${n.s.name} foi escondido.`); break;
      case 'npc-hp': n = npcBy(d.id); if (!n) return; n.s.showHp = !n.s.showHp; saveNpc(n); render(); break;
      case 'npc-combat': { const keep = curId(); enc.order.push(entry('npc', d.id)); keepTurn(keep); commitEnc(); break; }
      case 'npc-del': confirmThen('del-' + d.id, async () => {
        const keep = curId();
        npcs = npcs.filter((x) => x.id !== d.id);
        const before = enc.order.length; enc.order = enc.order.filter((x) => !(x.kind === 'npc' && x.ref === d.id));
        if (enc.order.length !== before) { keepTurn(keep); saveEnc(); }
        render();
        try { await store.deleteNpc(master, d.id); } catch (err) { say(msgOf(err), true); }
      }); break;
    }
  }
  function onSubmit(e) {
    const f = e.target;
    if (f.matches('form[data-pinform="master"]')) {
      e.preventDefault();
      const p = f.querySelector('input.pin').value.trim(), errEl = f.querySelector('.pin-err');
      if (!p) return;
      store.checkMaster(p).then((ok) => {
        if (ok) { master = p; auth.setMaster(p); say('Modo mestre ativado.'); load(); } else errEl.textContent = 'PIN incorreto.';
      }).catch((err) => { errEl.textContent = msgOf(err); });
      return;
    }
    if (f.matches('form[data-form="npc"]')) {
      e.preventDefault();
      const name = f.querySelector('#nn-name').value.trim() || 'Ameaça';
      const max = Math.max(1, Math.min(999, parseInt(f.querySelector('#nn-pv').value, 10) || 10));
      const n = { id: 'npc-' + uid(), visible: f.querySelector('#nn-vis').checked, sort: npcs.reduce((m, x) => Math.max(m, x.sort), 0) + 1,
        s: { name, pv: { cur: max, max }, showHp: f.querySelector('#nn-hp').checked, notes: '' } };
      npcs.push(n); saveNpc(n);
      const cb = f.querySelector('#nn-cb');
      if (enc.active && cb && cb.checked) { const keep = curId(); enc.order.push(entry('npc', n.id)); keepTurn(keep); }
      if (enc.active) saveEnc();
      ui.newNpc = false; render();
    }
  }
  function onInput(e) {
    const t = e.target; if (!master || !root.contains(t)) return;
    if (t.dataset.init) { const x = enc.order.find((o) => o.id === t.dataset.init); if (x) { x.init = t.value === '' ? 0 : Number(t.value); saveEnc(); } return; }
    if (t.dataset.npc && (t.dataset.f === 'name' || t.dataset.f === 'notes')) {
      const n = npcBy(t.dataset.npc); if (!n) return; n.s[t.dataset.f] = t.value; saveNpc(n);
      if (t.dataset.f === 'name' && enc.active) saveEnc();
    }
  }
  function onChange(e) {
    const t = e.target; if (!master || !root.contains(t)) return;
    if (t.dataset.npc && t.dataset.f === 'max') {
      const n = npcBy(t.dataset.npc); if (!n) return;
      const m = Math.max(1, Math.min(999, parseInt(t.value, 10) || 1));
      n.s.pv.max = m; if (n.s.pv.cur > m) n.s.pv.cur = m; saveNpc(n); render();
    }
  }
  function onKey(e) {
    const t = e.target;
    if (e.key === 'Enter' && master && t.classList && t.classList.contains('amt') && t.id.startsWith('amt-')) {
      e.preventDefault(); const n = npcBy(t.id.slice(4)), v = parseInt(t.value, 10);
      if (n && v > 0) { n.s.pv.cur = Math.max(0, n.s.pv.cur - v); saveNpc(n); if (enc.active) saveEnc(); render(); }
    }
  }

  root.addEventListener('click', onClick);
  root.addEventListener('submit', onSubmit);
  root.addEventListener('input', onInput);
  root.addEventListener('change', onChange);
  root.addEventListener('keydown', onKey);
  render(); await load();
  let t = null;
  const refresh = () => { clearTimeout(t); t = setTimeout(load, 300); };
  const unsub1 = store.subscribe(null, refresh);
  const unsub2 = store.subscribeMesa ? store.subscribeMesa(refresh) : () => {};
  return () => {
    unsub1(); unsub2(); clearTimeout(t);
    // salva o que ficou pendente ao sair da tela
    pending.forEach((x, key) => {
      clearTimeout(x); if (!master) return;
      if (key === 'enc') store.saveEncounter(master, encPublic(), enc).catch(() => {});
      else if (key.startsWith('npc:')) { const n = npcBy(key.slice(4)); if (n) store.saveNpc(master, { id: n.id, visible: n.visible, sort: n.sort, data: npcPublic(n), secret: n.s }).catch(() => {}); }
      else if (key.startsWith('pc:')) { const r = pcBy(key.slice(3)); if (r) store.savePublic(r.slug, master, r.data).catch(() => {}); }
    });
  };
}
