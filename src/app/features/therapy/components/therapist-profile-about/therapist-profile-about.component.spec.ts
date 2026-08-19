import { ComponentFixture, TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { THERAPISTS } from '@/features/therapy/data/therapist.data';
import { TherapistProfileAboutComponent } from './therapist-profile-about.component';

describe('TherapistProfileAboutComponent', () => {
  let fixture: ComponentFixture<TherapistProfileAboutComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [TherapistProfileAboutComponent] }).compileComponents();
    fixture = TestBed.createComponent(TherapistProfileAboutComponent);
    fixture.componentRef.setInput('profile', THERAPISTS[0]);
    fixture.detectChanges();
  });

  it('renders a first-name heading, bio, and decorative icon', () => {
    const root = fixture.nativeElement as HTMLElement;
    expect(root.querySelector('h2')?.textContent).toContain('About Ayushi');
    expect(root.textContent).toContain('calm, collaborative space');
    const icon = root.querySelector('svg[lucideStethoscope]');
    expect(icon?.getAttribute('aria-hidden')).toBe('true');
    expect(icon?.querySelector('path, line, circle, polyline, rect')).not.toBeNull();
  });
});
