import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  TouchableOpacity,
  Text,
  StyleSheet,
  Modal,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Calendar } from 'react-native-calendars';
import { useEvents } from '../context/EventsContext';
import { extractEventsFromText } from '../services/openai';
import { EventList } from '../components/EventList';
import { AddEventForm } from '../components/AddEventForm';
import { ImageExtractFlow } from '../components/ImageExtractFlow';
import { SettingsScreen } from '../components/SettingsScreen';
import { SchedulePreview } from '../components/SchedulePreview';
import { EventDetailScreen } from '../components/EventDetailScreen';
import { SwipeableCalendar } from '../components/SwipeableCalendar';
import { useTheme } from '../context/ThemeContext';

const FIXED_KOREAN_HOLIDAYS = [
  { month: 1, day: 1 },
  { month: 3, day: 1 },
  { month: 5, day: 5 },
  { month: 6, day: 6 },
  { month: 8, day: 15 },
  { month: 10, day: 3 },
  { month: 10, day: 9 },
  { month: 12, day: 25 },
];

const LUNAR_KOREAN_HOLIDAYS_BY_YEAR = {
  // Add lunar-based holidays here (Seollal, Buddha's Birthday, Chuseok) as YYYY-MM-DD strings.
};

const HOLIDAY_CACHE = {};

function toLocalDateString(date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getKoreanPublicHolidaySet(year) {
  if (HOLIDAY_CACHE[year]) return HOLIDAY_CACHE[year];
  const holidays = new Set();
  FIXED_KOREAN_HOLIDAYS.forEach(({ month, day }) => {
    const m = `${month}`.padStart(2, '0');
    const d = `${day}`.padStart(2, '0');
    holidays.add(`${year}-${m}-${d}`);
  });
  const lunar = LUNAR_KOREAN_HOLIDAYS_BY_YEAR[year] || [];
  lunar.forEach((dateStr) => holidays.add(dateStr));
  HOLIDAY_CACHE[year] = holidays;
  return holidays;
}

function isWeekend(date) {
  const day = date.getDay();
  return day === 0 || day === 6;
}

function getMarkedDates(events, dotColor, selectedDate) {
  const marked = {};
  events.forEach((e) => {
    if (!e.date) return;
    if (!marked[e.date]) {
      marked[e.date] = { marked: true, dotColor };
    }
  });
  if (selectedDate) {
    marked[selectedDate] = {
      ...(marked[selectedDate] || { marked: true, dotColor }),
      selected: true,
    };
  }
  return marked;
}

function getEventsCountByDate(events) {
  const count = {};
  events.forEach((e) => {
    if (!e.date) return;
    count[e.date] = (count[e.date] || 0) + 1;
  });
  return count;
}

function DayDots({ count, dotColor }) {
  if (!count || count < 1) return null;
  const dotCount = Math.min(3, count);
  return (
    <View style={styles.dayDotsRow}>
      {Array.from({ length: dotCount }, (_, i) => (
        <View key={i} style={[styles.dayDot, { backgroundColor: dotColor }]} />
      ))}
    </View>
  );
}

function getWeekStart(date) {
  const start = new Date(date);
  const day = start.getDay();
  const diff = (day + 6) % 7;
  start.setDate(start.getDate() - diff);
  return start;
}

function getPrevWeek(date) {
  const d = new Date(date);
  d.setDate(d.getDate() - 7);
  return d;
}

function getNextWeek(date) {
  const d = new Date(date);
  d.setDate(d.getDate() + 7);
  return d;
}

function parseHour(startTime) {
  if (!startTime) return null;
  const match = startTime.match(/^(\d{1,2})/);
  if (!match) return null;
  const hour = Number(match[1]);
  if (Number.isNaN(hour) || hour < 0 || hour > 23) return null;
  return hour;
}

function WeekView({ baseDate, events, onSelectDate, colors }) {
  const weekStart = getWeekStart(baseDate);
  const days = Array.from({ length: 7 }, (_, idx) => {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + idx);
    return d;
  });

  const eventsBySlot = {};
  events.forEach((event) => {
    if (!event.date) return;
    const hour = parseHour(event.startTime);
    const slotKey = `${event.date}::${hour === null ? 'all-day' : hour}`;
    if (!eventsBySlot[slotKey]) eventsBySlot[slotKey] = [];
    eventsBySlot[slotKey].push(event);
  });

  const renderEvents = (dateStr, hour) => {
    const slotKey = `${dateStr}::${hour === null ? 'all-day' : hour}`;
    const slotEvents = eventsBySlot[slotKey] || [];
    return slotEvents.map((event) => (
      <View key={event.id} style={[styles.weekEventChip, { backgroundColor: colors.accentDim }]}>
        <Text style={[styles.weekEventText, { color: colors.text }]} numberOfLines={1}>
          {event.title}
        </Text>
      </View>
    ));
  };

  return (
    <View style={[styles.weekWrap, { backgroundColor: colors.card }]}>
      <View style={[styles.weekHeaderRow, { borderBottomColor: colors.textDim + '30' }]}>
        <View style={styles.weekTimeHeader} />
        {days.map((date) => {
          const dateStr = toLocalDateString(date);
          const todayStr = new Date().toISOString().slice(0, 10);
          const isToday = dateStr === todayStr;
          const holidays = getKoreanPublicHolidaySet(date.getFullYear());
          const holidayOrWeekend = isWeekend(date) || holidays.has(dateStr);
          const dayEventCount = events.filter((e) => e.date === dateStr).length;
          return (
            <TouchableOpacity
              key={dateStr}
              style={styles.weekDayHeader}
              onPress={() => onSelectDate(dateStr)}
            >
              <Text style={[styles.weekDayName, { color: colors.textDim }, holidayOrWeekend && !isToday && { color: colors.holiday }]}>
                {date.toLocaleDateString('en-US', { weekday: 'short' })}
              </Text>
              <View style={[styles.weekDayDateWrap, isToday && { backgroundColor: colors.accent }]}>
                <Text style={[styles.weekDayDate, { color: colors.text }, holidayOrWeekend && !isToday && { color: colors.holiday }, isToday && { color: '#fff' }]}>
                  {date.getDate()}
                </Text>
              </View>
              <DayDots count={dayEventCount} dotColor={colors.dotColor} />
            </TouchableOpacity>
          );
        })}
      </View>
      <ScrollView style={styles.weekGridScroll} contentContainerStyle={styles.weekGridContent}>
        <View style={[styles.weekRow, styles.weekRowAllDay, { borderBottomColor: colors.textDim + '20', backgroundColor: colors.textDim + '10' }]}>
          <View style={[styles.weekTimeCol, { borderRightColor: colors.textDim + '30' }]}>
            <Text style={[styles.weekTimeText, { color: colors.textDim }]}>All-day</Text>
          </View>
          {days.map((date) => {
            const dateStr = toLocalDateString(date);
            return (
              <View key={`all-day-${dateStr}`} style={[styles.weekCell, { borderRightColor: colors.textDim + '20' }]}>
                {renderEvents(dateStr, null)}
              </View>
            );
          })}
        </View>
        {Array.from({ length: 24 }, (_, hour) => (
          <View key={`hour-${hour}`} style={[styles.weekRow, { borderBottomColor: colors.textDim + '15' }]}>
            <View style={[styles.weekTimeCol, { borderRightColor: colors.textDim + '30' }]}>
              <Text style={[styles.weekTimeText, { color: colors.textDim }]}>{`${hour.toString().padStart(2, '0')}:00`}</Text>
            </View>
            {days.map((date) => {
              const dateStr = toLocalDateString(date);
              return (
                <View key={`${dateStr}-${hour}`} style={[styles.weekCell, { borderRightColor: colors.textDim + '15' }]}>
                  {renderEvents(dateStr, hour)}
                </View>
              );
            })}
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

function SwipeableWeekView({ baseDate, onWeekChange, events, onSelectDate, colors }) {
  const scrollRef = React.useRef(null);
  const [centerDate, setCenterDate] = React.useState(baseDate);
  const [pageWidth, setPageWidth] = React.useState(null);

  React.useEffect(() => {
    const baseTime = baseDate.getTime();
    setCenterDate((prev) => (prev.getTime() !== baseTime ? new Date(baseDate) : prev));
  }, [baseDate]);

  React.useEffect(() => {
    if (pageWidth > 0) {
      const id = requestAnimationFrame(() => {
        scrollRef.current?.scrollTo({ x: pageWidth, y: 0, animated: false });
      });
      return () => cancelAnimationFrame(id);
    }
  }, [pageWidth]);

  const onContainerLayout = React.useCallback((e) => {
    const w = e.nativeEvent.layout.width;
    if (w > 0) setPageWidth(w);
  }, []);

  const weeks = [getPrevWeek(centerDate), centerDate, getNextWeek(centerDate)];

  const handleScrollEnd = React.useCallback(
    (e) => {
      if (!pageWidth) return;
      const offsetX = e.nativeEvent.contentOffset.x;
      const page = Math.round(offsetX / pageWidth);

      if (page === 0) {
        const prev = getPrevWeek(centerDate);
        setCenterDate(prev);
        onWeekChange?.(prev);
        requestAnimationFrame(() => {
          scrollRef.current?.scrollTo({ x: pageWidth, y: 0, animated: false });
        });
      } else if (page === 2) {
        const next = getNextWeek(centerDate);
        setCenterDate(next);
        onWeekChange?.(next);
        requestAnimationFrame(() => {
          scrollRef.current?.scrollTo({ x: pageWidth, y: 0, animated: false });
        });
      }
    },
    [centerDate, pageWidth, onWeekChange]
  );

  const width = pageWidth ?? Dimensions.get('window').width;

  return (
    <View style={{ flex: 1, overflow: 'hidden' }} onLayout={onContainerLayout}>
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        decelerationRate="fast"
        onMomentumScrollEnd={handleScrollEnd}
        contentContainerStyle={{ flexGrow: 1 }}
      >
        {weeks.map((d, i) => (
          <View key={d.getTime()} style={{ width: pageWidth || width }}>
            <WeekView baseDate={d} events={events} onSelectDate={onSelectDate} colors={colors} />
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

function HomeScreen({
  onSelectDate,
  selectedEvent,
  setSelectedEvent,
  onEventFormSave,
}) {
  const { events, addEvent, addEvents, deleteEvent } = useEvents();
  const { colors } = useTheme();
  const [viewMode, setViewMode] = useState('month');
  const [pasteModalVisible, setPasteModalVisible] = useState(false);
  const [pasteText, setPasteText] = useState('');
  const [extracting, setExtracting] = useState(false);
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [imageExtractVisible, setImageExtractVisible] = useState(false);
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [previewDate, setPreviewDate] = useState(null);
  const [weekBaseDate, setWeekBaseDate] = useState(new Date());

  const today = new Date().toISOString().slice(0, 10);
  const displayDate = previewDate || today;

  const monthOpacity = useRef(new Animated.Value(1)).current;
  const weekOpacity = useRef(new Animated.Value(0)).current;

  const prevViewMode = useRef(viewMode);
  useEffect(() => {
    if (prevViewMode.current !== 'week' && viewMode === 'week') {
      setWeekBaseDate(new Date(displayDate + 'T12:00:00'));
    }
    prevViewMode.current = viewMode;
  }, [viewMode, displayDate]);

  useEffect(() => {
    const duration = 180;
    if (viewMode === 'month') {
      Animated.parallel([
        Animated.timing(monthOpacity, { toValue: 1, duration, useNativeDriver: true }),
        Animated.timing(weekOpacity, { toValue: 0, duration, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(monthOpacity, { toValue: 0, duration, useNativeDriver: true }),
        Animated.timing(weekOpacity, { toValue: 1, duration, useNativeDriver: true }),
      ]).start();
    }
  }, [viewMode]);
  const marked = getMarkedDates(events, colors.dotColor, displayDate);
  const eventCountByDate = getEventsCountByDate(events);
  const todayDate = new Date();

  const handleExtractAndAdd = async () => {
    const trimmed = pasteText.trim();
    if (!trimmed) return;
    setExtracting(true);
    try {
      const extracted = await extractEventsFromText(trimmed, today);
      if (extracted.length === 0) {
        Alert.alert('No events found', 'Could not find any schedule in the pasted text.');
      } else {
        await addEvents(extracted);
        setPasteModalVisible(false);
        setPasteText('');
        Alert.alert('Done', `Added ${extracted.length} event(s) to your calendar.`);
      }
    } catch (err) {
      Alert.alert('Error', err.message || 'Failed to extract events.');
    } finally {
      setExtracting(false);
    }
  };

  const handleAddEventSave = async (event) => {
    if (event.id) {
      await onEventFormSave(event);
    } else {
      await addEvent(event);
      setAddModalVisible(false);
    }
  };

  const handleImageExtractConfirm = async (extracted) => {
    if (extracted?.length) {
      await addEvents(extracted);
      Alert.alert('Done', `Added ${extracted.length} event(s) to your calendar.`);
    }
    setImageExtractVisible(false);
  };

  if (settingsVisible) {
    return <SettingsScreen onBack={() => setSettingsVisible(false)} />;
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]} edges={['top']}>
      <View style={[styles.header, { borderBottomColor: colors.textDim + '30' }]}>
        <Text style={[styles.title, { color: colors.text }]}>Calendar</Text>
        <View style={styles.toggleRow}>
          <TouchableOpacity
            style={[styles.toggleBtn, { backgroundColor: colors.card }, viewMode === 'month' && { backgroundColor: colors.accent }]}
            onPress={() => setViewMode('month')}
          >
            <Text style={[styles.toggleText, { color: colors.textDim }, viewMode === 'month' && { color: colors.text }]}>Month</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.toggleBtn, { backgroundColor: colors.card }, viewMode === 'week' && { backgroundColor: colors.accent }]}
            onPress={() => setViewMode('week')}
          >
            <Text style={[styles.toggleText, { color: colors.textDim }, viewMode === 'week' && { color: colors.text }]}>Week</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.toggleBtn, { backgroundColor: colors.card }]}
            onPress={() => setSettingsVisible(true)}
          >
            <Text style={[styles.toggleText, { color: colors.text }]}>⚙️</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.calendarWrap}>
        <Animated.View
          style={[styles.calendarViewOverlay, { opacity: monthOpacity }]}
          pointerEvents={viewMode === 'month' ? 'auto' : 'none'}
        >
          <SwipeableCalendar
            currentMonth={displayDate.replace(/\d{2}$/, '01')}
            onMonthChange={(monthFirst) => setPreviewDate(monthFirst)}
            theme={{
              backgroundColor: colors.bg,
              calendarBackground: colors.bg,
              textSectionTitleColor: colors.textDim,
              selectedDayBackgroundColor: colors.accent,
              selectedDayTextColor: colors.text,
              todayTextColor: colors.accent,
              dayTextColor: colors.text,
              textDisabledColor: colors.textDim,
              monthTextColor: colors.text,
              arrowColor: colors.accent,
              dotColor: colors.dotColor,
              selectedDotColor: colors.text,
            }}
            markedDates={marked}
            onDayPress={(day) => setPreviewDate(day.dateString)}
            dayComponent={({ date, state, displayMonth }) => {
              const dateObj = new Date(`${date.dateString}T00:00:00`);
              const holidays = getKoreanPublicHolidaySet(dateObj.getFullYear());
              const holidayOrWeekend = isWeekend(dateObj) || holidays.has(date.dateString);
              const isCurrentMonth = displayMonth && date.dateString.startsWith(displayMonth.slice(0, 7));
              const isToday = date.dateString === today;
              const disabled = state === 'disabled';
              const count = eventCountByDate[date.dateString] || 0;
              const textColor = isToday
                ? '#fff'
                : disabled
                  ? colors.textDim
                  : !isCurrentMonth
                    ? colors.textDim
                    : holidayOrWeekend
                      ? colors.holiday
                      : colors.text;
              return (
                <TouchableOpacity
                  style={styles.dayCell}
                  onPress={() => setPreviewDate(date.dateString)}
                  disabled={disabled}
                >
                  <View style={[styles.dayNumWrap, isToday && { backgroundColor: colors.accent }]}>
                    <Text style={[styles.dayText, { color: textColor }]}>
                      {date.day}
                    </Text>
                  </View>
                  <DayDots count={count} dotColor={colors.dotColor} />
                </TouchableOpacity>
              );
            }}
            style={styles.calendar}
          />
        </Animated.View>
        <Animated.View
          style={[styles.calendarViewOverlay, { opacity: weekOpacity }]}
          pointerEvents={viewMode === 'week' ? 'auto' : 'none'}
        >
          <SwipeableWeekView
            baseDate={weekBaseDate}
            onWeekChange={(d) => {
              setWeekBaseDate(d);
              setPreviewDate(toLocalDateString(d));
            }}
            events={events}
            onSelectDate={(d) => setPreviewDate(d)}
            colors={colors}
          />
        </Animated.View>
      </View>

      <SchedulePreview
        dateStr={displayDate}
        events={events}
        onPressHeader={() => onSelectDate(displayDate)}
        onEventPress={(e) => setSelectedEvent(e)}
      />

      <View style={styles.actions}>
        <TouchableOpacity style={[styles.actionBtn, { backgroundColor: colors.card }]} onPress={() => setPasteModalVisible(true)}>
          <Text style={[styles.actionBtnText, { color: colors.text }]}>Paste & Extract</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionBtn, { backgroundColor: colors.card }]}
          onPress={() => setImageExtractVisible(true)}
        >
          <Text style={[styles.actionBtnText, { color: colors.text }]}>📷 Images</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionBtn, styles.actionBtnPrimary, { backgroundColor: colors.accent }]}
          onPress={() => setAddModalVisible(true)}
        >
          <Text style={styles.actionBtnTextPrimary}>+ Add Event</Text>
        </TouchableOpacity>
      </View>

      <Modal visible={pasteModalVisible} animationType="slide" transparent>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <View style={[styles.modalCard, { backgroundColor: colors.bg }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Paste text to extract events</Text>
            <Text style={[styles.modalHint, { color: colors.textDim }]}>KakaoTalk, SMS, emails, etc.</Text>
            <TextInput
              style={[styles.pasteInput, { backgroundColor: colors.card, color: colors.text }]}
              placeholder="Paste your message here..."
              placeholderTextColor={colors.textDim}
              value={pasteText}
              onChangeText={setPasteText}
              multiline
              numberOfLines={6}
              textAlignVertical="top"
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: colors.card }]}
                onPress={() => {
                  setPasteModalVisible(false);
                  setPasteText('');
                }}
              >
                <Text style={[styles.modalBtnText, { color: colors.textDim }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalBtnPrimary, { backgroundColor: colors.accent }]}
                onPress={handleExtractAndAdd}
                disabled={extracting || !pasteText.trim()}
              >
                {extracting ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.modalBtnTextPrimary}>Extract & Add</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <Modal visible={addModalVisible} animationType="slide" transparent>
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <TouchableOpacity
            style={styles.modalOverlayTouch}
            activeOpacity={1}
            onPress={() => setAddModalVisible(false)}
          />
          <View style={[styles.modalCard, styles.addEventModalCard, { backgroundColor: colors.bg }]}>
            <AddEventForm
              selectedDate={displayDate}
              onSave={handleAddEventSave}
              onCancel={() => setAddModalVisible(false)}
            />
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <EventDetailScreen
        event={selectedEvent}
        visible={!!selectedEvent}
        onClose={() => setSelectedEvent(null)}
        onSave={onEventFormSave}
        onDelete={async (id) => {
          await deleteEvent(id);
          setSelectedEvent(null);
        }}
      />

      <ImageExtractFlow
        visible={imageExtractVisible}
        onClose={() => setImageExtractVisible(false)}
        onConfirm={handleImageExtractConfirm}
        todayStr={today}
        existingEvents={events}
      />
    </SafeAreaView>
  );
}

export default function AppNavigator() {
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const { events, loaded, updateEvent, deleteEvent } = useEvents();
  const { colors } = useTheme();

  const handleEventFormSave = async (event) => {
    if (event.id) {
      const { id, ...updates } = event;
      await updateEvent(id, updates);
      setSelectedEvent({ ...event });
    }
  };

  if (!loaded) {
    return (
      <SafeAreaView style={[styles.safe, styles.centered, { backgroundColor: colors.bg }]} edges={['top']}>
        <ActivityIndicator size="large" color={colors.accent} />
      </SafeAreaView>
    );
  }

  if (selectedDate) {
    const dayEvents = events.filter((e) => e.date === selectedDate);
    return (
      <>
        <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]} edges={['top']}>
          <View style={[styles.header, { borderBottomColor: colors.textDim + '30' }]}>
            <TouchableOpacity onPress={() => setSelectedDate(null)}>
              <Text style={[styles.backBtn, { color: colors.accent }]}>← Back</Text>
            </TouchableOpacity>
            <Text style={[styles.title, { color: colors.text }]}>{selectedDate}</Text>
          </View>
          <ScrollView style={styles.detailScroll} contentContainerStyle={styles.detailContent}>
            <EventList
              events={dayEvents}
              date={selectedDate}
              showDelete
              onEventPress={(e) => setSelectedEvent(e)}
            />
          </ScrollView>
        </SafeAreaView>
        <EventDetailScreen
          event={selectedEvent}
          visible={!!selectedEvent}
          onClose={() => {
            setSelectedEvent(null);
            setSelectedDate(null);
          }}
          onSave={handleEventFormSave}
          onDelete={async (id) => {
            await deleteEvent(id);
            setSelectedEvent(null);
          }}
        />
      </>
    );
  }

  return (
    <HomeScreen
      onSelectDate={setSelectedDate}
      selectedEvent={selectedEvent}
      setSelectedEvent={setSelectedEvent}
      onEventFormSave={handleEventFormSave}
    />
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  centered: { justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  title: { fontSize: 20, fontWeight: '700' },
  backBtn: { fontSize: 16, marginRight: 12 },
  toggleRow: { flexDirection: 'row', gap: 8 },
  toggleBtn: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  toggleText: { fontWeight: '600' },
  calendarWrap: { flex: 1, padding: 12, minHeight: 280, position: 'relative' },
  calendarViewOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  calendar: { borderRadius: 12 },
  dayCell: { alignItems: 'center', justifyContent: 'center' },
  dayNumWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayText: { textAlign: 'center', fontSize: 16 },
  dayDotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    marginTop: 2,
  },
  dayDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  actions: {
    flexDirection: 'row',
    padding: 20,
    gap: 12,
    paddingBottom: 32,
  },
  actionBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  actionBtnPrimary: {},
  actionBtnText: { fontWeight: '600' },
  actionBtnTextPrimary: { color: '#fff', fontWeight: '600' },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modalOverlayTouch: { flex: 1 },
  modalCard: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    paddingBottom: 40,
  },
  addEventModalCard: {
    maxHeight: '90%',
    paddingBottom: 0,
  },
  modalTitle: { fontSize: 18, fontWeight: '700' },
  modalHint: { fontSize: 13, marginTop: 4, marginBottom: 12 },
  pasteInput: {
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    minHeight: 120,
    textAlignVertical: 'top',
    marginBottom: 16,
  },
  modalActions: { flexDirection: 'row', gap: 12 },
  modalBtn: {
    flex: 1,
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  modalBtnPrimary: {},
  modalBtnText: { fontWeight: '600' },
  modalBtnTextPrimary: { color: '#fff', fontWeight: '600' },
  detailScroll: { flex: 1 },
  detailContent: { paddingBottom: 32 },
  weekWrap: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  weekHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  weekTimeHeader: { width: 58 },
  weekDayHeader: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 4,
    borderRadius: 8,
  },
  weekDayName: { fontSize: 12, fontWeight: '600' },
  weekDayDateWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  weekDayDate: { fontSize: 16, fontWeight: '700' },
  weekGridScroll: { maxHeight: 520 },
  weekGridContent: { paddingBottom: 24 },
  weekRow: {
    flexDirection: 'row',
    minHeight: 48,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  weekRowAllDay: { minHeight: 56, backgroundColor: 'rgba(255,255,255,0.02)' },
  weekTimeCol: {
    width: 58,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    borderRightWidth: 1,
    borderRightColor: 'rgba(255,255,255,0.08)',
  },
  weekTimeText: { fontSize: 11, fontWeight: '600' },
  weekCell: {
    flex: 1,
    paddingHorizontal: 4,
    paddingVertical: 4,
    borderRightWidth: 1,
    borderRightColor: 'rgba(255,255,255,0.06)',
  },
  weekEventChip: {
    borderRadius: 6,
    paddingVertical: 2,
    paddingHorizontal: 6,
    marginBottom: 4,
  },
  weekEventText: { fontSize: 11, fontWeight: '600' },
});
