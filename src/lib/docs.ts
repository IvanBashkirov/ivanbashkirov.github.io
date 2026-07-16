import { getCollection, type CollectionEntry } from 'astro:content';

export type Doc = CollectionEntry<'docs'> & {
  slug: string;
  url: string;
  dateStr: string;
  sizeKB: number;
  words: number;
  minutes: number;
};

function derive(entry: CollectionEntry<'docs'>): Doc {
  const body = entry.body ?? '';
  const words = body.split(/\s+/).filter(Boolean).length;
  const kind = entry.data.kind;
  const slug = entry.id.replace(/\.md$/, '');
  return {
    ...entry,
    slug,
    url: kind === 'thought' ? `/thought/${slug}/` : `/doc/${slug}/`,
    dateStr: entry.data.date.toISOString().slice(0, 10),
    sizeKB: Math.max(1, Math.round(body.length / 1024)),
    words,
    minutes: entry.data.minutes ?? Math.max(1, Math.round(words / 200)),
  };
}

/** All docs, newest first. Includes hidden docs. */
export async function getAllDocs(): Promise<Doc[]> {
  const entries = await getCollection('docs');
  return entries.map(derive).sort((a, b) => b.dateStr.localeCompare(a.dateStr));
}

/** Visible (non-hidden) docs, newest first. */
export async function getVisibleDocs(): Promise<Doc[]> {
  return (await getAllDocs()).filter((d) => !d.data.hidden);
}

/** prev = older, next = newer, among visible docs. */
export function neighbours(docs: Doc[], slug: string): { prev?: Doc; next?: Doc } {
  const visible = docs.filter((d) => !d.data.hidden);
  const i = visible.findIndex((d) => d.slug === slug);
  if (i === -1) return {};
  return { prev: visible[i + 1], next: visible[i - 1] };
}

export function docBySlug(docs: Doc[], slug?: string): Doc | undefined {
  return slug ? docs.find((d) => d.slug === slug) : undefined;
}
