import { describe, expect, it } from 'vitest';
import { GuideTranslation } from './guides-api';
import { estimateGuideReadingMinutes } from './guide-reading-time';

function translationWithWords(wordCount: number): GuideTranslation {
  return {
    slug: 'guide',
    title: '',
    excerpt: '',
    seoTitle: '',
    metaDescription: '',
    blocks: [
      {
        type: 'PARAGRAPH',
        text: Array.from({ length: wordCount }, () => 'word').join(' '),
      },
    ],
    faqs: [],
  };
}

describe('estimateGuideReadingMinutes', () => {
  it('returns at least one minute for short guides', () => {
    expect(
      estimateGuideReadingMinutes(translationWithWords(20)),
    ).toBe(1);
  });

  it('rounds partial minutes up', () => {
    expect(
      estimateGuideReadingMinutes(translationWithWords(201)),
    ).toBe(2);
  });

  it('includes lists and FAQs in the estimate', () => {
    const translation = translationWithWords(195);
    translation.blocks.push({
      type: 'LIST',
      items: ['one two three'],
    });
    translation.faqs.push({
      question: 'four',
      answer: 'five six',
    });

    expect(estimateGuideReadingMinutes(translation)).toBe(2);
  });
});
