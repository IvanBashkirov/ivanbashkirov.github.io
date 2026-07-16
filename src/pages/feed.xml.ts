import type { APIRoute } from 'astro';
import { getVisibleDocs } from '../lib/docs';
import { loadSite } from '../lib/data';

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export const GET: APIRoute = async (context) => {
  const site = loadSite();
  const docs = await getVisibleDocs();
  const base = String(context.site ?? site.domain).replace(/\/$/, '');

  const items = docs
    .map((d) => {
      const url = `${base}${d.url}`;
      const desc = d.data.standfirst ?? `DOC ${d.data.ref} · ${d.data.kind.toUpperCase()}`;
      return `    <item>
      <title>${esc(d.data.title)}</title>
      <link>${url}</link>
      <guid isPermaLink="true">${url}</guid>
      <pubDate>${d.data.date.toUTCString()}</pubDate>
      <description>${esc(desc)}</description>
    </item>`;
    })
    .join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>IVAN BASHKIROV — IB-01 · DOCS</title>
    <link>${base}/</link>
    <description>Essays and thoughts from the IB-01 shipping log. Loaded from 3.5&quot; floppy disks.</description>
    <language>en</language>
${items}
  </channel>
</rss>
`;

  return new Response(xml, {
    headers: { 'Content-Type': 'application/rss+xml; charset=utf-8' },
  });
};
