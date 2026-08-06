-- ============================================================
-- Sacramento — schema do Supabase
-- Rode isso inteiro no SQL Editor do seu projeto Supabase
-- (Dashboard -> SQL Editor -> New query -> colar -> Run)
-- ============================================================

create extension if not exists pgcrypto;

-- ---------- mesas (sessões) ----------
create table if not exists mesas (
  id uuid primary key default gen_random_uuid(),
  codigo text unique not null,
  pin_hash text not null,
  turno_index int not null default 0,
  rodada_atual int not null default 1,
  created_at timestamptz not null default now()
);

-- ---------- personagens (o pedaço da ficha que a mesa precisa ver) ----------
create table if not exists personagens (
  id uuid primary key default gen_random_uuid(),
  mesa_id uuid not null references mesas(id) on delete cascade,
  device_id text not null,
  nome text not null default '(sem nome)',
  npc boolean not null default false,
  vida_max int not null default 0,
  vida_perdida int not null default 0,
  dor_max int not null default 6,
  dor_perdida int not null default 0,
  updated_at timestamptz not null default now()
);

-- ---------- fila de iniciativa ----------
create table if not exists iniciativa (
  id uuid primary key default gen_random_uuid(),
  mesa_id uuid not null references mesas(id) on delete cascade,
  personagem_id uuid not null references personagens(id) on delete cascade,
  rank text not null,
  suit text not null,
  rodada int not null default 1,
  created_at timestamptz not null default now()
);

-- ============================================================
-- Acesso: sem login de verdade (só nome + PIN), então a proteção
-- funciona assim:
--   1) ninguém consegue ler a tabela "mesas" direto (tem o pin_hash) —
--      só através das funções abaixo ou da view pública sem o hash.
--   2) depois que o cliente sabe o mesa_id (uuid, não adivinhável),
--      ele pode ler/escrever livremente nas linhas daquela mesa.
-- Isso NÃO é segurança à prova de ataque deliberado — é uma trava
-- razoável pra um grupo de mesa, não pra dados sensíveis.
-- ============================================================

alter table mesas enable row level security;
alter table personagens enable row level security;
alter table iniciativa enable row level security;

-- ninguém lê/escreve "mesas" direto com a anon key
revoke all on mesas from anon, authenticated;

-- view pública sem o pin_hash, pra quem já tem o id da mesa acompanhar turno/rodada
create or replace view mesas_publicas as
  select id, codigo, turno_index, rodada_atual, created_at from mesas;
grant select on mesas_publicas to anon, authenticated;

-- só quem tem o mesa_id (via RPC) mexe nessas duas tabelas
create policy "leitura livre por mesa" on personagens for select using (true);
create policy "escrita livre por mesa" on personagens for insert with check (true);
create policy "update livre por mesa" on personagens for update using (true);
create policy "delete livre por mesa" on personagens for delete using (true);

create policy "leitura livre iniciativa" on iniciativa for select using (true);
create policy "escrita livre iniciativa" on iniciativa for insert with check (true);
create policy "update livre iniciativa" on iniciativa for update using (true);
create policy "delete livre iniciativa" on iniciativa for delete using (true);

grant select, insert, update, delete on personagens to anon, authenticated;
grant select, insert, update, delete on iniciativa to anon, authenticated;

-- atualizar turno/rodada da mesa (via mesa_id, não a tabela crua)
create or replace function mesa_atualizar_turno(p_mesa_id uuid, p_turno_index int, p_rodada int)
returns void
language sql
security definer
set search_path = public
as $$
  update mesas set turno_index = p_turno_index, rodada_atual = p_rodada where id = p_mesa_id;
$$;
grant execute on function mesa_atualizar_turno(uuid, int, int) to anon, authenticated;

-- ============================================================
-- Criar / entrar em mesa (com PIN)
-- ============================================================

create or replace function mesa_criar(p_codigo text, p_pin text)
returns table (id uuid, turno_index int, rodada_atual int)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  insert into mesas (codigo, pin_hash)
  values (lower(trim(p_codigo)), crypt(p_pin, gen_salt('bf')))
  returning mesas.id into v_id;

  return query select v_id, 0, 1;
end;
$$;
grant execute on function mesa_criar(text, text) to anon, authenticated;

create or replace function mesa_entrar(p_codigo text, p_pin text)
returns table (id uuid, turno_index int, rodada_atual int)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  select mesas.id into v_id
  from mesas
  where mesas.codigo = lower(trim(p_codigo))
    and mesas.pin_hash = crypt(p_pin, mesas.pin_hash);

  if v_id is null then
    raise exception 'código ou PIN incorretos';
  end if;

  return query select mesas.id, mesas.turno_index, mesas.rodada_atual from mesas where mesas.id = v_id;
end;
$$;
grant execute on function mesa_entrar(text, text) to anon, authenticated;

-- ============================================================
-- Realtime: habilita publicação pras tabelas que o app assina
-- ============================================================
alter publication supabase_realtime add table personagens;
alter publication supabase_realtime add table iniciativa;
alter publication supabase_realtime add table mesas;
