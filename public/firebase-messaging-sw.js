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

messaging.onBackgroundMessage((payload) => {
  const data = payload.data || {};
  const title = data.title || "🚨 EMERGENCY ALERT";
  const options = {
    body: data.body || "Someone needs urgent help. Tap for details.",
    icon: "/siren-icon.png",
    badge: "/siren-icon.png",
    // 'siren' vibration pattern: long-short-long-short, repeated
    vibrate: [400, 150, 400, 150, 400, 150, 400],
    requireInteraction: true, // stays on screen until dismissed
    tag: "emergency-alert",
    renotify: true,
    data: { url: data.url || "/" },
    actions: [
      { action: "open", title: "View details" },
    ],
  };
  self.registration.showNotification(title, options);
});

// Tapping the notification opens (or focuses) the app
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
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
