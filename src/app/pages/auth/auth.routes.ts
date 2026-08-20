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
      {
        path: 'signup',
        loadComponent: () => import('./signup/signup.component').then((m) => m.SignupComponent),
      },
      {
        path: 'forgot',
        loadComponent: () => import('./forgot-password/forgot-password.component').then((m) => m.ForgotPasswordComponent),
      },
    ],
  },
  {
    // Recovery links carry an authenticated recovery session; guestGuard must not redirect them.
    path: 'reset',
    loadComponent: () => import('./reset-password/reset-password.component').then((m) => m.ResetPasswordComponent),
  },
];
