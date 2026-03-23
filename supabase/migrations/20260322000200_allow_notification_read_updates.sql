create policy "Users can update their own notifications"
on public.notifications for update
using ((select public.clerk_user_id()) = user_id)
with check ((select public.clerk_user_id()) = user_id);
