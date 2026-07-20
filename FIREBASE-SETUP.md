# Firebase setup — the IB-01's live channels

The site is a plain static build: log entries (`content/log.yaml`), channels
(`content/projects.yaml`), docs (`content/docs/*.md`), and site meta
(`content/site.yaml`) all live in the repo and ship on push, exactly as before.

Firebase powers only the two **live** channels, fetched by the browser at
runtime so they update the instant you save — no rebuild:

- **STATUS** — the "NOW" strip on the front panel: a preset (working, workout,
  eating, travelling, vacation, at a session, sleeping, offline — each with a
  glyph) plus optional free text ("leg day", "exploring Athens").
- **THOUGHTS** — the short-thought stream on the WRITING panel. A couple of
  sentences with minimal markdown (bold, italic, code, links).

Both are edited at **`/admin`** on the live site, behind a login only you have.
Until Firebase is configured, the site simply shows no status and no thoughts.

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

## 4. Deploy and go

1. Commit and push `firebase.config.json` (merge this branch) — the site
   rebuilds with the runtime fetch enabled.
2. Open **`https://ivanbashkirov.com/admin`**, log in, set a status, post a
   thought. Both are visible on the public site on the next page load —
   no build, no waiting.

## How it fits together

```
git push ──▶ GitHub Actions build ──▶ GitHub Pages (log, docs, channels, meta)
/admin (Firebase Auth) ──writes──▶ Firestore ◀──runtime fetch── visitor's browser
                                                (NOW strip + thought stream)
```

Data model in Firestore:

| Collection | Document id | Fields |
| --- | --- | --- |
| `status` | `current` (single doc) | preset (see `src/lib/status-presets.ts`), note? (free text), updated (ISO) |
| `thoughts` | random uuid | date (`YYYY-MM-DD`), text (mini-markdown), created (ISO) |

Adding a preset later = one line in `src/lib/status-presets.ts` (id, glyph,
label); the admin picker and the front panel both read from it.
