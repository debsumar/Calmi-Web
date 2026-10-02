import { ComponentFixture, TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { EXPERTS } from '@/features/experts/data/expert.data';
import { ExpertProfileAboutComponent } from './expert-profile-about.component';

describe('ExpertProfileAboutComponent', () => {
  let fixture: ComponentFixture<ExpertProfileAboutComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [ExpertProfileAboutComponent] }).compileComponents();
    fixture = TestBed.createComponent(ExpertProfileAboutComponent);
    fixture.componentRef.setInput('profile', EXPERTS.find((expert) => expert.id === 'gargi-yadav')!);
    fixture.detectChanges();
  });

  it('renders a first-name heading, bio, and decorative icon', () => {
    const root = fixture.nativeElement as HTMLElement;
    expect(root.querySelector('h2')?.textContent).toContain('About Gargi');
    expect(root.textContent).toContain('calm, collaborative space');
    const icon = root.querySelector('svg[lucideStethoscope]');
    expect(icon?.getAttribute('aria-hidden')).toBe('true');
    expect(icon?.querySelector('path, line, circle, polyline, rect')).not.toBeNull();
  });
});
