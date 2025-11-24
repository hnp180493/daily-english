import { Component, inject, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ExportImportService } from '../../services/export-import.service';
import { ProgressService } from '../../services/progress.service';
import { StorageAdapterFactory } from '../../services/storage/storage-adapter-factory.service';
import { UserProgress } from '../../models/exercise.model';

@Component({
  selector: 'app-export-import-modal',
  imports: [CommonModule],
  templateUrl: './export-import-modal.html',
  styleUrl: './export-import-modal.scss'
})
export class ExportImportModal {
  private exportImportService = inject(ExportImportService);
  private progressService = inject(ProgressService);
  private storageFactory = inject(StorageAdapterFactory);

  @Output() close = new EventEmitter<void>();

  isExporting = false;
  isImporting = false;
  errorMessage = '';
  successMessage = '';

  onClose(): void {
    this.close.emit();
  }

  onExport(): void {
    this.isExporting = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.exportImportService.exportProgress().subscribe({
      next: (blob) => {
        const filename = this.exportImportService.generateExportFilename();
        this.exportImportService.downloadBlob(blob, filename);
        this.successMessage = 'Xuất dữ liệu thành công!';
        this.isExporting = false;
      },
      error: (error) => {
        this.errorMessage = error.message || 'Không thể xuất dữ liệu';
        this.isExporting = false;
      }
    });
  }

  onImportClick(): void {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e: any) => {
      const file = e.target?.files?.[0];
      if (file) {
        this.handleImport(file);
      }
    };
    input.click();
  }

  private handleImport(file: File): void {
    this.isImporting = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.exportImportService.importProgress(file).subscribe({
      next: (progress: UserProgress) => {
        // Merge imported data with current progress
        this.mergeProgress(progress);
        this.successMessage = 'Nhập dữ liệu thành công!';
        this.isImporting = false;
        
        // Close modal after 2 seconds
        setTimeout(() => {
          this.onClose();
        }, 2000);
      },
      error: (error) => {
        this.errorMessage = error.message || 'Không thể nhập dữ liệu';
        this.isImporting = false;
      }
    });
  }

  private mergeProgress(importedProgress: UserProgress): void {
    this.progressService.getUserProgress().subscribe(currentProgress => {
      // Merge exercise history - keep the best score for each exercise
      const mergedExerciseHistory = { ...currentProgress.exerciseHistory };
      
      Object.entries(importedProgress.exerciseHistory).forEach(([exerciseId, attempt]) => {
        const existing = mergedExerciseHistory[exerciseId];
        if (!existing || attempt.accuracyScore > existing.accuracyScore) {
          mergedExerciseHistory[exerciseId] = attempt;
        }
      });

      // Merge dictation history
      const mergedDictationHistory = { ...currentProgress.dictationHistory };
      
      Object.entries(importedProgress.dictationHistory || {}).forEach(([exerciseId, attempt]) => {
        const existing = mergedDictationHistory[exerciseId];
        if (!existing || attempt.overallAccuracy > existing.overallAccuracy) {
          mergedDictationHistory[exerciseId] = attempt;
        }
      });

      // Calculate totals
      const allAttempts = Object.values(mergedExerciseHistory);
      const totalPoints = allAttempts.reduce((sum, attempt) => sum + attempt.pointsEarned, 0);

      // Merge achievements
      const mergedAchievements = Array.from(new Set([
        ...currentProgress.achievements,
        ...importedProgress.achievements
      ]));

      // Create merged progress
      const mergedProgress: UserProgress = {
        exerciseHistory: mergedExerciseHistory,
        dictationHistory: mergedDictationHistory,
        totalPoints,
        lastActivityDate: new Date(),
        currentStreak: Math.max(currentProgress.currentStreak, importedProgress.currentStreak),
        longestStreak: Math.max(
          currentProgress.longestStreak || 0,
          importedProgress.longestStreak || 0
        ),
        lastStreakDate: currentProgress.lastStreakDate || importedProgress.lastStreakDate,
        achievements: mergedAchievements
      };

      // Save merged progress
      const adapter = this.storageFactory.getAdapter();
      adapter.saveProgress(mergedProgress).subscribe({
        next: () => {
          console.log('[ExportImportModal] Progress merged and saved');
          // Force reload progress
          window.location.reload();
        },
        error: (error) => {
          console.error('[ExportImportModal] Failed to save merged progress:', error);
          this.errorMessage = 'Không thể lưu dữ liệu đã nhập';
        }
      });
    });
  }
}
