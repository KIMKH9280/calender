# Personal Assistant Calendar

A React Native + Expo mobile app with a calendar UI, AI-powered schedule extraction from text (KakaoTalk, SMS, emails), and local event management.

## Features

- **Calendar UI**: Monthly and weekly view toggle, tap a date to see that day’s schedule
- **AI extraction**: Paste any text and use OpenAI GPT-4o-mini to extract events and add them to the calendar
- **Event management**: Add events (minimal form), delete via swipe or button, all stored locally with AsyncStorage

## Setup

1. **Install dependencies**

   ```bash
   npm install
   ```

2. **OpenAI API key**

   Copy `.env.example` to `.env` and set your key:

   ```bash
   cp .env.example .env
   ```

   Edit `.env`:

   ```
   EXPO_PUBLIC_OPENAI_API_KEY=sk-your-openai-api-key
   ```

   Get a key at [OpenAI API Keys](https://platform.openai.com/api-keys).

3. **Run the app**

   ```bash
   npx expo start
   ```

   Then scan the QR code with Expo Go (Android) or the Camera app (iOS), or press `a` for Android emulator / `i` for iOS simulator.

## Tech stack

- React Native + Expo
- OpenAI API (gpt-4o-mini)
- AsyncStorage
- react-native-calendars
- react-native-gesture-handler (swipe to delete)

## Project structure

- `App.js` – Root component and providers
- `app.config.js` – Expo config and env (OpenAI key via `extra`)
- `src/config/env.js` – Reads API key from config
- `src/context/EventsContext.js` – Global event state and persistence
- `src/services/storage.js` – AsyncStorage load/save
- `src/services/openai.js` – GPT extraction
- `src/navigation/AppNavigator.js` – Main screens (calendar, date detail, modals)
- `src/components/EventList.js` – Day’s events list with swipe-to-delete
- `src/components/AddEventForm.js` – Add-event form
