import { Component, booleanAttribute, input } from '@angular/core';

export type CardPadding = 'none' | 'sm' | 'md' | 'lg';
export type CardVariant = 'default' | 'muted' | 'tinted' | 'dashed';

/**
 * Generic bordered container: box only, no opinion on content. Domain cards
 * (a KPI card, a request card with a status chip and actions) compose this
 * with the `[card-header]`/`[card-footer]` slots rather than becoming new
 * Card variants.
 */
@Component({
  selector: 'byiara-card',
  imports: [],
  templateUrl: './card.html',
  styleUrl: './card.css',
})
export class Card {
  padding = input<CardPadding>('md');
  variant = input<CardVariant>('default');
  /** Hover lift for pressable, non-<button> cards (e.g. a card wrapping a form). */
  interactive = input(false, { transform: booleanAttribute });
}
