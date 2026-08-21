import { Routes } from '@angular/router';
import { LegalPageComponent } from './pages/legal/legal-page.component';

export const appRoutes: Routes = [
  { path: 'terms', component: LegalPageComponent, data: { title: 'Terms of Service' } },
  { path: 'privacy', component: LegalPageComponent, data: { title: 'Privacy Policy' } },
  {
    // Browsing is public. Apply `authGuard` (core/guards/auth.guard.ts) per-route when a
    // feature actually needs a signed-in user; the topbar CTA drives sign-in otherwise.
    path: '',
    loadComponent: () => import('@/layout/components/app.layout').then((m) => m.AppLayout),
    children: [
      { path: '', redirectTo: 'home', pathMatch: 'full' },
      {
        path: 'home',
        loadComponent: () => import('@/features/home/pages/home/home.component').then((m) => m.HomeComponent),
      },
      {
        path: 'therapy/:id',
        loadComponent: () => import('@/features/therapy/pages/therapist-profile/therapist-profile.component').then((m) => m.TherapistProfileComponent),
      },
      {
        path: 'therapy',
        loadComponent: () => import('@/features/therapy/pages/therapy/therapy.component').then((m) => m.TherapyComponent),
      },
      {
        path: 'sleep',
        loadComponent: () => import('@/features/sleep/pages/sleep/sleep.component').then((m) => m.SleepComponent),
      },
      { path: 'sessions', redirectTo: 'therapy', pathMatch: 'full' },
      { path: 'sounds', redirectTo: 'sleep', pathMatch: 'full' },
      {
        path: 'about',
        loadComponent: () => import('@/features/about/pages/about/about.component').then((m) => m.AboutComponent),
      },
      {
        path: 'pricing',
        loadComponent: () => import('@/features/pricing/pages/pricing/pricing.component').then((m) => m.PricingComponent),
      },
      {
        path: 'profile',
        loadChildren: () => import('@/features/profile/profile.routes').then((m) => m.profileRoutes),
      },
      { path: 'notfound', loadComponent: () => import('@/pages/notfound/notfound.component').then((m) => m.NotFoundComponent) },
    ],
  },
  {
    path: 'auth',
    loadChildren: () => import('@/pages/auth/auth.routes').then((m) => m.authRoutes),
  },
  { path: '**', redirectTo: '/notfound' },
];
