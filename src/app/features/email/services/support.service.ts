import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';
import { SupportRequest, SupportResponse } from '../models/support-request.model';

/**
 * Support Service
 * Destek talebi gönderme işlemlerini yönetir
 */
@Injectable({
    providedIn: 'root'
})
export class SupportService {
    private apiUrl = `${environment.apiUrl}/support`;

    constructor(private http: HttpClient) {}

    /**
     * Destek talebi gönderir
     * @param supportRequest Destek talebi bilgileri
     * @returns Observable<SupportResponse>
     */
    sendSupportRequest(supportRequest: SupportRequest): Observable<SupportResponse> {
        const headers = new HttpHeaders({
            'Content-Type': 'application/json'
        });

        return this.http.post<SupportResponse>(this.apiUrl, supportRequest, { headers })
            .pipe(
                catchError(this.handleError)
            );
    }

    /**
     * Health check - Servis durumu kontrolü
     * @returns Observable<any>
     */
    checkHealth(): Observable<any> {
        return this.http.get(`${this.apiUrl}/health`)
            .pipe(
                catchError(this.handleError)
            );
    }

    /**
     * Hata yönetimi
     */
    private handleError(error: any): Observable<never> {
        let errorMessage = 'Bir hata oluştu. Lütfen daha sonra tekrar deneyin.';

        if (error.error instanceof ErrorEvent) {
            // Client-side hata
            errorMessage = `Hata: ${error.error.message}`;
        } else {
            // Server-side hata
            if (error.status === 400 && error.error?.message) {
                errorMessage = error.error.message;
            } else if (error.status === 500) {
                errorMessage = 'Sunucu hatası. Lütfen daha sonra tekrar deneyin.';
            } else if (error.status === 0) {
                errorMessage = 'Sunucuya bağlanılamadı. İnternet bağlantınızı kontrol edin.';
            }
        }

        console.error('Support Service Error:', error);
        return throwError(() => new Error(errorMessage));
    }
}