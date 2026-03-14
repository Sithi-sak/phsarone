create table public.product_boosts (
    id uuid primary key default gen_random_uuid(),
    product_id uuid not null references public.products(id) on delete cascade,
    user_id text not null references public.users(id) on delete cascade,
    created_at timestamptz not null default now()
);

alter table public.product_boosts enable row level security;

create policy "Users can view own product boosts"
on public.product_boosts for select
using ((select public.clerk_user_id()) = user_id);

create policy "Users can insert own product boosts"
on public.product_boosts for insert
with check ((select public.clerk_user_id()) = user_id);

create index idx_product_boosts_user_created_at
on public.product_boosts(user_id, created_at desc);

create index idx_product_boosts_product_id
on public.product_boosts(product_id);

create or replace function public.monthly_product_boost_limit(plan_type text)
returns integer
language sql
immutable
set search_path = ''
as $$
    select case lower(coalesce(plan_type, 'regular'))
        when 'starter' then 1
        when 'pro' then 5
        when 'business' then 9999
        else 0
    end;
$$;

create or replace function public.boost_product(target_product_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
    actor_id text := public.clerk_user_id();
    target_product public.products%rowtype;
    resolved_plan_type text := 'regular';
    boost_limit integer := 0;
    boosts_used integer := 0;
    boosted_at timestamptz := now();
begin
    if actor_id is null then
        raise exception 'AUTH_REQUIRED';
    end if;

    select *
    into target_product
    from public.products
    where id = target_product_id;

    if not found then
        raise exception 'PRODUCT_NOT_FOUND';
    end if;

    if target_product.seller_id <> actor_id then
        raise exception 'PRODUCT_BOOST_NOT_ALLOWED';
    end if;

    if coalesce(target_product.status, '') <> 'active' then
        raise exception 'PRODUCT_MUST_BE_ACTIVE_TO_BOOST';
    end if;

    select coalesce(
        (
            select s.plan_type
            from public.subscriptions s
            where s.user_id = actor_id
              and (
                s.status in ('active', 'trailing', 'past_due')
                or (s.status = 'canceled' and s.current_period_end > now())
              )
            order by s.current_period_end desc nulls last, s.updated_at desc nulls last
            limit 1
        ),
        (
            select u.user_type
            from public.users u
            where u.id = actor_id
        ),
        'regular'
    )
    into resolved_plan_type;

    boost_limit := public.monthly_product_boost_limit(resolved_plan_type);

    if boost_limit <= 0 then
        raise exception 'PRODUCT_BOOST_REQUIRES_PAID_PLAN';
    end if;

    select count(*)
    into boosts_used
    from public.product_boosts pb
    where pb.user_id = actor_id
      and pb.created_at >= date_trunc('month', boosted_at);

    if boosts_used >= boost_limit then
        raise exception 'PRODUCT_BOOST_LIMIT_REACHED';
    end if;

    insert into public.product_boosts (product_id, user_id, created_at)
    values (target_product_id, actor_id, boosted_at);

    update public.products
    set metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object(
            'last_boosted_at', boosted_at,
            'boost_count', coalesce((metadata ->> 'boost_count')::integer, 0) + 1
        ),
        updated_at = boosted_at
    where id = target_product_id;

    return jsonb_build_object(
        'product_id', target_product_id,
        'plan_type', lower(coalesce(resolved_plan_type, 'regular')),
        'monthly_boost_limit', boost_limit,
        'monthly_boosts_used', boosts_used + 1,
        'monthly_boosts_remaining', greatest(boost_limit - boosts_used - 1, 0),
        'boosted_at', boosted_at
    );
end;
$$;

grant execute on function public.boost_product(uuid) to authenticated;
