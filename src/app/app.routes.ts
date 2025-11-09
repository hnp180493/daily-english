import { Routes } from '@angular/router';
import { authGuard } from './guards/auth.guard';
import { loginGuard } from './guards/login.guard';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'home',
    pathMatch: 'full',
  },
  {
    path: 'login',
    loadComponent: () => import('./components/login/login').then((m) => m.LoginComponent),
    canActivate: [loginGuard],
  },
  {
    path: 'home',
    loadComponent: () => import('./components/home/home').then((m) => m.HomeComponent),
    canActivate: [authGuard],
  },

  {
    path: 'exercises',
    loadComponent: () =>
      import('./components/exercise-list/exercise-list').then((m) => m.ExerciseListComponent),
    canActivate: [authGuard],
  },
  {
    path: 'exercises/custom',
    loadComponent: () =>
      import('./components/custom-exercise-library/custom-exercise-library').then((m) => m.CustomExerciseLibrary),
    canActivate: [authGuard],
  },
  {
    path: 'exercise/create',
    loadComponent: () =>
      import('./components/exercise-creator/exercise-creator').then((m) => m.ExerciseCreator),
    canActivate: [authGuard],
  },
  {
    path: 'exercise/edit/:id',
    loadComponent: () =>
      import('./components/exercise-creator/exercise-creator').then((m) => m.ExerciseCreator),
    canActivate: [authGuard],
  },
  {
    path: 'exercise/:id',
    loadComponent: () =>
      import('./components/exercise-detail/exercise-detail').then((m) => m.ExerciseDetailComponent),
    canActivate: [authGuard],
  },
  {
    path: 'profile',
    loadComponent: () =>
      import('./components/profile/profile').then((m) => m.ProfileComponent),
    canActivate: [authGuard],
  },
  {
    path: 'favorites',
    loadComponent: () =>
      import('./components/favorites/favorites').then((m) => m.FavoritesComponent),
    canActivate: [authGuard],
  },
  {
    path: 'dashboard',
    loadComponent: () =>
      import('./components/dashboard/dashboard').then((m) => m.DashboardComponent),
    canActivate: [authGuard],
  },
  {
    path: 'achievements',
    loadComponent: () =>
      import('./components/achievements/achievements').then((m) => m.Achievements),
    canActivate: [authGuard],
  },
  {
    path: 'guide',
    loadComponent: () =>
      import('./components/guide/guide').then((m) => m.GuideComponent),
  },
  {
    path: '**',
    redirectTo: 'login',
  },
];
