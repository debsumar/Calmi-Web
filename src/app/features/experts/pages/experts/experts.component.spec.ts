// @vitest-environment jsdom
import { provideRouter } from '@angular/router';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import {
  LucideChevronDown,
  LucideChevronLeft,
  LucideChevronRight,
  LucideFunnel,
  LucideSearch,
  LucideStar,
  provideLucideIcons,
} from '@lucide/angular';
import { beforeEach, describe, expect, it } from 'vitest';
import { DEFAULT_FILTER_CRITERIA, filterExperts, EXPERTS } from '@/features/experts/data/expert.data';

import { EXPERT_FILTER_STORAGE_KEY } from '@/features/experts/services/expert-filter.store';
import { ExpertsComponent } from './experts.component';

describe('ExpertsComponent', () => {
  let fixture: ComponentFixture<ExpertsComponent>;

  beforeEach(async () => {
    sessionStorage.clear();
    await TestBed.configureTestingModule({
      imports: [ExpertsComponent],
      providers: [
        provideRouter([]),
        provideLucideIcons(LucideFunnel, LucideChevronDown, LucideChevronLeft, LucideChevronRight, LucideStar, LucideSearch),
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(ExpertsComponent);
    fixture.detectChanges();
  });

  it('keeps extracted Experts FAQ rendered with all original entries', () => {
    const faq = (fixture.nativeElement as HTMLElement).querySelector('app-faq-accordion');
    expect(faq).not.toBeNull();
    expect(faq?.textContent).toContain('Frequently Asked Questions');
    expect(faq?.querySelectorAll('button[aria-controls]')).toHaveLength(5);
  });

  it('renders geometry for every dynamic icon in Experts template', () => {
    const icons = (fixture.nativeElement as HTMLElement).querySelectorAll('svg');
    expect(icons.length).toBeGreaterThan(0);
    icons.forEach((icon) => expect(icon.querySelector('path, line, circle, polyline, rect')).not.toBeNull());
  });

  it('filters, renders empty gender state, and clear restores full list', () => {
    const component = fixture.componentInstance;
    const root = fixture.nativeElement as HTMLElement;
    component.toggleGender('female');
    fixture.detectChanges();

    expect(component.psychologists()).toHaveLength(EXPERTS.length);
    expect(component.psychologists().every((expert) => expert.gender === 'female')).toBe(true);
    expect(root.querySelector('#all-filter-trigger')?.textContent).toContain('1');

    component.clearAllFilters();
    component.toggleGender('non-binary');
    fixture.detectChanges();
    expect(component.psychologists()).toEqual([]);
    expect(root.textContent).toContain('No experts match these filters');

    component.clearAllFilters();
    fixture.detectChanges();
    expect(component.psychologists()).toHaveLength(EXPERTS.length);
    expect(root.querySelector('#all-filter-trigger')?.textContent).not.toContain('1');
  });

  it('applies all-filter numeric and categorical criteria without sharing draft arrays', () => {
    const component = fixture.componentInstance;
    component.toggleFilter('all');
    component.setDraftNumber('priceMin', '1500');
    component.setDraftNumber('priceMax', '2000');
    component.setDraftValue('minExperience', 4);
    component.setDraftValue('specialty', 'Relationships');
    component.setDraftValue('sessionMode', 'Video');
    component.applyAllFilters();
    fixture.detectChanges();

    expect(component.psychologists().map((expert) => expert.id)).toEqual(['heena-pahuja', 'rini-rao']);
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
    component.toggleFilter('all');
    component.setDraftValue('sessionMode', 'Audio');
    component.applyAllFilters();
    fixture.detectChanges();

    expect(component.activeSlide()).toBe(0);
    expect(component.psychologists().map((expert) => expert.id)).toEqual(['gargi-yadav', 'yukta-bansal']);
    expect((fixture.nativeElement as HTMLElement).querySelectorAll('[aria-label^="Go to slide"]')).toHaveLength(component.psychologists().length);
    expect(component.psychologists().length).toBeLessThan(EXPERTS.length);
  });

  it('renders carousel by default with a permanent expert search', () => {
    const root = fixture.nativeElement as HTMLElement;

    expect(root.querySelector('#top-psychologists > .relative > [appDragScroll]')).not.toBeNull();
    expect(root.querySelector('input[type="search"]')).not.toBeNull();
    expect(root.querySelector<HTMLButtonElement>('[aria-pressed="false"]')?.textContent).toContain('View all');
  });

  it('sorts experts alphabetically by name, ignoring honorifics', () => {
    const component = fixture.componentInstance;
    const root = fixture.nativeElement as HTMLElement;
    const key = (name: string) => name.replace(/^(dr|mr|mrs|ms)\.?\s+/i, '');
    const expected = EXPERTS.map((expert) => expert.name)
      .sort((a, b) => key(a).localeCompare(key(b), 'en', { sensitivity: 'base' }));

    expect(component.psychologists().map((expert) => expert.name)).toEqual(expected);
    expect(expected[0]).toBe('Anisha Gugale');
    // Dr. Chandana Reddy sorts under "C", not "D".
    expect(expected.indexOf('Dr. Chandana Reddy')).toBeLessThan(expected.indexOf('Divyanshi Tolani'));
    const carouselCards = root.querySelectorAll('[appDragScroll] app-psychologist-card');
    expect(carouselCards).toHaveLength(EXPERTS.length);
    expect(carouselCards[0]?.textContent).toContain('Anisha Gugale');
  });

  it('filters the carousel by search and keeps dots aligned with visible experts', () => {
    const component = fixture.componentInstance;
    const root = fixture.nativeElement as HTMLElement;
    const search = root.querySelector<HTMLInputElement>('input[type="search"]')!;
    search.value = 'Punjabi';
    search.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    const expectedIds = component.psychologists()
      .filter((expert) => expert.languages.includes('Punjabi'))
      .map((expert) => expert.id);
    expect(expectedIds).toEqual(['manheer-kaur', 'pavneet-kaur']);
    expect(component.visiblePsychologists().map((expert) => expert.id)).toEqual(expectedIds);
    expect(root.querySelectorAll('[appDragScroll] app-psychologist-card')).toHaveLength(expectedIds.length);
    expect(root.querySelectorAll('[aria-label^="Go to slide"]')).toHaveLength(expectedIds.length);
    expect(root.querySelector('[aria-live="polite"]')?.textContent?.trim()).toBe('2 experts match these filters');
  });

  it('shows no-match message in carousel mode when search finds nothing', () => {
    const component = fixture.componentInstance;
    const root = fixture.nativeElement as HTMLElement;
    component.setSearchQuery('zzz-no-such-expert');
    fixture.detectChanges();

    expect(component.visiblePsychologists()).toEqual([]);
    expect(root.querySelector('[appDragScroll]')).toBeNull();
    expect(root.textContent).toContain('No experts match your search');
    expect(root.querySelector('input[type="search"]')).not.toBeNull();
  });

  it('shows searchable expert grid and hides carousel controls when View all is clicked', () => {
    const root = fixture.nativeElement as HTMLElement;
    const viewAll = Array.from(root.querySelectorAll<HTMLButtonElement>('button')).find((button) => button.textContent?.trim() === 'View all')!;
    viewAll.click();
    fixture.detectChanges();

    expect(root.querySelector('input[type="search"]')).not.toBeNull();
    expect(root.querySelector('.grid.grid-cols-1')).not.toBeNull();
    expect(root.querySelector('#top-psychologists > .relative > [appDragScroll]')).toBeNull();
    expect(root.querySelector('[aria-label="Previous experts"]')).toBeNull();
    expect(root.querySelector('[aria-label="Next experts"]')).toBeNull();
    expect(root.querySelector('[aria-label="Expert carousel pagination"]')).toBeNull();
  });

  it('announces search-filtered expert count in View all mode', () => {
    const component = fixture.componentInstance;
    const root = fixture.nativeElement as HTMLElement;

    component.toggleViewAll();
    component.setSearchQuery(EXPERTS[0]!.name);
    fixture.detectChanges();

    expect(root.querySelector('[aria-live="polite"]')?.textContent?.trim()).toBe('1 expert match these filters');
  });

  it('filters expert grid by name and keeps search across Show less', () => {
    const component = fixture.componentInstance;
    const root = fixture.nativeElement as HTMLElement;
    Array.from(root.querySelectorAll<HTMLButtonElement>('button')).find((button) => button.textContent?.trim() === 'View all')!.click();
    fixture.detectChanges();

    const search = root.querySelector<HTMLInputElement>('input[type="search"]')!;
    search.value = EXPERTS[0]!.name;
    search.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    const grid = root.querySelector<HTMLElement>('.grid.grid-cols-1')!;

    expect(component.visiblePsychologists()).toEqual([EXPERTS[0]]);
    expect(grid.querySelectorAll('app-psychologist-card')).toHaveLength(1);

    Array.from(root.querySelectorAll<HTMLButtonElement>('button')).find((button) => button.textContent?.trim() === 'Show less')!.click();
    fixture.detectChanges();

    expect(component.searchQuery()).toBe(EXPERTS[0]!.name);
    expect(root.querySelector('#top-psychologists > .relative > [appDragScroll]')).not.toBeNull();
    expect(root.querySelectorAll('[appDragScroll] app-psychologist-card')).toHaveLength(1);
    expect(root.querySelector('input[type="search"]')).not.toBeNull();
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
    component.setDraftValue('sessionMode', 'Audio');
    component.applyAllFilters();
    fixture.detectChanges();

    expect(component.criteria().priceMin).toBe(component.priceBounds.min);
    expect(component.criteria().priceMax).toBe(component.priceBounds.max);
    // The rest of the applied criteria survived the out-of-range entry.
    expect(component.criteria().sessionMode).toBe('Audio');
    expect(component.psychologists().map((expert) => expert.id)).toEqual(['gargi-yadav', 'yukta-bansal']);
    expect(component.psychologists().every((expert) => expert.sessionModes.includes('Audio'))).toBe(true);
  });

  it('renders empty state instead of an empty carousel', () => {
    const component = fixture.componentInstance;
    component.setDraftValue('minRating', 4.9);
    component.setDraftValue('specialty', 'Addiction');
    component.applyAllFilters();
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;

    expect(root.textContent).toContain('No experts match these filters');
    expect(root.querySelector('#top-psychologists > .relative > [appDragScroll]')).toBeNull();
    expect(root.querySelector('[aria-label="Expert carousel pagination"]')).toBeNull();
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
    expect(component.psychologists().map((expert) => expert.id)).toEqual(
      filterExperts(EXPERTS, { ...DEFAULT_FILTER_CRITERIA, availability: 'week' }).map((expert) => expert.id).sort(),
    );
    expect(document.activeElement).toBe(availabilityTrigger);

    component.toggleFilter('availability');
    component.selectAvailability('weekend');
    fixture.detectChanges();
    expect(component.criteria().availability).toBe('weekend');
    expect(component.psychologists().length).toBeGreaterThan(0);

    component.clearAllFilters();
    component.toggleLanguage('Punjabi');
    component.toggleLanguage('Kannada');
    fixture.detectChanges();
    expect(component.psychologists().map((expert) => expert.id)).toEqual(['chandana-reddy', 'manheer-kaur', 'pavneet-kaur']);
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

    component.setDraftNumber('priceMin', String(component.priceBounds.max + 1000));
    component.setDraftNumber('priceMax', '900');
    component.applyAllFilters();
    expect(component.criteria().priceMin).toBe(900);
    expect(component.criteria().priceMax).toBe(component.priceBounds.max);
  });

  it('restores applied themed select labels when reopening all filters', () => {
    const component = fixture.componentInstance;
    component.toggleFilter('all');
    component.setDraftValue('minRating', 4.9);
    component.setDraftValue('minExperience', 3);
    component.setDraftValue('specialty', 'Relationships');
    component.setDraftValue('sessionMode', 'Video');
    component.applyAllFilters();
    component.toggleFilter('all');
    fixture.detectChanges();

    const labels = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('app-select-menu button'))
      .map((trigger) => trigger.textContent?.trim());
    expect(labels).toEqual(expect.arrayContaining(['4.9+', '3+ years', 'Relationships', 'Video']));
    expect(component.activeFilterCount()).toBe(4);
  });

  it('persists applied criteria through a new root injector and clears stored criteria', async () => {
    const component = fixture.componentInstance;
    component.toggleFilter('all');
    component.setDraftValue('minRating', 4.9);
    component.setDraftValue('minExperience', 3);
    component.setDraftValue('specialty', 'Relationships');
    component.setDraftValue('sessionMode', 'Video');
    component.applyAllFilters();

    expect(sessionStorage.getItem(EXPERT_FILTER_STORAGE_KEY)).toContain('Relationships');
    fixture.destroy();
    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      imports: [ExpertsComponent],
      providers: [
        provideRouter([]),
        provideLucideIcons(LucideFunnel, LucideChevronDown, LucideChevronLeft, LucideChevronRight, LucideStar, LucideSearch),
      ],
    }).compileComponents();
    const freshFixture = TestBed.createComponent(ExpertsComponent);
    freshFixture.detectChanges();
    const fresh = freshFixture.componentInstance;
    expect(fresh.criteria()).toMatchObject({ minRating: 4.9, minExperience: 3, specialty: 'Relationships', sessionMode: 'Video' });
    expect(fresh.activeFilterCount()).toBe(4);

    fresh.toggleFilter('all');
    freshFixture.detectChanges();
    const labels = Array.from((freshFixture.nativeElement as HTMLElement).querySelectorAll('app-select-menu > button'))
      .map((trigger) => trigger.textContent?.trim());
    expect(labels).toEqual(expect.arrayContaining(['4.9+', '3+ years', 'Relationships', 'Video']));

    fresh.clearAllFilters();
    expect(fresh.criteria()).toEqual(DEFAULT_FILTER_CRITERIA);
    expect(sessionStorage.getItem(EXPERT_FILTER_STORAGE_KEY)).toBeNull();
    freshFixture.destroy();
  });

  it('keeps all-filters dialog and unapplied draft open when a nested select receives Escape', () => {
    const component = fixture.componentInstance;
    component.toggleFilter('all');
    component.setDraftValue('specialty', 'Relationships');
    fixture.detectChanges();

    const selectTrigger = (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>('app-select-menu > button')!;
    selectTrigger.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    fixture.detectChanges();
    selectTrigger.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    fixture.detectChanges();

    expect(component.openFilter()).toBe('all');
    expect(component.allFiltersDraft().specialty).toBe('Relationships');
  });

  it('uses semantic color utilities without forbidden color literals', () => {
    const rendered = (fixture.nativeElement as HTMLElement).innerHTML;
    expect(rendered).toMatch(/bg-canvas/);
    expect(rendered).toMatch(/bg-surface/);
    expect(rendered).toMatch(/focus-visible:ring-2/);
    expect(rendered).not.toMatch(/#[0-9a-f]{3,8}|rgba?\(|hsl\(|(?:bg|text|border)-\[[^\]]+\]|(?:bg|text|border)-(?:gray|white|black)(?:-|[\"'\s])/i);
  });
});
