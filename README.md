# Emergency QR — Setup Guide

A full working project:

- **Signup / Login** (Firebase Auth)
- **Dashboard** — enter your details + up to 3 emergency contacts, see scan stats and contact responses
- **QR Code** — auto-generated, downloadable, printable
- **Public Emergency Page** (`/e/:userId`) — opens when the QR is scanned. No login required.
- **Alert button** per contact — tap it, choose WhatsApp or SMS, and a pre-filled emergency
  message (with the finder's live location, if available) opens ready to send.
- **Siren push notification** — if the contact has enabled it once, their phone gets a loud,
  hard-to-miss push alert the moment "Alert" is tapped — even if their phone is locked or the
  app/tab is closed.
- **Call button** — one tap to dial a contact directly.
- **Medical info** — blood group, allergies, conditions, and current medications, shown on the
  emergency page.
- **Scan counter** — see how many times your QR has actually been scanned.
- **"I'm on it" reply** — a link in every alert message lets the contact tell you they've seen it.

No paid backend, no Twilio, no per-message cost. Everything runs on:
- **Vercel** — static hosting + two small serverless functions (free tier is enough)
- **Firebase** — Auth, Firestore, and Cloud Messaging (all free tier)

---

## Step 1 — Firebase Console Setup

1. Go to https://console.firebase.google.com → open your project (or create one)
2. **Build → Authentication** → Get started → enable Email/Password
3. **Build → Firestore Database** → Create database → production mode
4. **Web app config** — Project Settings (⚙️) → "Your apps" → add a Web app if you haven't,
   copy the `firebaseConfig` object. This project already has it filled in at
   `src/lib/firebase.js` — double check it matches your project.

### Enable Cloud Messaging (for the siren push alert)

1. Project Settings → **Cloud Messaging** tab
2. Under **Web Push certificates**, click **Generate key pair**
3. Copy the key string and paste it into `src/lib/firebase.js`:
   ```js
   export const VAPID_KEY = "PASTE_YOUR_VAPID_KEY_HERE";
   ```

### Generate a service account (for the serverless functions)

The `/api/send-alert`, `/api/log-scan`, and `/api/mark-responded` functions need
admin access to Firestore + Cloud Messaging:

1. Project Settings → **Service accounts** tab → **Generate new private key**
2. This downloads a JSON file. **Do not commit this file to GitHub.**
3. Open it and note three values: `project_id`, `client_email`, `private_key`

---

## Step 2 — Environment Variables (Vercel)

In your Vercel project → **Settings → Environment Variables**, add:

| Name | Value |
|---|---|
| `FIREBASE_PROJECT_ID` | the `project_id` from the service account JSON |
| `FIREBASE_CLIENT_EMAIL` | the `client_email` from the service account JSON |
| `FIREBASE_PRIVATE_KEY` | the `private_key` from the service account JSON (keep the `\n` characters as-is, paste the whole string in quotes) |

Redeploy after adding these — the serverless functions read them at runtime.

For local testing, create a `.env.local` file in the project root with the same three variables.

---

## Step 3 — Firestore Rules

Deploy the included rules so the public emergency page can read profiles, and
so contacts (without logging in) can subscribe their device for push alerts:

```bash
npm install -g firebase-tools
firebase login
firebase use yash-software
firebase deploy --only firestore:rules,firestore:indexes
```

---

## Step 4 — Local Test

```bash
npm install
npm run dev
```

---

## Step 5 — Deploy to Vercel

1. Push this folder to GitHub
2. https://vercel.com → **Add New Project** → import the repo
3. Vercel auto-detects the Vite build (`npm run build`, output `dist`) — no changes needed
4. Add the environment variables from Step 2
5. Deploy

The live URL becomes the base for every QR code (generated automatically on the Dashboard).

---

## How the Siren Alert Works

1. A contact opens the emergency page once (share them the `/e/:userId` link directly) and
   taps **"Enable siren alerts on this phone."** This asks for notification permission —
   a normal one-time browser prompt, nothing to install.
2. Their device token is saved to Firestore under that profile.
3. When someone scans the QR later and taps **Alert** for that contact, the page calls
   `/api/send-alert`, which uses Firebase Cloud Messaging to push a high-priority notification
   with vibration and sound to every subscribed device for that contact.
4. WhatsApp/SMS still work independently of this — the siren is an extra layer, not a
   replacement.

This only works for a phone number that has explicitly subscribed. There's no way (and no
legitimate way) to make an unrelated phone ring or notify without that person's permission —
that's how phone security works everywhere, not a limitation specific to this app.

---

## File Structure

```
emergency-qr/
├── api/
│   ├── send-alert.js        ← triggers the siren push notification
│   ├── log-scan.js          ← increments the scan counter
│   └── mark-responded.js    ← handles the "I'm on it" reply link
├── public/
│   ├── firebase-messaging-sw.js  ← service worker for background push
│   └── siren-icon.png
├── src/
│   ├── lib/
│   │   ├── firebase.js       ← your Firebase config + VAPID key go here
│   │   ├── notifications.js  ← device subscription logic
│   │   └── siren.js          ← in-browser siren sound generator
│   ├── pages/
│   │   ├── Signup.jsx
│   │   ├── Login.jsx
│   │   ├── Dashboard.jsx     ← details, contacts, QR, scan stats, responses
│   │   └── EmergencyPage.jsx ← the public page opened by the QR scan
│   ├── App.jsx
│   └── main.jsx
├── firestore.rules
├── vercel.json
└── package.json
```

## Safety Note

The Alert button requires a tap — it's intentionally not automatic on scan. This prevents
false alarms from random or curious scans, while still getting help moving in seconds once
someone chooses to act.
