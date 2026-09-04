create table if not exists public.todos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  completed boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.todos enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'todos'
      and policyname = 'Users can manage their own todos'
  ) then
    create policy "Users can manage their own todos"
      on public.todos
      for all
      using (auth.uid() = user_id)
      with check (auth.uid() = user_id);
  end if;
end
$$;

insert into storage.buckets (id, name, public)
values ('uploads', 'uploads', false)
on conflict (id) do nothing;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'Authenticated users can manage their uploads'
  ) then
    create policy "Authenticated users can manage their uploads"
      on storage.objects
      for all to authenticated
      using (bucket_id = 'uploads' and owner_id = auth.uid())
      with check (bucket_id = 'uploads' and owner_id = auth.uid());
  end if;
end
$$;
