import { afterNextRender, ChangeDetectionStrategy, Component, ElementRef, HostListener, signal, ViewChild } from '@angular/core';
import { LucideDynamicIcon } from '@lucide/angular';
import { AnimateOnScrollDirective } from '@/shared/directives/animate-on-scroll.directive';
import { DragScrollDirective } from '@/shared/directives/drag-scroll.directive';
import { PsychologistCardComponent } from '@/shared/components/cards/psychologist-card.component';
import { FaqAccordionComponent } from '@/features/therapy/components/faq-accordion/faq-accordion.component';
import { THERAPY_FAQS } from '@/features/therapy/data/faq.data';
import { THERAPISTS, Therapist } from '@/features/therapy/data/therapist.data';

type FilterId = 'availability' | 'gender' | 'language';

const CARD_STRIDE = 284; // md card width (260) + gap (24)

@Component({
  selector: 'app-therapy',
  imports: [LucideDynamicIcon, AnimateOnScrollDirective, DragScrollDirective, PsychologistCardComponent, FaqAccordionComponent],
  changeDetection: ChangeDetectionStrategy.Eager,
  templateUrl: './therapy.component.html',
})
export class TherapyComponent {
  @ViewChild('carousel', { static: false }) carouselRef?: ElementRef<HTMLElement>;

  readonly dropdownFilters = signal<{ id: FilterId; label: string }[]>([
    { id: 'availability', label: 'Availability' },
    { id: 'gender', label: 'Gender' },
    { id: 'language', label: 'Language' },
  ]);

  readonly openFilter = signal<FilterId | null>(null);

  readonly psychologists = signal<Therapist[]>(THERAPISTS);

  readonly showLeftShadow = signal(false);
  readonly showRightShadow = signal(true);
  readonly activeSlide = signal(0);

  readonly faqs = THERAPY_FAQS;

  get slideDots(): number[] {
    return this.psychologists().map((_, index) => index);
  }

  constructor() {
    afterNextRender(() => this.checkShadows());
  }

  toggleFilter(id: FilterId): void {
    this.openFilter.update((current) => (current === id ? null : id));
  }

  scrollToSlide(index: number): void {
    const element = this.carouselRef?.nativeElement;
    if (!element) {
      return;
    }
    const stride = element.firstElementChild instanceof HTMLElement
      ? element.firstElementChild.offsetWidth + 24
      : CARD_STRIDE;
    element.scrollTo({ left: index * stride, behavior: 'smooth' });
  }

  @HostListener('window:resize')
  onResize(): void {
    this.checkShadows();
  }

  onScroll(event: Event): void {
    this.updateShadows(event.target as HTMLElement);
  }

  checkShadows(): void {
    if (this.carouselRef) {
      this.updateShadows(this.carouselRef.nativeElement);
    }
  }

  private updateShadows(element: HTMLElement): void {
    const scrollLeft = element.scrollLeft;
    const maxScrollLeft = element.scrollWidth - element.clientWidth;
    this.showLeftShadow.set(scrollLeft > 10);
    this.showRightShadow.set(maxScrollLeft > 10 && scrollLeft < maxScrollLeft - 10);
    const stride = element.firstElementChild instanceof HTMLElement
      ? element.firstElementChild.offsetWidth + 24
      : CARD_STRIDE;
    this.activeSlide.set(Math.round(scrollLeft / stride));
  }
}
