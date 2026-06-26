import { themeTokens } from './theme';

describe('theme', () => {
  it('exposes semantic color tokens as CSS variables', () => {
    expect(themeTokens.color.primary).toBe('var(--byiara-color-primary)');
    expect(themeTokens.color.surface).toBe('var(--byiara-color-surface)');
  });

  it('keeps typography tokens available to TypeScript consumers', () => {
    expect(themeTokens.fontFamily.sans).toBe('var(--byiara-font-family-sans)');
    expect(themeTokens.fontSize.base).toBe('var(--byiara-font-size-base)');
  });
});
