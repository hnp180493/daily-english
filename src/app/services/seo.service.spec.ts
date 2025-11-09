import { TestBed } from '@angular/core/testing';
import { Meta, Title } from '@angular/platform-browser';
import { Router, NavigationEnd } from '@angular/router';
import { DOCUMENT } from '@angular/common';
import { Subject } from 'rxjs';
import { SeoService } from './seo.service';

describe('SeoService', () => {
  let service: SeoService;
  let metaService: jasmine.SpyObj<Meta>;
  let titleService: jasmine.SpyObj<Title>;
  let router: jasmine.SpyObj<Router>;
  let document: Document;
  let routerEventsSubject: Subject<any>;

  beforeEach(() => {
    routerEventsSubject = new Subject();

    const metaSpy = jasmine.createSpyObj('Meta', [
      'updateTag',
      'addTag',
      'removeTag',
      'getTag',
    ]);
    const titleSpy = jasmine.createSpyObj('Title', ['setTitle', 'getTitle']);
    const routerSpy = jasmine.createSpyObj('Router', ['navigate'], {
      events: routerEventsSubject.asObservable(),
      url: '/home',
      routerState: {
        root: {
          firstChild: null,
        },
      },
    });

    TestBed.configureTestingModule({
      providers: [
        SeoService,
        { provide: Meta, useValue: metaSpy },
        { provide: Title, useValue: titleSpy },
        { provide: Router, useValue: routerSpy },
      ],
    });

    service = TestBed.inject(SeoService);
    metaService = TestBed.inject(Meta) as jasmine.SpyObj<Meta>;
    titleService = TestBed.inject(Title) as jasmine.SpyObj<Title>;
    router = TestBed.inject(Router) as jasmine.SpyObj<Router>;
    document = TestBed.inject(DOCUMENT);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('setTitle', () => {
    it('should update page title with Daily English suffix', () => {
      service.setTitle('Test Page');
      expect(titleService.setTitle).toHaveBeenCalledWith('Test Page - Daily English');
    });

    it('should not add suffix if title already contains Daily English', () => {
      service.setTitle('Daily English - Test');
      expect(titleService.setTitle).toHaveBeenCalledWith('Daily English - Test');
    });

    it('should use default title when empty string provided', () => {
      service.setTitle('');
      expect(titleService.setTitle).toHaveBeenCalledWith('Daily English');
    });
  });

  describe('setDescription', () => {
    it('should update meta description tag', () => {
      const description = 'Test description for SEO';
      service.setDescription(description);
      expect(metaService.updateTag).toHaveBeenCalledWith({
        name: 'description',
        content: description,
      });
    });

    it('should use default description when empty', () => {
      service.setDescription('');
      expect(metaService.updateTag).toHaveBeenCalledWith({
        name: 'description',
        content: jasmine.stringContaining('Nền tảng học tiếng Anh'),
      });
    });

    it('should log warning when description is too long', () => {
      spyOn(console, 'warn');
      const longDescription = 'a'.repeat(200);
      service.setDescription(longDescription);
      expect(console.warn).toHaveBeenCalledWith(
        jasmine.stringContaining('Description too long')
      );
    });
  });

  describe('setKeywords', () => {
    it('should update meta keywords tag with comma-separated values', () => {
      const keywords = ['học tiếng anh', 'luyện dịch', 'AI feedback'];
      service.setKeywords(keywords);
      expect(metaService.updateTag).toHaveBeenCalledWith({
        name: 'keywords',
        content: 'học tiếng anh, luyện dịch, AI feedback',
      });
    });

    it('should log warning when keywords array is empty', () => {
      spyOn(console, 'warn');
      service.setKeywords([]);
      expect(console.warn).toHaveBeenCalledWith(jasmine.stringContaining('Keywords array is empty'));
    });
  });

  describe('setCanonicalUrl', () => {
    it('should create canonical link tag when not exists', () => {
      const url = 'http://dailyenglish.qzz.io/home';
      service.setCanonicalUrl(url);

      const canonicalLink = document.querySelector('link[rel="canonical"]');
      expect(canonicalLink).toBeTruthy();
      expect(canonicalLink?.getAttribute('href')).toBe(url);
    });

    it('should update existing canonical link tag', () => {
      // Create existing link
      const existingLink = document.createElement('link');
      existingLink.setAttribute('rel', 'canonical');
      existingLink.setAttribute('href', 'http://old-url.com');
      document.head.appendChild(existingLink);

      const newUrl = 'http://dailyenglish.qzz.io/exercises';
      service.setCanonicalUrl(newUrl);

      const canonicalLink = document.querySelector('link[rel="canonical"]');
      expect(canonicalLink?.getAttribute('href')).toBe(newUrl);

      // Cleanup
      existingLink.remove();
    });

    it('should use current router URL when no URL provided', () => {
      service.setCanonicalUrl();
      const canonicalLink = document.querySelector('link[rel="canonical"]');
      expect(canonicalLink?.getAttribute('href')).toContain('/home');
    });
  });

  describe('setOpenGraphTags', () => {
    it('should create all Open Graph meta tags', () => {
      const config = {
        title: 'Test Title',
        description: 'Test Description',
        image: 'http://example.com/image.jpg',
        url: 'http://example.com',
        type: 'article' as const,
      };

      service.setOpenGraphTags(config);

      expect(metaService.updateTag).toHaveBeenCalledWith({
        property: 'og:title',
        content: 'Test Title',
      });
      expect(metaService.updateTag).toHaveBeenCalledWith({
        property: 'og:description',
        content: 'Test Description',
      });
      expect(metaService.updateTag).toHaveBeenCalledWith({
        property: 'og:image',
        content: 'http://example.com/image.jpg',
      });
      expect(metaService.updateTag).toHaveBeenCalledWith({
        property: 'og:type',
        content: 'article',
      });
      expect(metaService.updateTag).toHaveBeenCalledWith({
        property: 'og:locale',
        content: 'vi_VN',
      });
    });

    it('should use default values when not provided', () => {
      service.setOpenGraphTags({ title: 'Test', description: 'Test' });

      expect(metaService.updateTag).toHaveBeenCalledWith({
        property: 'og:image',
        content: jasmine.stringContaining('og-image.png'),
      });
      expect(metaService.updateTag).toHaveBeenCalledWith({
        property: 'og:type',
        content: 'website',
      });
    });
  });

  describe('setTwitterCardTags', () => {
    it('should create all Twitter Card meta tags', () => {
      const config = {
        title: 'Test Title',
        description: 'Test Description',
        image: 'http://example.com/image.jpg',
      };

      service.setTwitterCardTags(config);

      expect(metaService.updateTag).toHaveBeenCalledWith({
        name: 'twitter:card',
        content: 'summary_large_image',
      });
      expect(metaService.updateTag).toHaveBeenCalledWith({
        name: 'twitter:title',
        content: 'Test Title',
      });
      expect(metaService.updateTag).toHaveBeenCalledWith({
        name: 'twitter:description',
        content: 'Test Description',
      });
      expect(metaService.updateTag).toHaveBeenCalledWith({
        name: 'twitter:image',
        content: 'http://example.com/image.jpg',
      });
    });
  });

  describe('setStructuredData', () => {
    it('should inject JSON-LD script into document head', () => {
      const structuredData = {
        '@context': 'https://schema.org',
        '@type': 'WebSite',
        name: 'Daily English',
        url: 'http://dailyenglish.qzz.io',
      };

      service.setStructuredData(structuredData);

      const script = document.getElementById('structured-data');
      expect(script).toBeTruthy();
      expect(script?.getAttribute('type')).toBe('application/ld+json');
      expect(script?.textContent).toContain('Daily English');
    });

    it('should remove existing structured data before adding new', () => {
      const data1 = { '@context': 'https://schema.org', '@type': 'WebSite', name: 'Test1' };
      const data2 = { '@context': 'https://schema.org', '@type': 'WebSite', name: 'Test2' };

      service.setStructuredData(data1);
      service.setStructuredData(data2);

      const scripts = document.querySelectorAll('#structured-data');
      expect(scripts.length).toBe(1);
      expect(scripts[0].textContent).toContain('Test2');
    });

    it('should log error for malformed structured data', () => {
      spyOn(console, 'error');
      const invalidData: any = { circular: null };
      invalidData.circular = invalidData; // Create circular reference

      service.setStructuredData(invalidData);
      expect(console.error).toHaveBeenCalledWith(
        jasmine.stringContaining('[SEO Error]'),
        jasmine.anything()
      );
    });
  });

  describe('removeStructuredData', () => {
    it('should remove structured data script from document', () => {
      const structuredData = {
        '@context': 'https://schema.org',
        '@type': 'WebSite',
        name: 'Test',
      };

      service.setStructuredData(structuredData);
      expect(document.getElementById('structured-data')).toBeTruthy();

      service.removeStructuredData();
      expect(document.getElementById('structured-data')).toBeFalsy();
    });
  });

  describe('updateTags', () => {
    it('should update all meta tags with provided config', () => {
      const config = {
        title: 'Test Page',
        description: 'Test Description',
        keywords: ['test', 'seo'],
        url: 'http://example.com',
      };

      service.updateTags(config);

      expect(titleService.setTitle).toHaveBeenCalled();
      expect(metaService.updateTag).toHaveBeenCalledWith({
        name: 'description',
        content: 'Test Description',
      });
      expect(metaService.updateTag).toHaveBeenCalledWith({
        name: 'keywords',
        content: 'test, seo',
      });
    });

    it('should use fallback values when required fields are missing', () => {
      spyOn(console, 'warn');
      service.updateTags({ title: '', description: '' });

      expect(console.warn).toHaveBeenCalledWith(
        jasmine.stringContaining('Title is required')
      );
      expect(console.warn).toHaveBeenCalledWith(
        jasmine.stringContaining('Description is required')
      );
    });
  });

  describe('generateWebSiteSchema', () => {
    it('should generate valid WebSite schema with search action', () => {
      const schema = service.generateWebSiteSchema();

      expect(schema['@context']).toBe('https://schema.org');
      expect(schema['@type']).toBe('WebSite');
      expect(schema.name).toBe('Daily English');
      expect(schema.inLanguage).toBe('vi');
      expect(schema.potentialAction).toBeDefined();
      expect(schema.potentialAction?.['@type']).toBe('SearchAction');
    });
  });

  describe('generateEducationalOrganizationSchema', () => {
    it('should generate valid EducationalOrganization schema', () => {
      const schema = service.generateEducationalOrganizationSchema();

      expect(schema['@context']).toBe('https://schema.org');
      expect(schema['@type']).toBe('EducationalOrganization');
      expect(schema.name).toBe('Daily English');
      expect(schema.url).toContain('dailyenglish.qzz.io');
    });
  });

  describe('generateLearningResourceSchema', () => {
    it('should generate valid LearningResource schema', () => {
      const schema = service.generateLearningResourceSchema(
        'Test Exercise',
        'Test Description',
        'Intermediate'
      );

      expect(schema['@context']).toBe('https://schema.org');
      expect(schema['@type']).toBe('LearningResource');
      expect(schema.name).toBe('Test Exercise');
      expect(schema.educationalLevel).toBe('Intermediate');
      expect(schema.inLanguage).toBe('en');
    });
  });

  describe('addVerificationTag', () => {
    it('should add Google verification meta tag', () => {
      service.addVerificationTag('google', 'test-verification-code');

      expect(metaService.addTag).toHaveBeenCalledWith({
        name: 'google-site-verification',
        content: 'test-verification-code',
      });
    });

    it('should add Bing verification meta tag', () => {
      service.addVerificationTag('bing', 'test-bing-code');

      expect(metaService.addTag).toHaveBeenCalledWith({
        name: 'msvalidate.01',
        content: 'test-bing-code',
      });
    });

    it('should update existing verification tag', () => {
      metaService.getTag.and.returnValue({ content: 'old-code' } as any);

      service.addVerificationTag('google', 'new-code');

      expect(metaService.updateTag).toHaveBeenCalledWith({
        name: 'google-site-verification',
        content: 'new-code',
      });
    });

    it('should log warning when verification code is empty', () => {
      spyOn(console, 'warn');
      service.addVerificationTag('google', '');

      expect(console.warn).toHaveBeenCalledWith(
        jasmine.stringContaining('Verification code for google is empty')
      );
    });
  });

  describe('setHreflangTags', () => {
    it('should create hreflang tags for Vietnamese and default', () => {
      service.setHreflangTags('http://dailyenglish.qzz.io/home');

      const hreflangLinks = document.querySelectorAll('link[rel="alternate"]');
      expect(hreflangLinks.length).toBeGreaterThanOrEqual(2);

      const viLink = Array.from(hreflangLinks).find(
        (link) => link.getAttribute('hreflang') === 'vi'
      );
      const defaultLink = Array.from(hreflangLinks).find(
        (link) => link.getAttribute('hreflang') === 'x-default'
      );

      expect(viLink).toBeTruthy();
      expect(defaultLink).toBeTruthy();
    });
  });

  describe('route navigation', () => {
    it('should update meta tags on NavigationEnd event', () => {
      spyOn(service, 'updateMetaForRoute');

      routerEventsSubject.next(new NavigationEnd(1, '/home', '/home'));

      expect(service.updateMetaForRoute).toHaveBeenCalled();
    });
  });
});
