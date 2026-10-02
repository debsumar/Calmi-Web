// @vitest-environment jsdom
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LucideChevronDown, provideLucideIcons } from '@lucide/angular';
import { beforeEach, describe, expect, it } from 'vitest';
import { EXPERT_FAQS } from '@/features/experts/data/faq.data';
import { FaqAccordionComponent } from './faq-accordion.component';

describe('FaqAccordionComponent', () => {
  let fixture: ComponentFixture<FaqAccordionComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FaqAccordionComponent],
      providers: [provideLucideIcons(LucideChevronDown)],
    }).compileComponents();

    fixture = TestBed.createComponent(FaqAccordionComponent);
    fixture.componentRef.setInput('faqs', EXPERT_FAQS);
    fixture.detectChanges();
  });

  it('renders every supplied FAQ entry and a registered chevron icon', () => {
    const root = fixture.nativeElement as HTMLElement;
    const questions = root.querySelectorAll('button[aria-controls]');

    expect(questions).toHaveLength(EXPERT_FAQS.length);
    EXPERT_FAQS.forEach((faq) => expect(root.textContent).toContain(faq.question));
    root.querySelectorAll('svg').forEach((icon) => {
      expect(icon.querySelector('path, line, circle, polyline, rect')).not.toBeNull();
    });
  });

  it('expands one answer and updates aria-expanded when its question is clicked', () => {
    const root = fixture.nativeElement as HTMLElement;
    const trigger = root.querySelector('button[aria-controls]') as HTMLButtonElement;
    const panelId = trigger.getAttribute('aria-controls');

    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    expect(root.querySelector(`#${panelId}`)?.textContent).toContain(EXPERT_FAQS[0].answer);

    trigger.click();
    fixture.detectChanges();

    expect(trigger.getAttribute('aria-expanded')).toBe('true');
    expect(trigger.tabIndex).toBe(0);
    expect(root.querySelector(`#${panelId}`)?.getAttribute('role')).toBe('region');
    expect(root.querySelector(`#${panelId}`)?.getAttribute('aria-labelledby')).toBe(trigger.id);
  });
});
