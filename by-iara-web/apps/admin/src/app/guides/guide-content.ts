import { GuideBlock } from './guide.models';

function escapeHtml(value: string): string {
  return value.replace(
    /[&<>"']/g,
    (character) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[
        character
      ] ?? character,
  );
}

function paragraphs(value: string): string {
  return value
    .split(/\n\s*\n/)
    .map(
      (paragraph) => `<p>${escapeHtml(paragraph).replace(/\n/g, '<br>')}</p>`,
    )
    .join('');
}

export function guideBlocksToHtml(blocks: GuideBlock[]): string {
  return blocks
    .map((block) => {
      switch (block.type) {
        case 'RICH_TEXT':
          return block.text ?? '';
        case 'PARAGRAPH':
          return paragraphs(block.text ?? '');
        case 'HEADING': {
          const level = [2, 3, 4].includes(block.headingLevel ?? 0)
            ? block.headingLevel
            : 2;
          return `<h${level}>${escapeHtml(block.text ?? '')}</h${level}>`;
        }
        case 'IMAGE':
          return block.imageUrl
            ? `<img src="${escapeHtml(block.imageUrl)}" alt="${escapeHtml(block.imageAlt ?? '')}">${block.imageAlt ? `<p><em>${escapeHtml(block.imageAlt)}</em></p>` : ''}`
            : '';
        case 'LIST':
          return `<ul>${(block.items ?? []).map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>`;
        case 'QUOTE':
          return `<blockquote>${paragraphs(block.text ?? '')}</blockquote>`;
        case 'CALL_TO_ACTION':
          return block.actionUrl
            ? `<p><a href="${escapeHtml(block.actionUrl)}">${escapeHtml(block.actionLabel ?? '')}</a></p>`
            : '';
      }
    })
    .join('');
}

export function richTextHasContent(html: string): boolean {
  if (typeof DOMParser !== 'undefined') {
    const body = new DOMParser().parseFromString(html, 'text/html').body;
    return Boolean(body.textContent?.trim() || body.querySelector('img[src]'));
  }
  return Boolean(
    html
      .replace(/<[^>]*>/g, '')
      .replace(/&nbsp;/g, ' ')
      .trim(),
  );
}

export function richTextImageIssue(
  html: string,
  requireAlt: boolean,
): 'source' | 'alt' | null {
  if (typeof DOMParser === 'undefined') return null;
  const images = Array.from(
    new DOMParser()
      .parseFromString(html, 'text/html')
      .querySelectorAll('img[src]'),
  );
  if (
    images.some(
      (image) =>
        !/^(?:https:\/\/|\/(?!\/)).+/i.test(image.getAttribute('src') ?? ''),
    )
  )
    return 'source';
  if (requireAlt && images.some((image) => !image.getAttribute('alt')?.trim()))
    return 'alt';
  return null;
}

export function contentImageAdminUrl(publicUrl: string): string | null {
  const match = publicUrl.match(
    /^\/api\/guides\/images\/content\/([0-9a-f-]{36})\/([0-9a-f-]{36})(?:\?.*)?$/i,
  );
  return match
    ? `/api/admin/guides/${match[1]}/content-images/${match[2]}`
    : null;
}
