/**
 * Paws — Local notifications (no push server): daily log reminder + budget alerts.
 */
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { upcomingPaydays } from './paydayDates';
import { localISO } from './paydayDates';
import { loadPlanList } from './planStore';

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
  await Notifications.cancelScheduledNotificationAsync('daily-reminder').catch(() => {});
  await Notifications.scheduleNotificationAsync({
    identifier: 'daily-reminder',
    content: { title: 'Paws', body: 'Spent anything today? Log it before you forget.' },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DAILY, hour, minute: 0 },
  });
}

/**
 * Payday reminders at 9:00 on each chosen day of the month, for the next 12 months.
 * One-off date triggers (not a monthly repeat) so "30th" still fires in February (clamped to the 28th).
 * Re-run on every app open to keep the 12-month window rolling.
 */
export async function schedulePaydays(days: number[]) {
  if (!native) return;
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(scheduled.filter(n => n.identifier.startsWith('payday-'))
    .map(n => Notifications.cancelScheduledNotificationAsync(n.identifier)));
  if (days.length === 0) return;
  const { granted } = await Notifications.requestPermissionsAsync();
  if (!granted) return;
  for (const date of upcomingPaydays(days, new Date())) {
    await Notifications.scheduleNotificationAsync({
      identifier: `payday-${localISO(date)}`,
      content: { title: 'Payday! 💰', body: 'Sweldo day! Log your salary in Paws and pay yourself first.' },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date },
    });
  }
}

/** Plan → Reminders: one notification at 9:00 on each future reminder date. Re-run after every edit and on app open. */
export async function scheduleReminders() {
  if (!native) return;
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(scheduled.filter(n => n.identifier.startsWith('reminder-'))
    .map(n => Notifications.cancelScheduledNotificationAsync(n.identifier)));
  const now = new Date();
  const due = (await loadPlanList('reminders'))
    .map(r => ({ r, date: new Date(`${r.date}T09:00:00`) }))
    .filter(x => x.date > now)
    .slice(0, 60); // iOS keeps at most 64 pending notifications; paydays + daily use the rest
  if (!due.length) return;
  const { granted } = await Notifications.requestPermissionsAsync();
  if (!granted) return;
  for (const { r, date } of due) {
    await Notifications.scheduleNotificationAsync({
      identifier: `reminder-${r.id}`,
      content: { title: String(r.name), body: String(r.note ?? 'Reminder from Paws') },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date },
    });
  }
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
