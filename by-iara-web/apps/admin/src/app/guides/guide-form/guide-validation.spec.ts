import { GuideInput } from '../guide.models';
import { firstGuideValidationIssue } from './guide-validation';

function validGuide(): GuideInput {
  const translation = (title: string) => ({
    slug: '',
    title,
    excerpt: 'A helpful summary',
    seoTitle: 'Search title',
    metaDescription: 'Search description',
    blocks: [{ type: 'PARAGRAPH' as const, text: 'Useful text' }],
    faqs: [],
  });
  return {
    status: 'PUBLISHED',
    author: 'Iara',
    publishedAt: null,
    translations: {
      'pt-PT': translation('Guia português'),
      'en-US': translation('English guide'),
    },
    categories: [],
    tags: [],
    relatedServiceIds: [],
  };
}

function message(input: GuideInput, publishedDateInput = ''): string | null {
  return (
    firstGuideValidationIssue(input, {
      publishedDateInput,
      hasPendingBlockImage: () => false,
    })?.message ?? null
  );
}

describe('guide field requirements', () => {
  it('accepts a complete bilingual guide', () => {
    expect(message(validGuide())).toBeNull();
  });

  it('accepts empty and unfinished drafts', () => {
    const guide = validGuide();
    guide.status = 'DRAFT';
    guide.author = '';
    guide.translations['pt-PT'] = {
      slug: 'Unfinished Slug',
      title: '',
      excerpt: '',
      seoTitle: '',
      metaDescription: '',
      blocks: [{ type: 'IMAGE' }],
      faqs: [{ question: '', answer: '' }],
    };
    guide.translations['en-US'].blocks = [];
    expect(message(guide)).toBeNull();
  });

  const fieldCases: Array<{
    name: string;
    change: (guide: GuideInput) => void;
    expected: string;
  }> = [
    {
      name: 'author',
      change: (g) => {
        g.author = '';
      },
      expected: 'Enter the author name before publishing.',
    },
    {
      name: 'author length',
      change: (g) => {
        g.author = 'a'.repeat(161);
      },
      expected: 'Author name must be 160 characters or fewer.',
    },
    {
      name: 'category count',
      change: (g) => {
        g.categories = Array.from({ length: 13 }, (_, i) => `Category ${i}`);
      },
      expected: 'Use no more than 12 categories.',
    },
    {
      name: 'category length',
      change: (g) => {
        g.categories = ['a'.repeat(101)];
      },
      expected: 'Each category must be 100 characters or fewer.',
    },
    {
      name: 'tag count',
      change: (g) => {
        g.tags = Array.from({ length: 31 }, (_, i) => `Tag ${i}`);
      },
      expected: 'Use no more than 30 tags.',
    },
    {
      name: 'tag length',
      change: (g) => {
        g.tags = ['a'.repeat(101)];
      },
      expected: 'Each tag must be 100 characters or fewer.',
    },
    {
      name: 'related service count',
      change: (g) => {
        g.relatedServiceIds = Array.from({ length: 13 }, (_, i) => String(i));
      },
      expected: 'Select no more than 12 related services.',
    },
    {
      name: 'Portuguese title',
      change: (g) => {
        g.translations['pt-PT'].title = '';
      },
      expected: 'Enter the Portuguese title.',
    },
    {
      name: 'Portuguese title length',
      change: (g) => {
        g.translations['pt-PT'].title = 'a'.repeat(181);
      },
      expected: 'Portuguese title must be 180 characters or fewer.',
    },
    {
      name: 'URL slug format',
      change: (g) => {
        g.translations['pt-PT'].slug = 'Bad Slug';
      },
      expected:
        'Portuguese URL slug must use lowercase letters, numbers, and single hyphens.',
    },
    {
      name: 'URL slug length',
      change: (g) => {
        g.translations['pt-PT'].slug = 'a'.repeat(141);
      },
      expected: 'Portuguese URL slug must be 140 characters or fewer.',
    },
    {
      name: 'unusable generated slug',
      change: (g) => {
        g.translations['pt-PT'].title = '###';
      },
      expected: 'Enter a Portuguese URL slug containing letters or numbers.',
    },
    {
      name: 'generated slug length',
      change: (g) => {
        g.translations['pt-PT'].title = 'a'.repeat(141);
      },
      expected: 'Portuguese URL slug must be 140 characters or fewer.',
    },
    {
      name: 'Portuguese summary',
      change: (g) => {
        g.translations['pt-PT'].excerpt = '';
      },
      expected: 'Enter the Portuguese summary.',
    },
    {
      name: 'Portuguese summary length',
      change: (g) => {
        g.translations['pt-PT'].excerpt = 'a'.repeat(601);
      },
      expected: 'Portuguese summary must be 600 characters or fewer.',
    },
    {
      name: 'content blocks',
      change: (g) => {
        g.translations['pt-PT'].blocks = [];
      },
      expected: 'Enter the Portuguese guide content.',
    },
    {
      name: 'empty rich text',
      change: (g) => {
        g.translations['pt-PT'].blocks = [
          { type: 'RICH_TEXT', text: '<p><br></p>' },
        ];
      },
      expected: 'Enter the Portuguese guide content.',
    },
    {
      name: 'rich text length',
      change: (g) => {
        g.translations['pt-PT'].blocks = [
          { type: 'RICH_TEXT', text: 'a'.repeat(200001) },
        ];
      },
      expected: 'Portuguese guide content must be 200,000 characters or fewer.',
    },
    {
      name: 'rich text image alt',
      change: (g) => {
        g.translations['pt-PT'].blocks = [
          {
            type: 'RICH_TEXT',
            text: '<img src="https://example.com/photo.jpg">',
          },
        ];
      },
      expected: 'Add alt text to each Portuguese guide image.',
    },
    {
      name: 'pasted data image source',
      change: (g) => {
        g.translations['pt-PT'].blocks = [
          {
            type: 'RICH_TEXT',
            text: '<img src="data:image/png;base64,abc" alt="Room">',
          },
        ];
      },
      expected:
        'Portuguese guide images must use an HTTPS URL or the Upload or Library action.',
    },
    {
      name: 'content block count',
      change: (g) => {
        g.translations['pt-PT'].blocks = Array.from({ length: 121 }, () => ({
          type: 'PARAGRAPH',
          text: 'Text',
        }));
      },
      expected: 'Portuguese can have no more than 120 content blocks.',
    },
    {
      name: 'paragraph text',
      change: (g) => {
        g.translations['pt-PT'].blocks = [{ type: 'PARAGRAPH' }];
      },
      expected: 'Portuguese content block 1: enter paragraph text.',
    },
    {
      name: 'heading text',
      change: (g) => {
        g.translations['pt-PT'].blocks = [{ type: 'HEADING', headingLevel: 2 }];
      },
      expected: 'Portuguese content block 1: enter heading text.',
    },
    {
      name: 'heading level',
      change: (g) => {
        g.translations['pt-PT'].blocks = [
          { type: 'HEADING', text: 'Heading', headingLevel: 5 },
        ];
      },
      expected: 'Portuguese content block 1: choose H2, H3, or H4.',
    },
    {
      name: 'image source',
      change: (g) => {
        g.translations['pt-PT'].blocks = [
          { type: 'IMAGE', imageAlt: 'Description' },
        ];
      },
      expected:
        'Portuguese content block 1: choose an image or enter an image URL.',
    },
    {
      name: 'image alt text',
      change: (g) => {
        g.translations['pt-PT'].blocks = [
          { type: 'IMAGE', imageUrl: '/image' },
        ];
      },
      expected: 'Portuguese content block 1: enter image alt text.',
    },
    {
      name: 'image URL length',
      change: (g) => {
        g.translations['pt-PT'].blocks = [
          {
            type: 'IMAGE',
            imageUrl: 'a'.repeat(1001),
            imageAlt: 'Description',
          },
        ];
      },
      expected:
        'Portuguese content block 1: image URL must be 1000 characters or fewer.',
    },
    {
      name: 'image alt length',
      change: (g) => {
        g.translations['pt-PT'].blocks = [
          { type: 'IMAGE', imageUrl: '/image', imageAlt: 'a'.repeat(301) },
        ];
      },
      expected:
        'Portuguese content block 1: image alt text must be 300 characters or fewer.',
    },
    {
      name: 'list items',
      change: (g) => {
        g.translations['pt-PT'].blocks = [{ type: 'LIST', items: [] }];
      },
      expected: 'Portuguese content block 1: enter at least one list item.',
    },
    {
      name: 'quote text',
      change: (g) => {
        g.translations['pt-PT'].blocks = [{ type: 'QUOTE' }];
      },
      expected: 'Portuguese content block 1: enter quote text.',
    },
    {
      name: 'button label',
      change: (g) => {
        g.translations['pt-PT'].blocks = [
          { type: 'CALL_TO_ACTION', actionUrl: '/go' },
        ];
      },
      expected: 'Portuguese content block 1: enter a button label.',
    },
    {
      name: 'button label length',
      change: (g) => {
        g.translations['pt-PT'].blocks = [
          {
            type: 'CALL_TO_ACTION',
            actionLabel: 'a'.repeat(161),
            actionUrl: '/go',
          },
        ];
      },
      expected:
        'Portuguese content block 1: button label must be 160 characters or fewer.',
    },
    {
      name: 'destination URL',
      change: (g) => {
        g.translations['pt-PT'].blocks = [
          { type: 'CALL_TO_ACTION', actionLabel: 'Go' },
        ];
      },
      expected: 'Portuguese content block 1: enter a destination URL.',
    },
    {
      name: 'destination URL length',
      change: (g) => {
        g.translations['pt-PT'].blocks = [
          {
            type: 'CALL_TO_ACTION',
            actionLabel: 'Go',
            actionUrl: 'a'.repeat(1001),
          },
        ];
      },
      expected:
        'Portuguese content block 1: destination URL must be 1000 characters or fewer.',
    },
    {
      name: 'SEO title',
      change: (g) => {
        g.translations['pt-PT'].seoTitle = '';
      },
      expected: 'Enter the Portuguese SEO title.',
    },
    {
      name: 'SEO title length',
      change: (g) => {
        g.translations['pt-PT'].seoTitle = 'a'.repeat(181);
      },
      expected: 'Portuguese SEO title must be 180 characters or fewer.',
    },
    {
      name: 'meta description',
      change: (g) => {
        g.translations['pt-PT'].metaDescription = '';
      },
      expected: 'Enter the Portuguese meta description.',
    },
    {
      name: 'meta description length',
      change: (g) => {
        g.translations['pt-PT'].metaDescription = 'a'.repeat(321);
      },
      expected: 'Portuguese meta description must be 320 characters or fewer.',
    },
    {
      name: 'FAQ count',
      change: (g) => {
        g.translations['pt-PT'].faqs = Array.from({ length: 31 }, () => ({
          question: 'Q',
          answer: 'A',
        }));
      },
      expected: 'Portuguese can have no more than 30 FAQs.',
    },
    {
      name: 'FAQ question',
      change: (g) => {
        g.translations['pt-PT'].faqs = [{ question: '', answer: 'A' }];
      },
      expected: 'Portuguese FAQ 1: enter a question.',
    },
    {
      name: 'FAQ answer',
      change: (g) => {
        g.translations['pt-PT'].faqs = [{ question: 'Q', answer: '' }];
      },
      expected: 'Portuguese FAQ 1: enter an answer.',
    },
    {
      name: 'English title',
      change: (g) => {
        g.translations['en-US'].title = '';
      },
      expected: 'Enter the English title.',
    },
    {
      name: 'English summary',
      change: (g) => {
        g.translations['en-US'].excerpt = '';
      },
      expected: 'Enter the English summary.',
    },
    {
      name: 'English SEO title',
      change: (g) => {
        g.translations['en-US'].seoTitle = '';
      },
      expected: 'Enter the English SEO title.',
    },
    {
      name: 'English meta description',
      change: (g) => {
        g.translations['en-US'].metaDescription = '';
      },
      expected: 'Enter the English meta description.',
    },
  ];

  it.each(fieldCases)(
    'reports the correct $name error',
    ({ change, expected }) => {
      const guide = validGuide();
      change(guide);
      expect(message(guide)).toBe(expected);
    },
  );

  it('accepts a pending upload as an image source', () => {
    const guide = validGuide();
    guide.translations['pt-PT'].blocks = [
      { type: 'IMAGE', imageAlt: 'Description' },
    ];
    expect(
      firstGuideValidationIssue(guide, {
        publishedDateInput: '',
        hasPendingBlockImage: () => true,
      }),
    ).toBeNull();
  });

  it('reports invalid and future publication dates', () => {
    expect(message(validGuide(), 'invalid')).toBe(
      'Enter a valid published date.',
    );
    expect(message(validGuide(), '2999-01-01T12:00')).toBe(
      'Published date cannot be in the future.',
    );
  });
});
