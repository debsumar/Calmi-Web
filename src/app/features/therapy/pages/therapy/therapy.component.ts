import { afterNextRender, ChangeDetectionStrategy, Component, computed, ElementRef, HostListener, inject, Injector, signal, ViewChild } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LucideDynamicIcon } from '@lucide/angular';
import { AnimateOnScrollDirective } from '@/shared/directives/animate-on-scroll.directive';
import { DragScrollDirective } from '@/shared/directives/drag-scroll.directive';
import { PsychologistCardComponent } from '@/shared/components/cards/psychologist-card.component';
import { SelectMenuComponent, SelectMenuOption } from '@/shared/components/form/select-menu.component';
import { FaqAccordionComponent } from '@/features/therapy/components/faq-accordion/faq-accordion.component';
import { THERAPY_FAQS } from '@/features/therapy/data/faq.data';
import { TherapistFilterStore } from '@/features/therapy/services/therapist-filter.store';
import {
  AVAILABILITY_OPTIONS,
  DEFAULT_FILTER_CRITERIA,
  EXPERIENCE_OPTIONS,
  filterTherapists,
  firstAvailableDay,
  GENDER_OPTIONS,
  LANGUAGE_OPTIONS,
  PRICE_BOUNDS,
  RATING_OPTIONS,
  SESSION_MODE_OPTIONS,
  SPECIALTY_OPTIONS,
  TherapistFilterCriteria,
  Gender,
  THERAPISTS,
} from '@/features/therapy/data/therapist.data';

type FilterId = 'all' | 'availability' | 'gender' | 'language';
type NumberCriterion = 'priceMin' | 'priceMax';

const CARD_STRIDE = 284;

@Component({
  selector: 'app-therapy',
  imports: [RouterLink, LucideDynamicIcon, AnimateOnScrollDirective, DragScrollDirective, PsychologistCardComponent, SelectMenuComponent, FaqAccordionComponent],
  changeDetection: ChangeDetectionStrategy.Eager,
  templateUrl: './therapy.component.html',
})
export class TherapyComponent {
  @ViewChild('carousel', { static: false }) carouselRef?: ElementRef<HTMLElement>;
  private readonly filterStore = inject(TherapistFilterStore);

  readonly availabilityOptions = AVAILABILITY_OPTIONS;
  readonly genderOptions = GENDER_OPTIONS;
  readonly languageOptions = LANGUAGE_OPTIONS;
  readonly specialtyOptions = SPECIALTY_OPTIONS;
  readonly sessionModeOptions = SESSION_MODE_OPTIONS;
  readonly ratingOptions = RATING_OPTIONS;
  readonly experienceOptions = EXPERIENCE_OPTIONS;
  readonly priceBounds = PRICE_BOUNDS;
  readonly ratingSelectOptions: readonly SelectMenuOption[] = [
    { value: null, label: 'Any rating' },
    ...this.ratingOptions.map((rating) => ({ value: rating, label: `${rating}+` })),
  ];
  readonly experienceSelectOptions: readonly SelectMenuOption[] = [
    { value: null, label: 'Any experience' },
    ...this.experienceOptions.map((experience) => ({ value: experience, label: `${experience}+ years` })),
  ];
  readonly specialtySelectOptions: readonly SelectMenuOption[] = [
    { value: null, label: 'Any specialty' },
    ...this.specialtyOptions.map((specialty) => ({ value: specialty, label: specialty })),
  ];
  readonly sessionModeSelectOptions: readonly SelectMenuOption[] = [
    { value: null, label: 'Any session mode' },
    ...this.sessionModeOptions.map((mode) => ({ value: mode, label: mode })),
  ];
  readonly dropdownFilters: readonly { id: Exclude<FilterId, 'all'>; label: string }[] = [
    { id: 'availability', label: 'Availability' },
    { id: 'gender', label: 'Gender' },
    { id: 'language', label: 'Language' },
  ];

  readonly openFilter = signal<FilterId | null>(null);
  readonly criteria = this.filterStore.criteria;
  readonly allFiltersDraft = signal<TherapistFilterCriteria>(this.cloneCriteria(DEFAULT_FILTER_CRITERIA));
  readonly psychologists = computed(() => filterTherapists(THERAPISTS, this.criteria()));
  readonly activeFilterCount = computed(() => this.countActiveFilters(this.criteria()));
  readonly showLeftShadow = signal(false);
  readonly showRightShadow = signal(true);
  readonly activeSlide = signal(0);
  readonly faqs = THERAPY_FAQS;

  constructor(
    private readonly host: ElementRef<HTMLElement>,
    private readonly injector: Injector,
  ) {
    afterNextRender(() => this.checkShadows(), { injector: this.injector });
  }

  readonly slideDots = computed(() => this.psychologists().map((_, index) => index));
  readonly availableTherapistIds = computed(() => new Set(
    this.psychologists().filter((therapist) => firstAvailableDay(therapist) !== undefined).map((therapist) => therapist.id),
  ));
  readonly resultAnnouncement = computed(() => {
    const count = this.psychologists().length;
    if (count === 0) return 'No psychologists match these filters';
    return `${count} psychologist${count === 1 ? '' : 's'} match these filters`;
  });

  toggleFilter(id: FilterId): void {
    if (this.openFilter() === id) {
      this.closeFilter();
      return;
    }
    if (id === 'all') this.allFiltersDraft.set(this.cloneCriteria(this.criteria()));
    this.openFilter.set(id);
    this.scheduleAfterRender(() => {
      const selector = id === 'all' ? '#all-filter-heading' : `#${id}-filter-options [data-filter-option]`;
      this.host.nativeElement.querySelector<HTMLElement>(selector)?.focus();
    });
  }

  closeFilter(returnFocus = false): void {
    const closing = this.openFilter();
    this.openFilter.set(null);
    if (returnFocus && closing) {
      queueMicrotask(() => this.triggerFor(closing)?.focus());
    }
  }

  selectAvailability(value: TherapistFilterCriteria['availability']): void {
    this.setCriteria({ availability: value });
    this.closeFilter(true);
  }

  toggleGender(value: Gender): void {
    this.setCriteria({ genders: this.toggleValue(this.criteria().genders, value) });
  }

  toggleLanguage(value: string): void {
    this.setCriteria({ languages: this.toggleValue(this.criteria().languages, value) });
  }

  toggleDraftGender(value: Gender): void {
    this.updateDraft({ genders: this.toggleValue(this.allFiltersDraft().genders, value) });
  }

  toggleDraftLanguage(value: string): void {
    this.updateDraft({ languages: this.toggleValue(this.allFiltersDraft().languages, value) });
  }

  setDraftAvailability(value: TherapistFilterCriteria['availability']): void {
    this.updateDraft({ availability: value });
  }

  setDraftNumber(key: NumberCriterion, value: string): void {
    const parsed = Number(value);
    this.updateDraft({ [key]: value === '' || Number.isNaN(parsed) ? null : parsed } as Pick<TherapistFilterCriteria, NumberCriterion>);
  }

  setDraftValue<K extends 'minRating' | 'minExperience' | 'specialty' | 'sessionMode'>(
    key: K,
    value: TherapistFilterCriteria[K],
  ): void {
    this.updateDraft({ [key]: value } as Pick<TherapistFilterCriteria, K>);
  }

  applyAllFilters(): void {
    const next = this.normalizePriceRange(this.cloneCriteria(this.allFiltersDraft()));
    this.allFiltersDraft.set(this.cloneCriteria(next));
    this.setCriteria(next);
    this.closeFilter(true);
  }

  clearDraftFilters(): void {
    this.allFiltersDraft.set(this.cloneCriteria(DEFAULT_FILTER_CRITERIA));
  }

  clearAllFilters(): void {
    const cleared = this.cloneCriteria(DEFAULT_FILTER_CRITERIA);
    this.filterStore.clear();
    this.allFiltersDraft.set(this.cloneCriteria(cleared));
    this.resetCarousel();
  }

  isSelected<T>(values: readonly T[], value: T): boolean {
    return values.includes(value);
  }

  availabilityLabel(): string {
    const value = this.criteria().availability;
    if (value === 'any') return this.dropdownFilters[0].label;
    return this.availabilityOptions.find((option) => option.value === value)?.label ?? this.dropdownFilters[0].label;
  }

  genderLabel(): string {
    return this.selectedLabel(this.criteria().genders, this.dropdownFilters[1].label);
  }

  languageLabel(): string {
    return this.selectedLabel(this.criteria().languages, this.dropdownFilters[2].label);
  }

  hasAvailability(therapist: Parameters<typeof firstAvailableDay>[0]): boolean {
    return this.availableTherapistIds().has(therapist.id);
  }

  scrollToSlide(index: number): void {
    const element = this.carouselRef?.nativeElement;
    if (!element || typeof element.scrollTo !== 'function') return;
    const stride = element.firstElementChild instanceof HTMLElement ? element.firstElementChild.offsetWidth + 24 : CARD_STRIDE;
    element.scrollTo({ left: index * stride, behavior: 'smooth' });
  }

  scrollCarousel(distance: number): void {
    const element = this.carouselRef?.nativeElement;
    if (element && typeof element.scrollBy === 'function') element.scrollBy({ left: distance, behavior: 'smooth' });
  }

  @HostListener('window:resize')
  onResize(): void {
    this.checkShadows();
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const open = this.openFilter();
    if (!open) return;
    const target = event.target as Node | null;
    if (!target) return;
    // Scoped to the popup and its own chip: a click on the hero, a card or the FAQ
    // is outside the filter, even though it is inside this component.
    const popup = this.host.nativeElement.querySelector(open === 'all' ? '#all-filter-panel' : `#${open}-filter-options`);
    const trigger = this.triggerFor(open);
    if (popup?.contains(target) || trigger?.contains(target)) return;
    this.closeFilter();
  }

  @HostListener('document:keydown', ['$event'])
  onDocumentKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape' && this.openFilter()) {
      event.preventDefault();
      this.closeFilter(true);
    }
  }

  onScroll(event: Event): void {
    this.updateShadows(event.target as HTMLElement);
  }

  checkShadows(): void {
    if (this.carouselRef) this.updateShadows(this.carouselRef.nativeElement);
  }

  private setCriteria(change: Partial<TherapistFilterCriteria>): void {
    this.filterStore.update(change);
    this.resetCarousel();
  }

  private updateDraft(change: Partial<TherapistFilterCriteria>): void {
    this.allFiltersDraft.update((current) => ({ ...current, ...change }));
  }

  private resetCarousel(): void {
    this.activeSlide.set(0);
    this.scheduleAfterRender(() => {
      const element = this.carouselRef?.nativeElement;
      if (element && typeof element.scrollTo === 'function') element.scrollTo({ left: 0, behavior: 'auto' });
      this.checkShadows();
    });
  }

  private scheduleAfterRender(callback: () => void): void {
    afterNextRender(callback, { injector: this.injector });
  }

  private selectedLabel(values: readonly string[], fallback: string): string {
    if (values.length === 0) return fallback;
    if (values.length === 1) return values[0] ?? fallback;
    return `${fallback} (${values.length})`;
  }

  private countActiveFilters(criteria: TherapistFilterCriteria): number {
    return (criteria.availability === 'any' ? 0 : 1)
      + criteria.genders.length
      + criteria.languages.length
      + (criteria.priceMin === null ? 0 : 1)
      + (criteria.priceMax === null ? 0 : 1)
      + (criteria.minRating === null ? 0 : 1)
      + (criteria.minExperience === null ? 0 : 1)
      + (criteria.specialty === null ? 0 : 1)
      + (criteria.sessionMode === null ? 0 : 1);
  }

  private cloneCriteria(criteria: TherapistFilterCriteria): TherapistFilterCriteria {
    return { ...criteria, genders: [...criteria.genders], languages: [...criteria.languages] };
  }

  private normalizePriceRange(criteria: TherapistFilterCriteria): TherapistFilterCriteria {
    // Typed prices are clamped into the dataset bounds rather than rejected, so a
    // stray "21" narrows to the cheapest session instead of silently voiding Apply.
    const priceMin = this.clampPrice(criteria.priceMin);
    const priceMax = this.clampPrice(criteria.priceMax);
    const swap = priceMin !== null && priceMax !== null && priceMin > priceMax;
    return {
      ...criteria,
      priceMin: swap ? priceMax : priceMin,
      priceMax: swap ? priceMin : priceMax,
    };
  }

  private clampPrice(value: number | null): number | null {
    if (value === null || !Number.isFinite(value)) return null;
    return Math.min(this.priceBounds.max, Math.max(this.priceBounds.min, value));
  }

  private toggleValue<T>(values: readonly T[], value: T): T[] {
    return values.includes(value) ? values.filter((item) => item !== value) : [...values, value];
  }

  private triggerFor(id: FilterId): HTMLButtonElement | null {
    return this.host.nativeElement.querySelector<HTMLButtonElement>(`#${id}-filter-trigger`);
  }

  private updateShadows(element: HTMLElement): void {
    const scrollLeft = element.scrollLeft;
    const maxScrollLeft = element.scrollWidth - element.clientWidth;
    this.showLeftShadow.set(scrollLeft > 10);
    this.showRightShadow.set(maxScrollLeft > 10 && scrollLeft < maxScrollLeft - 10);
    const stride = element.firstElementChild instanceof HTMLElement ? element.firstElementChild.offsetWidth + 24 : CARD_STRIDE;
    this.activeSlide.set(Math.min(Math.max(this.slideDots().length - 1, 0), Math.round(scrollLeft / stride)));
  }
}
