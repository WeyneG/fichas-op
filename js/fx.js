// Efeitos visuais (animações). Tudo pode ser desligado pelo botão ✦ do topo.
// Por padrão segue a configuração "reduzir movimento" do aparelho.

const KEY = 'op2:fx';
const reduce = () => { try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; } };

export function fxEnabled() {
  let v = null; try { v = localStorage.getItem(KEY); } catch (e) { /* ok */ }
  if (v === 'on') return true;
  if (v === 'off') return false;
  return !reduce();
}
export function setFx(on) {
  try { localStorage.setItem(KEY, on ? 'on' : 'off'); } catch (e) { /* ok */ }
  apply();
}
function apply() {
  const on = fxEnabled();
  document.body.classList.toggle('fx', on);
  document.querySelectorAll('[data-fx-toggle]').forEach((b) => { b.setAttribute('aria-pressed', on ? 'true' : 'false'); b.title = on ? 'Efeitos visuais: ligados' : 'Efeitos visuais: desligados'; });
  if (on) dust.start(); else dust.stop();
}

// ---------------------------------------------------------------------
// camadas fixas (vinheta de PV baixo, flash de dano, lanterna)
// ---------------------------------------------------------------------
function layer(cls) {
  let el = document.querySelector('.' + cls);
  if (!el) { el = document.createElement('div'); el.className = cls; el.setAttribute('aria-hidden', 'true'); document.body.appendChild(el); }
  return el;
}

export function hit(strength = 1) {
  if (!fxEnabled()) return;
  const f = layer('fx-hitflash');
  f.classList.remove('on'); void f.offsetWidth; f.classList.add('on');
  const app = document.getElementById('app');
  if (app) { app.classList.remove('fx-shake', 'fx-shake-big'); void app.offsetWidth; app.classList.add(strength > 1 ? 'fx-shake-big' : 'fx-shake'); }
  try { if (navigator.vibrate) navigator.vibrate(strength > 1 ? [60, 40, 90] : 50); } catch (e) { /* ok */ }
}

export function lowHp(on) {
  layer('fx-vignette');
  document.body.classList.toggle('low-hp', !!on);
}

// lanterna (só na página inicial, só com mouse)
let flOn = false;
const onMove = (e) => {
  const el = layer('fx-flashlight');
  el.style.setProperty('--mx', e.clientX + 'px');
  el.style.setProperty('--my', e.clientY + 'px');
  el.classList.add('lit');
};
const onLeave = () => { const el = document.querySelector('.fx-flashlight'); if (el) el.classList.remove('lit'); };
export function flashlight(on) {
  const fine = (() => { try { return window.matchMedia('(pointer: fine)').matches; } catch (e) { return false; } })();
  on = on && fine;
  if (on === flOn) return;
  flOn = on;
  layer('fx-flashlight');
  document.body.classList.toggle('flashlight', on);
  if (on) { window.addEventListener('pointermove', onMove); document.addEventListener('pointerleave', onLeave); }
  else { window.removeEventListener('pointermove', onMove); document.removeEventListener('pointerleave', onLeave); onLeave(); }
}

// ---------------------------------------------------------------------
// dados girando antes de parar no resultado
// ---------------------------------------------------------------------
export function spinDice(container) {
  if (!container || !fxEnabled()) return;
  const faces = [...container.querySelectorAll('.face[data-d]')];
  if (!faces.length) return;
  const total = container.querySelector('.t-s b');
  const finals = faces.map((f) => ({ el: f.querySelector('b'), v: f.dataset.v, d: +f.dataset.d, cls: f.className }));
  const totalV = total ? total.textContent : null;
  faces.forEach((f) => { f.classList.remove('crit', 'fumble'); f.classList.add('spinning'); });
  if (total) total.classList.add('spinning');
  let n = 0;
  const iv = setInterval(() => {
    n++;
    finals.forEach((x) => { if (x.el) x.el.textContent = 1 + Math.floor(Math.random() * x.d); });
    if (total) total.textContent = finals.reduce((s, x) => s + (1 + Math.floor(Math.random() * x.d)), 0);
    if (n >= 11) {
      clearInterval(iv);
      faces.forEach((f, i) => { const x = finals[i]; if (x.el) x.el.textContent = x.v; f.className = x.cls; f.classList.add('landed'); });
      if (total) { total.textContent = totalV; total.classList.remove('spinning'); total.classList.add('landed'); }
    }
  }, 45);
}

// ---------------------------------------------------------------------
// glitch: de tempos em tempos, a logo ou um título "falha"
// ---------------------------------------------------------------------
let glitchT = null;
function scheduleGlitch() {
  clearTimeout(glitchT);
  glitchT = setTimeout(() => {
    if (fxEnabled() && document.visibilityState === 'visible') {
      const pool = [...document.querySelectorAll('.brand .logo, .intro-logo, .title, .name, .tv-title, .tv-logo, .tv-now-n')]
        .filter((el) => { const r = el.getBoundingClientRect(); return r.width > 0 && r.bottom > 0 && r.top < innerHeight; });
      if (pool.length) {
        const el = pool[Math.floor(Math.random() * pool.length)];
        el.classList.remove('fx-glitch'); void el.offsetWidth; el.classList.add('fx-glitch');
        setTimeout(() => el.classList.remove('fx-glitch'), 600);
      }
    }
    scheduleGlitch();
  }, 22000 + Math.random() * 20000);
}

// ---------------------------------------------------------------------
// poeira/cinzas flutuando na névoa
// ---------------------------------------------------------------------
const dust = (() => {
  let cv = null, ctx = null, raf = 0, parts = [], running = false, w = 0, h = 0;
  function size() { if (!cv) return; const dpr = Math.min(2, window.devicePixelRatio || 1); w = innerWidth; h = innerHeight; cv.width = w * dpr; cv.height = h * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0); }
  function make() {
    const count = innerWidth < 700 ? 22 : 44;
    parts = Array.from({ length: count }, () => ({
      x: Math.random() * innerWidth, y: Math.random() * innerHeight,
      r: 0.6 + Math.random() * 1.8, vy: -(0.08 + Math.random() * 0.25), vx: (Math.random() - 0.5) * 0.15,
      a: 0.08 + Math.random() * 0.22, ph: Math.random() * Math.PI * 2,
    }));
  }
  function frame(t) {
    if (!running) return;
    ctx.clearRect(0, 0, w, h);
    for (const p of parts) {
      p.y += p.vy; p.x += p.vx + Math.sin(t / 2600 + p.ph) * 0.12;
      if (p.y < -5) { p.y = h + 5; p.x = Math.random() * w; }
      if (p.x < -5) p.x = w + 5; if (p.x > w + 5) p.x = -5;
      const tw = 0.6 + 0.4 * Math.sin(t / 900 + p.ph);
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(214,219,226,${(p.a * tw).toFixed(3)})`; ctx.fill();
    }
    raf = requestAnimationFrame(frame);
  }
  return {
    start() {
      if (running) return;
      const fog = document.querySelector('.fog'); if (!fog) return;
      if (!cv) { cv = document.createElement('canvas'); cv.className = 'fx-dust'; fog.appendChild(cv); ctx = cv.getContext('2d'); window.addEventListener('resize', () => { size(); }); }
      size(); make(); running = true; cv.style.display = ''; raf = requestAnimationFrame(frame);
    },
    stop() { running = false; cancelAnimationFrame(raf); if (cv) { ctx.clearRect(0, 0, w, h); cv.style.display = 'none'; } },
  };
})();
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') dust.stop(); else if (fxEnabled()) dust.start(); });

// ---------------------------------------------------------------------
export function initFx() {
  apply();
  scheduleGlitch();
  try { window.matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change', apply); } catch (e) { /* ok */ }
  document.addEventListener('click', (e) => {
    const b = e.target.closest('[data-fx-toggle]'); if (!b) return;
    setFx(!fxEnabled());
  });
}
export const fxReady = apply;
