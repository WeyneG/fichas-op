-- =====================================================================
--  Fichas · Ordem Paranormal — RODADAS (combate) e NPCs/ameaças do mestre
--  Rode este arquivo no SQL Editor do Supabase DEPOIS do schema.sql.
--  Pode rodar de novo sem problema. Usa o mesmo PIN de mestre.
-- =====================================================================

-- ---------------------------------------------------------------------
-- NPCs / ameaças
--   npcs.data       → o que os jogadores podem ver (nome, estado, PV se liberado)
--   npc_secrets.data→ ficha completa do mestre (PV real, notas)
--   npcs.visible    → false = escondido (os jogadores não recebem a linha)
-- ---------------------------------------------------------------------
create table if not exists public.npcs (
  id         text primary key check (id ~ '^[a-z0-9-]{1,40}$'),
  visible    boolean not null default false,
  sort       integer not null default 0,
  data       jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
create table if not exists public.npc_secrets (
  id   text primary key references public.npcs(id) on delete cascade,
  data jsonb not null default '{}'::jsonb
);

-- ---------------------------------------------------------------------
-- Combate (uma linha só, id = 1)
--   encounter.data        → ordem de turnos que os jogadores veem
--   encounter_secret.data → ordem completa do mestre (com NPCs escondidos)
-- ---------------------------------------------------------------------
create table if not exists public.encounter (
  id         integer primary key check (id = 1),
  data       jsonb not null default '{"active":false}'::jsonb,
  updated_at timestamptz not null default now()
);
create table if not exists public.encounter_secret (
  id   integer primary key check (id = 1),
  data jsonb not null default '{"active":false}'::jsonb
);
insert into public.encounter (id) values (1) on conflict (id) do nothing;
insert into public.encounter_secret (id) values (1) on conflict (id) do nothing;

alter table public.npcs             enable row level security;
alter table public.npc_secrets      enable row level security;
alter table public.encounter        enable row level security;
alter table public.encounter_secret enable row level security;

drop policy if exists "npcs visiveis" on public.npcs;
create policy "npcs visiveis" on public.npcs
  for select to anon, authenticated using (visible);

drop policy if exists "combate publico" on public.encounter;
create policy "combate publico" on public.encounter
  for select to anon, authenticated using (true);
-- npc_secrets e encounter_secret: sem policy = fechadas.
grant select on public.npcs, public.encounter to anon, authenticated;

-- ---------------------------------------------------------------------
-- Funções do mestre (todas conferem o PIN do mestre)
-- ---------------------------------------------------------------------
create or replace function public._is_master(p_pin text)
returns boolean
language sql stable security definer
set search_path = public, extensions
as $$ select coalesce(public._role(null, p_pin) = 'master', false) $$;
revoke all on function public._is_master(text) from public, anon, authenticated;

-- Tudo que o mestre precisa: NPCs (inclusive escondidos) + combate completo
create or replace function public.master_data(p_pin text)
returns jsonb
language plpgsql stable security definer
set search_path = public, extensions
as $$
begin
  if not public._is_master(p_pin) then raise exception 'pin_invalido'; end if;
  return jsonb_build_object(
    'npcs', coalesce((
      select jsonb_agg(jsonb_build_object(
               'id', n.id, 'visible', n.visible, 'sort', n.sort,
               'data', n.data, 'secret', coalesce(s.data, '{}'::jsonb))
             order by n.sort, n.id)
        from npcs n left join npc_secrets s on s.id = n.id), '[]'::jsonb),
    'encounter', coalesce((select data from encounter_secret where id = 1), '{"active":false}'::jsonb)
  );
end $$;

create or replace function public.save_npc(p_pin text, p_id text, p_visible boolean, p_sort integer, p_data jsonb, p_secret jsonb)
returns void
language plpgsql security definer
set search_path = public, extensions
as $$
begin
  if not public._is_master(p_pin) then raise exception 'pin_invalido'; end if;
  if p_id is null or p_id !~ '^[a-z0-9-]{1,40}$' then raise exception 'slug_invalido'; end if;
  if pg_column_size(p_data) > 200000 or pg_column_size(p_secret) > 200000 then raise exception 'muito_grande'; end if;
  insert into npcs (id, visible, sort, data, updated_at)
    values (p_id, coalesce(p_visible, false), coalesce(p_sort, 0), coalesce(p_data, '{}'::jsonb), now())
  on conflict (id) do update
    set visible = excluded.visible, sort = excluded.sort, data = excluded.data, updated_at = now();
  insert into npc_secrets (id, data) values (p_id, coalesce(p_secret, '{}'::jsonb))
  on conflict (id) do update set data = excluded.data;
end $$;

create or replace function public.delete_npc(p_pin text, p_id text)
returns void
language plpgsql security definer
set search_path = public, extensions
as $$
begin
  if not public._is_master(p_pin) then raise exception 'pin_invalido'; end if;
  delete from npcs where id = p_id;
end $$;

create or replace function public.save_encounter(p_pin text, p_data jsonb, p_secret jsonb)
returns void
language plpgsql security definer
set search_path = public, extensions
as $$
begin
  if not public._is_master(p_pin) then raise exception 'pin_invalido'; end if;
  if pg_column_size(p_data) > 200000 or pg_column_size(p_secret) > 200000 then raise exception 'muito_grande'; end if;
  update encounter        set data = coalesce(p_data,   '{"active":false}'::jsonb), updated_at = now() where id = 1;
  update encounter_secret set data = coalesce(p_secret, '{"active":false}'::jsonb) where id = 1;
end $$;

grant execute on function
  public.master_data(text),
  public.save_npc(text, text, boolean, integer, jsonb, jsonb),
  public.delete_npc(text, text),
  public.save_encounter(text, jsonb, jsonb)
to anon, authenticated;

-- ---------------------------------------------------------------------
-- Tempo real
-- ---------------------------------------------------------------------
do $$
declare t text;
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    foreach t in array array['npcs', 'encounter'] loop
      if not exists (select 1 from pg_publication_tables
                     where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t) then
        execute format('alter publication supabase_realtime add table public.%I', t);
      end if;
    end loop;
  end if;
end $$;
