import { Component, OnInit, signal, inject, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { PathSelector } from './path-selector/path-selector';
import { DailyChallenge } from './daily-challenge/daily-challenge';
import { ProgressDashboard } from './progress-dashboard/progress-dashboard';
import { GoalTracker } from './goal-tracker/goal-tracker';
import { ExerciseList } from './exercise-list/exercise-list';
import { CertificateComponent } from './certificate/certificate';
import { CurriculumService } from '../../services/curriculum.service';
import { PathCompletion } from '../../models/learning-path.model';

type TabType = 'overview' | 'exercises' | 'challenge' | 'progress' | 'goals' | 'certificates';

@Component({
  selector: 'app-learning-path',
  imports: [
    CommonModule,
    PathSelector,
    DailyChallenge,
    ProgressDashboard,
    GoalTracker,
    ExerciseList,
    CertificateComponent
  ],
  templateUrl: './learning-path.html',
  styleUrl: './learning-path.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true
})
export class LearningPath implements OnInit {
  private curriculumService = inject(CurriculumService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  activeTab = signal<TabType>('overview');
  hasActivePath = signal(false);
  certificates = signal<PathCompletion[]>([]);
  selectedCertificate = signal<PathCompletion | null>(null);

  async ngOnInit(): Promise<void> {
    await this.checkActivePath();
    await this.loadCertificates();
    
    // Read tab from query params
    this.route.queryParams.subscribe(params => {
      const tab = params['tab'] as TabType;
      if (tab && this.isValidTab(tab)) {
        this.activeTab.set(tab);
      }
    });
  }

  private isValidTab(tab: string): tab is TabType {
    return ['overview', 'exercises', 'challenge', 'progress', 'goals', 'certificates'].includes(tab);
  }

  async checkActivePath(): Promise<void> {
    const path = await this.curriculumService.getUserCurrentPath();
    this.hasActivePath.set(!!path);
    
    // if (path) {
    //   this.activeTab.set('challenge');
    // }
  }

  async loadCertificates(): Promise<void> {
    const progress = this.curriculumService.pathProgress();
    if (progress?.pathCompletions) {
      this.certificates.set(progress.pathCompletions);
    }
  }

  viewCertificate(certificate: PathCompletion): void {
    this.selectedCertificate.set(certificate);
    this.activeTab.set('certificates');
  }

  setTab(tab: TabType): void {
    this.activeTab.set(tab);
    // Update query params without reloading the page
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { tab },
      queryParamsHandling: 'merge'
    });
  }

  isTabActive(tab: TabType): boolean {
    return this.activeTab() === tab;
  }

  getTabClass(tab: TabType): string {
    const isActive = this.isTabActive(tab);
    return isActive 
      ? 'bg-purple-600 text-white' 
      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700';
  }
}
