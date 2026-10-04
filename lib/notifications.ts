/**
 * GasTador — Local notifications (no push server): daily log reminder + budget alerts.
 */
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

const native = Platform.OS !== 'web';

if (native) {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({ shouldShowAlert: true, shouldPlaySound: true, shouldSetBadge: false }),
  });
}

export async function setupDailyReminder(hour = 20) {
  if (!native) return;
  const { granted } = await Notifications.requestPermissionsAsync();
  if (!granted) return;
  await Notifications.cancelAllScheduledNotificationsAsync();
  await Notifications.scheduleNotificationAsync({
    content: { title: 'GasTador', body: 'Spent anything today? Log it before you forget.' },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DAILY, hour, minute: 0 },
  });
}

export async function cancelReminders() {
  if (native) await Notifications.cancelAllScheduledNotificationsAsync();
}

/** Fires once when an expense crosses 80% or 100% of a category budget. */
export async function notifyBudget(category: string, spent: number, limit: number, amount: number) {
  if (!native || limit <= 0) return;
  const before = spent - amount;
  let body: string | null = null;
  if (spent > limit && before <= limit) {
    body = `${category} is over budget: ₱${spent.toFixed(2)} of ₱${limit.toFixed(2)}.`;
  } else if (spent >= 0.8 * limit && before < 0.8 * limit) {
    body = `${category} budget is ${Math.round((spent / limit) * 100)}% used.`;
  }
  if (body) await Notifications.scheduleNotificationAsync({ content: { title: 'Budget alert', body }, trigger: null });
}
