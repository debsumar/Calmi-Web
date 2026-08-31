import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import {
  LucideArrowRight,
  LucideBrain,
  LucideCircleCheck,
  LucideCloud,
  LucideFrown,
  LucideHeadphones,
  LucideHeart,
  LucideLock,
  LucideMoon,
  LucidePlay,
  LucideZap,
  provideLucideIcons,
} from '@lucide/angular';
import { beforeEach, describe, expect, it } from 'vitest';
import { HomeComponent } from './home.component';

describe('HomeComponent', () => {
  let fixture: ComponentFixture<HomeComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HomeComponent],
      providers: [
        provideRouter([]),
        provideLucideIcons(
          LucideArrowRight,
          LucideBrain,
          LucideCircleCheck,
          LucideCloud,
          LucideFrown,
          LucideHeadphones,
          LucideHeart,
          LucideLock,
          LucideMoon,
          LucidePlay,
          LucideZap,
        ),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(HomeComponent);
    await fixture.whenStable();
  });

  it('does not render a page-local Download App banner', () => {
    const root = fixture.nativeElement as HTMLElement;

    expect(root.querySelectorAll('a[aria-label="Download App"]')).toHaveLength(0);
  });

  it('keeps the original One-Minute Reset section content', () => {
    const root = fixture.nativeElement as HTMLElement;
    const resetSection = Array.from(root.querySelectorAll('section')).find((section) => section.textContent?.includes("Don't fix everything."));

    expect(resetSection).toBeDefined();
    expect(resetSection?.querySelector('h2')?.textContent).toContain("Don't fix everything.");
    expect(resetSection?.querySelector('h2')?.textContent).toContain('Take a moment.');
    expect(resetSection?.querySelector('h3')?.textContent).toContain('One-Minute Reset');
    expect(resetSection?.textContent).toContain('Listen. Breathe. Reset.');
    expect(resetSection?.textContent).toContain('Guided Audios');
    expect(resetSection?.textContent).toContain('Soothing Sounds');
    expect(resetSection?.textContent).toContain('Feel Better');
    expect(resetSection?.textContent).toContain('Instant Relief');
  });
});
