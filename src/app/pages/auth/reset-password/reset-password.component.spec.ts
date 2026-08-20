import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { provideRouter } from '@angular/router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthService } from '@/core/services/auth.service';
import { ResetPasswordComponent } from './reset-password.component';

describe('ResetPasswordComponent', () => {
  let fixture: ComponentFixture<ResetPasswordComponent>;
  const updatePassword = vi.fn().mockResolvedValue(undefined);
  const isAuthenticated = signal(true);

  beforeEach(async () => {
    updatePassword.mockClear();
    isAuthenticated.set(true);
    await TestBed.configureTestingModule({
      imports: [ResetPasswordComponent],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: { updatePassword, isAuthenticated } },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(ResetPasswordComponent);
    fixture.detectChanges();
  });

  it('renders recovery copy and gates password update until matching valid fields', async () => {
    expect(fixture.nativeElement.textContent).toContain('Create a New Password');
    const submit = fixture.nativeElement.querySelector('button[type="submit"]') as HTMLButtonElement;
    expect(submit.disabled).toBe(true);
    fixture.componentInstance.resetForm.setValue({ password: 'correct horse', confirmPassword: 'correct horse' });
    fixture.detectChanges();
    expect(submit.disabled).toBe(false);
    await fixture.componentInstance.submit();
    expect(updatePassword).toHaveBeenCalledWith('correct horse');
  });
});
