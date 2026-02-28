-- Alter messages table: Change content column to jsonb
ALTER TABLE public.messages
ALTER COLUMN content TYPE jsonb USING content::jsonb;

-- Alter conversations table: Add per-user mute columns
ALTER TABLE public.conversations
DROP COLUMN IF EXISTS is_muted,
ADD COLUMN IF NOT EXISTS buyer_muted BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS seller_muted BOOLEAN DEFAULT FALSE;

-- Alter users table: Add last_online_at column
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS last_online_at TIMESTAMPTZ;

-- Create a function to update last_online_at
CREATE OR REPLACE FUNCTION public.handle_user_activity()
RETURNS TRIGGER AS $$
BEGIN
  NEW.last_online_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create a trigger to update last_online_at on user activity
DROP TRIGGER IF EXISTS on_user_activity ON public.users;
CREATE TRIGGER on_user_activity
BEFORE UPDATE ON public.users
FOR EACH ROW
EXECUTE PROCEDURE public.handle_user_activity();

-- Create a function to update conversation on message insert
CREATE OR REPLACE FUNCTION public.update_conversation_on_message_insert()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.conversations
  SET updated_at = NOW()
  WHERE id = NEW.conversations_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create a trigger to update conversation on message insert
DROP TRIGGER IF EXISTS conversation_updated_on_message_insert;
CREATE TRIGGER conversation_updated_on_message_insert
  AFTER INSERT ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION public.update_conversation_on_message_insert();

-- RLS POLICIES FOR CONVERSATIONS --

-- Enable RLS (already enabled in previous migration, but being safe)
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to recreate them cleanly
DROP POLICY IF EXISTS "Users can view their own conversations" ON public.conversations;
DROP POLICY IF EXISTS "Users can start a conversation" ON public.conversations;
DROP POLICY IF EXISTS "Users can update their own conversation settings" ON public.conversations;
DROP POLICY IF EXISTS "Users can delete their own conversations" ON public.conversations;

CREATE POLICY "Users can view their own conversations"
ON public.conversations FOR SELECT
USING ((SELECT public.clerk_user_id()) IN (buyer_id, seller_id));

CREATE POLICY "Users can start a conversation"
ON public.conversations FOR INSERT
WITH CHECK ((SELECT public.clerk_user_id()) = buyer_id);

CREATE POLICY "Users can update their own conversation settings"
ON public.conversations FOR UPDATE
USING ((SELECT public.clerk_user_id()) IN (buyer_id, seller_id))
WITH CHECK ((SELECT public.clerk_user_id()) IN (buyer_id, seller_id));

CREATE POLICY "Users can delete their own conversations"
ON public.conversations FOR DELETE
USING ((SELECT public.clerk_user_id()) IN (buyer_id, seller_id));

-- RLS POLICIES FOR MESSAGES --

-- Enable RLS on messages
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- ✅ FIX: Use clerk_user_id() instead of auth.uid()
CREATE POLICY "users_can_insert_messages" ON public.messages
  FOR INSERT
  WITH CHECK (sender_id = (SELECT public.clerk_user_id()));

CREATE POLICY "users_can_read_messages" ON public.messages
  FOR SELECT
  USING (
    conversations_id IN (
      SELECT id FROM public.conversations
      WHERE buyer_id = (SELECT public.clerk_user_id()) OR seller_id = (SELECT public.clerk_user_id())
    )
  );

CREATE POLICY "users_can_update_own_messages" ON public.messages
  FOR UPDATE
  USING (sender_id = (SELECT public.clerk_user_id()))
  WITH CHECK (sender_id = (SELECT public.clerk_user_id()));

CREATE POLICY "users_can_delete_own_messages" ON public.messages
  FOR DELETE
  USING (sender_id = (SELECT public.clerk_user_id()));
