import { GuideTranslation } from './guides-api';

const DEFAULT_WORDS_PER_MINUTE = 200;

export function estimateGuideReadingMinutes(
  translation: GuideTranslation,
  wordsPerMinute = DEFAULT_WORDS_PER_MINUTE,
): number {
  const text = [
    translation.title,
    translation.excerpt,
    ...translation.blocks.flatMap((block) => [
      block.text ?? '',
      ...(block.items ?? []),
      block.actionLabel ?? '',
    ]),
    ...translation.faqs.flatMap((faq) => [faq.question, faq.answer]),
  ].join(' ');
  const wordCount =
    text.match(/\p{L}+(?:['’.-]\p{L}+)*|\p{N}+/gu)?.length ?? 0;

  return Math.max(1, Math.ceil(wordCount / wordsPerMinute));
}
