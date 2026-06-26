# @by-iara/theme

Shared design tokens for By Iara frontend applications.

## Usage

Add the global CSS file before app-specific styles:

```json
"styles": [
  "libs/shared/theme/src/styles/theme.css",
  "apps/website/src/styles.css"
]
```

Use semantic CSS variables in app and component styles:

```css
.surface {
  background: var(--byiara-color-surface);
  color: var(--byiara-color-text);
}
```

Import typed token references when TypeScript code needs stable token names:

```ts
import { themeTokens } from '@by-iara/theme';
```

Prefer semantic tokens such as `--byiara-color-primary` over primitive palette
tokens in app code. Primitive tokens are for theme definitions.
