import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getMessaging, isSupported } from "firebase/messaging";

// 👉 Your Firebase project config
// Firebase Console → Project Settings → General → Your apps → Web app
const firebaseConfig = {
  apiKey: "AIzaSyDqLThvBn19ajSG1uqeA6JtnouA5u1RxuM",
  authDomain: "yash-software.firebaseapp.com",
  databaseURL: "https://yash-software-default-rtdb.firebaseio.com",
  projectId: "yash-software",
  storageBucket: "yash-software.firebasestorage.app",
  messagingSenderId: "333775666671",
  appId: "1:333775666671:web:4f9cbca22a8200b3d78a1a",
  measurementId: "G-F747YYSCWX",
};

// 👉 VAPID key for Web Push (FCM)
// Firebase Console → Project Settings → Cloud Messaging → Web Push certificates → "Generate key pair"
// Paste the generated key string below.
export const VAPID_KEY = "PASTE_YOUR_VAPID_KEY_HERE";

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);

// Messaging only works in supported browsers (not older Safari, not in-app webviews sometimes)
export async function getMessagingIfSupported() {
  if (await isSupported()) {
    return getMessaging(app);
  }
  return null;
}

export const firebaseConfigForServiceWorker = firebaseConfig;
