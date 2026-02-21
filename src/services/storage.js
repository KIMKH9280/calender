import AsyncStorage from '@react-native-async-storage/async-storage';
import { EVENT_STORAGE_KEY } from '../types/events';

/**
 * Load all events from AsyncStorage
 * @returns {Promise<import('../types/events').CalendarEvent[]>}
 */
export async function loadEvents() {
  try {
    const raw = await AsyncStorage.getItem(EVENT_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    return [];
  }
}

/**
 * Save all events to AsyncStorage
 * @param {import('../types/events').CalendarEvent[]} events
 */
export async function saveEvents(events) {
  await AsyncStorage.setItem(EVENT_STORAGE_KEY, JSON.stringify(events));
}
