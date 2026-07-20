/**
 * IB-01 service terminal. Only the live channels are edited here — operator
 * status and short thoughts — and both hit the public site the moment they
 * save, because the front panel fetches them from Firestore at runtime.
 * Security rules make writes operator-only.
 */
import { initializeApp } from 'firebase/app';
import {
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  type User,
} from 'firebase/auth';
import {
  getFirestore,
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  deleteDoc,
  type Firestore,
} from 'firebase/firestore';
import { firebaseConfig, firebaseConfigured } from '../lib/firebase-config';
import { presetById, type OperatorStatus } from '../lib/status-presets';
import { renderMini } from '../lib/mini-md';
import { fmtDate } from '../lib/dates';

interface FeedItem {
  date: string;
  text: string;
  kind: 'thought' | 'activity';
  link?: string;
  created: string;
}

const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const today = () => new Date().toISOString().slice(0, 10);

let db: Firestore;
let thoughts = new Map<string, FeedItem>(); // firestore id -> feed item

function flash(el: HTMLElement, msg: string, bad = false) {
  el.textContent = msg;
  el.classList.toggle('bad', bad);
  if (!bad) setTimeout(() => { if (el.textContent === msg) el.textContent = ''; }, 4000);
}

/* ---------- boot ---------- */

if (!firebaseConfigured) {
  $('notConfigured').hidden = false;
} else {
  const app = initializeApp(firebaseConfig);
  const auth = getAuth(app);
  db = getFirestore(app);

  onAuthStateChanged(auth, (user) => {
    $('gate').hidden = !!user;
    $('console').hidden = !user;
    $('sessionBox').hidden = !user;
    if (user) enter(user);
  });

  $('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const err = $('loginErr');
    err.textContent = '';
    try {
      await signInWithEmailAndPassword(
        auth,
        ($('loginEmail') as HTMLInputElement).value.trim(),
        ($('loginPassword') as HTMLInputElement).value
      );
    } catch {
      err.textContent = 'ACCESS DENIED — CHECK CREDENTIALS';
    }
  });

  $('signOutBtn').addEventListener('click', () => signOut(auth));
}

async function enter(user: User) {
  const known = firebaseConfig.adminEmails.map((e) => e.toLowerCase());
  const mine = (user.email ?? '').toLowerCase();
  $('whoami').textContent = known.includes(mine)
    ? `OPERATOR: ${mine}`
    : `${mine} — NOT AN OPERATOR (writes will be rejected)`;

  const [statusSnap, thoughtsSnap] = await Promise.all([
    getDoc(doc(db, 'status', 'current')),
    getDocs(collection(db, 'thoughts')),
  ]);
  thoughts = new Map(thoughtsSnap.docs.map((d) => [d.id, d.data() as FeedItem]));

  showCurrentStatus(statusSnap.exists() ? (statusSnap.data() as OperatorStatus) : null);
  resetThoughtForm();
  renderThoughts();
}

/* ---------- tabs ---------- */

document.querySelectorAll<HTMLButtonElement>('.tab').forEach((tab) =>
  tab.addEventListener('click', () => {
    document.querySelectorAll<HTMLButtonElement>('.tab').forEach((t) => {
      const on = t === tab;
      t.classList.toggle('active', on);
      t.setAttribute('aria-selected', String(on));
    });
    document.querySelectorAll<HTMLElement>('.pane').forEach((p) => {
      p.hidden = p.id !== `pane-${tab.dataset.tab}`;
    });
  })
);

/* ---------- STATUS ---------- */

function selectedPreset(): string | null {
  return (
    document.querySelector<HTMLElement>('#presetGrid .preset.active')?.dataset.preset ?? null
  );
}

function showCurrentStatus(s: OperatorStatus | null) {
  const live = $('statusLive');
  if (!s?.preset || !presetById(s.preset)) {
    live.textContent = 'NO STATUS SET — THE FRONT PANEL SHOWS NOTHING';
    return;
  }
  const p = presetById(s.preset)!;
  live.textContent =
    `LIVE NOW: ${p.glyph} ${p.label}` + (s.note ? ` · ${s.note.toUpperCase()}` : '');
  document
    .querySelectorAll<HTMLElement>('#presetGrid .preset')
    .forEach((b) => b.classList.toggle('active', b.dataset.preset === s.preset));
  ($('statusNote') as HTMLInputElement).value = s.note ?? '';
}

document.querySelectorAll<HTMLButtonElement>('#presetGrid .preset').forEach((b) =>
  b.addEventListener('click', () => {
    document
      .querySelectorAll('#presetGrid .preset')
      .forEach((x) => x.classList.toggle('active', x === b));
  })
);

$('statusSet').addEventListener('click', async () => {
  const msg = $('statusMsg');
  const preset = selectedPreset();
  if (!preset) return flash(msg, 'PICK A PRESET FIRST', true);
  const status: OperatorStatus = { preset, updated: new Date().toISOString() };
  const note = ($('statusNote') as HTMLInputElement).value.trim();
  if (note) status.note = note;
  try {
    await setDoc(doc(db, 'status', 'current'), status);
    showCurrentStatus(status);
    flash(msg, 'STATUS LIVE ✓');
  } catch (e) {
    flash(msg, `WRITE FAILED: ${(e as Error).message}`, true);
  }
});

$('statusClear').addEventListener('click', async () => {
  const msg = $('statusMsg');
  try {
    await deleteDoc(doc(db, 'status', 'current'));
    document.querySelectorAll('#presetGrid .preset').forEach((x) => x.classList.remove('active'));
    ($('statusNote') as HTMLInputElement).value = '';
    showCurrentStatus(null);
    flash(msg, 'STATUS CLEARED');
  } catch (e) {
    flash(msg, `WRITE FAILED: ${(e as Error).message}`, true);
  }
});

/* ---------- THOUGHTS ---------- */

let editingThoughtId: string | null = null;

function feedKind(): FeedItem['kind'] {
  return (document.querySelector('#feedKind .seg-btn.active') as HTMLElement).dataset
    .kind as FeedItem['kind'];
}

function setFeedKind(kind: string) {
  document
    .querySelectorAll<HTMLElement>('#feedKind .seg-btn')
    .forEach((b) => b.classList.toggle('active', b.dataset.kind === kind));
}

document.querySelectorAll<HTMLButtonElement>('#feedKind .seg-btn').forEach((b) =>
  b.addEventListener('click', () => setFeedKind(b.dataset.kind!))
);

function resetThoughtForm() {
  editingThoughtId = null;
  $('thoughtFormTitle').textContent = 'POST TO THE FEED';
  setFeedKind('thought');
  ($('thoughtText') as HTMLTextAreaElement).value = '';
  ($('thoughtLink') as HTMLInputElement).value = '';
  ($('thoughtDate') as HTMLInputElement).value = today();
  $('thoughtCancelEdit').hidden = true;
  $('thoughtPreview').hidden = true;
}

const sortedThoughts = () =>
  [...thoughts.entries()].sort(([, a], [, b]) =>
    a.date === b.date ? b.created.localeCompare(a.created) : b.date.localeCompare(a.date));

function renderThoughts() {
  $('thoughtList').innerHTML = sortedThoughts()
    .map(([id, t]) => `<li data-id="${esc(id)}"${id === editingThoughtId ? ' class="editing"' : ''}>
      <span class="meta">${esc(fmtDate(t.date))}
        <span class="tag ${t.kind === 'activity' ? 'tag-ship' : 'tag-note'}">${t.kind === 'activity' ? 'ACT' : 'THT'}</span>
        ${t.link ? '<span class="tag tag-txt">LINK</span>' : ''}</span>
      <span class="body">${renderMini(t.text)}</span>
      <span class="acts"><button class="btn" data-act="edit">EDIT</button><button class="btn" data-act="del">DEL</button></span>
    </li>`)
    .join('');
}

let previewTimer: ReturnType<typeof setTimeout>;
$('thoughtText').addEventListener('input', () => {
  clearTimeout(previewTimer);
  previewTimer = setTimeout(() => {
    const text = ($('thoughtText') as HTMLTextAreaElement).value;
    const hasFormatting = /[*_`[]/.test(text);
    $('thoughtPreview').hidden = !hasFormatting;
    if (hasFormatting) $('thoughtPreview').innerHTML = renderMini(text);
  }, 250);
});

$('thoughtCommit').addEventListener('click', async () => {
  const status = $('thoughtStatus');
  const text = ($('thoughtText') as HTMLTextAreaElement).value.trim();
  const date = ($('thoughtDate') as HTMLInputElement).value;
  if (!text || !date) return flash(status, 'TEXT AND DATE REQUIRED', true);
  const link = ($('thoughtLink') as HTMLInputElement).value.trim();
  if (link && !/^(https?:\/\/|\/)/.test(link))
    return flash(status, 'LINK MUST START WITH https:// OR /', true);

  const id = editingThoughtId ?? crypto.randomUUID();
  const existing = editingThoughtId ? thoughts.get(editingThoughtId) : undefined;
  const thought: FeedItem = {
    date,
    text,
    kind: feedKind(),
    created: existing?.created ?? new Date().toISOString(),
  };
  if (link) thought.link = link;
  try {
    await setDoc(doc(db, 'thoughts', id), thought);
    thoughts.set(id, thought);
    resetThoughtForm();
    renderThoughts();
    flash(status, 'LIVE ON THE DEVICE ✓');
  } catch (e) {
    flash(status, `WRITE FAILED: ${(e as Error).message}`, true);
  }
});

$('thoughtCancelEdit').addEventListener('click', () => { resetThoughtForm(); renderThoughts(); });

$('thoughtList').addEventListener('click', async (ev) => {
  const btn = (ev.target as HTMLElement).closest<HTMLButtonElement>('button[data-act]');
  if (!btn) return;
  const id = btn.closest('li')!.dataset.id!;
  const t = thoughts.get(id)!;
  if (btn.dataset.act === 'edit') {
    editingThoughtId = id;
    $('thoughtFormTitle').textContent = `EDIT · ${fmtDate(t.date)}`;
    setFeedKind(t.kind ?? 'thought');
    ($('thoughtText') as HTMLTextAreaElement).value = t.text;
    ($('thoughtLink') as HTMLInputElement).value = t.link ?? '';
    ($('thoughtDate') as HTMLInputElement).value = t.date;
    $('thoughtCancelEdit').hidden = false;
    renderThoughts();
    $('thoughtText').focus();
  } else if (confirm(`Delete this entry — "${t.text.slice(0, 60)}"?`)) {
    await deleteDoc(doc(db, 'thoughts', id));
    thoughts.delete(id);
    if (editingThoughtId === id) resetThoughtForm();
    renderThoughts();
  }
});
