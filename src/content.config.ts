import { defineCollection, z } from 'astro:content';
import type { Loader } from 'astro/loaders';
import { readdir, readFile } from 'node:fs/promises';
import { parse } from 'yaml';
import { firebaseConfigured } from './lib/firebase-config';
import { fetchCollection } from './lib/firestore-rest';

interface RawDoc {
  id: string;
  data: Record<string, unknown>;
  body: string;
}

/** Docs in Firestore: one document per article, markdown in the `body` field. */
async function loadFromFirestore(): Promise<RawDoc[]> {
  const docs = await fetchCollection('docs');
  return docs.map(({ id, data }) => {
    const { body, ...rest } = data;
    return { id, data: rest, body: String(body ?? '') };
  });
}

/** Pre-Firebase fallback: content/docs/*.md with YAML frontmatter. */
async function loadFromDisk(): Promise<RawDoc[]> {
  const dir = new URL('../content/docs/', import.meta.url);
  const files = (await readdir(dir)).filter((f) => f.endsWith('.md'));
  return Promise.all(
    files.map(async (file) => {
      const raw = await readFile(new URL(file, dir), 'utf8');
      const m = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
      const data = m ? (parse(m[1]) as Record<string, unknown>) : {};
      const body = (m ? m[2] : raw).trim();
      return { id: file.replace(/\.md$/, ''), data, body };
    })
  );
}

const docsLoader: Loader = {
  name: 'ib01-docs',
  load: async ({ store, parseData, generateDigest, renderMarkdown }) => {
    const raw = firebaseConfigured ? await loadFromFirestore() : await loadFromDisk();
    store.clear();
    for (const { id, data, body } of raw) {
      const parsed = await parseData({ id, data });
      store.set({
        id,
        data: parsed,
        body,
        digest: generateDigest({ data: parsed, body }),
        rendered: await renderMarkdown(body),
      });
    }
  },
};

const docs = defineCollection({
  loader: docsLoader,
  schema: z.object({
    title: z.string(),
    ref: z.string(),
    date: z.coerce.date(),
    kind: z.enum(['essay', 'thought', 'tune']),
    minutes: z.number().optional(),
    standfirst: z.string().optional(),
    hidden: z.boolean().default(false),
  }),
});

export const collections = { docs };
