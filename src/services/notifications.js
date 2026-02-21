import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

const CHANNEL_ID = 'event-reminders';

function formatTimeForDisplay(t) {
  if (!t) return 'All day';
  if (typeof t !== 'string') return 'All day';
  const cleaned = t.replace(/\D/g, '');
  if (cleaned.length >= 4) {
    return `${cleaned.slice(0, 2)}:${cleaned.slice(2)}`;
  }
  return t;
}

function getTriggerDate(dateStr, hour, minute) {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, (m || 1) - 1, (d || 1), hour, minute, 0, 0);
}

export function getNotificationIds(eventId) {
  return {
    dayBefore: `event-${eventId}-day-before`,
    morning: `event-${eventId}-morning`,
  };
}

export async function requestNotificationPermission() {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
      name: 'Event Reminders',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
    });
  }

  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === 'granted') return true;

  const { status } = await Notifications.requestPermissionsAsync({
    ios: { allowAlert: true, allowBadge: true, allowSound: true },
  });
  return status === 'granted';
}

export async function scheduleEventNotifications(event) {
  if (!event?.id || !event?.date) return;

  const timeStr = formatTimeForDisplay(event.startTime || event.endTime);
  const bodySuffix = event.startTime || event.endTime ? ` at ${timeStr}` : '';

  const ids = getNotificationIds(event.id);

  const [y, m, d] = event.date.split('-').map(Number);
  const eventDate = new Date(y, (m || 1) - 1, (d || 1));
  const dayBefore = new Date(eventDate);
  dayBefore.setDate(dayBefore.getDate() - 1);
  dayBefore.setHours(20, 0, 0, 0);
  const dayBeforeDate = dayBefore;
  const morningDate = getTriggerDate(event.date, 8, 0);

  const now = new Date();

  try {
    if (dayBeforeDate > now) {
      await Notifications.scheduleNotificationAsync({
        identifier: ids.dayBefore,
        content: {
          title: 'Tomorrow',
          body: `${event.title}${bodySuffix}`,
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: dayBeforeDate,
        },
      });
    }

    if (morningDate > now) {
      await Notifications.scheduleNotificationAsync({
        identifier: ids.morning,
        content: {
          title: 'Today',
          body: `${event.title}${bodySuffix}`,
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: morningDate,
        },
      });
    }
  } catch (e) {
    console.warn('Failed to schedule notifications:', e);
  }
}

export async function cancelEventNotifications(eventId) {
  const ids = getNotificationIds(eventId);
  try {
    await Notifications.cancelScheduledNotificationAsync(ids.dayBefore);
    await Notifications.cancelScheduledNotificationAsync(ids.morning);
  } catch (e) {
    console.warn('Failed to cancel notifications:', e);
  }
}
