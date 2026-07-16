import type { APIRoute } from 'astro';
import { getAllDocs, type Doc } from '../../lib/docs';
import { fmtDate } from '../../lib/data';
import { ogForDoc } from '../../lib/og';

export async function getStaticPaths() {
  const docs = await getAllDocs();
  return docs.map((doc) => ({ params: { slug: doc.slug }, props: { doc } }));
}

export const GET: APIRoute = async ({ props }) => {
  const doc = (props as { doc: Doc }).doc;
  const png = await ogForDoc({
    title: doc.data.title,
    ref: doc.data.ref,
    kind: doc.data.kind,
    dateStr: fmtDate(doc.dateStr),
    sizeKB: doc.data.hidden ? '???' : doc.sizeKB,
  });
  return new Response(png, { headers: { 'Content-Type': 'image/png' } });
};
