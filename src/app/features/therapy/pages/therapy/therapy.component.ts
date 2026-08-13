import { afterNextRender, ChangeDetectionStrategy, Component, ElementRef, HostListener, signal, ViewChild } from '@angular/core';
import { LucideDynamicIcon } from '@lucide/angular';
import { AnimateOnScrollDirective } from '@/shared/directives/animate-on-scroll.directive';
import { DragScrollDirective } from '@/shared/directives/drag-scroll.directive';
import { PsychologistCardComponent } from '@/shared/components/cards/psychologist-card.component';

type FilterId = 'availability' | 'gender' | 'language';

interface Psychologist {
  name: string;
  image: string;
  price: number;
  duration: string;
  rating: number;
  reviews: number;
  specialties: string[];
  languages: string[];
}

const CARD_STRIDE = 284; // md card width (260) + gap (24)

@Component({
  selector: 'app-therapy',
  imports: [LucideDynamicIcon, AnimateOnScrollDirective, DragScrollDirective, PsychologistCardComponent],
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

  readonly psychologists = signal<Psychologist[]>([
    { name: 'Ayushi Arora', image: '', price: 2000, duration: '50 mins', rating: 4.9, reviews: 128, specialties: ['Anxiety & Stress', 'Depression', 'Relationship'], languages: ['English', 'Hindi', 'Punjabi'] },
    { name: 'Mukesh Patel', image: '', price: 1500, duration: '30 mins', rating: 4.8, reviews: 96, specialties: ['Loneliness', 'Depression', 'Adult ADHD'], languages: ['English', 'Hindi', 'Gujarati'] },
    { name: 'Prerna Gawde', image: '', price: 2500, duration: '45 mins', rating: 4.7, reviews: 74, specialties: ['Bipolar disorder', 'Schizophrenia'], languages: ['English', 'Hindi', 'Marathi'] },
    { name: 'Rahul Menon', image: '', price: 1800, duration: '40 mins', rating: 4.8, reviews: 112, specialties: ['Burnout', 'Sleep Issues', 'Grief'], languages: ['English', 'Hindi', 'Malayalam'] },
    { name: 'Sneha Iyer', image: '', price: 2200, duration: '50 mins', rating: 4.9, reviews: 143, specialties: ['Trauma & PTSD', 'Anxiety & Stress', 'Self Esteem'], languages: ['English', 'Hindi', 'Tamil'] },
    { name: 'Arjun Sharma', image: '', price: 1200, duration: '30 mins', rating: 4.6, reviews: 58, specialties: ['Career Stress', 'Anger Issues', 'OCD'], languages: ['English', 'Hindi'] },
  ]);

  readonly showLeftShadow = signal(false);
  readonly showRightShadow = signal(true);
  readonly activeSlide = signal(0);

  readonly faqs = signal<{ question: string; answer: string }[]>([
    {
      question: 'How is Calmi different from other mental wellness apps?',
      answer: 'Calmi brings mood tracking, personalized guidance, sleep support, journaling, and therapist connections into one calm, personalized experience.',
    },
    {
      question: 'Is Calmi a replacement for professional therapy?',
      answer: 'No. Calmi is designed to complement professional support, not replace a qualified psychologist or therapist.',
    },
    {
      question: 'How does Sleep Mode recommend the right audio for me?',
      answer: 'Sleep Mode uses your preferences, mood, and listening patterns to surface calming sounds and sessions suited to how you want to wind down.',
    },
    {
      question: 'How do I know which psychologist is right for me?',
      answer: 'Calmi uses your goals, preferences, and support needs to recommend psychologists who may be a good fit. You can review their profiles before choosing.',
    },
    {
      question: 'Can I use Calmi for free before subscribing?',
      answer: 'Yes. Calmi will offer free access to selected features, with premium content and experiences available through a subscription.',
    },
  ]);

  readonly openFaq = signal<number | null>(null);

  toggleFaq(index: number): void {
    this.openFaq.update((current) => (current === index ? null : index));
  }

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
