import { Routes } from '@angular/router';
import { authGuard } from '@/core/guards/auth.guard';

export const profileRoutes: Routes = [
  {
    path: '',
    canActivate: [authGuard],
    canActivateChild: [authGuard],
    children: [
      {
        path: '',
        loadComponent: () => import('./pages/profile/profile.component').then((m) => m.ProfileComponent),
      },
    ],
  },
];
