-- REQUIRED FOR REALTIME TO WORK
CREATE POLICY "Users can receive realtime updates for their messages"
ON public.messages FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM public.conversations
        WHERE id = conversations_id
        AND (SELECT public.clerk_user_id()) IN (buyer_id, seller_id)
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.conversations
        WHERE id = conversations_id
        AND (SELECT public.clerk_user_id()) IN (buyer_id, seller_id)
    )
);

CREATE POLICY "Users can receive realtime updates for their conversations"
ON public.conversations FOR UPDATE
USING ((SELECT public.clerk_user_id()) IN (buyer_id, seller_id))
WITH CHECK ((SELECT public.clerk_user_id()) IN (buyer_id, seller_id));
