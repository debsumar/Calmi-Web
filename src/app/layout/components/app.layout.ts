import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AppTopbar } from './app.topbar';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [RouterOutlet, AppTopbar],
  template: `
    <div class="min-h-screen flex flex-col bg-[#f5f3f0] dark:bg-[#1a1a2e]">
      <app-topbar class="sticky top-0 z-50 w-full" />
      <main class="flex-1">
        <router-outlet />
      </main>
    </div>
  `,
})
export class AppLayout {}
