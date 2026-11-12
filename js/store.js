// Camada de dados. Mesma interface para os dois modos:
//   - "cloud": Supabase (sincroniza entre aparelhos, tempo real)
//   - "local": só no navegador (quando config.js está vazio)

import { CONFIG } from './config.js';

const LOCAL_KEY = 'op2:local-db';
const LOCAL_MESA = 'op2:local-mesa';
const LOCAL_MASTER_PIN = '1234';

function err(code, msg) { const e = new Error(msg || code); e.code = code; return e; }

function mapError(e) {
  const m = String((e && (e.message || e.details || e.hint)) || e || '');
  for (const c of ['pin_invalido', 'pin_formato', 'slug_em_uso', 'slug_invalido', 'nao_encontrado', 'muito_grande']) {
    if (m.includes(c)) return err(c, m);
  }
  if (/fetch|network|Failed to fetch|NetworkError|timeout/i.test(m)) return err('offline', m);
  return err('desconhecido', m);
}

export const MESSAGES = {
  pin_invalido: 'PIN incorreto.',
  pin_formato: 'O PIN precisa ter de 4 a 8 números.',
  slug_em_uso: 'Já existe um personagem com esse endereço.',
  slug_invalido: 'Nome inválido para o endereço da ficha.',
  nao_encontrado: 'Ficha não encontrada.',
  muito_grande: 'A ficha ficou grande demais (provavelmente a imagem). Tente um retrato menor.',
  offline: 'Sem conexão com o servidor.',
  desconhecido: 'Algo deu errado.',
};
export const msgOf = (e) => MESSAGES[e && e.code] || MESSAGES.desconhecido;

// ---------------------------------------------------------------------
// Modo nuvem (Supabase)
// ---------------------------------------------------------------------
async function cloudStore() {
  const { createClient } = await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm');
  const sb = createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const rpc = async (fn, args) => {
    const { data, error } = await sb.rpc(fn, args);
    if (error) throw mapError(error);
    return data;
  };
  const sel = 'slug,data,updated_at,created_at';
  return {
    mode: 'cloud',
    async list() {
      const { data, error } = await sb.from('characters').select(sel).order('created_at', { ascending: true });
      if (error) throw mapError(error);
      return data || [];
    },
    async get(slug) {
      const { data, error } = await sb.from('characters').select(sel).eq('slug', slug).maybeSingle();
      if (error) throw mapError(error);
      return data;
    },
    create: (slug, pin, pub, priv) => rpc('create_character', { p_slug: slug, p_pin: pin, p_data: pub, p_private: priv }),
    checkPin: (slug, pin) => rpc('check_pin', { p_slug: slug, p_pin: pin }),
    checkMaster: (pin) => rpc('check_master', { p_pin: pin }),
    savePublic: (slug, pin, data) => rpc('save_character', { p_slug: slug, p_pin: pin, p_data: data }),
    getPrivate: (slug, pin) => rpc('get_private', { p_slug: slug, p_pin: pin }),
    savePrivate: (slug, pin, data) => rpc('save_private', { p_slug: slug, p_pin: pin, p_data: data }),
    changePin: (slug, pin, newPin) => rpc('change_pin', { p_slug: slug, p_pin: pin, p_new_pin: newPin }),
    remove: (slug, pin) => rpc('delete_character', { p_slug: slug, p_pin: pin }),
    // ---- mesa: combate e NPCs ----
    async getEncounter() {
      const { data, error } = await sb.from('encounter').select('data').eq('id', 1).maybeSingle();
      if (error) throw mapError(error);
      return (data && data.data) || { active: false };
    },
    async listNpcs() {
      const { data, error } = await sb.from('npcs').select('id,sort,data').order('sort', { ascending: true });
      if (error) throw mapError(error);
      return data || [];
    },
    masterData: (pin) => rpc('master_data', { p_pin: pin }),
    saveNpc: (pin, n) => rpc('save_npc', { p_pin: pin, p_id: n.id, p_visible: !!n.visible, p_sort: n.sort || 0, p_data: n.data, p_secret: n.secret }),
    deleteNpc: (pin, id) => rpc('delete_npc', { p_pin: pin, p_id: id }),
    saveEncounter: (pin, pub, secret) => rpc('save_encounter', { p_pin: pin, p_data: pub, p_secret: secret }),
    subscribeMesa(cb) {
      const ch = sb.channel('mesa-' + Math.random().toString(36).slice(2, 6))
        .on('postgres_changes', { event: '*', schema: 'public', table: 'npcs' }, () => cb())
        .on('postgres_changes', { event: '*', schema: 'public', table: 'encounter' }, () => cb())
        .subscribe();
      return () => { try { sb.removeChannel(ch); } catch (e) { /* ok */ } };
    },
    // cb({type:'upsert'|'delete', row})
    subscribe(slug, cb) {
      const opts = { event: '*', schema: 'public', table: 'characters' };
      if (slug) opts.filter = 'slug=eq.' + slug;
      const ch = sb.channel('fichas-' + (slug || 'todas') + '-' + Math.random().toString(36).slice(2, 6))
        .on('postgres_changes', opts, (p) => {
          if (p.eventType === 'DELETE') cb({ type: 'delete', row: p.old });
          else cb({ type: 'upsert', row: p.new });
        })
        .subscribe();
      return () => { try { sb.removeChannel(ch); } catch (e) { /* ok */ } };
    },
  };
}

// ---------------------------------------------------------------------
// Modo local (localStorage)
// ---------------------------------------------------------------------
function localStore() {
  const read = () => { try { return JSON.parse(localStorage.getItem(LOCAL_KEY) || '{}') || {}; } catch (e) { return {}; } };
  const write = (db) => {
    try { localStorage.setItem(LOCAL_KEY, JSON.stringify(db)); }
    catch (e) { throw err('muito_grande'); }
    listeners.forEach((l) => l());
  };
  const listeners = new Set();
  const mesaListeners = new Set();
  window.addEventListener('storage', (e) => {
    if (e.key === LOCAL_KEY) listeners.forEach((l) => l());
    if (e.key === LOCAL_MESA) mesaListeners.forEach((l) => l());
  });
  const readMesa = () => {
    let m; try { m = JSON.parse(localStorage.getItem(LOCAL_MESA) || '{}') || {}; } catch (e) { m = {}; }
    m.npcs = m.npcs || {}; m.enc = m.enc || {}; return m;
  };
  const writeMesa = (m) => {
    try { localStorage.setItem(LOCAL_MESA, JSON.stringify(m)); } catch (e) { throw err('muito_grande'); }
    mesaListeners.forEach((l) => l());
  };
  const role = (db, slug, pin) => {
    if (!pin) return null;
    if (pin === LOCAL_MASTER_PIN) return 'master';
    if (slug && db[slug] && db[slug].pin === pin) return 'owner';
    return null;
  };
  const row = (slug, c) => ({ slug, data: c.data, updated_at: c.updated_at, created_at: c.created_at });
  const need = (db, slug, pin) => {
    if (!db[slug]) throw err('nao_encontrado');
    if (!role(db, slug, pin)) throw err('pin_invalido');
  };
  return {
    mode: 'local',
    localMasterPin: LOCAL_MASTER_PIN,
    async list() {
      const db = read();
      return Object.keys(db).map((s) => row(s, db[s])).sort((a, b) => (a.created_at < b.created_at ? -1 : 1));
    },
    async get(slug) { const db = read(); return db[slug] ? row(slug, db[slug]) : null; },
    async create(slug, pin, pub, priv) {
      if (!/^[0-9]{4,8}$/.test(pin || '')) throw err('pin_formato');
      const db = read();
      if (db[slug]) throw err('slug_em_uso');
      const now = new Date().toISOString();
      db[slug] = { data: pub, priv, pin, created_at: now, updated_at: now };
      write(db); return slug;
    },
    async checkPin(slug, pin) { return role(read(), slug, pin); },
    async checkMaster(pin) { return pin === LOCAL_MASTER_PIN; },
    async savePublic(slug, pin, data) {
      const db = read(); need(db, slug, pin);
      db[slug].data = data; db[slug].updated_at = new Date().toISOString(); write(db);
      return db[slug].updated_at;
    },
    async getPrivate(slug, pin) { const db = read(); need(db, slug, pin); return db[slug].priv || {}; },
    async savePrivate(slug, pin, data) { const db = read(); need(db, slug, pin); db[slug].priv = data; write(db); },
    async changePin(slug, pin, newPin) {
      if (!/^[0-9]{4,8}$/.test(newPin || '')) throw err('pin_formato');
      const db = read(); need(db, slug, pin); db[slug].pin = newPin; write(db);
    },
    async remove(slug, pin) { const db = read(); need(db, slug, pin); delete db[slug]; write(db); },
    // ---- mesa: combate e NPCs ----
    async getEncounter() { return readMesa().enc.pub || { active: false }; },
    async listNpcs() {
      const m = readMesa();
      return Object.entries(m.npcs).filter(([, n]) => n.visible).map(([id, n]) => ({ id, sort: n.sort, data: n.data })).sort((a, b) => a.sort - b.sort);
    },
    async masterData(pin) {
      if (pin !== LOCAL_MASTER_PIN) throw err('pin_invalido');
      const m = readMesa();
      return { npcs: Object.entries(m.npcs).map(([id, n]) => ({ id, ...n })).sort((a, b) => a.sort - b.sort), encounter: m.enc.secret || { active: false } };
    },
    async saveNpc(pin, n) {
      if (pin !== LOCAL_MASTER_PIN) throw err('pin_invalido');
      const m = readMesa(); m.npcs[n.id] = { visible: !!n.visible, sort: n.sort || 0, data: n.data, secret: n.secret }; writeMesa(m);
    },
    async deleteNpc(pin, id) { if (pin !== LOCAL_MASTER_PIN) throw err('pin_invalido'); const m = readMesa(); delete m.npcs[id]; writeMesa(m); },
    async saveEncounter(pin, pub, secret) { if (pin !== LOCAL_MASTER_PIN) throw err('pin_invalido'); const m = readMesa(); m.enc = { pub, secret }; writeMesa(m); },
    subscribeMesa(cb) { mesaListeners.add(cb); return () => mesaListeners.delete(cb); },
    subscribe(slug, cb) {
      let last = JSON.stringify(read()[slug] || null);
      const fn = () => {
        const db = read();
        if (slug) {
          const now = JSON.stringify(db[slug] || null);
          if (now === last) return; last = now;
          if (!db[slug]) cb({ type: 'delete', row: { slug } }); else cb({ type: 'upsert', row: row(slug, db[slug]) });
        } else cb({ type: 'refresh' });
      };
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
  };
}

let storePromise = null;
export function getStore() {
  if (!storePromise) {
    storePromise = (CONFIG.SUPABASE_URL && CONFIG.SUPABASE_ANON_KEY)
      ? cloudStore().catch((e) => { console.error('Falha ao carregar Supabase', e); return localStore(); })
      : Promise.resolve(localStore());
  }
  return storePromise;
}

// ---------------------------------------------------------------------
// PINs lembrados neste aparelho
// ---------------------------------------------------------------------
export const auth = {
  get(slug) { try { return localStorage.getItem('op2:pin:' + slug) || ''; } catch (e) { return ''; } },
  set(slug, pin) { try { localStorage.setItem('op2:pin:' + slug, pin); } catch (e) { /* ok */ } },
  clear(slug) { try { localStorage.removeItem('op2:pin:' + slug); } catch (e) { /* ok */ } },
  master() { try { return localStorage.getItem('op2:master') || ''; } catch (e) { return ''; } },
  setMaster(pin) { try { localStorage.setItem('op2:master', pin); } catch (e) { /* ok */ } },
  clearMaster() { try { localStorage.removeItem('op2:master'); } catch (e) { /* ok */ } },
};
