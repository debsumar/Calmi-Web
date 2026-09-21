import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { LucideArrowLeft, LucideDynamicIcon } from '@lucide/angular';

type QuestionId = 'concern' | 'duration' | 'support' | 'outcome';

interface WellnessQuestion {
  readonly id: QuestionId;
  readonly title: string;
  readonly helper: string;
  readonly options: readonly string[];
}

const QUESTIONS: readonly WellnessQuestion[] = [
  {
    id: 'concern',
    title: 'What’s been weighing on you lately?',
    helper: 'You can choose one that feels most relevant.',
    options: ['Stress or Anxiety', 'Low mood or sadness', 'Relationships', 'Work or studies'],
  },
  {
    id: 'duration',
    title: 'How long have you been feeling this way?',
    helper: 'This helps understand your current experience.',
    options: ['Just recently (a few days)', 'A few weeks', 'A few months', 'More than 6 months'],
  },
  {
    id: 'support',
    title: 'What kind of support are you looking for?',
    helper: 'This helps us suggest the right therapy for you.',
    options: ['I want someone to listen', 'I want to understand what I’m feeling', 'I want practical ways to cope', 'I’m not sure yet.'],
  },
  {
    id: 'outcome',
    title: 'How do you want to feel after getting help?',
    helper: 'This helps us match you with the right approach.',
    options: ['Calmer', 'More confident', 'More emotionally balanced', 'Just want to feel myself again.'],
  },
] as const;

@Component({
  selector: 'app-wellness-quiz',
  imports: [RouterLink, LucideArrowLeft, LucideDynamicIcon],
  templateUrl: './wellness-quiz.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WellnessQuizComponent {
  private readonly router = inject(Router);

  readonly questions = QUESTIONS;
  readonly answers = signal<Record<QuestionId, string | null>>({
    concern: null,
    duration: null,
    support: null,
    outcome: null,
  });
  readonly allAnswered = computed(() => this.questions.every((question) => this.answers()[question.id] !== null));

  selectAnswer(questionId: QuestionId, answer: string): void {
    this.answers.update((answers) => ({ ...answers, [questionId]: answer }));
  }

  onRadioKeydown(event: KeyboardEvent, question: WellnessQuestion): void {
    const { key } = event;
    if (!['ArrowDown', 'ArrowRight', 'ArrowUp', 'ArrowLeft', 'Home', 'End'].includes(key)) return;

    event.preventDefault();
    const selectedAnswer = this.answers()[question.id];
    const currentIndex = Math.max(0, question.options.indexOf(selectedAnswer ?? ''));
    const nextIndex = key === 'Home'
      ? 0
      : key === 'End'
        ? question.options.length - 1
        : (currentIndex + (key === 'ArrowDown' || key === 'ArrowRight' ? 1 : -1) + question.options.length) % question.options.length;

    this.selectAnswer(question.id, question.options[nextIndex]);
    const radioGroup = (event.currentTarget as HTMLElement).closest('[role="radiogroup"]');
    const radios = Array.from(radioGroup?.querySelectorAll<HTMLElement>('[role="radio"]') ?? []);
    queueMicrotask(() => radios[nextIndex]?.focus());
  }

  findSupport(): void {
    if (!this.allAnswered()) return;
    void this.router.navigate(['/therapy'], { fragment: 'top-psychologists' });
  }
}
