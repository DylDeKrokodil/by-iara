export const themeTokens = {
  name: 'by-iara',
  color: {
    background: 'var(--byiara-color-background)',
    surface: 'var(--byiara-color-surface)',
    surfaceMuted: 'var(--byiara-color-surface-muted)',
    text: 'var(--byiara-color-text)',
    textMuted: 'var(--byiara-color-text-muted)',
    primary: 'var(--byiara-color-primary)',
    primaryHover: 'var(--byiara-color-primary-hover)',
    accent: 'var(--byiara-color-accent)',
    border: 'var(--byiara-color-border)',
    focus: 'var(--byiara-color-focus)',
    danger: 'var(--byiara-color-danger)',
    success: 'var(--byiara-color-success)',
  },
  fontFamily: {
    sans: 'var(--byiara-font-family-sans)',
    display: 'var(--byiara-font-family-display)',
  },
  fontSize: {
    xs: 'var(--byiara-font-size-xs)',
    sm: 'var(--byiara-font-size-sm)',
    base: 'var(--byiara-font-size-base)',
    lg: 'var(--byiara-font-size-lg)',
    xl: 'var(--byiara-font-size-xl)',
    '2xl': 'var(--byiara-font-size-2xl)',
    '3xl': 'var(--byiara-font-size-3xl)',
    '4xl': 'var(--byiara-font-size-4xl)',
  },
  spacing: {
    xs: 'var(--byiara-space-xs)',
    sm: 'var(--byiara-space-sm)',
    md: 'var(--byiara-space-md)',
    lg: 'var(--byiara-space-lg)',
    xl: 'var(--byiara-space-xl)',
    '2xl': 'var(--byiara-space-2xl)',
  },
  radius: {
    sm: 'var(--byiara-radius-sm)',
    md: 'var(--byiara-radius-md)',
    lg: 'var(--byiara-radius-lg)',
    pill: 'var(--byiara-radius-pill)',
  },
  shadow: {
    sm: 'var(--byiara-shadow-sm)',
    md: 'var(--byiara-shadow-md)',
  },
} as const;

export type ThemeTokens = typeof themeTokens;
export type ThemeColorToken = keyof ThemeTokens['color'];
