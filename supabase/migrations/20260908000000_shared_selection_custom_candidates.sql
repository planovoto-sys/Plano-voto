-- A pessoa que recebeu o link pode manter os nomes publicados e também
-- acrescentar outros candidatos públicos elegíveis antes de importar a cópia.
create or replace function public.import_shared_selection(
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
  if array_position(p_candidate_ids, null) is not null then raise exception 'INVALID_CANDIDATE'; end if;

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

revoke all on function public.import_shared_selection(uuid, integer, text, text[], timestamptz)
  from public, anon, authenticated;
grant execute on function public.import_shared_selection(uuid, integer, text, text[], timestamptz)
  to authenticated;

comment on function public.import_shared_selection(uuid, integer, text, text[], timestamptz) is
  'Importa uma cópia revisada de uma seleção compartilhada e permite acrescentar candidatos públicos elegíveis.';
