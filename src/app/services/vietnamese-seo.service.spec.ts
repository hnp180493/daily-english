import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { Meta } from '@angular/platform-browser';
import { DOCUMENT } from '@angular/common';
import { VietnameseSeoService } from './vietnamese-seo.service';
import { SeoService } from './seo.service';

describe('VietnameseSeoService', () => {
  let service: VietnameseSeoService;
  let httpMock: HttpTestingController;
  let metaService: jasmine.SpyObj<Meta>;
  let mockDocument: any;

  const mockConfig = {
    keywords: {
      primary: ['học tiếng anh', 'luyện dịch tiếng anh'],
      secondary: ['học tiếng anh với AI'],
      longTail: ['học tiếng anh giao tiếp cơ bản'],
    },
    categories: {
      translation: {
        vi: 'Dịch câu',
        keywords: ['luyện dịch', 'dịch tiếng anh'],
        description: 'Luyện tập dịch câu tiếng Anh',
      },
    },
    proficiencyLevels: {
      beginner: {
        vi: 'Sơ cấp',
        description: 'Dành cho người mới bắt đầu',
        keywords: ['tiếng anh cơ bản'],
      },
    },
    metaTemplates: {
      exercise: {
        title: '{exerciseName} - Bài tập {category} {level} - Daily English',
        description: 'Luyện tập {category} tiếng Anh cấp độ {level}',
      },
      category: {
        title: 'Bài tập {category} tiếng Anh - Daily English',
        description: 'Tổng hợp bài tập {category} tiếng Anh',
      },
      level: {
        title: 'Bài tập tiếng Anh {level} - Daily English',
        description: 'Bài tập tiếng Anh dành cho người {level}',
      },
    },
    socialSharing: {
      zalo: {
        defaultImage: '/og-image-vi.png',
        titleSuffix: ' | Daily English',
      },
      facebook: {
        appId: '',
        locale: 'vi_VN',
      },
    },
    cocCoc: {
      verification: '',
      searchEngineUrl: 'https://coccoc.com/search',
      optimizations: {
        enableSpecialTags: true,
        prioritizeVietnameseContent: true,
      },
    },
  };

  beforeEach(() => {
    metaService = jasmine.createSpyObj('Meta', ['updateTag', 'getTag']);
    mockDocument = {
      createElement: jasmine.createSpy('createElement').and.returnValue({
        setAttribute: jasmine.createSpy('setAttribute'),
        remove: jasmine.createSpy('remove'),
      }),
      getElementById: jasmine.createSpy('getElementById').and.returnValue(null),
      head: {
        appendChild: jasmine.createSpy('appendChild'),
      },
    };

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        VietnameseSeoService,
        { provide: Meta, useValue: metaService },
        { provide: DOCUMENT, useValue: mockDocument },
        {
          provide: SeoService,
          useValue: jasmine.createSpyObj('SeoService', ['updateTags']),
        },
      ],
    });

    service = TestBed.inject(VietnameseSeoService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  describe('Configuration Loading', () => {
    it('should load Vietnamese configuration successfully', async () => {
      const loadPromise = service.loadConfiguration();

      const req = httpMock.expectOne('/assets/vietnamese-seo-config.json');
      expect(req.request.method).toBe('GET');
      req.flush(mockConfig);

      await loadPromise;

      expect(service.isConfigurationLoaded()).toBe(true);
      expect(service.getConfiguration()).toEqual(mockConfig);
    });

    it('should not reload configuration if already loaded', async () => {
      await service.loadConfiguration();
      const req = httpMock.expectOne('/assets/vietnamese-seo-config.json');
      req.flush(mockConfig);

      await service.loadConfiguration();
      httpMock.expectNone('/assets/vietnamese-seo-config.json');
    });

    it('should handle configuration loading error', async () => {
      const loadPromise = service.loadConfiguration();

      const req = httpMock.expectOne('/assets/vietnamese-seo-config.json');
      req.error(new ProgressEvent('error'));

      await expectAsync(loadPromise).toBeRejected();
      expect(service.isConfigurationLoaded()).toBe(false);
    });
  });

  describe('Keyword Generation', () => {
    beforeEach(async () => {
      await service.loadConfiguration();
      const req = httpMock.expectOne('/assets/vietnamese-seo-config.json');
      req.flush(mockConfig);
    });

    it('should generate keywords for category and level', () => {
      const keywords = service.generateVietnameseKeywords('translation', 'beginner');

      expect(keywords).toContain('học tiếng anh');
      expect(keywords).toContain('luyện dịch');
      expect(keywords).toContain('tiếng anh cơ bản');
      expect(keywords.length).toBeGreaterThan(0);
    });

    it('should generate keywords without duplicates', () => {
      const keywords = service.generateVietnameseKeywords('translation', 'beginner');
      const uniqueKeywords = [...new Set(keywords)];

      expect(keywords.length).toBe(uniqueKeywords.length);
    });

    it('should return empty array if configuration not loaded', () => {
      const newService = TestBed.inject(VietnameseSeoService);
      const keywords = newService.generateVietnameseKeywords('translation', 'beginner');

      expect(keywords).toEqual([]);
    });
  });

  describe('Title Generation', () => {
    beforeEach(async () => {
      await service.loadConfiguration();
      const req = httpMock.expectOne('/assets/vietnamese-seo-config.json');
      req.flush(mockConfig);
    });

    it('should generate Vietnamese title for exercise', () => {
      const title = service.getVietnameseTitle(
        'English Title',
        'translation',
        'beginner',
        'Basic Sentences'
      );

      expect(title).toContain('Basic Sentences');
      expect(title).toContain('Dịch câu');
      expect(title).toContain('Sơ cấp');
      expect(title).toContain('Daily English');
    });

    it('should generate Vietnamese title for category', () => {
      const title = service.getVietnameseTitle('English Title', 'translation');

      expect(title).toContain('Dịch câu');
      expect(title).toContain('Daily English');
    });

    it('should generate Vietnamese title for level', () => {
      const title = service.getVietnameseTitle('English Title', undefined, 'beginner');

      expect(title).toContain('Sơ cấp');
      expect(title).toContain('Daily English');
    });

    it('should return default title if no parameters', () => {
      const title = service.getVietnameseTitle('English Title');

      expect(title).toBe('English Title - Daily English');
    });
  });

  describe('Description Generation', () => {
    beforeEach(async () => {
      await service.loadConfiguration();
      const req = httpMock.expectOne('/assets/vietnamese-seo-config.json');
      req.flush(mockConfig);
    });

    it('should generate Vietnamese description for exercise', () => {
      const description = service.getVietnameseDescription(
        'English Description',
        'translation',
        'beginner',
        'Test exercise'
      );

      expect(description).toContain('Dịch câu');
      expect(description).toContain('Sơ cấp');
    });

    it('should generate Vietnamese description for category', () => {
      const description = service.getVietnameseDescription(
        'English Description',
        'translation'
      );

      expect(description).toContain('Dịch câu');
    });

    it('should return English description if no parameters', () => {
      const description = service.getVietnameseDescription('English Description');

      expect(description).toBe('English Description');
    });
  });

  describe('Vietnamese Diacritics Validation', () => {
    beforeEach(async () => {
      await service.loadConfiguration();
      const req = httpMock.expectOne('/assets/vietnamese-seo-config.json');
      req.flush(mockConfig);
    });

    it('should validate Vietnamese diacritics in title', () => {
      spyOn(console, 'warn');

      service.updateVietnameseTags({
        title: 'Test',
        description: 'Test',
        vietnameseTitle: 'Học tiếng Anh',
        vietnameseDescription: 'Mô tả tiếng Việt',
      });

      expect(console.warn).not.toHaveBeenCalled();
    });

    it('should warn if Vietnamese diacritics are missing', () => {
      spyOn(console, 'warn');

      service.updateVietnameseTags({
        title: 'Test',
        description: 'Test',
        vietnameseTitle: 'Hoc tieng Anh', // Missing diacritics
        vietnameseDescription: 'Mo ta tieng Viet',
      });

      expect(console.warn).toHaveBeenCalled();
    });
  });

  describe('FAQ Schema Generation', () => {
    it('should generate Vietnamese FAQ schema', () => {
      const faqs = [
        { question: 'Câu hỏi 1?', answer: 'Câu trả lời 1' },
        { question: 'Câu hỏi 2?', answer: 'Câu trả lời 2' },
      ];

      const schema = service.generateVietnameseFAQSchema(faqs);

      expect(schema['@context']).toBe('https://schema.org');
      expect(schema['@type']).toBe('FAQPage');
      expect(schema.mainEntity.length).toBe(2);
      expect(schema.mainEntity[0].name).toBe('Câu hỏi 1?');
      expect(schema.mainEntity[0].acceptedAnswer.text).toBe('Câu trả lời 1');
    });
  });

  describe('Breadcrumb Schema Generation', () => {
    it('should generate Vietnamese breadcrumb schema', () => {
      const breadcrumbs = [
        { name: 'Trang chủ', url: 'https://example.com/' },
        { name: 'Bài tập', url: 'https://example.com/exercises' },
      ];

      const schema = service.generateVietnameseBreadcrumbSchema(breadcrumbs);

      expect(schema['@context']).toBe('https://schema.org');
      expect(schema['@type']).toBe('BreadcrumbList');
      expect(schema.itemListElement.length).toBe(2);
      expect(schema.itemListElement[0].position).toBe(1);
      expect(schema.itemListElement[0].name).toBe('Trang chủ');
    });
  });

  describe('Course Schema Generation', () => {
    it('should generate Vietnamese course schema', () => {
      const config = {
        name: 'Bài tập tiếng Anh',
        description: 'Khóa học tiếng Anh',
        educationalLevel: 'Sơ cấp',
        teaches: 'Tiếng Anh',
      };

      const schema = service.generateVietnameseCourseSchema(config);

      expect(schema['@context']).toBe('https://schema.org');
      expect(schema['@type']).toBe('Course');
      expect(schema.name).toBe('Bài tập tiếng Anh');
      expect(schema.inLanguage).toBe('vi');
      expect(schema.educationalLevel).toBe('Sơ cấp');
    });
  });

  describe('Zalo Tags', () => {
    beforeEach(async () => {
      await service.loadConfiguration();
      const req = httpMock.expectOne('/assets/vietnamese-seo-config.json');
      req.flush(mockConfig);
    });

    it('should set Zalo meta tags', () => {
      const config = {
        title: 'Test Title',
        description: 'Test Description',
        image: 'https://example.com/image.png',
        url: 'https://example.com',
      };

      service.setZaloTags(config);

      expect(metaService.updateTag).toHaveBeenCalledWith({
        property: 'og:title',
        content: 'Test Title',
      });
      expect(metaService.updateTag).toHaveBeenCalledWith({
        name: 'zalo:title',
        content: 'Test Title',
      });
    });
  });

  describe('Keyword Density Validation', () => {
    it('should calculate keyword density', () => {
      const content = 'học tiếng anh online miễn phí học tiếng anh';
      const keywords = ['học tiếng anh'];

      const densityMap = service.validateKeywordDensity(content, keywords);

      expect(densityMap.has('học tiếng anh')).toBe(true);
      expect(densityMap.get('học tiếng anh')).toBeGreaterThan(0);
    });

    it('should warn if keyword density is too high', () => {
      spyOn(console, 'warn');

      const content = 'học tiếng anh '.repeat(50);
      const keywords = ['học tiếng anh'];

      service.validateKeywordDensity(content, keywords);

      expect(console.warn).toHaveBeenCalled();
    });
  });

  describe('Schema Validation', () => {
    it('should validate FAQ schema', () => {
      const schema = service.generateVietnameseFAQSchema([
        { question: 'Q1', answer: 'A1' },
      ]);

      const isValid = service.validateSchema(schema);

      expect(isValid).toBe(true);
    });

    it('should invalidate schema with missing @context', () => {
      const invalidSchema: any = {
        '@type': 'FAQPage',
        mainEntity: [],
      };

      const isValid = service.validateSchema(invalidSchema);

      expect(isValid).toBe(false);
    });
  });

  describe('Analytics Tracking', () => {
    beforeEach(() => {
      localStorage.clear();
    });

    it('should track Vietnamese search query', () => {
      service.trackVietnameseSearchQuery('học tiếng anh', 'google');

      const stored = localStorage.getItem('vietnamese_search_queries');
      expect(stored).toBeTruthy();

      const queries = JSON.parse(stored!);
      expect(queries.length).toBe(1);
      expect(queries[0].query).toBe('học tiếng anh');
      expect(queries[0].source).toBe('google');
    });

    it('should get keyword performance', () => {
      service.trackVietnameseSearchQuery('học tiếng anh', 'google');
      service.trackVietnameseSearchQuery('học tiếng anh', 'coccoc');
      service.trackVietnameseSearchQuery('bài tập', 'google');

      const performance = service.getVietnameseKeywordPerformance();

      expect(performance.length).toBe(2);
      expect(performance[0].keyword).toBe('học tiếng anh');
      expect(performance[0].count).toBe(2);
    });

    it('should track social media referral', () => {
      service.trackSocialMediaReferral('zalo', '/exercises');

      const stored = localStorage.getItem('vietnamese_social_referrals');
      expect(stored).toBeTruthy();

      const referrals = JSON.parse(stored!);
      expect(referrals.length).toBe(1);
      expect(referrals[0].platform).toBe('zalo');
    });
  });
});
