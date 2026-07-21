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

  // Play the siren whenever a push arrives WHILE this tab is open (foreground)
  onMessage(messaging, (payload) => {
    playSiren();
  });

  return token;
}
