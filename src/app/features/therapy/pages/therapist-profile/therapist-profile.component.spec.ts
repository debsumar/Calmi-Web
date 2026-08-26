import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { TestBed } from '@angular/core/testing';
import {
  provideLucideIcons,
  LucideArrowLeft,
  LucideBrain,
  LucideBriefcaseBusiness,
  LucideGraduationCap,
} from '@lucide/angular';
import { beforeEach, describe, expect, it } from 'vitest';
import { TherapistProfileComponent } from './therapist-profile.component';

describe('TherapistProfileComponent', () => {
  let harness: RouterTestingHarness;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      providers: [
        provideRouter([{ path: 'therapy/:id', component: TherapistProfileComponent }]),
        provideLucideIcons(LucideArrowLeft, LucideBrain, LucideBriefcaseBusiness, LucideGraduationCap),
      ],
    }).compileComponents();
    harness = await RouterTestingHarness.create();
  });

  it('renders the composed known therapist profile and geometry-backed static icons', async () => {
    await harness.navigateByUrl('/therapy/gargi-yadav', TherapistProfileComponent);
    harness.detectChanges();

    const root = harness.routeNativeElement as HTMLElement;
    expect(root.textContent).toContain('Gargi Yadav');
    expect(root.textContent).toContain('Areas of Expertise');
    expect(root.textContent).toContain('About Gargi');
    expect(root.textContent).toContain('Why Choose Us');
    expect(root.textContent).toContain('Hear from Clients!');
    expect(root.textContent).toContain('Book a Session');
    expect(root.textContent).toContain('Before Your First Session');
    expect(root.textContent).toContain('₹2000');
    expect(root.querySelectorAll('app-faq-accordion button[aria-controls]')).toHaveLength(3);
    expect(root.querySelector('[role="img"][aria-label="Placeholder avatar for Gargi Yadav"]')).not.toBeNull();
    expect(root.querySelector('nav[aria-label="Breadcrumb"] [aria-current="page"]')?.textContent).toContain('Therapist Profile');

    const profileIcons = root.querySelectorAll(
      'app-therapist-profile-hero svg[lucideArrowLeft], app-therapist-profile-hero svg[lucideMedal], app-therapist-profile-hero svg[lucideBriefcaseBusiness], app-therapist-profile-hero svg[lucideTarget]',
    );
    expect(profileIcons.length).toBe(4);
    profileIcons.forEach((icon) => {
      expect(icon.querySelector('path, line, circle, polyline, rect')).not.toBeNull();
    });
  });

  it('renders recovery navigation for an unknown therapist id', async () => {
    await harness.navigateByUrl('/therapy/not-real', TherapistProfileComponent);
    harness.detectChanges();

    const root = harness.routeNativeElement as HTMLElement;
    expect(root.textContent).toContain('Profile not found');
    const recoveryLink = Array.from(root.querySelectorAll('a')).find((link) => link.textContent?.includes('Browse psychologists'));
    expect(recoveryLink).not.toBeUndefined();
    expect(recoveryLink?.getAttribute('href')).toContain('/therapy');
    expect(root.querySelector('[role="img"]')).toBeNull();
    expect(root.querySelector('app-therapist-booking-sidebar')).toBeNull();
  });
});
