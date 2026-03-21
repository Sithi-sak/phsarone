import { useAuth } from "@clerk/clerk-expo";
import { supabase } from "@src/lib/supabase";
import { useEffect, useState } from "react";

type OnboardingStatus = {
  checked: boolean;
  needsOnboarding: boolean;
};

export function useProfileOnboardingStatus(): OnboardingStatus {
  const { isLoaded, isSignedIn, userId } = useAuth();
  const [checked, setChecked] = useState(false);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);

  useEffect(() => {
    let isCancelled = false;

    const checkStatus = async () => {
      if (!isLoaded) return;
      if (!isSignedIn || !userId) {
        if (!isCancelled) {
          setNeedsOnboarding(false);
          setChecked(true);
        }
        return;
      }

      try {
        const { data, error } = await supabase
          .from("users")
          .select("first_name")
          .eq("id", userId)
          .maybeSingle();

        if (error) throw error;

        const firstName = (data?.first_name || "").trim();
        if (!isCancelled) {
          setNeedsOnboarding(firstName.length === 0);
          setChecked(true);
        }
      } catch {
        if (!isCancelled) {
          setNeedsOnboarding(true);
          setChecked(true);
        }
      }
    };

    setChecked(false);
    checkStatus();

    return () => {
      isCancelled = true;
    };
  }, [isLoaded, isSignedIn, userId]);

  return { checked, needsOnboarding };
}
