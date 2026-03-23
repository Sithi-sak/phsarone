import { useAuth } from "@clerk/clerk-expo";
import { useFocusEffect } from "expo-router";
import { useCallback, useRef, useState } from "react";
import { getAuthToken } from "@src/lib/auth";
import { createClerkSupabaseClient } from "@src/lib/supabase";

const NOTIFICATION_COUNT_AUTH_OPTIONS = {
  timeoutMs: 45000,
  retries: 2,
} as const;

export function useUnreadNotificationsCount() {
  const { userId, getToken } = useAuth();
  const [count, setCount] = useState(0);
  const isFetchingRef = useRef(false);

  const fetchCount = useCallback(async () => {
    if (!userId || !getToken || isFetchingRef.current) {
      if (!userId) setCount(0);
      return;
    }

    try {
      isFetchingRef.current = true;
      const token = await getAuthToken(
        getToken,
        "notifications unread count",
        NOTIFICATION_COUNT_AUTH_OPTIONS,
      );
      const authSupabase = createClerkSupabaseClient(token);
      const { count: unreadCount, error } = await authSupabase
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("is_read", false);

      if (error) throw error;
      setCount(unreadCount || 0);
    } catch (error) {
      console.warn("Unread notifications count warning:", error);
      setCount(0);
    } finally {
      isFetchingRef.current = false;
    }
  }, [getToken, userId]);

  useFocusEffect(
    useCallback(() => {
      fetchCount();
    }, [fetchCount]),
  );

  return { count, refresh: fetchCount };
}
