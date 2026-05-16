import { ApplicationConfig, provideZonelessChangeDetection } from '@angular/core';
import { provideRouter, withInMemoryScrolling } from '@angular/router';
import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { providePrimeNG } from 'primeng/config';
import Aura from '@primeuix/themes/aura';
import { appRoutes } from './app.routes';
import { jwtInterceptor } from './core/interceptors/jwt.interceptor';
import { loaderInterceptor } from './core/interceptors/loader.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZonelessChangeDetection(),
    provideRouter(appRoutes, withInMemoryScrolling({ scrollPositionRestoration: 'top' })),
    provideHttpClient(withFetch(), withInterceptors([jwtInterceptor, loaderInterceptor])),
    provideAnimationsAsync(),
    providePrimeNG({
      theme: { preset: Aura, options: { darkModeSelector: '.app-dark' } },
    }),
  ],
};
