import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AppTopbar } from './app.topbar';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [RouterOutlet, AppTopbar],
  template: `
    <div class="min-h-screen flex flex-col bg-[#f5f3f0]">
      <app-topbar />
      <main class="flex-1">
        <router-outlet />
      </main>
    </div>
  `,
})
export class AppLayout {}
