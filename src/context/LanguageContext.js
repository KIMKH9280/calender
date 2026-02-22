import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LocaleConfig } from 'react-native-calendars';

const STORAGE_KEY = '@personal_assistant_lang';

const translations = {
  en: {
    calendar: 'Calendar',
    month: 'Month',
    week: 'Week',
    addEvent: '+ Add Event',
    voice: 'Voice',
    images: 'Images',
    paste: 'Paste',
    pasteModalTitle: 'Paste text to extract events',
    pasteModalHint: 'KakaoTalk, SMS, emails, etc.',
    pastePlaceholder: 'Paste your message here...',
    cancel: 'Cancel',
    extractAndAdd: 'Extract & Add',
    back: '← Back',
    home: '← Home',
    select: 'Select',
    settings: 'Settings',
    event: 'event',
    events: 'events',
    noEvents: 'No events',
    noEventsToday: 'No events today',
    noEventsOnThisDay: 'No events on this day',
    allDay: 'All day',
    today: 'Today',
    edit: 'Edit',
    deleteEvent: 'Delete Event',
    delete: 'Delete',
    deleteConfirm: 'Are you sure you want to delete "{{title}}"?',
    newEvent: 'New event',
    editEvent: 'Edit event',
    title: 'Title',
    titleRequired: 'Title *',
    date: 'Date',
    selectDate: 'Select date',
    location: 'Location',
    locationOptional: 'Location (optional)',
    startTime: 'Start time',
    endTime: 'End time',
    description: 'Description',
    descriptionOptional: 'Description (optional)',
    save: 'Save',
    tapToView: 'Tap to view',
    voiceInputTitle: 'Add event by voice',
    voiceInputHint: 'Tap record, speak your schedule, then tap stop.',
    voiceInputExample: 'e.g. "Meeting tomorrow at 3pm" or "Lunch next Monday"',
    recordStart: 'Start recording',
    recording: 'Speak now...',
    stopAndAnalyze: 'Stop & analyze',
    recognizedSpeech: 'Recognized speech:',
    extractedSchedule: 'Extracted events',
    eventsCount: '{{count}} event(s)',
    addEventsCount: 'Add {{count}} event(s)',
    duplicateWarning: 'Some events may overlap with existing ones.',
    tryAgain: 'Try again',
    pasteNoEvents: 'Could not find any schedule in the pasted text.',
    addedCount: 'Added {{count}} event(s) to your calendar.',
    done: 'Done',
    error: 'Error',
    extractFailed: 'Failed to extract events.',
    settingsAccent: 'Accent color (buttons, highlights)',
    settingsBackground: 'Background style',
    settingsDot: 'Calendar dot indicator',
    settingsHoliday: 'Weekend / holiday text color',
    language: 'Language',
    english: 'English',
    korean: '한국어',
    deleteEventsConfirm: 'Delete {{count}} event(s)?',
    deleteEventConfirm: 'Delete "{{title}}"?',
    imageExtractTitle: 'Extract events from images',
    noEventsFound: 'Could not find any schedule in your speech.',
    voiceExample: 'Try saying "Meeting tomorrow at 2pm" or "내일 오후 3시 점심 약속".',
    timeAndDuration: 'Time & Duration',
    time: 'Time',
    notes: 'Notes',
    deleteEvents: 'Delete Events',
    noEventsThisDay: 'No events this day',
    microphoneRequired: 'Microphone access required',
    microphoneRequiredMessage: 'Please allow microphone access to use voice input.',
    recordingFailed: 'Recording failed. No audio file.',
    noSpeechDetected: 'No speech detected. Try speaking closer to the microphone.',
    processVoiceFailed: 'Failed to process voice input.',
    transcribing: 'Converting speech to text…',
    extracting: 'Extracting events…',
    permissionNeeded: 'Permission needed',
    cameraPermission: 'Camera access is required to take a photo.',
    galleryPermission: 'Photo library access is required to select images.',
    couldNotReadImages: 'Could not read images.',
    extractFromImagesFailed: 'Failed to extract events from images.',
    extractFromImages: 'Extract from images',
    analyzing: 'Analyzing…',
    previewEvents: 'Preview events',
    camera: 'Camera',
    gallery: 'Gallery',
    imagePickHint: 'Camera or gallery (up to {{max}} images). Only schedule/reservation info is extracted.',
    noScheduleInImages: 'No schedule/reservation events found in the images.',
    similarEventExists: '⚠️ Similar event exists',
    addToCalendarCount: 'Add to calendar ({{count}})',
    close: 'Close',
    backBtn: 'Back',
  },
  ko: {
    calendar: '캘린더',
    month: '월간',
    week: '주간',
    addEvent: '+ 일정 추가',
    voice: '음성',
    images: '이미지',
    paste: '붙여넣기',
    pasteModalTitle: '텍스트 붙여넣어 일정 추출',
    pasteModalHint: '카카오톡, 문자, 이메일 등',
    pastePlaceholder: '여기에 메시지를 붙여넣으세요...',
    cancel: '취소',
    extractAndAdd: '추출 & 추가',
    back: '← 뒤로',
    home: '← 홈',
    select: '선택',
    settings: '설정',
    event: '일정',
    events: '일정',
    noEvents: '일정 없음',
    noEventsToday: '오늘 일정 없음',
    noEventsOnThisDay: '해당 날짜 일정 없음',
    allDay: '종일',
    today: '오늘',
    edit: '수정',
    deleteEvent: '일정 삭제',
    delete: '삭제',
    deleteConfirm: '"{{title}}"을(를) 삭제하시겠습니까?',
    newEvent: '새 일정',
    editEvent: '일정 수정',
    title: '제목',
    titleRequired: '제목 *',
    date: '날짜',
    selectDate: '날짜 선택',
    location: '장소',
    locationOptional: '장소 (선택)',
    startTime: '시작 시간',
    endTime: '종료 시간',
    description: '메모',
    descriptionOptional: '메모 (선택)',
    save: '저장',
    tapToView: '탭하여 보기',
    voiceInputTitle: '음성으로 일정 추가',
    voiceInputHint: '녹음 시작 후 일정을 말해보세요. 끝나면 중지 버튼을 누르세요.',
    voiceInputExample: '예: "내일 오후 3시 치과 예약", "다음주 월요일 점심 회의"',
    recordStart: '녹음 시작',
    recording: '말씀해 주세요...',
    stopAndAnalyze: '중지 & 분석',
    recognizedSpeech: '인식된 말:',
    extractedSchedule: '추출된 일정',
    eventsCount: '{{count}}건',
    addEventsCount: '{{count}}건 추가',
    duplicateWarning: '겹치는 일정이 있을 수 있습니다',
    tryAgain: '다시 시도',
    pasteNoEvents: '붙여넣은 텍스트에서 일정을 찾을 수 없습니다.',
    addedCount: '{{count}}개 일정을 추가했습니다.',
    done: '완료',
    error: '오류',
    extractFailed: '일정 추출에 실패했습니다.',
    settingsAccent: '강조 색상 (버튼, 강조)',
    settingsBackground: '배경 스타일',
    settingsDot: '캘린더 표시점',
    settingsHoliday: '주말/공휴일 글자색',
    language: '언어',
    english: 'English',
    korean: '한국어',
    deleteEventsConfirm: '{{count}}개 일정을 삭제하시겠습니까?',
    deleteEventConfirm: '"{{title}}"을(를) 삭제하시겠습니까?',
    imageExtractTitle: '이미지에서 일정 추출',
    noEventsFound: '말씀에서 일정을 찾을 수 없습니다.',
    voiceExample: '"내일 오후 3시 회의" 또는 "다음주 월요일 점심 약속"처럼 말해보세요.',
    timeAndDuration: '시간 & 소요',
    time: '시간',
    notes: '메모',
    deleteEvents: '일정 삭제',
    noEventsThisDay: '해당 날짜 일정 없음',
    microphoneRequired: '마이크 권한 필요',
    microphoneRequiredMessage: '음성 입력을 사용하려면 마이크 접근을 허용해 주세요.',
    recordingFailed: '녹음에 실패했습니다. 오디오 파일이 없습니다.',
    noSpeechDetected: '음성이 감지되지 않았습니다. 마이크에 더 가까이 말해보세요.',
    processVoiceFailed: '음성 입력 처리에 실패했습니다.',
    transcribing: '음성을 텍스트로 변환 중…',
    extracting: '일정 추출 중…',
    permissionNeeded: '권한 필요',
    cameraPermission: '사진 촬영을 위해 카메라 접근이 필요합니다.',
    galleryPermission: '이미지를 선택하려면 사진 라이브러리 접근이 필요합니다.',
    couldNotReadImages: '이미지를 읽을 수 없습니다.',
    extractFromImagesFailed: '이미지에서 일정 추출에 실패했습니다.',
    extractFromImages: '이미지에서 추출',
    analyzing: '분석 중…',
    previewEvents: '일정 미리보기',
    camera: '카메라',
    gallery: '갤러리',
    imagePickHint: '카메라 또는 갤러리 (최대 {{max}}장). 일정/예약 정보만 추출됩니다.',
    noScheduleInImages: '이미지에서 일정/예약 정보를 찾을 수 없습니다.',
    similarEventExists: '⚠️ 비슷한 일정이 이미 있습니다',
    addToCalendarCount: '캘린더에 추가 ({{count}})',
    close: '닫기',
    backBtn: '뒤로',
  },
};

const LanguageContext = createContext(null);

export function LanguageProvider({ children }) {
  const [locale, setLocaleState] = useState('en');
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((stored) => {
      if (stored && translations[stored]) {
        setLocaleState(stored);
      }
      setLoaded(true);
    });
  }, []);

  useEffect(() => {
    if (locale === 'ko') {
      LocaleConfig.locales['ko'] = {
        monthNames: ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월'],
        monthNamesShort: ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월'],
        dayNames: ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'],
        dayNamesShort: ['일', '월', '화', '수', '목', '금', '토'],
        today: '오늘',
      };
      LocaleConfig.defaultLocale = 'ko';
    } else {
      LocaleConfig.defaultLocale = '';
    }
  }, [locale]);

  const setLocale = useCallback(async (lang) => {
    if (!translations[lang]) return;
    setLocaleState(lang);
    await AsyncStorage.setItem(STORAGE_KEY, lang);
  }, []);

  const t = useCallback(
    (key, params = {}) => {
      let str = translations[locale]?.[key] ?? translations.en[key] ?? key;
      Object.entries(params).forEach(([k, v]) => {
        str = str.replace(new RegExp(`{{${k}}}`, 'g'), String(v));
      });
      return str;
    },
    [locale]
  );

  const dateLocale = locale === 'ko' ? 'ko-KR' : 'en-US';
  const value = { locale, setLocale, t, loaded, dateLocale };
  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage must be used within LanguageProvider');
  return ctx;
}
