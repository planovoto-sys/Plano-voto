-- Mantém os contadores usados no cálculo interno de seleção atualizados sem
-- expor essa métrica na interface.
create or replace function private.ballot_candidate_ids(draft_payload jsonb)
returns table (candidate_id text)
language sql
immutable
set search_path = ''
as $$
  with candidate_groups as (
    select value
    from jsonb_each(coalesce(draft_payload->'candidate_groups', '{}'::jsonb))
    union all
    select value
    from jsonb_each(coalesce(draft_payload->'selections', '{}'::jsonb))
  ), candidate_values as (
    select candidate
    from candidate_groups
    cross join lateral jsonb_array_elements(
      case when jsonb_typeof(value) = 'array' then value else '[]'::jsonb end
    ) as candidate
  )
  select distinct nullif(
    case
      when jsonb_typeof(candidate) = 'object' then candidate->>'id'
      when jsonb_typeof(candidate) = 'string' then candidate #>> '{}'
      else null
    end,
    ''
  ) as candidate_id
  from candidate_values
  where case
    when jsonb_typeof(candidate) = 'object' then candidate->>'id'
    when jsonb_typeof(candidate) = 'string' then candidate #>> '{}'
    else null
  end is not null;
$$;

create or replace function private.sync_ballot_draft_selection_tallies()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op in ('UPDATE', 'DELETE') then
    update public.selection_tallies as tally
    set selection_count = greatest(tally.selection_count - 1, 0),
        updated_at = timezone('utc', now())
    where tally.election_id = old.election_id
      and tally.state = old.state
      and tally.candidate_id in (
        select candidate_id
        from private.ballot_candidate_ids(old.selections)
      );
  end if;

  if tg_op in ('INSERT', 'UPDATE') then
    insert into public.selection_tallies (
      election_id,
      state,
      candidate_id,
      selection_count,
      updated_at
    )
    select
      new.election_id,
      new.state,
      candidate_id,
      1,
      timezone('utc', now())
    from private.ballot_candidate_ids(new.selections)
    on conflict (election_id, state, candidate_id) do update
    set selection_count = public.selection_tallies.selection_count + 1,
        updated_at = excluded.updated_at;
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;

  return new;
end;
$$;

drop trigger if exists ballot_drafts_sync_selection_tallies on public.ballot_drafts;
create trigger ballot_drafts_sync_selection_tallies
after insert or update of state, selections or delete
on public.ballot_drafts
for each row
execute function private.sync_ballot_draft_selection_tallies();

-- Reconcilia rascunhos que já existiam antes da criação do gatilho.
insert into public.selection_tallies (
  election_id,
  state,
  candidate_id,
  selection_count,
  updated_at
)
select
  draft.election_id,
  draft.state,
  selected.candidate_id,
  count(*)::bigint,
  timezone('utc', now())
from public.ballot_drafts as draft
cross join lateral private.ballot_candidate_ids(draft.selections) as selected
group by draft.election_id, draft.state, selected.candidate_id
on conflict (election_id, state, candidate_id) do update
set selection_count = excluded.selection_count,
    updated_at = excluded.updated_at;

revoke all on function private.ballot_candidate_ids(jsonb) from public;
revoke all on function private.sync_ballot_draft_selection_tallies() from public;
