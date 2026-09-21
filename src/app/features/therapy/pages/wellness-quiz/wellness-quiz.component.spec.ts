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

  it('creates and renders four radiogroups', () => {
    expect(fixture.componentInstance).toBeTruthy();
    expect((fixture.nativeElement as HTMLElement).querySelectorAll('[role="radiogroup"]')).toHaveLength(4);
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

    expect(navigate).toHaveBeenCalledWith(['/therapy'], { fragment: 'top-psychologists' });
  });
});
