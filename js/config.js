// =====================================================================
//  CONFIGURAÇÃO DO SITE
//  Depois de criar o projeto no Supabase, cole aqui a URL e a chave
//  pública (Project Settings → API Keys). As duas podem ficar públicas
//  no GitHub sem problema: quem protege as fichas é o PIN + as regras
//  do banco (schema.sql).
//
//  Se deixar em branco, o site roda em "modo local": cada aparelho
//  guarda as fichas só no próprio navegador (bom pra testar).
// =====================================================================

export const CONFIG = {
  SUPABASE_URL: 'https://ymrpmszrxnahqycpwdqk.supabase.co',        // ex.: 'https://abcdefghijkl.supabase.co'
  SUPABASE_ANON_KEY: 'sb_publishable_PKNpTe-gFG_M_04_Eo4HNQ_e8n9JgMY',   // ex.: 'sb_publishable_...'  ou a chave 'anon public' (eyJ...)

  NOME_DA_MESA: 'Ordem Paranormal',
  SUBTITULO: 'Fichas da mesa',
};
