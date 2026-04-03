import { getApp, getApps, initializeApp } from 'firebase/app';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getAuth, getReactNativePersistence, initializeAuth } from 'firebase/auth';
import { getFirestore, setLogLevel } from 'firebase/firestore';
import { Platform } from 'react-native';

const firebaseConfig = {
  apiKey: 'AIzaSyABvC3sj2dU3HDX6_PaVxDLmT7L2-U5Tm8',
  authDomain: 'ticket-booking-662ee.firebaseapp.com',
  projectId: 'ticket-booking-662ee',
  storageBucket: 'ticket-booking-662ee.firebasestorage.app',
  messagingSenderId: '103094256545',
  appId: '1:103094256545:web:01445188ae4e07c01241e0',
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

// Reduce noisy non-critical Firestore warnings like BloomFilter error logs.
setLogLevel('error');

const createAuth = () => {
  if (Platform.OS === 'web') {
    return getAuth(app);
  }

  try {
    return initializeAuth(app, {
      persistence: getReactNativePersistence(AsyncStorage),
    });
  } catch {
    return getAuth(app);
  }
};

export const auth = createAuth();
export const db = getFirestore(app);
