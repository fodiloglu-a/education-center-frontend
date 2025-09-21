import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { Location } from '@angular/common';
import {TranslatePipe} from "@ngx-translate/core";

@Component({
  selector: 'app-error-401',
  templateUrl: './error-401.component.html',
  standalone: true,
  imports: [
    TranslatePipe
  ],
  styleUrls: ['./error-401.component.css']
})
export class Error401Component {

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

  login(): void {
    this.router.navigate(['/login']);
  }

  contactSupport(): void {
    this.router.navigate(['/support']);
  }
}