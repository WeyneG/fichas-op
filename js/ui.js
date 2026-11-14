// Utilitários de interface compartilhados.
import { DICE, THEMES, DEFAULT_THEME, themeName } from './data.js';

export const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export const IC = {
  die: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><rect x="3.5" y="3.5" width="17" height="17" rx="3.5"/><circle cx="8.3" cy="8.3" r="1.35" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.35" fill="currentColor" stroke="none"/><circle cx="15.7" cy="15.7" r="1.35" fill="currentColor" stroke="none"/></svg>',
  user: '<svg viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="currentColor" stroke-width="1.4" aria-hidden="true"><circle cx="12" cy="8.5" r="4"/><path d="M4 21c1.2-4.2 4.3-6.3 8-6.3s6.8 2.1 8 6.3"/></svg>',
  sigil: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="3"/><path d="M12 1.5v5M12 17.5v5M1.5 12h5M17.5 12h5"/></svg>',
  lock: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><rect x="5" y="10.5" width="14" height="10" rx="2"/><path d="M8 10.5V7.5a4 4 0 0 1 8 0v3"/></svg>',
  unlock: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><rect x="5" y="10.5" width="14" height="10" rx="2"/><path d="M8 10.5V7.5a4 4 0 0 1 7.6-1.7"/></svg>',
  plus: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>',
  back: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg>',
  eye: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>',
  eyeOff: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M3 3l18 18M10.6 5.1A10.6 10.6 0 0 1 12 5c6.4 0 10 7 10 7a17.7 17.7 0 0 1-3.2 4.1M6.6 6.6C3.8 8.4 2 12 2 12s3.6 7 10 7a9.8 9.8 0 0 0 5.4-1.6M9.9 9.9a3 3 0 0 0 4.2 4.2"/></svg>',
  threat: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M12 2.5l2.2 5.3 5.6-2.1-2.1 5.6 5.3 2.2-5.3 2.2 2.1 5.6-5.6-2.1L12 21.5l-2.2-5.3-5.6 2.1 2.1-5.6L1 12.5l5.3-2.2-2.1-5.6 5.6 2.1z"/><circle cx="12" cy="12.3" r="2.4"/></svg>',
  sword: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><path d="M14.5 3.5H20.5V9.5L9 21 3 15z"/><path d="M6 12l6 6M4 20l2-2"/></svg>',
  shield: '<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M12 2.8l7.5 2.8v5.6c0 4.6-3.1 8.4-7.5 10-4.4-1.6-7.5-5.4-7.5-10V5.6z"/><path d="M12 7v10M8.5 10.5h7"/></svg>',
  chev: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg>',
  search: '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><circle cx="11" cy="11" r="6.5"/><path d="M20 20l-4.2-4.2"/></svg>',
  play: '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M7 5l12 7-12 7z"/></svg>',
  pen: '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M13.5 6.5l4 4"/></svg>',
  table: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><circle cx="12" cy="12" r="5"/><circle cx="12" cy="3.5" r="1.6"/><circle cx="20.5" cy="12" r="1.6"/><circle cx="12" cy="20.5" r="1.6"/><circle cx="3.5" cy="12" r="1.6"/></svg>',
};

// ---------- cor da ficha ----------
const toRgb = (h) => { h = h.replace('#', ''); if (h.length === 3) h = h.split('').map((c) => c + c).join(''); const n = parseInt(h, 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
const mix = (a, b, t) => a.map((v, i) => Math.round(v + (b[i] - v) * t));
const toHex = (c) => '#' + c.map((v) => v.toString(16).padStart(2, '0')).join('');
const lum = (c) => { const f = c.map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }); return 0.2126 * f[0] + 0.7152 * f[1] + 0.0722 * f[2]; };
// Gera as variáveis CSS de destaque a partir de uma cor (#rrggbb)
export function accentVars(hex) {
  if (!/^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.test(hex || '')) hex = DEFAULT_THEME;
  const c = toRgb(hex), L = lum(c);
  const hi = mix(c, [255, 255, 255], 0.3), dim = mix(c, [16, 17, 20], 0.55);
  let t = c; for (let i = 0; i < 8 && lum(t) < 0.28; i++) t = mix(t, [255, 255, 255], 0.2);
  const onDark = (L + 0.05) / 0.0537, onLight = 1.05 / (L + 0.05);
  const on = onDark >= onLight ? '#0b0c0e' : '#f5f6f7';
  return `--acc:${toHex(c)};--acc-hi:${toHex(hi)};--acc-dim:${toHex(dim)};--acc-text:${toHex(t)};--acc-rgb:${c.join(',')};--on-acc:${on}`;
}
export function themePicker(current) {
  const cur = String(current || DEFAULT_THEME).toLowerCase();
  const preset = THEMES.some(([, h]) => h.toLowerCase() === cur);
  const sw = THEMES.map(([label, h]) => `<button type="button" class="sw${h.toLowerCase() === cur ? ' on' : ''}" data-theme="${h}" style="--sw:${h}" title="${label}" aria-label="Cor ${label}"></button>`).join('');
  return `<div class="swatches">${sw}<label class="sw custom${preset ? '' : ' on'}" style="--sw:${esc(cur)}" title="Escolher outra cor"><input type="color" data-theme-input value="${esc(cur)}" aria-label="Cor personalizada"></label><span class="sw-name">${esc(themeName(cur))}</span></div>`;
}

export function dieSel(kind, id, val, label) {
  let o = DICE.map((d) => `<option value="${d}"${d === val ? ' selected' : ''}>d${d}</option>`).join('');
  if (!DICE.includes(val)) o += `<option value="${val}" selected>d${val}</option>`;
  return `<select class="dsel" data-sel="${kind}" data-id="${esc(id)}" aria-label="${esc(label)}">${o}</select>`;
}

export function autosize(t) { t.style.height = 'auto'; t.style.height = (t.scrollHeight + 2) + 'px'; }
export function autosizeAll(root) { root.querySelectorAll('textarea.grow').forEach(autosize); }

export function rnd(n) {
  try { const a = new Uint32Array(1); crypto.getRandomValues(a); return 1 + (a[0] % n); }
  catch (e) { return 1 + Math.floor(Math.random() * n); }
}

export const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

// ---------- toast ----------
let toastEl = null, toastT = null;
export function toast(html, opts = {}) {
  if (!toastEl) {
    toastEl = document.createElement('div');
    toastEl.className = 'toast'; toastEl.setAttribute('role', 'status'); toastEl.setAttribute('aria-live', 'polite');
    toastEl.addEventListener('click', () => toastEl.classList.remove('show'));
    document.body.appendChild(toastEl);
  }
  toastEl.innerHTML = html;
  toastEl.classList.toggle('msg', !!opts.msg);
  toastEl.classList.toggle('bad', !!opts.bad);
  toastEl.classList.add('show');
  clearTimeout(toastT);
  toastT = setTimeout(() => toastEl.classList.remove('show'), opts.ms || 5500);
}
export const say = (text, bad) => toast(esc(text), { msg: true, bad, ms: bad ? 4200 : 2600 });

// ---------- imagens ----------
export function resizeImage(file, max = 560, quality = 0.82) {
  return new Promise((resolve, reject) => {
    if (!/^image\//.test(file.type)) { reject(new Error('Escolha um arquivo de imagem')); return; }
    const url = URL.createObjectURL(file), img = new Image();
    img.onload = () => {
      const s = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
      const c = document.createElement('canvas');
      c.width = Math.round(img.naturalWidth * s); c.height = Math.round(img.naturalHeight * s);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      resolve(c.toDataURL('image/jpeg', quality));
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Não consegui abrir essa imagem')); };
    img.src = url;
  });
}

export function pickFile(accept) {
  return new Promise((resolve) => {
    const i = document.createElement('input');
    i.type = 'file'; i.accept = accept; i.style.display = 'none';
    i.addEventListener('change', () => { resolve(i.files && i.files[0]); i.remove(); });
    document.body.appendChild(i); i.click();
  });
}

export function download(name, text) {
  const blob = new Blob([text], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = name;
  document.body.appendChild(a); a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
}

// Barra de PV/PD compacta (início e mesa)
export function miniBar(label, r, cls) {
  const pct = r.max > 0 ? Math.max(0, Math.min(100, (r.cur / r.max) * 100)) : 0;
  const low = r.cur <= Math.ceil(r.max * 0.25);
  return `<div class="mbar ${cls}${low ? ' low' : ''}"><span class="mbar-l">${label}</span><span class="mbar-t"><i style="width:${pct}%"></i></span><b>${r.cur}<small>/${r.max}</small></b></div>`;
}

// Formulário de PIN (sem prompt(), que alguns navegadores bloqueiam)
export function pinForm(id, label, btn) {
  return `<form class="pinf" data-pinform="${id}" autocomplete="off">
    <label class="lb" for="pin-${id}">${label}</label>
    <div class="pinrow"><input class="field pin" id="pin-${id}" type="password" inputmode="numeric" pattern="[0-9]*" maxlength="8" placeholder="••••" autocomplete="off">
    <button class="btn pri" type="submit">${btn}</button></div>
    <p class="pin-err" aria-live="polite"></p></form>`;
}

// Desenhos dos dados (traço simples) para a bandeja de rolagem
const DIE_SHAPES = {
  4: '<path d="M12 3L21 19H3z"/><path d="M12 3v16M3 19l9-5 9 5"/>',
  6: '<path d="M12 3l8 4.5v9L12 21l-8-4.5v-9z"/><path d="M4 7.5L12 12l8-4.5M12 12v9"/>',
  8: '<path d="M12 2.5L20.5 12 12 21.5 3.5 12z"/><path d="M3.5 12h17M12 2.5L8.5 12 12 21.5 15.5 12z"/>',
  10: '<path d="M12 2.5L21 10l-3 9H6l-3-9z"/><path d="M12 2.5L8 13l4 6 4-6zM3 10l5 3M21 10l-5 3"/>',
  12: '<path d="M12 2.5l8.8 6.4-3.4 10.3H6.6L3.2 8.9z"/><path d="M12 7l4.4 3.2-1.7 5.1H9.3l-1.7-5.1z"/><path d="M12 2.5V7M20.8 8.9l-4.4 1.3M17.4 19.2l-2.7-3.9M6.6 19.2l2.7-3.9M3.2 8.9l4.4 1.3"/>',
  20: '<path d="M12 2.5l8.5 4.8v9.4L12 21.5l-8.5-4.8V7.3z"/><path d="M12 7.5l4.5 7.5h-9z"/><path d="M12 2.5v5M3.5 7.3L7.5 15M20.5 7.3L16.5 15M3.5 16.7L7.5 15M20.5 16.7L16.5 15M12 21.5L7.5 15M12 21.5L16.5 15"/>',
};
export function dieIcon(d, size = 30) {
  return `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round" aria-hidden="true">${DIE_SHAPES[d] || DIE_SHAPES[6]}</svg>`;
}

// "2d6+1d4+3" → { dice:[{d,v}], mod, text } (ou null se inválido)
export function rollExpression(expr, rnd) {
  const s = String(expr || '').toLowerCase().replace(/\s+/g, '');
  if (!s || !/^[+-]?(\d*d\d+|\d+)([+-](\d*d\d+|\d+))*$/.test(s)) return null;
  const dice = []; let mod = 0, count = 0;
  const re = /([+-]?)(\d*)d(\d+)|([+-]?)(\d+)/g; let m;
  while ((m = re.exec(s))) {
    if (m[3]) {
      const n = Math.max(1, parseInt(m[2] || '1', 10)), sides = parseInt(m[3], 10), sign = m[1] === '-' ? -1 : 1;
      if (sides < 2 || sides > 100) return null;
      count += n; if (count > 30) return null;
      for (let i = 0; i < n; i++) dice.push({ d: sides, v: rnd(sides), neg: sign < 0 });
    } else if (m[5]) mod += (m[4] === '-' ? -1 : 1) * parseInt(m[5], 10);
  }
  const sum = dice.reduce((t, x) => t + (x.neg ? -x.v : x.v), 0) + mod;
  return { dice, mod, sum, text: s };
}
