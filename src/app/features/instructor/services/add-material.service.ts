import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { catchError, timeout, retry } from 'rxjs/operators';
import { environment } from "../../../../environments/environment";

export interface UploadResponse {
  url: string;
  filename: string;
}

export interface MediaListResponse {
  media: string[];
}

export interface DeleteResponse {
  message: string;
}

@Injectable({
  providedIn: 'root'
})
export class AddMaterialService {
  private readonly apiUrl = environment.apiUrl;
  private readonly REQUEST_TIMEOUT = 30000; // 30 seconds
  private readonly MAX_RETRIES = 2;

  constructor(private http: HttpClient) {}

  /**
   * Upload a single file
   */
  uploadFile(file: File): Observable<UploadResponse> {
    const formData = new FormData();
    formData.append('file', file);

    return this.http.post<UploadResponse>(`${this.apiUrl}/upload`, formData)
        .pipe(
            timeout(this.REQUEST_TIMEOUT),
            retry(this.MAX_RETRIES),
            catchError(this.handleError.bind(this))
        );
  }

  /**
   * Delete media file
   */
  deleteMedia(filename: string): Observable<DeleteResponse> {
    const params = new HttpParams().set('filename', filename);

    return this.http.delete<DeleteResponse>(`${this.apiUrl}/users/media`, { params })
        .pipe(
            timeout(this.REQUEST_TIMEOUT),
            retry(this.MAX_RETRIES),
            catchError(this.handleError.bind(this))
        );
  }

  /**
   * Update/replace existing media file
   */
  updateMedia(oldFilename: string, newFile: File): Observable<UploadResponse> {
    const formData = new FormData();
    formData.append('file', newFile);
    formData.append('oldFilename', oldFilename);

    return this.http.put<UploadResponse>(`${this.apiUrl}/users/media`, formData)
        .pipe(
            timeout(this.REQUEST_TIMEOUT),
            retry(this.MAX_RETRIES),
            catchError(this.handleError.bind(this))
        );
  }

  /**
   * Get user's media files
   */
  getMyMedia(): Observable<MediaListResponse> {
    return this.http.get<MediaListResponse>(`${this.apiUrl}/users/media`)
        .pipe(
            timeout(this.REQUEST_TIMEOUT),
            retry(this.MAX_RETRIES),
            catchError(this.handleError.bind(this))
        );
  }

  /**
   * Validate file before upload
   */
  validateFile(file: File): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    const maxSize = 50 * 1024 * 1024; // 50MB
    const allowedTypes = [
      'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp',
      'video/mp4', 'video/webm', 'video/ogg'
    ];

    // Check file size
    if (file.size > maxSize) {
      errors.push(`Dosya boyutu çok büyük. Maksimum ${maxSize / 1024 / 1024}MB olmalı.`);
    }

    // Check file type
    if (!allowedTypes.includes(file.type)) {
      errors.push('Desteklenmeyen dosya türü.');
    }

    // Check filename length
    if (file.name.length > 255) {
      errors.push('Dosya adı çok uzun.');
    }

    // Check for potentially dangerous file extensions
    const dangerousExtensions = ['.exe', '.bat', '.cmd', '.scr', '.pif', '.vbs', '.js'];
    const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));

    if (dangerousExtensions.includes(fileExtension)) {
      errors.push('Güvenlik nedeniyle bu dosya türü desteklenmiyor.');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Enhanced error handling
   */
  private handleError(error: any): Observable<never> {
    let errorMessage = 'Beklenmeyen bir hata oluştu';

    if (error.error instanceof ErrorEvent) {
      // Client-side error
      errorMessage = `Bağlantı hatası: ${error.error.message}`;
    } else {
      // Server-side error
      switch (error.status) {
        case 400:
          errorMessage = error.error?.message || 'Geçersiz istek';
          break;
        case 401:
          errorMessage = 'Oturum süresi dolmuş. Lütfen tekrar giriş yapın.';
          break;
        case 403:
          errorMessage = 'Bu işlem için yetkiniz bulunmuyor';
          break;
        case 404:
          errorMessage = 'Dosya bulunamadı';
          break;
        case 413:
          errorMessage = 'Dosya boyutu çok büyük';
          break;
        case 415:
          errorMessage = 'Desteklenmeyen dosya türü';
          break;
        case 429:
          errorMessage = 'Çok fazla istek. Lütfen bir süre bekleyin.';
          break;
        case 500:
          errorMessage = 'Sunucu hatası. Lütfen daha sonra tekrar deneyin.';
          break;
        case 503:
          errorMessage = 'Servis geçici olarak kullanılamıyor';
          break;
        default:
          errorMessage = error.error?.message || `HTTP ${error.status}: ${error.statusText}`;
      }
    }

    console.error('AddMaterialService Error:', error);
    return throwError(() => new Error(errorMessage));
  }

  /**
   * Utility method to format file size
   */
  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B';

    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Check if URL is a video
   */
  isVideoUrl(url: string): boolean {
    const videoExtensions = ['.mp4', '.webm', '.ogg', '.avi', '.mov', '.wmv'];
    return videoExtensions.some(ext => url.toLowerCase().includes(ext));
  }

  /**
   * Check if URL is an image
   */
  isImageUrl(url: string): boolean {
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp'];
    return imageExtensions.some(ext => url.toLowerCase().includes(ext));
  }

  /**
   * Extract filename from URL
   */
  extractFilename(url: string): string {
    return url.substring(url.lastIndexOf('/') + 1).split('?')[0];
  }
}