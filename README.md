# Emergency QR — Setup Guide (Hinglish)

Ye ek full working project hai:
- **Signup/Login** (Firebase Auth)
- **Dashboard** — apni details + 2-3 emergency contacts add karo
- **QR Code** — auto-generate hota hai, download/print kar sakte ho
- **Public Emergency Page** (`/e/:userId`) — QR scan karne pe ye khulta hai, koi login nahi chahiye
- **"Alert" button (har contact ke saamne)** — dabate hi WhatsApp aur SMS ka choice aata hai. Jo chuno, us contact ke number pe pehle se likha hua emergency message leke WhatsApp/SMS app khul jaata hai — bas Send dabana hota hai.

Koi backend/server nahi hai — sab kuch client-side chalta hai (WhatsApp `wa.me` links aur `sms:` links use karke), isliye ye Vercel jaise static hosting pe seedha chal jaata hai. Firebase sirf Auth + Firestore (login aur profile data) ke liye use hota hai.

---

## Step 1 — Firebase Project Banao

1. https://console.firebase.google.com par jao → "Add project" → naam do (e.g. `emergency-qr`)
2. Project ke andar:
   - **Build → Authentication** → "Get started" → Email/Password enable karo
   - **Build → Firestore Database** → "Create database" → production mode
3. Web app add karo: Project settings → "Add app" → Web (`</>`) icon → naam do → aapko ek config object milega jaisा:
```js
const firebaseConfig = {
  apiKey: "...",
  authDomain: "...",
  projectId: "...",
  storageBucket: "...",
  messagingSenderId: "...",
  appId: "..."
};
```
Ye `src/lib/firebase.js` file me paste karna hai.

4. **Firestore rules deploy karo** (taaki public emergency page profile read kar sake, lekin sirf owner hi apna profile edit kar sake):
```bash
firebase login
firebase init firestore   # existing project link karo, rules file me firestore.rules select karo
firebase deploy --only firestore:rules,firestore:indexes
```

---

## Step 2 — Local Test

```bash
npm install
npm run dev
```

`src/lib/firebase.js` me apna config paste karna mat bhoolna, warna Auth/Firestore kaam nahi karega.

---

## Step 3 — Vercel pe Deploy

1. Is folder ko GitHub pe push karo (ya Vercel CLI se seedha deploy karo)
2. https://vercel.com par jao → "Add New Project" → GitHub repo import karo
3. Vercel khud detect kar lega ki ye Vite project hai:
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
4. Deploy dabao — 1-2 min me live URL mil jayega (jaise `emergency-qr.vercel.app`)

CLI se deploy karna ho toh:
```bash
npm install -g vercel
vercel
```

Deploy hone ke baad jo URL milega, wahi QR code me use hoga (Dashboard me profile save karte hi QR auto-generate ho jaata hai us URL ke hisaab se).

---

## File Structure

```
emergency-qr/
├── src/
│   ├── lib/firebase.js       ← yaha apna Firebase config daalna hai
│   ├── pages/
│   │   ├── Signup.jsx
│   │   ├── Login.jsx
│   │   ├── Dashboard.jsx     ← details + contacts add karna, QR dikhana
│   │   └── EmergencyPage.jsx ← public page jo QR scan pe khulta hai
│   ├── App.jsx
│   └── main.jsx
├── firestore.rules
├── vercel.json
└── package.json
```

## Important Safety Note

Button isliye rakha hai (bina button ke sirf scan pe auto-open nahi hota) kyunki:
- Koi bhi random scan (curious log log, bots) false alarm trigger kar sakta hai
- Ek clear tap se accidental alerts rukte hain
- WhatsApp/SMS choose karne ke baad bhi wo respective app khulta hai jaha message pehle se likha hota hai — lekin final "Send" khud finder ko dabana hota hai, taaki koi cheez silently na chali jaaye

Agar chaho toh button ko aur bhi bada/obvious bana sakte ho taaki emergency me 1 second me mil jaye.
