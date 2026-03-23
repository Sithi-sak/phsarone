import { useAuth, useSignUp } from "@clerk/clerk-expo";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import * as React from "react";
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

export default function SignUpScreen() {
  const { isLoaded, signUp, setActive } = useSignUp();
  const { signOut } = useAuth();
  const router = useRouter();

  const [emailAddress, setEmailAddress] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [pendingVerification, setPendingVerification] = React.useState(false);
  const [code, setCode] = React.useState("");
  const [error, setError] = React.useState("");
  const [showPassword, setShowPassword] = React.useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = React.useState(false);

  // Email validation regex
  const isValidEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const onSignUpPress = async () => {
    if (!isLoaded) {
      console.log("Clerk not loaded yet");
      return;
    }

    // Clear previous errors
    setError("");

    // Validation - generic messages for security
    if (!emailAddress || emailAddress.trim() === "") {
      const errorMsg = "Please fill in all required fields";
      setError(errorMsg);
      Alert.alert("Missing Information", errorMsg);
      return;
    }

    if (!isValidEmail(emailAddress)) {
      const errorMsg = "Please fill in all required fields";
      setError(errorMsg);
      Alert.alert("Missing Information", errorMsg);
      return;
    }

    if (!password || password.length < 8) {
      const errorMsg = "Password must be at least 8 characters";
      setError(errorMsg);
      Alert.alert("Invalid Password", errorMsg);
      return;
    }

    if (password !== confirmPassword) {
      const errorMsg = "Passwords do not match";
      setError(errorMsg);
      Alert.alert("Password Mismatch", errorMsg);
      return;
    }

    try {
      console.log("SignUp object status before create:", signUp?.status);
      console.log("Creating account with email:", emailAddress);

      // Create the sign up attempt
      const result = await signUp.create({
        emailAddress,
        password,
      });

      console.log("Sign up created successfully, status:", result.status);

      // Prepare email verification
      await signUp.prepareEmailAddressVerification({ strategy: "email_code" });
      console.log("Email verification prepared");
      setPendingVerification(true);
    } catch (err: any) {
      let errorMsg = "Unable to create account";

      // Check if it's a session_exists error
      if (
        err.errors &&
        err.errors.some((e: any) => e.code === "session_exists")
      ) {
        try {
          await signOut();
          const msg = "Please try again";
          setError(msg);
          Alert.alert("Account Error", msg);
        } catch {
          const msg = "An error occurred. Please try again later";
          setError(msg);
          Alert.alert("Error", msg);
        }
        return;
      }

      // Don't reveal specific field issues
      setError(errorMsg);
      Alert.alert("Sign Up Failed", errorMsg);
    }
  };

  const onVerifyPress = async () => {
    if (!isLoaded) return;

    if (!code.trim()) {
      const errorMsg = "Invalid or expired verification code";
      setError(errorMsg);
      Alert.alert("Verification Failed", errorMsg);
      return;
    }

    try {
      setError("");
      const signUpAttempt = await signUp.attemptEmailAddressVerification({
        code,
      });

      if (signUpAttempt.status === "complete") {
        await setActive({ session: signUpAttempt.createdSessionId });
        router.replace("/");
      } else {
        const errorMsg = "Invalid or expired verification code";
        setError(errorMsg);
        Alert.alert("Verification Failed", errorMsg);
      }
    } catch {
      const errorMsg = "Invalid or expired verification code";

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
              Enter the verification code sent to {emailAddress}
            </Text>

            <View style={styles.formContainer}>
              <Text style={styles.label}>Verification Code</Text>
              <TextInput
                value={code}
                placeholder="Enter 6-digit code"
                onChangeText={setCode}
                style={[styles.input, styles.codeInput]}
                keyboardType="number-pad"
                maxLength={6}
                textAlign="center"
              />

              <Text style={styles.hint}>
                Check your email for the verification code
              </Text>

              <TouchableOpacity onPress={onVerifyPress} style={styles.button}>
                <Text style={styles.buttonText}>Verify</Text>
              </TouchableOpacity>

              {error ? <Text style={styles.errorText}>{error}</Text> : null}

              <View style={styles.footer}>
                <Text style={styles.footerText}>Didn&apos;t receive a code? </Text>
                <TouchableOpacity onPress={() => setPendingVerification(false)}>
                  <Text style={styles.footerLink}>Try again</Text>
                </TouchableOpacity>
              </View>
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

          <Text style={styles.title}>Create Your Account</Text>
          <Text style={styles.subtitle}>
            Enter your email below to create your account
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

            <Text style={styles.label}>Confirm Password</Text>
            <View style={styles.passwordContainer}>
              <TextInput
                value={confirmPassword}
                placeholder="Re-enter your password"
                secureTextEntry={!showConfirmPassword}
                onChangeText={setConfirmPassword}
                style={styles.passwordInput}
              />
              <Pressable
                onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                style={styles.passwordToggle}
              >
                <Ionicons
                  name={showConfirmPassword ? "eye" : "eye-off"}
                  size={20}
                  color="#666"
                />
              </Pressable>
            </View>

            <Text style={styles.hint}>Must be at least 8 characters long.</Text>

            <TouchableOpacity onPress={onSignUpPress} style={styles.button}>
              <Text style={styles.buttonText}>Sign Up</Text>
            </TouchableOpacity>

            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>OR CONTINUE WITH</Text>
              <View style={styles.dividerLine} />
            </View>

            <View style={styles.footer}>
              <Text style={styles.footerText}>Already have an account? </Text>
              <TouchableOpacity
                onPress={() => router.replace("/(auth)/sign-in")}
              >
                <Text style={styles.footerLink}>Sign in</Text>
              </TouchableOpacity>
            </View>
          </View>

          <Text style={styles.terms}>
            By continuing, you agree to PhsarOne&apos;s Terms{"\n"}of Service and
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
    marginBottom: 30,
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
    marginBottom: 28,
  },
  formContainer: {
    width: "100%",
  },
  verifyContainer: {
    alignSelf: "center",
    marginHorizontal: 8,
  },
  emailHighlight: {
    fontWeight: "600",
    color: "#E44336",
  },
  codeInput: {
    fontSize: 20,
    fontWeight: "600",
    textAlign: "center",
  },
  errorText: {
    fontSize: 14,
    color: "#E44336",
    textAlign: "center",
    marginBottom: 16,
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
  hint: {
    fontSize: 12,
    color: "#999",
    marginBottom: 20,
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
