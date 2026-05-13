import { Component, ChangeDetectionStrategy, input, output, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AchievementType, RarityLevel } from '../../../models/achievement.model';
import { TranslationService } from '../../../services/translation.service';

@Component({
  selector: 'app-achievement-filters',
  imports: [CommonModule],
  templateUrl: './achievement-filters.html',
  styleUrl: './achievement-filters.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AchievementFilters {
  protected translate = inject(TranslationService);

  selectedType = input<AchievementType | 'all'>('all');
  selectedStatus = input<'all' | 'unlocked' | 'locked' | 'in-progress'>('all');
  selectedRarity = input<RarityLevel | 'all'>('all');

  typeChange = output<AchievementType | 'all'>();
  statusChange = output<'all' | 'unlocked' | 'locked' | 'in-progress'>();
  rarityChange = output<RarityLevel | 'all'>();

  readonly typeOptions = computed(() => [
    { value: 'all' as const, label: this.translate.t('achievement_filters.all_types') },
    { value: AchievementType.MILESTONE, label: this.translate.t('achievement_filters.milestone') },
    { value: AchievementType.STREAK, label: this.translate.t('achievement_filters.streak') },
    { value: AchievementType.PERFORMANCE, label: this.translate.t('achievement_filters.performance') },
    { value: AchievementType.CATEGORY_MASTER, label: this.translate.t('achievement_filters.category_master') }
  ]);

  readonly statusOptions = computed(() => [
    { value: 'all' as const, label: this.translate.t('achievement_filters.all_status') },
    { value: 'unlocked' as const, label: this.translate.t('achievement_filters.unlocked') },
    { value: 'locked' as const, label: this.translate.t('achievement_filters.locked') },
    { value: 'in-progress' as const, label: this.translate.t('achievement_filters.in_progress') }
  ]);

  readonly rarityOptions = computed(() => [
    { value: 'all' as const, label: this.translate.t('achievement_filters.all_rarities') },
    { value: RarityLevel.COMMON, label: this.translate.t('achievement_filters.common') },
    { value: RarityLevel.RARE, label: this.translate.t('achievement_filters.rare') },
    { value: RarityLevel.EPIC, label: this.translate.t('achievement_filters.epic') },
    { value: RarityLevel.LEGENDARY, label: this.translate.t('achievement_filters.legendary') }
  ]);

  onTypeChange(event: Event): void {
    const value = (event.target as HTMLSelectElement).value as AchievementType | 'all';
    this.typeChange.emit(value);
  }

  onStatusChange(event: Event): void {
    const value = (event.target as HTMLSelectElement).value as 'all' | 'unlocked' | 'locked' | 'in-progress';
    this.statusChange.emit(value);
  }

  onRarityChange(event: Event): void {
    const value = (event.target as HTMLSelectElement).value as RarityLevel | 'all';
    this.rarityChange.emit(value);
  }
}
