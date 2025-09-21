import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { Location } from '@angular/common';
import {TranslatePipe} from "@ngx-translate/core";

@Component({
  selector: 'app-error-403',
  templateUrl: './error-403.component.html',
  standalone: true,
  imports: [
    TranslatePipe
  ],
  styleUrls: ['./error-403.component.css']
})
export class Error403Component {

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
    this.router.navigate(['/support']);
  }
}