// @vitest-environment jsdom
import { provideRouter } from '@angular/router';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import {
  LucideChevronDown,
  LucideChevronLeft,
  LucideChevronRight,
  LucideFunnel,
  LucideStar,
  provideLucideIcons,
} from '@lucide/angular';
import { beforeEach, describe, expect, it } from 'vitest';
import { TherapyComponent } from './therapy.component';

describe('TherapyComponent', () => {
  let fixture: ComponentFixture<TherapyComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TherapyComponent],
      providers: [
        provideRouter([]),
        provideLucideIcons(
          LucideFunnel,
          LucideChevronDown,
          LucideChevronLeft,
          LucideChevronRight,
          LucideStar,
        ),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(TherapyComponent);
    fixture.detectChanges();
  });

  it('keeps the extracted Therapy FAQ rendered with all original entries', () => {
    const root = fixture.nativeElement as HTMLElement;
    const faq = root.querySelector('app-faq-accordion');

    expect(faq).not.toBeNull();
    expect(faq?.textContent).toContain('Frequently Asked Questions');
    expect(faq?.querySelectorAll('button[aria-controls]')).toHaveLength(5);
  });

  it('renders geometry for every dynamic icon in the therapy template', () => {
    const root = fixture.nativeElement as HTMLElement;
    const icons = root.querySelectorAll('svg');

    expect(icons.length).toBeGreaterThan(0);
    icons.forEach((icon) => {
      expect(icon.querySelector('path, line, circle, polyline, rect')).not.toBeNull();
    });
  });
});
