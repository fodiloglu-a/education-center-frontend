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

  // ===== SEO ROUTES - MUTLAKA EN ÜSTTE =====

  // Sitemap.xml - Angular routing'den ÖNCE
  server.get('/sitemap.xml', function(req, res) {
    console.log('Sitemap.xml route çağrıldı - Express');

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

    staticUrls.forEach(function(url) {
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
    res.setHeader('X-Robots-Tag', 'noindex');

    console.log('Sitemap XML gönderildi');
    res.send(sitemap);
    return;
  });

  // Robots.txt
  server.get('/robots.txt', function(req, res) {
    console.log('Robots.txt route çağrıldı - Express');

    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
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

    console.log('Robots.txt gönderildi');
    res.send(robotsTxt);
    return;
  });

  // ===== STATIC FILES - SPESİFİK KONTROL =====
  server.get('*.*', function(req, res, next) {
    // SEO dosyalarını kesinlikle Angular'a yönlendirme
    if (req.path === '/sitemap.xml' || req.path === '/robots.txt') {
      console.log(`SEO dosyası static handler'a düştü: ${req.path}`);
      return next();
    }

    // Diğer static dosyalar için normal servis
    express.static(browserDistFolder, {
      maxAge: '1y',
      setHeaders: function(res, path) {
        res.setHeader('X-Content-Type-Options', 'nosniff');
        res.setHeader('X-Frame-Options', 'DENY');
        res.setHeader('X-XSS-Protection', '1; mode=block');

        if (path.endsWith('.js') || path.endsWith('.css')) {
          res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        } else if (path.endsWith('.html')) {
          res.setHeader('Cache-Control', 'public, max-age=0, must-revalidate');
        }
      }
    })(req, res, next);
  });

  // ===== ANGULAR ROUTES - EN SONDA =====
  server.get('*', function(req, res, next) {
    const { protocol, originalUrl, baseUrl, headers } = req;

    console.log(`Angular route çağrıldı: ${originalUrl}`);

    // SEO dosyaları buraya düşmemeli - eğer düşerse hata ver
    if (originalUrl === '/sitemap.xml' || originalUrl === '/robots.txt') {
      console.error(`HATA: ${originalUrl} Angular route'una düştü!`);
      res.status(500).send('SEO route error');
      return;
    }

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
        .then(function(html) {
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
        .catch(function(err) {
          console.error('Angular SSR hatası:', err);
          next(err);
        });
  });

  return server;
}

function run(): void {
  const port = process.env['PORT'] || 4000;

  const server = app();
  server.listen(port, function() {
    console.log(`🚀 Server çalışıyor: http://localhost:${port}`);
    console.log(`📄 Robots test: http://localhost:${port}/robots.txt`);
    console.log(`🗺️ Sitemap test: http://localhost:${port}/sitemap.xml`);
    console.log(`📋 Route sırası: SEO → Static → Angular`);
  });
}

run();