import { ComponentFixture, TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { EXPERTS } from '@/features/experts/data/expert.data';
import { ExpertTestimonialsComponent } from './expert-testimonials.component';

describe('ExpertTestimonialsComponent', () => {
  let fixture: ComponentFixture<ExpertTestimonialsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [ExpertTestimonialsComponent] }).compileComponents();
    fixture = TestBed.createComponent(ExpertTestimonialsComponent);
    fixture.componentRef.setInput('testimonials', EXPERTS[0].testimonials);
    fixture.detectChanges();
  });

  it('cycles one testimonial at a time with an accessible next action', () => {
    const root = fixture.nativeElement as HTMLElement;
    const firstQuote = root.querySelector('blockquote')?.textContent;
    const button = root.querySelector('button[aria-label="Show next testimonial"]') as HTMLButtonElement;
    expect(firstQuote).toContain('was a turning point for me');
    expect(root.querySelector('[aria-live="polite"]')).not.toBeNull();
    const icons = root.querySelectorAll('svg[lucideStar], svg[lucideArrowRight], svg[lucideArrowLeft], svg[lucideMessageSquareQuote]');
    expect(icons.length).toBe(8);
    icons.forEach((icon) => {
      expect(icon.getAttribute('aria-hidden')).toBe('true');
      expect(icon.querySelector('path, line, circle, polyline, rect')).not.toBeNull();
    });
    button.click();
    fixture.detectChanges();
    expect(root.querySelector('blockquote')?.textContent).not.toBe(firstQuote);
  });

  it('animates forward and backward with a direction-aware stacked slide', () => {    const root = fixture.nativeElement as HTMLElement;
    const component = fixture.componentInstance;
    const next = root.querySelector('button[aria-label="Show next testimonial"]') as HTMLButtonElement;
    const previous = root.querySelector('button[aria-label="Show previous testimonial"]') as HTMLButtonElement;

    next.click();
    fixture.detectChanges();
    expect(component.direction()).toBe('next');
    expect(root.querySelector('.testimonial-card[data-direction="next"]')).not.toBeNull();

    previous.click();
    fixture.detectChanges();
    expect(component.direction()).toBe('prev');
    expect(root.querySelector('.testimonial-card[data-direction="prev"]')).not.toBeNull();
    expect(component.index()).toBe(0);
  });

  it('clamps a long quote to a min-height card, expands on Show more, and collapses when navigating', () => {
    const root = fixture.nativeElement as HTMLElement;
    const component = fixture.componentInstance;
    const quote = () => root.querySelector('blockquote') as HTMLElement;
    const toggle = () => root.querySelector('button[aria-controls="testimonial-quote"]') as HTMLButtonElement | null;

    // jsdom reports zero layout, so nothing overflows: the control must stay hidden
    // rather than appear on every card.
    expect(component.quoteOverflows()).toBe(false);
    expect(toggle()).toBeNull();
    // The card height is a floor in both states: collapsed cards line up, but a
    // quote that needs more room grows instead of being clipped.
    const card = () => root.querySelector('.testimonial-card') as HTMLElement;
    expect(card().classList.contains('min-h-72')).toBe(true);
    expect(card().classList.contains('h-72')).toBe(false);
    expect(quote().classList.contains('line-clamp-4')).toBe(true);

    // Simulate a quote the clamp actually truncates.
    component.quoteOverflows.set(true);
    fixture.detectChanges();
    expect(toggle()?.textContent?.trim()).toBe('Show more');
    expect(toggle()?.getAttribute('aria-expanded')).toBe('false');

    toggle()?.click();
    fixture.detectChanges();
    expect(component.expanded()).toBe(true);
    expect(card().classList.contains('h-72')).toBe(false);
    expect(card().classList.contains('min-h-72')).toBe(true);
    expect(quote().classList.contains('line-clamp-4')).toBe(false);
    expect(toggle()?.textContent?.trim()).toBe('Show less');

    (root.querySelector('button[aria-label="Show next testimonial"]') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(component.expanded()).toBe(false);
    expect(component.quoteOverflows()).toBe(false);
    expect(card().classList.contains('min-h-72')).toBe(true);
    expect(quote().classList.contains('line-clamp-4')).toBe(true);
    expect(toggle()).toBeNull();
  });

  it('renders nothing, without throwing, when there are no testimonials', () => {
    fixture.componentRef.setInput('testimonials', []);
    expect(() => fixture.detectChanges()).not.toThrow();

    const root = fixture.nativeElement as HTMLElement;
    expect(root.querySelector('section')).toBeNull();
    expect(root.querySelector('blockquote')).toBeNull();
    expect(fixture.componentInstance.testimonial()).toBeUndefined();
  });

  it('restarts at the first card, collapsed, when the testimonials change', () => {
    const component = fixture.componentInstance;
    component.next();
    component.toggleExpanded();
    expect(component.index()).toBe(1);

    fixture.componentRef.setInput('testimonials', [...EXPERTS[1].testimonials]);
    fixture.detectChanges();

    expect(component.index()).toBe(0);
    expect(component.expanded()).toBe(false);
  });

  it('recovers when an empty list is replaced by real testimonials', () => {
    fixture.componentRef.setInput('testimonials', []);
    fixture.detectChanges();
    fixture.componentRef.setInput('testimonials', EXPERTS[0].testimonials);
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).querySelector('blockquote')).not.toBeNull();
  });

  it('exposes the rating as an image with a label and rounds fractional ratings to whole stars', () => {
    const base = EXPERTS[0].testimonials[0];
    fixture.componentRef.setInput('testimonials', [{ ...base, rating: 4.8 }]);
    fixture.detectChanges();

    const root = fixture.nativeElement as HTMLElement;
    const stars = root.querySelector('[role="img"][aria-label^="Rating"]');
    expect(stars?.getAttribute('aria-label')).toBe('Rating 4.8 out of 5');
    expect(stars?.querySelectorAll('svg.fill-current')).toHaveLength(5);
    expect(root.textContent).toContain('4.8/5');

    fixture.componentRef.setInput('testimonials', [{ ...base, rating: 4.4 }]);
    fixture.detectChanges();
    expect(root.querySelectorAll('[role="img"][aria-label^="Rating"] svg.fill-current')).toHaveLength(4);
  });
});
