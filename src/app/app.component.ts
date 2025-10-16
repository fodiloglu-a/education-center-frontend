// app.component.ts

import { Component, OnInit, OnDestroy, Renderer2, Inject, PLATFORM_ID } from '@angular/core';
import { Router, RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import {TranslatePipe, TranslateService} from '@ngx-translate/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { TokenService } from './core/services/token.service';
import { Observable, Subscription, BehaviorSubject } from 'rxjs';
import { map } from 'rxjs/operators';
import { ToastNotificationComponent } from './features/notifications/components/toast-notification/toast-notification.component';
import { NotificationBellComponent } from './features/notifications/components/notification-bell/notification-bell.component';
import { NotificationService } from './features/notifications/services/notification.service';
import {AnalyticsLoaderService} from "./core/services/analytics-loader.service";

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    CommonModule,
    TranslatePipe,
    ToastNotificationComponent,
    NotificationBellComponent
  ],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent implements OnInit, OnDestroy {
  isLoggedIn$: Observable<boolean>;
  userRole$: Observable<string | null>;
  isDarkMode: boolean = false;
  private authSubscription: Subscription = new Subscription();
  private translateSubscription: Subscription = new Subscription();
  private isMenuOpenSubject = new BehaviorSubject<boolean>(false);
  isMenuOpen$: Observable<boolean> = this.isMenuOpenSubject.asObservable();
  currentYear='12:23:2025'
  // Dil seçimi açılır menüsü için durum
  isLanguageDropdownOpen: boolean = false; // Yeni özellik

  constructor(
    private translate: TranslateService,
    private analytics: AnalyticsLoaderService,
    private tokenService: TokenService,
    private router: Router,
    private renderer: Renderer2,
    @Inject(PLATFORM_ID) private platformId: Object,
    private notificationService: NotificationService
  ) {
    this.isLoggedIn$ = this.tokenService.isLoggedIn$;
    this.userRole$ = this.tokenService.userRole$;

    if (isPlatformBrowser(this.platformId)) {
      this.isDarkMode = localStorage.getItem('theme') === 'dark';
      this.applyTheme();
    }
  }

  ngOnInit(): void {
    this.translate.setDefaultLang('uk');
    this.translate.use('uk');
    this.analytics.initOnFirstInteraction('G-66CEFC5NB5');
    this.translateSubscription.add(
        this.translate.onLangChange.subscribe(() => {
          this.updateDocumentTitle();
        })
    );
    this.updateDocumentTitle();

    this.authSubscription.add(
        this.tokenService.isLoggedIn$.subscribe(() => {
          // Oturum durumu değiştiğinde ek işlemler yapılabilir (şimdilik boş)
        })
    );

    // Kullanıcı giriş yaptıysa notification polling'i başlat
    this.authSubscription.add(
        this.tokenService.isLoggedIn$.subscribe(isLoggedIn => {
          if (isLoggedIn && isPlatformBrowser(this.platformId)) {
            this.notificationService.startPolling();
          } else {
            this.notificationService.stopPolling();
          }
        })
    );
  }

  ngOnDestroy(): void {
    this.authSubscription.unsubscribe();
    this.translateSubscription.unsubscribe();
    this.notificationService.stopPolling();  // <-- BU SATIRI EKLEYİN
  }

  /**
   * Uygulamanın dilini değiştirir ve dil açılır menüsünü kapatır.
   * @param lang Dil kodu (örn. 'uk', 'tr').
   */
  switchLanguage(lang: string): void {
    this.translate.use(lang);
    this.isLanguageDropdownOpen = false; // Dil seçildikten sonra menüyü kapat
  }

  /**
   * Temayı (açık/karanlık) değiştirir ve localStorage'a kaydeder.
   */
  toggleTheme(): void {
    this.isDarkMode = !this.isDarkMode;
    if (isPlatformBrowser(this.platformId)) {
      localStorage.setItem('theme', this.isDarkMode ? 'dark' : 'light');
    }
    this.applyTheme();
  }

  /**
   * HTML body elementine tema sınıfını uygular.
   */
  private applyTheme(): void {
    if (isPlatformBrowser(this.platformId)) {
      if (this.isDarkMode) {
        this.renderer.addClass(document.body, 'dark-mode');
      } else {
        this.renderer.removeClass(document.body, 'dark-mode');
      }
    }
  }

  /**
   * Tarayıcı sekmesinin başlığını (document.title) günceller.
   * 'APP_TITLE' çeviri anahtarını kullanır.
   */
  private updateDocumentTitle(): void {
    if (isPlatformBrowser(this.platformId)) {
      this.translate.get('APP_TITLE').subscribe((res: string) => {
        document.title = res;
      });
    }
  }

  /**
   * Kullanıcının oturumunu kapatır.
   */
  logout(): void {
    this.tokenService.signOut();
    this.router.navigate(['/auth/login']);
    this.closeMobileMenu();
  }

  /**
   * Mobil menüyü açar/kapatır.
   */
  toggleMobileMenu(): void {
    this.isMenuOpenSubject.next(!this.isMenuOpenSubject.value);
    // Mobil menü açıldığında dil açılır menüsünü kapat
    if (this.isMenuOpenSubject.value) {
      this.isLanguageDropdownOpen = false;
    }
  }

  /**
   * Mobil menüyü kapatır.
   */
  closeMobileMenu(): void {
    this.isMenuOpenSubject.next(false);
    this.isLanguageDropdownOpen = false; // Menü kapanırken dil açılır menüsünü de kapat
  }

  /**
   * Dil açılır menüsünün durumunu değiştirir.
   */
  toggleLanguageDropdown(): void {
    this.isLanguageDropdownOpen = !this.isLanguageDropdownOpen;
  }

  /**
   * Kullanıcının belirli bir role sahip olup olmadığını kontrol eder.
   * @param role Kontrol edilecek rol string'i.
   * @returns Kullanıcı bu role sahipse true, aksi takdirde false.
   */
  hasRole(role: string): Observable<boolean> {
    return this.tokenService.userRole$.pipe(
      map(userRole => userRole === role)
    );
  }
}
