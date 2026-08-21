-- MTL+QC shared trip data: one flexible table + realtime.
create table if not exists mtlqc_items (
  id uuid primary key default gen_random_uuid(),
  trip_id text not null,
  kind text not null,          -- 'check' | 'vote' | 'note' | 'expense'
  k text not null,             -- item key (checklist id, venue key, or timestamp)
  v jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  unique (trip_id, kind, k)
);
alter table mtlqc_items enable row level security;
-- Trip app uses the public anon key; access is scoped only by knowing the trip_id.
create policy "anon read"  on mtlqc_items for select using (true);
create policy "anon write" on mtlqc_items for insert with check (true);
create policy "anon update" on mtlqc_items for update using (true);
alter publication supabase_realtime add table mtlqc_items;
