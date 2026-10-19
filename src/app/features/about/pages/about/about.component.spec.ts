import { ComponentFixture, TestBed } from '@angular/core/testing';
import {
  LucideArrowRight,
  LucideHandHeart,
  LucideHeart,
  LucideSparkles,
  LucideSprout,
  LucideStethoscope,
  provideLucideIcons,
} from '@lucide/angular';
import { beforeEach, describe, expect, it } from 'vitest';
import { AboutComponent } from './about.component';

describe('AboutComponent', () => {
  let fixture: ComponentFixture<AboutComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AboutComponent],
      providers: [
        provideLucideIcons(
          LucideArrowRight,
          LucideHandHeart,
          LucideHeart,
          LucideSparkles,
          LucideSprout,
          LucideStethoscope,
        ),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AboutComponent);
    await fixture.whenStable();
  });

  it('renders the hero heading and the page sections', () => {
    const root = fixture.nativeElement as HTMLElement;

    const h1 = root.querySelector('h1');
    expect(h1?.textContent?.trim().length).toBeGreaterThan(0);
    expect(root.querySelectorAll('section').length).toBeGreaterThanOrEqual(4);
    expect(root.textContent).toContain('Why We Built Calmi?');
  });

  it('gives every image an alt attribute and keeps h2 headings non-empty', () => {
    const root = fixture.nativeElement as HTMLElement;

    root.querySelectorAll('img').forEach((img) => expect(img.hasAttribute('alt')).toBe(true));
    const headings = Array.from(root.querySelectorAll('h2'));
    expect(headings.length).toBeGreaterThan(0);
    headings.forEach((h) => expect(h.textContent?.trim()).not.toBe(''));
  });
});
