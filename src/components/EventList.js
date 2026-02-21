import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { useEvents } from '../context/EventsContext';
import { useTheme } from '../context/ThemeContext';

function formatTime(t) {
  if (!t) return '';
  if (t.length === 5 && t.includes(':')) return t;
  if (t.length === 4) return `${t.slice(0, 2)}:${t.slice(2)}`;
  return t;
}

function EventRow({ event, showDelete, onDelete, onPress, colors }) {
  const rightActions = () => (
    <TouchableOpacity
      style={[styles.deleteSwipe, { backgroundColor: colors.accent }]}
      onPress={() => onDelete(event.id)}
      activeOpacity={1}
    >
      <Text style={styles.deleteSwipeText}>Delete</Text>
    </TouchableOpacity>
  );

  const content = (
    <TouchableOpacity
      style={[styles.eventCard, { backgroundColor: colors.card }]}
      onPress={() => onPress?.(event)}
      activeOpacity={onPress ? 0.7 : 1}
      disabled={!onPress}
    >
      <View style={styles.eventBody}>
        <Text style={[styles.eventTitle, { color: colors.text }]} numberOfLines={1}>{event.title}</Text>
        {(event.startTime || event.endTime) && (
          <Text style={[styles.eventTime, { color: colors.textDim }]}>
            {[event.startTime, event.endTime].filter(Boolean).map(formatTime).join(' – ')}
          </Text>
        )}
        {(event.location || event.description) ? (
          <Text style={[styles.eventDesc, { color: colors.textDim }]} numberOfLines={2}>
            {[event.location, event.description].filter(Boolean).join(' · ')}
          </Text>
        ) : null}
      </View>
      {showDelete && (
        <TouchableOpacity style={styles.deleteBtn} onPress={() => onDelete(event.id)}>
          <Text style={styles.deleteBtnIcon}>🗑️</Text>
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );

  if (showDelete) {
    return (
      <Swipeable renderRightActions={rightActions} overshootRight={false}>
        {content}
      </Swipeable>
    );
  }
  return content;
}

export function EventList({ events, date, showDelete, onEventPress }) {
  const { deleteEvent } = useEvents();
  const { colors } = useTheme();

  if (!events || events.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={[styles.emptyText, { color: colors.textDim }]}>No events this day</Text>
      </View>
    );
  }

  return (
    <View style={styles.list}>
      {events.map((event) => (
        <EventRow
          key={event.id}
          event={event}
          showDelete={showDelete}
          onDelete={deleteEvent}
          onPress={onEventPress}
          colors={colors}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { padding: 16, paddingBottom: 32 },
  eventCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
  },
  eventBody: { flex: 1 },
  eventTitle: { fontSize: 16, fontWeight: '600' },
  eventTime: { fontSize: 13, marginTop: 2 },
  eventDesc: { fontSize: 12, marginTop: 4 },
  deleteBtn: { paddingVertical: 8, paddingHorizontal: 12, justifyContent: 'center' },
  deleteBtnIcon: { fontSize: 18 },
  deleteSwipe: {
    justifyContent: 'center',
    alignItems: 'center',
    width: 80,
    borderRadius: 12,
    marginBottom: 10,
  },
  deleteSwipeText: { color: '#fff', fontWeight: '600' },
  empty: { padding: 24, alignItems: 'center' },
  emptyText: { fontSize: 15 },
});
