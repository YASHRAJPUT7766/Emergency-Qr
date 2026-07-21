import { getToken, onMessage } from "firebase/messaging";
import { doc, setDoc, arrayUnion } from "firebase/firestore";
import { db, getMessagingIfSupported, VAPID_KEY } from "./firebase";
import { playSiren } from "./siren";

// Registers this device for push notifications and stores its FCM token
// under profiles/{ownerUserId}.contactTokens, so the owner's Alert can reach it.
export async function subscribeContactDevice(ownerUserId) {
  const messaging = await getMessagingIfSupported();
  if (!messaging) {
    throw new Error("Push notifications are not supported in this browser.");
  }

  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    throw new Error("Notification permission was not granted.");
  }

  const registration = await navigator.serviceWorker.register("/firebase-messaging-sw.js");
  const token = await getToken(messaging, {
    vapidKey: VAPID_KEY,
    serviceWorkerRegistration: registration,
  });

  if (!token) {
    throw new Error("Could not get a device token. Try again.");
  }

  await setDoc(
    doc(db, "profiles", ownerUserId),
    { contactTokens: arrayUnion(token) },
    { merge: true }
  );

  // Play the siren whenever a push arrives WHILE this tab is open (foreground),
  // and keep repeating it (siren + vibration) every ~3.5s until the user
  // acknowledges the alert — mirrors the background service worker's repeat loop.
  onMessage(messaging, () => {
    startForegroundAlertLoop();
  });

  return token;
}

let foregroundRepeatTimer = null;

function startForegroundAlertLoop() {
  stopForegroundAlertLoop();
  fireForegroundAlert();
  foregroundRepeatTimer = setInterval(fireForegroundAlert, 3500);
}

function fireForegroundAlert() {
  playSiren(3000);
  if (navigator.vibrate) {
    // Long buzz/pause pattern, re-triggered every cycle for a near-continuous feel.
    navigator.vibrate([500, 200, 500, 200, 500, 200, 500]);
  }
}

// Call this when the user acknowledges the alert (e.g. taps "I'm on it" /
// opens the emergency page / dismisses it) to stop the repeating siren.
export function stopForegroundAlertLoop() {
  if (foregroundRepeatTimer) {
    clearInterval(foregroundRepeatTimer);
    foregroundRepeatTimer = null;
  }
  if (navigator.vibrate) navigator.vibrate(0);
}
