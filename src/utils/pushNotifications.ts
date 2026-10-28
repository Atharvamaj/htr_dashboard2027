import { logger } from "./logger";

/**
 * Request permission for browser push notifications
 * @returns Promise<boolean> - true if permission granted
 */
export const requestNotificationPermission = async (): Promise<boolean> => {
  if (!("Notification" in window)) {
    logger.log("Browser doesn't support notifications");
    return false;
  }

  try {
    const permission = await Notification.requestPermission();
    logger.log("Notification permission:", permission);
    return permission === "granted";
  } catch (error) {
    logger.error("Error requesting notification permission:", error);
    return false;
  }
};

/**
 * Check if notification permission is granted
 * @returns boolean
 */
export const hasNotificationPermission = (): boolean => {
  if (!("Notification" in window)) {
    return false;
  }
  return Notification.permission === "granted";
};

/**
 * Show a browser push notification
 * @param title - Notification title
 * @param message - Notification message
 * @param options - Additional notification options
 */
export const showBrowserNotification = (
  title: string,
  message: string,
  options?: {
    icon?: string;
    badge?: string;
    tag?: string;
    requireInteraction?: boolean;
    silent?: boolean;
  }
): Notification | null => {
  if (!hasNotificationPermission()) {
    logger.log("Notification permission not granted");
    return null;
  }

  try {
    const notification = new Notification(title, {
      body: message,
      icon: options?.icon || "/htr_logo_transparent.svg",
      badge: options?.badge || "/favicon.ico",
      tag: options?.tag || "htr-notification",
      requireInteraction: options?.requireInteraction || false,
      silent: options?.silent || false,
    });

    // Auto-close after 10 seconds if not require interaction
    if (!options?.requireInteraction) {
      setTimeout(() => {
        notification.close();
      }, 10000);
    }

    // Handle notification click
    notification.onclick = () => {
      window.focus();
      notification.close();
    };

    logger.log("Browser notification shown:", title);
    return notification;
  } catch (error) {
    logger.error("Error showing browser notification:", error);
    return null;
  }
};

/**
 * Initialize push notifications on app load
 * Request permission if not already granted
 */
export const initializePushNotifications = async (): Promise<void> => {
  if (!("Notification" in window)) {
    logger.log("Browser doesn't support notifications");
    return;
  }

  if (Notification.permission === "default") {
    logger.log("Requesting notification permission on initialization");
    await requestNotificationPermission();
  } else {
    logger.log("Notification permission status:", Notification.permission);
  }
};

/**
 * Show a team notification via browser push
 * @param title - Notification title
 * @param message - Notification message
 */
export const showTeamNotification = (title: string, message: string): void => {
  showBrowserNotification(`💡 Team: ${title}`, message, {
    tag: "team-notification",
    requireInteraction: false,
  });
};

/**
 * Show a global notification via browser push
 * @param title - Notification title
 * @param message - Notification message
 */
export const showGlobalNotification = (title: string, message: string): void => {
  showBrowserNotification(`🏔️ Hack the Ridge: ${title}`, message, {
    tag: "global-notification",
    requireInteraction: false,
  });
};
