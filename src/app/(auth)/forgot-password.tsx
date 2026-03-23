import { useSignIn } from "@clerk/clerk-expo";
import { Ionicons } from "@expo/vector-icons";
import ActionStatusModal from "@src/components/shared_components/ActionStatusModal";
import { useRouter } from "expo-router";
import React from "react";
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function ForgotPasswordPage() {
  const { signIn, isLoaded, setActive } = useSignIn();
  const router = useRouter();

  const [emailAddress, setEmailAddress] = React.useState("");
  const [code, setCode] = React.useState("");
  const [newPassword, setNewPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [showNewPassword, setShowNewPassword] = React.useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = React.useState(false);
  const [step, setStep] = React.useState<"email" | "code" | "password">(
    "email",
  );
  const [error, setError] = React.useState("");
  const [isLoading, setIsLoading] = React.useState(false);
  const [showCodeSentModal, setShowCodeSentModal] = React.useState(false);
  const [showResetSuccessModal, setShowResetSuccessModal] = React.useState(false);

  const isValidEmail = (email: string) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  // ─── Step 1: Send reset code ──────────────────────────────────────────────
  const onSendCodePress = async () => {
    if (!isLoaded) return;

    if (!emailAddress.trim()) {
      setError("Please enter your email address");
      return;
    }
    if (!isValidEmail(emailAddress)) {
      setError("Please enter a valid email address");
      return;
    }

    try {
      setIsLoading(true);
      setError("");

      await signIn?.create({
        strategy: "reset_password_email_code",
        identifier: emailAddress,
      });

      setStep("code");
      setShowCodeSentModal(true);
    } catch (err: any) {
      let msg = "Failed to send reset code";
      if (err.errors?.[0]?.message?.toLowerCase().includes("not found")) {
        msg = "No account found with this email address";
      } else if (err.errors?.[0]?.message) {
        msg = err.errors[0].message;
      }
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };


  const onVerifyCodePress = async () => {
    if (!isLoaded) return;

    if (!code.trim() || code.trim().length < 6) {
      setError("Please enter the 6-digit verification code");
      return;
    }

    try {
      setIsLoading(true);
      setError("");

      await signIn?.attemptFirstFactor({
        strategy: "reset_password_email_code",
        code: code.trim(),
        password: "x", 
      } as any);

      
      setCodeVerified(true);
      setStep("password");
    } catch (err: any) {
      const errorCode = err.errors?.[0]?.code ?? "";
      const errorMessage = err.errors?.[0]?.message ?? "";

      const isPasswordError =
        errorCode.startsWith("form_password") ||
        errorCode === "form_param_format_invalid" || 
        (errorMessage.toLowerCase().includes("password") &&
          !errorMessage.toLowerCase().includes("code"));

      if (isPasswordError) {
        
        setCodeVerified(true);
        setStep("password");
        return;
      }

      
      let msg = "Invalid verification code. Please try again.";
      if (
        errorCode === "form_code_incorrect" ||
        errorMessage.toLowerCase().includes("incorrect")
      ) {
        msg = "Incorrect code. Please check your email and try again.";
      } else if (errorMessage.toLowerCase().includes("expired")) {
        msg = "Code has expired. Please request a new one.";
        setStep("email");
        setCode("");
      }
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  // ─── Step 3: Set new password ─────────────────────────────────────────────
  const onResetPasswordPress = async () => {
    if (!isLoaded) return;

    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    try {
      setIsLoading(true);
      setError("");

      const result = await signIn?.attemptFirstFactor({
        strategy: "reset_password_email_code",
        code: code.trim(),
        password: newPassword,
      } as any);

      if (result?.status === "complete") {
        if (result.createdSessionId) {
          await setActive({ session: result.createdSessionId });
        }
        setShowResetSuccessModal(true);
      } else {
        setError("Something went wrong. Please try again.");
      }
    } catch (err: any) {
      const errorCode = err.errors?.[0]?.code ?? "";
      const errorMessage = err.errors?.[0]?.message ?? "";

      let msg = "Failed to reset password. Please try again.";

      if (
        errorCode === "form_code_incorrect" ||
        errorMessage.toLowerCase().includes("incorrect")
      ) {
        msg = "Code expired or invalid. Please try again.";
        setStep("code");
        setCodeVerified(false);
        setCode("");
      } else if (
        errorCode === "form_password_pwned" ||
        errorMessage.toLowerCase().includes("password")
      ) {
        msg =
          errorMessage || "Password is too weak. Please choose a stronger one.";
      }

      setError(msg);
      Alert.alert("Error", msg);
    } finally {
      setIsLoading(false);
    }
  };

  const onBackPress = () => {
    if (step === "password") {
      setStep("code");
      setNewPassword("");
      setConfirmPassword("");
      setError("");
    } else if (step === "code") {
      setStep("email");
      setCode("");
      setError("");
    } else {
      router.back();
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ActionStatusModal
        visible={showCodeSentModal}
        title="Code sent"
        description={`A reset code has been sent to ${emailAddress}.`}
        actionLabel="Continue"
        tone="info"
        hideHeaderTone
        onClose={() => setShowCodeSentModal(false)}
      />
      <ActionStatusModal
        visible={showResetSuccessModal}
        title="Password updated"
        description="Your password has been reset. Signing you in..."
        actionLabel="Continue"
        tone="success"
        hideHeaderTone
        onClose={() => {
          setShowResetSuccessModal(false);
          router.replace("/");
        }}
      />
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
          scrollEnabled={true}
        >
          <TouchableOpacity onPress={onBackPress} style={styles.backButton}>
            <Ionicons name="chevron-back" size={24} color="#000" />
          </TouchableOpacity>

          <Image
            source={require("@src/assets/icons/Main-logo-24.png")}
            style={styles.logo}
            resizeMode="contain"
          />

          {/* ── Step 1: Email ── */}
          {step === "email" && (
            <>
              <Text style={styles.title}>Reset Password</Text>
              <Text style={styles.subtitle}>
                Enter your email and we&apos;ll send you a reset code.
              </Text>

              <View style={styles.formContainer}>
                <Text style={styles.label}>Email</Text>
                <TextInput
                  autoCapitalize="none"
                  value={emailAddress}
                  placeholder="Enter your email"
                  onChangeText={(v) => {
                    setEmailAddress(v);
                    setError("");
                  }}
                  style={styles.input}
                  keyboardType="email-address"
                  editable={!isLoading}
                />

                {!!error && <Text style={styles.errorText}>{error}</Text>}

                <TouchableOpacity
                  onPress={onSendCodePress}
                  style={[styles.button, isLoading && styles.buttonDisabled]}
                  disabled={isLoading}
                >
                  <Text style={styles.buttonText}>
                    {isLoading ? "Sending..." : "Send Reset Code"}
                  </Text>
                </TouchableOpacity>

                <View style={styles.footer}>
                  <Text style={styles.footerText}>
                    Remember your password?{" "}
                  </Text>
                  <TouchableOpacity
                    onPress={() => router.replace("/(auth)/sign-in")}
                  >
                    <Text style={styles.footerLink}>Sign In</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </>
          )}

          {/* ── Step 2: Verify Code ── */}
          {step === "code" && (
            <>
              <Text style={styles.title}>Verify Code</Text>
              <Text style={styles.subtitle}>
                Enter the 6-digit code sent to {emailAddress}
              </Text>

              <View style={styles.formContainer}>
                <Text style={styles.label}>Verification Code</Text>
                <TextInput
                  value={code}
                  placeholder="Enter 6-digit code"
                  onChangeText={(v) => {
                    setCode(v);
                    setError("");
                  }}
                  style={styles.input}
                  keyboardType="number-pad"
                  maxLength={10}
                  editable={!isLoading}
                  autoFocus
                />

                <Text style={styles.hint}>
                  Check your inbox for the reset code
                </Text>

                {!!error && <Text style={styles.errorText}>{error}</Text>}

                <TouchableOpacity
                  onPress={onVerifyCodePress}
                  style={[styles.button, isLoading && styles.buttonDisabled]}
                  disabled={isLoading}
                >
                  <Text style={styles.buttonText}>
                    {isLoading ? "Verifying..." : "Verify Code"}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => {
                    setStep("email");
                    setError("");
                  }}
                >
                  <Text style={[styles.footerLink, styles.centeredLink]}>
                    Didn&apos;t receive a code? Resend
                  </Text>
                </TouchableOpacity>
              </View>
            </>
          )}

          {/* ── Step 3: New Password ── */}
          {step === "password" && (
            <>
              <Text style={styles.title}>New Password</Text>
              <Text style={styles.subtitle}>
                Code verified ✓ — set your new password for {emailAddress}
              </Text>

              <View style={styles.formContainer}>
                <Text style={styles.label}>New Password</Text>
                <View style={styles.passwordContainer}>
                  <TextInput
                    value={newPassword}
                    placeholder="Enter new password"
                    secureTextEntry={!showNewPassword}
                    onChangeText={(v) => {
                      setNewPassword(v);
                      setError("");
                    }}
                    style={styles.passwordInput}
                    editable={!isLoading}
                    autoFocus
                  />
                  <TouchableOpacity
                    onPress={() => setShowNewPassword(!showNewPassword)}
                    style={styles.passwordToggle}
                  >
                    <Ionicons
                      name={showNewPassword ? "eye" : "eye-off"}
                      size={20}
                      color="#666"
                    />
                  </TouchableOpacity>
                </View>

                <Text style={styles.label}>Confirm Password</Text>
                <View style={styles.passwordContainer}>
                  <TextInput
                    value={confirmPassword}
                    placeholder="Confirm new password"
                    secureTextEntry={!showConfirmPassword}
                    onChangeText={(v) => {
                      setConfirmPassword(v);
                      setError("");
                    }}
                    style={styles.passwordInput}
                    editable={!isLoading}
                  />
                  <TouchableOpacity
                    onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                    style={styles.passwordToggle}
                  >
                    <Ionicons
                      name={showConfirmPassword ? "eye" : "eye-off"}
                      size={20}
                      color="#666"
                    />
                  </TouchableOpacity>
                </View>

                <Text style={styles.hint}>
                  Password must be at least 8 characters
                </Text>

                {!!error && <Text style={styles.errorText}>{error}</Text>}

                <TouchableOpacity
                  onPress={onResetPasswordPress}
                  style={[styles.button, isLoading && styles.buttonDisabled]}
                  disabled={isLoading}
                >
                  <Text style={styles.buttonText}>
                    {isLoading ? "Resetting..." : "Reset Password"}
                  </Text>
                </TouchableOpacity>
              </View>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      <Text style={styles.terms}>
        By continuing, you agree to PhsarOne&apos;s Terms{"\n"}of Service and Privacy
        Policy.
      </Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  keyboardView: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 20,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    marginBottom: 20,
  },
  logo: { width: 200, height: 60, alignSelf: "center", marginBottom: 40 },
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
  formContainer: { width: "100%" },
  label: { fontSize: 16, fontWeight: "600", marginBottom: 10, color: "#000" },
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
  hint: { fontSize: 12, color: "#999", marginBottom: 20 },
  errorText: { fontSize: 14, color: "#E44336", marginBottom: 15 },
  button: {
    backgroundColor: "#E44336",
    borderRadius: 50,
    paddingVertical: 14,
    paddingHorizontal: 20,
    alignItems: "center",
    marginBottom: 20,
    minHeight: 50,
    justifyContent: "center",
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  footerText: { fontSize: 14, color: "#666" },
  footerLink: {
    fontSize: 14,
    color: "#E44336",
    fontWeight: "600",
    textDecorationLine: "underline",
  },
  centeredLink: { textAlign: "center" },
  terms: {
    fontSize: 12,
    color: "#999",
    textAlign: "center",
    paddingHorizontal: 20,
    paddingBottom: 20,
    paddingTop: 10,
  },
});
