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
import { VoiceInputFlow } from '../components/VoiceInputFlow';
import { SettingsScreen } from '../components/SettingsScreen';
import { SchedulePreview } from '../components/SchedulePreview';
import { EventDetailScreen } from '../components/EventDetailScreen';
import { SwipeableCalendar } from '../components/SwipeableCalendar';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';

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

function getNextWeekday(date) {
  const d = new Date(date);
  const day = d.getDay();
  if (day === 0) d.setDate(d.getDate() + 1);
  else if (day === 6) d.setDate(d.getDate() + 2);
  return d;
}

function getKoreanPublicHolidaySet(year) {
  if (HOLIDAY_CACHE[year]) return HOLIDAY_CACHE[year];
  const holidays = new Set();
  FIXED_KOREAN_HOLIDAYS.forEach(({ month, day }) => {
    const date = new Date(year, month - 1, day);
    const m = `${month}`.padStart(2, '0');
    const d = `${day}`.padStart(2, '0');
    holidays.add(`${year}-${m}-${d}`);
    const dow = date.getDay();
    if (dow === 0 || dow === 6) {
      const sub = getNextWeekday(date);
      const sm = `${sub.getMonth() + 1}`.padStart(2, '0');
      const sd = `${sub.getDate()}`.padStart(2, '0');
      holidays.add(`${sub.getFullYear()}-${sm}-${sd}`);
    }
  });
  const lunar = LUNAR_KOREAN_HOLIDAYS_BY_YEAR[year] || [];
  lunar.forEach((dateStr) => {
    holidays.add(dateStr);
    const [y, m, d] = dateStr.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    const dow = date.getDay();
    if (dow === 0 || dow === 6) {
      const sub = getNextWeekday(date);
      const sm = `${sub.getMonth() + 1}`.padStart(2, '0');
      const sd = `${sub.getDate()}`.padStart(2, '0');
      holidays.add(`${sub.getFullYear()}-${sm}-${sd}`);
    }
  });
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
  start.setDate(start.getDate() - day);
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

function formatTimeForWeek(t, tFn) {
  if (!t) return tFn ? tFn('allDay') : 'All day';
  if (typeof t !== 'string') return tFn ? tFn('allDay') : 'All day';
  const cleaned = t.replace(/\D/g, '');
  if (cleaned.length >= 4) return `${cleaned.slice(0, 2)}:${cleaned.slice(2)}`;
  return t;
}

function WeekView({ baseDate, events, selectedDate, onSelectDate, onEventPress, colors, dateLocale, t, isCenter }) {
  const weekStart = getWeekStart(baseDate);
  const days = Array.from({ length: 7 }, (_, idx) => {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + idx);
    return d;
  });

  const todayStr = toLocalDateString(new Date());
  const weekStartStr = toLocalDateString(weekStart);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);
  const weekEndStr = toLocalDateString(weekEnd);
  const isSelectedInThisWeek = selectedDate && selectedDate >= weekStartStr && selectedDate <= weekEndStr;
  const effectiveSelected = isSelectedInThisWeek ? selectedDate : (isCenter ? todayStr : null);

  const weekEventCount = events.filter((e) => {
    if (!e.date) return false;
    return e.date >= toLocalDateString(weekStart) && e.date <= toLocalDateString(weekEnd);
  }).length;

  const eventsByDate = {};
  events.forEach((e) => {
    if (!e.date) return;
    if (!eventsByDate[e.date]) eventsByDate[e.date] = [];
    eventsByDate[e.date].push(e);
  });
  Object.keys(eventsByDate).forEach((d) => {
    eventsByDate[d].sort((a, b) => {
      const at = a.startTime || '';
      const bt = b.startTime || '';
      if (!at && !bt) return 0;
      if (!at) return 1;
      if (!bt) return -1;
      return at.localeCompare(bt);
    });
  });

  const loc = dateLocale || 'en-US';
  const weekRangeStr = `${weekStart.toLocaleDateString(loc, { month: 'short', day: 'numeric' })} – ${weekEnd.toLocaleDateString(loc, { month: 'short', day: 'numeric', year: 'numeric' })}`;
  const selectedEvents = eventsByDate[effectiveSelected || todayStr] || [];

  return (
    <View style={[styles.weekWrap, { backgroundColor: colors.card, flex: 1 }]}>
      <View style={[styles.weekSummaryRow, { borderBottomColor: colors.textDim + '20' }]}>
        <Text style={[styles.weekSummaryText, { color: colors.textDim }]}>
          {weekRangeStr} · {t ? t('eventsCount', { count: weekEventCount }) : `${weekEventCount} events`}
        </Text>
      </View>

      <View style={[styles.weekSevenRow, { borderBottomColor: colors.textDim + '25' }]}>
        {days.map((date) => {
          const dateStr = toLocalDateString(date);
          const isToday = dateStr === todayStr;
          const isSelected = dateStr === effectiveSelected;
          const holidays = getKoreanPublicHolidaySet(date.getFullYear());
          const holidayOrWeekend = isWeekend(date) || holidays.has(dateStr);
          const count = (eventsByDate[dateStr] || []).length;

          return (
            <TouchableOpacity
              key={dateStr}
              style={[
                styles.weekSevenCol,
                { borderRightColor: colors.textDim + '15' },
                isSelected && { backgroundColor: colors.accent + '20' },
                isToday && !isSelected && { backgroundColor: colors.accent + '10' },
              ]}
              onPress={() => onSelectDate?.(dateStr)}
              activeOpacity={0.7}
            >
              <Text style={[styles.weekSevenDayName, { color: colors.textDim }, holidayOrWeekend && !isToday && { color: colors.holiday }]}>
                {date.toLocaleDateString(loc, { weekday: 'short' })}
              </Text>
              <View style={[styles.weekSevenDateWrap, { backgroundColor: colors.textDim + '25' }, isToday && { backgroundColor: colors.accent }]}>
                <Text style={[styles.weekSevenDate, { color: colors.text }, isToday && { color: '#fff' }, holidayOrWeekend && !isToday && { color: colors.holiday }]}>
                  {date.getDate()}
                </Text>
              </View>
              {count > 0 && (
                <View style={[styles.weekSevenDot, { backgroundColor: colors.accent }]} />
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      {isCenter && (
      <ScrollView
        style={styles.weekListScroll}
        contentContainerStyle={styles.weekListContent}
        showsVerticalScrollIndicator={true}
      >
        <View style={[styles.weekSelectedHeader, { borderBottomColor: colors.textDim + '20' }]}>
          <Text style={[styles.weekSelectedLabel, { color: colors.textDim }]}>
            {new Date((effectiveSelected || todayStr) + 'T12:00:00').toLocaleDateString(loc, { weekday: 'long', month: 'short', day: 'numeric' })}
          </Text>
          <Text style={[styles.weekSelectedCount, { color: colors.textDim }]}>
            {t ? t('eventsCount', { count: selectedEvents.length }) : `${selectedEvents.length} event(s)`}
          </Text>
        </View>
        {selectedEvents.length === 0 ? (
          <Text style={[styles.weekDayBlockEmpty, { color: colors.textDim }]}>{t ? t('noEvents') : 'No events'}</Text>
        ) : (
          selectedEvents.map((event) => (
            <TouchableOpacity
              key={event.id}
              style={[styles.weekDayEventRow, { borderLeftColor: colors.accent, backgroundColor: colors.textDim + '12' }]}
              onPress={() => onEventPress?.(event)}
              activeOpacity={0.7}
            >
              <Text style={[styles.weekDayEventTime, { color: colors.textDim }]}>
                {formatTimeForWeek(event.startTime || event.endTime, t)}
              </Text>
              <Text style={[styles.weekDayEventTitle, { color: colors.text }]} numberOfLines={1}>
                {event.title}
              </Text>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
      )}
    </View>
  );
}

function SwipeableWeekView({ baseDate, onWeekChange, events, onSelectDate, onEventPress, colors, dateLocale, t }) {
  const scrollRef = React.useRef(null);
  const [centerDate, setCenterDate] = React.useState(baseDate);
  const [pageWidth, setPageWidth] = React.useState(null);
  const [selectedDate, setSelectedDate] = React.useState(() => toLocalDateString(new Date()));

  React.useEffect(() => {
    const baseTime = baseDate.getTime();
    setCenterDate((prev) => (prev.getTime() !== baseTime ? new Date(baseDate) : prev));
  }, [baseDate]);

  React.useEffect(() => {
    const refDate = selectedDate ? new Date(selectedDate + 'T12:00:00') : new Date();
    const weekday = refDate.getDay();
    const newWeekStart = getWeekStart(centerDate);
    const newDate = new Date(newWeekStart);
    newDate.setDate(newWeekStart.getDate() + weekday);
    const next = toLocalDateString(newDate);
    if (next !== selectedDate) setSelectedDate(next);
  }, [centerDate?.getTime?.()]);

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

  const pendingScroll = React.useRef(false);

  React.useLayoutEffect(() => {
    if (pendingScroll.current && pageWidth > 0 && scrollRef.current) {
      pendingScroll.current = false;
      scrollRef.current.scrollTo({ x: pageWidth, y: 0, animated: false });
    }
  }, [centerDate, pageWidth]);

  const handleSelectDate = React.useCallback(
    (dateStr) => {
      setSelectedDate(dateStr);
      onSelectDate?.(dateStr);
    },
    [onSelectDate]
  );

  const handleScrollEnd = React.useCallback(
    (e) => {
      if (!pageWidth) return;
      const offsetX = e.nativeEvent.contentOffset.x;
      const page = Math.round(offsetX / pageWidth);

      if (page === 0) {
        const prev = getPrevWeek(centerDate);
        pendingScroll.current = true;
        setCenterDate(prev);
        onWeekChange?.(prev);
      } else if (page === 2) {
        const next = getNextWeek(centerDate);
        pendingScroll.current = true;
        setCenterDate(next);
        onWeekChange?.(next);
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
          <View key={d.getTime()} style={{ width: pageWidth || width, flex: 1 }}>
            <WeekView
              baseDate={d}
              events={events}
              selectedDate={selectedDate}
              onSelectDate={handleSelectDate}
              onEventPress={onEventPress}
              colors={colors}
              dateLocale={dateLocale}
              t={t}
              isCenter={i === 1}
            />
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
  const { t, dateLocale } = useLanguage();
  const [viewMode, setViewMode] = useState('month');
  const [pasteModalVisible, setPasteModalVisible] = useState(false);
  const [pasteText, setPasteText] = useState('');
  const [extracting, setExtracting] = useState(false);
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [imageExtractVisible, setImageExtractVisible] = useState(false);
  const [voiceInputVisible, setVoiceInputVisible] = useState(false);
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [previewDate, setPreviewDate] = useState(null);
  const [weekBaseDate, setWeekBaseDate] = useState(new Date());

  const today = toLocalDateString(new Date());
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
        Alert.alert(t('noEvents'), t('pasteNoEvents'));
      } else {
        await addEvents(extracted);
        setPasteModalVisible(false);
        setPasteText('');
        Alert.alert(t('done'), t('addedCount', { count: extracted.length }));
      }
    } catch (err) {
      Alert.alert(t('error'), err.message || t('extractFailed'));
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
      Alert.alert(t('done'), t('addedCount', { count: extracted.length }));
    }
    setImageExtractVisible(false);
  };

  const handleVoiceInputConfirm = async (extracted) => {
    if (extracted?.length) {
      await addEvents(extracted);
      Alert.alert(t('done'), t('addedCount', { count: extracted.length }));
    }
    setVoiceInputVisible(false);
  };

  const goToToday = () => {
    setPreviewDate(today);
    setWeekBaseDate(new Date());
  };

  if (settingsVisible) {
    return <SettingsScreen onBack={() => setSettingsVisible(false)} />;
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]} edges={['top']}>
      <View style={[styles.header, { borderBottomColor: colors.textDim + '30' }]}>
        <Text style={[styles.title, { color: colors.text }]}>{t('calendar')}</Text>
        <View style={styles.headerRight}>
          <TouchableOpacity
            style={[styles.todayBtn, { backgroundColor: colors.card }]}
            onPress={goToToday}
          >
            <Text style={[styles.todayBtnText, { color: colors.accent }]}>{t('today')}</Text>
          </TouchableOpacity>
          <View style={styles.toggleRow}>
          <TouchableOpacity
            style={[styles.toggleBtn, { backgroundColor: colors.card }, viewMode === 'month' && { backgroundColor: colors.accent }]}
            onPress={() => setViewMode('month')}
          >
            <Text style={[styles.toggleText, { color: colors.textDim }, viewMode === 'month' && { color: colors.text }]}>{t('month')}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.toggleBtn, { backgroundColor: colors.card }, viewMode === 'week' && { backgroundColor: colors.accent }]}
            onPress={() => setViewMode('week')}
          >
            <Text style={[styles.toggleText, { color: colors.textDim }, viewMode === 'week' && { color: colors.text }]}>{t('week')}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.toggleBtn, { backgroundColor: colors.card }]}
            onPress={() => setSettingsVisible(true)}
          >
            <Text style={[styles.toggleText, { color: colors.text }]}>⚙️</Text>
          </TouchableOpacity>
          </View>
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
            onEventPress={(e) => setSelectedEvent(e)}
            colors={colors}
            dateLocale={dateLocale}
            t={t}
          />
        </Animated.View>
      </View>

      {viewMode === 'month' && (
        <SchedulePreview
          dateStr={displayDate}
          events={events}
          onPressHeader={() => onSelectDate(displayDate)}
          onEventPress={(e) => setSelectedEvent(e)}
        />
      )}

      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.actionBtnPrimary, { backgroundColor: colors.accent }]}
          onPress={() => setAddModalVisible(true)}
          activeOpacity={0.8}
        >
          <Text style={styles.actionBtnTextPrimary}>{t('addEvent')}</Text>
        </TouchableOpacity>
        <View style={styles.actionsSecondary}>
          <TouchableOpacity
            style={[styles.actionChip, { backgroundColor: colors.card }]}
            onPress={() => setVoiceInputVisible(true)}
          >
            <Text style={[styles.actionChipIcon, { color: colors.text }]}>🎤</Text>
            <Text style={[styles.actionChipText, { color: colors.text }]}>{t('voice')}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionChip, { backgroundColor: colors.card }]}
            onPress={() => setImageExtractVisible(true)}
          >
            <Text style={[styles.actionChipIcon, { color: colors.text }]}>📷</Text>
            <Text style={[styles.actionChipText, { color: colors.text }]}>{t('images')}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionChip, { backgroundColor: colors.card }]}
            onPress={() => setPasteModalVisible(true)}
          >
            <Text style={[styles.actionChipIcon, { color: colors.text }]}>📋</Text>
            <Text style={[styles.actionChipText, { color: colors.text }]}>{t('paste')}</Text>
          </TouchableOpacity>
        </View>
      </View>

      <Modal visible={pasteModalVisible} animationType="slide" transparent>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <View style={[styles.modalCard, { backgroundColor: colors.bg }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>{t('pasteModalTitle')}</Text>
            <Text style={[styles.modalHint, { color: colors.textDim }]}>{t('pasteModalHint')}</Text>
            <TextInput
              style={[styles.pasteInput, { backgroundColor: colors.card, color: colors.text }]}
              placeholder={t('pastePlaceholder')}
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
                <Text style={[styles.modalBtnText, { color: colors.textDim }]}>{t('cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalBtnPrimary, { backgroundColor: colors.accent }]}
                onPress={handleExtractAndAdd}
                disabled={extracting || !pasteText.trim()}
              >
                {extracting ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.modalBtnTextPrimary}>{t('extractAndAdd')}</Text>
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
          <View
            style={[
              styles.modalCard,
              styles.addEventModalCard,
              {
                backgroundColor: colors.bg,
                height: Dimensions.get('window').height * 0.85,
              },
            ]}
          >
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
      <VoiceInputFlow
        visible={voiceInputVisible}
        onClose={() => setVoiceInputVisible(false)}
        onConfirm={handleVoiceInputConfirm}
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
  const { t } = useLanguage();

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
              <Text style={[styles.backBtn, { color: colors.accent }]}>{t('back')}</Text>
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
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  todayBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  todayBtnText: { fontSize: 14, fontWeight: '600' },
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
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 32,
  },
  actionBtnPrimary: {
    width: '100%',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  actionBtnTextPrimary: { color: '#fff', fontWeight: '600', fontSize: 16 },
  actionsSecondary: {
    flexDirection: 'row',
    gap: 10,
  },
  actionChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    gap: 6,
  },
  actionChipIcon: { fontSize: 16 },
  actionChipText: { fontSize: 14, fontWeight: '600' },
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
    paddingBottom: 0,
    flexShrink: 0,
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
  weekSummaryRow: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    alignItems: 'center',
  },
  weekSummaryText: {
    fontSize: 13,
    fontWeight: '600',
  },
  weekSevenRow: {
    flexDirection: 'row',
    paddingVertical: 10,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
  },
  weekSevenCol: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 6,
    borderRightWidth: 1,
  },
  weekSevenDayName: { fontSize: 11, fontWeight: '600', marginBottom: 4 },
  weekSevenDateWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  weekSevenDate: { fontSize: 14, fontWeight: '700' },
  weekSevenDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 4,
  },
  weekSelectedHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
  },
  weekSelectedLabel: { fontSize: 15, fontWeight: '600' },
  weekSelectedCount: { fontSize: 13 },
  weekListScroll: { flex: 1 },
  weekListContent: { padding: 14, paddingBottom: 24 },
  weekDayBlockEmpty: { fontSize: 14 },
  weekDayEventRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 8,
    borderRadius: 8,
    borderLeftWidth: 3,
  },
  weekDayEventTime: { fontSize: 12, width: 50 },
  weekDayEventTitle: { flex: 1, fontSize: 15, fontWeight: '500' },
});
