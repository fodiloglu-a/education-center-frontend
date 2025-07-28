// register.component.ts

import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormGroup, FormControl, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { AuthService } from '../../../../core/services/auth.service';
import { TokenService } from '../../../../core/services/token.service';
import { RegisterRequest } from '../../models/auth.models'; // RegisterRequest modelini import ediyoruz
import { catchError, finalize } from 'rxjs/operators';
import { of } from 'rxjs';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
    TranslateModule
  ],
  templateUrl: './register.component.html',
  styleUrl: './register.component.css'
})
export class RegisterComponent implements OnInit {
  registerForm!: FormGroup;
  errorMessage: string | null = null;
  isLoading: boolean = false;
  roles: { value: string; labelKey: string }[] = [
    { value: 'ROLE_USER', labelKey: 'ROLE_LEARNER' },
    { value: 'ROLE_INSTRUCTOR', labelKey: 'ROLE_INSTRUCTOR' }
  ];

  constructor(
    private authService: AuthService,
    private tokenService: TokenService,
    private router: Router,
    private translate: TranslateService
  ) { }

  ngOnInit(): void {
    this.registerForm = new FormGroup({
      firstName: new FormControl('', [Validators.required, Validators.minLength(2)]),
      lastName: new FormControl('', [Validators.required, Validators.minLength(2)]),
      email: new FormControl('', [Validators.required, Validators.email]),
      password: new FormControl('', [Validators.required, Validators.minLength(6)]),
      role: new FormControl('ROLE_USER', [Validators.required]) // Varsayılan değer 'ROLE_USER'
    });
  }

  get firstName() { return this.registerForm.get('firstName'); }
  get lastName() { return this.registerForm.get('lastName'); }
  get email() { return this.registerForm.get('email'); }
  get password() { return this.registerForm.get('password'); }
  get role() { return this.registerForm.get('role'); }


  /**
   * Kayıt formunu gönderir.
   * Backend API'sine kullanıcı kayıt isteği gönderir.
   */
  onSubmit(): void {
    this.errorMessage = null;

    if (this.registerForm.invalid) {
      this.errorMessage = this.translate.instant('INVALID_FORM_DATA');
      this.registerForm.markAllAsTouched();
      return;
    }

    this.isLoading = true;

    // Form değerlerini RegisterRequest objesine ata, 'role' dahil
    const registerRequest: RegisterRequest = {
      firstName: this.firstName?.value,
      lastName: this.lastName?.value,
      email: this.email?.value,
      password: this.password?.value,
      role: this.role?.value // Düzeltilen satır: Seçilen rolü RegisterRequest'e ekle
    };

    this.authService.register(registerRequest).pipe(
      catchError(error => {
        this.errorMessage = error.message || this.translate.instant('REGISTER_FAILED_GENERIC');
        return of(null);
      }),
      finalize(() => {
        this.isLoading = false;
      })
    ).subscribe(jwtResponse => {
      if (jwtResponse) {
        this.tokenService.saveTokenAndUser(jwtResponse);
        this.router.navigate(['/profile']);
      }
    });
  }
}
