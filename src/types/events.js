/**
 * @typedef {Object} CalendarEvent
 * @property {string} id - Unique ID
 * @property {string} title - Event title
 * @property {string} [description] - Optional description
 * @property {string} date - ISO date string (YYYY-MM-DD)
 * @property {string} [startTime] - Optional start time (HH:mm)
 * @property {string} [endTime] - Optional end time (HH:mm)
 * @property {number} [createdAt] - Timestamp when created
 */

export const EVENT_STORAGE_KEY = '@personal_assistant_events';
