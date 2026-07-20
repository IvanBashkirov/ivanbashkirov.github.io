/**
 * Minimal Firestore REST reader for build time. Public-read security rules
 * make these plain GETs; the web API key only identifies the project.
 * Used by the Astro build so the deployed HTML is rendered from Firestore.
 */
import { firebaseConfig } from './firebase-config';

type FirestoreValue = {
  stringValue?: string;
  integerValue?: string;
  doubleValue?: number;
  booleanValue?: boolean;
  timestampValue?: string;
  nullValue?: null;
  arrayValue?: { values?: FirestoreValue[] };
  mapValue?: { fields?: Record<string, FirestoreValue> };
};

interface FirestoreDoc {
  name: string;
  fields?: Record<string, FirestoreValue>;
}

function decodeValue(v: FirestoreValue): unknown {
  if (v.stringValue !== undefined) return v.stringValue;
  if (v.integerValue !== undefined) return Number(v.integerValue);
  if (v.doubleValue !== undefined) return v.doubleValue;
  if (v.booleanValue !== undefined) return v.booleanValue;
  if (v.timestampValue !== undefined) return v.timestampValue;
  if (v.arrayValue !== undefined) return (v.arrayValue.values ?? []).map(decodeValue);
  if (v.mapValue !== undefined) return decodeFields(v.mapValue.fields ?? {});
  return null;
}

function decodeFields(fields: Record<string, FirestoreValue>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(fields).map(([k, v]) => [k, decodeValue(v)]));
}

const base = () =>
  `https://firestore.googleapis.com/v1/projects/${firebaseConfig.projectId}/databases/(default)/documents`;

async function get(url: string): Promise<any> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(
      `Firestore fetch failed (${res.status}) for ${url.split('?')[0]} — ` +
        `check firebase.config.json and that security rules allow public reads. Body: ${await res.text()}`
    );
  }
  return res.json();
}

export interface DecodedDoc {
  id: string;
  data: Record<string, unknown>;
}

/** All documents in a top-level collection, paginated. */
export async function fetchCollection(name: string): Promise<DecodedDoc[]> {
  const docs: DecodedDoc[] = [];
  let pageToken = '';
  do {
    const url = `${base()}/${name}?pageSize=300&key=${firebaseConfig.apiKey}${pageToken ? `&pageToken=${pageToken}` : ''}`;
    const json = await get(url);
    for (const d of (json.documents ?? []) as FirestoreDoc[]) {
      docs.push({ id: d.name.split('/').pop()!, data: decodeFields(d.fields ?? {}) });
    }
    pageToken = json.nextPageToken ?? '';
  } while (pageToken);
  return docs;
}
