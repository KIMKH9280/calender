import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Alert,
} from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { useTheme } from '../context/ThemeContext';
import { useEvents } from '../context/EventsContext';
import { useLanguage } from '../context/LanguageContext';

const DELETE_RED = '#ff3b30';

function formatTime(t) {
  if (!t) return '';
  if (t.length === 5 && t.includes(':')) return t;
  if (t.length === 4) return `${t.slice(0, 2)}:${t.slice(2)}`;
  return t;
}

function formatDateLabel(dateStr, todayStr, t, dateLocale) {
  if (dateStr === todayStr) return t ? t('today') : 'Today';
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString(dateLocale || 'en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function sortEventsByTime(events) {
  return [...events].sort((a, b) => {
    const aTime = a.startTime || '';
    const bTime = b.startTime || '';
    if (!aTime && !bTime) return 0;
    if (!aTime) return 1;
    if (!bTime) return -1;
    return aTime.localeCompare(bTime);
  });
}

function EventRow({
  event,
  colors,
  onEventPress,
  onDelete,
  selectionMode,
  selected,
  onToggleSelect,
  swipeEnabled,
  t,
}) {
  const swipeRef = useRef(null);

  const renderRightActions = () => (
    <TouchableOpacity
      style={styles.deleteSwipe}
      onPress={() => {
        swipeRef.current?.close();
        Alert.alert(
          t('deleteEvent'),
          t('deleteEventConfirm', { title: event.title }),
          [
            { text: t('cancel'), style: 'cancel' },
            { text: t('delete'), style: 'destructive', onPress: () => onDelete(event.id) },
          ]
        );
      }}
      activeOpacity={1}
    >
      <Text style={styles.deleteSwipeText}>{t('delete')}</Text>
    </TouchableOpacity>
  );

  const content = (
    <TouchableOpacity
      style={[styles.eventRow, { borderLeftColor: colors.accent, backgroundColor: colors.textDim + '12' }]}
      onPress={() => {
        if (selectionMode) {
          onToggleSelect(event.id);
        } else {
          onEventPress?.(event);
        }
      }}
      activeOpacity={0.7}
    >
      {selectionMode && (
        <View style={[styles.checkbox, selected && styles.checkboxSelected]}>
          {selected && <Text style={styles.checkmark}>✓</Text>}
        </View>
      )}
      <Text style={[styles.eventTime, { color: colors.textDim }]}>
        {event.startTime ? formatTime(event.startTime) : t('allDay')}
      </Text>
      <View style={styles.eventBody}>
        <Text style={[styles.eventTitle, { color: colors.text }]} numberOfLines={1}>
          {event.title}
        </Text>
        {event.location ? (
          <Text style={[styles.eventLocation, { color: colors.textDim }]} numberOfLines={1}>
            📍 {event.location}
          </Text>
        ) : null}
      </View>
    </TouchableOpacity>
  );

  if (selectionMode || !swipeEnabled) {
    return content;
  }

  return (
    <Swipeable
      ref={swipeRef}
      renderRightActions={renderRightActions}
      friction={1}
      overshootRight={false}
      rightThreshold={40}
    >
      {content}
    </Swipeable>
  );
}

export function SchedulePreview({ dateStr, events, onPressHeader, onEventPress }) {
  const { colors } = useTheme();
  const { t, dateLocale } = useLanguage();
  const { deleteEvent, deleteEvents } = useEvents();
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const fadeAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    fadeAnim.setValue(0);
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [dateStr]);

  useEffect(() => {
    if (!selectionMode) setSelectedIds(new Set());
  }, [selectionMode]);

  const dayEvents = events.filter((e) => e.date === dateStr);
  const sortedEvents = sortEventsByTime(dayEvents);
  const todayStr = require('../utils/date').getLocalDateString();
  const isToday = dateStr === todayStr;
  const labelFull = new Date(dateStr + 'T12:00:00').toLocaleDateString(dateLocale, {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  });
  const selectedCount = selectedIds.size;

  const handleToggleSelect = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleBulkDelete = () => {
    const ids = Array.from(selectedIds);
    const count = ids.length;
    Alert.alert(
      t('deleteEvents'),
      t('deleteEventsConfirm', { count }),
      [
        { text: t('cancel'), style: 'cancel' },
        {
          text: t('delete'),
          style: 'destructive',
          onPress: async () => {
            await deleteEvents(ids);
            setSelectedIds(new Set());
            setSelectionMode(false);
          },
        },
      ]
    );
  };

  return (
    <View style={[styles.wrap, { backgroundColor: colors.card }]}>
      <View style={[styles.header, { borderBottomColor: colors.textDim + '25' }]}>
        <TouchableOpacity
          style={styles.headerTouch}
          onPress={onPressHeader}
          activeOpacity={0.7}
        >
          <Text style={[styles.headerTitle, { color: colors.text }]}>{labelFull}</Text>
          <Text style={[styles.headerHint, { color: colors.textDim }]}>
            {t('eventsCount', { count: dayEvents.length })}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.selectBtn, selectionMode && styles.selectBtnActive]}
          onPress={() => setSelectionMode(!selectionMode)}
        >
          <Text
            style={[
              styles.selectBtnText,
              { color: selectionMode ? colors.accent : colors.textDim },
            ]}
          >
            {selectionMode ? t('cancel') : t('select')}
          </Text>
        </TouchableOpacity>
      </View>

      <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
        {sortedEvents.length === 0 ? (
          <View style={styles.empty}>
            <Text style={[styles.emptyText, { color: colors.textDim }]}>
              {isToday ? t('noEventsToday') : t('noEventsOnThisDay')}
            </Text>
          </View>
        ) : (
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            nestedScrollEnabled
          >
            {sortedEvents.map((event) => (
              <EventRow
                key={event.id}
                event={event}
                colors={colors}
                onEventPress={onEventPress}
                onDelete={deleteEvent}
                selectionMode={selectionMode}
                selected={selectedIds.has(event.id)}
                onToggleSelect={handleToggleSelect}
                swipeEnabled={!selectionMode}
                t={t}
              />
            ))}
          </ScrollView>
        )}

        {selectionMode && selectedCount > 0 && (
          <View style={[styles.bulkBar, { backgroundColor: colors.bg }]}>
            <TouchableOpacity
              style={[styles.bulkDeleteBtn, { backgroundColor: DELETE_RED }]}
              onPress={handleBulkDelete}
            >
              <Text style={styles.bulkDeleteText}>{t('delete')} ({selectedCount})</Text>
            </TouchableOpacity>
          </View>
        )}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginHorizontal: 12,
    marginBottom: 12,
    borderRadius: 12,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  headerTouch: { flex: 1 },
  headerTitle: { fontSize: 16, fontWeight: '700' },
  headerHint: { fontSize: 12, marginTop: 2 },
  selectBtn: { paddingVertical: 6, paddingHorizontal: 12 },
  selectBtnActive: {},
  selectBtnText: { fontSize: 15, fontWeight: '600' },
  content: { paddingVertical: 8 },
  scroll: { maxHeight: 180 },
  scrollContent: { paddingHorizontal: 12, paddingBottom: 12 },
  eventRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    paddingLeft: 12,
    borderLeftWidth: 3,
    marginBottom: 8,
    borderRadius: 8,
  },
  eventTime: { fontSize: 13, fontWeight: '600', width: 56 },
  eventBody: { flex: 1 },
  eventTitle: { fontSize: 15, fontWeight: '600' },
  eventLocation: { fontSize: 12, marginTop: 2 },
  deleteSwipe: {
    justifyContent: 'center',
    alignItems: 'center',
    width: 80,
    marginBottom: 4,
    backgroundColor: DELETE_RED,
    borderRadius: 8,
  },
  deleteSwipeText: { color: '#fff', fontWeight: '600', fontSize: 15 },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: 'rgba(128,128,128,0.8)',
    marginRight: 10,
    marginTop: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxSelected: {
    backgroundColor: DELETE_RED,
    borderColor: DELETE_RED,
  },
  checkmark: { color: '#fff', fontSize: 14, fontWeight: '700' },
  empty: { padding: 20, alignItems: 'center' },
  emptyText: { fontSize: 15 },
  bulkBar: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(128,128,128,0.3)',
  },
  bulkDeleteBtn: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 10,
  },
  bulkDeleteText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
