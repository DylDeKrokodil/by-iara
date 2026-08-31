import { LEGAL_CONTENT } from './legal-content';

describe('privacy policy content', () => {
  it.each([
    ['pt-PT', 'Como pedir o acesso, correção ou apagamento dos dados'],
    ['en-US', 'How to request access, correction, or deletion'],
  ] as const)('explains how to request deletion in %s', (locale, title) => {
    const privacy = LEGAL_CONTENT[locale].privacy;
    const requestSection = privacy.sections.find(
      (section) => section.title === title,
    );

    expect(privacy.updatedIsoDate).toBe('2026-07-27');
    expect(requestSection?.paragraphs?.join(' ')).toMatch(/um mês|one month/);
    expect(requestSection?.paragraphs?.join(' ')).toMatch(
      /pack ativo|active pack/,
    );
  });
});
