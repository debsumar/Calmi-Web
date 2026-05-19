import { Directive, ElementRef, HostListener, Renderer2, OnInit, OnDestroy } from '@angular/core';

@Directive({
  selector: '[appDragScroll]',
  standalone: true
})
export class DragScrollDirective implements OnInit, OnDestroy {
  private isDown = false;
  private startX: number = 0;
  private scrollLeft: number = 0;
  private slider!: HTMLElement;

  constructor(private el: ElementRef, private renderer: Renderer2) {
    this.slider = this.el.nativeElement;
  }

  ngOnInit() {
    this.renderer.setStyle(this.slider, 'cursor', 'grab');
  }

  ngOnDestroy() {
    this.renderer.removeStyle(this.slider, 'cursor');
  }

  @HostListener('mousedown', ['$event'])
  onMouseDown(e: MouseEvent) {
    this.isDown = true;
    this.renderer.setStyle(this.slider, 'cursor', 'grabbing');
    this.renderer.setStyle(this.slider, 'scroll-snap-type', 'none'); // Disable snap while dragging
    this.startX = e.pageX - this.slider.offsetLeft;
    this.scrollLeft = this.slider.scrollLeft;
  }

  @HostListener('mouseleave')
  onMouseLeave() {
    if (!this.isDown) return;
    this.isDown = false;
    this.renderer.setStyle(this.slider, 'cursor', 'grab');
    this.renderer.setStyle(this.slider, 'scroll-snap-type', 'x mandatory'); // Re-enable snap
  }

  @HostListener('mouseup')
  onMouseUp() {
    this.isDown = false;
    this.renderer.setStyle(this.slider, 'cursor', 'grab');
    this.renderer.setStyle(this.slider, 'scroll-snap-type', 'x mandatory'); // Re-enable snap
  }

  @HostListener('mousemove', ['$event'])
  onMouseMove(e: MouseEvent) {
    if (!this.isDown) return;
    e.preventDefault();
    const x = e.pageX - this.slider.offsetLeft;
    const walk = (x - this.startX) * 2; // Scroll speed multiplier
    this.slider.scrollLeft = this.scrollLeft - walk;
  }
}
