// loading-spinner.component.ts

import {Component, Input} from '@angular/core';
import { CommonModule } from '@angular/common'; // ngIf gibi direktifler için

@Component({
  selector: 'app-loading-spinner', // Bileşenin HTML'de kullanılacağı etiket
  standalone: true, // Bu bileşenin bağımsız (standalone) olduğunu belirtir
  imports: [CommonModule], // Gerekli modüller
  templateUrl: './loading-spinner.component.html', // Bileşenin HTML şablonu
  styleUrl: './loading-spinner.component.css' // Bileşenin CSS stil dosyası
})
export class LoadingSpinnerComponent {
  // Bu bileşen basit bir yükleme animasyonu göstereceği için özel bir TypeScript mantığına ihtiyaç duymaz.
  // Sadece CSS ile görselleştirilecektir.
  @Input() message!: any;
}
