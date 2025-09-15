// src/app/core/controllers/sitemap.controller.ts

import { Component, OnInit, Inject, PLATFORM_ID } from '@angular/core';
import { Router } from '@angular/router';
import { SitemapService, SitemapUrl } from '../services/sitemap.service';
import { isPlatformServer, CommonModule } from '@angular/common';

@Component({
    selector: 'app-sitemap',
    standalone: true,
    imports: [CommonModule],
    template: `
    @if (!isServer) {
      <div class="sitemap-container">
        <h1>Site Haritası</h1>
        <p>Bu sayfa arama motorları için otomatik sitemap oluşturur.</p>
        
        @if (isLoading) {
          <div class="loading">
            <p>Sitemap yükleniyor...</p>
          </div>
        }
        
        @if (sitemap && !isLoading) {
          <div class="sitemap-content">
            <h2>Mevcut URL'ler ({{ sitemapUrls.length }} adet):</h2>
            
            <div class="url-stats">
              <p><strong>Yüksek Öncelik:</strong> {{ getUrlsByPriority(0.8).length }} URL</p>
              <p><strong>Orta Öncelik:</strong> {{ getUrlsByPriority(0.6).length }} URL</p>
              <p><strong>Düşük Öncelik:</strong> {{ getUrlsByPriority(0.5).length }} URL</p>
            </div>
            
            <ul class="url-list">
              @for (url of sitemapUrls; track url.loc) {
                <li class="url-item" [class]="getPriorityClass(url.priority)">
                  <div class="url-info">
                    <a [href]="url.loc" target="_blank" class="url-link">{{ url.loc }}</a>
                    <div class="url-meta">
                      <span class="priority">Öncelik: {{ url.priority }}</span>
                      <span class="frequency">Güncellik: {{ url.changefreq }}</span>
                      @if (url.lastmod) {
                        <span class="lastmod">Son Güncelleme: {{ url.lastmod }}</span>
                      }
                    </div>
                  </div>
                </li>
              }
            </ul>
            
            <div class="sitemap-actions">
              <button (click)="downloadSitemap()" class="download-btn">
                XML Sitemap İndir
              </button>
              <a href="/sitemap.xml" target="_blank" class="view-xml-btn">
                XML Görünümü
              </a>
            </div>
          </div>
        }
        
        @if (error) {
          <div class="error">
            <h3>Hata Oluştu</h3>
            <p>{{ error }}</p>
            <button (click)="reloadSitemap()" class="retry-btn">Tekrar Dene</button>
          </div>
        }
      </div>
    }
  `,
    styles: [`
    .sitemap-container {
      max-width: 1200px;
      margin: 0 auto;
      padding: 20px;
      font-family: Arial, sans-serif;
    }
    
    .loading {
      text-align: center;
      padding: 40px;
      color: #666;
    }
    
    .url-stats {
      background: #f5f5f5;
      padding: 15px;
      border-radius: 8px;
      margin: 20px 0;
    }
    
    .url-stats p {
      margin: 5px 0;
    }
    
    .url-list {
      list-style: none;
      padding: 0;
    }
    
    .url-item {
      border: 1px solid #ddd;
      margin: 10px 0;
      border-radius: 6px;
      overflow: hidden;
    }
    
    .url-item.high-priority {
      border-left: 4px solid #4CAF50;
    }
    
    .url-item.medium-priority {
      border-left: 4px solid #FF9800;
    }
    
    .url-item.low-priority {
      border-left: 4px solid #9E9E9E;
    }
    
    .url-info {
      padding: 15px;
    }
    
    .url-link {
      display: block;
      font-weight: bold;
      color: #1976D2;
      text-decoration: none;
      margin-bottom: 8px;
    }
    
    .url-link:hover {
      text-decoration: underline;
    }
    
    .url-meta {
      display: flex;
      gap: 15px;
      font-size: 0.9em;
      color: #666;
    }
    
    .url-meta span {
      background: #f0f0f0;
      padding: 2px 8px;
      border-radius: 4px;
    }
    
    .sitemap-actions {
      margin-top: 30px;
      text-align: center;
    }
    
    .download-btn, .view-xml-btn, .retry-btn {
      display: inline-block;
      padding: 10px 20px;
      margin: 0 10px;
      border: none;
      border-radius: 6px;
      text-decoration: none;
      cursor: pointer;
      font-weight: bold;
    }
    
    .download-btn {
      background: #4CAF50;
      color: white;
    }
    
    .view-xml-btn {
      background: #2196F3;
      color: white;
    }
    
    .retry-btn {
      background: #FF5722;
      color: white;
    }
    
    .error {
      background: #ffebee;
      border: 1px solid #f44336;
      padding: 20px;
      border-radius: 6px;
      text-align: center;
    }
    
    .error h3 {
      color: #f44336;
      margin-top: 0;
    }
  `]
})
export class SitemapController implements OnInit {

    sitemap: string = '';
    sitemapUrls: SitemapUrl[] = [];
    isServer: boolean;
    isLoading: boolean = false;
    error: string = '';

    constructor(
        private sitemapService: SitemapService,
        private router: Router,
        @Inject(PLATFORM_ID) private platformId: Object
    ) {
        this.isServer = isPlatformServer(this.platformId);
    }

    async ngOnInit(): Promise<void> {

        // Server-side rendering'de sitemap'i hazırla ama response'u server.ts'de handle edelim
        if (this.isServer) {
            try {
                console.log('Sitemap SSR modunda çalışıyor');
                return;
            } catch (error) {
                console.error('Sitemap oluşturulurken hata:', error);
                return;
            }
        }

        // Client-side'da sitemap'i yükle
        await this.loadSitemap();
    }

    async loadSitemap(): Promise<void> {
        this.isLoading = true;
        this.error = '';

        try {
            this.sitemap = await this.sitemapService.generateSitemap();
            this.sitemapUrls = await this.sitemapService.generateJsonSitemap();
            console.log(`Sitemap başarıyla yüklendi: ${this.sitemapUrls.length} URL bulundu`);
        } catch (error) {
            console.error('Sitemap yüklenirken hata:', error);
            this.error = 'Sitemap yüklenirken bir hata oluştu. Lütfen tekrar deneyin.';
        } finally {
            this.isLoading = false;
        }
    }

    // Öncelik bazında URL'leri filtrele
    getUrlsByPriority(priority: number): SitemapUrl[] {
        return this.sitemapUrls.filter(url => url.priority === priority);
    }

    // Öncelik seviyesine göre CSS class döndür
    getPriorityClass(priority?: number): string {
        if (!priority) return 'low-priority';

        if (priority >= 0.8) return 'high-priority';
        if (priority >= 0.6) return 'medium-priority';
        return 'low-priority';
    }

    // XML sitemap'i indir
    downloadSitemap(): void {
        if (!this.sitemap) {
            this.error = 'Sitemap henüz yüklenmedi';
            return;
        }

        const blob = new Blob([this.sitemap], { type: 'application/xml' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'sitemap.xml';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
    }

    // Sitemap'i yeniden yükle
    async reloadSitemap(): Promise<void> {
        await this.loadSitemap();
    }

    // Navigasyon metodu
    navigateToUrl(url: string): void {
        if (url.startsWith(this.sitemapService['baseUrl'])) {
            const path = url.replace(this.sitemapService['baseUrl'], '');
            this.router.navigate([path]);
        } else {
            window.open(url, '_blank');
        }
    }
}