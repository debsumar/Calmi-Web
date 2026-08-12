import { Component, ChangeDetectionStrategy } from '@angular/core';

@Component({
  selector: 'app-card',
  host: { class: 'block' },
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `<div class="h-full bg-surface rounded-2xl p-8 shadow-card"><ng-content /></div>`,
})
export class CardComponent {}
