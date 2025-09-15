// src/app/core/services/sitemap.service.ts

import { Injectable } from '@angular/core';

export interface SitemapUrl {
    loc: string;
    lastmod?: string;
    changefreq?: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never';
    priority?: number;
}

@Injectable({
    providedIn: 'root'
})
export class SitemapService {

    private baseUrl = 'https://uademi.com';

    constructor() { }

    // Statik sayfa URL'leri
    private getStaticUrls(): SitemapUrl[] {
        const today = new Date().toISOString().split('T')[0];

        return [
            {
                loc: this.baseUrl,
                lastmod: today,
                changefreq: 'daily',
                priority: 1.0
            },
            {
                loc: `${this.baseUrl}/courses`,
                lastmod: today,
                changefreq: 'daily',
                priority: 0.9
            },
            {
                loc: `${this.baseUrl}/reviews`,
                lastmod: today,
                changefreq: 'weekly',
                priority: 0.7
            },
            {
                loc: `${this.baseUrl}/auth/login`,
                lastmod: today,
                changefreq: 'monthly',
                priority: 0.6
            },
            {
                loc: `${this.baseUrl}/auth/register`,
                lastmod: today,
                changefreq: 'monthly',
                priority: 0.6
            }
        ];
    }

    // Dinamik kurs URL'leri (ileride API'den gelecek)
    private async getDynamicCourseUrls(): Promise<SitemapUrl[]> {
        try {
            // TODO: Gerçek API'den kurs listesini çek
            // const courses = await this.courseService.getAllPublicCourses();

            // Şimdilik örnek veriler
            const sampleCourses = [
                { id: 1, slug: 'angular-temelleri', lastModified: '2024-01-15' },
                { id: 2, slug: 'react-ileri-seviye', lastModified: '2024-01-20' },
                { id: 3, slug: 'typescript-proje-gelistirme', lastModified: '2024-01-25' }
            ];

            return sampleCourses.map(course => ({
                loc: `${this.baseUrl}/courses/${course.id}`,
                lastmod: course.lastModified,
                changefreq: 'weekly' as const,
                priority: 0.8
            }));

        } catch (error) {
            console.error('Dinamik URL\'ler alınırken hata:', error);
            return [];
        }
    }

    // XML sitemap oluştur
    async generateSitemap(): Promise<string> {
        const staticUrls = this.getStaticUrls();
        const dynamicUrls = await this.getDynamicCourseUrls();
        const allUrls = [...staticUrls, ...dynamicUrls];

        let sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`;

        for (const url of allUrls) {
            sitemap += `
  <url>
    <loc>${url.loc}</loc>`;

            if (url.lastmod) {
                sitemap += `
    <lastmod>${url.lastmod}</lastmod>`;
            }

            if (url.changefreq) {
                sitemap += `
    <changefreq>${url.changefreq}</changefreq>`;
            }

            if (url.priority) {
                sitemap += `
    <priority>${url.priority}</priority>`;
            }

            sitemap += `
  </url>`;
        }

        sitemap += `
</urlset>`;

        return sitemap;
    }

    // JSON sitemap (development için)
    async generateJsonSitemap(): Promise<SitemapUrl[]> {
        const staticUrls = this.getStaticUrls();
        const dynamicUrls = await this.getDynamicCourseUrls();
        return [...staticUrls, ...dynamicUrls];
    }

    // Belirli bir URL'i sitemap'e ekle (ileride kullanmak için)
    addUrlToSitemap(url: string, priority: number = 0.5, changefreq: 'daily' | 'weekly' | 'monthly' = 'weekly'): void {
        // Bu metod ileride dinamik URL ekleme için kullanılabilir
        console.log(`URL sitemap'e eklendi: ${url}`);
    }

    // URL'i sitemap'ten kaldır (ileride kullanmak için)
    removeUrlFromSitemap(url: string): void {
        // Bu metod ileride URL kaldırma için kullanılabilir
        console.log(`URL sitemap'ten kaldırıldı: ${url}`);
    }
}