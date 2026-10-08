-- =====================================================================
-- Gold Rush: the Hall of Fame tables, for Supabase.
-- Paste all of this into Supabase's SQL Editor and click Run. It's safe to run again later
-- (for example after changing the blocklist): it only adds what's missing and refreshes the rest.
--
-- Two tables with the same columns:
--   hall_of_fame       the real list everyone sees
--   hall_of_fame_test  a practice list, used when the game is opened with ?cheats
--                      (same rules, but without the minimum time and gold, so you can test with the L cheat)
--
-- What players can do with the public (publishable) browser key: ADD entries and READ them.
-- Nobody can edit or delete entries with that key. You can still delete rows yourself in the
-- Supabase dashboard (Table Editor), which uses your own login.
-- =====================================================================


-- ---------- Rude or offensive initials: entries with these are refused ----------
-- (The game has the same list, so players get a friendly message before anything is sent.
--  To add more, put them in this list and in BLOCKED_INITIALS in index.html, then run this file again.)
create or replace function public.hof_blocked(initials text)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select upper(initials) = any (array[
    'ASS', 'AZZ', 'CUM', 'CUN', 'CNT', 'COC', 'COK', 'DIC', 'DIK', 'DCK',
    'FAG', 'FCK', 'FKN', 'FKU', 'FUC', 'FUK', 'FUQ', 'FUX', 'HOE', 'JIZ',
    'KKK', 'KUM', 'NGA', 'NGG', 'NGR', 'NIG', 'PIS', 'SEX', 'SHT', 'SLT',
    'TIT', 'TWT', 'VAG', 'WTF', 'XXX'
  ]);
$$;


-- ---------- The real Hall of Fame ----------
create table if not exists public.hall_of_fame (
  id             bigint generated always as identity primary key,
  game_id        uuid        not null unique,         -- a random id per game, so one game can only be entered once
  initials       text        not null,
  created_at     timestamptz not null default now(),  -- the date: filled in by the server, so it can't be faked
  time_played    integer     not null,                -- seconds
  gold_earned    integer     not null,                -- dollars
  biggest_nugget integer     not null,                -- dollars
  nuggets_found  smallint    not null,                -- hidden nuggets found, out of 14

  -- Exactly 3 capital letters, and not on the blocklist
  constraint hof_initials_check check (initials ~ '^[A-Z]{3}$' and not public.hof_blocked(initials)),
  -- Believable numbers for a finished game:
  --   time: at least 1 hour (even fully upgraded from the start, washing all 19,000 t takes about 79 minutes),
  --         at most a year
  constraint hof_time_check check (time_played between 3600 and 31536000),
  --   gold: at least $10,000 (finishing early means you bought the $12,000 excavator), at most $600,000
  --         (all the gold in the pile is worth about $380,000, plus the hidden nuggets)
  constraint hof_gold_check check (gold_earned between 10000 and 600000),
  --   the biggest possible nugget is a 900 g jackpot = $3,600
  constraint hof_nugget_check check (biggest_nugget between 0 and 3600),
  --   there are 14 hidden nuggets
  constraint hof_hidden_check check (nuggets_found between 0 and 14)
);

create index if not exists hall_of_fame_fastest on public.hall_of_fame (time_played);
create index if not exists hall_of_fame_richest on public.hall_of_fame (gold_earned desc);


-- ---------- The practice list (for testing with ?cheats) ----------
-- A copy of the table above with all its rules, then the minimum time and gold are relaxed.
create table if not exists public.hall_of_fame_test (like public.hall_of_fame including all);
alter table public.hall_of_fame_test drop constraint if exists hof_time_check;
alter table public.hall_of_fame_test drop constraint if exists hof_gold_check;
alter table public.hall_of_fame_test drop constraint if exists hof_test_numbers_check;
alter table public.hall_of_fame_test add constraint hof_test_numbers_check
  check (time_played between 0 and 31536000 and gold_earned between 0 and 600000);


-- ---------- Spam guard: at most 30 new entries a minute in each table ----------
create or replace function public.hof_rate_limit()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  recent integer;
begin
  execute format('select count(*) from %I.%I where created_at > now() - interval ''1 minute''',
                 tg_table_schema, tg_table_name)
    into recent;
  if recent >= 30 then
    raise exception 'Too many Hall of Fame entries right now. Please try again in a minute.';
  end if;
  return new;
end;
$$;

drop trigger if exists hof_rate_limit on public.hall_of_fame;
create trigger hof_rate_limit before insert on public.hall_of_fame
  for each row execute function public.hof_rate_limit();

drop trigger if exists hof_rate_limit on public.hall_of_fame_test;
create trigger hof_rate_limit before insert on public.hall_of_fame_test
  for each row execute function public.hof_rate_limit();


-- ---------- Who can do what ----------
-- "anon" is anyone using the public browser key. "authenticated" is a logged-in user (the game has none,
-- but they get the same rules). Supabase gives both full access to new tables by default, so take it all
-- away first, then give back only reading, and adding the game's own columns (not id or created_at).
revoke all on public.hall_of_fame, public.hall_of_fame_test from anon, authenticated;
grant select on public.hall_of_fame, public.hall_of_fame_test to anon, authenticated;
grant insert (game_id, initials, time_played, gold_earned, biggest_nugget, nuggets_found)
  on public.hall_of_fame, public.hall_of_fame_test to anon, authenticated;

-- Row Level Security: the database's own gatekeeper. With it on, only the policies below are allowed.
-- There are no update or delete policies, so editing and deleting are refused.
alter table public.hall_of_fame enable row level security;
alter table public.hall_of_fame_test enable row level security;

drop policy if exists "Anyone can read the Hall of Fame" on public.hall_of_fame;
create policy "Anyone can read the Hall of Fame" on public.hall_of_fame
  for select to anon, authenticated using (true);
drop policy if exists "Anyone can add to the Hall of Fame" on public.hall_of_fame;
create policy "Anyone can add to the Hall of Fame" on public.hall_of_fame
  for insert to anon, authenticated with check (true);

drop policy if exists "Anyone can read the practice list" on public.hall_of_fame_test;
create policy "Anyone can read the practice list" on public.hall_of_fame_test
  for select to anon, authenticated using (true);
drop policy if exists "Anyone can add to the practice list" on public.hall_of_fame_test;
create policy "Anyone can add to the practice list" on public.hall_of_fame_test
  for insert to anon, authenticated with check (true);
