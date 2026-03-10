import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

const CHAT_CHANNEL_ID = "chat-messages";

// Configure how notifications are handled when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async (notification) => {
    console.log('[Notifications] Foreground notification received:', {
      title: notification.request.content.title,
      body: notification.request.content.body,
    });

    return {
      shouldShowBanner: true,  // Show iOS banner
      shouldPlaySound: true,   // Play sound
      shouldSetBadge: true,    // Set badge count
    };
  },
});

export async function initializeAppNotifications() {
  try {
    console.log('[Notifications] 🚀 Initializing app notifications...');
    
    if (Platform.OS === "android") {
      console.log('[Notifications] Setting up Android notification channel...');
      await Notifications.setNotificationChannelAsync(CHAT_CHANNEL_ID, {
        name: "Chat Messages",
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: "#D9382C",
        sound: "default",
      });
      console.log('[Notifications] ✅ Android channel created');
    }

    const { status } = await Notifications.getPermissionsAsync();
    console.log('[Notifications] Current permission status:', status);
    
    if (status !== "granted") {
      console.log('[Notifications] Requesting permissions...');
      const result = await Notifications.requestPermissionsAsync();
      console.log('[Notifications] Permission request result:', result.status);
    } else {
      console.log('[Notifications] ✅ Permissions already granted');
    }
  } catch (err: any) {
    console.error('[Notifications] ❌ Failed to initialize:', err?.message || err);
    throw err;
  }
}

export async function showIncomingChatNotification(params: {
  title?: string;
  body: string;
  conversationId?: string;
}) {
  try {
    console.log('[Notifications] 🔔 Attempting to show notification:', {
      title: params.title,
      body: params.body,
      conversationId: params.conversationId,
      platform: Platform.OS,
    });

    const notificationContent: any = {
      title: params.title || "New message",
      body: params.body,
      sound: true,
      priority: 'high',
      data: {
        type: "chat",
        conversationId: params.conversationId || "",
      },
    };

    // Add Android-specific channel ID (REQUIRED for Android 8.0+)
    if (Platform.OS === "android") {
      notificationContent.channelId = CHAT_CHANNEL_ID;
      console.log('[Notifications] Setting Android channelId:', CHAT_CHANNEL_ID);
    }

    console.log('[Notifications] Scheduling notification with config:', {
      platform: Platform.OS,
      title: notificationContent.title,
      hasChannelId: !!notificationContent.channelId,
      hasSound: notificationContent.sound,
    });

    await Notifications.scheduleNotificationAsync({
      content: notificationContent,
      trigger: null,
    });
    
    console.log('[Notifications] ✅ Notification scheduled successfully');
  } catch (err: any) {
    console.error('[Notifications] ❌ Failed to show notification:', err?.message || err);
    throw err;
  }
}
