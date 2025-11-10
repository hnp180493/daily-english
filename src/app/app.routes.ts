import { Routes } from '@angular/router';
import { authGuard } from './guards/auth.guard';
import { loginGuard } from './guards/login.guard';
import { RouteSeoData } from './services/seo.service';

/**
 * Vietnamese route SEO data interface
 */
export interface VietnameseRouteSeoData extends RouteSeoData {
  vietnamese?: {
    title: string;
    description: string;
    keywords: string[];
    breadcrumbs?: Array<{ name: string; url: string }>;
    faqs?: Array<{ question: string; answer: string }>;
  };
}

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
        title: 'Trang chủ - Daily English',
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
        vietnamese: {
          title: 'Trang chủ - Daily English',
          description:
            'Học tiếng Anh mỗi ngày với bài tập dịch câu, phản hồi AI thông minh, và theo dõi tiến độ học tập của bạn',
          keywords: [
            'học tiếng anh',
            'học tiếng anh online',
            'học tiếng anh miễn phí',
            'luyện dịch tiếng anh',
            'học tiếng anh với AI',
            'bài tập tiếng anh',
          ],
          breadcrumbs: [{ name: 'Trang chủ', url: '/' }],
          faqs: [
            {
              question: 'Daily English là gì?',
              answer:
                'Daily English là nền tảng học tiếng Anh trực tuyến với bài tập dịch câu và phản hồi AI thông minh giúp bạn cải thiện kỹ năng tiếng Anh mỗi ngày.',
            },
            {
              question: 'Có miễn phí không?',
              answer:
                'Có, Daily English cung cấp nhiều bài tập miễn phí để bạn luyện tập tiếng Anh hàng ngày.',
            },
            {
              question: 'AI hoạt động như thế nào?',
              answer:
                'AI của chúng tôi phân tích bản dịch của bạn, so sánh với đáp án chuẩn, và đưa ra phản hồi chi tiết về ngữ pháp, từ vựng và cấu trúc câu.',
            },
          ],
        },
      } as VietnameseRouteSeoData,
    },
  },

  {
    path: 'exercises',
    loadComponent: () =>
      import('./components/exercise-list/exercise-list').then((m) => m.ExerciseListComponent),
    canActivate: [authGuard],
    data: {
      seo: {
        title: 'Bài tập tiếng Anh - Daily English',
        description:
          'Khám phá thư viện bài tập tiếng Anh đa dạng với nhiều chủ đề và cấp độ khác nhau. Luyện tập dịch câu và nhận phản hồi AI',
        keywords: [
          'bài tập tiếng anh',
          'luyện dịch tiếng anh',
          'học tiếng anh online',
          'thư viện bài tập',
        ],
        structuredDataType: 'EducationalOrganization',
        vietnamese: {
          title: 'Bài tập tiếng Anh - Daily English',
          description:
            'Tổng hợp bài tập tiếng Anh từ cơ bản đến nâng cao với phản hồi AI thông minh. Luyện dịch câu, học từ vựng và ngữ pháp hiệu quả.',
          keywords: [
            'bài tập tiếng anh',
            'luyện dịch tiếng anh',
            'bài tập dịch có đáp án',
            'học tiếng anh online',
            'bài tập tiếng anh sơ cấp',
            'bài tập tiếng anh trung cấp',
            'bài tập tiếng anh cao cấp',
          ],
          breadcrumbs: [
            { name: 'Trang chủ', url: '/' },
            { name: 'Bài tập', url: '/exercises' },
          ],
          faqs: [
            {
              question: 'Làm thế nào để bắt đầu làm bài tập?',
              answer:
                'Chọn một bài tập từ danh sách, đọc câu tiếng Anh và nhập bản dịch tiếng Việt của bạn. AI sẽ phân tích và đưa ra phản hồi chi tiết.',
            },
            {
              question: 'Có bao nhiêu cấp độ bài tập?',
              answer:
                'Chúng tôi có 3 cấp độ: Sơ cấp (Beginner), Trung cấp (Intermediate), và Cao cấp (Advanced) phù hợp với mọi trình độ.',
            },
            {
              question: 'Tôi có thể tạo bài tập riêng không?',
              answer:
                'Có, bạn có thể tạo bài tập tùy chỉnh với nội dung của riêng mình để luyện tập.',
            },
          ],
        },
      } as VietnameseRouteSeoData,
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
        title: 'Hướng dẫn sử dụng - Daily English',
        description:
          'Hướng dẫn chi tiết cách sử dụng Daily English, làm bài tập, nhận phản hồi AI và theo dõi tiến độ học tập',
        keywords: ['hướng dẫn', 'cách sử dụng', 'daily english', 'học tiếng anh'],
        structuredDataType: 'EducationalOrganization',
        vietnamese: {
          title: 'Hướng dẫn sử dụng - Daily English',
          description:
            'Hướng dẫn chi tiết cách sử dụng Daily English: làm bài tập, nhận phản hồi AI, theo dõi tiến độ và tối ưu hóa việc học tiếng Anh của bạn.',
          keywords: [
            'hướng dẫn daily english',
            'cách sử dụng daily english',
            'hướng dẫn học tiếng anh',
            'cách làm bài tập tiếng anh',
            'hướng dẫn AI feedback',
          ],
          breadcrumbs: [
            { name: 'Trang chủ', url: '/' },
            { name: 'Hướng dẫn', url: '/guide' },
          ],
          faqs: [
            {
              question: 'Làm thế nào để bắt đầu?',
              answer:
                'Đăng nhập vào tài khoản, chọn bài tập phù hợp với trình độ của bạn, và bắt đầu dịch các câu tiếng Anh.',
            },
            {
              question: 'Phản hồi AI có chính xác không?',
              answer:
                'AI của chúng tôi được huấn luyện trên dữ liệu lớn và cung cấp phản hồi chính xác về ngữ pháp, từ vựng và cấu trúc câu.',
            },
          ],
        },
      } as VietnameseRouteSeoData,
    },
  },
  {
    path: '**',
    redirectTo: 'login',
  },
];
