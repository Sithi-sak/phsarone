create policy "Users can delete their own notifications"
on public.notifications for delete
using ((select public.clerk_user_id()) = user_id);
