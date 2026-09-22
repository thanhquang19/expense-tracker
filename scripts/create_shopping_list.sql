-- Run this once in the Supabase SQL editor to enable the shopping list.

create table if not exists shopping_list_item (
    id bigint generated always as identity primary key,
    user_id bigint not null references "user"(id) on delete cascade,
    name text not null,
    quantity numeric not null default 1,
    category text not null check (category in ('grocery', 'large_item')),
    price numeric,
    is_purchased boolean not null default false,
    created_at timestamptz not null default now()
);

-- Column added after the initial release; safe to re-run on an existing table.
alter table shopping_list_item add column if not exists price numeric;

create index if not exists shopping_list_item_user_idx
    on shopping_list_item (user_id, category);

-- Match the other tables (activity, category, payment_method): no RLS, since this
-- app authenticates via a custom `user` table rather than Supabase Auth, and only
-- ever connects with the anon key. Without this, new tables default to RLS-enabled
-- with no policies, which blocks all anon reads/writes.
alter table shopping_list_item disable row level security;
