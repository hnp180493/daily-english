import { TestBed } from '@angular/core/testing';
import { Meta } from '@angular/platform-browser';
import { DOCUMENT } from '@angular/common';
import { CocCocSeoService } from './coc-coc-seo.service';

describe('CocCocSeoService', () => {
  let service: CocCocSeoService;
  let metaService: jasmine.SpyObj<Meta>;
  let mockDocument: any;
  let mockElement: any;

  beforeEach(() => {
    mockElement = {
      setAttribute: jasmine.createSpy('setAttribute'),
      remove: jasmine.createSpy('remove'),
    };

    metaService = jasmine.createSpyObj('Meta', [
      'addTag',
      'updateTag',
      'removeTag',
      'getTag',
    ]);

    mockDocument = {
      createElement: jasmine.createSpy('createElement').and.returnValue(mockElement),
      querySelector: jasmine.createSpy('querySelector').and.returnValue(null),
      head: {
        appendChild: jasmine.createSpy('appendChild'),
      },
      body: {
        classList: {
          add: jasmine.createSpy('add'),
        },
      },
    };

    TestBed.configureTestingModule({
      providers: [
        CocCocSeoService,
        { provide: Meta, useValue: metaService },
        { provide: DOCUMENT, useValue: mockDocument },
      ],
    });

    service = TestBed.inject(CocCocSeoService);
  });

  describe('Verification Tag', () => {
    it('should add Cốc Cốc verification tag', () => {
      metaService.getTag.and.returnValue(null);

      service.addCocCocVerification('test-verification-code');

      expect(metaService.addTag).toHaveBeenCalledWith({
        name: 'coccoc-verification',
        content: 'test-verification-code',
      });
    });

    it('should update existing Cốc Cốc verification tag', () => {
      metaService.getTag.and.returnValue({ content: 'old-code' } as any);

      service.addCocCocVerification('new-verification-code');

      expect(metaService.updateTag).toHaveBeenCalledWith({
        name: 'coccoc-verification',
        content: 'new-verification-code',
      });
    });

    it('should not add verification tag if code is empty', () => {
      spyOn(console, 'warn');

      service.addCocCocVerification('');

      expect(metaService.addTag).not.toHaveBeenCalled();
      expect(console.warn).toHaveBeenCalled();
    });
  });

  describe('Meta Tag Optimization', () => {
    it('should optimize meta tags for Cốc Cốc', () => {
      const config = {
        title: 'Test Title',
        description: 'Test Description',
        keywords: ['keyword1', 'keyword2'],
        image: 'https://example.com/image.png',
      };

      service.optimizeForCocCoc(config);

      expect(metaService.updateTag).toHaveBeenCalledWith({
        name: 'coccoc:title',
        content: 'Test Title',
      });
      expect(metaService.updateTag).toHaveBeenCalledWith({
        name: 'coccoc:description',
        content: 'Test Description',
      });
      expect(metaService.updateTag).toHaveBeenCalledWith({
        name: 'coccoc:keywords',
        content: 'keyword1, keyword2',
      });
      expect(metaService.updateTag).toHaveBeenCalledWith({
        name: 'coccoc:image',
        content: 'https://example.com/image.png',
      });
    });

    it('should not optimize if title or description is missing', () => {
      spyOn(console, 'warn');

      service.optimizeForCocCoc({
        title: '',
        description: 'Test',
      });

      expect(metaService.updateTag).not.toHaveBeenCalled();
      expect(console.warn).toHaveBeenCalled();
    });

    it('should optimize without keywords and image', () => {
      const config = {
        title: 'Test Title',
        description: 'Test Description',
      };

      service.optimizeForCocCoc(config);

      expect(metaService.updateTag).toHaveBeenCalledWith({
        name: 'coccoc:title',
        content: 'Test Title',
      });
      expect(metaService.updateTag).toHaveBeenCalledWith({
        name: 'coccoc:description',
        content: 'Test Description',
      });
    });
  });

  describe('Sitemap Reference', () => {
    it('should generate Cốc Cốc sitemap reference', () => {
      service.generateCocCocSitemapReference();

      expect(mockDocument.createElement).toHaveBeenCalledWith('link');
      expect(mockElement.setAttribute).toHaveBeenCalledWith('rel', 'sitemap');
      expect(mockElement.setAttribute).toHaveBeenCalledWith('type', 'application/xml');
      expect(mockElement.setAttribute).toHaveBeenCalledWith('title', 'Sitemap');
      expect(mockElement.setAttribute).toHaveBeenCalledWith('href', '/sitemap-vi.xml');
      expect(mockDocument.head.appendChild).toHaveBeenCalledWith(mockElement);
    });

    it('should remove existing sitemap link before adding new one', () => {
      const existingLink = { remove: jasmine.createSpy('remove') };
      mockDocument.querySelector.and.returnValue(existingLink);

      service.generateCocCocSitemapReference();

      expect(existingLink.remove).toHaveBeenCalled();
    });
  });

  describe('Browser Detection', () => {
    it('should detect Cốc Cốc browser', () => {
      Object.defineProperty(window.navigator, 'userAgent', {
        value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) coc_coc_browser/100.0',
        configurable: true,
      });

      const isCocCoc = service.isCocCocBrowser();

      expect(isCocCoc).toBe(true);
    });

    it('should detect Cốc Cốc browser with alternative user agent', () => {
      Object.defineProperty(window.navigator, 'userAgent', {
        value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) CocCoc/100.0',
        configurable: true,
      });

      const isCocCoc = service.isCocCocBrowser();

      expect(isCocCoc).toBe(true);
    });

    it('should not detect non-Cốc Cốc browser', () => {
      Object.defineProperty(window.navigator, 'userAgent', {
        value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/100.0',
        configurable: true,
      });

      const isCocCoc = service.isCocCocBrowser();

      expect(isCocCoc).toBe(false);
    });
  });

  describe('Browser-Specific Optimizations', () => {
    it('should apply optimizations for Cốc Cốc browser', () => {
      spyOn(service, 'isCocCocBrowser').and.returnValue(true);

      service.applyBrowserSpecificOptimizations();

      expect(mockDocument.body.classList.add).toHaveBeenCalledWith('coccoc-browser');
      expect(metaService.addTag).toHaveBeenCalledWith({
        name: 'coccoc:optimized',
        content: 'true',
      });
    });

    it('should not apply optimizations for non-Cốc Cốc browser', () => {
      spyOn(service, 'isCocCocBrowser').and.returnValue(false);

      service.applyBrowserSpecificOptimizations();

      expect(mockDocument.body.classList.add).not.toHaveBeenCalled();
      expect(metaService.addTag).not.toHaveBeenCalled();
    });
  });

  describe('Tag Removal', () => {
    it('should remove all Cốc Cốc meta tags', () => {
      service.removeCocCocTags();

      expect(metaService.removeTag).toHaveBeenCalledWith('name="coccoc:title"');
      expect(metaService.removeTag).toHaveBeenCalledWith('name="coccoc:description"');
      expect(metaService.removeTag).toHaveBeenCalledWith('name="coccoc:keywords"');
      expect(metaService.removeTag).toHaveBeenCalledWith('name="coccoc:image"');
      expect(metaService.removeTag).toHaveBeenCalledWith('name="coccoc:optimized"');
    });
  });

  describe('Tag Validation', () => {
    it('should validate Cốc Cốc tags are present', () => {
      metaService.getTag.and.returnValues(
        { content: 'title' } as any,
        { content: 'description' } as any
      );

      const isValid = service.validateCocCocTags();

      expect(isValid).toBe(true);
    });

    it('should invalidate if title tag is missing', () => {
      metaService.getTag.and.returnValues(
        null,
        { content: 'description' } as any
      );

      const isValid = service.validateCocCocTags();

      expect(isValid).toBe(false);
    });

    it('should invalidate if description tag is missing', () => {
      metaService.getTag.and.returnValues(
        { content: 'title' } as any,
        null
      );

      const isValid = service.validateCocCocTags();

      expect(isValid).toBe(false);
    });

    it('should invalidate if both tags are missing', () => {
      metaService.getTag.and.returnValue(null);

      const isValid = service.validateCocCocTags();

      expect(isValid).toBe(false);
    });
  });

  describe('Logging', () => {
    it('should log info messages', () => {
      spyOn(console, 'log');

      service.addCocCocVerification('test-code');

      expect(console.log).toHaveBeenCalled();
    });

    it('should log warning messages', () => {
      spyOn(console, 'warn');

      service.addCocCocVerification('');

      expect(console.warn).toHaveBeenCalled();
    });
  });
});
