import DynamicPhosphorIcon from "@src/components/shared_components/DynamicPhosphorIcon";
import { ThemedText } from "@src/components/shared_components/ThemedText";
import { ThemedTextInput } from "@src/components/shared_components/ThemedTextInput";
import { useSellDraft } from "@src/context/SellDraftContext";
import useThemeColor from "@src/hooks/useThemeColor";
import { TFunction } from "i18next";
import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { StyleSheet, TouchableOpacity, View } from "react-native";

interface SellerContactFormProps {
  themeColors: ReturnType<typeof useThemeColor>;
  t: TFunction<"translation", undefined>;
}

const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export default function SellerContactForm({}: SellerContactFormProps) {
  const themeColors = useThemeColor();
  const { t } = useTranslation();
  const { draft, updateDraft } = useSellDraft();
  const [emailError, setEmailError] = useState<string>("");

  return (
    <>
      <ThemedText style={[styles.sectionTitle]}>
        {t("sellSection.SellerContactDetail")}
      </ThemedText>

      {/* Seller Name Input */}
      <View style={styles.inputGroup}>
        <ThemedText style={styles.inputLabel}>
          {t("sellSection.SellerName")}
        </ThemedText>
        <ThemedTextInput
          style={[
            styles.input,
            {
              color: themeColors.text,
              borderColor: themeColors.border,
            },
          ]}
          value={draft.contact.sellerName}
          onChangeText={(text) =>
            updateDraft("contact", {
              ...draft.contact,
              sellerName: text,
            })
          }
        />
      </View>

      {/* Phone Number Inputs */}
      {Array.isArray(draft.contact?.phones) &&
        draft.contact.phones.map((phone, index) => (
          <View key={index} style={styles.inputGroup}>
            <ThemedText style={styles.inputLabel}>
              {t("sellSection.PhoneNumber")} {index + 1}
            </ThemedText>
            <View style={styles.phoneInputContainer}>
              <ThemedTextInput
                style={[
                  styles.input,
                  styles.phoneInput,
                  {
                    color: themeColors.text,
                    borderColor: themeColors.border,
                  },
                ]}
                value={phone}
                onChangeText={(text) => {
                  const newPhones = [...draft.contact.phones];
                  newPhones[index] = text;
                  updateDraft("contact", {
                    ...draft.contact,
                    phones: newPhones,
                  });
                }}
                keyboardType="phone-pad"
              />
              {draft.contact.phones.length > 1 && (
                <TouchableOpacity
                  onPress={() => {
                    const newPhones = [...draft.contact.phones];
                    newPhones.splice(index, 1);
                    updateDraft("contact", {
                      ...draft.contact,
                      phones: newPhones,
                    });
                  }}
                  style={styles.removeBtn}
                >
                  <DynamicPhosphorIcon
                    name="Trash"
                    size={24}
                    color={themeColors.error}
                  />
                </TouchableOpacity>
              )}
              {index === draft.contact.phones.length - 1 &&
                draft.contact.phones.length < 3 && (
                  <TouchableOpacity
                    onPress={() => {
                      const newPhones = [...draft.contact.phones, ""];
                      updateDraft("contact", {
                        ...draft.contact,
                        phones: newPhones,
                      });
                    }}
                    style={styles.addPhoneIconBtn}
                  >
                    <DynamicPhosphorIcon
                      name="PlusCircle"
                      size={24}
                      color={themeColors.tint}
                    />
                  </TouchableOpacity>
                )}
            </View>
          </View>
        ))}

      {/* Email Input */}
      <View style={styles.inputGroup}>
        <ThemedText style={styles.inputLabel}>
          {t("sellSection.Email")} *
        </ThemedText>
        <ThemedTextInput
          style={[
            styles.input,
            {
              color: themeColors.text,
              borderColor: emailError ? themeColors.error : themeColors.border,
            },
          ]}
          value={draft.contact.email}
          onChangeText={(text) => {
            updateDraft("contact", { ...draft.contact, email: text });
            // Validate email as user types
            if (text.length === 0) {
              setEmailError("");
            } else if (!validateEmail(text)) {
              setEmailError(
                t("sellSection.EmailError", {
                  defaultValue: "Invalid email format",
                }),
              );
            } else {
              setEmailError("");
            }
          }}
          keyboardType="email-address"
          placeholder="example@email.com"
          placeholderTextColor={themeColors.text + "80"}
        />
        {emailError ? (
          <ThemedText style={[styles.errorText, { color: themeColors.error }]}>
            {emailError}
          </ThemedText>
        ) : null}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  sectionTitle: {
    fontSize: 20,
    fontWeight: "600",
  },
  inputGroup: {
    marginBottom: 2,
  },
  inputLabel: {
    fontSize: 16,
    marginTop: 12,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    fontSize: 16,
    height: 44,
  },
  phoneInputContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  phoneInput: {
    flex: 1,
  },
  addPhoneIconBtn: {
    marginLeft: 10,
  },
  removeBtn: {
    marginLeft: 10,
  },
  errorText: {
    fontSize: 12,
    marginTop: 4,
    marginLeft: 4,
  },
});
