-- Links públicos reutilizáveis. Apenas publicação explícita expõe a seleção;
-- abrir/ler um link nunca escreve rascunhos, seleções ou indicações.
create table private.shared_selections (
  id uuid primary key default gen_random_uuid(),
  election_id text not null references public.elections(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  state text not null,
  candidate_ids text[] not null check (cardinality(candidate_ids) between 1 and 500),
  revision integer not null default 1 check (revision > 0),
  active boolean not null default true,
  published_at timestamptz not null default clock_timestamp(),
  unique (election_id, owner_id)
);
alter table private.shared_selections enable row level security;
revoke all on private.shared_selections from public, anon, authenticated, service_role;

-- A ação existente de excluir dados eleitorais também retira a publicação.
create function private.remove_deleted_draft_publication()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  delete from private.shared_selections where election_id = old.election_id and owner_id = old.user_id;
  return old;
end;
$$;
revoke all on function private.remove_deleted_draft_publication() from public, anon, authenticated;
create trigger ballot_drafts_remove_publication after delete on public.ballot_drafts
for each row execute function private.remove_deleted_draft_publication();

create function public.my_shared_selection(p_election text)
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object('id', id, 'state', state, 'revision', revision,
    'active', active, 'published_at', published_at, 'count', cardinality(candidate_ids))
  from private.shared_selections where election_id = p_election and owner_id = auth.uid();
$$;

create function public.publish_shared_selection(p_election text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  principal uuid := auth.uid();
  draft public.ballot_drafts%rowtype;
  ids text[];
begin
  if principal is null then raise exception 'AUTH_REQUIRED'; end if;
  if not exists (select 1 from public.elections where id = p_election and status = 'active') then
    raise exception 'ELECTION_UNAVAILABLE';
  end if;
  perform pg_advisory_xact_lock(hashtextextended('shared-selection:' || p_election || principal::text, 0));
  select * into draft from public.ballot_drafts where election_id = p_election and user_id = principal;
  if not found then raise exception 'EMPTY_SELECTION'; end if;
  select array_agg(c.id order by c.id) into ids
  from public.candidates c join private.ballot_candidate_ids(draft.selections) selected on selected.candidate_id = c.id
  where c.election_id = p_election and c.public_visible
    and private.recommendation_office(c.office) in ('PRESIDENTE','SENADOR','DEPUTADO_FEDERAL')
    and (private.recommendation_office(c.office) = 'PRESIDENTE' or c.state = draft.state);
  if coalesce(cardinality(ids), 0) = 0 then raise exception 'EMPTY_SELECTION'; end if;
  if cardinality(ids) > 500 then raise exception 'TOO_MANY_SELECTIONS'; end if;
  insert into private.shared_selections (election_id, owner_id, state, candidate_ids)
    values (p_election, principal, draft.state, ids)
  on conflict (election_id, owner_id) do update set state = excluded.state,
    candidate_ids = excluded.candidate_ids, active = true,
    revision = private.shared_selections.revision + 1, published_at = clock_timestamp();
  return public.my_shared_selection(p_election);
end;
$$;

create function public.disable_shared_selection(p_election text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  update private.shared_selections set active = false, revision = revision + 1
    where election_id = p_election and owner_id = auth.uid() and active;
end;
$$;

create function public.read_shared_selection(p_id uuid)
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'id', s.id, 'election_id', s.election_id, 'state', s.state,
    'revision', s.revision, 'published_at', s.published_at,
    'published_count', cardinality(s.candidate_ids),
    'candidates', coalesce((select jsonb_agg(jsonb_build_object(
      'id', c.id, 'nome', c.name, 'cargo', c.office, 'estado', c.state,
      'numero', c.number, 'partido', coalesce(p.acronym, p.name, ''),
      'nota_candidato', c.scores->'candidate', 'nota_partido', p.score
    ) order by c.office, c.name, c.id)
    from public.candidates c left join public.parties p on p.id = c.party_id
    where c.id = any(s.candidate_ids) and c.election_id = s.election_id and c.public_visible
      and (private.recommendation_office(c.office) = 'PRESIDENTE' or c.state = s.state)
    ), '[]'::jsonb)
  ) from private.shared_selections s join public.elections e on e.id = s.election_id
  where s.id = p_id and s.active and e.status = 'active';
$$;

-- Importação usa revisão + versão do rascunho para não sobrescrever silenciosamente
-- mudanças feitas pelo autor ou pelo destinatário em outra aba/dispositivo.
create function public.import_shared_selection(
  p_id uuid, p_revision integer, p_state text, p_candidate_ids text[],
  p_expected_updated_at timestamptz default null
)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  principal uuid := auth.uid();
  shared private.shared_selections%rowtype;
  current_draft public.ballot_drafts%rowtype;
  saved public.ballot_drafts%rowtype;
  ids text[];
  groups jsonb;
  choices jsonb;
begin
  if principal is null then raise exception 'AUTH_REQUIRED'; end if;
  select * into shared from private.shared_selections where id = p_id and active for share;
  if not found then raise exception 'SHARE_UNAVAILABLE'; end if;
  if shared.revision <> p_revision then raise exception 'SHARE_CHANGED'; end if;
  if not exists (select 1 from public.elections where id = shared.election_id and status = 'active') then
    raise exception 'ELECTION_UNAVAILABLE';
  end if;
  if not exists (select 1 from public.recommendation_limits
    where election_id = shared.election_id and office = 'SENADOR' and scope = p_state) then
    raise exception 'INVALID_STATE';
  end if;
  if coalesce(cardinality(p_candidate_ids), 0) not between 1 and 500 then raise exception 'EMPTY_SELECTION'; end if;
  if not (p_candidate_ids <@ shared.candidate_ids) or array_position(p_candidate_ids, null) is not null then
    raise exception 'INVALID_CANDIDATE';
  end if;
  select array_agg(distinct c.id) into ids from public.candidates c
    where c.id = any(p_candidate_ids) and c.public_visible and c.election_id = shared.election_id
      and (private.recommendation_office(c.office) = 'PRESIDENTE' or c.state = p_state)
      and private.recommendation_office(c.office) in ('PRESIDENTE','SENADOR','DEPUTADO_FEDERAL');
  if coalesce(cardinality(ids), 0) <> (select count(distinct id) from unnest(p_candidate_ids) id) then
    raise exception 'CANDIDATES_CHANGED';
  end if;
  perform pg_advisory_xact_lock(hashtextextended('recommendations:' || shared.election_id, 0));
  select * into current_draft from public.ballot_drafts
    where election_id = shared.election_id and user_id = principal for update;
  if current_draft.updated_at is distinct from p_expected_updated_at then raise exception 'DRAFT_CHANGED'; end if;

  select jsonb_build_object(
    'presidente', coalesce(jsonb_agg(snapshot) filter (where office_key = 'PRESIDENTE'), '[]'),
    'senadores_1', coalesce(jsonb_agg(snapshot) filter (where office_key = 'SENADOR'), '[]'),
    'senadores_2', '[]'::jsonb,
    'deputado_federal', coalesce(jsonb_agg(snapshot) filter (where office_key = 'DEPUTADO_FEDERAL'), '[]')
  ) into groups from (
    select private.recommendation_office(c.office) as office_key,
      jsonb_build_object('id', c.id, 'nome', c.name, 'cargo', c.office, 'estado', c.state,
        'numero', c.number, 'partido', coalesce(p.acronym, p.name, ''),
        'nota_candidato', c.scores->'candidate', 'nota_partido', p.score) as snapshot
    from public.candidates c left join public.parties p on p.id = c.party_id
    where c.id = any(ids) order by c.id
  ) candidates;
  choices := jsonb_build_object('presidente', groups->'presidente',
    'senadores', groups->'senadores_1', 'deputado_federal', groups->'deputado_federal');
  insert into public.ballot_drafts (election_id, user_id, state, schema_version, selections, completed_steps)
    values (shared.election_id, principal, p_state, 1,
      jsonb_build_object('candidate_groups', groups, 'selections', choices), array_remove(array[
        case when jsonb_array_length(groups->'presidente') >= 1 then 'presidente' end,
        case when jsonb_array_length(groups->'senadores_1') >= 1 then 'senadores_1' end,
        case when jsonb_array_length(groups->'senadores_1') >= 2 then 'senadores_2' end,
        case when jsonb_array_length(groups->'deputado_federal') >= 1 then 'deputado_federal' end
      ], null))
  on conflict (election_id, user_id) do update set state = excluded.state,
    selections = excluded.selections, completed_steps = excluded.completed_steps
  returning * into saved;
  return to_jsonb(saved);
end;
$$;

revoke all on function public.my_shared_selection(text), public.publish_shared_selection(text),
  public.disable_shared_selection(text), public.read_shared_selection(uuid),
  public.import_shared_selection(uuid, integer, text, text[], timestamptz) from public, anon, authenticated;
grant execute on function public.read_shared_selection(uuid) to anon, authenticated;
grant execute on function public.my_shared_selection(text), public.publish_shared_selection(text),
  public.disable_shared_selection(text), public.import_shared_selection(uuid, integer, text, text[], timestamptz)
  to authenticated;

comment on table private.shared_selections is 'Publicação opt-in por link não enumerável, sem identidade pública do autor. Cópias importadas são independentes.';
