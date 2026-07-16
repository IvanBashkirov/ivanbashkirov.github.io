import { $, reduced } from './util';

const FRESH_CAPTION = 'DAYS SINCE LAST SHIPMENT · FRESH';
const REC_CAPTION = 'DAYS SINCE LAST SHIPMENT · <b>REC</b> = CURRENTLY BUILDING';

let days: number | null = null;
let booting = false;

/** '02'-style label, or '--' when nothing has shipped. */
export const dayLabel = (): string =>
  days === null ? '--' : String(days).padStart(2, '0');

function computeDays(shipDate: string): number {
  const [y, m, d] = shipDate.split('-').map(Number);
  const now = new Date();
  const today = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.max(0, Math.round((today - Date.UTC(y, m - 1, d)) / 864e5));
}

function drawFavicon(n: number | null): void {
  const link = $('#favicon') as HTMLLinkElement | null;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 32;
  const g = canvas.getContext('2d');
  if (!g || !link) return;
  g.fillStyle = '#1B1B18';
  g.fillRect(0, 0, 32, 32);
  g.fillStyle = n === 0 ? '#4CBB6C' : '#E03A2F';
  g.font = `900 ${n !== null && n > 99 ? 15 : 20}px 'Doto', monospace`;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.shadowColor = g.fillStyle;
  g.shadowBlur = 3;
  g.fillText(n === null ? '--' : String(n), 16, 18);
  link.type = 'image/png';
  link.href = canvas.toDataURL('image/png');
}

function render(): void {
  if (booting) return;
  const digits = $('#counterDigits');
  const win = $('#counterWin');
  const caption = $('#counterCaption');
  if (!digits || !win) return;
  digits.textContent = dayLabel();
  win.classList.toggle('fresh', days === 0);
  const building = document.body.dataset.building === '1' ? '. Currently building.' : '.';
  win.setAttribute(
    'aria-label',
    days === null
      ? `No shipments logged yet${building}`
      : `${days} day${days === 1 ? '' : 's'} since last shipment${building}`
  );
  if (caption) caption.innerHTML = days === 0 ? FRESH_CAPTION : REC_CAPTION;
}

/** Show all-segments-on during boot; restore with a 1-frame flash after. */
export function bootDigits(on: boolean): void {
  const digits = $('#counterDigits');
  if (!digits) return;
  booting = on;
  if (on) {
    digits.textContent = '88';
  } else {
    render();
    if (!reduced()) {
      digits.style.visibility = 'hidden';
      requestAnimationFrame(() =>
        requestAnimationFrame(() => (digits.style.visibility = ''))
      );
    }
  }
}

export function initCounter(): void {
  const ship = document.body.dataset.ship;
  if (!ship) {
    // empty log: server already rendered '--'; just stamp the favicon
    drawFavicon(null);
    return;
  }
  const d = computeDays(ship);
  days = d;
  render();
  drawFavicon(d);

  // ≥14 days: the device is judging him (§5.4)
  if (d >= 14 && !reduced()) {
    const digits = $('#counterDigits');
    window.setInterval(() => {
      if (booting || !digits) return;
      const prev = digits.textContent;
      digits.textContent = '--';
      window.setTimeout(() => {
        if (!booting) digits.textContent = prev;
      }, 150);
    }, 20000);
  }
}
