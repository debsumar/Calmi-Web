import { beforeEach, describe, expect, it } from 'vitest';

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import {
  LucideArrowRight,
  LucideBrain,
  LucideCircleCheck,
  LucideCloud,
  LucideFaceSlightlyFrowning,
  LucideHeadphones,
  LucideHeart,
  LucideLock,
  LucideMessageCircleHeart,
  LucideMoon,
  LucideMoonStar,
  LucideNotebookPen,
  LucidePlay,
  LucideStethoscope,
  LucideZap,
  provideLucideIcons,
} from '@lucide/angular';
import { HomeComponent } from './home.component';
import { provideAuthServiceStub } from '@/core/services/testing/auth.service.stub';

describe('HomeComponent', () => {
  let fixture: ComponentFixture<HomeComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HomeComponent],
      providers: [
        provideAuthServiceStub(),
        provideRouter([]),
        provideLucideIcons(
          LucideArrowRight,
          LucideBrain,
          LucideCircleCheck,
          LucideCloud,
          LucideFaceSlightlyFrowning,
          LucideHeadphones,
          LucideHeart,
          LucideLock,
          LucideMessageCircleHeart,
          LucideMoon,
          LucideMoonStar,
          LucideNotebookPen,
          LucidePlay,
          LucideStethoscope,
          LucideZap,
        ),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(HomeComponent);
    await fixture.whenStable();
  });

  it('renders the four "What do you need right now?" options', () => {
    const root = fixture.nativeElement as HTMLElement;
    const section = Array.from(root.querySelectorAll('section')).find((s) => s.querySelector('h2')?.textContent?.includes('What do you need'));

    expect(section).toBeDefined();
    expect(Array.from(section!.querySelectorAll('h3')).map((h) => h.textContent?.trim())).toEqual([
      'Write it out',
      'Talk it through',
      'Sleep better',
      'Get support',
    ]);
    expect(section?.textContent).toContain('Journal your thoughts.');
    expect(section?.textContent).toContain('Talk with Rumi AI.');
    expect(section?.textContent).toContain('Relax and fall asleep faster.');
    expect(section?.textContent).toContain('Connect with an expert.');
  });

  it('links every shipped option to its route, journaling included', () => {
    const root = fixture.nativeElement as HTMLElement;
    const section = Array.from(root.querySelectorAll('section')).find((s) => s.querySelector('h2')?.textContent?.includes('What do you need'));
    const hrefs = Array.from(section!.querySelectorAll('a')).map((a) => a.getAttribute('href'));

    expect(hrefs).toEqual(['/journal', '/rumi-ai', '/sleep', '/therapy']);
    expect(section?.textContent).not.toContain('Coming soon');
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
