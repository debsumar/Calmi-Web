import { Routes } from '@angular/router';
import { guestGuard } from '@/core/guards/auth.guard';

export const authRoutes: Routes = [
  {
    path: '',
    canActivate: [guestGuard],
    canActivateChild: [guestGuard],
    children: [
      {
        path: 'identify',
        loadComponent: () => import('./identification/identification.component').then((m) => m.IdentificationComponent),
      },
      {
        path: 'login',
        loadComponent: () => import('./login/login.component').then((m) => m.LoginComponent),
      },
    ],
  },
];
