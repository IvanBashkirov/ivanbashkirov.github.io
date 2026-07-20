/**
 * Live layer: the two things too alive for the static build — operator
 * status and short thoughts — fetched straight from Firestore on page load.
 * Everything else on the device is baked HTML.
 */
import { firebaseConfigured } from '../lib/firebase-config';
import { fetchCollection, fetchDocument } from '../lib/firestore-rest';
import { presetById, type OperatorStatus } from '../lib/status-presets';
import { renderMini } from '../lib/mini-md';
import { fmtDay, groupByMonth } from '../lib/dates';

interface FeedItem {
  date: string; // YYYY-MM-DD
  text: string;
  kind?: 'thought' | 'activity';
  link?: string;
  created?: string;
}

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function ago(iso: string): string {
  const mins = Math.max(0, Math.round((Date.now() - Date.parse(iso)) / 60000));
  if (mins < 60) return `${mins}M AGO`;
  if (mins < 48 * 60) return `${Math.round(mins / 60)}H AGO`;
  return `${Math.round(mins / 1440)}D AGO`;
}

async function initNow() {
  const strip = document.getElementById('nowStrip');
  if (!strip) return;
  const status = (await fetchDocument('status/current')) as OperatorStatus | null;
  if (!status?.preset) return;
  const preset = presetById(status.preset);
  if (!preset) return;
  const note = status.note?.trim();
  strip.innerHTML =
    `<span class="now-label">NOW</span>` +
    `<span class="now-glyph">${esc(preset.glyph)}</span> ${esc(preset.label)}` +
    (note ? ` · ${esc(note.toUpperCase())}` : '') +
    (status.updated ? `<span class="now-ago">${ago(status.updated)}</span>` : '');
  strip.hidden = false;
}

/** Anchor-wrap entry content when the item carries a link. */
const linked = (item: FeedItem, inner: string) =>
  item.link
    ? `<a class="entry-link" href="${esc(item.link)}" rel="noopener">${inner}</a>`
    : inner;

function monthGroups(items: FeedItem[], renderItem: (t: FeedItem) => string): string {
  return groupByMonth(items)
    .map(
      (m) => `<div class="month-group">
        <div class="month-divider" aria-hidden="true">${esc(m.label)}</div>
        ${m.items.map(renderItem).join('')}
      </div>`
    )
    .join('');
}

function renderThoughts(thoughts: FeedItem[]) {
  const stream = document.getElementById('thoughtStream');
  if (!stream || !thoughts.length) return;
  document.getElementById('notesEmpty')?.setAttribute('hidden', '');
  stream.innerHTML = monthGroups(
    thoughts,
    (t) => `<article class="t-entry" data-type="txt">
      <div class="meta">
        <span class="e-date">${esc(fmtDay(t.date))}</span>
        <span class="tag tag-note">THOUGHT</span>
      </div>
      ${linked(t, `<div class="t-body">${renderMini(t.text)}</div>`)}
    </article>`
  );
  const panel = document.getElementById('panel-notes');
  if (panel) panel.dataset.count = `${thoughts.length} NOTES`;
}

/** Activities appear untagged in the activity log, newest first. */
function renderActivities(acts: FeedItem[]) {
  const panel = document.getElementById('panel-activity');
  if (!panel || !acts.length) return;
  panel.querySelector('.empty-state')?.setAttribute('hidden', '');
  const html = groupByMonth(acts)
    .map(
      (m) => `<div class="month-group">
        <div class="month-divider" aria-hidden="true">${esc(m.label)}</div>
        <ol class="entries">
          ${m.items
            .map(
              (a) => `<li class="entry" data-type="live">
                <div class="meta"><span class="e-date">${esc(fmtDay(a.date))}</span></div>
                ${linked(a, `<p class="line">${esc(a.text)}</p>`)}
              </li>`
            )
            .join('')}
        </ol>
      </div>`
    )
    .join('');
  panel.insertAdjacentHTML('afterbegin', html);
  const total = Number(panel.dataset.staticEntries ?? 0) + acts.length;
  panel.dataset.count = `${total} ENTRIES`;
}

/** The status bar count may be stale after runtime entries land. */
function refreshStatusInfo() {
  const m = document.body.dataset.mode;
  const panel = m && document.getElementById(`panel-${m}`);
  const statusInfo = document.getElementById('statusInfo');
  if (panel && statusInfo) statusInfo.textContent = `${panel.dataset.count} · PWR ∞`;
}

async function initFeed() {
  if (!document.getElementById('thoughtStream')) return;
  const docs = await fetchCollection('thoughts');
  const items = docs
    .map((d) => d.data as unknown as FeedItem)
    .filter((t) => t.date && t.text)
    .sort((a, b) =>
      a.date === b.date
        ? (b.created ?? '').localeCompare(a.created ?? '')
        : b.date.localeCompare(a.date)
    );
  renderThoughts(items.filter((t) => t.kind !== 'activity'));
  renderActivities(items.filter((t) => t.kind === 'activity'));
  refreshStatusInfo();
}

export function initLive() {
  if (!firebaseConfigured) return;
  // fire and forget — the static page is complete without either
  initNow().catch(() => {});
  initFeed().catch(() => {});
}
