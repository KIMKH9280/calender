import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { Audio } from 'expo-av';
import { extractEventsFromText, transcribeAudio } from '../services/openai';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';

const DUPLICATE_WARNING_BG = 'rgba(255, 165, 0, 0.25)';

function isSimilarEvent(extracted, existing) {
  const sameDate = extracted.date && existing.date && extracted.date === existing.date;
  const a = (extracted.title || '').toLowerCase().trim();
  const b = (existing.title || '').toLowerCase().trim();
  if (!a || !b) return sameDate;
  const similarTitle = a === b || a.includes(b) || b.includes(a);
  return sameDate || similarTitle;
}

function hasDuplicate(extracted, existingEvents) {
  return existingEvents.some((ex) => isSimilarEvent(extracted, ex));
}

export function VoiceInputFlow({ visible, onClose, onConfirm, todayStr, existingEvents = [] }) {
  const { colors } = useTheme();
  const { t } = useLanguage();
  const [step, setStep] = useState('idle'); // 'idle' | 'recording' | 'transcribing' | 'extracting' | 'preview' | 'error'
  const [transcription, setTranscription] = useState('');
  const [extractedEvents, setExtractedEvents] = useState([]);
  const [errorMessage, setErrorMessage] = useState('');
  const recordingRef = useRef(null);

  const reset = () => {
    setStep('idle');
    setTranscription('');
    setExtractedEvents([]);
    setErrorMessage('');
    recordingRef.current = null;
  };

  const handleClose = () => {
    if (step === 'recording' && recordingRef.current) {
      recordingRef.current.stopAndUnloadAsync().catch(() => {});
    }
    reset();
    onClose();
  };

  const requestPermission = async () => {
    const { status } = await Audio.requestPermissionsAsync();
    return status === 'granted';
  };

  const startRecording = async () => {
    const granted = await requestPermission();
    if (!granted) {
      Alert.alert(t('microphoneRequired'), t('microphoneRequiredMessage'));
      return;
    }

    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true, // Must be true when allowsRecordingIOS is true on iOS
        staysActiveInBackground: false,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
      });

      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      recordingRef.current = recording;
      setStep('recording');
      setErrorMessage('');
    } catch (err) {
      setErrorMessage(err.message || t('processVoiceFailed'));
      setStep('error');
    }
  };

  const stopRecordingAndProcess = async () => {
    if (!recordingRef.current) return;

    try {
      await recordingRef.current.stopAndUnloadAsync();
      const uri = recordingRef.current.getURI();
      recordingRef.current = null;

      if (!uri) {
        setErrorMessage(t('recordingFailed'));
        setStep('error');
        return;
      }

      setStep('transcribing');

      const text = await transcribeAudio(uri);
      setTranscription(text);

      if (!text || !text.trim()) {
        setErrorMessage(t('noSpeechDetected'));
        setStep('error');
        return;
      }

      setStep('extracting');

      const extracted = await extractEventsFromText(text, todayStr);

      if (!extracted || extracted.length === 0) {
        setErrorMessage(t('noEventsFound') + ' ' + t('voiceExample'));
        setStep('error');
        return;
      }

      setExtractedEvents(extracted);
      setStep('preview');
    } catch (err) {
      setErrorMessage(err.message || t('processVoiceFailed'));
      setStep('error');
    }
  };

  const handleConfirm = () => {
    if (extractedEvents?.length) {
      onConfirm(extractedEvents);
    }
    handleClose();
  };

  const removeEvent = (index) => {
    setExtractedEvents((prev) => prev.filter((_, i) => i !== index));
  };

  const isProcessing = step === 'transcribing' || step === 'extracting';

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={[styles.overlay, { backgroundColor: 'rgba(0,0,0,0.6)' }]}>
        <View style={[styles.card, { backgroundColor: colors.bg }]}>
          <View style={[styles.header, { borderBottomColor: colors.textDim + '30' }]}>
            <Text style={[styles.title, { color: colors.text }]}>{t('voiceInputTitle')}</Text>
            <TouchableOpacity onPress={handleClose} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
              <Text style={[styles.closeBtn, { color: colors.textDim }]}>✕</Text>
            </TouchableOpacity>
          </View>

          {step === 'idle' && (
            <View style={styles.body}>
              <Text style={[styles.hint, { color: colors.textDim }]}>
                {t('voiceInputHint')}
              </Text>
              <Text style={[styles.example, { color: colors.textDim }]}>
                {t('voiceInputExample')}
              </Text>
              <TouchableOpacity
                style={[styles.micBtn, { backgroundColor: colors.accent }]}
                onPress={startRecording}
              >
                <Text style={styles.micIcon}>🎤</Text>
                <Text style={styles.micLabel}>{t('recordStart')}</Text>
              </TouchableOpacity>
            </View>
          )}

          {step === 'recording' && (
            <View style={styles.body}>
              <View style={[styles.recordingPulse, { backgroundColor: colors.accent + '40' }]}>
                <Text style={styles.recordingIcon}>🔴</Text>
              </View>
              <Text style={[styles.recordingText, { color: colors.text }]}>{t('recording')}</Text>
              <TouchableOpacity
                style={[styles.stopBtn, { backgroundColor: colors.accent }]}
                onPress={stopRecordingAndProcess}
              >
                <Text style={styles.stopBtnText}>{t('stopAndAnalyze')}</Text>
              </TouchableOpacity>
            </View>
          )}

          {isProcessing && (
            <View style={styles.body}>
              <ActivityIndicator size="large" color={colors.accent} />
              <Text style={[styles.processingText, { color: colors.text }]}>
                {step === 'transcribing' ? t('transcribing') : t('extracting')}
              </Text>
            </View>
          )}

          {step === 'preview' && (
            <View style={styles.previewBody}>
              {transcription ? (
                <Text style={[styles.transcriptionLabel, { color: colors.textDim }]}>{t('recognizedSpeech')}</Text>
              ) : null}
              {transcription ? (
                <Text style={[styles.transcription, { color: colors.text }]} numberOfLines={3}>
                  {transcription}
                </Text>
              ) : null}
              <Text style={[styles.previewLabel, { color: colors.text }]}>
                {t('extractedSchedule')} ({t('eventsCount', { count: extractedEvents.length })})
              </Text>
              {extractedEvents.map((ev, i) => (
                <View
                  key={i}
                  style={[
                    styles.eventRow,
                    { backgroundColor: colors.card },
                    hasDuplicate(ev, existingEvents) && { backgroundColor: DUPLICATE_WARNING_BG },
                  ]}
                >
                  <View style={styles.eventInfo}>
                    <Text style={[styles.eventTitle, { color: colors.text }]} numberOfLines={1}>
                      {ev.title}
                    </Text>
                    <Text style={[styles.eventMeta, { color: colors.textDim }]}>
                      {ev.date} {ev.startTime || ev.endTime ? `· ${ev.startTime || ev.endTime}` : ''}
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => removeEvent(i)}
                    style={styles.removeBtn}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Text style={[styles.removeBtnText, { color: colors.textDim }]}>✕</Text>
                  </TouchableOpacity>
                </View>
              ))}
              {extractedEvents.some((e) => hasDuplicate(e, existingEvents)) && (
                <Text style={[styles.duplicateHint, { color: colors.textDim }]}>
                  🟠 {t('duplicateWarning')}
                </Text>
              )}
              <View style={styles.previewActions}>
                <TouchableOpacity
                  style={[styles.cancelBtn, { backgroundColor: colors.card }]}
                  onPress={handleClose}
                >
                  <Text style={[styles.cancelBtnText, { color: colors.textDim }]}>{t('cancel')}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.confirmBtn, { backgroundColor: colors.accent }]}
                  onPress={handleConfirm}
                  disabled={extractedEvents.length === 0}
                >
                  <Text style={styles.confirmBtnText}>
                    {t('addEventsCount', { count: extractedEvents.length })}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {step === 'error' && (
            <View style={styles.body}>
              <Text style={[styles.errorIcon]}>⚠️</Text>
              <Text style={[styles.errorText, { color: colors.text }]}>{errorMessage}</Text>
              <TouchableOpacity
                style={[styles.retryBtn, { backgroundColor: colors.accent }]}
                onPress={reset}
              >
                <Text style={styles.retryBtnText}>{t('tryAgain')}</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  card: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 40,
    maxHeight: '85%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  title: { fontSize: 18, fontWeight: '700' },
  closeBtn: { fontSize: 24, fontWeight: '600' },
  body: {
    padding: 24,
    alignItems: 'center',
  },
  hint: { fontSize: 15, marginBottom: 8, textAlign: 'center' },
  example: { fontSize: 13, marginBottom: 24, textAlign: 'center', opacity: 0.9 },
  micBtn: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  micIcon: { fontSize: 40, marginBottom: 4 },
  micLabel: { fontSize: 14, color: '#fff', fontWeight: '600' },
  recordingPulse: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  recordingIcon: { fontSize: 32 },
  recordingText: { fontSize: 18, fontWeight: '600', marginBottom: 4 },
  recordingHint: { fontSize: 14 },
  stopBtn: { marginTop: 24, paddingHorizontal: 24, paddingVertical: 14, borderRadius: 12 },
  stopBtnText: { color: '#fff', fontWeight: '600', fontSize: 16 },
  processingText: { marginTop: 16, fontSize: 16 },
  previewBody: { padding: 20, paddingBottom: 24 },
  transcriptionLabel: { fontSize: 12, marginBottom: 4 },
  transcription: { fontSize: 14, marginBottom: 16, fontStyle: 'italic' },
  previewLabel: { fontSize: 16, fontWeight: '600', marginBottom: 12 },
  eventRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    marginBottom: 8,
  },
  eventInfo: { flex: 1 },
  eventTitle: { fontSize: 16, fontWeight: '600' },
  eventMeta: { fontSize: 13, marginTop: 2 },
  removeBtn: { padding: 8 },
  removeBtnText: { fontSize: 18 },
  duplicateHint: { fontSize: 12, marginTop: 8, marginBottom: 16 },
  previewActions: { flexDirection: 'row', gap: 12, marginTop: 8 },
  cancelBtn: { flex: 1, padding: 14, alignItems: 'center', borderRadius: 10 },
  cancelBtnText: { fontWeight: '600' },
  confirmBtn: { flex: 1, padding: 14, alignItems: 'center', borderRadius: 10 },
  confirmBtnText: { color: '#fff', fontWeight: '600' },
  errorIcon: { fontSize: 48, marginBottom: 16 },
  errorText: { fontSize: 15, textAlign: 'center', marginBottom: 24 },
  retryBtn: { paddingHorizontal: 24, paddingVertical: 12, borderRadius: 10 },
  retryBtnText: { color: '#fff', fontWeight: '600' },
});
