# Firebase setup — making the IB-01 content live

All site content (log entries, projects/channels, docs, and the nameplate meta)
lives in **Cloud Firestore**. The public site is still a static GitHub Pages
build — but the build **fetches everything from Firestore**, and you edit it at
**`/admin`** on the live site. Until Firebase is configured, the build falls
back to the local `content/` files, so nothing breaks in the meantime.

One-time setup, roughly 10 minutes:

## 1. Create the Firebase project

1. Go to <https://console.firebase.google.com> → **Add project** (any name,
   e.g. `ib01`). Google Analytics is not needed.
2. In the project: **Project settings → General → Your apps → Add app → Web**
   (`</>` icon). Name it anything; no hosting needed.
3. Copy the config values it shows (`apiKey`, `authDomain`, `projectId`,
   `storageBucket`, `messagingSenderId`, `appId`) into
   **`firebase.config.json`** in the repo root, replacing the `PASTE_…`
   placeholders. These values are public by design — committing them is fine.
   Check that `adminEmails` lists the email(s) you will log in with.

## 2. Enable login (email/password)

1. **Build → Authentication → Get started → Sign-in method** → enable
   **Email/Password** (just the first toggle, not email link).
2. **Authentication → Users → Add user** → your email + a strong password.
   This is what you'll log in to `/admin` with.

Even if a stranger somehow created an account, the security rules below only
accept writes from the emails listed in `firestore.rules`.

## 3. Create the database and set the rules

1. **Build → Firestore Database → Create database** → production mode, pick a
   region near you (e.g. `europe-west1`).
2. Open the **Rules** tab, replace the contents with the repo's
   **`firestore.rules`** file, and **Publish**. If your login email differs
   from the ones listed there, edit the list (and `adminEmails` in
   `firebase.config.json`) first.

## 4. Deploy and initialise

1. Commit and push `firebase.config.json` (merge this branch) — the site
   rebuilds with Firestore as its content source.
2. Open **`https://ivanbashkirov.com/admin`**, log in.
3. Go to **META** — it's prefilled from the repo's `site.yaml` — press
   **SAVE META** once to write it to Firestore.
4. Add log entries, channels, and docs from their tabs. Everything saves to
   Firestore instantly.

## 5. The PUBLISH button

Saving writes to Firestore immediately, but the public pages are static
renders — press **PUBLISH** to run the GitHub Pages build so the site
re-renders from Firestore (takes ~2 minutes). The button needs a GitHub token,
kept only in your browser's localStorage:

1. GitHub → **Settings → Developer settings → Personal access tokens →
   Fine-grained tokens → Generate new token**.
2. Repository access: **Only select repositories** → this repo.
   Permissions: **Actions → Read and write**. Nothing else.
3. Paste it into the PUBLISH panel once; it's remembered on that device.

The amber LED on the PUBLISH button means there are saved edits that haven't
been published yet.

## How it fits together

```
/admin (browser, Firebase Auth) ──writes──▶ Firestore
                                              │
GitHub Actions build (npm run build) ◀──reads─┘   ◀── PUBLISH button
        │
        ▼
GitHub Pages (static HTML, OG images, RSS — all rendered from Firestore)
```

Content model in Firestore:

| Collection | Document id | Fields |
| --- | --- | --- |
| `site` | `meta` (single doc) | title, domain, serial, email, x, github, londonDeparture, tunesLogged, bio |
| `log` | zero-padded Nº (`0001`) | n, date (`YYYY-MM-DD`), type (`ship`/`txt`/`note`), text, doc? (slug) |
| `projects` | channel number (`01`) | ch, name, status (`rec`/`out`/`mute`/`stby`), desc, link?, year |
| `docs` | slug | title, ref, date, kind (`essay`/`thought`/`tune`), minutes?, standfirst?, hidden, body (markdown) |
