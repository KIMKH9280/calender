import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Modal,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { AddEventForm } from './AddEventForm';

function formatTime(t) {
  if (!t) return '';
  if (t.length === 5 && t.includes(':')) return t;
  if (t.length === 4) return `${t.slice(0, 2)}:${t.slice(2)}`;
  return t;
}

function formatDate(dateStr, dateLocale = 'en-US') {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString(dateLocale, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
}

function formatDuration(startTime, endTime) {
  if (!startTime || !endTime) return null;
  return `${formatTime(startTime)} – ${formatTime(endTime)}`;
}

export function EventDetailScreen({ event, visible, onClose, onSave, onDelete }) {
  const { colors } = useTheme();
  const { t, dateLocale } = useLanguage();
  const insets = useSafeAreaInsets();
  const [editing, setEditing] = useState(false);
  if (!event) return null;

  const handleDelete = () => {
    Alert.alert(
      t('deleteEvent'),
      t('deleteConfirm', { title: event.title }),
      [
        { text: t('cancel'), style: 'cancel' },
        { text: t('delete'), style: 'destructive', onPress: () => onDelete?.(event.id) },
      ]
    );
  };

  const handleEditSave = async (data) => {
    await onSave?.(data);
    setEditing(false);
  };

  if (editing) {
    return (
      <Modal
        visible={visible}
        animationType="slide"
        presentationStyle="fullScreen"
      >
        <KeyboardAvoidingView
          style={[styles.safe, { backgroundColor: colors.bg, paddingTop: insets.top }]}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={[styles.header, { borderBottomColor: colors.textDim + '30' }]}>
            <TouchableOpacity
              onPress={() => setEditing(false)}
              style={[styles.backBtnWrap, { backgroundColor: colors.accent + '15' }]}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              activeOpacity={0.7}
            >
              <Text style={[styles.backBtn, { color: colors.accent }]}>← {t('cancel')}</Text>
            </TouchableOpacity>
          </View>
          <AddEventForm
            initialEvent={event}
            onSave={handleEditSave}
            onCancel={() => setEditing(false)}
          />
        </KeyboardAvoidingView>
      </Modal>
    );
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
    >
      <View style={[styles.safe, { backgroundColor: colors.bg, paddingTop: insets.top }]}>
        <View style={[styles.header, { borderBottomColor: colors.textDim + '30' }]}>
          <TouchableOpacity
            onPress={onClose}
            style={[styles.backBtnWrap, { backgroundColor: colors.accent + '15' }]}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            activeOpacity={0.7}
          >
            <Text style={[styles.backBtn, { color: colors.accent }]}>{t('home')}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setEditing(true)}
            style={styles.headerBtn}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            activeOpacity={0.7}
          >
            <Text style={[styles.editBtn, { color: colors.accent }]}>{t('edit')}</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
          <Text style={[styles.title, { color: colors.text }]}>{event.title}</Text>

          <View style={[styles.section, { backgroundColor: colors.card }]}>
            <Text style={[styles.sectionLabel, { color: colors.textDim }]}>{t('date')}</Text>
            <Text style={[styles.sectionValue, { color: colors.text }]}>{formatDate(event.date, dateLocale)}</Text>
          </View>

          {(event.startTime || event.endTime) && (
            <View style={[styles.section, { backgroundColor: colors.card }]}>
              <Text style={[styles.sectionLabel, { color: colors.textDim }]}>
                {event.startTime && event.endTime ? t('timeAndDuration') : t('time')}
              </Text>
              <Text style={[styles.sectionValue, { color: colors.text }]}>
                {event.startTime && event.endTime
                  ? formatDuration(event.startTime, event.endTime)
                  : event.startTime
                  ? formatTime(event.startTime)
                  : t('allDay')}
              </Text>
            </View>
          )}

          {event.location ? (
            <View style={[styles.section, { backgroundColor: colors.card }]}>
              <Text style={[styles.sectionLabel, { color: colors.textDim }]}>{t('location')}</Text>
              <Text style={[styles.sectionValue, { color: colors.text }]}>📍 {event.location}</Text>
            </View>
          ) : null}

          {(event.description || event.notes) ? (
            <View style={[styles.section, { backgroundColor: colors.card }]}>
              <Text style={[styles.sectionLabel, { color: colors.textDim }]}>{t('notes')}</Text>
              <Text style={[styles.sectionValue, { color: colors.text }]}>
                {event.description || event.notes}
              </Text>
            </View>
          ) : null}

          <TouchableOpacity
            style={[styles.deleteBtn, { backgroundColor: colors.accent + '20', borderColor: colors.accent }]}
            onPress={handleDelete}
          >
            <Text style={[styles.deleteBtnText, { color: colors.accent }]}>{t('deleteEvent')}</Text>
          </TouchableOpacity>

          <View style={styles.footer} />
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  headerBtn: { paddingVertical: 4, paddingHorizontal: 4 },
  backBtnWrap: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  backBtn: { fontSize: 16, fontWeight: '600' },
  editBtn: { fontSize: 17, fontWeight: '600' },
  scroll: { flex: 1 },
  content: { padding: 20, paddingBottom: 40 },
  title: { fontSize: 28, fontWeight: '700', marginBottom: 24 },
  section: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  sectionValue: { fontSize: 16, lineHeight: 24 },
  deleteBtn: {
    marginTop: 24,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
  },
  deleteBtnText: { fontSize: 16, fontWeight: '600' },
  footer: { height: 40 },
});
