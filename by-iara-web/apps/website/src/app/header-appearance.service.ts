import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class HeaderAppearanceService {
  private readonly movingMediaBehindHeaderState = signal(false);

  readonly movingMediaBehindHeader =
    this.movingMediaBehindHeaderState.asReadonly();

  setMovingMediaBehindHeader(active: boolean): void {
    this.movingMediaBehindHeaderState.set(active);
  }
}
