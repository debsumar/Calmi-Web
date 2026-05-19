import { Component, signal, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { ThemeService } from '../../core/services/theme.service';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-topbar',
  imports: [RouterLink, RouterLinkActive, LucideAngularModule],
  template: `
    <header class="h-16 flex items-center justify-between px-4 md:px-8 bg-white dark:bg-[#090514]">
      <a routerLink="/" class="flex items-center">
        <img src="assets/logo.avif" alt="Calmi" class="h-8 md:h-10">
      </a>

      <!-- Desktop nav -->
      <nav class="hidden md:flex items-center gap-8">
        @for (link of navLinks(); track link.path) {
          <a [routerLink]="link.path" routerLinkActive="border-b-2 border-brand"
             class="text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-brand pb-1">
            {{ link.label }}
          </a>
        }
      </nav>

      <div class="flex items-center gap-3">
        <button (click)="themeService.toggle()"
                class="w-9 h-9 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-white/10"
                [title]="'Theme: ' + themeService.mode()">
          @switch (themeService.mode()) {
            @case ('light') { <lucide-icon name="moon" [size]="20" class="text-gray-900 dark:text-gray-100"></lucide-icon> }
            @case ('dark') { <lucide-icon name="sun" [size]="20" class="text-gray-900 dark:text-gray-100"></lucide-icon> }
            @case ('auto') { <lucide-icon name="monitor" [size]="20" class="text-gray-900 dark:text-gray-100"></lucide-icon> }
          }
        </button>
        <button (click)="authService.openLogin()" class="w-9 h-9 flex items-center justify-center rounded-full bg-gray-900 dark:bg-white text-white dark:text-gray-900">
          <lucide-icon name="user" [size]="16"></lucide-icon>
        </button>
        <!-- Mobile hamburger -->
        <button (click)="mobileMenuOpen.set(!mobileMenuOpen())" class="md:hidden w-9 h-9 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-white/10">
          <lucide-icon [name]="mobileMenuOpen() ? 'x' : 'menu'" [size]="22" class="text-gray-900 dark:text-gray-100"></lucide-icon>
        </button>
      </div>
    </header>

    <!-- Mobile menu overlay -->
    @if (mobileMenuOpen()) {
      <div class="md:hidden fixed inset-0 top-16 z-40 bg-white dark:bg-[#090514] p-6 flex flex-col gap-4 stagger-enter" style="--index:0">
        @for (link of navLinks(); track link.path; let i = $index) {
          <a [routerLink]="link.path" routerLinkActive="text-brand font-bold"
             (click)="mobileMenuOpen.set(false)"
             class="stagger-enter text-lg font-medium text-gray-800 dark:text-gray-200 hover:text-brand py-2 border-b border-gray-100 dark:border-white/10"
             [style.--index]="i + 1">
            {{ link.label }}
          </a>
        }
      </div>
    }
  `,
})
export class AppTopbar {
  themeService = inject(ThemeService);
  authService = inject(AuthService);
  mobileMenuOpen = signal(false);

  navLinks = signal([
    { path: '/home', label: 'Home' },
    { path: '/sessions', label: 'Sessions' },
    { path: '/sounds', label: 'Sounds' },
    { path: '/about', label: 'About Us' },
    { path: '/pricing', label: 'Pricing' },
  ]);
}
