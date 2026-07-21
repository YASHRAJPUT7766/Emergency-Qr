// Vercel Serverless Function (Node.js runtime)
// POST /api/send-alert  { userId, finderMessage, mapsUrl }
//
// Looks up the owner's profile in Firestore, grabs every subscribed contact
// device token, and sends them a loud, high-priority push notification.
// This is free (Firebase Cloud Messaging has no cost) and needs no Twilio/SMS API.

import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getMessaging } from "firebase-admin/messaging";

function initAdmin() {
  if (getApps().length) return;
  // These three values come from a Firebase service account JSON.
  // Firebase Console → Project Settings → Service accounts → Generate new private key
  // Set them as Vercel environment variables (see README) — never commit the JSON file itself.
  initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: (process.env.FIREBASE_PRIVATE_KEY || "").replace(/\\n/g, "\n"),
    }),
  });
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  try {
    initAdmin();
    const { userId, finderMessage, mapsUrl } = req.body || {};
    if (!userId) {
      res.status(400).json({ error: "Missing userId" });
      return;
    }

    const db = getFirestore();
    const snap = await db.collection("profiles").doc(userId).get();
    if (!snap.exists) {
      res.status(404).json({ error: "Profile not found" });
      return;
    }

    const profile = snap.data();
    const tokens = profile.contactTokens || [];

    if (!tokens.length) {
      // No one has subscribed their device yet — that's fine, SMS/WhatsApp still works separately.
      res.status(200).json({ sent: 0, reason: "No subscribed devices" });
      return;
    }

    const bodyText = mapsUrl
      ? `${finderMessage || `${profile.name} needs urgent help.`} Location: ${mapsUrl}`
      : (finderMessage || `${profile.name} needs urgent help.`);

    const message = {
      notification: {
        title: `🚨 EMERGENCY ALERT — ${profile.name}`,
        body: bodyText,
      },
      data: {
        title: `🚨 EMERGENCY ALERT — ${profile.name}`,
        body: bodyText,
        url: `/e/${userId}`,
      },
      android: {
        priority: "high",
        notification: { sound: "default", channelId: "emergency" },
      },
      apns: {
        payload: { aps: { sound: "default", "interruption-level": "time-sensitive" } },
      },
      tokens,
    };

    const response = await getMessaging().sendEachForMulticast(message);

    // Clean up tokens that are no longer valid (uninstalled, permission revoked, etc.)
    const invalidTokens = [];
    response.responses.forEach((r, i) => {
      if (!r.success) invalidTokens.push(tokens[i]);
    });
    if (invalidTokens.length) {
      await db.collection("profiles").doc(userId).update({
        contactTokens: tokens.filter((t) => !invalidTokens.includes(t)),
      });
    }

    res.status(200).json({ sent: response.successCount, failed: response.failureCount });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || "Internal error" });
  }
}
