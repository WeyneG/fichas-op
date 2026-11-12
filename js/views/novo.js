// Criar personagem.
import { TEMPLATES, slugify, DEFAULT_THEME } from '../data.js';
import { auth, msgOf } from '../store.js';
import { esc, IC, themePicker, accentVars } from '../ui.js';

export async function mount(root, _params, ctx) {
  const { store } = ctx;
  document.title = 'Novo personagem — Ordem Paranormal';
  ctx.status(store.mode === 'cloud' ? 'ok' : 'local', store.mode === 'cloud' ? 'Conectado' : 'Modo local');

  const tpl = Object.entries(TEMPLATES).map(([k, t], i) => `
    <label class="tpl"><input type="radio" name="tpl" value="${k}"${i === 0 ? ' checked' : ''}>
      <span class="tpl-b"><b>${esc(t.label)}</b><small>${esc(t.desc)}</small></span></label>`).join('');

  root.innerHTML = `<a class="back" href="/" data-link>${IC.back}<span>Personagens</span></a>
    <form class="newform card" autocomplete="off" novalidate>
      <div class="sec-h"><span class="tag">Novo personagem</span></div>
      <div class="fgrid">
        <div class="full"><label class="lb" for="f-name">Nome do personagem</label><input class="field big" id="f-name" maxlength="40" placeholder="Ex.: Victor" required></div>
        <div><label class="lb" for="f-classe">Classe</label><input class="field" id="f-classe" maxlength="30" placeholder="Ex.: Vigilante"></div>
        <div><label class="lb" for="f-ocup">Ocupação</label><input class="field" id="f-ocup" maxlength="30" placeholder="Ex.: Professor"></div>
        <div class="full"><span class="lb">Começar com</span><div class="tpls">${tpl}</div></div>
        <div class="full"><span class="lb">Cor da ficha</span><div class="theme-slot"></div></div>
        <div><label class="lb" for="f-pin">PIN para editar (4 a 8 números)</label><input class="field pin" id="f-pin" type="password" inputmode="numeric" pattern="[0-9]*" maxlength="8" placeholder="••••"></div>
        <div><label class="lb" for="f-pin2">Repita o PIN</label><input class="field pin" id="f-pin2" type="password" inputmode="numeric" pattern="[0-9]*" maxlength="8" placeholder="••••"></div>
      </div>
      <p class="hint">Guarde o PIN: ele é o que deixa só você mexer na sua ficha (o mestre também consegue). Atributos, perícias e habilidades você ajusta direto na ficha depois.</p>
      <p class="form-err" aria-live="polite"></p>
      <div class="form-act"><a class="link" href="/" data-link>cancelar</a><button class="btn pri" type="submit">Criar ficha</button></div>
    </form>`;

  const form = root.querySelector('form');
  const errEl = root.querySelector('.form-err');
  const slot = form.querySelector('.theme-slot');
  let theme = DEFAULT_THEME, touched = false;
  function paint() { slot.innerHTML = themePicker(theme); ctx.setAccent(theme); }
  paint();
  form.querySelector('#f-name').focus();
  slot.addEventListener('click', (e) => {
    const b = e.target.closest('button[data-theme]'); if (!b) return;
    theme = b.dataset.theme; touched = true; paint();
  });
  slot.addEventListener('input', (e) => { if (e.target.dataset.themeInput != null) ctx.setAccent(e.target.value); });
  slot.addEventListener('change', (e) => { if (e.target.dataset.themeInput != null) { theme = e.target.value; touched = true; paint(); } });

  // Quando escolhe o modelo do Victor, preenche os campos vazios
  form.addEventListener('change', (e) => {
    if (e.target.name !== 'tpl') return;
    const { pub } = TEMPLATES[e.target.value].make();
    const set = (id, v) => { const i = form.querySelector(id); if (i && !i.value && v) i.value = v; };
    set('#f-name', pub.name); set('#f-classe', pub.classe); set('#f-ocup', pub.ocupacao);
    if (!touched) { theme = pub.theme || DEFAULT_THEME; paint(); }
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    errEl.textContent = '';
    const name = form.querySelector('#f-name').value.trim();
    const classe = form.querySelector('#f-classe').value.trim();
    const ocup = form.querySelector('#f-ocup').value.trim();
    const pin = form.querySelector('#f-pin').value.trim();
    const pin2 = form.querySelector('#f-pin2').value.trim();
    const tplKey = (form.querySelector('input[name=tpl]:checked') || {}).value || 'branco';
    if (!name) { errEl.textContent = 'Dê um nome ao personagem.'; form.querySelector('#f-name').focus(); return; }
    if (!/^[0-9]{4,8}$/.test(pin)) { errEl.textContent = 'O PIN precisa ter de 4 a 8 números.'; form.querySelector('#f-pin').focus(); return; }
    if (pin !== pin2) { errEl.textContent = 'Os PINs não batem.'; form.querySelector('#f-pin2').focus(); return; }

    const btn = form.querySelector('button[type=submit]');
    btn.disabled = true; btn.textContent = 'Criando…';
    const { pub, priv } = TEMPLATES[tplKey].make();
    pub.name = name; if (classe) pub.classe = classe; if (ocup) pub.ocupacao = ocup;
    pub.theme = theme;

    const base = slugify(name);
    try {
      let slug = base;
      for (let n = 2; n < 50; n++) {
        try { await store.create(slug, pin, pub, priv); break; }
        catch (err) { if (err.code === 'slug_em_uso') { slug = `${base}-${n}`; continue; } throw err; }
      }
      auth.set(slug, pin);
      ctx.navigate('/ficha/' + slug);
    } catch (err) {
      errEl.textContent = msgOf(err);
      btn.disabled = false; btn.textContent = 'Criar ficha';
    }
  });
}
