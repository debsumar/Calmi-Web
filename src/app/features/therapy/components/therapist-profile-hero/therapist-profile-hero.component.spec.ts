import { provideRouter } from '@angular/router';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { THERAPISTS } from '@/features/therapy/data/therapist.data';
import { TherapistProfileHeroComponent } from './therapist-profile-hero.component';

describe('TherapistProfileHeroComponent', () => {
  let fixture: ComponentFixture<TherapistProfileHeroComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TherapistProfileHeroComponent],
      providers: [provideRouter([])],
    }).compileComponents();
    fixture = TestBed.createComponent(TherapistProfileHeroComponent);
    fixture.componentRef.setInput('profile', THERAPISTS[0]);
    fixture.detectChanges();
  });

  it('renders the hero icon geometry and expertise content', () => {
    const root = fixture.nativeElement as HTMLElement;
    expect(root.textContent).toContain('Areas of Expertise');
    expect(root.textContent).toContain('Anxiety & Stress');
    const icons = root.querySelectorAll('svg[lucideArrowLeft], svg[lucideMedal], svg[lucideBriefcaseBusiness], svg[lucideTarget]');
    expect(icons.length).toBe(4);
    icons.forEach((icon) => expect(icon.querySelector('path, line, circle, polyline, rect')).not.toBeNull());
  });
});
