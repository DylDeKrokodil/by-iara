import { themeTokens } from './theme';

describe('theme', () => {
  it('exposes semantic color tokens as CSS variables', () => {
    expect(themeTokens.color.primary).toBe('var(--byiara-color-primary)');
    expect(themeTokens.color.primarySoft).toBe('var(--byiara-color-primary-soft)');
    expect(themeTokens.color.primaryStrong).toBe('var(--byiara-color-primary-strong)');
    expect(themeTokens.color.accent).toBe('var(--byiara-color-accent)');
    expect(themeTokens.color.surface).toBe('var(--byiara-color-surface)');
    expect(themeTokens.color.borderStrong).toBe('var(--byiara-color-border-strong)');
  });

  it('keeps typography tokens available to TypeScript consumers', () => {
    expect(themeTokens.fontFamily.sans).toBe('var(--byiara-font-family-sans)');
    expect(themeTokens.fontSize.base).toBe('var(--byiara-font-size-base)');
    expect(themeTokens.fontSize.md).toBe('var(--byiara-font-size-md)');
  });

  it('exposes layering tokens for shared components', () => {
    expect(themeTokens.zIndex.dropdown).toBe('var(--byiara-z-index-dropdown)');
    expect(themeTokens.zIndex.toast).toBe('var(--byiara-z-index-toast)');
  });
});
