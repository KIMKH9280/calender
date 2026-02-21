require('dotenv').config();

export default {
  expo: {
    name: 'Personal Assistant',
    slug: 'personal-assistant-calendar',
    version: '1.0.0',
    orientation: 'portrait',
    userInterfaceStyle: 'automatic',
    splash: {
      resizeMode: 'contain',
      backgroundColor: '#1a1b2e',
    },
    assetBundlePatterns: ['**/*'],
    ios: {
      supportsTablet: true,
      bundleIdentifier: 'com.personalassistant.calendar',
      infoPlist: {
        NSCameraUsageDescription: 'This app uses the camera to capture schedule or reservation images.',
        NSPhotoLibraryUsageDescription: 'This app uses the photo library to select images for schedule extraction.',
      },
    },
    android: {
      adaptiveIcon: {
        backgroundColor: '#1a1b2e',
      },
      package: 'com.personalassistant.calendar',
      permissions: ['android.permission.CAMERA', 'android.permission.READ_EXTERNAL_STORAGE', 'android.permission.READ_MEDIA_IMAGES'],
    },
    scheme: 'personal-assistant',
    plugins: ['@react-native-community/datetimepicker', 'expo-notifications'],
    extra: {
      openaiApiKey: process.env.EXPO_PUBLIC_OPENAI_API_KEY,
      eas: {
        projectId: "d8f47eed-1f54-478c-a7fb-bace4B7113b0"
      }
    },
  },
};
