import type { APIRoute } from 'astro';
import { loadLog, latestShip, daysSince } from '../../lib/data';
import { ogDefault } from '../../lib/og';

export const GET: APIRoute = async () => {
  const ship = latestShip(loadLog());
  const png = await ogDefault(ship ? daysSince(ship.date) : null);
  return new Response(png, { headers: { 'Content-Type': 'image/png' } });
};
