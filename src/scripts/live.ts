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

interface Thought {
  date: string; // YYYY-MM-DD
  text: string;
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

async function initThoughts() {
  const stream = document.getElementById('thoughtStream');
  if (!stream) return;
  const docs = await fetchCollection('thoughts');
  const thoughts = docs
    .map((d) => d.data as unknown as Thought)
    .filter((t) => t.date && t.text)
    .sort((a, b) =>
      a.date === b.date
        ? (b.created ?? '').localeCompare(a.created ?? '')
        : b.date.localeCompare(a.date)
    );
  if (!thoughts.length) return;
  stream.innerHTML = groupByMonth(thoughts)
    .map(
      (m) => `<div class="month-group">
        <div class="month-divider" aria-hidden="true">${esc(m.label)}</div>
        ${m.items
          .map(
            (t) => `<article class="t-entry" data-type="txt">
              <div class="meta">
                <span class="e-date">${esc(fmtDay(t.date))}</span>
                <span class="tag tag-note">THOUGHT</span>
              </div>
              <div class="t-body">${renderMini(t.text)}</div>
            </article>`
          )
          .join('')}
      </div>`
    )
    .join('');
}

export function initLive() {
  if (!firebaseConfigured) return;
  // fire and forget — the static page is complete without either
  initNow().catch(() => {});
  initThoughts().catch(() => {});
}
