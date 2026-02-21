import Constants from 'expo-constants';

export const OPENAI_API_KEY = Constants.expoConfig?.extra?.openaiApiKey ?? process.env.EXPO_PUBLIC_OPENAI_API_KEY ?? '';
