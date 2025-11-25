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
    loadComponent: () => import('./components/home/home').then((m) => m.HomeComponent),
    pathMatch: 'full',
    data: {
      preload: 'high',
      seo: {
        title: 'Daily English - Học tiếng Anh với AI | 250+ bài tập miễn phí',
        description:
          'Học tiếng Anh hiệu quả với 250+ bài tập dịch câu, phản hồi AI thông minh, lộ trình học tập có cấu trúc và hệ thống ôn tập thông minh. Hoàn toàn miễn phí!',
        keywords: [
          'học tiếng anh',
          'học tiếng anh online',
          'học tiếng anh miễn phí',
          'luyện dịch tiếng anh',
          'AI feedback',
          'bài tập tiếng anh',
          'học tiếng anh với AI',
          'daily english',
        ],
        structuredDataType: 'WebSite',
        vietnamese: {
          title: 'Daily English - Học tiếng Anh với AI | 250+ bài tập miễn phí',
          description:
            'Học tiếng Anh hiệu quả với 250+ bài tập dịch câu, phản hồi AI thông minh, lộ trình học tập có cấu trúc và hệ thống ôn tập thông minh. Hoàn toàn miễn phí!',
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
                'Daily English là nền tảng học tiếng Anh trực tuyến với 250+ bài tập dịch câu và phản hồi AI thông minh giúp bạn cải thiện kỹ năng tiếng Anh mỗi ngày.',
            },
            {
              question: 'Có miễn phí không?',
              answer:
                'Có, Daily English hoàn toàn miễn phí với 250+ bài tập dịch câu, phản hồi AI thông minh, lộ trình học tập, thử thách hàng ngày và hệ thống ôn tập.',
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
    redirectTo: '',
    pathMatch: 'full',
  },
  {
    path: 'index.html',
    redirectTo: '',
    pathMatch: 'full',
    data: {
      preload: 'high',
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
    data: {
      preload: 'high',
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
  },
  {
    path: 'exercise/create',
    loadComponent: () =>
      import('./components/exercise-creator/exercise-creator').then((m) => m.ExerciseCreator),
  },
  {
    path: 'exercise/edit/:id',
    loadComponent: () =>
      import('./components/exercise-creator/exercise-creator').then((m) => m.ExerciseCreator),
  },
  {
    path: 'exercise/:slug',
    loadComponent: () =>
      import('./components/exercise-detail/exercise-detail').then((m) => m.ExerciseDetailComponent),
    data: {
      preload: 'high',
    },
  },
  {
    path: 'exercises/:id/dictation',
    loadComponent: () =>
      import('./components/dictation-practice/dictation-practice').then((m) => m.DictationPracticeComponent),
    data: {
      seo: {
        title: 'Dictation Practice - Daily English',
        description: 'Practice dictation with your translated text',
        noindex: true,
      } as RouteSeoData,
    },
  },
  {
    path: 'profile',
    loadComponent: () =>
      import('./components/profile/profile').then((m) => m.ProfileComponent),
    data: {
      seo: {
        title: 'Hồ sơ cá nhân - Daily English',
        description:
          'Quản lý thông tin cá nhân, cài đặt tài khoản và tùy chỉnh trải nghiệm học tập của bạn',
        keywords: ['hồ sơ', 'tài khoản', 'cài đặt', 'profile'],
        noindex: true,
      } as RouteSeoData,
    },
  },
  {
    path: 'favorites',
    loadComponent: () =>
      import('./components/favorites/favorites').then((m) => m.FavoritesComponent),
    data: {
      seo: {
        title: 'Bài tập yêu thích - Daily English',
        description:
          'Danh sách các bài tập bạn đã đánh dấu yêu thích để dễ dàng truy cập và ôn tập lại',
        keywords: ['yêu thích', 'bookmark', 'bài tập đã lưu', 'favorites'],
        vietnamese: {
          title: 'Bài tập yêu thích - Daily English',
          description:
            'Quản lý danh sách bài tập yêu thích của bạn. Dễ dàng truy cập và ôn tập các bài tập quan trọng.',
          keywords: [
            'bài tập yêu thích',
            'bookmark tiếng anh',
            'bài tập đã lưu',
            'quản lý bài tập',
          ],
          breadcrumbs: [
            { name: 'Trang chủ', url: '/' },
            { name: 'Yêu thích', url: '/favorites' },
          ],
        },
      } as VietnameseRouteSeoData,
    },
  },
  {
    path: 'dashboard',
    loadComponent: () =>
      import('./components/dashboard/dashboard').then((m) => m.DashboardComponent),
    data: {
      preload: 'high',
      seo: {
        title: 'Bảng điều khiển - Daily English',
        description:
          'Theo dõi tiến độ học tập, xem thống kê chi tiết, phân tích điểm mạnh điểm yếu và lên kế hoạch học tập hiệu quả',
        keywords: ['bảng điều khiển', 'thống kê học tập', 'tiến độ', 'phân tích', 'dashboard'],
        vietnamese: {
          title: 'Bảng điều khiển - Daily English',
          description:
            'Bảng điều khiển tổng quan với thống kê chi tiết về tiến độ học tập, điểm số, streak và phân tích điểm mạnh điểm yếu của bạn.',
          keywords: [
            'bảng điều khiển học tập',
            'thống kê tiếng anh',
            'tiến độ học tập',
            'phân tích học tập',
            'dashboard học tiếng anh',
          ],
          breadcrumbs: [
            { name: 'Trang chủ', url: '/' },
            { name: 'Bảng điều khiển', url: '/dashboard' },
          ],
        },
      } as VietnameseRouteSeoData,
    },
  },
  {
    path: 'achievements',
    loadComponent: () =>
      import('./components/achievements/achievements').then((m) => m.Achievements),
    data: {
      seo: {
        title: 'Thành tựu - Daily English',
        description:
          'Mở khóa thành tựu, nhận huy hiệu và theo dõi tiến độ học tập của bạn. Hoàn thành thử thách để nhận phần thưởng',
        keywords: ['thành tựu', 'huy hiệu', 'phần thưởng', 'gamification', 'động lực học tập'],
        vietnamese: {
          title: 'Thành tựu - Daily English',
          description:
            'Hệ thống thành tựu với huy hiệu, điểm thưởng và thử thách đặc biệt. Theo dõi tiến độ và nhận động lực học tập mỗi ngày.',
          keywords: [
            'thành tựu tiếng anh',
            'huy hiệu học tập',
            'phần thưởng học tập',
            'gamification',
            'động lực học tiếng anh',
            'streak học tập',
          ],
          breadcrumbs: [
            { name: 'Trang chủ', url: '/' },
            { name: 'Thành tựu', url: '/achievements' },
          ],
          faqs: [
            {
              question: 'Làm thế nào để mở khóa thành tựu?',
              answer:
                'Hoàn thành các bài tập, duy trì streak học tập hàng ngày, và đạt các mục tiêu để mở khóa thành tựu và nhận huy hiệu.',
            },
            {
              question: 'Thành tựu có tác dụng gì?',
              answer:
                'Thành tựu giúp bạn theo dõi tiến độ, tạo động lực học tập và nhận phần thưởng như điểm thưởng, huy hiệu đặc biệt.',
            },
          ],
        },
      } as VietnameseRouteSeoData,
    },
  },
  {
    path: 'review-queue',
    loadComponent: () =>
      import('./components/review-queue/review-queue').then((m) => m.ReviewQueueComponent),
    data: {
      seo: {
        title: 'Hàng đợi ôn tập - Daily English',
        description:
          'Xem danh sách bài tập cần ôn tập với hệ thống lặp lại ngắt quãng thông minh. Tối ưu hóa việc ghi nhớ từ vựng và ngữ pháp',
        keywords: ['ôn tập tiếng anh', 'spaced repetition', 'lặp lại ngắt quãng', 'học tiếng anh hiệu quả'],
        vietnamese: {
          title: 'Hàng đợi ôn tập - Daily English',
          description:
            'Hệ thống ôn tập thông minh với thuật toán lặp lại ngắt quãng giúp bạn ghi nhớ lâu dài. Xem bài tập cần ôn và theo dõi tiến độ.',
          keywords: [
            'ôn tập tiếng anh',
            'hệ thống ôn tập',
            'spaced repetition',
            'lặp lại ngắt quãng',
            'học tiếng anh hiệu quả',
          ],
          breadcrumbs: [
            { name: 'Trang chủ', url: '/' },
            { name: 'Ôn tập', url: '/review-queue' },
          ],
        },
      } as VietnameseRouteSeoData,
    },
  },
  {
    path: 'error-patterns',
    loadComponent: () =>
      import('./components/error-patterns/error-patterns').then((m) => m.ErrorPatternsComponent),
    data: {
      seo: {
        title: 'Phân tích lỗi - Daily English',
        description:
          'Phân tích các lỗi thường gặp trong quá trình học và nhận đề xuất bài tập luyện tập có mục tiêu',
        keywords: ['phân tích lỗi', 'học từ lỗi sai', 'cải thiện tiếng anh', 'điểm yếu tiếng anh'],
        vietnamese: {
          title: 'Phân tích lỗi - Daily English',
          description:
            'Xác định điểm yếu trong tiếng Anh của bạn qua phân tích lỗi thông minh. Nhận bài tập luyện tập có mục tiêu để cải thiện nhanh chóng.',
          keywords: [
            'phân tích lỗi tiếng anh',
            'điểm yếu tiếng anh',
            'cải thiện tiếng anh',
            'học từ lỗi sai',
            'phân tích ngữ pháp',
          ],
          breadcrumbs: [
            { name: 'Trang chủ', url: '/' },
            { name: 'Phân tích lỗi', url: '/error-patterns' },
          ],
        },
      } as VietnameseRouteSeoData,
    },
  },
  {
    path: 'learning-path',
    loadComponent: () =>
      import('./components/learning-path/learning-path').then((m) => m.LearningPath),
    // canActivate: [authGuard],
    data: {
      preload: 'high',
      seo: {
        title: 'Lộ trình học tập - Daily English',
        description:
          'Theo dõi lộ trình học tập có cấu trúc, hoàn thành thử thách hàng ngày và đạt mục tiêu tuần với hệ thống học tập thông minh',
        keywords: ['lộ trình học', 'thử thách hàng ngày', 'mục tiêu học tập', 'học có hệ thống'],
        vietnamese: {
          title: 'Lộ trình học tập - Daily English',
          description:
            'Lộ trình học tập có cấu trúc từ cơ bản đến nâng cao. Hoàn thành thử thách hàng ngày, đặt mục tiêu tuần và theo dõi tiến độ của bạn.',
          keywords: [
            'lộ trình học tiếng anh',
            'thử thách hàng ngày',
            'mục tiêu học tập',
            'học có hệ thống',
            'tiến độ học tập',
          ],
          breadcrumbs: [
            { name: 'Trang chủ', url: '/' },
            { name: 'Lộ trình học tập', url: '/learning-path' },
          ],
        },
      } as VietnameseRouteSeoData,
    },
  },
  {
    path: 'about',
    loadComponent: () => import('./components/about/about').then((m) => m.AboutComponent),
    data: {
      preload: 'high',
      seo: {
        title: 'Về Daily English - Học tiếng Anh miễn phí với AI | Phương pháp học hiệu quả',
        description:
          'Daily English là nền tảng học tiếng Anh trực tuyến miễn phí với 250+ bài tập dịch câu, phản hồi AI thông minh từ GPT-4 và Gemini. Học tiếng Anh giao tiếp, ngữ pháp, từ vựng hiệu quả với lộ trình cá nhân hóa.',
        keywords: [
          'học tiếng anh online',
          'học tiếng anh miễn phí',
          'học tiếng anh với AI',
          'bài tập tiếng anh',
          'luyện dịch tiếng anh',
          'học tiếng anh giao tiếp',
          'ngữ pháp tiếng anh',
          'từ vựng tiếng anh',
          'ứng dụng học tiếng anh',
          'website học tiếng anh',
        ],
        structuredDataType: 'EducationalOrganization',
        vietnamese: {
          title: 'Về Daily English - Học tiếng Anh miễn phí với AI',
          description:
            'Tìm hiểu về Daily English - nền tảng học tiếng Anh trực tuyến miễn phí với AI thông minh. Phương pháp học hiệu quả, 250+ bài tập đa dạng và lộ trình cá nhân hóa.',
          keywords: [
            'về daily english',
            'học tiếng anh online',
            'học tiếng anh miễn phí',
            'học tiếng anh với AI',
            'phương pháp học tiếng anh',
            'website học tiếng anh',
          ],
          breadcrumbs: [
            { name: 'Trang chủ', url: '/' },
            { name: 'Về chúng tôi', url: '/about' },
          ],
        },
      } as VietnameseRouteSeoData,
    },
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
    redirectTo: 'home',
  },
];
