import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  afterNextRender,
  computed,
  inject,
  input,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { LucideDynamicIcon, LucideX, provideLucideIcons } from '@lucide/angular';

export type AuthImageSide = 'left' | 'right';

export interface AuthTestimonial {
  quote: string;
  author: string;
  role: string;
}

/** Dummy copy until real testimonials are wired to the backend. */
const PLACEHOLDER_TESTIMONIALS: readonly AuthTestimonial[] = [
  { quote: 'Ten minutes a night and I finally sleep through.', author: 'Ananya R.', role: 'Member, 8 months' },
  { quote: 'A therapist and daily check-ins in one place changed everything for me.', author: 'Rohit M.', role: 'Member, 1 year' },
  { quote: 'The mood sessions meet me where I am instead of a generic plan.', author: 'Priya S.', role: 'Member, 4 months' },
];

const SLIDE_INTERVAL_MS = 6000;

@Component({
  selector: 'app-auth-split-card',
  imports: [RouterLink, LucideDynamicIcon],
  providers: [provideLucideIcons(LucideX)],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <main class="min-h-screen bg-canvas px-4 py-6 font-sans text-ink sm:px-6 md:flex md:items-center md:justify-center md:px-8 md:py-10">
      <section class="flex w-full max-w-5xl flex-col overflow-hidden rounded-3xl border border-hairline bg-surface shadow-card md:min-h-[38rem] md:flex-row" aria-label="Calmi authentication">
        <div
          [class]="imageSide() === 'left'
            ? 'order-1 flex min-h-56 flex-1 flex-col items-center justify-center gap-6 bg-brand-dark p-8 md:order-1 md:min-h-0 md:p-12'
            : 'order-1 flex min-h-56 flex-1 flex-col items-center justify-center gap-6 bg-brand-dark p-8 md:order-2 md:min-h-0 md:p-12'">
          <img [src]="imageSrc()" [alt]="imageAlt()" class="max-h-56 w-full max-w-md object-contain md:max-h-80" />

          @if (showTestimonials()) {
            <div
              class="flex w-full max-w-sm flex-col items-center gap-4 text-center"
              aria-roledescription="carousel"
              aria-label="What members say"
              (mouseenter)="pause()"
              (mouseleave)="resume()"
              (focusin)="pause()"
              (focusout)="resume()">
              <blockquote class="text-sm leading-relaxed text-white md:text-base">
                &ldquo;{{ activeTestimonial().quote }}&rdquo;
                <footer class="mt-2 text-xs font-semibold text-white/80">
                  {{ activeTestimonial().author }} &middot; {{ activeTestimonial().role }}
                </footer>
              </blockquote>

              <div class="flex items-center gap-2" role="group" aria-label="Choose testimonial">
                @for (item of testimonials; track item.quote; let index = $index) {
                  <button
                    type="button"
                    (click)="showSlide(index)"
                    [attr.aria-current]="activeIndex() === index ? 'true' : null"
                    [attr.aria-label]="'Show testimonial ' + (index + 1) + ' of ' + testimonials.length"
                    class="h-1.5 rounded-full transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-brand-dark"
                    [class]="activeIndex() === index ? 'w-5 bg-white' : 'w-1.5 bg-white/40 hover:bg-white/70'"></button>
                }
              </div>

              <ul class="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-xs text-white/80">
                <li>Licensed therapists</li>
                <li aria-hidden="true">&middot;</li>
                <li>10k+ sessions</li>
                <li aria-hidden="true">&middot;</li>
                <li>Private &amp; encrypted</li>
              </ul>
            </div>
          }
        </div>

        <div
          [class]="imageSide() === 'left' ? 'order-2 flex flex-1 flex-col bg-surface p-7 sm:p-10 md:order-2 md:p-14' : 'order-2 flex flex-1 flex-col bg-surface p-7 sm:p-10 md:order-1 md:p-14'">
          @if (showLogo() || showClose()) {
            <div class="mb-8 flex items-center justify-between gap-4">
              @if (showLogo()) {
                <img src="/assets/logo.avif" alt="Calmi logo" class="h-10 w-auto object-contain" />
              } @else {
                <span></span>
              }
              @if (showClose()) {
                <a
                  routerLink="/"
                  class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-soft/25 text-brand-deep transition-colors hover:bg-brand-deep hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 dark:bg-brand-soft/20 dark:text-brand-soft dark:hover:bg-brand-soft dark:hover:text-brand-night"
                  aria-label="Close and return to home">
                  <svg [lucideIcon]="'x'" [size]="18" class="fill-none stroke-current" aria-hidden="true"></svg>
                </a>
              }
            </div>
          }
          <div class="flex flex-1 flex-col justify-center">
            <ng-content />
          </div>
        </div>
      </section>
    </main>
  `,
})
export class AuthSplitCardComponent {
  readonly imageSrc = input.required<string>();
  readonly imageAlt = input.required<string>();
  readonly imageSide = input<AuthImageSide>('left');
  readonly showLogo = input(true);
  readonly showClose = input(true);
  readonly showTestimonials = input(true);

  readonly testimonials = PLACEHOLDER_TESTIMONIALS;
  readonly activeIndex = signal(0);
  readonly activeTestimonial = computed(() => this.testimonials[this.activeIndex()]);

  private timerId: ReturnType<typeof setInterval> | null = null;
  private autoplayAllowed = false;

  constructor() {
    inject(DestroyRef).onDestroy(() => this.pause());

    afterNextRender(() => {
      if (!this.showTestimonials() || this.testimonials.length < 2) return;
      this.autoplayAllowed = !matchMedia('(prefers-reduced-motion: reduce)').matches;
      this.resume();
    });
  }

  showSlide(index: number): void {
    this.activeIndex.set(index);
  }

  pause(): void {
    if (this.timerId === null) return;
    clearInterval(this.timerId);
    this.timerId = null;
  }

  resume(): void {
    if (!this.autoplayAllowed || this.timerId !== null) return;
    this.timerId = setInterval(() => {
      this.activeIndex.update((current) => (current + 1) % this.testimonials.length);
    }, SLIDE_INTERVAL_MS);
  }
}
