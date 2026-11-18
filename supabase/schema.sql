-- Erfolgsjournal: eine Tabelle, jede Zeile gehört genau einem Nutzer.
-- In Supabase: SQL Editor → New query → alles einfügen → Run.

create table if not exists public.journal (
  user_id    uuid not null default auth.uid() references auth.users on delete cascade,
  key        text not null,              -- "meta" oder "d-JJJJ-MM-TT"
  data       jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, key)
);

alter table public.journal enable row level security;

create policy "eigene Daten lesen"   on public.journal for select using (auth.uid() = user_id);
create policy "eigene Daten anlegen" on public.journal for insert with check (auth.uid() = user_id);
create policy "eigene Daten ändern"  on public.journal for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "eigene Daten löschen" on public.journal for delete using (auth.uid() = user_id);
