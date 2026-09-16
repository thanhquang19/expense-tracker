-- Run this once in the Supabase SQL editor to enable recurring transactions.

create table if not exists recurring_transaction (
    id bigint generated always as identity primary key,
    user_id bigint not null references "user"(id) on delete cascade,
    transaction text not null,
    amount numeric not null,
    category text not null,
    transaction_flow text not null check (transaction_flow in ('Inflow', 'Outflow')),
    payment_method text not null,
    frequency text not null check (frequency in ('weekly', 'biweekly', 'monthly', 'yearly')),
    start_date date not null,
    next_run_date date not null,
    end_date date,
    is_active boolean not null default true,
    created_at timestamptz not null default now()
);

create index if not exists recurring_transaction_due_idx
    on recurring_transaction (is_active, next_run_date);

-- Match the other tables (activity, category, payment_method): no RLS, since this
-- app authenticates via a custom `user` table rather than Supabase Auth, and only
-- ever connects with the anon key. Without this, new tables default to RLS-enabled
-- with no policies, which blocks all anon reads/writes.
alter table recurring_transaction disable row level security;

-- Links auto-generated activity rows back to the recurring rule that created them.
alter table activity
    add column if not exists recurring_id bigint references recurring_transaction(id) on delete set null;
