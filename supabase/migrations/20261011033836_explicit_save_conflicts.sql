create or replace function public.save_school_workspace(p_workspace jsonb, p_revision bigint)
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
    raise sqlstate 'PT409' using message = 'Another device saves a newer workspace.';
  end if;
  return saved;
end;
$$;
