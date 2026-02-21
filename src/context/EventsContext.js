import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { loadEvents, saveEvents } from '../services/storage';
import {
  scheduleEventNotifications,
  cancelEventNotifications,
  requestNotificationPermission,
} from '../services/notifications';

const EventsContext = createContext(null);

export function EventsProvider({ children }) {
  const [events, setEvents] = useState([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    requestNotificationPermission().catch(() => {});
    loadEvents().then(async (data) => {
      if (!cancelled) {
        setEvents(data);
        setLoaded(true);
        data.forEach((ev) => scheduleEventNotifications(ev).catch(() => {}));
      }
    });
    return () => { cancelled = true; };
  }, []);

  const persist = useCallback(async (nextEvents) => {
    setEvents(nextEvents);
    await saveEvents(nextEvents);
  }, []);

  const addEvent = useCallback(
    async (event) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
      const newEvent = { ...event, id, createdAt: Date.now() };
      const next = [...events, newEvent];
      await persist(next);
      scheduleEventNotifications(newEvent).catch(() => {});
      return newEvent;
    },
    [events, persist]
  );

  const addEvents = useCallback(
    async (toAdd) => {
      const withIds = toAdd.map((e) => ({
        ...e,
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        createdAt: Date.now(),
      }));
      const next = [...events, ...withIds];
      await persist(next);
      withIds.forEach((ev) => scheduleEventNotifications(ev).catch(() => {}));
      return withIds;
    },
    [events, persist]
  );

  const deleteEvent = useCallback(
    async (id) => {
      cancelEventNotifications(id).catch(() => {});
      const next = events.filter((e) => e.id !== id);
      await persist(next);
    },
    [events, persist]
  );

  const deleteEvents = useCallback(
    async (ids) => {
      ids.forEach((id) => cancelEventNotifications(id).catch(() => {}));
      const idSet = new Set(ids);
      const next = events.filter((e) => !idSet.has(e.id));
      await persist(next);
    },
    [events, persist]
  );

  const updateEvent = useCallback(
    async (id, updates) => {
      cancelEventNotifications(id).catch(() => {});
      const next = events.map((e) => (e.id === id ? { ...e, ...updates } : e));
      await persist(next);
      const updated = next.find((e) => e.id === id);
      if (updated) scheduleEventNotifications(updated).catch(() => {});
    },
    [events, persist]
  );

  const value = {
    events,
    loaded,
    addEvent,
    addEvents,
    deleteEvent,
    deleteEvents,
    updateEvent,
    refresh: async () => {
      const data = await loadEvents();
      setEvents(data);
    },
  };

  return <EventsContext.Provider value={value}>{children}</EventsContext.Provider>;
}

export function useEvents() {
  const ctx = useContext(EventsContext);
  if (!ctx) throw new Error('useEvents must be used within EventsProvider');
  return ctx;
}
