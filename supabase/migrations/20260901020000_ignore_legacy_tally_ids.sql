-- Rascunhos criados durante a transicao do Firebase podem conter IDs que nao
-- existem na tabela atual de candidatos. Eles continuam legiveis no rascunho,
-- mas nao devem impedir o salvamento nem entrar nos contadores do Supabase.
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
      selected.candidate_id,
      1,
      timezone('utc', now())
    from private.ballot_candidate_ids(new.selections) as selected
    inner join public.candidates as candidate
      on candidate.id = selected.candidate_id
     and candidate.election_id = new.election_id
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

revoke all on function private.sync_ballot_draft_selection_tallies() from public;
