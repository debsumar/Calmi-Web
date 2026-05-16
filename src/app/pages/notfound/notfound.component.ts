import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-notfound',
  standalone: true,
  imports: [RouterLink],
  template: `
    <div class="flex flex-col items-center justify-center min-h-screen gap-4">
      <h1 class="text-6xl font-bold text-primary">404</h1>
      <p class="text-xl text-surface-500">Page not found</p>
      <a routerLink="/" class="text-primary hover:underline">Go back home</a>
    </div>
  `,
})
export class NotFoundComponent { }
