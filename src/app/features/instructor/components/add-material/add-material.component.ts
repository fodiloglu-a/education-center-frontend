import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject, takeUntil, finalize, catchError, of } from 'rxjs';
import { AddMaterialService } from "../../services/add-material.service";

@Component({
  selector: 'app-add-material',
  templateUrl: './add-material.component.html',
  standalone: true,
  imports: [CommonModule],
  styleUrls: ['./add-material.component.css']
})
export class AddMaterialComponent implements OnInit, OnDestroy {
  mediaList: string[] = [];
  isLoading = false;
  uploadProgress = 0;
  error: string | null = null;
  dragOver = false;

  // Desteklenen dosya türleri
  private readonly SUPPORTED_TYPES = [
    'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp',
    'video/mp4', 'video/webm', 'video/ogg'
  ];
  private readonly MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

  private destroy$ = new Subject<void>();

  constructor(private mediaService: AddMaterialService) {
    console.log('BETHOD GIRIS')
  }

  ngOnInit(): void {
    console.log('BETHOD GIRIS')
    this.loadMedia();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadMedia(): void {
    this.isLoading = true;
    this.error = null;

    this.mediaService.getMyMedia()
        .pipe(
            takeUntil(this.destroy$),
            finalize(() => this.isLoading = false),
            catchError(error => {
              this.handleError('Medya dosyaları yüklenirken hata oluştu', error);
              return of({ media: [] });
            })
        )
        .subscribe(res => {
          this.mediaList = res.media || [];
        });
  }

  onFileSelected(event: Event): void {
    const files = (event.target as HTMLInputElement).files;
    if (files) {
      this.handleFileUpload(Array.from(files));
    }
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    this.dragOver = true;
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    this.dragOver = false;
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    this.dragOver = false;

    const files = event.dataTransfer?.files;
    if (files) {
      this.handleFileUpload(Array.from(files));
    }
  }

  private handleFileUpload(files: File[]): void {
    const validFiles = files.filter(file => this.validateFile(file));

    if (validFiles.length === 0) {
      this.showError('Geçerli dosya bulunamadı');
      return;
    }

    if (validFiles.length === 1) {
      this.uploadSingleFile(validFiles[0]);
    } else {
      this.uploadMultipleFiles(validFiles);
    }
  }

  private validateFile(file: File): boolean {
    // Dosya boyutu kontrolü
    if (file.size > this.MAX_FILE_SIZE) {
      this.showError(`${file.name} dosyası çok büyük. Maksimum ${this.MAX_FILE_SIZE / 1024 / 1024}MB olmalı.`);
      return false;
    }

    // Dosya türü kontrolü
    if (!this.SUPPORTED_TYPES.includes(file.type)) {
      this.showError(`${file.name} desteklenmeyen dosya türü.`);
      return false;
    }

    return true;
  }

  private uploadSingleFile(file: File): void {
    this.isLoading = true;
    this.uploadProgress = 0;
    this.error = null;

    this.mediaService.uploadFile(file)
        .pipe(
            takeUntil(this.destroy$),
            finalize(() => {
              this.isLoading = false;
              this.uploadProgress = 0;
            }),
            catchError(error => {
              this.handleError('Dosya yüklenirken hata oluştu', error);
              return of(null);
            })
        )
        .subscribe(response => {
          if (response) {
            this.showSuccess('Dosya başarıyla yüklendi');
            this.loadMedia();
          }
        });
  }

  private uploadMultipleFiles(files: File[]): void {
    this.isLoading = true;
    this.error = null;
    let completed = 0;

    files.forEach(file => {
      this.mediaService.uploadFile(file)
          .pipe(
              takeUntil(this.destroy$),
              catchError(error => {
                console.error(`${file.name} yüklenirken hata:`, error);
                return of(null);
              })
          )
          .subscribe(() => {
            completed++;
            this.uploadProgress = (completed / files.length) * 100;

            if (completed === files.length) {
              this.isLoading = false;
              this.uploadProgress = 0;
              this.showSuccess(`${files.length} dosya yüklendi`);
              this.loadMedia();
            }
          });
    });
  }

  deleteMedia(url: string): void {
    const filename = this.extractFilename(url);

    if (!confirm(`${filename} dosyasını silmek istediğinizden emin misiniz?`)) {
      return;
    }

    this.mediaService.deleteMedia(filename)
        .pipe(
            takeUntil(this.destroy$),
            catchError(error => {
              this.handleError('Dosya silinirken hata oluştu', error);
              return of(null);
            })
        )
        .subscribe(response => {
          if (response !== null) {
            this.showSuccess('Dosya başarıyla silindi');
            this.loadMedia();
          }
        });
  }

  updateMedia(url: string, event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    const oldFilename = this.extractFilename(url);

    if (!file || !this.validateFile(file)) {
      return;
    }

    this.mediaService.updateMedia(oldFilename, file)
        .pipe(
            takeUntil(this.destroy$),
            catchError(error => {
              this.handleError('Dosya güncellenirken hata oluştu', error);
              return of(null);
            })
        )
        .subscribe(response => {
          if (response) {
            this.showSuccess('Dosya başarıyla güncellendi');
            this.loadMedia();
          }
        });
  }

  async copyUrl(url: string): Promise<void> {
    try {
      // URL'den filename'i çıkar
      const filename = this.extractFilenameForUrl(url);

      // Filename'i panoya kopyala
      await navigator.clipboard.writeText(filename);
      this.showSuccess('Dosya adı panoya kopyalandı');
    } catch (error) {
      // Fallback for older browsers
      const filename = this.extractFilename(url);
      const textArea = document.createElement('textarea');
      textArea.value = filename;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      this.showSuccess('Dosya adı panoya kopyalandı');
    }
  }

// Yardımcı metod: URL'den filename çıkarır
  private extractFilenameForUrl(url: string): string {
    try {
      // URL'i parse et
      const urlObj = new URL(url);

      // Path'den filename'i al (son slash'ten sonraki kısım)
      const pathname = urlObj.pathname;
      const filename = pathname.substring(pathname.lastIndexOf('/') + 1);

      // URL decode et (örneğin %20 -> space)
      return decodeURIComponent(filename);

    } catch (error) {
      console.error('URL parse hatası:', error);

      // Fallback: Basit string işlemi
      const lastSlashIndex = url.lastIndexOf('/');
      const questionMarkIndex = url.indexOf('?', lastSlashIndex);

      if (lastSlashIndex === -1) return url;

      const start = lastSlashIndex + 1;
      const end = questionMarkIndex === -1 ? url.length : questionMarkIndex;

      return decodeURIComponent(url.substring(start, end));
    }
  }


  downloadMedia(url: string): void {
    const filename = this.extractFilename(url);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  getFileIcon(url: string): string {
    if (this.isVideo(url)) return '🎥';
    if (this.isImage(url)) return '🖼️';
    return '📄';
  }

  getFileType(url: string): string {
    if (this.isVideo(url)) return 'Video';
    if (this.isImage(url)) return 'Resim';
    return 'Dosya';
  }

  trackByUrl(index: number, url: string): string {
    return url;
  }

  protected extractFilename(url: string): string {
    return url.substring(url.lastIndexOf('/') + 1).split('?')[0];
  }

  isVideo(url: string): boolean {
    const videoExtensions = ['.mp4', '.webm', '.ogg', '.avi', '.mov'];
    return videoExtensions.some(ext => url.toLowerCase().includes(ext));
  }

  isImage(url: string): boolean {
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
    return imageExtensions.some(ext => url.toLowerCase().includes(ext));
  }

  private handleError(message: string, error: any): void {
    console.error(message, error);
    this.error = message;
  }

  private showError(message: string): void {
    this.error = message;
    setTimeout(() => this.error = null, 5000);
  }

  private showSuccess(message: string): void {
    // Toast notification için - console.log yerine toast service kullanılabilir
    console.log(message);
  }

  clearError(): void {
    this.error = null;
  }
}