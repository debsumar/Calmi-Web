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

  it('does not render a page-local Download App banner', () => {
    const root = fixture.nativeElement as HTMLElement;

    expect(root.querySelectorAll('a[aria-label="Download App"]')).toHaveLength(0);
  });
});
