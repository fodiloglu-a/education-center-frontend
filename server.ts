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

  // ============================================================
  // CACHE CONTROL MIDDLEWARE - Set headers for all responses
  // ============================================================
  server.use((req, res, next) => {
    // HTML files - No cache (always get fresh)
    if (req.url.endsWith('.html') || req.url === '/') {
      res.set('Cache-Control', 'no-cache, no-store, must-revalidate, max-age=0');
      res.set('Pragma', 'no-cache');
      res.set('Expires', '0');
    }
    // Versioned/hashed assets (JS, CSS with hash in filename) - Cache 1 year
    else if (/\.(js|css)$/.test(req.url) && /[a-zA-Z0-9]{8,}/.test(req.url)) {
      res.set('Cache-Control', 'public, max-age=31536000, immutable');
    }
    // Images - Cache 1 year
    else if (/\.(png|jpg|jpeg|gif|svg|webp|ico)$/.test(req.url)) {
      res.set('Cache-Control', 'public, max-age=31536000, immutable');
    }
    // Fonts - Cache 1 year
    else if (/\.(woff|woff2|ttf|eot|otf)$/.test(req.url)) {
      res.set('Cache-Control', 'public, max-age=31536000, immutable');
    }
    // Other static assets - Cache 1 hour
    else if (/\.(js|css|txt|json|xml)$/.test(req.url)) {
      res.set('Cache-Control', 'public, max-age=3600');
    }

    next();
  });

  // Serve sitemap.xml and robots.txt explicitly from the root of the browser dist folder
  server.get('/sitemap.xml', (req, res) => {
    res.set('Cache-Control', 'public, max-age=604800'); // Cache for 1 week
    res.sendFile(join(browserDistFolder, 'sitemap.xml'));
  });

  server.get('/robots.txt', (req, res) => {
    res.set('Cache-Control', 'public, max-age=604800'); // Cache for 1 week
    res.sendFile(join(browserDistFolder, 'robots.txt'));
  });

  // Serve static files from /browser with optimized caching
  server.get('*.*', express.static(browserDistFolder, {
    maxAge: '1y', // Express static cache setting
    etag: false   // Disable etag for better performance
  }));

  // All regular routes use the Angular engine
  server.get('*', (req, res, next) => {
    const { protocol, originalUrl, baseUrl, headers } = req;

    commonEngine
        .render({
          bootstrap,
          documentFilePath: indexHtml,
          url: `${protocol}://${headers.host}${originalUrl}`,
          publicPath: browserDistFolder,
          providers: [{ provide: APP_BASE_HREF, useValue: baseUrl }],
        })
        .then((html) => res.send(html))
        .catch((err) => next(err));
  });

  return server;
}

function run(): void {
  const port = process.env['PORT'] || 4000;

  // Start up the Node server
  const server = app();
  server.listen(port, () => {
    console.log(`Node Express server listening on http://localhost:${port}`);
  });
}

// Webpack will replace 'require' with '__webpack_require__'
// '__non_webpack_require__' is a proxy to Node's original 'require'.
// The below code is to ensure that the server is run only when not requiring the bundle.
declare const __non_webpack_require__: NodeRequire;
const mainModule = __non_webpack_require__.main;
const moduleFilename = mainModule && !mainModule.filename.includes('://') ? mainModule.filename : '__filename';
if (moduleFilename === __filename) {
  run();
}