import { useSignIn } from "@clerk/clerk-expo";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function SignInPage() {
  const { signIn, setActive, isLoaded } = useSignIn();
  const router = useRouter();

  const [emailAddress, setEmailAddress] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [code, setCode] = React.useState("");
  const [pendingVerification, setPendingVerification] = React.useState(false);
  const [error, setError] = React.useState("");
  const [showPassword, setShowPassword] = React.useState(false);

  // Email validation regex
  const isValidEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const onSignInPress = async () => {
    if (!isLoaded) return;

    // Validation
    if (!emailAddress.trim()) {
      setError("Invalid credentials");
      Alert.alert("Sign In Failed", "Invalid email or password");
      return;
    }

    if (!isValidEmail(emailAddress)) {
      setError("Invalid credentials");
      Alert.alert("Sign In Failed", "Invalid email or password");
      return;
    }

    if (!password) {
      setError("Invalid credentials");
      Alert.alert("Sign In Failed", "Invalid email or password");
      return;
    }

    try {
      setError("");
      const signInAttempt = await signIn.create({
        identifier: emailAddress,
        password,
      });

      console.log("Sign in attempt status:", signInAttempt.status);

      if (signInAttempt.status === "complete") {
        await setActive({ session: signInAttempt.createdSessionId });
        router.replace("/(tabs)");
      } else if (signInAttempt.status === "needs_first_factor") {
        // Account exists but needs verification
        Alert.alert(
          "Email Not Verified",
          "Please verify your email address first. Go back to sign up and complete the verification process.",
          [
            {
              text: "Go to Sign Up",
              onPress: () => {
                router.replace("/(auth)/sign-up");
              },
            },
          ],
        );
      } else if (signInAttempt.status === "needs_second_factor") {
        await signIn.prepareSecondFactor({
          strategy: "email_code",
        });
        setPendingVerification(true);
      } else {
        console.log("Unexpected status:", signInAttempt.status);
        const errorMsg = "Invalid email or password";
        setError(errorMsg);
        Alert.alert("Sign In Failed", errorMsg);
      }
    } catch (err: any) {
      console.log("Sign in error:", err);
      const errorMsg = "Invalid account";
      setError(errorMsg);
      Alert.alert("Sign In Failed", errorMsg);
    }
  };

  const onVerifyPress = async () => {
    if (!isLoaded) return;

    if (!code.trim()) {
      setError("Invalid verification code");
      Alert.alert(
        "Verification Failed",
        "Invalid or expired verification code",
      );
      return;
    }

    try {
      setError("");
      console.log("Attempting to verify with code:", code);

      // Try first factor (email verification) first
      let signInAttempt;
      try {
        signInAttempt = await signIn.attemptFirstFactor({
          strategy: "email_code",
          code,
        });
      } catch (firstFactorErr) {
        // If first factor fails, try second factor
        console.log("First factor failed, trying second factor");
        signInAttempt = await signIn.attemptSecondFactor({
          strategy: "email_code",
          code,
        });
      }

      console.log("Verification attempt status:", signInAttempt.status);

      if (signInAttempt.status === "complete") {
        await setActive({ session: signInAttempt.createdSessionId });
        router.replace("/(tabs)");
      } else {
        const errorMsg = "Invalid or expired verification code";
        setError(errorMsg);
        Alert.alert("Verification Failed", errorMsg);
      }
    } catch (err: any) {
      console.log("Verification error:", err);
      console.log(
        "Verification error details:",
        JSON.stringify(err.errors, null, 2),
      );

      let errorMsg = "Invalid or expired verification code";

      if (err.errors && err.errors.length > 0) {
        errorMsg = "Invalid or expired verification code";
      } else if (err.message) {
        errorMsg = "Invalid or expired verification code";
      }

      setError(errorMsg);
      Alert.alert("Verification Failed", errorMsg);
    }
  };

  if (pendingVerification) {
    return (
      <SafeAreaView style={styles.container}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.keyboardView}
          keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            bounces={false}
            keyboardShouldPersistTaps="handled"
          >
            <Image
              source={require("@src/assets/icons/Main-logo-24.png")}
              style={styles.logo}
              resizeMode="contain"
            />

            <Text style={styles.title}>Verify your email</Text>
            <Text style={styles.subtitle}>
              Enter the code sent to {emailAddress}
            </Text>

            <View style={styles.formContainer}>
              <Text style={styles.label}>Verification Code</Text>
              <TextInput
                value={code}
                placeholder="Enter verification code"
                onChangeText={setCode}
                style={styles.input}
                keyboardType="number-pad"
              />
              <TouchableOpacity onPress={onVerifyPress} style={styles.button}>
                <Text style={styles.buttonText}>Verify</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardView}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          bounces={false}
          keyboardShouldPersistTaps="handled"
        >
          <Image
            source={require("@src/assets/icons/Main-logo-24.png")}
            style={styles.logo}
            resizeMode="contain"
          />

          <Text style={styles.title}>Welcome Back!</Text>
          <Text style={styles.subtitle}>
            Login with your email or Google account
          </Text>

          <View style={styles.formContainer}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              autoCapitalize="none"
              value={emailAddress}
              placeholder="Enter your email"
              onChangeText={setEmailAddress}
              style={styles.input}
              keyboardType="email-address"
            />

            <Text style={styles.label}>Password</Text>
            <View style={styles.passwordContainer}>
              <TextInput
                value={password}
                placeholder="Enter your password"
                secureTextEntry={!showPassword}
                onChangeText={setPassword}
                style={styles.passwordInput}
              />
              <Pressable
                onPress={() => setShowPassword(!showPassword)}
                style={styles.passwordToggle}
              >
                <Ionicons
                  name={showPassword ? "eye" : "eye-off"}
                  size={20}
                  color="#666"
                />
              </Pressable>
            </View>

            <Text
              style={styles.forgotPassword}
              onPress={() => router.push("/(auth)/forgot-password" as any)}
            >
              Forgot password?
            </Text>

            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>OR CONTINUE WITH</Text>
              <View style={styles.dividerLine} />
            </View>

            <TouchableOpacity onPress={onSignInPress} style={styles.button}>
              <Text style={styles.buttonText}>Sign In</Text>
            </TouchableOpacity>

            <View style={styles.footer}>
              <Text style={styles.footerText}>Don't have an account? </Text>
              <TouchableOpacity
                onPress={() => router.replace("/(auth)/sign-up")}
              >
                <Text style={styles.footerLink}>Sign up</Text>
              </TouchableOpacity>
            </View>
          </View>

          <Text style={styles.terms}>
            By continuing, you agree to PhsarOne's Terms{"\n"}of Service and
            Privacy Policy.
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 40,
    justifyContent: "center",
  },
  logo: {
    width: 200,
    height: 60,
    alignSelf: "center",
    marginBottom: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 8,
    color: "#000",
  },
  subtitle: {
    fontSize: 14,
    textAlign: "center",
    color: "#666",
    marginBottom: 32,
  },
  formContainer: {
    width: "100%",
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 10,
    color: "#000",
  },
  input: {
    borderWidth: 1.5,
    borderColor: "#e0e0e0",
    borderRadius: 10,
    padding: 14,
    fontSize: 16,
    marginBottom: 20,
    backgroundColor: "#f8f8f8",
    minHeight: 48,
  },
  passwordContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "#e0e0e0",
    borderRadius: 10,
    marginBottom: 20,
    backgroundColor: "#f8f8f8",
    paddingRight: 12,
    minHeight: 48,
  },
  passwordInput: {
    flex: 1,
    paddingLeft: 14,
    paddingVertical: 12,
    fontSize: 16,
  },
  passwordToggle: {
    padding: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  forgotPassword: {
    fontSize: 14,
    color: "#666",
    marginBottom: 28,
  },
  divider: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 28,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#e0e0e0",
  },
  dividerText: {
    marginHorizontal: 16,
    fontSize: 12,
    color: "#999",
  },
  button: {
    backgroundColor: "#E44336",
    borderRadius: 50,
    paddingVertical: 14,
    paddingHorizontal: 20,
    alignItems: "center",
    marginBottom: 28,
    minHeight: 50,
    justifyContent: "center",
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  footerText: {
    fontSize: 14,
    color: "#666",
  },
  footerLink: {
    fontSize: 14,
    color: "#000",
    fontWeight: "600",
    textDecorationLine: "underline",
  },
  terms: {
    fontSize: 12,
    color: "#999",
    textAlign: "center",
    marginTop: "auto",
  },
});
