import OpenAI from 'openai';
import { OPENAI_API_KEY } from '../config/env';

/**
 * Transcribe audio file to text using OpenAI Whisper
 * @param {string} audioUri - File URI (file://...) from expo-av recording
 * @returns {Promise<string>} Transcribed text
 */
export async function transcribeAudio(audioUri) {
  if (!OPENAI_API_KEY) {
    throw new Error('OpenAI API key is not set. Add EXPO_PUBLIC_OPENAI_API_KEY to your .env file.');
  }
  const ext = audioUri?.toLowerCase().endsWith('.m4a') ? 'm4a' : 'mp4';
  const mime = ext === 'm4a' ? 'audio/m4a' : 'audio/mp4';
  const formData = new FormData();
  formData.append('file', {
    uri: audioUri,
    type: mime,
    name: `recording.${ext}`,
  });
  formData.append('model', 'whisper-1');

  const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(err || `Whisper API error: ${response.status}`);
  }
  const data = await response.json();
  return (data.text || '').trim();
}

const openai = new OpenAI({
  apiKey: OPENAI_API_KEY,
  dangerouslyAllowBrowser: true, // Required for Expo/React Native
});

function getDeviceTimezone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
}

function getTodayInTimezone(tz) {
  return new Intl.DateTimeFormat('sv-SE', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
}

function getTodayFormatted(tz) {
  return new Date().toLocaleString('en-US', { timeZone: tz });
}

function buildContextBlock(todayStr) {
  const tz = getDeviceTimezone();
  const refDate = todayStr || getTodayInTimezone(tz);
  const nowFormatted = getTodayFormatted(tz);
  return `Today is ${nowFormatted}. User timezone: ${tz}. Today's date (YYYY-MM-DD): ${refDate}. Use this timezone for ALL relative date calculations (today, tomorrow, next Monday, etc.).`;
}

const SYSTEM_PROMPT = `You are an expert schedule extraction assistant. Extract ALL events from text in ANY language (English, Korean, Japanese, Spanish, etc.). Auto-detect the input language and parse naturally. Always return a JSON array—even if multiple events are in one block.

## SMART DATE PARSING (use user's timezone from context)
- No year → current year
- "today"/"오늘"/"今日"/"hoy" → today in user timezone
- "tomorrow"/"내일"/"明日"/"mañana" → tomorrow
- "next Monday"/"다음주 월요일"/"próximo lunes" → next Monday
- "this Friday"/"이번주 금요일" → this Friday
- Day only ("24일", "24th") → this month; if passed → next month
- "Feb 22", "2월 22일", "22/2" → that date, current year

## SMART TIME PARSING (output HH:mm 24-hour)
- 12h & 24h supported: "3pm", "15시", "15:00", "오후 3시" → 15:00
- "lunch"/"점심"/"almuerzo" → 12:00
- "dinner"/"저녁"/"cena" → 18:00
- "morning"/"아침" → 08:00
- "evening"/"저녁" → 18:00
- AM/PM or context: "11시" (no PM) → 11:00

## NATURAL EVENT EXTRACTION (any language)
- Preserve event titles in original language
- Imply meeting/appointment when context suggests (e.g. "lunch with Dad", "아빠와 점심")

## OUTPUT
JSON array only. Each event: { "title", "date" (YYYY-MM-DD), "startTime"?, "endTime"?, "location"?, "description"? }
If none found: []`;

/**
 * Extract calendar events from arbitrary text using GPT-4o-mini
 * @param {string} text - Raw text (KakaoTalk, SMS, email, etc.)
 * @param {string} todayStr - Today's date in YYYY-MM-DD for context
 * @returns {Promise<Array<{ title: string, date: string, startTime?: string, endTime?: string, description?: string }>>}
 */
export async function extractEventsFromText(text, todayStr) {
  if (!OPENAI_API_KEY) {
    throw new Error('OpenAI API key is not set. Add EXPO_PUBLIC_OPENAI_API_KEY to your .env file.');
  }
  const contextBlock = buildContextBlock(todayStr);
  const userMessage = `${contextBlock}

Extract events from this message. Detect language and parse naturally:\n\n${text}`;
  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: userMessage },
    ],
    temperature: 0.2,
  });
  let content = response.choices[0]?.message?.content?.trim() ?? '';
  const codeBlock = content.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlock) content = codeBlock[1].trim();
  try {
    const parsed = JSON.parse(content);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

const VISION_SYSTEM_PROMPT = `You are an expert schedule extraction assistant. Extract schedule/reservation/calendar info from images in ANY language. Auto-detect language and parse naturally. Be generous: if it looks like a schedule, extract it.

## SMART DATE PARSING (use user timezone from context)
- No year → current year
- "today"/"오늘"/"今日"/"hoy" → today
- "tomorrow"/"내일"/"明日"/"mañana" → tomorrow
- "next Monday"/"다음주 월요일"/"próximo lunes" → next Monday
- Day only → this month; if passed → next month

## SMART TIME PARSING (output HH:mm 24h)
- "3pm", "15시", "15:00", "오후 3시" → 15:00
- "lunch"/"점심"/"almuerzo" → 12:00
- "dinner"/"저녁"/"cena" → 18:00
- "morning"/"아침" → 08:00

## NATURAL EVENT EXTRACTION (any language)
- Preserve titles in original language

## OUTPUT
JSON array only. Each event: { "title", "date" (YYYY-MM-DD), "startTime"?, "endTime"?, "location"?, "description"? }
If none found: []`;

/**
 * Extract calendar events from images using GPT-4o Vision
 * @param {string[]} imageBase64Array - Array of base64-encoded image strings (no data URL prefix)
 * @param {string} todayStr - Today's date YYYY-MM-DD for context
 * @returns {Promise<Array<{ title: string, date: string, startTime?: string, endTime?: string, location?: string, description?: string }>>}
 */
export async function extractEventsFromImages(imageBase64Array, todayStr) {
  if (!OPENAI_API_KEY) {
    throw new Error('OpenAI API key is not set. Add EXPO_PUBLIC_OPENAI_API_KEY to your .env file.');
  }
  if (!imageBase64Array || imageBase64Array.length === 0) {
    return [];
  }

  const imageContent = imageBase64Array.map((base64) => ({
    type: 'image_url',
    image_url: {
      url: `data:image/jpeg;base64,${base64}`,
      detail: 'high',
    },
  }));

  const contextBlock = buildContextBlock(todayStr);
  const userContent = [
    {
      type: 'text',
      text: `${contextBlock} Detect language and extract all schedule events. Return JSON array.`,
    },
    ...imageContent,
  ];

  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      { role: 'system', content: VISION_SYSTEM_PROMPT },
      { role: 'user', content: userContent },
    ],
    max_tokens: 1024,
    temperature: 0.2,
  });

  let content = response.choices[0]?.message?.content?.trim() ?? '';
  const codeBlock = content.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlock) content = codeBlock[1].trim();
  try {
    const parsed = JSON.parse(content);
    const arr = Array.isArray(parsed) ? parsed : [];
    // Normalize: convert time -> startTime, notes -> description (legacy format)
    return arr
      .filter((e) => e && typeof e.title === 'string' && e.title.trim() && e.date)
      .map((e) => {
        const ev = { ...e };
        if (ev.time && !ev.startTime) ev.startTime = parseTimeToHHmm(ev.time);
        if (ev.notes && !ev.description) ev.description = ev.notes;
        delete ev.time;
        delete ev.notes;
        return ev;
      });
  } catch {
    return [];
  }
}

function parseTimeToHHmm(str) {
  if (!str || typeof str !== 'string') return undefined;
  const s = str.trim();
  const range = s.match(/^(\d{1,2}):?(\d{2})?/);
  if (range) {
    const h = range[1].padStart(2, '0');
    const m = (range[2] || '00').padStart(2, '0');
    return `${h}:${m}`;
  }
  const hourOnly = s.match(/(\d{1,2})\s*시/);
  if (hourOnly) return `${hourOnly[1].padStart(2, '0')}:00`;
  return s;
}
