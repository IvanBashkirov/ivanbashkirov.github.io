import type { APIRoute } from 'astro';
import { loadLog, latestShip, daysSince } from '../../lib/data';
import { ogDefault } from '../../lib/og';

export const GET: APIRoute = async () => {
  const ship = latestShip(loadLog());
  const png = await ogDefault(daysSince(ship?.date ?? '2026-01-01'));
  return new Response(png, { headers: { 'Content-Type': 'image/png' } });
};
