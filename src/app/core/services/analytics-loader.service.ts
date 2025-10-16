// src/app/core/services/analytics-loader.service.ts
import { Injectable, inject, PLATFORM_ID } from '@angular/core';
import { DOCUMENT, isPlatformBrowser } from '@angular/common';

@Injectable({ providedIn: 'root' })
export class AnalyticsLoaderService {
    private doc = inject(DOCUMENT);
    private platformId = inject(PLATFORM_ID);
    private loaded = false;

    /** Google Tag (gtag/gtm) betiğini ilk kullanıcı etkileşiminde yükler (yalnızca browser) */
    initOnFirstInteraction(gaId: string) {
        // ✅ SSR guard: server tarafında hiçbir şey yapma
        if (!isPlatformBrowser(this.platformId)) return;

        const win = this.doc.defaultView; // SSR'de null olabilir, browser'da Window döner
        if (!win || this.loaded) return;

        const load = () => {
            if (this.loaded) return;
            this.loaded = true;

            // GA4 / gtag.js
            const s = this.doc.createElement('script');
            s.async = true;
            s.src = `https://www.googletagmanager.com/gtag/js?id=${gaId}`;
            this.doc.head.appendChild(s);

            const inline = this.doc.createElement('script');
            inline.text = `
        window.dataLayer = window.dataLayer || [];
        function gtag(){dataLayer.push(arguments);}
        gtag('js', new Date());
        gtag('config', '${gaId}', { anonymize_ip: true });
      `;
            this.doc.head.appendChild(inline);

            // Dinleyicileri kaldır
            win.removeEventListener('scroll', load as EventListener);
            win.removeEventListener('click', load as EventListener);
            win.removeEventListener('keydown', load as EventListener);
            win.removeEventListener('pointerdown', load as EventListener);
        };

        // İlk etkileşimde yükle
        win.addEventListener('scroll', load as EventListener, { once: true, passive: true });
        win.addEventListener('click', load as EventListener,  { once: true });
        win.addEventListener('keydown', load as EventListener,{ once: true });
        win.addEventListener('pointerdown', load as EventListener, { once: true });
    }
}
