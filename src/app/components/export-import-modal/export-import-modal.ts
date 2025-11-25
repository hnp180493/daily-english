import { Component, inject, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ExportImportService, ExportData } from '../../services/export-import.service';

@Component({
  selector: 'app-export-import-modal',
  imports: [CommonModule],
  templateUrl: './export-import-modal.html',
  styleUrl: './export-import-modal.scss'
})
export class ExportImportModal {
  private exportImportService = inject(ExportImportService);

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
      next: (exportData: ExportData) => {
        this.successMessage = 'Nhập dữ liệu thành công!';
        this.isImporting = false;
        
        // Close modal after 2 seconds and reload
        setTimeout(() => {
          this.onClose();
          window.location.reload();
        }, 1000);
      },
      error: (error) => {
        this.errorMessage = error.message || 'Không thể nhập dữ liệu';
        this.isImporting = false;
      }
    });
  }
}
