-- Run this once in the Supabase SQL editor (after setup_firebase_auth_rls.sql).
--
-- Makes category and payment_method share the same ownership model:
--   - belong_to is null      -> system-wide row, visible to every signed-in user, read-only to them.
--   - belong_to = user.id    -> user-defined row, visible only to that user, fully editable by them.
--
-- category previously had a define_by text column that was an unused placeholder (never populated
-- with real user ids) -> it's dropped and replaced with a proper belong_to bigint FK below.
-- payment_method previously required belong_to (no system rows existed) -> "Cash" becomes the
-- one system-wide default row shared by all users.

-- 1. Drop old unique constraints/indexes on both tables so the new partial ones can be added ----
-- CASCADE also drops any FK constraints referencing them (e.g. activity_category_fkey /
-- activity_payment_method_fkey) - a text-name FK can't work once the same name can legitimately
-- exist as separate rows for different users, so activity/recurring_transaction/shopping_list_item
-- go back to plain denormalized text columns for category/payment_method, same as they already are.
do $$
declare
    r record;
begin
    for r in
        select conname from pg_constraint
        where conrelid = 'category'::regclass and contype = 'u'
    loop
        execute format('alter table category drop constraint %I cascade', r.conname);
    end loop;

    for r in
        select conname from pg_constraint
        where conrelid = 'payment_method'::regclass and contype = 'u'
    loop
        execute format('alter table payment_method drop constraint %I cascade', r.conname);
    end loop;
end $$;

-- Only drop indexes that aren't backing any constraint (primary key indexes are also "unique"
-- in pg_indexes but must be dropped via their constraint, not directly).
do $$
declare
    r record;
begin
    for r in
        select i.indexname
        from pg_indexes i
        join pg_class c on c.relname = i.indexname
        where i.schemaname = 'public' and i.tablename = 'category' and i.indexdef ilike '%unique%'
          and not exists (select 1 from pg_constraint con where con.conindid = c.oid)
    loop
        execute format('drop index if exists %I cascade', r.indexname);
    end loop;

    for r in
        select i.indexname
        from pg_indexes i
        join pg_class c on c.relname = i.indexname
        where i.schemaname = 'public' and i.tablename = 'payment_method' and i.indexdef ilike '%unique%'
          and not exists (select 1 from pg_constraint con where con.conindid = c.oid)
    loop
        execute format('drop index if exists %I cascade', r.indexname);
    end loop;
end $$;

-- 2. category: drop the unused define_by text placeholder column, add a real ownership column --
alter table category drop column if exists defined_by;
alter table category add column if not exists belong_to bigint references "user"(id) on delete cascade;

create unique index if not exists category_system_name_key on category (lower(category)) where belong_to is null;
create unique index if not exists category_user_name_key on category (belong_to, lower(category)) where belong_to is not null;

-- 3. payment_method: allow a null (system) owner for the default "Cash" method ---------------
alter table payment_method alter column belong_to drop not null;

-- Consolidate any existing per-user "Cash" rows into one system-wide row. activity /
-- recurring_transaction reference payment_method by text, so no FK rewrite is needed.
delete from payment_method where lower(payment_method) = 'cash' and belong_to is not null;
insert into payment_method (payment_method, belong_to)
    select 'Cash', null
    where not exists (select 1 from payment_method where lower(payment_method) = 'cash');

create unique index if not exists payment_method_system_name_key on payment_method (lower(payment_method)) where belong_to is null;
create unique index if not exists payment_method_user_name_key on payment_method (belong_to, lower(payment_method)) where belong_to is not null;

-- 4. RLS: everyone can read system rows + their own; only own rows can be written ------------
alter table category enable row level security;
drop policy if exists "Signed-in users manage shared categories" on category;
drop policy if exists "Users view system and own categories" on category;
drop policy if exists "Users insert their own categories" on category;
drop policy if exists "Users update their own categories" on category;
drop policy if exists "Users delete their own categories" on category;

create policy "Users view system and own categories" on category
    for select
    using (belong_to is null or belong_to = current_app_user_id());

create policy "Users insert their own categories" on category
    for insert
    with check (belong_to = current_app_user_id());

create policy "Users update their own categories" on category
    for update
    using (belong_to = current_app_user_id())
    with check (belong_to = current_app_user_id());

create policy "Users delete their own categories" on category
    for delete
    using (belong_to = current_app_user_id());

alter table payment_method enable row level security;
drop policy if exists "Users manage their own payment methods" on payment_method;
drop policy if exists "Users view system and own payment methods" on payment_method;
drop policy if exists "Users insert their own payment methods" on payment_method;
drop policy if exists "Users update their own payment methods" on payment_method;
drop policy if exists "Users delete their own payment methods" on payment_method;

create policy "Users view system and own payment methods" on payment_method
    for select
    using (belong_to is null or belong_to = current_app_user_id());

create policy "Users insert their own payment methods" on payment_method
    for insert
    with check (belong_to = current_app_user_id());

create policy "Users update their own payment methods" on payment_method
    for update
    using (belong_to = current_app_user_id())
    with check (belong_to = current_app_user_id());

create policy "Users delete their own payment methods" on payment_method
    for delete
    using (belong_to = current_app_user_id());
