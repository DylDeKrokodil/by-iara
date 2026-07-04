import { Component } from '@angular/core';
import { Button, ButtonVariant } from '@by-iara/shared-ui';

interface Swatch {
  readonly name: string;
  readonly token: string;
  readonly value: string;
  readonly role: string;
  readonly textTone: 'dark' | 'light';
}

interface ContrastPair {
  readonly label: string;
  readonly foreground: string;
  readonly background: string;
  readonly ratio: string;
  readonly result: string;
}

interface Rule {
  readonly title: string;
  readonly value: string;
  readonly detail: string;
}

interface ButtonExample {
  readonly label: string;
  readonly variant: ButtonVariant;
  readonly note: string;
  readonly disabled?: boolean;
  readonly loading?: boolean;
}

@Component({
  selector: 'byiara-design-system',
  imports: [Button],
  templateUrl: './design-system.html',
  styleUrl: './design-system.css',
})
export class DesignSystem {
  protected readonly swatches: readonly Swatch[] = [
    {
      name: 'True white',
      token: '--byiara-color-background',
      value: '#FFFFFF',
      role: 'Primary page background and the default surface for brand clarity.',
      textTone: 'dark',
    },
    {
      name: 'Soft rose pink',
      token: '--byiara-color-primary',
      value: '#C04D68',
      role: 'Brand primary for buttons, active choices, key accents, and visual anchors.',
      textTone: 'light',
    },
    {
      name: 'Rose action',
      token: '--byiara-color-primary-action',
      value: '#C04D68',
      role: 'Filled controls and selected states using the accessible brand primary.',
      textTone: 'light',
    },
    {
      name: 'Rose strong',
      token: '--byiara-color-primary-strong',
      value: '#8F2E47',
      role: 'Accessible rose text on white and high-emphasis links.',
      textTone: 'light',
    },
    {
      name: 'Rose tint',
      token: '--byiara-color-primary-tint',
      value: '#FFF3F6',
      role: 'Quiet brand panels, selected low-emphasis states, and callouts.',
      textTone: 'dark',
    },
    {
      name: 'Plum ink',
      token: '--byiara-color-text',
      value: '#281219',
      role: 'Body text, headings, primary button labels, and durable contrast.',
      textTone: 'light',
    },
    {
      name: 'Muted mauve',
      token: '--byiara-color-text-muted',
      value: '#574149',
      role: 'Secondary copy, metadata, helper text, and less prominent UI labels.',
      textTone: 'light',
    },
    {
      name: 'Border mauve',
      token: '--byiara-color-border',
      value: '#DED4D8',
      role: 'Dividers, card boundaries, inputs, and low-emphasis component edges.',
      textTone: 'dark',
    },
  ];

  protected readonly contrastPairs: readonly ContrastPair[] = [
    {
      label: 'Body text on white',
      foreground: '#281219',
      background: '#FFFFFF',
      ratio: '17.64:1',
      result: 'AAA',
    },
    {
      label: 'Muted text on white',
      foreground: '#574149',
      background: '#FFFFFF',
      ratio: '9.30:1',
      result: 'AAA',
    },
    {
      label: 'Rose strong on white',
      foreground: '#8F2E47',
      background: '#FFFFFF',
      ratio: '7.93:1',
      result: 'AAA',
    },
    {
      label: 'White on primary rose',
      foreground: '#FFFFFF',
      background: '#C04D68',
      ratio: '4.66:1',
      result: 'AA',
    },
    {
      label: 'White on original soft rose',
      foreground: '#FFFFFF',
      background: '#D4607A',
      ratio: '3.65:1',
      result: 'Large text only',
    },
  ];

  protected readonly rhythmRules: readonly Rule[] = [
    {
      title: 'Body line height',
      value: '1.6',
      detail:
        'Default prose uses DM Sans at 16px with a 1.6 line height. Dense labels can tighten; long paragraphs can loosen to 1.72.',
    },
    {
      title: 'Readable measure',
      value: '54-68ch',
      detail:
        'Marketing copy stays narrow enough to read comfortably. Avoid full-width paragraphs on desktop.',
    },
    {
      title: 'Touch target',
      value: '44px min',
      detail:
        'Buttons and tappable controls keep a minimum 44px height with at least 8px between adjacent targets.',
    },
    {
      title: 'Section rhythm',
      value: '48-96px',
      detail:
        'Use larger vertical gaps between sections and smaller gaps inside related groups. Padding follows the 4/8px scale.',
    },
  ];

  protected readonly buttonExamples: readonly ButtonExample[] = [
    {
      label: 'Book a session',
      variant: 'primary',
      note: 'Primary action',
    },
    {
      label: 'View services',
      variant: 'secondary',
      note: 'Secondary action',
    },
    {
      label: 'Open details',
      variant: 'open',
      note: 'Open or expand',
    },
    {
      label: 'Remove account',
      variant: 'ghost',
      note: 'Low-emphasis destructive',
    },
    {
      label: 'Delete service',
      variant: 'danger',
      note: 'High-emphasis destructive',
    },
    {
      label: 'Saving...',
      variant: 'primary',
      note: 'Loading',
      loading: true,
    },
    {
      label: 'Unavailable',
      variant: 'primary',
      note: 'Disabled',
      disabled: true,
    },
  ];
}
