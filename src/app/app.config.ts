import { ApplicationConfig, provideZonelessChangeDetection } from '@angular/core';
import { provideRouter, withInMemoryScrolling } from '@angular/router';
import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { providePrimeNG } from 'primeng/config';
import { LUCIDE_ICONS, LucideIconProvider } from 'lucide-angular';
import { ArrowRight, Moon, User, Frown, Brain, Headphones, Cloud, Heart, Zap, Play, CircleCheck, Lock, Sun, Monitor, Search, Waves, CloudRain, TreePine, AudioLines, Flame, X, ChevronLeft, ChevronRight, Leaf, Wind, Sparkles, SkipBack, SkipForward, Pause, Volume2, MoreVertical, ChevronDown } from 'lucide-angular';
import Aura from '@primeuix/themes/aura';
import { appRoutes } from './app.routes';
import { jwtInterceptor } from './core/interceptors/jwt.interceptor';
import { loaderInterceptor } from './core/interceptors/loader.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZonelessChangeDetection(),
    provideRouter(appRoutes, withInMemoryScrolling({ scrollPositionRestoration: 'enabled', anchorScrolling: 'enabled' })),
    provideHttpClient(withFetch(), withInterceptors([jwtInterceptor, loaderInterceptor])),
    provideAnimationsAsync(),
    providePrimeNG({
      theme: { preset: Aura, options: { darkModeSelector: '.app-dark' } },
    }),
    { provide: LUCIDE_ICONS, multi: true, useValue: new LucideIconProvider({ ArrowRight, Moon, User, Frown, Brain, Headphones, Cloud, Heart, Zap, Play, CircleCheck, Lock, Sun, Monitor, Search, Waves, CloudRain, TreePine, AudioLines, Flame, X, ChevronLeft, ChevronRight, Leaf, Wind, Sparkles, SkipBack, SkipForward, Pause, Volume2, MoreVertical, ChevronDown }) },
  ],
};
