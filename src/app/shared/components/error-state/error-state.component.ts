import { Component, input, output, ChangeDetectionStrategy } from '@angular/core';
import { ButtonModule } from 'primeng/button';

@Component({
  selector: 'app-error-state',
  imports: [ButtonModule],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <div class="flex flex-col items-center justify-center p-8 text-center">
      <i class="pi pi-exclamation-triangle mb-4 text-4xl text-danger"></i>
      <h3 class="text-lg font-bold text-ink">{{ title() }}</h3>
      <p class="mt-2 text-base text-ink-soft">{{ message() }}</p>
      <p-button label="Retry" icon="pi pi-refresh" class="mt-4" (onClick)="retry.emit()" />
    </div>
  `,
})
export class ErrorStateComponent {
  title = input('Something went wrong');
  message = input('An error occurred. Please try again.');
  retry = output();
}
