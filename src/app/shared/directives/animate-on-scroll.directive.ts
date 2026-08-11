import { isPlatformBrowser } from '@angular/common';
import {
  afterNextRender,
  DestroyRef,
  Directive,
  ElementRef,
  inject,
  PLATFORM_ID,
} from '@angular/core';

@Directive({
  selector: '[appAnimateOnScroll]',
})
export class AnimateOnScrollDirective {
  private readonly el = inject(ElementRef<HTMLElement>);
  private readonly destroyRef = inject(DestroyRef);
  private readonly platformId = inject(PLATFORM_ID);

  constructor() {
    afterNextRender({ write: () => this.setup() });
  }

  private setup(): void {
    const element = this.el.nativeElement;
    const reveal = (animate = true) => {
      element.style.opacity = '';
      if (animate) {
        element.classList.add('stagger-enter');
      }
    };

    if (!isPlatformBrowser(this.platformId)) {
      reveal(false);
      return;
    }

    let reducedMotion = false;
    try {
      reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    } catch {
      // Keep normal animation when media-query support is unavailable.
    }
    if (reducedMotion) {
      reveal(false);
      return;
    }

    if (typeof IntersectionObserver === 'undefined') {
      reveal();
      return;
    }

    const rect = element.getBoundingClientRect();
    const alreadyVisible =
      rect.bottom > 0 &&
      rect.right > 0 &&
      rect.top < window.innerHeight &&
      rect.left < window.innerWidth;

    // Keep visible content visible. Tall elements must not wait for an area threshold.
    if (alreadyVisible) {
      reveal();
      return;
    }

    element.style.opacity = '0';

    let observer: IntersectionObserver | undefined;
    let fallback: ReturnType<typeof window.setTimeout> | undefined;
    const complete = () => {
      if (fallback !== undefined) {
        window.clearTimeout(fallback);
        fallback = undefined;
      }
      reveal();
      observer?.disconnect();
    };

    try {
      observer = new IntersectionObserver(
        ([entry]) => {
          if (entry?.isIntersecting) {
            complete();
          }
        },
        { threshold: 0 },
      );
      fallback = window.setTimeout(complete, 1_500);
      observer.observe(element);
    } catch {
      complete();
      return;
    }

    this.destroyRef.onDestroy(() => {
      if (fallback !== undefined) {
        window.clearTimeout(fallback);
      }
      observer?.disconnect();
    });
  }
}
