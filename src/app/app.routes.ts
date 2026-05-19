import { Routes } from '@angular/router';

export const appRoutes: Routes = [
  {
    path: '',
    loadComponent: () => import('@/layout/components/app.layout').then((m) => m.AppLayout),
    children: [
      { path: '', redirectTo: 'home', pathMatch: 'full' },
      {
        path: 'home',
        loadComponent: () => import('@/features/home/pages/home/home.component').then((m) => m.HomeComponent),
      },
      {
        path: 'sounds',
        loadComponent: () => import('@/features/sounds/pages/sounds/sounds.component').then((m) => m.SoundsComponent),
      },
      {
        path: 'about',
        loadComponent: () => import('@/features/about/pages/about/about.component').then((m) => m.AboutComponent),
      },
      {
        path: 'pricing',
        loadComponent: () => import('@/features/pricing/pages/pricing/pricing.component').then((m) => m.PricingComponent),
      },
      { path: 'notfound', loadComponent: () => import('@/pages/notfound/notfound.component').then((m) => m.NotFoundComponent) },
    ],
  },
  { path: 'auth', loadChildren: () => import('@/pages/auth/auth.routes').then((m) => m.authRoutes) },
  { path: '**', redirectTo: '/notfound' },
];
