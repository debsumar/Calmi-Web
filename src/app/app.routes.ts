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
        path: 'download',
        title: 'Download Calmi App | Calmi',
        loadComponent: () => import('@/features/download/pages/download/download.component').then((m) => m.DownloadComponent),
      },
      {
        path: 'journal',
        title: 'Journal | Calmi',
        loadComponent: () => import('@/features/journal/pages/journal/journal.component').then((m) => m.JournalComponent),
      },
      {
        path: 'rumi-ai',
        loadComponent: () => import('@/features/rumi-ai/pages/rumi-ai/rumi-ai.component').then((m) => m.RumiAiComponent),
      },
      { path: 'therapy/wellness-quiz', redirectTo: 'experts/wellness-quiz', pathMatch: 'full' },
      { path: 'therapy/:id', redirectTo: 'experts/:id', pathMatch: 'full' },
      { path: 'therapy', redirectTo: 'experts', pathMatch: 'full' },
      {
        path: 'experts/wellness-quiz',
        loadComponent: () => import('@/features/experts/pages/wellness-quiz/wellness-quiz.component').then((m) => m.WellnessQuizComponent),
      },
      {
        path: 'experts/:id',
        loadComponent: () => import('@/features/experts/pages/expert-profile/expert-profile.component').then((m) => m.ExpertProfileComponent),
      },
      {
        path: 'experts',
        loadComponent: () => import('@/features/experts/pages/experts/experts.component').then((m) => m.ExpertsComponent),
      },
      {
        path: 'sleep',
        loadComponent: () => import('@/features/sleep/pages/sleep/sleep.component').then((m) => m.SleepComponent),
      },
      { path: 'sessions', redirectTo: 'experts', pathMatch: 'full' },
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
