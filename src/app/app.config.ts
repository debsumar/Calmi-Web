import { ApplicationConfig, inject, provideAppInitializer, provideZonelessChangeDetection } from '@angular/core';
import { provideRouter, withInMemoryScrolling } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { providePrimeNG } from 'primeng/config';
import {
  provideLucideIcons,
  LucideBot, LucideCheckCheck,
  LucideArrowRight, LucideArrowLeft, LucideMoon, LucideUser, LucideFaceSlightlyFrowning, LucideBrain,
  LucideBriefcaseBusiness,
  LucideHeadphones, LucideCloud, LucideHeart, LucideZap, LucidePlay, LucideSmartphone,
  LucideCircleCheck, LucideLock, LucideSun, LucideSearch,
  LucideWavesHorizontal, LucideCloudRain, LucideTreePine, LucideAudioLines,
  LucideFlame, LucideX, LucideChevronLeft, LucideChevronRight, LucideLeaf,
  LucideWind, LucideSparkles, LucideSkipBack, LucideSkipForward,
  LucidePause, LucideVolume2, LucideEllipsisVertical, LucideChevronDown,
  LucideMenu, LucideRepeat, LucideShuffle, LucideLogOut, LucideCircleUser, LucideGraduationCap,
  LucideStar, LucideFunnel, LucideLightbulb, LucideClock, LucideMic, LucideMicOff,
  LucideHandHeart, LucideStethoscope, LucideSprout,
  LucideCalendarDays, LucideBadgePercent, LucideMinus,
  LucideLoaderCircle, LucideMailCheck, LucideCircleAlert, LucideSend, LucideArrowDown,
  LucideFlaskConical, LucideHeartCrack,
} from '@lucide/angular';
import { primeLicenseKey } from '../environments/license';
import { appRoutes } from './app.routes';
import { CalmiPreset } from './core/theme/calmi-preset';
import { jwtInterceptor } from './core/interceptors/jwt.interceptor';
import { loaderInterceptor } from './core/interceptors/loader.interceptor';
import { AuthService } from './core/services/auth.service';

export const appConfig: ApplicationConfig = {

  providers: [
    provideZonelessChangeDetection(),
    provideAppInitializer(() => inject(AuthService).restoreSession()),
    provideRouter(appRoutes, withInMemoryScrolling({ scrollPositionRestoration: 'enabled', anchorScrolling: 'enabled' })),
    provideHttpClient(withInterceptors([jwtInterceptor, loaderInterceptor])),
    providePrimeNG({
      license: primeLicenseKey,
      theme: { preset: CalmiPreset, options: { darkModeSelector: '.app-dark' } },
    }),
    provideLucideIcons(
      LucideBot, LucideCheckCheck,
      LucideArrowRight, LucideArrowLeft, LucideMoon, LucideUser, LucideFaceSlightlyFrowning, LucideBrain,
  LucideBriefcaseBusiness,
      LucideHeadphones, LucideCloud, LucideHeart, LucideZap, LucidePlay, LucideSmartphone,
      LucideCircleCheck, LucideLock, LucideSun, LucideSearch,
      LucideWavesHorizontal, LucideCloudRain, LucideTreePine, LucideAudioLines,
      LucideFlame, LucideX, LucideChevronLeft, LucideChevronRight, LucideLeaf,
      LucideWind, LucideSparkles, LucideSkipBack, LucideSkipForward,
      LucidePause, LucideVolume2, LucideEllipsisVertical, LucideChevronDown,
      LucideMenu, LucideRepeat, LucideShuffle, LucideLogOut, LucideCircleUser, LucideGraduationCap,
      LucideStar, LucideFunnel, LucideLightbulb, LucideClock, LucideMic, LucideMicOff,
      LucideHandHeart, LucideStethoscope, LucideSprout,
      LucideCalendarDays, LucideBadgePercent, LucideMinus,
      LucideLoaderCircle, LucideMailCheck, LucideCircleAlert, LucideSend, LucideArrowDown,
      LucideFlaskConical, LucideHeartCrack,
    ),
  ],
};

