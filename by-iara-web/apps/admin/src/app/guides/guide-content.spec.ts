import {
  contentImageAdminUrl,
  guideBlocksToHtml,
  richTextHasContent,
  richTextImageIssue,
} from './guide-content';

describe('guide rich text migration', () => {
  it('converts legacy content without losing order, lists, links, or image alt text', () => {
    expect(
      guideBlocksToHtml([
        { type: 'HEADING', headingLevel: 2, text: 'First <guide>' },
        { type: 'PARAGRAPH', text: 'A & B' },
        { type: 'LIST', items: ['One', 'Two'] },
        {
          type: 'IMAGE',
          imageUrl: '/api/guides/images/content/guide/image',
          imageAlt: 'Hands & oil',
        },
        {
          type: 'CALL_TO_ACTION',
          actionUrl: 'https://example.com/?a=1&b=2',
          actionLabel: 'Read more',
        },
      ]),
    ).toBe(
      '<h2>First &lt;guide&gt;</h2><p>A &amp; B</p><ul><li>One</li><li>Two</li></ul><img src="/api/guides/images/content/guide/image" alt="Hands &amp; oil"><p><em>Hands &amp; oil</em></p><p><a href="https://example.com/?a=1&amp;b=2">Read more</a></p>',
    );
  });

  it('requires meaningful text or an image for publishing', () => {
    expect(richTextHasContent('<p><br></p>')).toBe(false);
    expect(richTextHasContent('<p>Words</p>')).toBe(true);
    expect(
      richTextHasContent(
        '<img src="https://example.com/image.jpg" alt="Example">',
      ),
    ).toBe(true);
  });

  it('resolves authenticated previews for stored content images', () => {
    const publicUrl =
      '/api/guides/images/content/11111111-1111-1111-1111-111111111111/22222222-2222-2222-2222-222222222222';
    expect(contentImageAdminUrl(publicUrl)).toBe(
      '/api/admin/guides/11111111-1111-1111-1111-111111111111/content-images/22222222-2222-2222-2222-222222222222',
    );
    expect(contentImageAdminUrl('https://example.com/image.jpg')).toBeNull();
  });

  it('distinguishes unsupported pasted image sources from missing alt text', () => {
    expect(
      richTextImageIssue(
        '<img src="data:image/png;base64,abc" alt="Room">',
        false,
      ),
    ).toBe('source');
    expect(
      richTextImageIssue('<img src="https://example.com/room.png">', true),
    ).toBe('alt');
    expect(
      richTextImageIssue(
        '<img src="/api/guides/images/content/g/i" alt="Room">',
        true,
      ),
    ).toBeNull();
  });
});
