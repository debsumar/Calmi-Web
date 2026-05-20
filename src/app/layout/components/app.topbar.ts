import { Component, signal, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { ThemeService } from '../../core/services/theme.service';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-topbar',
  imports: [RouterLink, RouterLinkActive, LucideAngularModule],
  template: `
    <header class="h-16 flex items-center justify-between px-4 md:px-8 bg-white/80 dark:bg-[#090514]/80 backdrop-blur-md border-b border-gray-100 dark:border-white/5">
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
        <div class="hidden md:block w-px h-5 bg-gray-200 dark:bg-white/10"></div>
        <button (click)="themeService.toggle()"
                class="w-9 h-9 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-white/10"
                [title]="'Theme: ' + themeService.mode()">
          @switch (themeService.mode()) {
            @case ('light') { <lucide-icon name="moon" [size]="20" class="text-gray-900 dark:text-gray-100"></lucide-icon> }
            @case ('dark') { <lucide-icon name="sun" [size]="20" class="text-gray-900 dark:text-gray-100"></lucide-icon> }
            @case ('auto') { <lucide-icon name="monitor" [size]="20" class="text-gray-900 dark:text-gray-100"></lucide-icon> }
          }
        </button>

        @if (authService.currentUser(); as user) {
          <div class="relative">
            <!-- Profile Trigger -->
            <button (click)="dropdownOpen.set(!dropdownOpen())" 
                    class="w-9 h-9 flex items-center justify-center rounded-full overflow-hidden border border-gray-200 dark:border-white/10 hover:ring-2 hover:ring-brand/50 transition-all">
              @if (user.user_metadata['avatar_url']) {
                <img [src]="user.user_metadata['avatar_url']" alt="Avatar" class="w-full h-full object-cover">
              } @else {
                <div class="w-full h-full bg-brand/20 text-brand flex items-center justify-center font-bold text-sm">
                  {{ (user.user_metadata['full_name']?.[0] || user.email?.[0] || 'U').toUpperCase() }}
                </div>
              }
            </button>

            <!-- Dropdown Menu -->
            @if (dropdownOpen()) {
              <!-- Click outside overlay to close -->
              <div class="fixed inset-0 z-10" (click)="dropdownOpen.set(false)"></div>
              
              <div class="absolute right-0 mt-2 w-56 rounded-xl bg-white dark:bg-[#120822] border border-gray-100 dark:border-white/5 p-2 shadow-xl z-20 animate-in fade-in slide-in-from-top-2 duration-200">
                <div class="px-3 py-2 border-b border-gray-100 dark:border-white/5 mb-1">
                  <p class="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
                    {{ user.user_metadata['full_name'] || 'User' }}
                  </p>
                  <p class="text-xs text-gray-500 dark:text-gray-400 truncate">
                    {{ user.email }}
                  </p>
                </div>
                <button (click)="logout()" 
                        class="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-lg transition-colors text-left">
                  <lucide-icon name="log-out" [size]="16"></lucide-icon>
                  Logout
                </button>
              </div>
            }
          </div>
        } @else {
          <button (click)="authService.openLogin()" class="w-9 h-9 flex items-center justify-center rounded-full bg-gray-900 dark:bg-white text-white dark:text-gray-900 hover:scale-105 transition-all">
            <lucide-icon name="user" [size]="16"></lucide-icon>
          </button>
        }

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
  dropdownOpen = signal(false);

  navLinks = signal([
    { path: '/home', label: 'Home' },
    { path: '/sessions', label: 'Sessions' },
    { path: '/sounds', label: 'Sounds' },
    { path: '/about', label: 'About Us' },
    { path: '/pricing', label: 'Pricing' },
  ]);

  logout(): void {
    this.authService.signOut();
    this.dropdownOpen.set(false);
  }
}
