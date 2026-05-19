import { Component, signal, inject, computed } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { ThemeService } from '../../core/services/theme.service';

@Component({
  selector: 'app-topbar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, LucideAngularModule],
  template: `
    <header class="h-16 flex items-center justify-between px-8 bg-white dark:bg-[#1a1a2e]">
      <a routerLink="/" class="flex items-center">
        <img src="assets/logo.avif" alt="Calmi" class="h-10">
      </a>
      <nav class="flex items-center gap-8">
        @for (link of navLinks(); track link.path) {
          <a [routerLink]="link.path" routerLinkActive="border-b-2 border-brand"
             class="text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-brand pb-1">
            {{ link.label }}
          </a>
        }
      </nav>
      <div class="flex items-center gap-4">
        <button (click)="themeService.toggle()"
                class="w-9 h-9 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-white/10"
                [title]="'Theme: ' + themeService.mode()">
          @switch (themeService.mode()) {
            @case ('light') { <lucide-icon name="moon" [size]="22" class="text-gray-900 dark:text-white"></lucide-icon> }
            @case ('dark') { <lucide-icon name="sun" [size]="22" class="text-gray-900 dark:text-white"></lucide-icon> }
            @case ('auto') { <lucide-icon name="monitor" [size]="22" class="text-gray-900 dark:text-white"></lucide-icon> }
          }
        </button>
        <button class="w-9 h-9 flex items-center justify-center rounded-full bg-gray-900 dark:bg-white text-white dark:text-gray-900">
          <lucide-icon name="user" [size]="18"></lucide-icon>
        </button>
      </div>
    </header>
  `,
})
export class AppTopbar {
  themeService = inject(ThemeService);

  navLinks = signal([
    { path: '/home', label: 'Home' },
    { path: '/sessions', label: 'Sessions' },
    { path: '/sounds', label: 'Sounds' },
    { path: '/about', label: 'About Us' },
    { path: '/pricing', label: 'Pricing' },
  ]);
}
