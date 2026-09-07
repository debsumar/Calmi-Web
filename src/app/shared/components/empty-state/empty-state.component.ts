import { Component, input, ChangeDetectionStrategy } from '@angular/core';

@Component({
  selector: 'app-empty-state',
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <div class="flex flex-col items-center justify-center p-8 text-center">
      <i [class]="icon() + ' mb-4 text-4xl text-ink-muted'"></i>
      <h3 class="text-lg font-bold text-ink">{{ title() }}</h3>
      <p class="mt-2 text-base text-ink-soft">{{ message() }}</p>
    </div>
  `,
})
export class EmptyStateComponent {
  icon = input('pi pi-inbox');
  title = input('Nothing here');
  message = input('No items found.');
}
