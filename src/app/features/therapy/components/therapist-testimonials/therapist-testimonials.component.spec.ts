import { ComponentFixture, TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { THERAPISTS } from '@/features/therapy/data/therapist.data';
import { TherapistTestimonialsComponent } from './therapist-testimonials.component';

describe('TherapistTestimonialsComponent', () => {
  let fixture: ComponentFixture<TherapistTestimonialsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [TherapistTestimonialsComponent] }).compileComponents();
    fixture = TestBed.createComponent(TherapistTestimonialsComponent);
    fixture.componentRef.setInput('testimonials', THERAPISTS[0].testimonials);
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

  it('clamps a long quote to a fixed-height card, expands on Show more, and collapses when navigating', () => {
    const root = fixture.nativeElement as HTMLElement;
    const component = fixture.componentInstance;
    const quote = () => root.querySelector('blockquote') as HTMLElement;
    const toggle = () => root.querySelector('button[aria-controls="testimonial-quote"]') as HTMLButtonElement | null;

    // jsdom reports zero layout, so nothing overflows: the control must stay hidden
    // rather than appear on every card.
    expect(component.quoteOverflows()).toBe(false);
    expect(toggle()).toBeNull();
    // Collapsed cards are a fixed height for every testimonial; only expanding
    // is allowed to change it.
    const card = () => root.querySelector('.testimonial-card') as HTMLElement;
    expect(card().classList.contains('h-72')).toBe(true);
    expect(card().classList.contains('min-h-72')).toBe(false);
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
    expect(card().classList.contains('h-72')).toBe(true);
    expect(quote().classList.contains('line-clamp-4')).toBe(true);
    expect(toggle()).toBeNull();
  });
});
