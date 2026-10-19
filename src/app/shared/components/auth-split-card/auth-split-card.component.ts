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
import { LucideDynamicIcon } from '@lucide/angular';

export type AuthImageSide = 'left' | 'right';

export interface AuthTestimonial {
  quote: string;
  author: string;
  role: string;
}

/** Generic, non-attributed copy. No numbers or claims: swap in real testimonials via the input once they exist. */
const DEFAULT_MESSAGES: readonly AuthTestimonial[] = [
  { quote: 'A few quiet minutes each day can make room to breathe.', author: 'Calmi', role: 'A gentle reminder' },
  { quote: 'You can go at your own pace. There is no wrong way to start.', author: 'Calmi', role: 'A gentle reminder' },
  { quote: 'Rest is part of the process, not a break from it.', author: 'Calmi', role: 'A gentle reminder' },
];

const SLIDE_INTERVAL_MS = 6000;

@Component({
  selector: 'app-auth-split-card',
  imports: [RouterLink, LucideDynamicIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <main class="min-h-dvh bg-canvas px-4 py-6 font-sans text-ink sm:px-6 md:flex md:items-center md:justify-center md:px-8 md:py-10">
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
              aria-label="Messages from Calmi"
              [attr.aria-live]="isAutoplaying() ? 'off' : 'polite'"
              (mouseenter)="pause()"
              (mouseleave)="resume()"
              (focusin)="pause()"
              (focusout)="resume()">
              <blockquote class="text-base leading-relaxed text-on-brand-deep">
                &ldquo;{{ activeTestimonial().quote }}&rdquo;
                <footer class="mt-2 text-xs font-semibold text-on-brand-deep">
                  {{ activeTestimonial().author }} &middot; {{ activeTestimonial().role }}
                </footer>
              </blockquote>

              <div class="flex items-center gap-1" role="group" aria-label="Choose testimonial">
                @for (item of testimonials(); track item.quote; let index = $index) {
                  <!-- 24px hit area (WCAG 2.5.8); the visible dot stays small. -->
                  <button
                    type="button"
                    (click)="showSlide(index)"
                    [attr.aria-current]="activeIndex() === index ? 'true' : null"
                    [attr.aria-label]="'Show testimonial ' + (index + 1) + ' of ' + testimonials().length"
                    class="group flex h-6 min-w-6 items-center justify-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-brand-dark">
                    <span
                      aria-hidden="true"
                      class="block h-1.5 rounded-full bg-brand-light transition-all group-hover:bg-brand-deep"
                      [class]="activeIndex() === index ? 'w-5' : 'w-1.5'"></span>
                  </button>
                }
                @if (canAutoplay()) {
                  <button
                    type="button"
                    (click)="toggleAutoplay()"
                    [attr.aria-pressed]="userPaused()"
                    class="ml-2 min-h-6 rounded-full px-2 text-xs font-semibold text-on-brand-deep underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-brand-dark">
                    {{ userPaused() ? 'Play' : 'Pause' }}
                    <span class="sr-only"> automatic rotation</span>
                  </button>
                }
              </div>

            </div>
          }
        </div>

        <div
          [class]="imageSide() === 'left' ? 'order-2 flex flex-1 flex-col bg-surface p-7 sm:p-10 md:order-2 md:p-14' : 'order-2 flex flex-1 flex-col bg-surface p-7 sm:p-10 md:order-1 md:p-14'">
          @if (showLogo() || showClose()) {
            <div class="mb-8 flex items-center justify-between gap-4">
              @if (showLogo()) {
                <img src="/assets/logos/logo.avif" alt="Calmi logo" class="h-10 w-auto object-contain" />
              } @else {
                <span></span>
              }
              @if (showClose()) {
                <a
                  routerLink="/"
                  class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-sunken text-brand transition-colors hover:bg-brand-deep hover:text-on-brand-deep focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
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

  readonly testimonials = input<readonly AuthTestimonial[]>(DEFAULT_MESSAGES);
  readonly activeIndex = signal(0);
  readonly activeTestimonial = computed(() => {
    const items = this.testimonials();
    return items[Math.min(this.activeIndex(), items.length - 1)] ?? DEFAULT_MESSAGES[0];
  });
  /** True once the user explicitly paused rotation (WCAG 2.2.2). */
  readonly userPaused = signal(false);
  /** False under reduced motion, without matchMedia, or with a single slide. */
  readonly canAutoplay = signal(false);
  readonly isAutoplaying = computed(() => this.canAutoplay() && !this.userPaused());

  private timerId: ReturnType<typeof setInterval> | null = null;
  private autoplayAllowed = false;

  constructor() {
    inject(DestroyRef).onDestroy(() => this.pause());

    afterNextRender(() => {
      if (!this.showTestimonials() || this.testimonials().length < 2) return;
      let reduced = false;
      try {
        reduced = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
      } catch {
        // Unknown preference: stay conservative and keep the carousel manual.
        reduced = true;
      }
      this.autoplayAllowed = !reduced;
      this.canAutoplay.set(this.autoplayAllowed);
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
    if (!this.autoplayAllowed || this.userPaused() || this.timerId !== null) return;
    this.timerId = setInterval(() => {
      this.activeIndex.update((current) => (current + 1) % this.testimonials().length);
    }, SLIDE_INTERVAL_MS);
  }

  toggleAutoplay(): void {
    if (this.userPaused()) {
      this.userPaused.set(false);
      this.resume();
    } else {
      this.userPaused.set(true);
      this.pause();
    }
  }
}
