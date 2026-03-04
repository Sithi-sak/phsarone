CREATE OR REPLACE FUNCTION public._reject_message_if_blocked()
RETURNS trigger AS $$
DECLARE
  conv_row public.conversations%ROWTYPE;
  other_id text;
BEGIN
  SELECT * INTO conv_row FROM public.conversations WHERE id = NEW.conversations_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'conversation not found';
  END IF;

  IF NEW.sender_id = conv_row.buyer_id THEN
    other_id := conv_row.seller_id;
  ELSE
    other_id := conv_row.buyer_id;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.blocked_users b
    WHERE b.blocker_id = NEW.sender_id
      AND b.blocked_id = other_id
  ) OR EXISTS (
    SELECT 1
    FROM public.blocked_users b
    WHERE b.blocker_id = other_id
      AND b.blocked_id = NEW.sender_id
  ) THEN
    RAISE EXCEPTION 'messaging blocked between users';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.conversation_blocks cb
    WHERE cb.conversation_id = NEW.conversations_id
  ) THEN
    RAISE EXCEPTION 'conversation blocked';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

ALTER FUNCTION public._reject_message_if_blocked()
SET search_path = pg_catalog, public;

DROP TRIGGER IF EXISTS on_message_block_check ON public.messages;
CREATE TRIGGER on_message_block_check
BEFORE INSERT ON public.messages
FOR EACH ROW
EXECUTE FUNCTION public._reject_message_if_blocked();
