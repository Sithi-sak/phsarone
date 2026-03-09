-- Allow trade owners to accept/decline incoming offers, and bidders to cancel their own offers.
DROP POLICY IF EXISTS "Trade owners can update received offers" ON public.trade_offers;
CREATE POLICY "Trade owners can update received offers"
ON public.trade_offers
FOR UPDATE
USING (
  EXISTS (
    SELECT 1
    FROM public.trades t
    WHERE t.id = trade_id
      AND t.owner_id = (SELECT public.clerk_user_id())
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.trades t
    WHERE t.id = trade_id
      AND t.owner_id = (SELECT public.clerk_user_id())
  )
);

DROP POLICY IF EXISTS "Bidders can cancel sent offers" ON public.trade_offers;
CREATE POLICY "Bidders can cancel sent offers"
ON public.trade_offers
FOR UPDATE
USING ((SELECT public.clerk_user_id()) = bidder_id)
WITH CHECK (
  (SELECT public.clerk_user_id()) = bidder_id
  AND status = 'cancelled'
);
