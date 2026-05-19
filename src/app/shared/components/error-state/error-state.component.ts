import { Component, input, output } from '@angular/core';
import { ButtonModule } from 'primeng/button';

@Component({
  selector: 'app-error-state',
  imports: [ButtonModule],
  template: `
    <div class="flex flex-col items-center justify-center p-8 text-center">
      <i class="pi pi-exclamation-triangle text-4xl text-red-500 mb-4"></i>
      <h3 class="text-xl font-semibold text-surface-700">{{ title() }}</h3>
      <p class="text-surface-500 mt-2">{{ message() }}</p>
      <p-button label="Retry" icon="pi pi-refresh" class="mt-4" (onClick)="retry.emit()" />
    </div>
  `,
})
export class ErrorStateComponent {
  title = input('Something went wrong');
  message = input('An error occurred. Please try again.');
  retry = output();
}
