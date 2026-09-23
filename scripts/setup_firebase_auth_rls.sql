-- Run this once in the Supabase SQL editor AFTER configuring Firebase as a
-- Third-Party Auth provider (Supabase Dashboard -> Authentication -> Sign In / Providers
-- -> Third Party Auth -> add your Firebase project).
--
-- This links each app "user" row to a Firebase account and enables real,
-- DB-enforced Row Level Security based on the caller's verified Firebase ID token,
-- replacing the "disable row level security" approach used previously.

-- 1. Link app users to their Firebase account -------------------------------------------
alter table "user" add column if not exists firebase_uid text;
create unique index if not exists user_firebase_uid_key on "user" (firebase_uid);
create unique index if not exists user_user_name_key on "user" (user_name);

-- 2. Helper: resolves the calling Firebase user to this app's bigint user id -------------
-- security definer lets this read "user" regardless of its own RLS policies below.
create or replace function current_app_user_id()
returns bigint
language sql
security definer
set search_path = public
stable
as $$
    select id from "user" where firebase_uid = auth.jwt()->>'sub';
$$;

-- 3. user: each account can only see/edit its own profile row ---------------------------
alter table "user" enable row level security;

drop policy if exists "Users can view own profile" on "user";
create policy "Users can view own profile" on "user"
    for select
    using (firebase_uid = auth.jwt()->>'sub');

drop policy if exists "Users can update own profile" on "user";
create policy "Users can update own profile" on "user"
    for update
    using (firebase_uid = auth.jwt()->>'sub')
    with check (firebase_uid = auth.jwt()->>'sub');

-- Allows the signup flow to create its own profile row right after Firebase account creation.
drop policy if exists "Users can create own profile" on "user";
create policy "Users can create own profile" on "user"
    for insert
    with check (firebase_uid = auth.jwt()->>'sub');

-- Lets an existing (pre-Firebase) row self-link to a Firebase account on first login when
-- the emails match - an alternative to scripts/migrate_users_to_firebase.js for linking a
-- single already-created Firebase user to their existing app profile, without needing the
-- Supabase service_role key.
drop policy if exists "Users can claim their legacy profile by email" on "user";
create policy "Users can claim their legacy profile by email" on "user"
    for update
    using (firebase_uid is null and user_email = auth.jwt()->>'email')
    with check (firebase_uid = auth.jwt()->>'sub');

-- 4. activity, recurring_transaction, shopping_list_item: owned by user_id --------------
alter table activity enable row level security;
drop policy if exists "Users manage their own activity" on activity;
create policy "Users manage their own activity" on activity
    for all
    using (user_id = current_app_user_id())
    with check (user_id = current_app_user_id());

alter table recurring_transaction enable row level security;
drop policy if exists "Users manage their own recurring transactions" on recurring_transaction;
create policy "Users manage their own recurring transactions" on recurring_transaction
    for all
    using (user_id = current_app_user_id())
    with check (user_id = current_app_user_id());

alter table shopping_list_item enable row level security;
drop policy if exists "Users manage their own shopping items" on shopping_list_item;
create policy "Users manage their own shopping items" on shopping_list_item
    for all
    using (user_id = current_app_user_id())
    with check (user_id = current_app_user_id());

-- 5. payment_method: owned by belong_to ---------------------------------------------------
alter table payment_method enable row level security;
drop policy if exists "Users manage their own payment methods" on payment_method;
create policy "Users manage their own payment methods" on payment_method
    for all
    using (belong_to = current_app_user_id())
    with check (belong_to = current_app_user_id());

-- 6. category: shared list across all signed-in users (no per-user ownership column) -----
alter table category enable row level security;
drop policy if exists "Signed-in users manage shared categories" on category;
create policy "Signed-in users manage shared categories" on category
    for all
    using (auth.jwt()->>'sub' is not null)
    with check (auth.jwt()->>'sub' is not null);
