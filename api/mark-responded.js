// GET /api/mark-responded?userId=xxx&contact=Name
// A contact taps this link (from the SMS/WhatsApp message or notification) to
// let the owner know help is on the way. Writes a timestamped entry to Firestore.

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
  try {
    initAdmin();
    const { userId, contact } = req.query;
    if (!userId) {
      res.status(400).send("Missing userId");
      return;
    }

    const db = getFirestore();
    await db.collection("profiles").doc(userId).update({
      responses: FieldValue.arrayUnion({
        contact: contact || "Someone",
        respondedAt: new Date().toISOString(),
      }),
    });

    res.setHeader("Content-Type", "text/html");
    res.status(200).send(`
      <html><body style="font-family:sans-serif;text-align:center;padding:60px 20px;">
        <h2>✅ Thanks — the owner has been notified that you're on it.</h2>
        <p>You can close this page now.</p>
      </body></html>
    `);
  } catch (err) {
    console.error(err);
    res.status(500).send("Something went wrong.");
  }
}
