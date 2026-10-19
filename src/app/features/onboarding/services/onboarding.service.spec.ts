import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { OnboardingService } from './onboarding.service';

describe('OnboardingService', () => {
  let service: OnboardingService;

  beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers();
    service = TestBed.inject(OnboardingService);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  const completeAll = () => {
    service.start();
    service.setSelection('goal', 'sleep');
    service.nextStep();
    service.setSelection('soundPreference', 'rain');
    service.nextStep();
    service.setSelection('duration', '15min');
  };

  it('does not persist anything before finish()', () => {
    completeAll();
    expect(localStorage.getItem('calmi-onboarding-completed')).toBeNull();
  });

  it('persists completion and selections on finish() and then closes after the delay', () => {
    completeAll();
    service.finish();

    expect(service.currentStep()).toBe(4);
    expect(localStorage.getItem('calmi-onboarding-completed')).toBe('true');
    expect(JSON.parse(localStorage.getItem('calmi-onboarding-selections')!)).toEqual({
      goal: 'sleep', soundPreference: 'rain', duration: '15min',
    });
    expect(service.isActive()).toBe(true);
    vi.advanceTimersByTime(1500);
    expect(service.isActive()).toBe(false);
  });

  it('bounds nextStep at the total step count and prevStep at 1', () => {
    service.start();
    for (let i = 0; i < 10; i++) service.nextStep();
    expect(service.currentStep()).toBe(4);
    for (let i = 0; i < 10; i++) service.prevStep();
    expect(service.currentStep()).toBe(1);
  });

  it('start() cancels a pending auto-close so a restarted flow is not closed under the user', () => {
    completeAll();
    service.finish();
    service.start();
    vi.advanceTimersByTime(5000);
    expect(service.isActive()).toBe(true);
    expect(service.currentStep()).toBe(1);
  });

  it('close() clears the pending timer; destroy clears it too', () => {
    completeAll();
    service.finish();
    expect(vi.getTimerCount()).toBe(1);
    service.close();
    expect(vi.getTimerCount()).toBe(0);

    service.finish();
    expect(vi.getTimerCount()).toBe(1);
    TestBed.resetTestingModule();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('finish() twice leaves a single timer', () => {
    completeAll();
    service.finish();
    service.finish();
    expect(vi.getTimerCount()).toBe(1);
  });

  it('survives blocked localStorage', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('blocked'); });
    completeAll();
    expect(() => service.finish()).not.toThrow();
    expect(service.currentStep()).toBe(4);
    expect(() => TestBed.inject(OnboardingService)).not.toThrow();
  });
});
