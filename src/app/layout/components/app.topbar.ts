import { Component, signal } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

@Component({
  selector: 'app-topbar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  template: `
    <header class="h-16 flex items-center justify-between px-8 bg-white">
      <a routerLink="/" class="text-2xl font-bold text-[#7c6fa0]">Calmi</a>
      <nav class="flex items-center gap-8">
        @for (link of navLinks(); track link.path) {
          <a [routerLink]="link.path" routerLinkActive="border-b-2 border-[#7c6fa0]"
             class="text-sm font-medium text-gray-700 hover:text-[#7c6fa0] pb-1">
            {{ link.label }}
          </a>
        }
      </nav>
      <div class="flex items-center gap-3">
        <button class="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100">
          <i class="pi pi-moon text-gray-700"></i>
        </button>
        <button class="w-8 h-8 flex items-center justify-center rounded-full bg-gray-800 text-white">
          <i class="pi pi-user text-sm"></i>
        </button>
      </div>
    </header>
  `,
})
export class AppTopbar {
  navLinks = signal([
    { path: '/home', label: 'Home' },
    { path: '/sessions', label: 'Sessions' },
    { path: '/sounds', label: 'Sounds' },
    { path: '/about', label: 'About Us' },
    { path: '/pricing', label: 'Pricing' },
  ]);
}
