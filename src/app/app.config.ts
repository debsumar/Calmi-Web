import { ApplicationConfig, provideZonelessChangeDetection } from '@angular/core';
import { provideRouter, withInMemoryScrolling } from '@angular/router';
import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { providePrimeNG } from 'primeng/config';
import {
  provideLucideIcons,
  LucideArrowRight, LucideMoon, LucideUser, LucideFrown, LucideBrain,
  LucideHeadphones, LucideCloud, LucideHeart, LucideZap, LucidePlay,
  LucideCircleCheck, LucideLock, LucideSun, LucideSearch,
  LucideWaves, LucideCloudRain, LucideTreePine, LucideAudioLines,
  LucideFlame, LucideX, LucideChevronLeft, LucideChevronRight, LucideLeaf,
  LucideWind, LucideSparkles, LucideSkipBack, LucideSkipForward,
  LucidePause, LucideVolume2, LucideMoreVertical, LucideChevronDown,
  LucideMenu, LucideRepeat, LucideShuffle, LucideLogOut, LucideGraduationCap,
  LucideStar, LucideFilter,
  LucideHandHeart, LucideStethoscope, LucideSprout,
  LucideCalendarDays, LucideBadgePercent, LucideMinus,
  LucideLoaderCircle, LucideMailCheck, LucideCircleAlert,
} from '@lucide/angular';
import { primeLicenseKey } from '../environments/license';
import { appRoutes } from './app.routes';
import { CalmiPreset } from './core/theme/calmi-preset';
import { jwtInterceptor } from './core/interceptors/jwt.interceptor';
import { loaderInterceptor } from './core/interceptors/loader.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZonelessChangeDetection(),
    provideRouter(appRoutes, withInMemoryScrolling({ scrollPositionRestoration: 'enabled', anchorScrolling: 'enabled' })),
    provideHttpClient(withFetch(), withInterceptors([jwtInterceptor, loaderInterceptor])),
    provideAnimationsAsync(),
    providePrimeNG({
      license: primeLicenseKey,
      theme: { preset: CalmiPreset, options: { darkModeSelector: '.app-dark' } },
    }),
    provideLucideIcons(
      LucideArrowRight, LucideMoon, LucideUser, LucideFrown, LucideBrain,
      LucideHeadphones, LucideCloud, LucideHeart, LucideZap, LucidePlay,
      LucideCircleCheck, LucideLock, LucideSun, LucideSearch,
      LucideWaves, LucideCloudRain, LucideTreePine, LucideAudioLines,
      LucideFlame, LucideX, LucideChevronLeft, LucideChevronRight, LucideLeaf,
      LucideWind, LucideSparkles, LucideSkipBack, LucideSkipForward,
      LucidePause, LucideVolume2, LucideMoreVertical, LucideChevronDown,
      LucideMenu, LucideRepeat, LucideShuffle, LucideLogOut, LucideGraduationCap,
      LucideStar, LucideFilter,
      LucideHandHeart, LucideStethoscope, LucideSprout,
      LucideCalendarDays, LucideBadgePercent, LucideMinus,
      LucideLoaderCircle, LucideMailCheck, LucideCircleAlert,
    ),
  ],
};

