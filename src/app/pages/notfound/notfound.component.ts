import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';

@Component({
  selector: 'app-notfound',
  standalone: true,
  imports: [RouterLink, LucideAngularModule],
  host: { class: 'flex flex-1' },
  template: `
    <div class="flex-1 flex items-center justify-center bg-black p-8">
      <div class="relative bg-[#1a1a1a] rounded-3xl max-w-2xl w-full p-12 flex items-center overflow-hidden">
        <!-- Close button -->
        <a routerLink="/home" class="absolute top-6 right-6 text-white/80 hover:text-white">
          <lucide-icon name="x" [size]="24"></lucide-icon>
        </a>

        <!-- Hearts decoration -->
        <div class="relative w-1/2 h-64 shrink-0">
          <!-- Sparkles -->
          <svg class="absolute top-4 left-20 w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2l2.4 7.2L22 12l-7.6 2.8L12 22l-2.4-7.2L2 12l7.6-2.8z"/>
          </svg>
          <svg class="absolute bottom-16 left-4 w-3 h-3 text-white" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2l2.4 7.2L22 12l-7.6 2.8L12 22l-2.4-7.2L2 12l7.6-2.8z"/>
          </svg>
          <svg class="absolute bottom-8 right-4 w-6 h-6 text-white" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2l2.4 7.2L22 12l-7.6 2.8L12 22l-2.4-7.2L2 12l7.6-2.8z"/>
          </svg>

          <!-- Small heart (top) -->
          <svg class="absolute top-12 left-16 w-20 h-20" viewBox="0 0 64 64">
            <path d="M32 56S4 36 4 20C4 10 12 4 22 4c6 0 10 4 10 4s4-4 10-4c10 0 18 6 18 16C60 36 32 56 32 56z" fill="#e8724a"/>
            <path d="M32 56S32 4 42 4c10 0 18 6 18 16C60 36 32 56 32 56z" fill="#f5f5f5" opacity="0.5"/>
            <path d="M32 56S4 36 4 20C4 10 12 4 22 4c6 0 10 4 10 4z" fill="#e8724a"/>
            <path d="M32 56S32 4 22 4C12 4 4 10 4 20 4 36 32 56 32 56z" fill="#f2a0b0" opacity="0.6"/>
          </svg>

          <!-- Large heart (bottom) -->
          <svg class="absolute bottom-4 left-8 w-32 h-32" viewBox="0 0 64 64">
            <path d="M32 56S4 36 4 20C4 10 12 4 22 4c6 0 10 4 10 4s4-4 10-4c10 0 18 6 18 16C60 36 32 56 32 56z" fill="#f5b731"/>
            <path d="M32 56S32 4 42 4c10 0 18 6 18 16C60 36 32 56 32 56z" fill="#e8724a"/>
          </svg>

          <!-- Tiny heart (bottom-left) -->
          <svg class="absolute bottom-12 left-0 w-10 h-10" viewBox="0 0 64 64">
            <path d="M32 56S4 36 4 20C4 10 12 4 22 4c6 0 10 4 10 4s4-4 10-4c10 0 18 6 18 16C60 36 32 56 32 56z" fill="#f5b731"/>
            <path d="M32 56S32 4 42 4c10 0 18 6 18 16C60 36 32 56 32 56z" fill="#f5f5f5"/>
          </svg>
        </div>

        <!-- Text -->
        <div class="w-1/2">
          <h1 class="text-3xl md:text-4xl font-bold text-white leading-tight">
            Sorry, we're still working on it.
          </h1>
        </div>
      </div>
    </div>
  `,
})
export class NotFoundComponent {}
