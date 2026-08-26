import { Component, computed, inject, input, ChangeDetectionStrategy } from '@angular/core';
import { Router } from '@angular/router';
import { LucideDynamicIcon } from '@lucide/angular';
import { DragScrollDirective } from '@/shared/directives/drag-scroll.directive';

/** Pointer travel (px) past which a tap is treated as a carousel drag, not a click. */
const DRAG_TOLERANCE_PX = 10;

@Component({
  selector: 'app-psychologist-card',
  imports: [LucideDynamicIcon, DragScrollDirective],
  host: { class: 'block' },
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <div class="relative h-full bg-surface border border-hairline rounded-2xl p-4 shadow-card flex flex-col">
      <!-- Portrait -->
      <div class="relative rounded-2xl overflow-hidden aspect-[3/4] bg-sunken">
        @if (image()) {
          <img [src]="image()" [alt]="'Portrait of ' + name()" class="absolute inset-0 w-full h-full object-cover">
        } @else {
          <span aria-hidden="true"
                class="absolute inset-0 flex items-center justify-center text-5xl font-bold text-brand">
            {{ initials() }}
          </span>
        }
        <div class="absolute inset-0 bg-gradient-to-t from-scrim via-transparent to-transparent"></div>

        @if (available()) {
          <span class="absolute bottom-14 left-3 inline-flex items-center gap-1.5 bg-surface border border-hairline rounded-full px-2.5 py-1 text-xs font-semibold text-ink">
            <span aria-hidden="true" class="w-2 h-2 rounded-full bg-brand"></span>
            Available
          </span>
        }
        <p class="absolute bottom-3 left-3 right-3 text-on-brand text-xl font-bold truncate">{{ name() }}</p>
      </div>

      <!-- Price + rating -->
      <div class="flex items-baseline justify-between gap-2 mt-4">
        <p class="text-sm text-ink-soft">
          <span class="font-bold text-ink">₹{{ price() }}</span> for {{ duration() }}
        </p>
        <p class="flex items-center gap-1 text-sm text-ink-muted shrink-0">
          <svg [lucideIcon]="'star'" [size]="14" class="text-accent-gold fill-accent-gold"></svg>
          <span class="font-semibold text-ink">{{ rating() }}</span>
          <span class="text-xs">({{ reviews() }})</span>
        </p>
      </div>

      <!-- Specialities: own scroll surface, so it stays above the card-wide link -->
      <div appDragScroll
           (mousedown)="$event.stopPropagation()"
           (touchstart)="$event.stopPropagation()"
           class="relative z-20 flex gap-2 mt-3 overflow-x-auto select-none [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        @for (tag of specialties(); track tag) {
          <span class="shrink-0 whitespace-nowrap border border-hairline rounded-full px-2.5 py-1 text-xs text-ink-soft">
            {{ tag }}
          </span>
        }
      </div>

      <!-- Languages -->
      <p class="text-xs text-ink-muted mt-3">
        <span class="font-semibold text-ink-soft">Speaks:</span> {{ languages().join(', ') }}
      </p>

      <a [href]="profileUrl()"
         [attr.aria-label]="'Book a session with ' + name()"
         (pointerdown)="onPointerDown($event)"
         (click)="onNavigate($event)"
         class="relative z-20 mt-5 block w-full bg-brand text-on-brand font-semibold text-sm text-center rounded-full py-3 hover:bg-brand-deep transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2">
        Book Session
      </a>

      <!-- Card-wide tap target: covers the card, sits under the controls above -->
      <a [href]="profileUrl()"
         [attr.aria-label]="'View ' + name() + ' profile'"
         (pointerdown)="onPointerDown($event)"
         (click)="onNavigate($event)"
         class="absolute inset-0 z-10 rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-inset"></a>
    </div>
  `,
})
export class PsychologistCardComponent {
  name = input.required<string>();
  profileId = input.required<string>();
  price = input.required<number>();
  duration = input.required<string>();
  rating = input.required<number>();
  reviews = input.required<number>();
  specialties = input.required<string[]>();
  languages = input.required<string[]>();
  image = input('');
  available = input(true);

  private readonly router = inject(Router);
  private pointerStartX = 0;
  private pointerStartY = 0;

  initials = computed(() =>
    this.name()
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? '')
      .join('')
  );

  /** Real href so the card stays a link: shareable, middle-clickable, crawlable. */
  profileUrl = computed(() => `/therapy/${this.profileId()}`);

  onPointerDown(event: PointerEvent): void {
    this.pointerStartX = event.clientX;
    this.pointerStartY = event.clientY;
  }

  /**
   * Routes in-app, except when the "tap" was really a carousel swipe: a drag
   * ends with a click on whatever sat under the finger.
   */
  onNavigate(event: MouseEvent): void {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

    event.preventDefault();

    const movedX = Math.abs(event.clientX - this.pointerStartX);
    const movedY = Math.abs(event.clientY - this.pointerStartY);
    const isDrag = (event.clientX || event.clientY)
      && (movedX > DRAG_TOLERANCE_PX || movedY > DRAG_TOLERANCE_PX);
    if (isDrag) return;

    void this.router.navigate(['/therapy', this.profileId()]);
  }
}
