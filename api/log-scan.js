// POST /api/log-scan  { userId }
// Increments a scan counter and appends a timestamp — lets the owner see
// on their Dashboard how many times the QR was actually scanned.

import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

function initAdmin() {
  if (getApps().length) return;
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
    const { userId } = req.body || {};
    if (!userId) {
      res.status(400).json({ error: "Missing userId" });
      return;
    }
    const db = getFirestore();
    await db.collection("profiles").doc(userId).set(
      {
        scanCount: FieldValue.increment(1),
        lastScanAt: new Date().toISOString(),
      },
      { merge: true }
    );
    res.status(200).json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}
