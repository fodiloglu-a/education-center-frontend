import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { Location } from '@angular/common';
import {TranslatePipe} from "@ngx-translate/core";

@Component({
  selector: 'app-error-500',
  templateUrl: './error-500.component.html',
  standalone: true,
  imports: [
    TranslatePipe
  ],
  styleUrls: ['./error-500.component.css']
})
export class Error500Component {

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

  retry(): void {
    window.location.reload();
  }

  contactSupport(): void {
    this.router.navigate(['/support']);
  }
}