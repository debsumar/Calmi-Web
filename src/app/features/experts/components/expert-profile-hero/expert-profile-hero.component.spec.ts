import { provideRouter } from '@angular/router';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { EXPERTS } from '@/features/experts/data/expert.data';
import { ExpertProfileHeroComponent } from './expert-profile-hero.component';

describe('ExpertProfileHeroComponent', () => {
  let fixture: ComponentFixture<ExpertProfileHeroComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ExpertProfileHeroComponent],
      providers: [provideRouter([])],
    }).compileComponents();
    fixture = TestBed.createComponent(ExpertProfileHeroComponent);
    fixture.componentRef.setInput('profile', EXPERTS.find((expert) => expert.id === 'gargi-yadav')!);
    fixture.detectChanges();
  });

  it('renders the hero icon geometry and expertise content', () => {
    const root = fixture.nativeElement as HTMLElement;
    expect(root.textContent).toContain('Areas of Expertise');
    expect(root.textContent).toContain('Anxiety & Emotional Regulation');
    const name = root.querySelector('h1[appAnimateOnScroll]') as HTMLElement;
    expect(name?.style.getPropertyValue('--index')).toBe('0');
    expect(name?.classList.contains('stagger-enter')).toBe(true);
    const icons = root.querySelectorAll('svg[lucideArrowLeft], svg[lucideMedal], svg[lucideBriefcaseBusiness], svg[lucideTarget]');
    expect(icons.length).toBe(4);
    icons.forEach((icon) => expect(icon.querySelector('path, line, circle, polyline, rect')).not.toBeNull());
  });
});
