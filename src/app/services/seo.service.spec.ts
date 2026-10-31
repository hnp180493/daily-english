import { TestBed } from '@angular/core/testing';
import { Meta, Title } from '@angular/platform-browser';
import { Router } from '@angular/router';
import { SeoService } from './seo.service';

describe('SeoService', () => {
  let service: SeoService;
  let metaService: jasmine.SpyObj<Meta>;
  let titleService: jasmine.SpyObj<Title>;

  const removeSeoElements = () => {
    document.querySelectorAll('link[rel="canonical"]').forEach(el => el.remove());
    document.querySelectorAll('script[type="application/ld+json"]').forEach(el => el.remove());
  };

  beforeEach(() => {
    removeSeoElements();

    const metaSpy = jasmine.createSpyObj('Meta', ['updateTag', 'addTag', 'removeTag', 'getTag']);
    const titleSpy = jasmine.createSpyObj('Title', ['setTitle', 'getTitle']);
    const routerSpy = jasmine.createSpyObj('Router', ['navigate'], { url: '/home' });

    TestBed.configureTestingModule({
      providers: [
        SeoService,
        { provide: Meta, useValue: metaSpy },
        { provide: Title, useValue: titleSpy },
        { provide: Router, useValue: routerSpy }
      ]
    });

    service = TestBed.inject(SeoService);
    metaService = TestBed.inject(Meta) as jasmine.SpyObj<Meta>;
    titleService = TestBed.inject(Title) as jasmine.SpyObj<Title>;
  });

  afterEach(() => {
    removeSeoElements();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('updateTags', () => {
    it('should set the page title', () => {
      service.updateTags({ title: 'Test Page', description: 'Test Description' });
      expect(titleService.setTitle).toHaveBeenCalledWith('Test Page');
    });

    it('should update description and keywords meta tags', () => {
      service.updateTags({
        title: 'Test Page',
        description: 'Test Description',
        keywords: ['test', 'seo'],
        url: 'http://example.com'
      });

      expect(metaService.updateTag).toHaveBeenCalledWith({ name: 'description', content: 'Test Description' });
      expect(metaService.updateTag).toHaveBeenCalledWith({ name: 'keywords', content: 'test, seo' });
    });

    it('should accept keywords as a plain string', () => {
      service.updateTags({ keywords: 'a, b, c' });
      expect(metaService.updateTag).toHaveBeenCalledWith({ name: 'keywords', content: 'a, b, c' });
    });

    it('should set all Open Graph tags', () => {
      service.updateTags({
        title: 'Test Title',
        description: 'Test Description',
        image: 'http://example.com/image.jpg',
        url: 'http://example.com',
        type: 'article'
      });

      expect(metaService.updateTag).toHaveBeenCalledWith({ property: 'og:title', content: 'Test Title' });
      expect(metaService.updateTag).toHaveBeenCalledWith({ property: 'og:description', content: 'Test Description' });
      expect(metaService.updateTag).toHaveBeenCalledWith({ property: 'og:url', content: 'http://example.com' });
      expect(metaService.updateTag).toHaveBeenCalledWith({ property: 'og:type', content: 'article' });
      expect(metaService.updateTag).toHaveBeenCalledWith({ property: 'og:image', content: 'http://example.com/image.jpg' });
    });

    it('should set all Twitter Card tags', () => {
      service.updateTags({
        title: 'Test Title',
        description: 'Test Description',
        image: 'http://example.com/image.jpg'
      });

      expect(metaService.updateTag).toHaveBeenCalledWith({ name: 'twitter:title', content: 'Test Title' });
      expect(metaService.updateTag).toHaveBeenCalledWith({ name: 'twitter:description', content: 'Test Description' });
      expect(metaService.updateTag).toHaveBeenCalledWith({ name: 'twitter:image', content: 'http://example.com/image.jpg' });
    });

    it('should fall back to default values for missing fields', () => {
      service.updateTags({});

      expect(titleService.setTitle).toHaveBeenCalledWith(jasmine.stringContaining('Daily English'));
      expect(metaService.updateTag).toHaveBeenCalledWith({
        name: 'description',
        content: jasmine.stringContaining('Học tiếng Anh')
      });
      expect(metaService.updateTag).toHaveBeenCalledWith({
        property: 'og:image',
        content: jasmine.stringContaining('og-image')
      });
      expect(metaService.updateTag).toHaveBeenCalledWith({ property: 'og:type', content: 'website' });
    });

    it('should create canonical link from provided URL', () => {
      const url = 'http://dailyenglish.qzz.io/exercises';
      service.updateTags({ url });

      const canonicalLink = document.querySelector('link[rel="canonical"]');
      expect(canonicalLink).toBeTruthy();
      expect(canonicalLink?.getAttribute('href')).toBe(url);
    });

    it('should update existing canonical link instead of adding another', () => {
      const existingLink = document.createElement('link');
      existingLink.setAttribute('rel', 'canonical');
      existingLink.setAttribute('href', 'http://old-url.com');
      document.head.appendChild(existingLink);

      const newUrl = 'http://dailyenglish.qzz.io/exercises';
      service.updateTags({ url: newUrl });

      const links = document.querySelectorAll('link[rel="canonical"]');
      expect(links.length).toBe(1);
      expect(links[0].getAttribute('href')).toBe(newUrl);
    });

    it('should derive canonical and og:url from current router URL when no URL provided', () => {
      service.updateTags({ title: 'Home' });

      const canonicalLink = document.querySelector('link[rel="canonical"]');
      expect(canonicalLink?.getAttribute('href')).toBe('https://dailyenglish.qzz.io/home');
      expect(metaService.updateTag).toHaveBeenCalledWith({
        property: 'og:url',
        content: 'https://dailyenglish.qzz.io/home'
      });
    });
  });

  describe('generateExerciseTitle', () => {
    it('should build an SEO-friendly exercise title', () => {
      expect(service.generateExerciseTitle('At the Market', 'Daily Life', 'Beginner'))
        .toBe('At the Market - Daily Life Beginner | Daily English');
    });
  });

  describe('generateExerciseDescription', () => {
    it('should include exercise title and difficulty', () => {
      const description = service.generateExerciseDescription('At the Market', 'Beginner');
      expect(description).toContain('"At the Market"');
      expect(description).toContain('Beginner');
    });
  });

  describe('setStructuredData', () => {
    it('should inject JSON-LD script into document head', () => {
      const structuredData = {
        '@context': 'https://schema.org',
        '@type': 'WebSite',
        name: 'Daily English',
        url: 'http://dailyenglish.qzz.io'
      };

      service.setStructuredData(structuredData);

      const script = document.head.querySelector('script[type="application/ld+json"]');
      expect(script).toBeTruthy();
      expect(JSON.parse(script!.textContent!)).toEqual(structuredData);
    });

    it('should reuse existing structured data script instead of adding another', () => {
      service.setStructuredData({ '@context': 'https://schema.org', '@type': 'WebSite', name: 'Test1' });
      service.setStructuredData({ '@context': 'https://schema.org', '@type': 'WebSite', name: 'Test2' });

      const scripts = document.querySelectorAll('script[type="application/ld+json"]');
      expect(scripts.length).toBe(1);
      expect(scripts[0].textContent).toContain('Test2');
    });
  });

  describe('generateWebSiteSchema', () => {
    it('should generate valid WebSite schema with search action', () => {
      const schema = service.generateWebSiteSchema();

      expect(schema['@context']).toBe('https://schema.org');
      expect(schema['@type']).toBe('WebSite');
      expect(schema.name).toBe('Daily English');
      expect(schema.url).toContain('dailyenglish.qzz.io');
      expect(schema.potentialAction).toBeDefined();
      expect(schema.potentialAction['@type']).toBe('SearchAction');
      expect(schema.potentialAction.target).toContain('{search_term_string}');
    });
  });
});
