import { Component, ChangeDetectionStrategy, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AchievementType, RarityLevel } from '../../../models/achievement.model';

@Component({
  selector: 'app-achievement-filters',
  imports: [CommonModule],
  templateUrl: './achievement-filters.html',
  styleUrl: './achievement-filters.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AchievementFilters {
  selectedType = input<AchievementType | 'all'>('all');
  selectedStatus = input<'all' | 'unlocked' | 'locked' | 'in-progress'>('all');
  selectedRarity = input<RarityLevel | 'all'>('all');

  typeChange = output<AchievementType | 'all'>();
  statusChange = output<'all' | 'unlocked' | 'locked' | 'in-progress'>();
  rarityChange = output<RarityLevel | 'all'>();

  readonly typeOptions: { value: AchievementType | 'all'; label: string }[] = [
    { value: 'all', label: 'All Types' },
    { value: AchievementType.MILESTONE, label: 'Milestone' },
    { value: AchievementType.STREAK, label: 'Streak' },
    { value: AchievementType.PERFORMANCE, label: 'Performance' },
    { value: AchievementType.CATEGORY_MASTER, label: 'Category Master' }
  ];

  readonly statusOptions: { value: 'all' | 'unlocked' | 'locked' | 'in-progress'; label: string }[] = [
    { value: 'all', label: 'All Status' },
    { value: 'unlocked', label: 'Unlocked' },
    { value: 'locked', label: 'Locked' },
    { value: 'in-progress', label: 'In Progress' }
  ];

  readonly rarityOptions: { value: RarityLevel | 'all'; label: string }[] = [
    { value: 'all', label: 'All Rarities' },
    { value: RarityLevel.COMMON, label: 'Common' },
    { value: RarityLevel.RARE, label: 'Rare' },
    { value: RarityLevel.EPIC, label: 'Epic' },
    { value: RarityLevel.LEGENDARY, label: 'Legendary' }
  ];

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
