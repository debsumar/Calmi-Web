import { Component } from '@angular/core';

@Component({
  selector: 'app-card',
  host: { class: 'block' },
  template: `<div class="h-full bg-white dark:bg-[#2a2a40] rounded-2xl p-8 shadow-[0_4px_4px_0_rgba(0,0,0,0.25)] dark:shadow-[0_4px_4px_0_rgba(0,0,0,0.5)]"><ng-content /></div>`,
})
export class CardComponent {}
