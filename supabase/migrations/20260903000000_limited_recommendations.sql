-- Seleções são aceitações. Indicações são reservas limitadas, nunca votos reais.
-- Executar antes de publicar o frontend que consome ballot_recommendations.
create table public.recommendation_limits (
  election_id text not null references public.elections(id) on delete cascade,
  office text not null check (office in ('PRESIDENTE', 'SENADOR', 'DEPUTADO_FEDERAL', 'DEPUTADO_ESTADUAL')),
  scope text not null check (scope ~ '^[A-Z]{2}$'),
  indication_limit bigint not null check (indication_limit > 0),
  primary key (election_id, office, scope),
  check ((office = 'PRESIDENTE') = (scope = 'BR'))
);
insert into public.recommendation_limits values
  ('congresso-2026', 'PRESIDENTE', 'BR', 59276177),
  ('congresso-2026', 'SENADOR', 'AC', 185066),
  ('congresso-2026', 'SENADOR', 'AL', 621562),
  ('congresso-2026', 'SENADOR', 'AP', 128186),
  ('congresso-2026', 'SENADOR', 'AM', 607286),
  ('congresso-2026', 'SENADOR', 'BA', 3927598),
  ('congresso-2026', 'SENADOR', 'CE', 1325786),
  ('congresso-2026', 'SENADOR', 'DF', 403735),
  ('congresso-2026', 'SENADOR', 'ES', 863359),
  ('congresso-2026', 'SENADOR', 'GO', 1557415),
  ('congresso-2026', 'SENADOR', 'MA', 1539942),
  ('congresso-2026', 'SENADOR', 'MG', 3568658),
  ('congresso-2026', 'SENADOR', 'MS', 373712),
  ('congresso-2026', 'SENADOR', 'MT', 490699),
  ('congresso-2026', 'SENADOR', 'PA', 1374956),
  ('congresso-2026', 'SENADOR', 'PB', 831701),
  ('congresso-2026', 'SENADOR', 'PE', 1430802),
  ('congresso-2026', 'SENADOR', 'PI', 812213),
  ('congresso-2026', 'SENADOR', 'PR', 2331740),
  ('congresso-2026', 'SENADOR', 'RJ', 2382265),
  ('congresso-2026', 'SENADOR', 'RN', 660315),
  ('congresso-2026', 'SENADOR', 'RO', 230361),
  ('congresso-2026', 'SENADOR', 'RR', 85366),
  ('congresso-2026', 'SENADOR', 'RS', 1875245),
  ('congresso-2026', 'SENADOR', 'SC', 1179757),
  ('congresso-2026', 'SENADOR', 'SE', 300247),
  ('congresso-2026', 'SENADOR', 'SP', 6513282),
  ('congresso-2026', 'SENADOR', 'TO', 214355),
  ('congresso-2026', 'DEPUTADO_FEDERAL', 'AC', 14522),
  ('congresso-2026', 'DEPUTADO_FEDERAL', 'AL', 58134),
  ('congresso-2026', 'DEPUTADO_FEDERAL', 'AP', 5435),
  ('congresso-2026', 'DEPUTADO_FEDERAL', 'AM', 87876),
  ('congresso-2026', 'DEPUTADO_FEDERAL', 'BA', 53486),
  ('congresso-2026', 'DEPUTADO_FEDERAL', 'CE', 74773),
  ('congresso-2026', 'DEPUTADO_FEDERAL', 'DF', 20923),
  ('congresso-2026', 'DEPUTADO_FEDERAL', 'ES', 42640),
  ('congresso-2026', 'DEPUTADO_FEDERAL', 'GO', 51346),
  ('congresso-2026', 'DEPUTADO_FEDERAL', 'MA', 54547),
  ('congresso-2026', 'DEPUTADO_FEDERAL', 'MG', 31025),
  ('congresso-2026', 'DEPUTADO_FEDERAL', 'MS', 41773),
  ('congresso-2026', 'DEPUTADO_FEDERAL', 'MT', 47479),
  ('congresso-2026', 'DEPUTADO_FEDERAL', 'PA', 62366),
  ('congresso-2026', 'DEPUTADO_FEDERAL', 'PB', 54851),
  ('congresso-2026', 'DEPUTADO_FEDERAL', 'PE', 59686),
  ('congresso-2026', 'DEPUTADO_FEDERAL', 'PI', 79987),
  ('congresso-2026', 'DEPUTADO_FEDERAL', 'PR', 57185),
  ('congresso-2026', 'DEPUTADO_FEDERAL', 'RJ', 33368),
  ('congresso-2026', 'DEPUTADO_FEDERAL', 'RN', 56315),
  ('congresso-2026', 'DEPUTADO_FEDERAL', 'RO', 12607),
  ('congresso-2026', 'DEPUTADO_FEDERAL', 'RR', 8243),
  ('congresso-2026', 'DEPUTADO_FEDERAL', 'RS', 40555),
  ('congresso-2026', 'DEPUTADO_FEDERAL', 'SC', 51824),
  ('congresso-2026', 'DEPUTADO_FEDERAL', 'SE', 38135),
  ('congresso-2026', 'DEPUTADO_FEDERAL', 'SP', 71754),
  ('congresso-2026', 'DEPUTADO_FEDERAL', 'TO', 13668),
  ('congresso-2026', 'DEPUTADO_ESTADUAL', 'AC', 4810),
  ('congresso-2026', 'DEPUTADO_ESTADUAL', 'AL', 19714),
  ('congresso-2026', 'DEPUTADO_ESTADUAL', 'AP', 3898),
  ('congresso-2026', 'DEPUTADO_ESTADUAL', 'AM', 17787),
  ('congresso-2026', 'DEPUTADO_ESTADUAL', 'BA', 27338),
  ('congresso-2026', 'DEPUTADO_ESTADUAL', 'CE', 17243),
  ('congresso-2026', 'DEPUTADO_ESTADUAL', 'ES', 12176),
  ('congresso-2026', 'DEPUTADO_ESTADUAL', 'GO', 17484),
  ('congresso-2026', 'DEPUTADO_ESTADUAL', 'MA', 24800),
  ('congresso-2026', 'DEPUTADO_ESTADUAL', 'MG', 28270),
  ('congresso-2026', 'DEPUTADO_ESTADUAL', 'MS', 11650),
  ('congresso-2026', 'DEPUTADO_ESTADUAL', 'MT', 20723),
  ('congresso-2026', 'DEPUTADO_ESTADUAL', 'PA', 22366),
  ('congresso-2026', 'DEPUTADO_ESTADUAL', 'PB', 20602),
  ('congresso-2026', 'DEPUTADO_ESTADUAL', 'PE', 24851),
  ('congresso-2026', 'DEPUTADO_ESTADUAL', 'PI', 20920),
  ('congresso-2026', 'DEPUTADO_ESTADUAL', 'PR', 26884),
  ('congresso-2026', 'DEPUTADO_ESTADUAL', 'RJ', 13946),
  ('congresso-2026', 'DEPUTADO_ESTADUAL', 'RN', 25143),
  ('congresso-2026', 'DEPUTADO_ESTADUAL', 'RO', 7609),
  ('congresso-2026', 'DEPUTADO_ESTADUAL', 'RR', 3046),
  ('congresso-2026', 'DEPUTADO_ESTADUAL', 'RS', 24946),
  ('congresso-2026', 'DEPUTADO_ESTADUAL', 'SC', 12390),
  ('congresso-2026', 'DEPUTADO_ESTADUAL', 'SE', 14990),
  ('congresso-2026', 'DEPUTADO_ESTADUAL', 'SP', 45094),
  ('congresso-2026', 'DEPUTADO_ESTADUAL', 'TO', 8271);

create table private.recommendation_policies (
  election_id text primary key references public.elections(id) on delete cascade,
  policy_version text not null default 'selections_v1'
);
insert into private.recommendation_policies (election_id)
select id from public.elections where id = 'congresso-2026';

create table private.recommendation_requests (
  election_id text not null,
  user_id uuid not null,
  office text not null,
  scope text not null,
  candidate_ids text[] not null,
  policy_version text not null,
  sequence bigint generated always as identity,
  processed_at timestamptz not null default clock_timestamp(),
  primary key (election_id, user_id, office),
  foreign key (election_id, user_id) references public.ballot_drafts(election_id, user_id) on delete cascade
);

create table public.ballot_recommendations (
  election_id text not null,
  user_id uuid not null,
  office text not null,
  scope text not null,
  slot smallint not null,
  candidate_id text not null references public.candidates(id) on delete cascade,
  policy_version text not null,
  assigned_at timestamptz not null default clock_timestamp(),
  primary key (election_id, user_id, office, slot),
  unique (election_id, user_id, candidate_id),
  foreign key (election_id, user_id, office)
    references private.recommendation_requests(election_id, user_id, office) on delete cascade,
  check (slot between 1 and case when office = 'SENADOR' then 2 else 1 end)
);
create index ballot_recommendations_candidate_idx
  on public.ballot_recommendations (election_id, candidate_id);
create index selection_tallies_candidate_scope_idx
  on public.selection_tallies (election_id, candidate_id, state);

create table public.recommendation_tallies (
  election_id text not null references public.elections(id) on delete cascade,
  candidate_id text not null references public.candidates(id) on delete cascade,
  indication_count bigint not null default 0 check (indication_count >= 0),
  primary key (election_id, candidate_id)
);

create or replace function private.recommendation_office(office_name text)
returns text language sql immutable set search_path = '' as $$
  select case upper(replace(trim(office_name), ' ', '_'))
    when 'SENADORES' then 'SENADOR'
    else upper(replace(trim(office_name), ' ', '_'))
  end;
$$;

-- Política isolada: alterar esta função e versionar recommendation_policies para
-- novas regras. Nunca confiar em notas enviadas no JSON do navegador.
create or replace function private.rank_recommendation_candidates(
  election text, office_key text, scope_key text, accepted_ids text[], policy text
)
returns table (candidate_id text)
language plpgsql stable set search_path = '' as $$
begin
  if policy not in ('selections_v1', 'score_v1') then
    raise exception 'Unsupported recommendation policy: %', policy;
  end if;
  return query
    select c.id
    from public.candidates c
    left join public.parties p on p.id = c.party_id
    cross join lateral (
      select case when jsonb_typeof(c.scores->'candidate') = 'number'
        then (c.scores->>'candidate')::numeric else 0 end as own_score
    ) score
    cross join lateral (
      select coalesce(sum(t.selection_count), 0) as selections
      from public.selection_tallies t
      where t.election_id = election and t.candidate_id = c.id
        and (office_key = 'PRESIDENTE' or t.state = scope_key)
    ) popularity
    where c.election_id = election and c.id = any(accepted_ids) and c.public_visible
      and private.recommendation_office(c.office) = office_key
      and (office_key = 'PRESIDENTE' or c.state = scope_key)
    order by
      case when policy = 'selections_v1' then popularity.selections else 0 end desc,
      case when score.own_score > 0 then score.own_score else coalesce(p.score, 0) end desc,
      (score.own_score > 0) desc,
      regexp_replace(normalize(lower(c.name), NFD), U&'[\0300-\036f]', '', 'g') collate "C",
      c.id collate "C";
end;
$$;

-- Uma fila transacional por eleição, inclusive antes dos gatilhos já existentes
-- de seleção. A ordem é a de processamento confirmado pelo banco, não o relógio
-- do navegador. O lock é liberado automaticamente ao confirmar/reverter.
create or replace function private.lock_recommendation_election()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'UPDATE' and (new.election_id <> old.election_id or new.user_id <> old.user_id) then
    raise exception 'Ballot identity cannot be changed';
  end if;
  perform pg_advisory_xact_lock(hashtextextended(
    'recommendations:' || case when tg_op = 'DELETE' then old.election_id else new.election_id end, 0
  ));
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;
create trigger ballot_drafts_00_lock_recommendations
before insert or update or delete on public.ballot_drafts
for each row execute function private.lock_recommendation_election();

-- Contadores são distintos de selection_tallies e sempre transacionais.
create or replace function private.count_recommendation()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  max_count bigint;
begin
  perform pg_advisory_xact_lock(hashtextextended(
    'recommendations:' || case when tg_op = 'DELETE' then old.election_id else new.election_id end, 0
  ));
  if tg_op = 'DELETE' then
    update public.recommendation_tallies set indication_count = indication_count - 1
      where election_id = old.election_id and candidate_id = old.candidate_id;
    return old;
  end if;
  select indication_limit into max_count from public.recommendation_limits
    where election_id = new.election_id and office = new.office and scope = new.scope;
  if max_count is null then raise exception 'Recommendation limit missing'; end if;
  insert into public.recommendation_tallies (election_id, candidate_id, indication_count)
    values (new.election_id, new.candidate_id, 1)
  on conflict (election_id, candidate_id) do update
    set indication_count = public.recommendation_tallies.indication_count + 1
    where public.recommendation_tallies.indication_count < max_count;
  if not found then raise exception 'Recommendation limit reached'; end if;
  return new;
end;
$$;
create trigger ballot_recommendations_count
before insert or delete on public.ballot_recommendations
for each row execute function private.count_recommendation();

create or replace function private.allocate_ballot_recommendations(
  election text, principal uuid, selected_state text, payload jsonb
)
returns void language plpgsql security definer set search_path = '' as $$
declare
  policy text;
  office_key text;
  scope_key text;
  ids text[];
  limit_count bigint;
  next_candidate record;
  next_slot smallint;
begin
  perform pg_advisory_xact_lock(hashtextextended('recommendations:' || election, 0));
  select policy_version into policy from private.recommendation_policies where election_id = election;
  if policy is null then return; end if; -- Outra eleição ainda não configurada.

  -- Cargo e UF vêm do cadastro, não da posição do candidato no JSON do cliente.
  foreach office_key in array array['PRESIDENTE', 'SENADOR', 'DEPUTADO_FEDERAL'] loop
    scope_key := case when office_key = 'PRESIDENTE' then 'BR' else selected_state end;
    select coalesce(array_agg(c.id order by c.id), '{}'::text[]) into ids
      from public.candidates c
      join private.ballot_candidate_ids(payload) selected on selected.candidate_id = c.id
      where c.election_id = election and c.public_visible
        and private.recommendation_office(c.office) = office_key
        and (office_key = 'PRESIDENTE' or c.state = scope_key);

    -- Recarregar, salvar novamente e alterar outro cargo não consomem nova vaga.
    if exists (
      select 1 from private.recommendation_requests r
      where r.election_id = election and r.user_id = principal and r.office = office_key
        and r.scope = scope_key and r.candidate_ids = ids and r.policy_version = policy
    ) then continue; end if;

    -- Alteração efetiva devolve as vagas deste cargo e entra novamente na fila.
    delete from private.recommendation_requests
      where election_id = election and user_id = principal and office = office_key;
    insert into private.recommendation_requests
      (election_id, user_id, office, scope, candidate_ids, policy_version)
      values (election, principal, office_key, scope_key, ids, policy);

    select indication_limit into limit_count from public.recommendation_limits
      where election_id = election and office = office_key and scope = scope_key;
    if cardinality(ids) = 0 then continue; end if;
    if limit_count is null then raise exception 'Recommendation limit missing for %/%', office_key, scope_key; end if;

    next_slot := 0;
    for next_candidate in
      select ranked.candidate_id
      from private.rank_recommendation_candidates(election, office_key, scope_key, ids, policy) ranked
    loop
      if coalesce((select indication_count from public.recommendation_tallies
          where election_id = election and candidate_id = next_candidate.candidate_id), 0) >= limit_count
      then continue; end if;
      next_slot := next_slot + 1;
      insert into public.ballot_recommendations
        (election_id, user_id, office, scope, slot, candidate_id, policy_version)
        values (election, principal, office_key, scope_key, next_slot, next_candidate.candidate_id, policy);
      exit when next_slot >= case when office_key = 'SENADOR' then 2 else 1 end;
    end loop;
  end loop;
end;
$$;

create or replace function private.sync_ballot_recommendations()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  perform private.allocate_ballot_recommendations(new.election_id, new.user_id, new.state, new.selections);
  return new;
end;
$$;
-- PostgreSQL executa gatilhos do mesmo tipo por nome. Primeiro contabiliza
-- todas as seleções da gravação; só depois escolhe as indicações.
create trigger ballot_drafts_zz_sync_recommendations
after insert or update of state, selections on public.ballot_drafts
for each row execute function private.sync_ballot_recommendations();

alter table public.recommendation_limits enable row level security;
alter table public.ballot_recommendations enable row level security;
alter table public.recommendation_tallies enable row level security;
alter table private.recommendation_policies enable row level security;
alter table private.recommendation_requests enable row level security;

create policy recommendation_limits_read on public.recommendation_limits for select to anon, authenticated
using (exists (select 1 from public.elections e where e.id = election_id and e.status in ('active', 'closed')));
create policy recommendation_tallies_read on public.recommendation_tallies for select to anon, authenticated
using (exists (select 1 from public.elections e where e.id = election_id and e.status in ('active', 'closed')));
create policy ballot_recommendations_read_own on public.ballot_recommendations for select to authenticated
using (user_id = (select auth.uid()));

revoke all on public.recommendation_limits, public.recommendation_tallies, public.ballot_recommendations from public, anon, authenticated, service_role;
grant select on public.recommendation_limits, public.recommendation_tallies to anon, authenticated;
grant select on public.ballot_recommendations to authenticated;
-- Somente totais públicos; nunca divulga quais usuários receberam indicações.
create view public.candidate_recommendation_metrics with (security_invoker = true) as
select c.election_id, c.id as candidate_id, limits.office, limits.scope,
  limits.indication_limit, coalesce(t.indication_count, 0) as indication_count,
  coalesce(accepted.selection_count, 0) as active_selections
from public.candidates c
join public.recommendation_limits limits on limits.election_id = c.election_id
  and limits.office = case upper(replace(c.office, ' ', '_'))
    when 'SENADORES' then 'SENADOR' else upper(replace(c.office, ' ', '_')) end
  and limits.scope = case when upper(c.office) = 'PRESIDENTE' then 'BR' else c.state end
left join public.recommendation_tallies t on t.election_id = c.election_id and t.candidate_id = c.id
left join lateral (
  select sum(s.selection_count) as selection_count from public.selection_tallies s
  where s.election_id = c.election_id and s.candidate_id = c.id
    and (limits.scope = 'BR' or s.state = limits.scope)
) accepted on true;
revoke all on public.candidate_recommendation_metrics from public, anon, authenticated;
grant select on public.candidate_recommendation_metrics to anon, authenticated, service_role;
grant select on public.ballot_recommendations, public.recommendation_tallies to service_role;
grant all on public.recommendation_limits, private.recommendation_policies to service_role;
revoke all on private.recommendation_requests from public, anon, authenticated, service_role;
revoke all on function private.recommendation_office(text),
  private.rank_recommendation_candidates(text, text, text, text[], text),
  private.lock_recommendation_election(), private.count_recommendation(),
  private.allocate_ballot_recommendations(text, uuid, text, jsonb),
  private.sync_ballot_recommendations() from public, anon, authenticated;

-- Histórico anterior não tem horário por clique: usa a última gravação disponível
-- e user_id como desempate. Não apaga/modifica nenhuma seleção existente.
do $$
declare draft record;
begin
  for draft in select * from public.ballot_drafts order by updated_at, created_at, user_id loop
    perform private.allocate_ballot_recommendations(draft.election_id, draft.user_id, draft.state, draft.selections);
  end loop;
end;
$$;

comment on table public.ballot_recommendations is 'Indicações reservadas por usuário, não votos eleitorais. Somente gatilhos escrevem.';
comment on table public.recommendation_limits is 'Limites de indicações fornecidos pelo responsável; não garantem eleição.';
