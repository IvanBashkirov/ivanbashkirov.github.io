/**
 * Live layer: the two things too alive for the static build — operator
 * status and short thoughts — fetched straight from Firestore on page load.
 * Everything else on the device is baked HTML.
 */
import { firebaseConfigured } from '../lib/firebase-config';
import { activate } from './nav';
import { fetchCollection, fetchDocument } from '../lib/firestore-rest';
import { presetById, type OperatorStatus } from '../lib/status-presets';
import { renderMini } from '../lib/mini-md';
import { fmtDay, monthLabel } from '../lib/dates';

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
    (status.updated ? ` <span class="now-ago">${ago(status.updated)}</span>` : '');
  strip.hidden = false;
}

/** Anchor-wrap entry content when the item carries a link (external → new tab). */
const linked = (item: FeedItem, inner: string) =>
  item.link
    ? `<a class="entry-link" href="${esc(item.link)}" rel="noopener"${/^https?:/i.test(item.link) ? ' target="_blank"' : ''}>${inner}</a>`
    : inner;

/** Live entries join the LOG stream: thoughts tagged, activities untagged. */
function renderFeedItem(t: FeedItem): string {
  if (t.kind === 'activity') {
    return `<li class="entry" data-cat="log" data-type="live" data-date="${esc(t.date)}">
      <div class="meta"><span class="e-date">${esc(fmtDay(t.date))}</span></div>
      ${linked(t, `<p class="line">${esc(t.text)}</p>`)}
    </li>`;
  }
  return `<li class="entry" data-cat="log" data-type="live" data-date="${esc(t.date)}">
    <div class="meta">
      <span class="e-date">${esc(fmtDay(t.date))}</span>
      <span class="tag tag-note">THOUGHT</span>
    </div>
    ${linked(t, `<div class="t-body">${renderMini(t.text)}</div>`)}
  </li>`;
}

/** Merge a live entry into the static feed in date order, joining the
    matching month group so a month's divider never appears twice. */
function insertFeedItem(panel: HTMLElement, item: FeedItem): void {
  const key = item.date.slice(0, 7);
  let group = panel.querySelector<HTMLElement>(`.month-group[data-month="${key}"]`);
  if (!group) {
    group = document.createElement('div');
    group.className = 'month-group';
    group.dataset.month = key;
    group.innerHTML = `<div class="month-divider" aria-hidden="true">${esc(monthLabel(item.date))}</div>
      <ol class="entries"></ol>`;
    const groups = Array.from(panel.querySelectorAll<HTMLElement>('.month-group'));
    const next = groups.find((g) => (g.dataset.month ?? '') < key);
    panel.insertBefore(group, next ?? null);
  }
  const list = group.querySelector<HTMLElement>('.entries')!;
  const next = Array.from(list.children).find(
    (li) => ((li as HTMLElement).dataset.date ?? '') < item.date
  );
  if (next) next.insertAdjacentHTML('beforebegin', renderFeedItem(item));
  else list.insertAdjacentHTML('beforeend', renderFeedItem(item));
}

async function initFeed() {
  const panel = document.getElementById('panel-activity');
  if (!panel) return;
  const docs = await fetchCollection('thoughts');
  const items = docs
    .map((d) => d.data as unknown as FeedItem)
    .filter((t) => t.date && t.text)
    .sort((a, b) =>
      a.date === b.date
        ? (b.created ?? '').localeCompare(a.created ?? '')
        : b.date.localeCompare(a.date)
    );
  if (!items.length) return;
  panel.querySelector('.empty-state')?.setAttribute('hidden', '');
  for (const item of items) insertFeedItem(panel, item);
  // if a PROJ/TXT filter is active, the fresh log entries must arrive hidden
  activate(document.body.dataset.mode ?? 'activity', false);
}

export function initLive() {
  if (!firebaseConfigured) return;
  // fire and forget — the static page is complete without either
  initNow().catch(() => {});
  initFeed().catch(() => {});
}
