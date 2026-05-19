import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';

@Component({
  selector: 'app-notfound',
  standalone: true,
  imports: [RouterLink, LucideAngularModule],
  host: { class: 'flex flex-1' },
  template: `
    <div class="flex-1 min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center bg-[#f5f3f0] dark:bg-[#1a1a2e] px-6 py-12 text-center relative overflow-hidden transition-colors duration-300">
      
      <!-- Back Button -->
      <a routerLink="/home" class="absolute top-6 right-8 text-gray-400 hover:text-brand dark:hover:text-white transition-colors duration-300 z-10">
        <lucide-icon name="x" [size]="28"></lucide-icon>
      </a>

      <!-- Animated Illustration Container -->
      <div class="relative w-72 h-72 mb-8 flex items-center justify-center">
        <!-- Floating Sparkles/Stars -->
        <svg class="absolute top-4 left-10 w-6 h-6 text-brand/60 dark:text-brand/60 animate-sparkle" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2l2.4 7.2L22 12l-7.6 2.8L12 22l-2.4-7.2L2 12l7.6-2.8z"/>
        </svg>
        <svg class="absolute bottom-16 left-6 w-4 h-4 text-brand-dark/50 dark:text-white/40 animate-sparkle-delayed" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2l2.4 7.2L22 12l-7.6 2.8L12 22l-2.4-7.2L2 12l7.6-2.8z"/>
        </svg>
        <svg class="absolute top-12 right-12 w-8 h-8 text-[#f5b731] animate-sparkle" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2l2.4 7.2L22 12l-7.6 2.8L12 22l-2.4-7.2L2 12l7.6-2.8z"/>
        </svg>

        <!-- Ambient Glow behind the heart -->
        <div class="absolute w-48 h-48 rounded-full bg-brand/10 dark:bg-brand/20 blur-3xl animate-pulse-glow"></div>

        <!-- Main Animated Heart Group -->
        <div class="relative w-48 h-48 animate-float">
          <!-- Back shadow/glow layer -->
          <svg class="absolute inset-0 w-full h-full drop-shadow-[0_10px_20px_rgba(232,114,74,0.3)] dark:drop-shadow-[0_10px_30px_rgba(245,183,49,0.2)]" viewBox="0 0 64 64">
            <path d="M32 56S4 36 4 20C4 10 12 4 22 4c6 0 10 4 10 4s4-4 10-4c10 0 18 6 18 16C60 36 32 56 32 56z" fill="url(#heartGradient)"/>
          </svg>

          <!-- Intersecting split heart design -->
          <svg class="absolute inset-0 w-full h-full" viewBox="0 0 64 64">
            <defs>
              <linearGradient id="heartGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stop-color="#f5b731" />
                <stop offset="100%" stop-color="#e8724a" />
              </linearGradient>
            </defs>
            <!-- Left Half (Soft Pink/Red tint) -->
            <path d="M32 56S4 36 4 20C4 10 12 4 22 4c6 0 10 4 10 4z" fill="#f2a0b0" opacity="0.85"/>
            <!-- Right Half (Rich Warm Orange) -->
            <path d="M32 56S32 4 42 4c10 0 18 6 18 16C60 36 32 56 32 56z" fill="url(#heartGradient)"/>
          </svg>

          <!-- Floating Tiny Heart (overlapping top-left) -->
          <svg class="absolute -top-4 -left-4 w-12 h-12 animate-float-tiny" viewBox="0 0 64 64">
            <path d="M32 56S4 36 4 20C4 10 12 4 22 4c6 0 10 4 10 4s4-4 10-4c10 0 18 6 18 16C60 36 32 56 32 56z" fill="#f2a0b0"/>
            <path d="M32 56S32 4 42 4c10 0 18 6 18 16C60 36 32 56 32 56z" fill="#e8724a" opacity="0.6"/>
          </svg>
        </div>
      </div>

      <!-- Text Content -->
      <div class="max-w-md animate-fade-in-up">
        <h1 class="text-3xl md:text-4xl font-extrabold text-gray-900 dark:text-white leading-tight mb-4 tracking-tight">
          Under Construction
        </h1>
        <p class="text-gray-500 dark:text-gray-400 text-lg mb-8 leading-relaxed font-medium">
          We're carefully designing this space to bring you a calming, premium experience. Thank you for your patience!
        </p>

        <!-- Back to Home Action Button -->
        <div class="flex justify-center">
          <a routerLink="/home" class="inline-flex items-center gap-2 px-8 py-3.5 bg-brand hover:bg-brand-dark text-white font-semibold rounded-full shadow-lg shadow-brand/20 dark:shadow-none hover:shadow-xl transition-all duration-300 group">
            <span>Back to Home</span>
            <lucide-icon name="arrow-right" [size]="18" class="group-hover:translate-x-1 transition-transform"></lucide-icon>
          </a>
        </div>
      </div>

    </div>
  `,
  styles: [`
    @keyframes float {
      0%, 100% { transform: translateY(0) rotate(0deg); }
      50% { transform: translateY(-10px) rotate(2deg); }
    }
    @keyframes float-tiny {
      0%, 100% { transform: translateY(0) scale(1); }
      50% { transform: translateY(-6px) scale(1.05); }
    }
    @keyframes sparkle {
      0%, 100% { transform: scale(0.6) rotate(0deg); opacity: 0.5; }
      50% { transform: scale(1.1) rotate(180deg); opacity: 1; }
    }
    @keyframes sparkle-delayed {
      0%, 100% { transform: scale(1) rotate(180deg); opacity: 0.8; }
      50% { transform: scale(0.5) rotate(0deg); opacity: 0.3; }
    }
    @keyframes pulse-glow {
      0%, 100% { transform: scale(1); opacity: 0.3; }
      50% { transform: scale(1.2); opacity: 0.6; }
    }
    @keyframes fadeInUp {
      from { transform: translateY(20px); opacity: 0; }
      to { transform: translateY(0); opacity: 1; }
    }

    .animate-float {
      animation: float 6s ease-in-out infinite;
    }
    .animate-float-tiny {
      animation: float-tiny 4s ease-in-out infinite;
    }
    .animate-sparkle {
      animation: sparkle 3s ease-in-out infinite;
    }
    .animate-sparkle-delayed {
      animation: sparkle-delayed 4s ease-in-out infinite;
    }
    .animate-pulse-glow {
      animation: pulse-glow 5s ease-in-out infinite;
    }
    .animate-fade-in-up {
      animation: fadeInUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards;
    }
  `]
})
export class NotFoundComponent {}
