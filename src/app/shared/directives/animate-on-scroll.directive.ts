import { Directive, ElementRef, inject, DestroyRef, afterNextRender } from '@angular/core';

@Directive({
  selector: '[appAnimateOnScroll]',
})
export class AnimateOnScrollDirective {
  private el = inject(ElementRef<HTMLElement>);
  private destroyRef = inject(DestroyRef);

  constructor() {
    afterNextRender(() => this.setup());
  }

  private setup(): void {
    const element = this.el.nativeElement;
    element.style.opacity = '0';

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          element.classList.add('stagger-enter');
          element.style.opacity = '';
          observer.disconnect();
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(element);
    this.destroyRef.onDestroy(() => observer.disconnect());
  }
}
