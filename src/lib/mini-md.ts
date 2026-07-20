/**
 * Tiny markdown-for-thoughts renderer: paragraphs plus inline bold, italic,
 * code, and links. Thoughts are a couple of sentences — a full markdown
 * parser in the public bundle would cost more than the feature.
 */

const escapeHtml = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function inline(s: string): string {
  return s
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>')
    .replace(/(^|\W)\*([^*\n]+)\*(?=\W|$)/g, '$1<i>$2</i>')
    .replace(/(^|\W)_([^_\n]+)_(?=\W|$)/g, '$1<i>$2</i>')
    .replace(
      /\[([^\]]+)\]\((https?:\/\/[^)\s]+|\/[^)\s]*)\)/g,
      '<a href="$2" rel="noopener">$1</a>'
    );
}

/** Markdown-ish text -> HTML paragraphs. Input is escaped before formatting. */
export function renderMini(text: string): string {
  return escapeHtml(text.trim())
    .split(/\n{2,}/)
    .filter(Boolean)
    .map((p) => `<p>${inline(p.replace(/\n/g, '<br />'))}</p>`)
    .join('');
}
