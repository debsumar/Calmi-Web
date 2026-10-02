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
import { ExpertProfileComponent } from './expert-profile.component';

describe('ExpertProfileComponent', () => {
  let harness: RouterTestingHarness;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      providers: [
        provideRouter([{ path: 'experts/:id', component: ExpertProfileComponent }]),
        provideLucideIcons(LucideArrowLeft, LucideBrain, LucideBriefcaseBusiness, LucideGraduationCap),
      ],
    }).compileComponents();
    harness = await RouterTestingHarness.create();
  });

  it('renders the composed known expert profile and geometry-backed static icons', async () => {
    await harness.navigateByUrl('/experts/gargi-yadav', ExpertProfileComponent);
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
    expect(root.querySelector<HTMLImageElement>('img[alt="Portrait of Gargi Yadav"]')?.getAttribute('src')).toBe('assets/users/gargi.avif');
    expect(root.querySelector('nav[aria-label="Breadcrumb"] [aria-current="page"]')?.textContent).toContain('Expert Profile');

    const profileIcons = root.querySelectorAll(
      'app-expert-profile-hero svg[lucideArrowLeft], app-expert-profile-hero svg[lucideMedal], app-expert-profile-hero svg[lucideBriefcaseBusiness], app-expert-profile-hero svg[lucideTarget]',
    );
    expect(profileIcons.length).toBe(4);
    profileIcons.forEach((icon) => {
      expect(icon.querySelector('path, line, circle, polyline, rect')).not.toBeNull();
    });
  });

  it('renders recovery navigation for an unknown expert id', async () => {
    await harness.navigateByUrl('/experts/not-real', ExpertProfileComponent);
    harness.detectChanges();

    const root = harness.routeNativeElement as HTMLElement;
    expect(root.textContent).toContain('Profile not found');
    const recoveryLink = Array.from(root.querySelectorAll('a')).find((link) => link.textContent?.includes('Browse psychologists'));
    expect(recoveryLink).not.toBeUndefined();
    expect(recoveryLink?.getAttribute('href')).toContain('/experts');
    expect(root.querySelector('[role="img"]')).toBeNull();
    expect(root.querySelector('app-expert-booking-sidebar')).toBeNull();
  });
});
