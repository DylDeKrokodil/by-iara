import { Component } from '@angular/core';

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

@Component({
  selector: 'byiara-design-system',
  templateUrl: './design-system.html',
  styleUrl: './design-system.css',
})
export class DesignSystem {
  protected readonly swatches: readonly Swatch[] = [
    {
      name: 'Brand rose',
      token: '--byiara-color-primary',
      value: '#E73D6D',
      role: 'Primary buttons, active states, brand fills',
      textTone: 'light',
    },
    {
      name: 'Rose hover',
      token: '--byiara-color-primary-hover',
      value: '#D0115F',
      role: 'Hover and pressed state on primary fills',
      textTone: 'light',
    },
    {
      name: 'Rose text',
      token: '--byiara-color-primary-strong',
      value: '#A7074B',
      role: 'Pink text, links and icons on light surfaces',
      textTone: 'light',
    },
    {
      name: 'Rose soft',
      token: '--byiara-color-primary-soft',
      value: '#FCE4E8',
      role: 'Selected rows, chips, quiet brand fills',
      textTone: 'dark',
    },
    {
      name: 'Rose tint',
      token: '--byiara-color-surface-tinted',
      value: '#FDF4F5',
      role: 'Section washes and hover tints',
      textTone: 'dark',
    },
    {
      name: 'Ink',
      token: '--byiara-color-text',
      value: '#1E1616',
      role: 'Body text and headings',
      textTone: 'light',
    },
    {
      name: 'Muted ink',
      token: '--byiara-color-text-muted',
      value: '#6A6161',
      role: 'Secondary text and metadata',
      textTone: 'light',
    },
    {
      name: 'Eucalyptus',
      token: '--byiara-color-accent',
      value: '#126646',
      role: 'Botanical accent — used sparingly, never a CTA',
      textTone: 'light',
    },
  ];

  protected readonly contrastPairs: readonly ContrastPair[] = [
    {
      label: 'Body text on canvas',
      foreground: '#1E1616',
      background: '#FFFFFF',
      ratio: '17.8:1',
      result: 'AAA',
    },
    {
      label: 'Pink text on canvas',
      foreground: '#A7074B',
      background: '#FFFFFF',
      ratio: '7.57:1',
      result: 'AAA',
    },
    {
      label: 'White on primary button',
      foreground: '#FFFFFF',
      background: '#E73D6D',
      ratio: '3.97:1',
      result: 'Bold labels ≥14px',
    },
    {
      label: 'White on accent',
      foreground: '#FFFFFF',
      background: '#126646',
      ratio: '6.97:1',
      result: 'AA',
    },
  ];
}
