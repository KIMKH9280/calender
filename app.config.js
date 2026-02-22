require('dotenv').config();

export default {
  expo: {
    name: 'Personal Assistant',
    slug: 'calender',
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
        NSMicrophoneUsageDescription: 'This app uses the microphone to add events by voice.',
      },
    },
    android: {
      adaptiveIcon: {
        backgroundColor: '#1a1b2e',
      },
      package: 'com.personalassistant.calendar',
      permissions: [
        'android.permission.CAMERA',
        'android.permission.READ_EXTERNAL_STORAGE',
        'android.permission.READ_MEDIA_IMAGES',
        'android.permission.POST_NOTIFICATIONS',
        'android.permission.RECORD_AUDIO',
      ],
    },
    scheme: 'personal-assistant',
    plugins: [
      '@react-native-community/datetimepicker',
      [
        'expo-notifications',
        {
          defaultChannel: 'event-reminders',
          color: '#1a1b2e',
        },
      ],
    ],
    extra: {
      openaiApiKey: process.env.EXPO_PUBLIC_OPENAI_API_KEY,
      eas: {
        projectId: "c5fe0bd4-b45c-4f4b-92c9-050769661263"
      }
    },
  },
};
