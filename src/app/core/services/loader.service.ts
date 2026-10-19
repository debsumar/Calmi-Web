import { Injectable, computed, signal } from '@angular/core';

/**
 * Reference-counted loading state: concurrent requests each call show()/hide() once and the
 * indicator only clears when the last one finishes.
 */
@Injectable({ providedIn: 'root' })
export class LoaderService {
  private readonly pending = signal(0);
  readonly loading = computed(() => this.pending() > 0);

  show(): void {
    this.pending.update((n) => n + 1);
  }

  hide(): void {
    this.pending.update((n) => Math.max(0, n - 1));
  }
}
