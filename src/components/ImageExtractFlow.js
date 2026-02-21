import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ScrollView,
  ActivityIndicator,
  Alert,
  Image,
  Platform,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { extractEventsFromImages } from '../services/openai';
import { useTheme } from '../context/ThemeContext';

const MAX_IMAGES = 5;
const DUPLICATE_WARNING_BG = 'rgba(255, 165, 0, 0.25)';

function isSimilarEvent(extracted, existing) {
  const sameDate = extracted.date && existing.date && extracted.date === existing.date;
  const a = (extracted.title || '').toLowerCase().trim();
  const b = (existing.title || '').toLowerCase().trim();
  if (!a || !b) return sameDate;
  const similarTitle = a === b || a.includes(b) || b.includes(a) || fuzzyOverlap(a, b) > 0.5;
  return sameDate || similarTitle;
}

function fuzzyOverlap(a, b) {
  const wordsA = new Set(a.split(/\s+/).filter(Boolean));
  const wordsB = new Set(b.split(/\s+/).filter(Boolean));
  if (wordsA.size === 0 || wordsB.size === 0) return 0;
  let overlap = 0;
  for (const w of wordsA) {
    if (wordsB.has(w)) overlap++;
  }
  return overlap / Math.min(wordsA.size, wordsB.size);
}

function hasDuplicate(extracted, existingEvents) {
  return existingEvents.some((ex) => isSimilarEvent(extracted, ex));
}

async function uriToBase64(uri) {
  try {
    const base64 = await FileSystem.readAsStringAsync(uri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    return base64;
  } catch {
    return null;
  }
}

export function ImageExtractFlow({ visible, onClose, onConfirm, todayStr, existingEvents = [] }) {
  const { colors } = useTheme();
  const [step, setStep] = useState('pick'); // 'pick' | 'loading' | 'preview' | 'error'
  const [selectedUris, setSelectedUris] = useState([]);
  const [extractedEvents, setExtractedEvents] = useState([]);
  const [errorMessage, setErrorMessage] = useState('');

  const reset = () => {
    setStep('pick');
    setSelectedUris([]);
    setExtractedEvents([]);
    setErrorMessage('');
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const requestCameraPermission = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    return status === 'granted';
  };

  const requestMediaLibraryPermission = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    return status === 'granted';
  };

  const pickFromCamera = async () => {
    const ok = await requestCameraPermission();
    if (!ok) {
      Alert.alert('Permission needed', 'Camera access is required to take a photo.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      quality: 0.8,
    });
    if (!result.canceled && result.assets?.[0]) {
      setSelectedUris([result.assets[0].uri]);
      processImages([result.assets[0].uri]);
    }
  };

  const pickFromGallery = async () => {
    const ok = await requestMediaLibraryPermission();
    if (!ok) {
      Alert.alert('Permission needed', 'Photo library access is required to select images.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      selectionLimit: MAX_IMAGES,
      quality: 0.8,
    });
    if (!result.canceled && result.assets?.length) {
      const uris = result.assets.map((a) => a.uri);
      setSelectedUris(uris);
      processImages(uris);
    }
  };

  const processImages = async (uris) => {
    setStep('loading');
    setErrorMessage('');
    try {
      const base64List = [];
      for (const uri of uris) {
        const b64 = await uriToBase64(uri);
        if (b64) base64List.push(b64);
      }
      if (base64List.length === 0) {
        setErrorMessage('Could not read images.');
        setStep('error');
        return;
      }
      const today = todayStr || new Date().toISOString().slice(0, 10);
      const events = await extractEventsFromImages(base64List, today);
      setExtractedEvents(events);
      setStep('preview');
    } catch (err) {
      setErrorMessage(err.message || 'Failed to extract events from images.');
      setStep('error');
    }
  };

  const handleRemove = (index) => {
    setExtractedEvents((prev) => prev.filter((_, i) => i !== index));
  };

  const handleConfirm = () => {
    onConfirm(extractedEvents);
    handleClose();
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={[styles.card, { backgroundColor: colors.bg }]}>
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.text }]}>
              {step === 'pick' && 'Extract from images'}
              {step === 'loading' && 'Analyzing…'}
              {step === 'preview' && 'Preview events'}
              {step === 'error' && 'Error'}
            </Text>
            <TouchableOpacity onPress={handleClose} hitSlop={12}>
              <Text style={[styles.closeBtn, { color: colors.textDim }]}>✕</Text>
            </TouchableOpacity>
          </View>

          {step === 'pick' && (
            <>
              <Text style={[styles.hint, { color: colors.textDim }]}>Camera or gallery (up to {MAX_IMAGES} images). Only schedule/reservation info is extracted.</Text>
              <View style={styles.pickRow}>
                <TouchableOpacity style={[styles.pickBtn, { backgroundColor: colors.card }]} onPress={pickFromCamera}>
                  <Text style={styles.pickIcon}>📷</Text>
                  <Text style={[styles.pickLabel, { color: colors.text }]}>Camera</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.pickBtn, { backgroundColor: colors.card }]} onPress={pickFromGallery}>
                  <Text style={styles.pickIcon}>🖼️</Text>
                  <Text style={[styles.pickLabel, { color: colors.text }]}>Gallery</Text>
                </TouchableOpacity>
              </View>
              <TouchableOpacity style={styles.cancelBtn} onPress={handleClose}>
                <Text style={[styles.cancelBtnText, { color: colors.textDim }]}>Cancel</Text>
              </TouchableOpacity>
            </>
          )}

          {step === 'loading' && (
            <View style={styles.loadingWrap}>
              <ActivityIndicator size="large" color={colors.accent} />
              <Text style={[styles.loadingText, { color: colors.textDim }]}>Sending to OpenAI Vision…</Text>
            </View>
          )}

          {step === 'error' && (
            <>
              <Text style={[styles.errorText, { color: colors.accent }]}>{errorMessage}</Text>
              <TouchableOpacity style={[styles.retryBtn, { backgroundColor: colors.accent }]} onPress={() => setStep('pick')}>
                <Text style={styles.retryBtnText}>Try again</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.cancelBtn} onPress={handleClose}>
                <Text style={[styles.cancelBtnText, { color: colors.textDim }]}>Close</Text>
              </TouchableOpacity>
            </>
          )}

          {step === 'preview' && (
            <>
              {selectedUris.length > 0 && (
                <ScrollView horizontal style={styles.thumbScroll} contentContainerStyle={styles.thumbWrap}>
                  {selectedUris.slice(0, 5).map((uri, i) => (
                    <Image key={i} source={{ uri }} style={styles.thumb} />
                  ))}
                </ScrollView>
              )}
              {extractedEvents.length === 0 ? (
                <Text style={[styles.noEvents, { color: colors.textDim }]}>No schedule/reservation events found in the images.</Text>
              ) : (
                <ScrollView style={styles.previewScroll} contentContainerStyle={styles.previewContent}>
                  {extractedEvents.map((e, i) => {
                    const isDuplicate = hasDuplicate(e, existingEvents);
                    return (
                      <View
                        key={i}
                        style={[
                          styles.previewRow,
                          { backgroundColor: colors.card },
                          isDuplicate && { backgroundColor: DUPLICATE_WARNING_BG, borderWidth: 1, borderColor: 'rgba(255, 165, 0, 0.6)' },
                        ]}
                      >
                        <View style={styles.previewRowContent}>
                          <View style={styles.previewRowText}>
                            <Text style={[styles.previewTitle, { color: colors.text }]}>{e.title}</Text>
                            <Text style={[styles.previewMeta, { color: colors.textDim }]}>
                              {[e.date, e.startTime || e.endTime, e.location].filter(Boolean).join(' · ')}
                            </Text>
                            {isDuplicate && (
                              <Text style={styles.duplicateLabel}>⚠️ Similar event exists</Text>
                            )}
                          </View>
                          <TouchableOpacity
                            style={[styles.removeBtn, { backgroundColor: colors.textDim + '40' }]}
                            onPress={() => handleRemove(i)}
                            hitSlop={8}
                          >
                            <Text style={[styles.removeBtnText, { color: colors.text }]}>✕</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    );
                  })}
                </ScrollView>
              )}
              <View style={styles.previewActions}>
                <TouchableOpacity style={[styles.previewCancelBtn, { backgroundColor: colors.card }]} onPress={() => setStep('pick')}>
                  <Text style={[styles.previewCancelText, { color: colors.textDim }]}>Back</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.previewConfirmBtn, { backgroundColor: colors.accent }, extractedEvents.length === 0 && styles.previewConfirmDisabled]}
                  onPress={handleConfirm}
                  disabled={extractedEvents.length === 0}
                >
                  <Text style={styles.previewConfirmText}>Add to calendar ({extractedEvents.length})</Text>
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  card: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    paddingBottom: 40,
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: { fontSize: 18, fontWeight: '700' },
  closeBtn: { fontSize: 22, padding: 4 },
  hint: { fontSize: 13, marginBottom: 20 },
  pickRow: { flexDirection: 'row', gap: 16, marginBottom: 20 },
  pickBtn: {
    flex: 1,
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
  },
  pickIcon: { fontSize: 32, marginBottom: 8 },
  pickLabel: { fontSize: 16, fontWeight: '600' },
  cancelBtn: { alignSelf: 'center', paddingVertical: 12 },
  cancelBtnText: { fontWeight: '600' },
  loadingWrap: { alignItems: 'center', paddingVertical: 40 },
  loadingText: { marginTop: 12 },
  errorText: { marginBottom: 16 },
  retryBtn: {
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 8,
  },
  retryBtnText: { color: '#fff', fontWeight: '600' },
  thumbScroll: { marginBottom: 12 },
  thumbWrap: { flexDirection: 'row', gap: 8 },
  thumb: { width: 56, height: 56, borderRadius: 8 },
  previewScroll: { maxHeight: 260, marginBottom: 16 },
  previewContent: { paddingVertical: 4 },
  previewRow: {
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
  },
  previewRowContent: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  previewRowText: { flex: 1, marginRight: 8 },
  previewTitle: { fontSize: 16, fontWeight: '600' },
  previewMeta: { fontSize: 13, marginTop: 4 },
  duplicateLabel: { fontSize: 12, color: '#b8860b', marginTop: 6, fontWeight: '600' },
  removeBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeBtnText: { fontSize: 14, fontWeight: '700' },
  noEvents: { marginBottom: 16, textAlign: 'center' },
  previewActions: { flexDirection: 'row', gap: 12 },
  previewCancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  previewCancelText: { fontWeight: '600' },
  previewConfirmBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  previewConfirmDisabled: { opacity: 0.5 },
  previewConfirmText: { color: '#fff', fontWeight: '600' },
});
