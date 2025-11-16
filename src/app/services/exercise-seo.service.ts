import { Injectable, inject } from '@angular/core';
import { Exercise } from '../models/exercise.model';
import { SeoService } from './seo.service';
import { VietnameseSeoService } from './vietnamese-seo.service';

@Injectable({
  providedIn: 'root'
})
export class ExerciseSeoService {
  private seoService = inject(SeoService);
  private vietnameseSeoService = inject(VietnameseSeoService);

  updateExerciseSeo(exercise: Exercise): void {
    const title = exercise.title || exercise.sourceText.split('.')[0].substring(0, 50);
    const description = exercise.description || 
      `Luyện tập dịch tiếng Anh: ${exercise.sourceText.substring(0, 120)}...`;
    
    // Enhanced keywords with bilingual content
    const keywords = [
      'bài tập tiếng anh',
      'luyện dịch',
      'vietnamese to english',
      'translation practice',
      'bilingual exercise',
      'học tiếng anh',
      exercise.category,
      exercise.level
    ];
    
    this.seoService.updateTags({
      title: `${title} - Daily English`,
      description,
      keywords,
      type: 'article',
    });

    const difficultyLevel = exercise.level || 'Beginner';
    
    // Enhanced learning resource schema with bilingual content
    const learningResourceSchema = {
      '@context': 'https://schema.org',
      '@type': 'LearningResource',
      name: title,
      description,
      educationalLevel: difficultyLevel,
      learningResourceType: 'Translation Exercise',
      inLanguage: ['vi', 'en'],
      teaches: 'English Language Translation',
      educationalUse: 'Practice',
      interactivityType: 'active',
      typicalAgeRange: '13-99',
      isAccessibleForFree: true,
      hasPart: [
        {
          '@type': 'Text',
          inLanguage: 'vi',
          text: exercise.sourceText.substring(0, 200) + '...'
        },
        {
          '@type': 'Text',
          inLanguage: 'en',
          text: exercise.englishText ? exercise.englishText.substring(0, 200) + '...' : ''
        }
      ],
      provider: {
        '@type': 'Organization',
        name: 'Daily English',
        url: 'https://dailyenglish.qzz.io'
      },
      about: {
        '@type': 'Thing',
        name: 'English Language Learning',
        description: 'Vietnamese to English translation practice with AI feedback'
      }
    };
    
    this.seoService.setStructuredData(learningResourceSchema);
  }

  updateVietnameseSeo(exercise: Exercise): void {
    if (!this.vietnameseSeoService.isConfigurationLoaded()) {
      console.warn('[ExerciseSeo] Vietnamese SEO configuration not loaded');
      return;
    }

    const level = exercise.level;
    const category = 'translation';

    const vietnameseTitle = this.vietnameseSeoService.getVietnameseTitle(
      exercise.title,
      category,
      level,
      exercise.title
    );

    const exerciseDescription = exercise.description || `Luyện tập ${exercise.title}`;
    const vietnameseDescription = this.vietnameseSeoService.getVietnameseDescription(
      exercise.description || '',
      category,
      level,
      exerciseDescription
    );

    const vietnameseKeywords = this.vietnameseSeoService.generateVietnameseKeywords(
      category,
      level
    );

    this.vietnameseSeoService.updateVietnameseTags({
      title: exercise.title,
      description: exercise.description || '',
      vietnameseTitle,
      vietnameseDescription,
      vietnameseKeywords,
      image: '/og-image-vi.png',
      url: `https://dailyenglish.qzz.io/exercise/${exercise.id}`,
    });

    const breadcrumbs = [
      { name: 'Trang chủ', url: 'https://dailyenglish.qzz.io/' },
      { name: 'Bài tập', url: 'https://dailyenglish.qzz.io/exercises' },
      { name: exercise.title, url: `https://dailyenglish.qzz.io/exercise/${exercise.id}` },
    ];
    const breadcrumbSchema = this.vietnameseSeoService.generateVietnameseBreadcrumbSchema(breadcrumbs);
    this.vietnameseSeoService.setVietnameseStructuredData(breadcrumbSchema, 'exercise-breadcrumb');

    const levelVietnamese = this.vietnameseSeoService['getLevelVietnamese'](level);
    const courseSchema = this.vietnameseSeoService.generateVietnameseCourseSchema({
      name: vietnameseTitle,
      description: vietnameseDescription,
      educationalLevel: levelVietnamese,
      teaches: 'Tiếng Anh',
    });
    this.vietnameseSeoService.setVietnameseStructuredData(courseSchema, 'exercise-course');

    this.vietnameseSeoService.setZaloTags({
      title: vietnameseTitle,
      description: vietnameseDescription,
      image: 'https://dailyenglish.qzz.io/og-image-vi.png',
      url: `https://dailyenglish.qzz.io/exercise/${exercise.id}`,
    });

    console.log('[ExerciseSeo] Vietnamese SEO updated', {
      title: vietnameseTitle,
      keywords: vietnameseKeywords.length,
    });
  }
}
