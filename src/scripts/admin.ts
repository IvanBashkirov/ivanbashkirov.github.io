/**
 * IB-01 service terminal. Talks straight to Firestore with the operator's
 * credentials; security rules make it read-only for everyone else.
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
import { marked } from 'marked';
import { firebaseConfig, firebaseConfigured } from '../lib/firebase-config';

interface LogEntry { n: number; date: string; type: 'ship' | 'txt' | 'note'; text: string; doc?: string; }
interface DocRecord {
  title: string; ref: string; date: string; kind: 'essay' | 'thought' | 'tune';
  minutes?: number; standfirst?: string; hidden: boolean; body: string;
}
interface Project { ch: string; name: string; status: string; desc: string; link?: string; year: string; }

const REPO = 'IvanBashkirov/ivanbashkirov.github.io';
const WORKFLOW = 'deploy.yml';
const BRANCH = 'master';
const PAT_KEY = 'ib01-gh-pat';
const DIRTY_KEY = 'ib01-unpublished';

const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const today = () => new Date().toISOString().slice(0, 10);
const fmtN = (n: number) => `Nº ${String(n).padStart(3, '0')}`;

let db: Firestore;
let log = new Map<string, LogEntry>();   // firestore id -> entry
let docsMap = new Map<string, DocRecord>(); // slug -> doc
let projects = new Map<string, Project>(); // firestore id -> project

function flash(el: HTMLElement, msg: string, bad = false) {
  el.textContent = msg;
  el.classList.toggle('bad', bad);
  if (!bad) setTimeout(() => { if (el.textContent === msg) el.textContent = ''; }, 4000);
}

function markDirty() {
  localStorage.setItem(DIRTY_KEY, '1');
  $('publishLed').classList.add('hot');
}

const sortedLog = () =>
  [...log.entries()].sort(([, a], [, b]) =>
    a.date === b.date ? b.n - a.n : b.date.localeCompare(a.date));
const sortedDocs = () =>
  [...docsMap.entries()].sort(([, a], [, b]) => b.date.localeCompare(a.date));
const sortedProjects = () =>
  [...projects.entries()].sort(([, a], [, b]) => a.ch.localeCompare(b.ch));

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
    else $('publishPanel').hidden = true;
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
  if (localStorage.getItem(DIRTY_KEY)) $('publishLed').classList.add('hot');

  const [logSnap, docsSnap, projSnap, siteSnap] = await Promise.all([
    getDocs(collection(db, 'log')),
    getDocs(collection(db, 'docs')),
    getDocs(collection(db, 'projects')),
    getDoc(doc(db, 'site', 'meta')),
  ]);
  log = new Map(logSnap.docs.map((d) => [d.id, d.data() as LogEntry]));
  docsMap = new Map(docsSnap.docs.map((d) => [d.id, d.data() as DocRecord]));
  projects = new Map(projSnap.docs.map((d) => [d.id, d.data() as Project]));

  fillMeta(siteSnap.exists() ? (siteSnap.data() as Record<string, unknown>) : seedSite());
  if (!siteSnap.exists())
    flash($('mStatus'), 'META NOT IN FIRESTORE YET — PREFILLED FROM REPO, PRESS SAVE');

  resetLogForm();
  renderLog();
  renderDocs();
  renderProjects();
}

function seedSite(): Record<string, unknown> {
  return JSON.parse($('seed-site').textContent || '{}');
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

/* ---------- LOG quick pad ---------- */

let editingLogId: string | null = null;

function logType(): LogEntry['type'] {
  return (document.querySelector('#logType .seg-btn.active') as HTMLElement).dataset
    .type as LogEntry['type'];
}

document.querySelectorAll<HTMLButtonElement>('#logType .seg-btn').forEach((b) =>
  b.addEventListener('click', () => {
    document.querySelectorAll('#logType .seg-btn').forEach((x) => x.classList.toggle('active', x === b));
  })
);

function nextN(): number {
  return Math.max(0, ...[...log.values()].map((e) => e.n)) + 1;
}

function resetLogForm() {
  editingLogId = null;
  $('logFormTitle').textContent = 'QUICK ENTRY';
  ($('logText') as HTMLTextAreaElement).value = '';
  ($('logDate') as HTMLInputElement).value = today();
  ($('logN') as HTMLInputElement).value = String(nextN());
  $('logCancelEdit').hidden = true;
  const sel = $('logDoc') as HTMLSelectElement;
  sel.innerHTML =
    '<option value="">— NONE —</option>' +
    sortedDocs()
      .map(([slug, d]) => `<option value="${esc(slug)}">${esc(d.ref)} · ${esc(d.title)}</option>`)
      .join('');
}

$('logCommit').addEventListener('click', async () => {
  const status = $('logStatus');
  const text = ($('logText') as HTMLTextAreaElement).value.trim();
  const date = ($('logDate') as HTMLInputElement).value;
  const n = Number(($('logN') as HTMLInputElement).value);
  if (!text || !date || !n) return flash(status, 'TEXT, DATE AND Nº REQUIRED', true);

  const entry: LogEntry = { n, date, type: logType(), text };
  const attach = ($('logDoc') as HTMLSelectElement).value;
  if (attach) entry.doc = attach;

  const id = String(n).padStart(4, '0');
  try {
    await setDoc(doc(db, 'log', id), entry);
    if (editingLogId && editingLogId !== id) await deleteDoc(doc(db, 'log', editingLogId));
    log.delete(editingLogId ?? '');
    log.set(id, entry);
    markDirty();
    resetLogForm();
    renderLog();
    flash(status, 'COMMITTED ✓');
  } catch (e) {
    flash(status, `WRITE FAILED: ${(e as Error).message}`, true);
  }
});

$('logCancelEdit').addEventListener('click', () => resetLogForm());

function renderLog() {
  const TAGS: Record<string, string> = { ship: 'SHIP', txt: 'TXT', note: 'NOTE' };
  $('logList').innerHTML = sortedLog()
    .map(([id, e]) => {
      const attach = e.doc && docsMap.has(e.doc)
        ? `<span class="attach">🖫 ${esc(docsMap.get(e.doc)!.title)}</span>` : '';
      return `<li data-id="${esc(id)}"${id === editingLogId ? ' class="editing"' : ''}>
        <span class="meta">${esc(e.date)} <span class="tag tag-${esc(e.type)}">${TAGS[e.type] ?? '?'}</span> ${fmtN(e.n)}</span>
        <span class="body">${esc(e.text)} ${attach}</span>
        <span class="acts"><button class="btn" data-act="edit">EDIT</button><button class="btn" data-act="del">DEL</button></span>
      </li>`;
    })
    .join('');
}

$('logList').addEventListener('click', async (ev) => {
  const btn = (ev.target as HTMLElement).closest<HTMLButtonElement>('button[data-act]');
  if (!btn) return;
  const id = btn.closest('li')!.dataset.id!;
  const entry = log.get(id)!;
  if (btn.dataset.act === 'edit') {
    editingLogId = id;
    $('logFormTitle').textContent = `EDIT ${fmtN(entry.n)}`;
    document.querySelectorAll<HTMLElement>('#logType .seg-btn').forEach((b) =>
      b.classList.toggle('active', b.dataset.type === entry.type));
    ($('logText') as HTMLTextAreaElement).value = entry.text;
    ($('logDate') as HTMLInputElement).value = entry.date;
    ($('logN') as HTMLInputElement).value = String(entry.n);
    ($('logDoc') as HTMLSelectElement).value = entry.doc ?? '';
    $('logCancelEdit').hidden = false;
    renderLog();
    $('logText').focus();
  } else if (confirm(`Delete ${fmtN(entry.n)} — "${entry.text.slice(0, 60)}"?`)) {
    await deleteDoc(doc(db, 'log', id));
    log.delete(id);
    markDirty();
    if (editingLogId === id) resetLogForm();
    renderLog();
  }
});

/* ---------- DOCS editor ---------- */

let editingSlug: string | null = null; // null = list view or new doc
let slugTouched = false;

const slugify = (s: string) =>
  s.toLowerCase().replace(/['’]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

function nextRef(): string {
  const nums = [...docsMap.values()].map((d) => parseInt(d.ref, 10)).filter((x) => !isNaN(x));
  return String(Math.max(0, ...nums) + 1).padStart(3, '0');
}

function renderDocs() {
  $('docList').innerHTML = sortedDocs()
    .map(([slug, d]) => `<li data-slug="${esc(slug)}">
      <span class="meta">${esc(d.date)} · DOC ${esc(d.ref)} · ${esc(d.kind.toUpperCase())}
        ${d.hidden ? '<span class="tag tag-hidden">HIDDEN</span>' : ''}</span>
      <span class="body">${esc(d.title)}</span>
      <span class="acts"><button class="btn" data-act="edit">OPEN</button></span>
    </li>`)
    .join('');
}

function showDocList() {
  editingSlug = null;
  $('docListView').hidden = false;
  $('docEditView').hidden = true;
  renderDocs();
}

function openDocEditor(slug: string | null) {
  editingSlug = slug;
  slugTouched = !!slug;
  const d: DocRecord = slug
    ? docsMap.get(slug)!
    : { title: '', ref: nextRef(), date: today(), kind: 'essay', hidden: false, body: '' };
  ($('docTitle') as HTMLInputElement).value = d.title;
  ($('docSlug') as HTMLInputElement).value = slug ?? '';
  ($('docSlug') as HTMLInputElement).readOnly = !!slug;
  ($('docRef') as HTMLInputElement).value = d.ref;
  ($('docKind') as HTMLSelectElement).value = d.kind;
  ($('docDate') as HTMLInputElement).value = d.date;
  ($('docMinutes') as HTMLInputElement).value = d.minutes ? String(d.minutes) : '';
  ($('docHidden') as HTMLInputElement).checked = d.hidden;
  ($('docStandfirst') as HTMLInputElement).value = d.standfirst ?? '';
  ($('docBody') as HTMLTextAreaElement).value = d.body;
  $('docDelete').hidden = !slug;
  $('docListView').hidden = true;
  $('docEditView').hidden = false;
  refreshPreview();
}

function refreshPreview() {
  const body = ($('docBody') as HTMLTextAreaElement).value;
  $('docPreview').innerHTML = marked.parse(body) as string;
  const words = body.split(/\s+/).filter(Boolean).length;
  $('docWords').textContent = `${words} WORDS · ~${Math.max(1, Math.round(words / 200))} MIN`;
}

let previewTimer: ReturnType<typeof setTimeout>;
$('docBody').addEventListener('input', () => {
  clearTimeout(previewTimer);
  previewTimer = setTimeout(refreshPreview, 250);
});

$('docTitle').addEventListener('input', () => {
  if (!slugTouched)
    ($('docSlug') as HTMLInputElement).value = slugify(($('docTitle') as HTMLInputElement).value);
});
$('docSlug').addEventListener('input', () => { slugTouched = true; });

$('docNew').addEventListener('click', () => openDocEditor(null));
$('docBack').addEventListener('click', showDocList);

$('docSave').addEventListener('click', async () => {
  const status = $('docStatus');
  const slug = editingSlug ?? slugify(($('docSlug') as HTMLInputElement).value);
  const title = ($('docTitle') as HTMLInputElement).value.trim();
  const date = ($('docDate') as HTMLInputElement).value;
  if (!slug || !title || !date) return flash(status, 'TITLE, SLUG AND DATE REQUIRED', true);
  if (!editingSlug && docsMap.has(slug)) return flash(status, `SLUG "${slug}" ALREADY ON FILE`, true);

  const record: DocRecord = {
    title,
    ref: ($('docRef') as HTMLInputElement).value.trim() || nextRef(),
    date,
    kind: ($('docKind') as HTMLSelectElement).value as DocRecord['kind'],
    hidden: ($('docHidden') as HTMLInputElement).checked,
    body: ($('docBody') as HTMLTextAreaElement).value,
  };
  const minutes = Number(($('docMinutes') as HTMLInputElement).value);
  if (minutes) record.minutes = minutes;
  const standfirst = ($('docStandfirst') as HTMLInputElement).value.trim();
  if (standfirst) record.standfirst = standfirst;

  try {
    await setDoc(doc(db, 'docs', slug), record);
    docsMap.set(slug, record);
    editingSlug = slug;
    ($('docSlug') as HTMLInputElement).value = slug;
    ($('docSlug') as HTMLInputElement).readOnly = true;
    $('docDelete').hidden = false;
    markDirty();
    flash(status, 'SAVED TO FIRESTORE ✓ — PUBLISH TO GO LIVE');
  } catch (e) {
    flash(status, `WRITE FAILED: ${(e as Error).message}`, true);
  }
});

$('docDelete').addEventListener('click', async () => {
  if (!editingSlug) return;
  const d = docsMap.get(editingSlug)!;
  if (!confirm(`Delete DOC ${d.ref} — "${d.title}"? This cannot be undone.`)) return;
  await deleteDoc(doc(db, 'docs', editingSlug));
  docsMap.delete(editingSlug);
  markDirty();
  showDocList();
});

$('docList').addEventListener('click', (ev) => {
  const btn = (ev.target as HTMLElement).closest<HTMLButtonElement>('button[data-act="edit"]');
  if (btn) openDocEditor(btn.closest('li')!.dataset.slug!);
});

/* ---------- CHANNELS ---------- */

let editingProjectId: string | null = null;

function renderProjects() {
  $('chList').innerHTML = sortedProjects()
    .map(([id, p]) => `<li data-id="${esc(id)}"${id === editingProjectId ? ' class="editing"' : ''}>
      <span class="meta">CH ${esc(p.ch)} · ${esc(p.status.toUpperCase())} · ${esc(p.year)}</span>
      <span class="body"><b>${esc(p.name)}</b> — ${esc(p.desc)}</span>
      <span class="acts"><button class="btn" data-act="edit">EDIT</button><button class="btn" data-act="del">DEL</button></span>
    </li>`)
    .join('');
}

function resetProjectForm() {
  editingProjectId = null;
  $('chFormTitle').textContent = 'NEW CHANNEL';
  const next = Math.max(0, ...[...projects.values()].map((p) => parseInt(p.ch, 10) || 0)) + 1;
  ($('chCh') as HTMLInputElement).value = String(next).padStart(2, '0');
  ['chName', 'chDesc', 'chLink', 'chYear'].forEach((id) => (($(id) as HTMLInputElement).value = ''));
  ($('chYear') as HTMLInputElement).value = String(new Date().getFullYear());
  ($('chStatus') as HTMLSelectElement).value = 'rec';
  $('chCancelEdit').hidden = true;
}

$('chCommit').addEventListener('click', async () => {
  const status = $('chStatusMsg');
  const p: Project = {
    ch: ($('chCh') as HTMLInputElement).value.trim(),
    name: ($('chName') as HTMLInputElement).value.trim(),
    status: ($('chStatus') as HTMLSelectElement).value,
    desc: ($('chDesc') as HTMLTextAreaElement).value.trim(),
    year: ($('chYear') as HTMLInputElement).value.trim(),
  };
  const link = ($('chLink') as HTMLInputElement).value.trim();
  if (link) p.link = link;
  if (!p.ch || !p.name) return flash(status, 'CH AND NAME REQUIRED', true);
  try {
    await setDoc(doc(db, 'projects', p.ch), p);
    if (editingProjectId && editingProjectId !== p.ch)
      await deleteDoc(doc(db, 'projects', editingProjectId));
    projects.delete(editingProjectId ?? '');
    projects.set(p.ch, p);
    markDirty();
    resetProjectForm();
    renderProjects();
    flash(status, 'SAVED ✓');
  } catch (e) {
    flash(status, `WRITE FAILED: ${(e as Error).message}`, true);
  }
});

$('chCancelEdit').addEventListener('click', () => { resetProjectForm(); renderProjects(); });

$('chList').addEventListener('click', async (ev) => {
  const btn = (ev.target as HTMLElement).closest<HTMLButtonElement>('button[data-act]');
  if (!btn) return;
  const id = btn.closest('li')!.dataset.id!;
  const p = projects.get(id)!;
  if (btn.dataset.act === 'edit') {
    editingProjectId = id;
    $('chFormTitle').textContent = `EDIT CH ${p.ch}`;
    ($('chCh') as HTMLInputElement).value = p.ch;
    ($('chName') as HTMLInputElement).value = p.name;
    ($('chStatus') as HTMLSelectElement).value = p.status;
    ($('chDesc') as HTMLTextAreaElement).value = p.desc;
    ($('chLink') as HTMLInputElement).value = p.link ?? '';
    ($('chYear') as HTMLInputElement).value = p.year;
    $('chCancelEdit').hidden = false;
    renderProjects();
  } else if (confirm(`Strike channel ${p.ch} — ${p.name}?`)) {
    await deleteDoc(doc(db, 'projects', id));
    projects.delete(id);
    markDirty();
    if (editingProjectId === id) resetProjectForm();
    renderProjects();
  }
});

/* ---------- META ---------- */

function fillMeta(m: Record<string, unknown>) {
  const set = (id: string, v: unknown) => (($(id) as HTMLInputElement).value = v == null ? '' : String(v));
  set('mTitle', m.title); set('mSerial', m.serial); set('mDomain', m.domain);
  set('mEmail', m.email); set('mX', m.x); set('mGithub', m.github);
  set('mLondon', m.londonDeparture); set('mTunes', m.tunesLogged ?? 0); set('mBio', m.bio);
}

$('mSave').addEventListener('click', async () => {
  const status = $('mStatus');
  const val = (id: string) => ($(id) as HTMLInputElement).value.trim();
  try {
    await setDoc(doc(db, 'site', 'meta'), {
      title: val('mTitle'), serial: val('mSerial'), domain: val('mDomain'),
      email: val('mEmail'), x: val('mX'), github: val('mGithub'),
      londonDeparture: val('mLondon'), tunesLogged: Number(val('mTunes')) || 0,
      bio: ($('mBio') as HTMLTextAreaElement).value.trim(),
    });
    markDirty();
    flash(status, 'NAMEPLATE SAVED ✓');
  } catch (e) {
    flash(status, `WRITE FAILED: ${(e as Error).message}`, true);
  }
});

/* ---------- PUBLISH ---------- */

$('publishBtn').addEventListener('click', () => {
  const panel = $('publishPanel');
  panel.hidden = !panel.hidden;
  ($('ghToken') as HTMLInputElement).value = localStorage.getItem(PAT_KEY) ?? '';
});

$('publishGo').addEventListener('click', async () => {
  const status = $('publishStatus');
  const token = ($('ghToken') as HTMLInputElement).value.trim();
  if (!token) return flash(status, 'TOKEN REQUIRED', true);
  localStorage.setItem(PAT_KEY, token);
  status.classList.remove('bad');
  status.textContent = 'DISPATCHING BUILD…';
  try {
    const res = await fetch(
      `https://api.github.com/repos/${REPO}/actions/workflows/${WORKFLOW}/dispatches`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/vnd.github+json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ref: BRANCH }),
      }
    );
    if (res.status === 204) {
      localStorage.removeItem(DIRTY_KEY);
      $('publishLed').classList.remove('hot');
      status.textContent = 'BUILD TRIGGERED ✓ — SITE RE-RENDERS FROM FIRESTORE IN ~2 MIN';
    } else {
      flash(status, `GITHUB SAID ${res.status} — CHECK TOKEN SCOPES (Actions: read & write)`, true);
    }
  } catch (e) {
    flash(status, `DISPATCH FAILED: ${(e as Error).message}`, true);
  }
});
