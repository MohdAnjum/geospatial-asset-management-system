/**
 * ============================================================================
 *  LOGIN PAGE
 * ============================================================================
 *  Dark-themed sign-in screen. Uses a Reactive FormGroup (username + password,
 *  both required). On submit it calls AuthService.login():
 *    - success -> navigate to /dashboard
 *    - error   -> show a PrimeNG toast (no navigation)
 *
 *  In mock mode any non-empty credentials succeed, so a hint is shown.
 * ============================================================================
 */
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';

import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { PasswordModule } from 'primeng/password';
import { MessageService } from 'primeng/api';

import { AuthService } from '../../../../core/services/auth.service';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule, ButtonModule, InputTextModule, PasswordModule],
  templateUrl: './login.html',
  styleUrl: './login.scss',
})
export class LoginComponent {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly toast = inject(MessageService);

  /** Disables the submit button while the (mock or real) login is in flight. */
  readonly loading = signal(false);
  /** Shown in the template so demo users know mock creds are accepted. */
  readonly mockMode = environment.mockMode;

  /** Reactive form — both fields required. */
  readonly form = this.fb.nonNullable.group({
    username: ['admin', [Validators.required]],
    password: ['Admin@1234', [Validators.required]],
  });

  /** Submit handler. */
  onSubmit(): void {
    // Guard: if invalid, flag all controls so error styles show, then bail.
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    this.auth.login(this.form.getRawValue()).subscribe({
      next: () => {
        this.loading.set(false);
        this.router.navigate(['/dashboard']);
      },
      error: (err) => {
        this.loading.set(false);
        this.toast.add({
          severity: 'error',
          summary: 'Login failed',
          detail: err?.error?.message ?? 'Invalid username or password.',
          life: 4000,
        });
      },
    });
  }
}
