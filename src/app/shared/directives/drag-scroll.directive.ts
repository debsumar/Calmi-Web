import { Directive, ElementRef, inject, DestroyRef, afterNextRender } from '@angular/core';

/** Movement below this many px is a tap/click, not a drag. */
const DRAG_THRESHOLD_PX = 5;
/** A touch gesture is classified as horizontal or vertical once it moves this far. */
const INTENT_THRESHOLD_PX = 4;
const SPRING_BACK_MS = 300;

type Axis = 'x' | 'y' | null;

interface Registration {
  type: string;
  handler: EventListener;
  options?: AddEventListenerOptions | boolean;
}

/**
 * Click-and-drag horizontal scrolling for a scroller. Vertical touch gestures are
 * left to the browser so the page still scrolls; keyboard users get ArrowLeft/Right.
 */
@Directive({
  selector: '[appDragScroll]',
})
export class DragScrollDirective {
  private readonly el = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly destroyRef = inject(DestroyRef);

  private isDown = false;
  private dragged = false;
  private axis: Axis = null;
  private startX = 0;
  private startY = 0;
  private scrollLeft = 0;
  private previousSnapType = '';
  private springBackTimer: ReturnType<typeof setTimeout> | undefined;
  private readonly registrations: Registration[] = [];

  constructor() {
    afterNextRender(() => this.setup());
  }

  private listen(type: string, handler: EventListener, options?: AddEventListenerOptions | boolean): void {
    this.el.nativeElement.addEventListener(type, handler, options);
    this.registrations.push({ type, handler, options });
  }

  private setup(): void {
    const slider = this.el.nativeElement;
    const addedTabindex = !slider.hasAttribute('tabindex');
    if (addedTabindex) slider.setAttribute('tabindex', '0');
    slider.style.cursor = 'grab';
    // Horizontal pans are ours (JS below); vertical pans stay native so the page scrolls.
    slider.style.touchAction = 'pan-y';

    const onDown = (x: number, y: number) => {
      this.isDown = true;
      this.dragged = false;
      this.axis = null;
      this.startX = x;
      this.startY = y;
      this.scrollLeft = slider.scrollLeft;
      this.previousSnapType = slider.style.scrollSnapType;
      slider.style.cursor = 'grabbing';
      slider.style.scrollSnapType = 'none';
      if (this.springBackTimer !== undefined) {
        clearTimeout(this.springBackTimer);
        this.springBackTimer = undefined;
        slider.style.transition = '';
      }
    };

    const scrollTo = (x: number) => {
      const walk = (x - this.startX) * 2;
      if (Math.abs(walk) > DRAG_THRESHOLD_PX) this.dragged = true;
      const newScroll = this.scrollLeft - walk;

      // Bouncy overscroll
      const maxScroll = slider.scrollWidth - slider.clientWidth;
      if (newScroll < 0) {
        slider.scrollLeft = 0;
        slider.style.transform = `translateX(${Math.min(-newScroll * 0.3, 40)}px)`;
      } else if (newScroll > maxScroll) {
        slider.scrollLeft = maxScroll;
        slider.style.transform = `translateX(${Math.max(-(newScroll - maxScroll) * 0.3, -40)}px)`;
      } else {
        slider.style.transform = '';
        slider.scrollLeft = newScroll;
      }
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!this.isDown) return;
      e.preventDefault();
      scrollTo(e.pageX);
    };

    const onTouchMove = (e: TouchEvent) => {
      if (!this.isDown) return;
      const touch = e.touches[0];
      if (!touch) return;
      if (this.axis === null) {
        const dx = Math.abs(touch.pageX - this.startX);
        const dy = Math.abs(touch.pageY - this.startY);
        if (Math.max(dx, dy) < INTENT_THRESHOLD_PX) return;
        this.axis = dx > dy ? 'x' : 'y';
      }
      // Vertical intent: do nothing, let the page scroll.
      if (this.axis !== 'x') return;
      if (e.cancelable) e.preventDefault();
      scrollTo(touch.pageX);
    };

    const onUp = () => {
      if (!this.isDown) return;
      this.isDown = false;
      this.axis = null;
      slider.style.cursor = 'grab';
      slider.style.scrollSnapType = this.previousSnapType;
      // Spring back
      if (slider.style.transform) {
        slider.style.transition = `transform ${SPRING_BACK_MS}ms cubic-bezier(0.25, 0.46, 0.45, 0.94)`;
        slider.style.transform = '';
        this.springBackTimer = setTimeout(() => {
          slider.style.transition = '';
          this.springBackTimer = undefined;
        }, SPRING_BACK_MS);
      }
    };

    // A drag that ends over a link/button must not also activate it.
    const onClickCapture = (e: Event) => {
      if (!this.dragged) return;
      this.dragged = false;
      e.preventDefault();
      e.stopPropagation();
    };

    const onKeydown = (e: KeyboardEvent) => {
      if (e.target !== slider) return;
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
      if (slider.scrollWidth <= slider.clientWidth) return;
      e.preventDefault();
      const step = Math.max(slider.clientWidth * 0.8, 120) * (e.key === 'ArrowRight' ? 1 : -1);
      if (typeof slider.scrollBy === 'function') slider.scrollBy({ left: step, behavior: 'smooth' });
      else slider.scrollLeft += step;
    };

    // Mouse events
    this.listen('mousedown', ((e: MouseEvent) => onDown(e.pageX, e.pageY)) as EventListener);
    this.listen('mousemove', onMouseMove as EventListener);
    this.listen('mouseup', onUp);
    this.listen('mouseleave', onUp);

    // Touch events
    this.listen('touchstart', ((e: TouchEvent) => {
      const touch = e.touches[0];
      if (touch) onDown(touch.pageX, touch.pageY);
    }) as EventListener, { passive: true });
    this.listen('touchmove', onTouchMove as EventListener, { passive: false });
    this.listen('touchend', onUp);
    this.listen('touchcancel', onUp);

    this.listen('click', onClickCapture, true);
    this.listen('keydown', onKeydown as EventListener);

    this.destroyRef.onDestroy(() => {
      for (const { type, handler, options } of this.registrations) {
        slider.removeEventListener(type, handler, options);
      }
      this.registrations.length = 0;
      if (this.springBackTimer !== undefined) {
        clearTimeout(this.springBackTimer);
        this.springBackTimer = undefined;
      }
      if (this.isDown) slider.style.scrollSnapType = this.previousSnapType;
      slider.style.transition = '';
      slider.style.transform = '';
      slider.style.cursor = '';
      slider.style.touchAction = '';
      if (addedTabindex) slider.removeAttribute('tabindex');
    });
  }
}
