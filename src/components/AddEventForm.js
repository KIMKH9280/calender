import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Platform,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';

const BOTTOM_PADDING = 40;

function toDateStr(date) {
  const y = date.getFullYear();
  const m = `${date.getMonth() + 1}`.padStart(2, '0');
  const d = `${date.getDate()}`.padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function toTimeStr(date) {
  const h = `${date.getHours()}`.padStart(2, '0');
  const m = `${date.getMinutes()}`.padStart(2, '0');
  return `${h}:${m}`;
}

function formatDateReadable(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

function formatTimeDisplay(str) {
  if (!str || typeof str !== 'string') return '';
  const cleaned = str.replace(/\D/g, '');
  if (cleaned.length === 4) {
    return `${cleaned.slice(0, 2)}:${cleaned.slice(2)}`;
  }
  if (cleaned.length >= 2) {
    return `${cleaned.slice(0, 2)}:${(cleaned.slice(2) || '00').padEnd(2, '0')}`;
  }
  return str;
}

function parseTime(str) {
  if (!str || typeof str !== 'string') return null;
  const cleaned = str.replace(/\D/g, '');
  if (cleaned.length >= 2) {
    const h = Math.min(23, Math.max(0, parseInt(cleaned.slice(0, 2), 10) || 0));
    const min = Math.min(59, Math.max(0, parseInt((cleaned.slice(2) || '00').slice(0, 2), 10) || 0));
    const d = new Date();
    d.setHours(h, min, 0, 0);
    return d;
  }
  return null;
}

export function AddEventForm({ onSave, onCancel, initialEvent, selectedDate }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const bottomPadding = Math.max(BOTTOM_PADDING, insets.bottom);
  const today = new Date().toISOString().slice(0, 10);
  const isEdit = !!initialEvent;
  const defaultDate = initialEvent?.date ?? selectedDate ?? today;

  const [title, setTitle] = useState(initialEvent?.title ?? '');
  const [date, setDate] = useState(defaultDate);
  const [startTime, setStartTime] = useState(initialEvent?.startTime ?? '');
  const [endTime, setEndTime] = useState(initialEvent?.endTime ?? '');
  const [location, setLocation] = useState(initialEvent?.location ?? '');
  const [description, setDescription] = useState(initialEvent?.description ?? '');

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);

  const dateObj = useMemo(() => {
    const [y, m, d] = (date || today).split('-').map(Number);
    return new Date(y, (m || 1) - 1, d || 1);
  }, [date, today]);

  const startTimeObj = useMemo(() => {
    const parsed = parseTime(startTime);
    if (parsed) return parsed;
    const d = new Date();
    d.setHours(9, 0, 0, 0);
    return d;
  }, [startTime]);

  const endTimeObj = useMemo(() => {
    const parsed = parseTime(endTime);
    if (parsed) return parsed;
    const d = new Date();
    d.setHours(10, 0, 0, 0);
    return d;
  }, [endTime]);

  const handleDateChange = (event, value) => {
    if (Platform.OS === 'android') setShowDatePicker(false);
    if (event.type === 'set' && value) setDate(toDateStr(value));
  };

  const handleStartTimeChange = (event, value) => {
    if (Platform.OS === 'android') setShowStartPicker(false);
    if (event.type === 'set' && value) setStartTime(toTimeStr(value));
  };

  const handleEndTimeChange = (event, value) => {
    if (Platform.OS === 'android') setShowEndPicker(false);
    if (event.type === 'set' && value) setEndTime(toTimeStr(value));
  };

  const handleSave = () => {
    const trimmed = title.trim();
    if (!trimmed) return;
    const payload = {
      title: trimmed,
      date: date || today,
      startTime: startTime.trim() || undefined,
      endTime: endTime.trim() || undefined,
      location: location.trim() || undefined,
      description: description.trim() || undefined,
    };
    if (isEdit && initialEvent.id) {
      onSave({ id: initialEvent.id, ...payload });
    } else {
      onSave(payload);
    }
  };

  return (
    <View style={styles.wrap}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={true}
        contentContainerStyle={[styles.scroll, { paddingBottom: bottomPadding }]}
      >
        <Text style={[styles.formTitle, { color: colors.text }]}>{isEdit ? 'Edit event' : 'New event'}</Text>
        <TextInput
          style={[styles.input, { backgroundColor: colors.card, color: colors.text }]}
          placeholder="Title *"
          placeholderTextColor={colors.textDim}
          value={title}
          onChangeText={setTitle}
          autoCapitalize="sentences"
        />

        <TouchableOpacity
          style={[styles.input, styles.pickerTouch, { backgroundColor: colors.card }]}
          onPress={() => setShowDatePicker(true)}
        >
          <Text style={[styles.pickerText, date ? { color: colors.text } : { color: colors.textDim }]}>
            {date ? formatDateReadable(date) : 'Select date'}
          </Text>
        </TouchableOpacity>

        <TextInput
          style={[styles.input, { backgroundColor: colors.card, color: colors.text }]}
          placeholder="Location (optional)"
          placeholderTextColor={colors.textDim}
          value={location}
          onChangeText={setLocation}
        />

        <View style={styles.row}>
          <TouchableOpacity
            style={[styles.input, styles.halfLeft, styles.rowInput, styles.pickerTouch, { backgroundColor: colors.card }]}
            onPress={() => setShowStartPicker(true)}
          >
            <Text style={[styles.pickerText, startTime ? { color: colors.text } : { color: colors.textDim }]}>
              {startTime ? formatTimeDisplay(startTime) : 'Start time'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.input, styles.halfRight, styles.rowInput, styles.pickerTouch, { backgroundColor: colors.card }]}
            onPress={() => setShowEndPicker(true)}
          >
            <Text style={[styles.pickerText, endTime ? { color: colors.text } : { color: colors.textDim }]}>
              {endTime ? formatTimeDisplay(endTime) : 'End time'}
            </Text>
          </TouchableOpacity>
        </View>

        {showDatePicker && (
          <>
            <DateTimePicker
              value={dateObj}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={handleDateChange}
            />
            {Platform.OS === 'ios' && (
              <TouchableOpacity style={styles.doneRow} onPress={() => setShowDatePicker(false)}>
                <Text style={[styles.doneText, { color: colors.accent }]}>Done</Text>
              </TouchableOpacity>
            )}
          </>
        )}

        {showStartPicker && (
          <>
            <DateTimePicker
              value={startTimeObj}
              mode="time"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={handleStartTimeChange}
            />
            {Platform.OS === 'ios' && (
              <TouchableOpacity style={styles.doneRow} onPress={() => setShowStartPicker(false)}>
                <Text style={[styles.doneText, { color: colors.accent }]}>Done</Text>
              </TouchableOpacity>
            )}
          </>
        )}

        {showEndPicker && (
          <>
            <DateTimePicker
              value={endTimeObj}
              mode="time"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={handleEndTimeChange}
            />
            {Platform.OS === 'ios' && (
              <TouchableOpacity style={styles.doneRow} onPress={() => setShowEndPicker(false)}>
                <Text style={[styles.doneText, { color: colors.accent }]}>Done</Text>
              </TouchableOpacity>
            )}
          </>
        )}

        <TextInput
          style={[styles.input, styles.area, { backgroundColor: colors.card, color: colors.text }]}
          placeholder="Description (optional)"
          placeholderTextColor={colors.textDim}
          value={description}
          onChangeText={setDescription}
          multiline
          numberOfLines={3}
        />

        <View style={styles.actions}>
          <TouchableOpacity style={[styles.cancelBtn, { backgroundColor: colors.card }]} onPress={onCancel}>
            <Text style={[styles.cancelBtnText, { color: colors.textDim }]}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.saveBtn, { backgroundColor: colors.accent }, !title.trim() && styles.saveBtnDisabled]}
            onPress={handleSave}
            disabled={!title.trim()}
          >
            <Text style={styles.saveBtnText}>Save</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, minHeight: 0 },
  scroll: { padding: 20, paddingBottom: 32 },
  formTitle: { fontSize: 18, fontWeight: '700', marginBottom: 16 },
  input: {
    borderRadius: 10,
    padding: 14,
    fontSize: 16,
    marginBottom: 12,
  },
  pickerTouch: { justifyContent: 'center' },
  pickerText: { fontSize: 16 },
  halfLeft: { flex: 1, marginRight: 6 },
  halfRight: { flex: 1 },
  row: { flexDirection: 'row', marginBottom: 12 },
  rowInput: { marginBottom: 0 },
  area: { minHeight: 72, textAlignVertical: 'top' },
  doneRow: { marginTop: -8, marginBottom: 12, alignItems: 'flex-end' },
  doneText: { fontSize: 16, fontWeight: '600' },
  actions: { flexDirection: 'row', marginTop: 8, gap: 12 },
  cancelBtn: { flex: 1, padding: 14, alignItems: 'center', borderRadius: 10 },
  cancelBtnText: { fontWeight: '600' },
  saveBtn: { flex: 1, padding: 14, alignItems: 'center', borderRadius: 10 },
  saveBtnDisabled: { opacity: 0.5 },
  saveBtnText: { color: '#fff', fontWeight: '600' },
});
