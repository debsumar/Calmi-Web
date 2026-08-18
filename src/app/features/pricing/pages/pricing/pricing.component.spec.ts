import { ComponentFixture, TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';
import {
  provideLucideIcons,
  LucideHeart, LucideCalendarDays, LucideBadgePercent,
  LucideLeaf, LucideGraduationCap, LucideSparkles, LucideCircleCheck,
} from '@lucide/angular';
import { PricingComponent } from './pricing.component';

describe('PricingComponent', () => {
  let fixture: ComponentFixture<PricingComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PricingComponent],
      // Mirrors appConfig: an unregistered dynamic icon throws mid-render and
      // aborts the rest of the template, including entrance animation setup.
      providers: [
        provideLucideIcons(
          LucideHeart, LucideCalendarDays, LucideBadgePercent,
          LucideLeaf, LucideGraduationCap, LucideSparkles, LucideCircleCheck,
        ),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(PricingComponent);
    fixture.detectChanges();
  });

  it('renders every billing control icon without an unresolved-icon error', () => {
    const icons = fixture.nativeElement.querySelectorAll('svg');

    expect(icons.length).toBeGreaterThan(0);
    expect(fixture.nativeElement.querySelectorAll('button[aria-pressed]').length).toBe(2);
    expect(fixture.nativeElement.textContent).toContain('Monthly');
    expect(fixture.nativeElement.textContent).toContain('Annually');
  });

  it('applies the staggered entrance animation to header and plan cards', () => {
    const animated = fixture.nativeElement.querySelectorAll('[appAnimateOnScroll]');

    expect(animated.length).toBe(7);
    expect(fixture.nativeElement.querySelectorAll('.stagger-enter').length).toBe(7);
  });

  it('shows monthly prices and pressed state by default', () => {
    const component = fixture.componentInstance;
    const buttons = fixture.nativeElement.querySelectorAll('button[aria-pressed]');

    expect(component.displayedPlans()[1].value).toBe('₹99');
    expect(component.displayedPlans()[2].value).toBe('₹249');
    expect(fixture.nativeElement.textContent).toContain('₹99');
    expect(fixture.nativeElement.textContent).toContain('₹249');
    expect(buttons[0].getAttribute('aria-pressed')).toBe('true');
    expect(buttons[1].getAttribute('aria-pressed')).toBe('false');
  });

  it('shows explicit annual prices and updates aria-pressed state', () => {
    const annualButton = fixture.nativeElement.querySelectorAll('button[aria-pressed]')[1] as HTMLButtonElement;

    annualButton.click();
    fixture.detectChanges();

    const component = fixture.componentInstance;
    expect(component.displayedPlans()[1].value).toBe('₹999');
    expect(component.displayedPlans()[1].period).toBe('year');
    expect(component.displayedPlans()[2].value).toBe('₹2,399');
    expect(component.displayedPlans()[2].period).toBe('year');
    expect(fixture.nativeElement.textContent).toContain('₹999');
    expect(fixture.nativeElement.textContent).toContain('₹2,399');
    expect(fixture.nativeElement.textContent).toContain('₹2,399 per year');
    expect(annualButton.getAttribute('aria-pressed')).toBe('true');
    expect(fixture.nativeElement.querySelectorAll('button[aria-pressed]')[0].getAttribute('aria-pressed')).toBe('false');
  });
});
