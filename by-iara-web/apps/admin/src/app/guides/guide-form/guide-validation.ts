import { GuideBlock, GuideInput, GuideLocale } from '../guide.models';
import { richTextHasContent, richTextImageIssue } from '../guide-content';

export type GuideEditorSection = 'content' | 'seo' | 'faqs';

export interface GuideValidationIssue {
  message: string;
  locale?: GuideLocale;
  section?: GuideEditorSection;
}

interface ValidationOptions {
  publishedDateInput: string;
  hasPendingBlockImage: (locale: GuideLocale, index: number) => boolean;
}

const languages: ReadonlyArray<{ locale: GuideLocale; label: string }> = [
  { locale: 'pt-PT', label: 'Portuguese' },
  { locale: 'en-US', label: 'English' },
];

const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function issue(
  message: string,
  locale?: GuideLocale,
  section?: GuideEditorSection,
): GuideValidationIssue {
  return { message, locale, section };
}

function blockIssue(
  block: GuideBlock,
  language: string,
  locale: GuideLocale,
  index: number,
  hasPendingImage: boolean,
  publishing: boolean,
): GuideValidationIssue | null {
  const prefix = `${language} content block ${index + 1}`;
  const invalid = (detail: string) =>
    issue(`${prefix}: ${detail}`, locale, 'content');

  switch (block.type) {
    case 'RICH_TEXT':
      if ((block.text?.length ?? 0) > 200_000)
        return issue(
          `${language} guide content must be 200,000 characters or fewer.`,
          locale,
          'content',
        );
      if (publishing && !richTextHasContent(block.text ?? ''))
        return issue(`Enter the ${language} guide content.`, locale, 'content');
      switch (richTextImageIssue(block.text ?? '', publishing)) {
        case 'source':
          return issue(
            `${language} guide images must use an HTTPS URL or the Upload or Library action.`,
            locale,
            'content',
          );
        case 'alt':
          return issue(
            `Add alt text to each ${language} guide image.`,
            locale,
            'content',
          );
      }
      break;
    case 'PARAGRAPH':
      if (publishing && !block.text?.trim())
        return invalid('enter paragraph text.');
      break;
    case 'HEADING':
      if (publishing && !block.text?.trim())
        return invalid('enter heading text.');
      if (publishing && ![2, 3, 4].includes(block.headingLevel ?? 0)) {
        return invalid('choose H2, H3, or H4.');
      }
      break;
    case 'IMAGE':
      if ((block.imageUrl?.length ?? 0) > 1000)
        return invalid('image URL must be 1000 characters or fewer.');
      if ((block.imageAlt?.length ?? 0) > 300)
        return invalid('image alt text must be 300 characters or fewer.');
      if (publishing && !block.imageUrl?.trim() && !hasPendingImage) {
        return invalid('choose an image or enter an image URL.');
      }
      if (publishing && !block.imageAlt?.trim())
        return invalid('enter image alt text.');
      break;
    case 'LIST':
      if (publishing && !block.items?.some((item) => item.trim())) {
        return invalid('enter at least one list item.');
      }
      break;
    case 'QUOTE':
      if (publishing && !block.text?.trim())
        return invalid('enter quote text.');
      break;
    case 'CALL_TO_ACTION':
      if ((block.actionLabel?.length ?? 0) > 160)
        return invalid('button label must be 160 characters or fewer.');
      if ((block.actionUrl?.length ?? 0) > 1000)
        return invalid('destination URL must be 1000 characters or fewer.');
      if (publishing && !block.actionLabel?.trim())
        return invalid('enter a button label.');
      if (publishing && !block.actionUrl?.trim())
        return invalid('enter a destination URL.');
      break;
  }
  return null;
}

function normalizedSlug(value: string): string {
  return value
    .normalize('NFD')
    .replace(/\p{M}+/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

export function firstGuideValidationIssue(
  input: GuideInput,
  options: ValidationOptions,
): GuideValidationIssue | null {
  const publishing = input.status === 'PUBLISHED';
  if (input.author.length > 160)
    return issue('Author name must be 160 characters or fewer.');
  if (publishing && !input.author)
    return issue('Enter the author name before publishing.');

  if (input.categories.length > 12)
    return issue('Use no more than 12 categories.');
  if (input.categories.some((label) => label.length > 100))
    return issue('Each category must be 100 characters or fewer.');
  if (input.tags.length > 30) return issue('Use no more than 30 tags.');
  if (input.tags.some((label) => label.length > 100))
    return issue('Each tag must be 100 characters or fewer.');
  if (input.relatedServiceIds.length > 12)
    return issue('Select no more than 12 related services.');

  if (publishing && options.publishedDateInput) {
    const publishedDate = new Date(options.publishedDateInput);
    if (Number.isNaN(publishedDate.getTime()))
      return issue('Enter a valid published date.');
    if (publishedDate.getTime() > Date.now())
      return issue('Published date cannot be in the future.');
  }

  for (const { locale, label } of languages) {
    const translation = input.translations[locale];
    if (translation.title.length > 180)
      return issue(
        `${label} title must be 180 characters or fewer.`,
        locale,
        'content',
      );
    if (publishing && !translation.title)
      return issue(`Enter the ${label} title.`, locale, 'content');
    if (translation.slug.length > 140)
      return issue(
        `${label} URL slug must be 140 characters or fewer.`,
        locale,
        'content',
      );
    if (publishing && translation.slug && !slugPattern.test(translation.slug)) {
      return issue(
        `${label} URL slug must use lowercase letters, numbers, and single hyphens.`,
        locale,
        'content',
      );
    }
    const generatedSlug = normalizedSlug(translation.slug || translation.title);
    if (publishing && !generatedSlug) {
      return issue(
        `Enter a ${label} URL slug containing letters or numbers.`,
        locale,
        'content',
      );
    }
    if (publishing && generatedSlug.length > 140) {
      return issue(
        `${label} URL slug must be 140 characters or fewer.`,
        locale,
        'content',
      );
    }
    if (translation.excerpt.length > 600)
      return issue(
        `${label} summary must be 600 characters or fewer.`,
        locale,
        'content',
      );
    if (publishing && !translation.excerpt)
      return issue(`Enter the ${label} summary.`, locale, 'content');
    if (translation.blocks.length > 120)
      return issue(
        `${label} can have no more than 120 content blocks.`,
        locale,
        'content',
      );
    if (publishing && !translation.blocks.length)
      return issue(`Enter the ${label} guide content.`, locale, 'content');
    for (const [index, block] of translation.blocks.entries()) {
      const blockProblem = blockIssue(
        block,
        label,
        locale,
        index,
        options.hasPendingBlockImage(locale, index),
        publishing,
      );
      if (blockProblem) return blockProblem;
    }
    if (translation.seoTitle.length > 180)
      return issue(
        `${label} SEO title must be 180 characters or fewer.`,
        locale,
        'seo',
      );
    if (publishing && !translation.seoTitle)
      return issue(`Enter the ${label} SEO title.`, locale, 'seo');
    if (translation.metaDescription.length > 320)
      return issue(
        `${label} meta description must be 320 characters or fewer.`,
        locale,
        'seo',
      );
    if (publishing && !translation.metaDescription)
      return issue(`Enter the ${label} meta description.`, locale, 'seo');
    if (translation.faqs.length > 30)
      return issue(`${label} can have no more than 30 FAQs.`, locale, 'faqs');
    if (publishing) {
      for (const [index, faq] of translation.faqs.entries()) {
        if (!faq.question)
          return issue(
            `${label} FAQ ${index + 1}: enter a question.`,
            locale,
            'faqs',
          );
        if (!faq.answer)
          return issue(
            `${label} FAQ ${index + 1}: enter an answer.`,
            locale,
            'faqs',
          );
      }
    }
  }
  return null;
}
