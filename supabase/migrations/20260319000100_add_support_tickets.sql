create table public.support_tickets (
    id uuid primary key default gen_random_uuid(),
    user_id text not null references public.users(id) on delete cascade,
    subject text not null,
    description text not null,
    status text not null default 'open' check (status in ('open', 'in_progress', 'resolved', 'closed')),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

alter table public.support_tickets enable row level security;

create policy "Users can view own support tickets"
on public.support_tickets for select
using ((select public.clerk_user_id()) = user_id);

create policy "Users can create own support tickets"
on public.support_tickets for insert
with check ((select public.clerk_user_id()) = user_id);

create policy "Users can update own support tickets"
on public.support_tickets for update
using ((select public.clerk_user_id()) = user_id)
with check ((select public.clerk_user_id()) = user_id);

create index idx_support_tickets_user_created_at
on public.support_tickets(user_id, created_at desc);

create or replace function public.set_support_ticket_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists on_support_ticket_updated_at on public.support_tickets;

create trigger on_support_ticket_updated_at
before update on public.support_tickets
for each row
execute function public.set_support_ticket_updated_at();
