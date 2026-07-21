/* Firebase Cloud Messaging service worker.
   Handles push notifications that arrive while the app/tab is closed or in background,
   and makes sure they show up as a loud, hard-to-miss "Emergency Alert" notification. */

importScripts("https://www.gstatic.com/firebasejs/10.13.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.13.0/firebase-messaging-compat.js");

// Keep this in sync with src/lib/firebase.js
firebase.initializeApp({
  apiKey: "AIzaSyDqLThvBn19ajSG1uqeA6JtnouA5u1RxuM",
  authDomain: "yash-software.firebaseapp.com",
  databaseURL: "https://yash-software-default-rtdb.firebaseio.com",
  projectId: "yash-software",
  storageBucket: "yash-software.firebasestorage.app",
  messagingSenderId: "333775666671",
  appId: "1:333775666671:web:4f9cbca22a8200b3d78a1a",
});

const messaging = firebase.messaging();

// One very long, near-continuous vibration pattern (buzz / pause / buzz...).
// Repeated ~40 times = a couple minutes of buzzing per notification cycle;
// the repost loop below re-triggers this on top of it every few seconds too,
// so the phone feels like it's vibrating non-stop until the alert is opened.
const LONG_VIBRATE_PATTERN = Array(40).fill([500, 200]).flat();

// Bump this on every repost so tag+renotify forces a fresh alert each time
// (same tag replaces the old one instead of stacking duplicates).
let repeatCounter = 0;
let repeatTimer = null;
const REPEAT_MS = 3500; // fastest interval mobile OSes will reliably honor

function showEmergencyNotification(title, body, url) {
  return self.registration.showNotification(title || "🚨 EMERGENCY ALERT", {
    body: body || "Someone needs urgent help. Tap for details.",
    icon: "/siren-icon.png",
    badge: "/siren-icon.png",
    vibrate: LONG_VIBRATE_PATTERN,
    requireInteraction: true, // stays on screen until dismissed
    silent: false,
    tag: "emergency-alert",
    renotify: true, // forces sound+vibration again even though tag is reused
    data: { url: url || "/", repeat: repeatCounter++ },
    actions: [{ action: "open", title: "View details" }],
  });
}

function startRepeatingAlert(title, body, url) {
  stopRepeatingAlert();
  showEmergencyNotification(title, body, url);
  repeatTimer = setInterval(() => {
    showEmergencyNotification(title, body, url);
  }, REPEAT_MS);
}

function stopRepeatingAlert() {
  if (repeatTimer) {
    clearInterval(repeatTimer);
    repeatTimer = null;
  }
}

messaging.onBackgroundMessage((payload) => {
  const data = payload.data || {};
  // A service worker can be killed/restarted by the OS between pushes, so we
  // can't rely on setInterval alone surviving forever — but while this worker
  // instance is alive (which is most of the time once a push wakes it), this
  // keeps renotifying every few seconds until the user taps it.
  startRepeatingAlert(data.title, data.body, data.url);
});

// Tapping the notification: stop the repeat loop, close it, and open the app.
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  stopRepeatingAlert();
  const url = event.notification.data?.url || "/";
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url.includes(url) && "focus" in client) return client.focus();
      }
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});
