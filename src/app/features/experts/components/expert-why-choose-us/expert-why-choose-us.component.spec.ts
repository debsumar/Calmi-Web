import { ComponentFixture, TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { EXPERTS } from '@/features/experts/data/expert.data';
import { ExpertWhyChooseUsComponent } from './expert-why-choose-us.component';

describe('ExpertWhyChooseUsComponent', () => {
  let fixture: ComponentFixture<ExpertWhyChooseUsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [ExpertWhyChooseUsComponent] }).compileComponents();
    fixture = TestBed.createComponent(ExpertWhyChooseUsComponent);
    fixture.componentRef.setInput('benefits', EXPERTS[0].whyChooseUs);
    fixture.detectChanges();
  });

  it('renders all four semantic benefits with static icon branches', () => {
    const root = fixture.nativeElement as HTMLElement;
    expect(root.querySelectorAll('ul > li').length).toBe(4);
    for (const label of ['Personalized Approach', 'Safe & Non-Judgmental', 'Holistic Perspective', 'Evidence-Informed Care']) {
      expect(root.textContent).toContain(label);
    }
    const icons = root.querySelectorAll(
      'svg[lucideHandHeart], svg[lucideShieldCheck], svg[lucideSprout], svg[lucideCircleCheck]',
    );
    expect(icons.length).toBe(4);
    icons.forEach((icon) => {
      expect(icon.getAttribute('aria-hidden')).toBe('true');
      expect(icon.querySelector('path, line, circle, polyline, rect')).not.toBeNull();
    });
  });
});
