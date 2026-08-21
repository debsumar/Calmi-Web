import { isPlatformBrowser } from '@angular/common';
import {
  afterNextRender,
  DestroyRef,
  Directive,
  ElementRef,
  inject,
  input,
  PLATFORM_ID,
} from '@angular/core';

/**
 * Draw-in for SVG data graphics (progress ring, donut, sparkline).
 *
 * Two triggers:
 * - default: plays as soon as the graphic is on screen, so content above the fold
 *   animates on load and anything lower draws itself as the reader reaches it.
 * - `appDrawOnScroll="scroll"`: waits for the reader to actually start scrolling,
 *   even if the graphic is already visible. For charts that should reward the
 *   scroll rather than compete with the page landing.
 *
 * A safety timer plays the animation regardless, so a reader can never be left
 * looking at an empty chart. The final frame always equals the static markup, so
 * with reduced motion or no JavaScript the graphic renders at its value.
 */
@Directive({
  selector: '[appDrawOnScroll]',
})
export class DrawOnScrollDirective {
  /** Plays regardless after this long, so content is never withheld. */
  private static readonly VISIBLE_FALLBACK_MS = 1_200;
  private static readonly SCROLL_FALLBACK_MS = 5_000;

  /** `scroll` defers until the reader scrolls; anything else plays when visible. */
  readonly trigger = input<string>('', { alias: 'appDrawOnScroll' });

  private readonly el = inject(ElementRef<SVGElement>);
  private readonly destroyRef = inject(DestroyRef);
  private readonly platformId = inject(PLATFORM_ID);

  constructor() {
    afterNextRender({ write: () => this.setup() });
  }

  private setup(): void {
    const element = this.el.nativeElement;

    if (!isPlatformBrowser(this.platformId)) return;

    let reducedMotion = false;
    try {
      reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    } catch {
      // Fall through to the animated path when media queries are unavailable.
    }
    // Reduced motion: leave the markup exactly as authored, already at its value.
    if (reducedMotion) return;

    const play = () => {
      element.classList.remove('draw-idle');
      element.classList.add('draw-run');
    };

    if (typeof IntersectionObserver === 'undefined') {
      play();
      return;
    }

    const waitForScroll = this.trigger() === 'scroll';

    if (!waitForScroll) {
      // Already on screen: draw now rather than waiting for a scroll that may never come.
      const rect = element.getBoundingClientRect();
      const onScreen =
        rect.bottom > 0 && rect.right > 0 && rect.top < window.innerHeight && rect.left < window.innerWidth;
      if (onScreen) {
        play();
        return;
      }
    }

    // Hold the empty state until the trigger fires.
    element.classList.add('draw-idle');

    let done = false;
    let scrolled = !waitForScroll;
    let visible = false;
    let observer: IntersectionObserver | undefined;
    let fallback: ReturnType<typeof window.setTimeout> | undefined;

    const cleanup = () => {
      window.removeEventListener('scroll', onScroll);
      observer?.disconnect();
      if (fallback !== undefined) {
        window.clearTimeout(fallback);
        fallback = undefined;
      }
    };

    const complete = () => {
      if (done) return;
      done = true;
      play();
      cleanup();
    };

    function onScroll(): void {
      scrolled = true;
      if (visible) complete();
    }

    try {
      observer = new IntersectionObserver(
        ([entry]) => {
          visible = entry?.isIntersecting ?? false;
          if (visible && scrolled) complete();
        },
        { threshold: 0.2 },
      );
      observer.observe(element);
      if (waitForScroll) {
        window.addEventListener('scroll', onScroll, { passive: true });
      }
      fallback = window.setTimeout(
        complete,
        waitForScroll ? DrawOnScrollDirective.SCROLL_FALLBACK_MS : DrawOnScrollDirective.VISIBLE_FALLBACK_MS,
      );
    } catch {
      complete();
      return;
    }

    this.destroyRef.onDestroy(cleanup);
  }
}
