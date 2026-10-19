// @vitest-environment jsdom
import { ComponentFixture, TestBed } from '@angular/core/testing';
import {
  LucideArrowLeft,
  LucideArrowRight,
  LucideAudioLines,
  LucideBrain,
  LucideCloudRain,
  LucideCircleCheck,
  LucideFaceSlightlyFrowning,
  LucideFlame,
  LucideLeaf,
  LucideMoon,
  LucideSparkles,
  LucideSun,
  LucideTreePine,
  LucideWaves,
  LucideX,
  provideLucideIcons,
} from '@lucide/angular';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { OnboardingService } from '../../services/onboarding.service';
import { OnboardingWizardComponent } from './onboarding-wizard.component';

describe('OnboardingWizardComponent', () => {
  let fixture: ComponentFixture<OnboardingWizardComponent>;

  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [OnboardingWizardComponent],
      providers: [
        provideLucideIcons(
          LucideArrowLeft,
          LucideArrowRight,
  LucideAudioLines,
  LucideBrain,
  LucideCloudRain,
          LucideCircleCheck,
          LucideFaceSlightlyFrowning,
          LucideFlame,
  LucideFlame,
          LucideLeaf,
          LucideMoon,
          LucideSparkles,
          LucideSun,
          LucideTreePine,
          LucideWaves,
  LucideSparkles,
  LucideSun,
  LucideTreePine,
  LucideWaves,
          LucideX,
        ),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(OnboardingWizardComponent);
    TestBed.inject(OnboardingService).start();
    fixture.detectChanges();
  });

  it('uses the required question type scale and exposes a keyboard-operable goal radiogroup', () => {
    const root = fixture.nativeElement as HTMLElement;
    const question = root.querySelector<HTMLHeadingElement>('#goal-question');
    const group = root.querySelector<HTMLElement>('[role="radiogroup"]');
    const radios = Array.from(root.querySelectorAll<HTMLButtonElement>('[role="radio"]'));

    expect(question?.className).toContain('text-3xl');
    expect(question?.className).toContain('md:text-5xl');
    expect(question?.className).toContain('font-bold');
    expect(question?.className).toContain('leading-tight');
    expect(group?.getAttribute('aria-labelledby')).toBe('goal-question');
    expect(radios).toHaveLength(4);
    expect(radios[0].getAttribute('aria-checked')).toBe('false');
    expect(radios[0].getAttribute('tabindex')).toBe('0');
    expect(radios[0].className).toContain('bg-surface');
    expect(radios[0].className).toContain('border-hairline');
    expect(radios[0].className).toContain('focus-visible:ring-2');

    radios[0].dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    fixture.detectChanges();

    expect(radios[1].getAttribute('aria-checked')).toBe('true');
    expect(radios[1].getAttribute('tabindex')).toBe('0');
    expect(radios[1].className).toContain('bg-selected');
    expect(radios[1].className).toContain('text-ink');
    expect(radios[1].className).toContain('border-brand');
    expect(radios[1].textContent).toContain('Selected');
    const continueButton = Array.from(root.querySelectorAll<HTMLButtonElement>('button')).find(
      (button) => button.textContent?.trim() === 'Continue',
    );
    expect(continueButton?.disabled).toBe(false);
    expect(continueButton?.className).toContain('text-on-brand-deep');
  });

  it('uses the deep-brand foreground on every primary action', () => {
    const root = fixture.nativeElement as HTMLElement;
    const selectFirstAnswer = () => {
      root.querySelector<HTMLButtonElement>('[role="radio"]')!.click();
      fixture.detectChanges();
    };
    const findAction = (label: string) => Array.from(root.querySelectorAll<HTMLButtonElement>('button')).find(
      (button) => button.textContent?.trim() === label,
    );

    selectFirstAnswer();
    const firstContinue = findAction('Continue');
    expect(firstContinue?.className).toContain('text-on-brand-deep');
    firstContinue?.click();
    fixture.detectChanges();

    selectFirstAnswer();
    const secondContinue = findAction('Continue');
    expect(secondContinue?.className).toContain('text-on-brand-deep');
    secondContinue?.click();
    fixture.detectChanges();

    selectFirstAnswer();
    expect(findAction('Finish setup')?.className).toContain('text-on-brand-deep');
  });
  it('keeps a selected answer visible until the user explicitly continues', () => {
    const root = fixture.nativeElement as HTMLElement;
    const first = root.querySelector<HTMLButtonElement>('[role="radio"]')!;
    first.click();
    fixture.detectChanges();

    expect(TestBed.inject(OnboardingService).currentStep()).toBe(1);
    expect(first.getAttribute('aria-checked')).toBe('true');
    expect(first.textContent).toContain('Selected');
    expect(first.className).toContain('bg-selected');
    expect(first.className).toContain('text-ink');
  });

  describe('dialog semantics', () => {
    const dialog = () => (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>('[role="dialog"]')!;

    it('is a labelled modal dialog', () => {
      expect(dialog().getAttribute('aria-modal')).toBe('true');
      const labelId = dialog().getAttribute('aria-labelledby')!;
      expect(dialog().querySelector(`#${labelId}`)?.textContent).toContain('Set up Calmi');
    });

    it('moves initial focus into the dialog', async () => {
      await fixture.whenStable();
      expect(dialog().contains(document.activeElement)).toBe(true);
    });

    it('closes on Escape', () => {
      const service = TestBed.inject(OnboardingService);
      const close = vi.spyOn(service, 'close');
      dialog().dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      expect(close).toHaveBeenCalled();
      expect(service.isActive()).toBe(false);
    });

    it('traps Tab: from the last focusable it wraps to the first, and Shift+Tab from first wraps to last', () => {
      const focusable = Array.from(dialog().querySelectorAll<HTMLElement>('button:not([disabled]), [tabindex]:not([tabindex="-1"])'));
      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      last.focus();
      const forward = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true });
      last.dispatchEvent(forward);
      expect(forward.defaultPrevented).toBe(true);
      expect(document.activeElement).toBe(first);

      const backward = new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true, cancelable: true });
      first.dispatchEvent(backward);
      expect(backward.defaultPrevented).toBe(true);
      expect(document.activeElement).toBe(last);
    });

    it('wires the Back button to prevStep()', () => {
      const service = TestBed.inject(OnboardingService);
      const root = fixture.nativeElement as HTMLElement;
      expect(root.querySelector('button[aria-label="Back"]')).toBeNull(); // not on step 1

      service.setSelection('goal', 'sleep');
      service.nextStep();
      fixture.detectChanges();
      const back = root.querySelector<HTMLButtonElement>('button[aria-label="Back"]')!;
      expect(back).not.toBeNull();

      back.click();
      expect(service.currentStep()).toBe(1);
    });

    it('disables the ping animation for reduced motion', () => {
      const service = TestBed.inject(OnboardingService);
      service.setSelection('goal', 'sleep');
      service.nextStep();
      service.setSelection('soundPreference', 'rain');
      service.nextStep();
      service.setSelection('duration', '5min');
      service.finish();
      fixture.detectChanges();

      const pings = (fixture.nativeElement as HTMLElement).querySelectorAll('.animate-ping');
      expect(pings.length).toBeGreaterThan(0);
      pings.forEach((el) => expect(el.className).toContain('motion-reduce:animate-none'));
      service.close();
    });
  });
});
