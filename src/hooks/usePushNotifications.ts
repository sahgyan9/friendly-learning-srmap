import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import {
  isPushNotificationSupported,
  getNotificationPermission,
  subscribeUserToPush,
  unsubscribeUserFromPush,
  dispatchPushNotification,
  registerServiceWorker,
} from "@/lib/push/pushService";
import { toast } from "sonner";

export function usePushNotifications() {
  const { user } = useAuth();
  const [isSupported, setIsSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">("default");
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const checkStatus = useCallback(async () => {
    const supported = isPushNotificationSupported();
    setIsSupported(supported);

    if (!supported) {
      setPermission("unsupported");
      setIsLoading(false);
      return;
    }

    const currentPermission = getNotificationPermission();
    setPermission(currentPermission);

    if (currentPermission === "granted" && user) {
      try {
        const registration = await registerServiceWorker();
        if (registration) {
          const subscription = await registration.pushManager.getSubscription();
          setIsSubscribed(Boolean(subscription));
        }
      } catch (e) {
        console.warn("[usePushNotifications] Error checking active subscription:", e);
      }
    } else {
      setIsSubscribed(false);
    }

    setIsLoading(false);
  }, [user]);

  useEffect(() => {
    checkStatus();
  }, [checkStatus]);

  const enablePush = async (): Promise<boolean> => {
    if (!user) {
      toast.error("Please sign in to enable notifications");
      return false;
    }

    setIsLoading(true);
    const result = await subscribeUserToPush(user.id);
    setIsLoading(false);

    if (result.success) {
      setIsSubscribed(true);
      setPermission(getNotificationPermission());
      toast.success("Push notifications enabled on this device! 🎉");
      return true;
    } else {
      setPermission(getNotificationPermission());
      toast.error(result.error || "Failed to enable notifications.");
      return false;
    }
  };

  const disablePush = async (): Promise<boolean> => {
    if (!user) return false;

    setIsLoading(true);
    const result = await unsubscribeUserFromPush(user.id);
    setIsLoading(false);

    if (result.success) {
      setIsSubscribed(false);
      toast.info("Push notifications disabled for this device.");
      return true;
    } else {
      toast.error(result.error || "Failed to disable notifications.");
      return false;
    }
  };

  const sendTestNotification = async (): Promise<boolean> => {
    if (!user) return false;

    toast.info("Sending test notification to your device...");
    const success = await dispatchPushNotification({
      userIds: [user.id],
      title: "Friendly Learning SRMAP",
      body: "Test notification: Web Push is working seamlessly on this device! 🚀",
      url: "/profile",
      tag: "test-push",
    });

    if (success) {
      toast.success("Notification sent! Check your notification tray.");
    } else {
      toast.error("Could not deliver test notification. Ensure push is enabled.");
    }
    return success;
  };

  return {
    isSupported,
    permission,
    isSubscribed,
    isLoading,
    enablePush,
    disablePush,
    sendTestNotification,
    refreshStatus: checkStatus,
  };
}
