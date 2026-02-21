import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const THEME_STORAGE_KEY = '@personal_assistant_theme';

export const ACCENT_PRESETS = [
  { id: 'rose-red', name: 'Rose Red', color: '#e94560' },
  { id: 'ocean-blue', name: 'Ocean Blue', color: '#2196f3' },
  { id: 'violet-purple', name: 'Violet Purple', color: '#9c27b0' },
  { id: 'emerald-green', name: 'Emerald Green', color: '#06d6a0' },
  { id: 'sunset-orange', name: 'Sunset Orange', color: '#ff9800' },
];

export const BACKGROUND_PRESETS = [
  { id: 'dark', name: 'Dark', bg: '#1a1b2e', card: '#16213e', text: '#edf2f4', textDim: '#8d99ae' },
  { id: 'light', name: 'Light', bg: '#f5f6fa', card: '#ffffff', text: '#2d3436', textDim: '#636e72' },
  { id: 'amoled', name: 'AMOLED Black', bg: '#000000', card: '#0a0a0a', text: '#ffffff', textDim: '#888888' },
];

export const DOT_PRESETS = [
  { id: 'accent', name: 'Match Accent', color: null },
  { id: 'rose-red', name: 'Rose Red', color: '#e94560' },
  { id: 'ocean-blue', name: 'Ocean Blue', color: '#2196f3' },
  { id: 'emerald-green', name: 'Emerald Green', color: '#06d6a0' },
];

export const HOLIDAY_PRESETS = [
  { id: 'red', name: 'Red', color: '#ff4d4f' },
  { id: 'orange', name: 'Orange', color: '#ff9800' },
  { id: 'purple', name: 'Purple', color: '#9c27b0' },
  { id: 'teal', name: 'Teal', color: '#009688' },
];

const DEFAULT_THEME = {
  accentId: 'rose-red',
  backgroundId: 'dark',
  dotId: 'accent',
  holidayId: 'red',
};

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(DEFAULT_THEME);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(THEME_STORAGE_KEY).then((raw) => {
      if (raw) {
        try {
          const parsed = JSON.parse(raw);
          setThemeState({ ...DEFAULT_THEME, ...parsed });
        } catch {}
      }
      setLoaded(true);
    });
  }, []);

  const saveTheme = useCallback(async (next) => {
    setThemeState(next);
    await AsyncStorage.setItem(THEME_STORAGE_KEY, JSON.stringify(next));
  }, []);

  const setTheme = useCallback(
    (updates) => {
      const next = { ...theme, ...updates };
      saveTheme(next);
    },
    [theme, saveTheme]
  );

  const accent = ACCENT_PRESETS.find((p) => p.id === theme.accentId)?.color ?? '#e94560';
  const bgPreset = BACKGROUND_PRESETS.find((p) => p.id === theme.backgroundId) ?? BACKGROUND_PRESETS[0];
  const dotPreset = DOT_PRESETS.find((p) => p.id === theme.dotId);
  const dotColor = dotPreset?.color ?? accent;
  const holidayColor = HOLIDAY_PRESETS.find((p) => p.id === theme.holidayId)?.color ?? '#ff4d4f';

  const colors = {
    bg: bgPreset.bg,
    card: bgPreset.card,
    accent,
    accentDim: accent + '33',
    holiday: holidayColor,
    text: bgPreset.text,
    textDim: bgPreset.textDim,
    success: '#06d6a0',
    dotColor,
  };

  const value = {
    theme,
    colors,
    loaded,
    setTheme,
  };

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
