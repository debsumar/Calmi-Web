import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  afterRenderEffect,
  computed,
  input,
  signal,
  viewChild,
} from '@angular/core';
import { LucideArrowLeft, LucideArrowRight, LucideMessageSquareQuote, LucideStar } from '@lucide/angular';
import { TherapistTestimonial } from '@/features/therapy/data/therapist.data';

@Component({
  selector: 'app-therapist-testimonials',
  imports: [LucideStar, LucideArrowRight, LucideArrowLeft, LucideMessageSquareQuote],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="min-w-0 pt-10 md:pt-14" aria-labelledby="testimonials-heading">
      <div class="flex items-center gap-3">
        <span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-deep text-on-brand" aria-hidden="true">
          <svg lucideMessageSquareQuote [size]="20" aria-hidden="true"></svg>
        </span>
        <h2 id="testimonials-heading" class="font-sans text-xl font-bold text-ink md:text-2xl">Hear from Clients!</h2>
      </div>

      <!-- Stack wrapper: the two layers behind are decorative depth only, so the
           active card animates as if it were the top of a physical card stack.
           The keyed @for wraps the WHOLE card, so the card itself swipes rather
           than its contents sliding inside a static frame. Keying on index means
           every card is recreated and replays the keyframes, for any array length. -->
      <!-- No overflow clipping here on purpose: the card fades as it travels
           instead of being sliced at the wrapper edge. -->
      <div class="relative mt-6 min-w-0 pb-3">
        @if (testimonials().length > 1) {
          <div class="pointer-events-none absolute inset-x-3 -bottom-2 h-full rounded-2xl border border-hairline bg-surface opacity-60" aria-hidden="true"></div>
          <div class="pointer-events-none absolute inset-x-1.5 -bottom-1 h-full rounded-2xl border border-hairline bg-surface opacity-80" aria-hidden="true"></div>
        }

        @for (item of [testimonial()]; track index()) {
          <div #card
               class="testimonial-card relative flex min-w-0 flex-col overflow-hidden rounded-2xl border border-hairline bg-surface p-5 shadow-card md:p-6"
               [class.h-72]="!expanded()"
               [class.min-h-72]="expanded()"
               [attr.data-index]="index()"
               [attr.data-direction]="direction()">
            <div class="flex items-center gap-1" [attr.aria-label]="'Rating ' + item.rating + ' out of 5'">
              @for (star of stars; track star) {
                <svg lucideStar [size]="16" aria-hidden="true"
                     [class]="star <= item.rating ? 'fill-accent-gold text-accent-gold' : 'text-ink-muted'"></svg>
              }
              <span class="ml-2 text-xs font-semibold text-ink-soft">{{ item.rating }}/5</span>
            </div>
            <blockquote #quote id="testimonial-quote" class="mt-4 pr-12 text-xs leading-relaxed text-ink-soft"
                        [class.line-clamp-4]="!expanded()">“{{ item.quote }}”</blockquote>
            <!-- Rendered only when the clamp actually truncates this quote,
                 measured from the DOM rather than guessed from length. -->
            @if (showToggle()) {
              <button type="button" (click)="toggleExpanded()"
                      [attr.aria-expanded]="expanded()" aria-controls="testimonial-quote"
                      class="mt-2 self-start rounded-full text-xs font-semibold text-brand-deep underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand">
                {{ expanded() ? 'Show less' : 'Show more' }}
              </button>
            }
            <div class="mt-auto flex items-center justify-between gap-3 pt-5">
              <div class="flex min-w-0 items-center gap-3">
                <span class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sunken text-xs font-bold text-brand-deep"
                      role="img" [attr.aria-label]="'Placeholder avatar for ' + item.author">{{ initials(item.author) }}</span>
                <p class="min-w-0 truncate text-xs font-semibold text-ink">– {{ item.author }}</p>
              </div>

              @if (testimonials().length > 1) {
                <div class="flex shrink-0 items-center gap-2">
                  <button type="button" aria-label="Show previous testimonial" (click)="previous()"
                          class="inline-flex h-9 w-9 items-center justify-center rounded-full border border-hairline bg-surface text-ink-soft transition-colors hover:bg-sunken focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand">
                    <svg lucideArrowLeft [size]="16" aria-hidden="true"></svg>
                  </button>
                  <button type="button" aria-label="Show next testimonial" (click)="next()"
                          class="inline-flex h-9 w-9 items-center justify-center rounded-full bg-brand-deep text-on-brand transition-transform hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2">
                    <svg lucideArrowRight [size]="16" aria-hidden="true"></svg>
                  </button>
                </div>
              }
            </div>
          </div>
        }
      </div>

      <p class="sr-only" aria-live="polite">
        Testimonial {{ index() + 1 }} of {{ testimonials().length }}: {{ testimonial().author }}
      </p>
    </section>
  `,
  styles: `
    /* Height is owned by the template (fixed while collapsed, auto once
       expanded); the swipe itself runs through the Web Animations API in the
       component so it cannot be silently dropped by a stylesheet rule. */
    .testimonial-card {
      will-change: transform;
    }
  `,
})
export class TherapistTestimonialsComponent {
  readonly testimonials = input.required<TherapistTestimonial[]>();
  readonly index = signal(0);
  readonly direction = signal<'next' | 'prev'>('next');
  readonly expanded = signal(false);
  /**
   * True only while the clamp is really truncating the quote. Measured from the
   * DOM (scrollHeight vs clientHeight) so short quotes never show a pointless
   * Show more control.
   */
  readonly quoteOverflows = signal(false);
  readonly stars = [1, 2, 3, 4, 5];
  readonly testimonial = computed(() => this.testimonials()[this.index() % Math.max(this.testimonials().length, 1)]);
  readonly showToggle = computed(() => this.quoteOverflows() || this.expanded());

  private readonly quoteEl = viewChild<ElementRef<HTMLElement>>('quote');
  private readonly cardEl = viewChild<ElementRef<HTMLElement>>('card');

  constructor() {
    afterRenderEffect(() => {
      // Re-measure whenever the quote node or the clamp state changes.
      const element = this.quoteEl()?.nativeElement;
      this.index();
      if (!element || this.expanded()) {
        return;
      }
      this.quoteOverflows.set(element.scrollHeight - element.clientHeight > 1);
    });

    afterRenderEffect(() => {
      // The card node is recreated per index, so this runs once per switch and
      // animates the whole card. Driving it here (rather than from a stylesheet
      // keyframe) means the swipe cannot be dropped by CSS precedence, and the
      // reduced-motion branch still gives a visible, non-moving transition.
      const card = this.cardEl()?.nativeElement;
      const direction = this.direction();
      this.index();
      if (!card || typeof card.animate !== 'function') {
        return;
      }

      if (this.prefersReducedMotion()) {
        card.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 150, easing: 'ease-out' });
        return;
      }

      const offset = direction === 'next' ? '16%' : '-16%';
      const tilt = direction === 'next' ? '1.5deg' : '-1.5deg';
      card.animate(
        [
          { opacity: 0, transform: `translateX(${offset}) rotate(${tilt}) scale(0.98)`, offset: 0 },
          { opacity: 0.85, transform: `translateX(${direction === 'next' ? '4%' : '-4%'}) rotate(0deg) scale(0.995)`, offset: 0.55 },
          { opacity: 1, transform: 'translateX(0) rotate(0deg) scale(1)', offset: 1 },
        ],
        { duration: 340, easing: 'cubic-bezier(0.22, 1, 0.36, 1)', fill: 'both' },
      );
    });
  }

  private prefersReducedMotion(): boolean {
    return typeof window !== 'undefined' && typeof window.matchMedia === 'function'
      ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
      : false;
  }

  toggleExpanded(): void {
    this.expanded.update((value) => !value);
  }

  next(): void {
    this.move('next', 1);
  }

  previous(): void {
    this.move('prev', -1);
  }

  initials(author: string): string {
    return author
      .replace(/^[–-]\s*/, '')
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? '')
      .join('');
  }

  private move(direction: 'next' | 'prev', step: number): void {
    const count = this.testimonials().length;
    if (count === 0) {
      return;
    }
    this.direction.set(direction);
    // Collapse first so the card returns to its default height before switching.
    this.expanded.set(false);
    this.quoteOverflows.set(false);
    this.index.update((value) => (value + step + count) % count);
  }
}
