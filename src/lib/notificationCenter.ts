import { createClerkSupabaseClient } from "@src/lib/supabase";

type AuthSupabaseClient = ReturnType<typeof createClerkSupabaseClient>;

type CreateNotificationInput = {
  userId: string;
  type: string;
  title: string;
  body: string;
  data?: Record<string, unknown> | null;
};

export async function createNotification(
  authSupabase: AuthSupabaseClient,
  input: CreateNotificationInput,
) {
  const { error } = await authSupabase.from("notifications").insert({
    user_id: input.userId,
    type: input.type,
    title: input.title,
    body: input.body,
    data: input.data ?? null,
  });

  if (error) throw error;
}
