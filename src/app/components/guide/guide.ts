import { Component, ChangeDetectionStrategy, signal, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GuideService, GuideSection } from '../../services/guide.service';

@Component({
  selector: 'app-guide',
  imports: [CommonModule],
  templateUrl: './guide.html',
  styleUrl: './guide.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(window:scroll)': 'onScroll()'
  }
})
export class GuideComponent implements OnInit, OnDestroy {
  private guideService = inject(GuideService);
  
  sections = signal<GuideSection[]>([]);
  activeSection = signal<string>('');
  isLoading = signal(true);
  private scrollTimeout?: number;
  
  ngOnInit(): void {
    this.loadGuide();
  }
  
  ngOnDestroy(): void {
    if (this.scrollTimeout) {
      clearTimeout(this.scrollTimeout);
    }
  }
  
  private async loadGuide(): Promise<void> {
    try {
      const content = await this.guideService.getGuideContent();
      this.sections.set(content);
      if (content.length > 0) {
        this.activeSection.set(content[0].id);
      }
      
      // Setup scroll spy after content loads
      setTimeout(() => this.updateActiveSection(), 100);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Failed to load guide:', errorMessage);
    } finally {
      this.isLoading.set(false);
    }
  }
  
  scrollToSection(sectionId: string): void {
    this.activeSection.set(sectionId);
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }
  
  onScroll(): void {
    if (this.scrollTimeout) {
      clearTimeout(this.scrollTimeout);
    }
    
    this.scrollTimeout = window.setTimeout(() => {
      this.updateActiveSection();
    }, 100);
  }
  
  private updateActiveSection(): void {
    const sections = this.sections();
    if (sections.length === 0) return;
    
    const scrollPosition = window.scrollY + 150;
    
    for (let i = sections.length - 1; i >= 0; i--) {
      const element = document.getElementById(sections[i].id);
      if (element && element.offsetTop <= scrollPosition) {
        this.activeSection.set(sections[i].id);
        return;
      }
    }
    
    this.activeSection.set(sections[0].id);
  }
}
