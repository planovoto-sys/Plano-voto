-- Infraestrutura inicial do Plano no Supabase.
-- Escritas sensiveis continuam reservadas ao backend com service_role.

create extension if not exists pgcrypto with schema extensions;

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create or replace function private.is_admin()
returns boolean
language sql
stable
set search_path = ''
as $$
  select coalesce(
    (select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin',
    false
  );
$$;

revoke all on function private.is_admin() from public;
grant usage on schema private to authenticated, service_role;
grant execute on function private.is_admin() to authenticated;

create or replace function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

revoke all on function private.set_updated_at() from public, anon, authenticated;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  avatar_url text,
  instagram text,
  state text check (state is null or state ~ '^[A-Z]{2}$'),
  role text not null default 'user' check (role in ('user', 'admin')),
  privacy_preferences jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.elections (
  id text primary key,
  name text not null,
  status text not null default 'draft' check (status in ('draft', 'active', 'closed')),
  starts_at timestamptz,
  ends_at timestamptz,
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  check (ends_at is null or starts_at is null or ends_at > starts_at)
);

create table public.parties (
  id text primary key,
  acronym text,
  name text not null,
  score numeric,
  public_visible boolean not null default true,
  legacy_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.candidates (
  id text primary key,
  election_id text not null references public.elections(id) on delete cascade,
  name text not null,
  office text not null,
  state text check (state is null or state ~ '^[A-Z]{2}$'),
  party_id text references public.parties(id) on delete set null,
  number integer check (number is null or number > 0),
  slug text,
  image_url text,
  scores jsonb not null default '{}'::jsonb,
  public_visible boolean not null default true,
  legacy_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index candidates_election_office_state_idx
  on public.candidates (election_id, office, state);
create index candidates_party_idx on public.candidates (party_id);
create index candidates_number_scope_idx
  on public.candidates (election_id, office, coalesce(state, ''), number)
  where number is not null;

create table public.ballot_drafts (
  election_id text not null references public.elections(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  state text not null check (state ~ '^[A-Z]{2}$'),
  schema_version integer not null default 1 check (schema_version > 0),
  selections jsonb not null default '{}'::jsonb,
  completed_steps text[] not null default '{}'::text[],
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  primary key (election_id, user_id)
);

create table public.votes (
  id uuid primary key default gen_random_uuid(),
  election_id text not null references public.elections(id) on delete restrict,
  schema_version integer not null default 1 check (schema_version > 0),
  encrypted_ballot jsonb not null,
  receipt_code text not null unique,
  source text not null default 'supabase-backend',
  submitted_at timestamptz not null default timezone('utc', now())
);

create index votes_election_submitted_idx
  on public.votes (election_id, submitted_at desc);

create table public.eligibility (
  election_id text not null references public.elections(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending'
    check (status in ('pending', 'eligible', 'ineligible', 'blocked')),
  has_voted boolean not null default false,
  vote_id uuid unique references public.votes(id) on delete set null,
  receipt_code text,
  voted_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  primary key (election_id, user_id),
  check ((not has_voted) or (vote_id is not null and voted_at is not null))
);

create table public.selection_tallies (
  election_id text not null references public.elections(id) on delete cascade,
  state text not null check (state ~ '^[A-Z]{2}$'),
  candidate_id text not null references public.candidates(id) on delete cascade,
  selection_count bigint not null default 0 check (selection_count >= 0),
  updated_at timestamptz not null default timezone('utc', now()),
  primary key (election_id, state, candidate_id)
);

create table public.state_choice_metrics (
  election_id text not null references public.elections(id) on delete cascade,
  state text not null check (state ~ '^[A-Z]{2}$'),
  user_count bigint not null default 0 check (user_count >= 0),
  updated_at timestamptz not null default timezone('utc', now()),
  primary key (election_id, state)
);

create table public.candidate_tallies (
  election_id text not null references public.elections(id) on delete cascade,
  candidate_id text not null references public.candidates(id) on delete cascade,
  vote_count bigint not null default 0 check (vote_count >= 0),
  updated_at timestamptz not null default timezone('utc', now()),
  primary key (election_id, candidate_id)
);

create table public.plan_handoff_tokens (
  election_id text not null references public.elections(id) on delete cascade,
  token_hash text not null,
  schema_version integer not null default 1 check (schema_version > 0),
  draft jsonb not null,
  expires_at timestamptz not null,
  used_at timestamptz,
  redeemed_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  primary key (election_id, token_hash)
);

create index plan_handoff_tokens_expiry_idx
  on public.plan_handoff_tokens (expires_at)
  where used_at is null;

create table public.audit_events (
  id bigint generated by default as identity primary key,
  election_id text references public.elections(id) on delete set null,
  event_type text not null,
  metadata jsonb not null default '{}'::jsonb,
  source text not null default 'supabase-backend',
  created_at timestamptz not null default timezone('utc', now())
);

create index audit_events_election_created_idx
  on public.audit_events (election_id, created_at desc);

create table private.rate_limits (
  principal_hash text not null,
  action text not null,
  window_started_at timestamptz not null,
  request_count integer not null default 0 check (request_count >= 0),
  expires_at timestamptz not null,
  primary key (principal_hash, action)
);

create index rate_limits_expiry_idx on private.rate_limits (expires_at);
alter table private.rate_limits enable row level security;

create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'),
    coalesce(new.raw_user_meta_data ->> 'avatar_url', new.raw_user_meta_data ->> 'picture')
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

revoke all on function private.handle_new_user() from public, anon, authenticated;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_user();

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function private.set_updated_at();
create trigger elections_set_updated_at
  before update on public.elections
  for each row execute function private.set_updated_at();
create trigger parties_set_updated_at
  before update on public.parties
  for each row execute function private.set_updated_at();
create trigger candidates_set_updated_at
  before update on public.candidates
  for each row execute function private.set_updated_at();
create trigger ballot_drafts_set_updated_at
  before update on public.ballot_drafts
  for each row execute function private.set_updated_at();
create trigger eligibility_set_updated_at
  before update on public.eligibility
  for each row execute function private.set_updated_at();

alter table public.profiles enable row level security;
alter table public.elections enable row level security;
alter table public.parties enable row level security;
alter table public.candidates enable row level security;
alter table public.ballot_drafts enable row level security;
alter table public.votes enable row level security;
alter table public.eligibility enable row level security;
alter table public.selection_tallies enable row level security;
alter table public.state_choice_metrics enable row level security;
alter table public.candidate_tallies enable row level security;
alter table public.plan_handoff_tokens enable row level security;
alter table public.audit_events enable row level security;

create policy profiles_select_own_or_admin
  on public.profiles for select to authenticated
  using ((select auth.uid()) = id or (select private.is_admin()));
create policy profiles_update_own_or_admin
  on public.profiles for update to authenticated
  using ((select auth.uid()) = id or (select private.is_admin()))
  with check ((select auth.uid()) = id or (select private.is_admin()));
create policy profiles_admin_all
  on public.profiles for all to authenticated
  using ((select private.is_admin()))
  with check ((select private.is_admin()));

create policy elections_public_select
  on public.elections for select to anon, authenticated
  using (status in ('active', 'closed'));
create policy elections_admin_all
  on public.elections for all to authenticated
  using ((select private.is_admin()))
  with check ((select private.is_admin()));

create policy parties_public_select
  on public.parties for select to anon, authenticated
  using (public_visible);
create policy parties_admin_all
  on public.parties for all to authenticated
  using ((select private.is_admin()))
  with check ((select private.is_admin()));

create policy candidates_public_select
  on public.candidates for select to anon, authenticated
  using (
    public_visible and exists (
      select 1 from public.elections
      where elections.id = candidates.election_id
        and elections.status in ('active', 'closed')
    )
  );
create policy candidates_admin_all
  on public.candidates for all to authenticated
  using ((select private.is_admin()))
  with check ((select private.is_admin()));

create policy ballot_drafts_select_own_or_admin
  on public.ballot_drafts for select to authenticated
  using ((select auth.uid()) = user_id or (select private.is_admin()));
create policy ballot_drafts_insert_own_or_admin
  on public.ballot_drafts for insert to authenticated
  with check ((select auth.uid()) = user_id or (select private.is_admin()));
create policy ballot_drafts_update_own_or_admin
  on public.ballot_drafts for update to authenticated
  using ((select auth.uid()) = user_id or (select private.is_admin()))
  with check ((select auth.uid()) = user_id or (select private.is_admin()));
create policy ballot_drafts_delete_own_or_admin
  on public.ballot_drafts for delete to authenticated
  using ((select auth.uid()) = user_id or (select private.is_admin()));

create policy votes_admin_all
  on public.votes for all to authenticated
  using ((select private.is_admin()))
  with check ((select private.is_admin()));

create policy eligibility_select_own_or_admin
  on public.eligibility for select to authenticated
  using ((select auth.uid()) = user_id or (select private.is_admin()));

create policy selection_tallies_public_select
  on public.selection_tallies for select to anon, authenticated
  using (
    exists (
      select 1 from public.elections
      where elections.id = selection_tallies.election_id
        and elections.status in ('active', 'closed')
    )
  );
create policy selection_tallies_admin_all
  on public.selection_tallies for all to authenticated
  using ((select private.is_admin()))
  with check ((select private.is_admin()));

create policy state_choice_metrics_public_select
  on public.state_choice_metrics for select to anon, authenticated
  using (
    exists (
      select 1 from public.elections
      where elections.id = state_choice_metrics.election_id
        and elections.status in ('active', 'closed')
    )
  );
create policy state_choice_metrics_admin_all
  on public.state_choice_metrics for all to authenticated
  using ((select private.is_admin()))
  with check ((select private.is_admin()));

create policy candidate_tallies_public_select
  on public.candidate_tallies for select to anon, authenticated
  using (
    exists (
      select 1 from public.elections
      where elections.id = candidate_tallies.election_id
        and elections.status in ('active', 'closed')
    )
  );
create policy candidate_tallies_admin_all
  on public.candidate_tallies for all to authenticated
  using ((select private.is_admin()))
  with check ((select private.is_admin()));

create policy audit_events_admin_select
  on public.audit_events for select to authenticated
  using ((select private.is_admin()));

revoke all on all tables in schema public from anon, authenticated;
grant select on public.elections, public.parties, public.candidates,
  public.selection_tallies, public.state_choice_metrics, public.candidate_tallies
  to anon;
grant select on public.profiles to authenticated;
grant update (state, instagram, privacy_preferences) on public.profiles to authenticated;
grant all on public.elections, public.parties, public.candidates,
  public.votes, public.selection_tallies, public.state_choice_metrics,
  public.candidate_tallies to authenticated;
grant select, insert, update, delete on public.ballot_drafts to authenticated;
grant select on public.eligibility, public.audit_events to authenticated;

grant all on all tables in schema public to service_role;
grant all on all sequences in schema public to service_role;
grant all on table private.rate_limits to service_role;

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.profiles;
    alter publication supabase_realtime add table public.ballot_drafts;
    alter publication supabase_realtime add table public.eligibility;
    alter publication supabase_realtime add table public.selection_tallies;
    alter publication supabase_realtime add table public.state_choice_metrics;
    alter publication supabase_realtime add table public.candidate_tallies;
  end if;
exception
  when duplicate_object then null;
end;
$$;

comment on schema private is 'Objetos internos acessiveis somente pelo backend.';
comment on table public.ballot_drafts is 'Rascunho privado; clientes autenticados leem apenas o proprio registro.';
comment on table public.votes is 'Votos criptografados; sem identificador direto do usuario.';
comment on table public.plan_handoff_tokens is 'Tokens de handoff armazenados apenas como hash e inacessiveis ao cliente.';
