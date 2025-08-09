// alert-dialog.component.ts

import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common'; // ngIf gibi direktifler için
import { TranslateModule } from '@ngx-translate/core'; // ngx-translate için

// AlertDialogComponent, kullanıcıya çeşitli türde (başarı, hata, bilgi vb.) mesajları gösteren yeniden kullanılabilir bir bileşendir.
@Component({
  selector: 'app-alert-dialog', // Bileşenin HTML'de kullanılacağı etiket
  standalone: true, // Bu bileşenin bağımsız (standalone) olduğunu belirtir
  imports: [CommonModule, TranslateModule], // Gerekli modüller
  templateUrl: './alert-dialog.component.html', // Bileşenin HTML şablonu
  styleUrl: './alert-dialog.component.css' // Bileşenin CSS stil dosyası
})
export class AlertDialogComponent implements OnInit {
  @Input({transform: (value: string | null): string => ''}) message: string = ''; // Gösterilecek mesaj
  @Input() type: 'success' | 'error' | 'info' | 'warning' = 'info'; // Mesajın türü
  @Input() showCloseButton: boolean = true; // Kapatma butonu gösterilsin mi?
  @Input() autoClose: boolean = false; // Otomatik kapansın mı?
  @Input() autoCloseDelay: number = 3000; // Otomatik kapanma gecikmesi (ms)

  @Output() closed = new EventEmitter<void>(); // Kapatma olayı

  private timeoutId: any; // Otomatik kapanma zamanlayıcısı için
  @Input() isError!: boolean;

  ngOnInit(): void {
    if (this.autoClose) {
      this.timeoutId = setTimeout(() => {
        this.close();
      }, this.autoCloseDelay);
    }
  }

  /**
   * Alert dialog'u kapatır ve 'closed' olayını tetikler.
   */
  close(): void {
    clearTimeout(this.timeoutId); // Zamanlayıcıyı temizle
    this.closed.emit(); // Olayı tetikle
  }

  /**
   * Mesaj türüne göre Material Icon adını döndürür.
   * @returns İkon adı string'i.
   */
  getIconName(): string {
    switch (this.type) {
      case 'success': return 'check_circle';
      case 'error': return 'error';
      case 'warning': return 'warning';
      case 'info': return 'info';
      default: return 'info';
    }
  }
}
