create table public.school_workspaces (
  user_id uuid primary key references auth.users(id) on delete cascade,
  data jsonb not null check (data ?& array['version', 'profile', 'saved'] and jsonb_typeof(data) = 'object' and data->>'version' = '1' and jsonb_typeof(data->'profile') = 'object' and jsonb_typeof(data->'saved') = 'array'),
  revision bigint not null check (revision > 0 and revision < 9007199254740991),
  updated_at timestamptz not null default now(),
  constraint workspace_size check (octet_length(data::text) <= 10000000 and jsonb_array_length(data->'saved') <= 500)
);

create table public.workspace_history (
  user_id uuid not null references auth.users(id) on delete cascade,
  revision bigint not null check (revision > 0 and revision < 9007199254740991),
  data jsonb not null check (octet_length(data::text) <= 10000000),
  saved_at timestamptz not null,
  primary key (user_id, revision)
);

alter table public.school_workspaces enable row level security;
alter table public.workspace_history enable row level security;
revoke all on public.school_workspaces, public.workspace_history from anon;
grant select, insert, update, delete on public.school_workspaces to authenticated;
grant select, insert, delete on public.workspace_history to authenticated;

create policy "Read own workspace" on public.school_workspaces for select to authenticated using ((select auth.uid()) = user_id);
create policy "Create own workspace" on public.school_workspaces for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Change own workspace" on public.school_workspaces for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "Delete own workspace" on public.school_workspaces for delete to authenticated using ((select auth.uid()) = user_id);
create policy "Read own history" on public.workspace_history for select to authenticated using ((select auth.uid()) = user_id);
create policy "Create own history" on public.workspace_history for insert to authenticated with check (
  (select auth.uid()) = user_id and exists (
    select 1 from public.school_workspaces w where w.user_id = workspace_history.user_id and w.revision = workspace_history.revision and w.data = workspace_history.data
  )
);
create policy "Delete own history" on public.workspace_history for delete to authenticated using ((select auth.uid()) = user_id);

create function public.save_school_workspace(p_workspace jsonb, p_revision bigint)
returns public.school_workspaces
language plpgsql
security invoker
set search_path = ''
as $$
declare
  previous public.school_workspaces;
  saved public.school_workspaces;
begin
  if auth.uid() is null then
    raise insufficient_privilege using message = 'Sign in to save the workspace.';
  end if;
  if p_revision = 0 then
    insert into public.school_workspaces (user_id, data, revision)
    values (auth.uid(), p_workspace, 1)
    on conflict (user_id) do nothing
    returning * into saved;
  else
    select * into previous from public.school_workspaces
    where user_id = auth.uid() and revision = p_revision for update;
    if previous.user_id is not null then
      insert into public.workspace_history (user_id, revision, data, saved_at)
      values (previous.user_id, previous.revision, previous.data, previous.updated_at)
      on conflict (user_id, revision) do nothing;
      update public.school_workspaces
      set data = p_workspace, revision = p_revision + 1, updated_at = now()
      where user_id = auth.uid() and revision = p_revision returning * into saved;
      delete from public.workspace_history
      where user_id = auth.uid() and revision not in (
        select revision from public.workspace_history where user_id = auth.uid() order by revision desc limit 10
      );
    end if;
  end if;
  if saved.user_id is null then
    raise sqlstate '40001' using message = 'Another device saves a newer workspace.';
  end if;
  return saved;
end;
$$;

revoke all on function public.save_school_workspace(jsonb, bigint) from public, anon;
grant execute on function public.save_school_workspace(jsonb, bigint) to authenticated;
