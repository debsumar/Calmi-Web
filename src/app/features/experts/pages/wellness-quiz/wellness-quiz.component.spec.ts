// @vitest-environment jsdom
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { LucideArrowLeft, LucideCircleCheck, provideLucideIcons } from '@lucide/angular';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { WellnessQuizComponent } from './wellness-quiz.component';

describe('WellnessQuizComponent', () => {
  let fixture: ComponentFixture<WellnessQuizComponent>;
  let router: Router;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [WellnessQuizComponent],
      providers: [provideRouter([]), provideLucideIcons(LucideArrowLeft, LucideCircleCheck)],
    }).compileComponents();
    fixture = TestBed.createComponent(WellnessQuizComponent);
    router = TestBed.inject(Router);
    fixture.detectChanges();
  });

  it('renders one labelled radiogroup per question, none pre-selected, one tab stop each', () => {
    const groups = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll<HTMLElement>('[role="radiogroup"]'));
    expect(groups).toHaveLength(fixture.componentInstance.questions.length);

    groups.forEach((group) => {
      const radios = Array.from(group.querySelectorAll<HTMLElement>('[role="radio"]'));
      expect(radios).toHaveLength(4);
      expect(radios.every((radio) => radio.getAttribute('aria-checked') === 'false')).toBe(true);
      expect(radios.map((radio) => radio.getAttribute('tabindex'))).toEqual(['0', '-1', '-1', '-1']);
      expect(document.getElementById(group.getAttribute('aria-labelledby') ?? '')?.textContent?.trim()).not.toBe('');
    });
  });

  it('selects an answer on click and moves the single tab stop to it', () => {
    const root = fixture.nativeElement as HTMLElement;
    const group = root.querySelector<HTMLElement>('[role="radiogroup"]')!;
    const radios = Array.from(group.querySelectorAll<HTMLElement>('[role="radio"]'));

    radios[2].click();
    fixture.detectChanges();

    expect(fixture.componentInstance.answers().concern).toBe(fixture.componentInstance.questions[0].options[2]);
    expect(radios.map((radio) => radio.getAttribute('aria-checked'))).toEqual(['false', 'false', 'true', 'false']);
    expect(radios.map((radio) => radio.getAttribute('tabindex'))).toEqual(['-1', '-1', '0', '-1']);
  });

  it('moves selection and focus with arrow keys, wrapping, and Home/End', async () => {
    const root = fixture.nativeElement as HTMLElement;
    const radios = Array.from(root.querySelector<HTMLElement>('[role="radiogroup"]')!.querySelectorAll<HTMLElement>('[role="radio"]'));
    const press = async (key: string) => {
      radios[0].dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));
      fixture.detectChanges();
      await Promise.resolve();
    };
    const checked = () => radios.map((radio) => radio.getAttribute('aria-checked')).indexOf('true');

    await press('ArrowDown');
    expect(checked()).toBe(1);
    expect(document.activeElement).toBe(radios[1]);

    await press('End');
    expect(checked()).toBe(3);
    await press('ArrowRight');
    expect(checked()).toBe(0);
    await press('ArrowUp');
    expect(checked()).toBe(3);
    await press('Home');
    expect(checked()).toBe(0);
  });

  it('ignores unrelated keys', () => {
    const radio = (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>('[role="radio"]')!;
    const event = new KeyboardEvent('keydown', { key: 'a', bubbles: true, cancelable: true });
    radio.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(false);
    expect(fixture.componentInstance.answers().concern).toBeNull();
  });

  it('does not navigate while a question is unanswered', () => {
    const navigate = vi.spyOn(router, 'navigate').mockResolvedValue(true);
    fixture.componentInstance.findSupport();
    expect(navigate).not.toHaveBeenCalled();
  });

  it('keeps CTA disabled until every question has an answer', () => {
    const component = fixture.componentInstance;
    const submit = (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>('button[type="submit"]')!;

    expect(submit.disabled).toBe(true);
    component.questions.forEach((question) => component.selectAnswer(question.id, question.options[0]));
    fixture.detectChanges();

    expect(submit.disabled).toBe(false);
  });

  it('navigates to top psychologists on submit', () => {
    const component = fixture.componentInstance;
    const navigate = vi.spyOn(router, 'navigate').mockResolvedValue(true);
    component.questions.forEach((question) => component.selectAnswer(question.id, question.options[0]));
    fixture.detectChanges();

    (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>('button[type="submit"]')!.click();

    expect(navigate).toHaveBeenCalledWith(['/experts'], { fragment: 'top-psychologists' });
  });
});
