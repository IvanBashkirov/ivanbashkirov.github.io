/* Every off-site link opens in a new tab — the device stays on the desk.
   Covers markdown-rendered doc bodies too, which build-time attrs can't. */

export function initExtLinks(): void {
  for (const a of Array.from(document.querySelectorAll<HTMLAnchorElement>('a[href]'))) {
    if (/^https?:/i.test(a.getAttribute('href') ?? '') && a.host !== location.host) {
      a.target = '_blank';
      if (!a.rel.includes('noopener')) a.rel = `${a.rel} noopener`.trim();
    }
  }
}
