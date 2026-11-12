-- =====================================================================
--  Fichas · Ordem Paranormal 2 — banco de dados (Supabase / PostgreSQL)
--  Cole TUDO isto no SQL Editor do Supabase e clique em "Run".
--  Pode rodar de novo sem problema (é idempotente).
--
--  ANTES DE RODAR: troque o PIN do mestre na linha marcada com  <<<<<<
-- =====================================================================

create extension if not exists pgcrypto with schema extensions;

-- ---------------------------------------------------------------------
-- Tabelas
-- ---------------------------------------------------------------------

-- Parte PÚBLICA da ficha (nome, PV, PD, atributos, perícias...).
-- Qualquer pessoa com o link consegue VER. Ninguém escreve direto:
-- só pelas funções abaixo, que conferem o PIN.
create table if not exists public.characters (
  slug       text primary key check (slug ~ '^[a-z0-9-]{1,40}$'),
  data       jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- PIN (criptografado) e a parte PRIVADA (histórico, anotações, diário).
-- Ninguém lê esta tabela direto — só o dono (com PIN) ou o mestre.
create table if not exists public.character_secrets (
  slug     text primary key references public.characters(slug) on delete cascade,
  pin_hash text not null,
  private  jsonb not null default '{}'::jsonb
);

create table if not exists public.app_settings (
  key   text primary key,
  value text not null
);

alter table public.characters        enable row level security;
alter table public.character_secrets enable row level security;
alter table public.app_settings      enable row level security;

drop policy if exists "fichas sao publicas para leitura" on public.characters;
create policy "fichas sao publicas para leitura"
  on public.characters for select
  to anon, authenticated
  using (true);
-- (sem policies de insert/update/delete = bloqueado; só as funções escrevem)
-- (character_secrets e app_settings sem policy nenhuma = totalmente fechadas)

-- ---------------------------------------------------------------------
-- PIN do mestre  <<<<<<  TROQUE '1234' PELO SEU PIN (4 a 8 números)
-- Para trocar depois, é só editar e rodar esta linha de novo.
-- ---------------------------------------------------------------------
insert into public.app_settings (key, value)
values ('master_pin_hash', extensions.crypt('1234', extensions.gen_salt('bf')))
on conflict (key) do update set value = excluded.value;

-- ---------------------------------------------------------------------
-- Funções (RPC)
-- ---------------------------------------------------------------------

-- Interna: descobre quem é pelo PIN → 'master' | 'owner' | null
create or replace function public._role(p_slug text, p_pin text)
returns text
language plpgsql stable security definer
set search_path = public, extensions
as $$
declare m text; h text;
begin
  if p_pin is null or length(p_pin) = 0 then return null; end if;
  select value into m from app_settings where key = 'master_pin_hash';
  if m is not null and crypt(p_pin, m) = m then return 'master'; end if;
  if p_slug is not null then
    select pin_hash into h from character_secrets where slug = p_slug;
    if h is not null and crypt(p_pin, h) = h then return 'owner'; end if;
  end if;
  return null;
end $$;
revoke all on function public._role(text, text) from public, anon, authenticated;

-- Confere o PIN de uma ficha
create or replace function public.check_pin(p_slug text, p_pin text)
returns text
language sql stable security definer
set search_path = public, extensions
as $$ select public._role(p_slug, p_pin) $$;

-- Confere o PIN do mestre
create or replace function public.check_master(p_pin text)
returns boolean
language sql stable security definer
set search_path = public, extensions
as $$ select coalesce(public._role(null, p_pin) = 'master', false) $$;

-- Cria personagem
create or replace function public.create_character(p_slug text, p_pin text, p_data jsonb, p_private jsonb)
returns text
language plpgsql security definer
set search_path = public, extensions
as $$
begin
  if p_pin is null or p_pin !~ '^[0-9]{4,8}$' then raise exception 'pin_formato'; end if;
  if p_slug is null or p_slug !~ '^[a-z0-9-]{1,40}$' then raise exception 'slug_invalido'; end if;
  if pg_column_size(p_data) > 1500000 or pg_column_size(p_private) > 1500000 then raise exception 'muito_grande'; end if;
  insert into characters (slug, data) values (p_slug, coalesce(p_data, '{}'::jsonb));
  insert into character_secrets (slug, pin_hash, private)
    values (p_slug, crypt(p_pin, gen_salt('bf')), coalesce(p_private, '{}'::jsonb));
  return p_slug;
exception when unique_violation then
  raise exception 'slug_em_uso';
end $$;

-- Salva a parte pública
create or replace function public.save_character(p_slug text, p_pin text, p_data jsonb)
returns timestamptz
language plpgsql security definer
set search_path = public, extensions
as $$
declare t timestamptz;
begin
  if public._role(p_slug, p_pin) is null then raise exception 'pin_invalido'; end if;
  if pg_column_size(p_data) > 1500000 then raise exception 'muito_grande'; end if;
  update characters set data = p_data, updated_at = now()
   where slug = p_slug returning updated_at into t;
  if t is null then raise exception 'nao_encontrado'; end if;
  return t;
end $$;

-- Lê a parte privada
create or replace function public.get_private(p_slug text, p_pin text)
returns jsonb
language plpgsql stable security definer
set search_path = public, extensions
as $$
declare r jsonb;
begin
  if public._role(p_slug, p_pin) is null then raise exception 'pin_invalido'; end if;
  select private into r from character_secrets where slug = p_slug;
  return coalesce(r, '{}'::jsonb);
end $$;

-- Salva a parte privada
create or replace function public.save_private(p_slug text, p_pin text, p_data jsonb)
returns void
language plpgsql security definer
set search_path = public, extensions
as $$
begin
  if public._role(p_slug, p_pin) is null then raise exception 'pin_invalido'; end if;
  if pg_column_size(p_data) > 1500000 then raise exception 'muito_grande'; end if;
  update character_secrets set private = p_data where slug = p_slug;
end $$;

-- Troca o PIN (dono ou mestre)
create or replace function public.change_pin(p_slug text, p_pin text, p_new_pin text)
returns void
language plpgsql security definer
set search_path = public, extensions
as $$
begin
  if public._role(p_slug, p_pin) is null then raise exception 'pin_invalido'; end if;
  if p_new_pin is null or p_new_pin !~ '^[0-9]{4,8}$' then raise exception 'pin_formato'; end if;
  update character_secrets set pin_hash = crypt(p_new_pin, gen_salt('bf')) where slug = p_slug;
end $$;

-- Exclui personagem (dono ou mestre)
create or replace function public.delete_character(p_slug text, p_pin text)
returns void
language plpgsql security definer
set search_path = public, extensions
as $$
begin
  if public._role(p_slug, p_pin) is null then raise exception 'pin_invalido'; end if;
  delete from characters where slug = p_slug;
end $$;

grant execute on function
  public.check_pin(text, text),
  public.check_master(text),
  public.create_character(text, text, jsonb, jsonb),
  public.save_character(text, text, jsonb),
  public.get_private(text, text),
  public.save_private(text, text, jsonb),
  public.change_pin(text, text, text),
  public.delete_character(text, text)
to anon, authenticated;

-- ---------------------------------------------------------------------
-- Tempo real: avisa o site quando uma ficha muda
-- ---------------------------------------------------------------------
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (select 1 from pg_publication_tables
                     where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'characters')
  then
    alter publication supabase_realtime add table public.characters;
  end if;
end $$;
