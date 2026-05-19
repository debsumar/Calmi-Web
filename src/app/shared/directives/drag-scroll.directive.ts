import { Directive, ElementRef, inject, signal, DestroyRef, afterNextRender } from '@angular/core';

@Directive({
  selector: '[appDragScroll]',
})
export class DragScrollDirective {
  private el = inject(ElementRef<HTMLElement>);
  private destroyRef = inject(DestroyRef);

  private isDown = signal(false);
  private startX = 0;
  private scrollLeft = 0;

  constructor() {
    afterNextRender(() => this.setup());
  }

  private setup(): void {
    const slider = this.el.nativeElement;
    slider.style.cursor = 'grab';

    const onDown = (x: number) => {
      this.isDown.set(true);
      slider.style.cursor = 'grabbing';
      slider.style.scrollSnapType = 'none';
      this.startX = x - slider.offsetLeft;
      this.scrollLeft = slider.scrollLeft;
    };

    const onMove = (e: MouseEvent | TouchEvent, x: number) => {
      if (!this.isDown()) return;
      e.preventDefault();
      const walk = (x - slider.offsetLeft - this.startX) * 2;
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

    const onUp = () => {
      if (!this.isDown()) return;
      this.isDown.set(false);
      slider.style.cursor = 'grab';
      slider.style.scrollSnapType = 'x mandatory';
      // Spring back
      if (slider.style.transform) {
        slider.style.transition = 'transform 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
        slider.style.transform = '';
        setTimeout(() => { slider.style.transition = ''; }, 300);
      }
    };

    // Mouse events
    slider.addEventListener('mousedown', (e: MouseEvent) => onDown(e.pageX));
    slider.addEventListener('mousemove', (e: MouseEvent) => onMove(e, e.pageX));
    slider.addEventListener('mouseup', onUp);
    slider.addEventListener('mouseleave', onUp);

    // Touch events
    slider.addEventListener('touchstart', (e: TouchEvent) => onDown(e.touches[0].pageX), { passive: true });
    slider.addEventListener('touchmove', (e: TouchEvent) => onMove(e, e.touches[0].pageX), { passive: false });
    slider.addEventListener('touchend', onUp);

    this.destroyRef.onDestroy(() => {
      slider.removeEventListener('mousedown', onDown as any);
      slider.removeEventListener('mousemove', onMove as any);
      slider.removeEventListener('mouseup', onUp);
      slider.removeEventListener('mouseleave', onUp);
      slider.removeEventListener('touchstart', onDown as any);
      slider.removeEventListener('touchmove', onMove as any);
      slider.removeEventListener('touchend', onUp);
    });
  }
}
