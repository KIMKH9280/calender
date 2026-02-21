import React, { useState, useRef, useCallback, useEffect } from 'react';
import { View, ScrollView, Dimensions } from 'react-native';
import { Calendar } from 'react-native-calendars';

function getMonthDate(year, month) {
  return `${year}-${String(month).padStart(2, '0')}-01`;
}

function getPrevMonth(dateStr) {
  const [y, m] = dateStr.split('-').map(Number);
  if (m === 1) return getMonthDate(y - 1, 12);
  return getMonthDate(y, m - 1);
}

function getNextMonth(dateStr) {
  const [y, m] = dateStr.split('-').map(Number);
  if (m === 12) return getMonthDate(y + 1, 1);
  return getMonthDate(y, m + 1);
}

export function SwipeableCalendar({
  currentMonth,
  onMonthChange,
  theme,
  markedDates,
  onDayPress,
  dayComponent,
  style,
}) {
  const scrollRef = useRef(null);
  const [centerMonth, setCenterMonth] = useState(currentMonth);
  const [pageWidth, setPageWidth] = useState(null);

  useEffect(() => {
    setCenterMonth((prev) => (prev !== currentMonth ? currentMonth : prev));
  }, [currentMonth]);

  useEffect(() => {
    if (pageWidth > 0) {
      const id = requestAnimationFrame(() => {
        scrollRef.current?.scrollTo({ x: pageWidth, y: 0, animated: false });
      });
      return () => cancelAnimationFrame(id);
    }
  }, [pageWidth]);

  const onContainerLayout = useCallback((e) => {
    const w = e.nativeEvent.layout.width;
    if (w > 0) setPageWidth(w);
  }, []);

  const months = [
    getPrevMonth(centerMonth),
    centerMonth,
    getNextMonth(centerMonth),
  ];

  const handleScrollEnd = useCallback(
    (e) => {
      if (!pageWidth) return;
      const offsetX = e.nativeEvent.contentOffset.x;
      const page = Math.round(offsetX / pageWidth);

      if (page === 0) {
        const prev = getPrevMonth(centerMonth);
        setCenterMonth(prev);
        onMonthChange?.(prev);
        requestAnimationFrame(() => {
          scrollRef.current?.scrollTo({ x: pageWidth, y: 0, animated: false });
        });
      } else if (page === 2) {
        const next = getNextMonth(centerMonth);
        setCenterMonth(next);
        onMonthChange?.(next);
        requestAnimationFrame(() => {
          scrollRef.current?.scrollTo({ x: pageWidth, y: 0, animated: false });
        });
      }
    },
    [centerMonth, pageWidth, onMonthChange]
  );

  const renderDayComponent = useCallback(
    (monthStr) =>
      dayComponent
        ? (props) => dayComponent({ ...props, displayMonth: monthStr })
        : undefined,
    [dayComponent]
  );

  const width = pageWidth ?? Dimensions.get('window').width;

  return (
    <View style={[{ flex: 1, overflow: 'hidden' }, style]} onLayout={onContainerLayout}>
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        decelerationRate="fast"
        onMomentumScrollEnd={handleScrollEnd}
        contentContainerStyle={{ flexGrow: 1 }}
      >
        {months.map((month) => (
          <View key={month} style={{ width: pageWidth || width }}>
            <Calendar
              current={month}
              hideArrows
              onDayPress={onDayPress}
              markedDates={markedDates}
              theme={theme}
              style={{ borderRadius: 12 }}
              dayComponent={renderDayComponent(month)}
            />
          </View>
        ))}
      </ScrollView>
    </View>
  );
}
