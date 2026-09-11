// @vitest-environment jsdom
import { provideRouter } from '@angular/router';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import {
  LucideChevronDown,
  LucideChevronLeft,
  LucideChevronRight,
  LucideFunnel,
  LucideStar,
  provideLucideIcons,
} from '@lucide/angular';
import { beforeEach, describe, expect, it } from 'vitest';
import { DEFAULT_FILTER_CRITERIA, THERAPISTS } from '@/features/therapy/data/therapist.data';
import { THERAPIST_FILTER_STORAGE_KEY } from '@/features/therapy/services/therapist-filter.store';
import { TherapyComponent } from './therapy.component';

describe('TherapyComponent', () => {
  let fixture: ComponentFixture<TherapyComponent>;

  beforeEach(async () => {
    sessionStorage.clear();
    await TestBed.configureTestingModule({
      imports: [TherapyComponent],
      providers: [
        provideRouter([]),
        provideLucideIcons(LucideFunnel, LucideChevronDown, LucideChevronLeft, LucideChevronRight, LucideStar),
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(TherapyComponent);
    fixture.detectChanges();
  });

  it('keeps extracted Therapy FAQ rendered with all original entries', () => {
    const faq = (fixture.nativeElement as HTMLElement).querySelector('app-faq-accordion');
    expect(faq).not.toBeNull();
    expect(faq?.textContent).toContain('Frequently Asked Questions');
    expect(faq?.querySelectorAll('button[aria-controls]')).toHaveLength(5);
  });

  it('renders geometry for every dynamic icon in Therapy template', () => {
    const icons = (fixture.nativeElement as HTMLElement).querySelectorAll('svg');
    expect(icons.length).toBeGreaterThan(0);
    icons.forEach((icon) => expect(icon.querySelector('path, line, circle, polyline, rect')).not.toBeNull());
  });

  it('filters, shows active count, and clear restores full list', () => {
    const component = fixture.componentInstance;
    component.toggleGender('non-binary');
    fixture.detectChanges();

    expect(component.psychologists().every((therapist) => therapist.gender === 'non-binary')).toBe(true);
    expect((fixture.nativeElement as HTMLElement).querySelector('#all-filter-trigger')?.textContent).toContain('1');

    component.clearAllFilters();
    fixture.detectChanges();
    expect(component.psychologists()).toHaveLength(THERAPISTS.length);
    expect((fixture.nativeElement as HTMLElement).querySelector('#all-filter-trigger')?.textContent).not.toContain('1');
  });

  it('applies all-filter numeric and categorical criteria without sharing draft arrays', () => {
    const component = fixture.componentInstance;
    component.toggleFilter('all');
    component.setDraftNumber('priceMin', '1500');
    component.setDraftNumber('priceMax', '2000');
    component.setDraftValue('minExperience', 4);
    component.setDraftValue('specialty', 'Burnout');
    component.setDraftValue('sessionMode', 'Chat');
    component.applyAllFilters();
    fixture.detectChanges();

    expect(component.psychologists().map((therapist) => therapist.id)).toEqual(['rahul-menon']);
    component.toggleFilter('all');
    component.toggleDraftGender('female');
    component.applyAllFilters();
    component.toggleFilter('all');
    component.toggleDraftGender('male');

    expect(component.criteria().genders).toEqual(['female']);
    expect(component.allFiltersDraft().genders).toEqual(['female', 'male']);
  });

  it('keeps dots aligned with filtered list and resets active slide', () => {
    const component = fixture.componentInstance;
    component.activeSlide.set(2);
    component.toggleGender('non-binary');
    fixture.detectChanges();

    expect(component.activeSlide()).toBe(0);
    expect((fixture.nativeElement as HTMLElement).querySelectorAll('[aria-label^="Go to slide"]')).toHaveLength(component.psychologists().length);
  });

  it('closes an open dropdown on outside click', () => {
    const component = fixture.componentInstance;
    component.toggleFilter('gender');
    fixture.detectChanges();
    document.body.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    fixture.detectChanges();

    expect(component.openFilter()).toBeNull();
  });

  it('closes the popup when clicking page content inside the component', () => {
    const component = fixture.componentInstance;
    const root = fixture.nativeElement as HTMLElement;

    component.toggleFilter('all');
    fixture.detectChanges();
    expect(root.querySelector('#all-filter-panel')).not.toBeNull();

    // A heading inside the same component is still outside the filter popup.
    root.querySelector<HTMLElement>('#top-psychologists h2')!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    fixture.detectChanges();
    expect(component.openFilter()).toBeNull();

    // Clicks inside the popup must not dismiss it.
    component.toggleFilter('all');
    fixture.detectChanges();
    root.querySelector<HTMLElement>('#all-filter-heading')!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    fixture.detectChanges();
    expect(component.openFilter()).toBe('all');
  });

  it('clamps out-of-range prices on apply instead of voiding the filter', () => {
    const component = fixture.componentInstance;
    component.toggleFilter('all');
    component.setDraftNumber('priceMin', '21');
    component.setDraftNumber('priceMax', '999999');
    component.setDraftValue('sessionMode', 'Chat');
    component.applyAllFilters();
    fixture.detectChanges();

    expect(component.criteria().priceMin).toBe(component.priceBounds.min);
    expect(component.criteria().priceMax).toBe(component.priceBounds.max);
    // The rest of the applied criteria survived the out-of-range entry.
    expect(component.criteria().sessionMode).toBe('Chat');
    expect(component.psychologists().length).toBeGreaterThan(0);
    expect(component.psychologists().every((therapist) => therapist.sessionModes.includes('Chat'))).toBe(true);
  });

  it('renders empty state instead of an empty carousel', () => {
    const component = fixture.componentInstance;
    component.setDraftValue('minRating', 4.9);
    component.setDraftValue('specialty', 'Burnout');
    component.applyAllFilters();
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;

    expect(root.textContent).toContain('No psychologists match these filters');
    expect(root.querySelector('[appDragScroll]')).toBeNull();
    expect(root.querySelector('[aria-label="Psychologist carousel pagination"]')).toBeNull();
  });

  it('toggles aria-expanded and Escape closes popup then restores chip focus', async () => {
    const root = fixture.nativeElement as HTMLElement;
    const trigger = root.querySelector<HTMLButtonElement>('#language-filter-trigger')!;
    trigger.focus();
    trigger.click();
    fixture.detectChanges();

    expect(trigger.getAttribute('aria-expanded')).toBe('true');
    expect(trigger.getAttribute('aria-haspopup')).toBeNull();
    expect(root.querySelector('#language-filter-options')?.getAttribute('role')).toBe('group');

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    fixture.detectChanges();
    await Promise.resolve();

    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    expect(document.activeElement).toBe(trigger);
  });

  it('selects availability modes, uses language OR logic, and restores chip focus', async () => {
    const component = fixture.componentInstance;
    const root = fixture.nativeElement as HTMLElement;
    const availabilityTrigger = root.querySelector<HTMLButtonElement>('#availability-filter-trigger')!;
    availabilityTrigger.focus();

    component.toggleFilter('availability');
    fixture.detectChanges();
    component.selectAvailability('week');
    fixture.detectChanges();
    await Promise.resolve();
    expect(component.criteria().availability).toBe('week');
    expect(component.psychologists().length).toBeLessThan(THERAPISTS.length);
    expect(document.activeElement).toBe(availabilityTrigger);

    component.toggleFilter('availability');
    component.selectAvailability('weekend');
    fixture.detectChanges();
    expect(component.criteria().availability).toBe('weekend');
    expect(component.psychologists().length).toBeGreaterThan(0);

    component.clearAllFilters();
    component.toggleLanguage('Bengali');
    component.toggleLanguage('Kannada');
    fixture.detectChanges();
    expect(component.psychologists().every((therapist) => therapist.languages.includes('Bengali') || therapist.languages.includes('Kannada'))).toBe(true);
  });

  it('keeps all-filter edits as draft until Apply and normalizes price ranges', () => {
    const component = fixture.componentInstance;
    component.toggleGender('female');
    component.toggleFilter('all');
    component.setDraftNumber('priceMin', '');
    expect(component.allFiltersDraft().priceMin).toBeNull();

    component.setDraftNumber('priceMin', '3000');
    component.setDraftNumber('priceMax', '900');
    component.clearDraftFilters();
    expect(component.criteria().genders).toEqual(['female']);
    expect(component.allFiltersDraft()).toEqual(DEFAULT_FILTER_CRITERIA);

    component.setDraftNumber('priceMin', '3000');
    component.setDraftNumber('priceMax', '900');
    component.applyAllFilters();
    expect(component.criteria().priceMin).toBe(900);
    expect(component.criteria().priceMax).toBe(3000);
  });

  it('restores applied themed select labels when reopening all filters', () => {
    const component = fixture.componentInstance;
    component.toggleFilter('all');
    component.setDraftValue('minRating', 4.8);
    component.setDraftValue('minExperience', 3);
    component.setDraftValue('specialty', 'Burnout');
    component.setDraftValue('sessionMode', 'Chat');
    component.applyAllFilters();
    component.toggleFilter('all');
    fixture.detectChanges();

    const labels = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('app-select-menu button'))
      .map((trigger) => trigger.textContent?.trim());
    expect(labels).toEqual(expect.arrayContaining(['4.8+', '3+ years', 'Burnout', 'Chat']));
    expect(component.activeFilterCount()).toBe(4);
  });

  it('persists applied criteria through a new root injector and clears stored criteria', async () => {
    const component = fixture.componentInstance;
    component.toggleFilter('all');
    component.setDraftValue('minRating', 4.8);
    component.setDraftValue('minExperience', 3);
    component.setDraftValue('specialty', 'Burnout');
    component.setDraftValue('sessionMode', 'Chat');
    component.applyAllFilters();

    expect(sessionStorage.getItem(THERAPIST_FILTER_STORAGE_KEY)).toContain('Burnout');
    fixture.destroy();
    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      imports: [TherapyComponent],
      providers: [
        provideRouter([]),
        provideLucideIcons(LucideFunnel, LucideChevronDown, LucideChevronLeft, LucideChevronRight, LucideStar),
      ],
    }).compileComponents();
    const freshFixture = TestBed.createComponent(TherapyComponent);
    freshFixture.detectChanges();
    const fresh = freshFixture.componentInstance;
    expect(fresh.criteria()).toMatchObject({ minRating: 4.8, minExperience: 3, specialty: 'Burnout', sessionMode: 'Chat' });
    expect(fresh.activeFilterCount()).toBe(4);

    fresh.toggleFilter('all');
    freshFixture.detectChanges();
    const labels = Array.from((freshFixture.nativeElement as HTMLElement).querySelectorAll('app-select-menu > button'))
      .map((trigger) => trigger.textContent?.trim());
    expect(labels).toEqual(expect.arrayContaining(['4.8+', '3+ years', 'Burnout', 'Chat']));

    fresh.clearAllFilters();
    expect(fresh.criteria()).toEqual(DEFAULT_FILTER_CRITERIA);
    expect(sessionStorage.getItem(THERAPIST_FILTER_STORAGE_KEY)).toBeNull();
    freshFixture.destroy();
  });

  it('keeps all-filters dialog and unapplied draft open when a nested select receives Escape', () => {
    const component = fixture.componentInstance;
    component.toggleFilter('all');
    component.setDraftValue('specialty', 'Burnout');
    fixture.detectChanges();

    const selectTrigger = (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>('app-select-menu > button')!;
    selectTrigger.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    fixture.detectChanges();
    selectTrigger.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    fixture.detectChanges();

    expect(component.openFilter()).toBe('all');
    expect(component.allFiltersDraft().specialty).toBe('Burnout');
  });

  it('uses semantic color utilities without forbidden color literals', () => {
    const rendered = (fixture.nativeElement as HTMLElement).innerHTML;
    expect(rendered).toMatch(/bg-canvas/);
    expect(rendered).toMatch(/bg-surface/);
    expect(rendered).toMatch(/focus-visible:ring-2/);
    expect(rendered).not.toMatch(/#[0-9a-f]{3,8}|rgba?\(|hsl\(|(?:bg|text|border)-\[[^\]]+\]|(?:bg|text|border)-(?:gray|white|black)(?:-|[\"'\s])/i);
  });
});
