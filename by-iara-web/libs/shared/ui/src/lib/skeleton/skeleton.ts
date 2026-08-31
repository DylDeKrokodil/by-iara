import { Component, input } from '@angular/core';

export type SkeletonVariant = 'line' | 'block' | 'circle';

/** Decorative loading placeholder. Pair it with nearby status text for assistive technology. */
@Component({
  selector: 'byiara-skeleton',
  imports: [],
  templateUrl: './skeleton.html',
  styleUrl: './skeleton.css',
})
export class Skeleton {
  variant = input<SkeletonVariant>('line');
  width = input('100%');
  height = input('1rem');
}
