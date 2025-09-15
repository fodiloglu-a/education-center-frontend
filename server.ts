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

  // ===== 1. SITEMAP.XML - EN ÖNCELİKLİ =====
  server.get('/sitemap.xml', (req, res) => {
    console.log('Sitemap route çağrıldı');

    const baseUrl = 'https://uademi.com';
    const today = new Date().toISOString().split('T')[0];

    const staticUrls = [
      { loc: baseUrl, priority: '1.0', changefreq: 'daily' },
      { loc: `${baseUrl}/courses`, priority: '0.9', changefreq: 'daily' },
      { loc: `${baseUrl}/reviews`, priority: '0.7', changefreq: 'weekly' },
      { loc: `${baseUrl}/auth/login`, priority: '0.6', changefreq: 'monthly' },
      { loc: `${baseUrl}/auth/register`, priority: '0.6', changefreq: 'monthly' }
    ];

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

    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.send(sitemap);
  });

  // ===== 2. ROBOTS.TXT =====
  server.get('/robots.txt', (req, res) => {
    console.log('Robots.txt route çağrıldı');

    res.setHeader('Content-Type', 'text/plain');
    res.setHeader('Cache-Control', 'public, max-age=86400');

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

  // ===== 3. STATIC FILES =====
  server.use(express.static(browserDistFolder, {
    maxAge: '1y',
    setHeaders: (res, path) => {
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('X-Frame-Options', 'DENY');
      res.setHeader('X-XSS-Protection', '1; mode=block');

      if (path.endsWith('.js') || path.endsWith('.css')) {
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      } else if (path.endsWith('.html')) {
        res.setHeader('Cache-Control', 'public, max-age=0, must-revalidate');
      }
    }
  }));

  // ===== 4. ANGULAR ROUTES - EN SONDA =====
  server.get('*', (req, res, next) => {
    const { protocol, originalUrl, baseUrl, headers } = req;

    console.log(`Angular route: ${originalUrl}`);

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
            { provide: 'IS_BOT', useValue: isBot }
          ],
        })
        .then((html) => {
          res.setHeader('Content-Type', 'text/html; charset=utf-8');

          if (isBot) {
            res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=7200');
          } else {
            res.setHeader('Cache-Control', 'public, max-age=60, s-maxage=300');
          }

          res.setHeader('X-Content-Type-Options', 'nosniff');
          res.setHeader('X-Frame-Options', 'SAMEORIGIN');
          res.setHeader('X-XSS-Protection', '1; mode=block');
          res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

          res.send(html);
        })
        .catch((err) => {
          console.error('Angular SSR hatası:', err);
          next(err);
        });
  });

  return server;
}

function run(): void {
  const port = process.env['PORT'] || 4000;

  const server = app();
  server.listen(port, () => {
    console.log(`Server başlatıldı: http://localhost:${port}`);
    console.log(`Robots.txt: http://localhost:${port}/robots.txt`);
    console.log(`Sitemap.xml: http://localhost:${port}/sitemap.xml`);
  });
}

run();