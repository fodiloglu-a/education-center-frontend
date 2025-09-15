import { APP_BASE_HREF } from '@angular/common';
import { CommonEngine } from '@angular/ssr';
import express from 'express';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import bootstrap from './src/main.server';

// The Express app is exported so that it can be used by serverless Functions.
export function app(): express.Express {
  const server = express();
  const serverDistFolder = dirname(fileURLToPath(import.meta.url));
  const browserDistFolder = resolve(serverDistFolder, '../browser');
  const indexHtml = join(serverDistFolder, 'index.server.html');

  const commonEngine = new CommonEngine();

  server.set('view engine', 'html');
  server.set('views', browserDistFolder);

  // ===== SEO ROUTE'LARI (EN ÜSTTE - ÖNCELİK) =====

  // robots.txt route'u
  server.get('/robots.txt', (req, res) => {
    console.log('🤖 Robots.txt route çağrıldı'); // Debug log
    res.setHeader('Content-Type', 'text/plain');
    res.setHeader('Cache-Control', 'public, max-age=86400'); // 24 saat cache

    const robotsTxt = `User-agent: *
Allow: /

# SEO-friendly paths
Allow: /courses
Allow: /reviews
Allow: /auth/login
Allow: /auth/register

# Protected areas - discourage indexing
Disallow: /admin
Disallow: /instructor
Disallow: /profile
Disallow: /certificates

# Static assets
Allow: /assets/
Allow: /*.css
Allow: /*.js
Allow: /*.jpg
Allow: /*.jpeg
Allow: /*.png
Allow: /*.gif
Allow: /*.svg
Allow: /*.webp

# Sitemap location
Sitemap: https://uademi.com/sitemap.xml

# Crawl delay (optional - helps prevent server overload)
Crawl-delay: 1`;

    res.send(robotsTxt);
  });

  // sitemap.xml route'u - MUTLAKA static handler'dan ÖNCE olmalı
  server.get('/sitemap.xml', (req, res) => {
    console.log('🗺️ Sitemap.xml route çağrıldı'); // Debug log

    const baseUrl = 'https://uademi.com';
    const today = new Date().toISOString().split('T')[0];

    // Statik URL'ler
    const staticUrls = [
      { loc: baseUrl, priority: '1.0', changefreq: 'daily' },
      { loc: `${baseUrl}/courses`, priority: '0.9', changefreq: 'daily' },
      { loc: `${baseUrl}/reviews`, priority: '0.7', changefreq: 'weekly' },
      { loc: `${baseUrl}/auth/login`, priority: '0.6', changefreq: 'monthly' },
      { loc: `${baseUrl}/auth/register`, priority: '0.6', changefreq: 'monthly' }
    ];

    // TODO: İleride dinamik kurs URL'lerini buraya ekleyebilirsin
    // const dynamicUrls = await getDynamicCourseUrls();

    let sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`;

    staticUrls.forEach(url => {
      sitemap += `
  <url>
    <loc>${url.loc}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${url.changefreq}</changefreq>
    <priority>${url.priority}</priority>
  </url>`;
    });

    sitemap += `
</urlset>`;

    // DOĞRU HEADERS SET ET
    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=3600'); // 1 saat cache
    res.setHeader('X-Robots-Tag', 'noindex'); // Sitemap'in kendisi index edilmesin

    console.log('✅ Sitemap XML response gönderildi'); // Debug log
    res.send(sitemap);
  });

  // Example Express Rest API endpoints
  // server.get('/api/**', (req, res) => { });

  // Serve static files from /browser - SPECİFİK DOSYA TİPLERİ İÇİN
  server.get(/\.(js|css|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot|webp|webm|mp4|pdf)$/i, express.static(browserDistFolder, {
    maxAge: '1y',
    setHeaders: (res, path) => {
      // Security headers
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('X-Frame-Options', 'DENY');
      res.setHeader('X-XSS-Protection', '1; mode=block');

      // Cache control for different file types
      if (path.endsWith('.js') || path.endsWith('.css')) {
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      } else if (path.endsWith('.html')) {
        res.setHeader('Cache-Control', 'public, max-age=0, must-revalidate');
      }
    }
  }));

  // All regular routes use the Angular engine - EN SONDA
  server.get('*', (req, res, next) => {
    const { protocol, originalUrl, baseUrl, headers } = req;

    // Debug log - hangi route'a geldiğini göster
    console.log(`📍 Angular route çağrıldı: ${originalUrl}`);

    // Eğer /sitemap.xml ise bu noktaya hiç gelmemesi gerekir
    if (originalUrl === '/sitemap.xml') {
      console.error('❌ HATA: sitemap.xml Angular route\'una düştü!');
      res.status(404).send('Sitemap not found');
      return;
    }

    // SEO optimizations
    const userAgent = headers['user-agent'] || '';
    const isBot = /googlebot|bingbot|yandex|baiduspider|twitterbot|facebookexternalhit|linkedinbot|whatsapp|telegrambot/i.test(userAgent);

    commonEngine
        .render({
          bootstrap,
          documentFilePath: indexHtml,
          url: `${protocol}://${headers.host}${originalUrl}`,
          publicPath: browserDistFolder,
          providers: [
            { provide: APP_BASE_HREF, useValue: baseUrl },
            // Bot detection için provider ekleyebilirsin
            { provide: 'IS_BOT', useValue: isBot }
          ],
        })
        .then((html) => {
          // SEO headers
          res.setHeader('Content-Type', 'text/html; charset=utf-8');

          // Bot'lar için cache optimization
          if (isBot) {
            res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=7200');
          } else {
            res.setHeader('Cache-Control', 'public, max-age=60, s-maxage=300');
          }

          // Security headers
          res.setHeader('X-Content-Type-Options', 'nosniff');
          res.setHeader('X-Frame-Options', 'SAMEORIGIN');
          res.setHeader('X-XSS-Protection', '1; mode=block');
          res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

          res.send(html);
        })
        .catch((err) => {
          console.error('❌ Angular SSR hatası:', err);
          next(err);
        });
  });

  return server;
}

function run(): void {
  const port = process.env['PORT'] || 4000;

  // Start up the Node server
  const server = app();
  server.listen(port, () => {
    console.log(`🚀 Node Express server listening on http://localhost:${port}`);
    console.log(`📄 Robots.txt: http://localhost:${port}/robots.txt`);
    console.log(`🗺️  Sitemap.xml: http://localhost:${port}/sitemap.xml`);
    console.log(`📋 Route Sırası: SEO Routes → Static Files → Angular Routes`);
  });
}

run();