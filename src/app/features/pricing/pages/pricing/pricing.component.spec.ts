import { Component, input, output } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  provideLucideIcons,
  LucideHeart, LucideCalendarDays, LucideBadgePercent,
  LucideLeaf, LucideGraduationCap, LucideSparkles, LucideCircleCheck, LucideArrowRight,
  LucideDynamicIcon,
} from '@lucide/angular';

import { PricingComponent, annualSavingsPercent, parsePrice } from './pricing.component';
import { AnimateOnScrollDirective } from '@/shared/directives/animate-on-scroll.directive';
import { PrimaryButtonComponent } from '@/shared/components/primary-button/primary-button.component';
import { StudentVerificationResult, StudentVerificationRequest } from '@/features/student-verification/models/student-verification.model';
import { StudentVerificationService } from '@/features/student-verification/services/student-verification.service';
import { FIXTURE_CHECK_DELAY_MS } from '@/features/student-verification/services/student-verification.fixtures';

@Component({
  selector: 'app-student-verification-dialog',
  template: '',
})
class StudentVerificationDialogStubComponent {
  open = input(false);
  closed = output<void>();
  verified = output<StudentVerificationResult>();
}

describe('PricingComponent', () => {
  let fixture: ComponentFixture<PricingComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PricingComponent],
      // Keep pricing entry-point tests independent from dialog internals.
      providers: [
        provideLucideIcons(
          LucideHeart, LucideCalendarDays, LucideBadgePercent,
          LucideLeaf, LucideGraduationCap, LucideSparkles, LucideCircleCheck, LucideArrowRight,
        ),
      ],
    })
      .overrideComponent(PricingComponent, {
        set: {
          imports: [
            // Mirrors PricingComponent imports while replacing only dialog internals.
            LucideDynamicIcon,
            AnimateOnScrollDirective,
            PrimaryButtonComponent,
            StudentVerificationDialogStubComponent,
          ],
        },
      })
      .compileComponents();

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

  afterEach(() => {
    vi.useRealTimers();
  });

  const studentCta = (): HTMLButtonElement => (
    fixture.nativeElement.querySelector('app-primary-button[aria-haspopup="dialog"] button') as HTMLButtonElement
  );

  it('opens the student verification dialog from the student CTA', () => {
    const cta = studentCta();

    expect(cta).not.toBeNull();
    expect(cta.closest('app-primary-button')?.getAttribute('aria-haspopup')).toBe('dialog');

    cta.click();
    fixture.detectChanges();

    expect(fixture.componentInstance.studentVerificationDialogOpen()).toBe(true);
  });

  it('returns focus to the student CTA when the dialog closes', () => {
    const cta = studentCta();
    cta.click();
    fixture.detectChanges();

    fixture.componentInstance.onStudentVerificationClosed();

    expect(document.activeElement).toBe(cta);
    expect(fixture.componentInstance.studentVerificationDialogOpen()).toBe(false);
  });

  it('changes student CTA label and copy after fixture verification approves', () => {
    vi.useFakeTimers();
    const request: StudentVerificationRequest = {
      institutionId: 'jadavpur-university',
      institutionName: 'Jadavpur University',
      method: 'document',
      documentName: 'student-id.pdf',
      consentAccepted: true,
    };
    const service = TestBed.inject(StudentVerificationService);

    service.submit(request);
    vi.advanceTimersByTime(FIXTURE_CHECK_DELAY_MS + request.documentName!.length);
    fixture.detectChanges();

    const cta = studentCta();
    expect(service.canUseStudentPlan()).toBe(true);
    expect(cta.textContent).toContain('Student Premium Unlocked');
    expect(fixture.nativeElement.textContent).toContain('Verified — Student Premium is unlocked.');
  });

  describe('annual savings', () => {
    it('parses display prices', () => {
      expect(parsePrice('₹2,399')).toBe(2399);
      expect(parsePrice('₹0')).toBe(0);
      expect(parsePrice('free')).toBe(0);
    });

    it('computes the percentage from the prices, per plan', () => {
      expect(annualSavingsPercent('₹99', '₹999')).toBe(16); // 1 - 999/1188 = 15.9%
      expect(annualSavingsPercent('₹249', '₹2,399')).toBe(20); // 1 - 2399/2988 = 19.7%
      expect(annualSavingsPercent('₹0', '₹0')).toBe(0);
      expect(annualSavingsPercent('₹10', '₹200')).toBe(0); // annual dearer than 12 months: no saving
    });

    it('exposes per-plan percentages and a truthful "up to" toggle label', () => {
      const plans = fixture.componentInstance.displayedPlans();
      expect(plans.map((p) => p.annualSavingsPercent)).toEqual([0, 16, 20]);
      expect(fixture.componentInstance.maxAnnualSavingsPercent()).toBe(20);
      expect(fixture.nativeElement.textContent).toContain('Save up to 20%');
    });

    it('shows each plan its own saving badge only in annual mode', () => {
      expect(fixture.nativeElement.textContent).not.toContain('Save 16%');
      (fixture.nativeElement.querySelectorAll('button[aria-pressed]')[1] as HTMLButtonElement).click();
      fixture.detectChanges();
      const text = fixture.nativeElement.textContent as string;
      expect(text).toContain('Save 16%');
      expect(text).toContain('Save 20%');
    });
  });

  describe('unavailable plan buttons', () => {
    it('are disabled with aria-disabled, visible "Coming soon" text and aria-describedby (not title only)', () => {
      const hosts = Array.from(fixture.nativeElement.querySelectorAll('app-primary-button')) as HTMLElement[];
      const unavailable = hosts.filter((h) => !h.hasAttribute('aria-haspopup'));
      expect(unavailable).toHaveLength(2);
      for (const host of unavailable) {
        const button = host.querySelector('button')!;
        expect(button.disabled).toBe(true);
        expect(button.getAttribute('aria-disabled')).toBe('true');
        expect(host.hasAttribute('title')).toBe(false);
        const note = fixture.nativeElement.querySelector(`#${host.getAttribute('aria-describedby')}`) as HTMLElement;
        expect(note.textContent).toContain('Coming soon');
      }
    });
  });
});
