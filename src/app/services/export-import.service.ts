import { Injectable, inject } from '@angular/core';
import { Observable, of, throwError } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { ProgressService } from './progress.service';
import { UserProgress } from '../models/exercise.model';

export interface ExportData {
  version: string;
  exportDate: string;
  progress: UserProgress;
}

@Injectable({
  providedIn: 'root'
})
export class ExportImportService {
  private progressService = inject(ProgressService);
  private readonly EXPORT_VERSION = '1.0';

  /**
   * Export user progress as JSON file
   */
  exportProgress(): Observable<Blob> {
    return this.progressService.getUserProgress().pipe(
      map(progress => {
        const exportData: ExportData = {
          version: this.EXPORT_VERSION,
          exportDate: new Date().toISOString(),
          progress
        };

        const json = JSON.stringify(exportData, null, 2);
        return new Blob([json], { type: 'application/json' });
      }),
      catchError(error => {
        console.error('[ExportImportService] Export failed:', error);
        return throwError(() => new Error('Không thể xuất dữ liệu'));
      })
    );
  }

  /**
   * Import user progress from JSON file
   */
  importProgress(file: File): Observable<UserProgress> {
    return new Observable(observer => {
      const reader = new FileReader();

      reader.onload = (e) => {
        try {
          const content = e.target?.result as string;
          const importData: ExportData = JSON.parse(content);

          // Validate import data
          const validation = this.validateImportData(importData);
          if (!validation.isValid) {
            observer.error(new Error(validation.error));
            return;
          }

          // Return the progress data
          observer.next(importData.progress);
          observer.complete();
        } catch (error) {
          console.error('[ExportImportService] Import parsing failed:', error);
          observer.error(new Error('File không hợp lệ'));
        }
      };

      reader.onerror = () => {
        observer.error(new Error('Không thể đọc file'));
      };

      reader.readAsText(file);
    });
  }

  /**
   * Validate imported data structure
   */
  private validateImportData(data: any): { isValid: boolean; error?: string } {
    if (!data || typeof data !== 'object') {
      return { isValid: false, error: 'Dữ liệu không hợp lệ' };
    }

    if (!data.version) {
      return { isValid: false, error: 'Thiếu thông tin phiên bản' };
    }

    if (!data.progress) {
      return { isValid: false, error: 'Thiếu dữ liệu tiến trình' };
    }

    const progress = data.progress;

    // Check required fields
    if (!progress.exerciseHistory || typeof progress.exerciseHistory !== 'object') {
      return { isValid: false, error: 'Dữ liệu bài tập không hợp lệ' };
    }

    if (typeof progress.totalPoints !== 'number') {
      return { isValid: false, error: 'Dữ liệu điểm không hợp lệ' };
    }

    return { isValid: true };
  }

  /**
   * Generate filename for export
   */
  generateExportFilename(): string {
    const date = new Date();
    const dateStr = date.toISOString().split('T')[0];
    return `vietnamese-practice-${dateStr}.json`;
  }

  /**
   * Trigger download of blob
   */
  downloadBlob(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}
