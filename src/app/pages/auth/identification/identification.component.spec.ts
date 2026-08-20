import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, provideRouter } from '@angular/router';
import { signal } from '@angular/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthRole, AuthService } from '@/core/services/auth.service';
import { IdentificationComponent } from './identification.component';

describe('IdentificationComponent', () => {
  let fixture: ComponentFixture<IdentificationComponent>;
  const auth = { selectedRole: signal<AuthRole | null>(null) };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [IdentificationComponent],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: auth },
        { provide: ActivatedRoute, useValue: { snapshot: { queryParamMap: { get: () => '/home?from=auth' } } } },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(IdentificationComponent);
    fixture.detectChanges();
  });

  it('renders copy, meditation image, and left image panel', () => {
    expect(fixture.nativeElement.textContent).toContain('Get Started with Calmi');
    expect(fixture.nativeElement.textContent).toContain('Wellness Specialist');
    expect(fixture.nativeElement.querySelector('img').getAttribute('src')).toBe('/assets/meditation.svg');
    expect(fixture.nativeElement.querySelector('section > div').className).toContain('md:order-1');
  });

  it('gates Proceed until role selected and navigates with selected role', async () => {
    const proceed = fixture.nativeElement.querySelector('button[type="button"]:last-of-type') as HTMLButtonElement;
    expect(proceed.disabled).toBe(true);
    (fixture.nativeElement.querySelector('[role="radio"]') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(proceed.disabled).toBe(false);
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate');
    proceed.click();
    await fixture.whenStable();
    expect(auth.selectedRole()).toBe('specialist');
    expect(navigate).toHaveBeenCalledWith(['/auth/login'], { queryParams: { returnUrl: '/home?from=auth' } });
  });

  it('moves selection with arrow keys', () => {
    const first = fixture.nativeElement.querySelector('[role="radio"]') as HTMLButtonElement;
    first.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' }));
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelectorAll('[aria-checked="true"]').length).toBe(1);
    expect((fixture.nativeElement.querySelectorAll('[role="radio"]')[1] as HTMLElement).getAttribute('aria-checked')).toBe('true');
  });
});
