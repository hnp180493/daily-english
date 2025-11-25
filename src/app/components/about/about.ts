import { Component, ChangeDetectionStrategy, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { SeoService } from '../../services/seo.service';

@Component({
  selector: 'app-about',
  imports: [CommonModule, RouterModule],
  templateUrl: './about.html',
  styleUrl: './about.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AboutComponent implements OnInit {
  private seoService = inject(SeoService);

  ngOnInit(): void {
    this.seoService.updateTags({
      title: 'Về Daily English - Học tiếng Anh miễn phí với AI | Phương pháp học hiệu quả',
      description: 'Daily English là nền tảng học tiếng Anh trực tuyến miễn phí với 250+ bài tập dịch câu, phản hồi AI thông minh từ GPT-4 và Gemini. Học tiếng Anh giao tiếp, ngữ pháp, từ vựng hiệu quả với lộ trình cá nhân hóa.',
      keywords: 'học tiếng anh online, học tiếng anh miễn phí, học tiếng anh với AI, bài tập tiếng anh, luyện dịch tiếng anh, học tiếng anh giao tiếp, ngữ pháp tiếng anh, từ vựng tiếng anh, ứng dụng học tiếng anh, website học tiếng anh',
      type: 'website'
    });
  }
}
