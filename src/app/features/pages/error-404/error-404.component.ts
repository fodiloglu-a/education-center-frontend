import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { Location } from '@angular/common';
import {TranslatePipe} from "@ngx-translate/core";

@Component({
  selector: 'app-error-404',
  templateUrl: './error-404.component.html',
  standalone: true,
  imports: [
    TranslatePipe
  ],
  styleUrls: ['./error-404.component.css']
})
export class Error404Component {

  constructor(
      private router: Router,
      private location: Location
  ) {}

  goHome(): void {
    this.router.navigate(['/']);
  }

  goBack(): void {
    this.location.back();
  }

  contactSupport(): void {
    // Destek sayfasına yönlendirme veya modal açma
    this.router.navigate(['/support']);
  }
}