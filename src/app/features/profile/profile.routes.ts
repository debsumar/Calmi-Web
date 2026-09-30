import { inject } from '@angular/core';
import { Routes } from '@angular/router';
import { authGuard } from '@/core/guards/auth.guard';
import { AuthService } from '@/core/services/auth.service';

export const profileRoutes: Routes = [
  {
    path: '',
    canActivate: [authGuard],
    canActivateChild: [authGuard],
    children: [
      {
        path: '',
        canMatch: [() => inject(AuthService).selectedRole() === 'specialist'],
        loadComponent: () =>
          import('./pages/specialist-profile/specialist-profile.component').then((m) => m.SpecialistProfileComponent),
      },
      {
        path: '',
        loadComponent: () => import('./pages/profile/profile.component').then((m) => m.ProfileComponent),
      },
    ],
  },
];
