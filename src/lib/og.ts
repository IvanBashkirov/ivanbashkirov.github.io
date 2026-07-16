/* Build-time OG images: each doc gets a floppy-label card; the site gets the device front. */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';

const font = (pkg: string, file: string) =>
  readFileSync(join(process.cwd(), 'node_modules', pkg, 'files', file));

const FONTS = [
  { name: 'Doto', data: font('@fontsource/doto', 'doto-latin-900-normal.woff'), weight: 900 as const, style: 'normal' as const },
  { name: 'Doto', data: font('@fontsource/doto', 'doto-latin-700-normal.woff'), weight: 700 as const, style: 'normal' as const },
  { name: 'Fragment Mono', data: font('@fontsource/fragment-mono', 'fragment-mono-latin-400-normal.woff'), weight: 400 as const, style: 'normal' as const },
];

const SHELL: Record<string, string> = {
  essay: '#3E5C8F',
  thought: '#8F8D86',
  tune: '#8F3E52',
};

const h = (type: string, style: Record<string, unknown>, children?: unknown) => ({
  type,
  props: { style, children },
});

async function render(tree: unknown): Promise<Uint8Array> {
  const svg = await satori(tree as never, { width: 1200, height: 630, fonts: FONTS });
  const png = new Resvg(svg, { fitTo: { mode: 'width', value: 1200 } }).render().asPng();
  return new Uint8Array(png);
}

export interface OgDoc {
  title: string;
  ref: string;
  kind: string;
  dateStr: string;
  sizeKB: number | string;
}

/** A 3.5" floppy label card for a doc. */
export function ogForDoc(d: OgDoc): Promise<Uint8Array> {
  const shell = SHELL[d.kind] ?? SHELL.essay;
  const disk = h(
    'div',
    {
      width: 430,
      height: 470,
      background: shell,
      borderRadius: 14,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      position: 'relative',
      boxShadow: '0 24px 60px rgba(0,0,0,0.4)',
    },
    [
      // shutter
      h('div', {
        width: 240,
        height: 120,
        background: 'linear-gradient(180deg, #C8C8C4, #A9A9A4)',
        borderRadius: '0 0 10px 10px',
        marginLeft: -40,
        display: 'flex',
      }),
      // label
      h(
        'div',
        {
          position: 'absolute',
          left: 40,
          right: 40,
          top: 170,
          bottom: 32,
          background: '#EDEBE5',
          borderRadius: 6,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '26px 28px',
        },
        [
          h(
            'div',
            {
              fontFamily: 'Doto',
              fontWeight: 900,
              fontSize: d.title.length > 26 ? 34 : 42,
              lineHeight: 1.15,
              color: '#232320',
              textTransform: 'uppercase',
              display: 'flex',
            },
            d.title
          ),
          h(
            'div',
            {
              fontFamily: 'Fragment Mono',
              fontSize: 19,
              color: '#6D6C65',
              display: 'flex',
              flexDirection: 'column',
              borderTop: '2px solid rgba(35,35,32,0.18)',
              paddingTop: 14,
            },
            [
              h('div', { display: 'flex' }, `DOC ${d.ref} · ${d.kind.toUpperCase()}`),
              h('div', { display: 'flex' }, `${d.dateStr} · ${d.sizeKB} KB`),
            ]
          ),
        ]
      ),
    ]
  );

  const tree = h(
    'div',
    {
      width: 1200,
      height: 630,
      background: '#B7B5AE',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 90px',
    },
    [
      h(
        'div',
        { display: 'flex', flexDirection: 'column', maxWidth: 520 },
        [
          h(
            'div',
            { fontFamily: 'Doto', fontWeight: 700, fontSize: 30, color: '#4A4A46', letterSpacing: 4, display: 'flex' },
            'IVAN BASHKIROV'
          ),
          h(
            'div',
            { fontFamily: 'Doto', fontWeight: 900, fontSize: 30, color: '#E8600A', letterSpacing: 4, display: 'flex', marginTop: 6 },
            'IB-01 · SHIPPING LOG'
          ),
          h(
            'div',
            { fontFamily: 'Fragment Mono', fontSize: 21, color: '#7C7C76', display: 'flex', marginTop: 28 },
            'INSERT DISK TO READ · 3.5″ DD'
          ),
        ]
      ),
      disk,
    ]
  );
  return render(tree);
}

/** Site-wide OG: the device front with the day counter. */
export function ogDefault(days: number): Promise<Uint8Array> {
  const tree = h(
    'div',
    {
      width: 1200,
      height: 630,
      background: '#B7B5AE',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    },
    [
      h(
        'div',
        {
          width: 1000,
          height: 470,
          background: 'linear-gradient(180deg, #E7E5DE, #DCDAD3 55%, #C9C7C0)',
          borderRadius: 34,
          display: 'flex',
          flexDirection: 'column',
          padding: '46px 60px',
          boxShadow: '0 30px 70px rgba(0,0,0,0.35)',
        },
        [
          h('div', { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 30 }, [
            h('div', { display: 'flex', flexDirection: 'column', maxWidth: 600 }, [
              h(
                'div',
                { fontFamily: 'Doto', fontWeight: 700, fontSize: 40, color: '#4A4A46', letterSpacing: 6, display: 'flex' },
                'IVAN BASHKIROV'
              ),
              h(
                'div',
                { fontFamily: 'Fragment Mono', fontSize: 20, color: '#7C7C76', letterSpacing: 4, display: 'flex', marginTop: 14 },
                'SHIPPING LOG · CODE / ESSAYS / TUNES · TBILISI'
              ),
            ]),
            h(
              'div',
              {
                background: '#1B1B18',
                borderRadius: 14,
                padding: '18px 34px',
                display: 'flex',
                alignItems: 'center',
              },
              [
                h(
                  'div',
                  { fontFamily: 'Doto', fontWeight: 900, fontSize: 84, color: days === 0 ? '#4CBB6C' : '#E03A2F', display: 'flex' },
                  String(days).padStart(2, '0')
                ),
              ]
            ),
          ]),
          h(
            'div',
            {
              marginTop: 30,
              flexGrow: 1,
              background: '#A2B08E',
              borderRadius: 12,
              border: '16px solid #35352F',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            },
            [
              h(
                'div',
                { fontFamily: 'Doto', fontWeight: 900, fontSize: 56, color: '#26301F', letterSpacing: 8, display: 'flex' },
                'IB-01'
              ),
            ]
          ),
          h(
            'div',
            { fontFamily: 'Fragment Mono', fontSize: 18, color: '#7C7C76', letterSpacing: 3, display: 'flex', marginTop: 26 },
            'DAYS SINCE LAST SHIPMENT — SEE COUNTER · ivanbashkirov.com'
          ),
        ]
      ),
    ]
  );
  return render(tree);
}
