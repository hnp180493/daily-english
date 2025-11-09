import { Routes } from '@angular/router';
import { authGuard } from './guards/auth.guard';
import { loginGuard } from './guards/login.guard';
import { RouteSeoData } from './services/seo.service';

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
    data: {
      seo: {
        title: 'Đăng nhập',
        description: 'Đăng nhập vào Daily English để bắt đầu học tiếng Anh',
        noindex: true,
      } as RouteSeoData,
    },
  },
  {
    path: 'home',
    loadComponent: () => import('./components/home/home').then((m) => m.HomeComponent),
    canActivate: [authGuard],
    data: {
      seo: {
        title: 'Trang chủ',
        description:
          'Học tiếng Anh mỗi ngày với bài tập dịch câu, phản hồi AI thông minh, và theo dõi tiến độ học tập của bạn',
        keywords: [
          'học tiếng anh',
          'luyện dịch',
          'AI feedback',
          'học tiếng anh online',
          'daily english',
        ],
        structuredDataType: 'WebSite',
      } as RouteSeoData,
    },
  },

  {
    path: 'exercises',
    loadComponent: () =>
      import('./components/exercise-list/exercise-list').then((m) => m.ExerciseListComponent),
    canActivate: [authGuard],
    data: {
      seo: {
        title: 'Bài tập tiếng Anh',
        description:
          'Khám phá thư viện bài tập tiếng Anh đa dạng với nhiều chủ đề và cấp độ khác nhau. Luyện tập dịch câu và nhận phản hồi AI',
        keywords: [
          'bài tập tiếng anh',
          'luyện dịch tiếng anh',
          'học tiếng anh online',
          'thư viện bài tập',
        ],
        structuredDataType: 'EducationalOrganization',
      } as RouteSeoData,
    },
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
    loadComponent: () => import('./components/guide/guide').then((m) => m.GuideComponent),
    data: {
      seo: {
        title: 'Hướng dẫn sử dụng',
        description:
          'Hướng dẫn chi tiết cách sử dụng Daily English, làm bài tập, nhận phản hồi AI và theo dõi tiến độ học tập',
        keywords: ['hướng dẫn', 'cách sử dụng', 'daily english', 'học tiếng anh'],
        structuredDataType: 'EducationalOrganization',
      } as RouteSeoData,
    },
  },
  {
    path: '**',
    redirectTo: 'login',
  },
];
