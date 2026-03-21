import { useAuth } from "@clerk/clerk-expo";
import { useProfileOnboardingStatus } from "@src/hooks/useProfileOnboardingStatus";
import { Redirect } from "expo-router";
import { ActivityIndicator, View } from "react-native";

export default function Index() {
  const { isSignedIn, isLoaded } = useAuth();
  const { checked, needsOnboarding } = useProfileOnboardingStatus();

  if (!isLoaded || (isSignedIn && !checked)) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="small" color="#E44336" />
      </View>
    );
  }

  if (isSignedIn) {
    return <Redirect href={needsOnboarding ? "/onboarding/profile" : "/(tabs)"} />;
  }

  return <Redirect href="/(auth)/sign-in" />;
}
