import { ApplicationConfig, importProvidersFrom } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http'; // HttpClient ve Interceptor'lar için
import { BrowserAnimationsModule } from '@angular/platform-browser/animations'; // Animasyonlar için

import { routes } from './app.routes'; // Ana yönlendirme tanımlarımız
import { AuthInterceptor } from './core/interceptors/auth.interceptor'; // AuthInterceptor'ı import ediyoruz
import { ErrorInterceptor } from './core/interceptors/error.interceptor'; // ErrorInterceptor'ı import ediyoruz

// ngx-translate için gerekli import'lar
import { TranslateLoader, TranslateModule } from '@ngx-translate/core';
import { TranslateHttpLoader } from '@ngx-translate/http-loader';
import { HttpClient } from '@angular/common/http';

// Çeviri dosyalarını HTTP üzerinden yüklemek için fabrika fonksiyonu
// Bu fonksiyon, ngx-translate'e çeviri dosyalarının nerede olduğunu söyler.
export function HttpLoaderFactory(http: HttpClient) {
  return new TranslateHttpLoader(http, './assets/i18n/', '.json');
}

// Uygulamanın ana yapılandırması.
// Burada uygulamanın temel sağlayıcıları (providers) ve modülleri tanımlanır.
export const appConfig: ApplicationConfig = {
  providers: [
    // Router sağlayıcısını ekler
    provideRouter(routes),
    // HttpClient sağlayıcısını ve interceptor'ları ekler
    provideHttpClient(
      withInterceptors([
        AuthInterceptor, // AuthInterceptor'ı HTTP istek zincirine ekler
        ErrorInterceptor // ErrorInterceptor'ı HTTP istek zincirine ekler
      ])
    ),
    // Tarayıcı animasyon modülünü import eder
    importProvidersFrom(BrowserAnimationsModule),
    // ngx-translate modülünü yapılandırır ve import eder
    importProvidersFrom(
      TranslateModule.forRoot({
        loader: {
          provide: TranslateLoader, // TranslateLoader'ı sağlar
          useFactory: HttpLoaderFactory, // Çeviri dosyalarını yüklemek için HttpLoaderFactory'yi kullanır
          deps: [HttpClient] // HttpLoaderFactory'nin HttpClient'a bağımlı olduğunu belirtir
        }
      })
    )
  ]
};
