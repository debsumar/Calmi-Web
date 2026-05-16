import { Component, input } from '@angular/core';

@Component({
  selector: 'app-empty-state',
  standalone: true,
  template: `
    <div class="flex flex-col items-center justify-center p-8 text-center">
      <i [class]="icon() + ' text-4xl text-surface-400 mb-4'"></i>
      <h3 class="text-xl font-semibold text-surface-700">{{ title() }}</h3>
      <p class="text-surface-500 mt-2">{{ message() }}</p>
    </div>
  `,
})
export class EmptyStateComponent {
  icon = input('pi pi-inbox');
  title = input('Nothing here');
  message = input('No items found.');
}
