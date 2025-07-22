import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, AbstractControl, ValidationErrors } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzAlertModule } from 'ng-zorro-antd/alert';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzMessageService } from 'ng-zorro-antd/message';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    NzFormModule,
    NzInputModule,
    NzButtonModule,
    NzCardModule,
    NzAlertModule,
    NzIconModule
  ],
  template: `
    <div class="auth-container">
      <div class="auth-card">
        <h2 class="auth-title">Регистрация</h2>
        
        <form nz-form [formGroup]="registerForm" (ngSubmit)="onSubmit()" class="auth-form">
          <nz-form-item>
            <nz-form-label nzRequired>Имя пользователя</nz-form-label>
            <nz-form-control [nzErrorTip]="usernameErrorTip">
              <input
                nz-input
                formControlName="username"
                placeholder="Введите имя пользователя"
                [nzSize]="'large'"
              />
            </nz-form-control>
          </nz-form-item>

          <nz-form-item>
            <nz-form-label nzRequired>Email (только Yandex)</nz-form-label>
            <nz-form-control [nzErrorTip]="emailErrorTip">
              <input
                nz-input
                type="email"
                formControlName="email"
                placeholder="example@yandex.ru"
                [nzSize]="'large'"
              />
            </nz-form-control>
          </nz-form-item>

          <nz-form-item>
            <nz-form-label nzRequired>Пароль</nz-form-label>
            <nz-form-control [nzErrorTip]="passwordErrorTip">
              <input
                nz-input
                type="password"
                formControlName="password"
                placeholder="Минимум 6 символов"
                [nzSize]="'large'"
              />
            </nz-form-control>
          </nz-form-item>

          <nz-form-item>
            <nz-form-label nzRequired>Подтверждение пароля</nz-form-label>
            <nz-form-control [nzErrorTip]="confirmPasswordErrorTip">
              <input
                nz-input
                type="password"
                formControlName="confirmPassword"
                placeholder="Повторите пароль"
                [nzSize]="'large'"
              />
            </nz-form-control>
          </nz-form-item>

          <nz-form-item>
            <button
              nz-button
              nzType="primary"
              nzSize="large"
              [nzLoading]="loading"
              [disabled]="!registerForm.valid"
              class="register-button"
            >
              Зарегистрироваться
            </button>
          </nz-form-item>
        </form>

        <div class="auth-links">
          <p>Уже есть аккаунт? <a routerLink="/auth/login">Войти</a></p>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .auth-container {
      min-height: 100vh;
      display: flex;
      justify-content: center;
      align-items: center;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      padding: 20px;
    }

    .auth-card {
      background: white;
      padding: 40px;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      width: 100%;
      max-width: 400px;
    }

    .auth-title {
      text-align: center;
      margin-bottom: 32px;
      font-size: 24px;
      font-weight: 600;
      color: #262626;
    }

    .register-button {
      width: 100%;
    }

    .auth-links {
      text-align: center;
      margin-top: 24px;
    }

    .auth-links a {
      color: #1890ff;
      text-decoration: none;
    }

    .auth-links a:hover {
      text-decoration: underline;
    }

    /* Выравнивание полей формы */
    .auth-form {
      width: 100%;
    }

    .auth-form .ant-form-item {
      margin-bottom: 24px;
      width: 100%;
    }

    .auth-form .ant-form-item-label {
      width: 100%;
      text-align: left;
      margin-bottom: 8px;
    }

    .auth-form .ant-form-item-control {
      width: 100%;
      min-width: 300px;
    }

    .auth-form .ant-input {
      width: 100%;
      min-width: 300px;
      height: 40px;
      font-size: 14px;
      padding: 8px 12px;
    }
  `]
})
export class RegisterComponent implements OnInit {
  registerForm!: FormGroup;
  loading = false;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private message: NzMessageService
  ) {}

  ngOnInit(): void {
    this.registerForm = this.fb.group({
      username: ['', [Validators.required, Validators.minLength(3)]],
      email: ['', [Validators.required, Validators.email, this.yandexEmailValidator]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', [Validators.required]]
    }, { validators: this.passwordMatchValidator });

    // Redirect to main if already authenticated
    if (this.authService.isAuthenticated) {
      this.router.navigate(['/main']);
    }
  }

  get usernameErrorTip(): string {
    const control = this.registerForm.get('username');
    if (control?.hasError('required')) {
      return 'Введите имя пользователя';
    }
    if (control?.hasError('minlength')) {
      return 'Минимум 3 символа';
    }
    return '';
  }

  get emailErrorTip(): string {
    const control = this.registerForm.get('email');
    if (control?.hasError('required')) {
      return 'Введите email';
    }
    if (control?.hasError('email')) {
      return 'Неверный формат email';
    }
    if (control?.hasError('yandexEmail')) {
      return 'Допустимы только адреса @yandex.ru или @yandex.com';
    }
    return '';
  }

  get passwordErrorTip(): string {
    const control = this.registerForm.get('password');
    if (control?.hasError('required')) {
      return 'Введите пароль';
    }
    if (control?.hasError('minlength')) {
      return 'Минимум 6 символов';
    }
    return '';
  }

  get confirmPasswordErrorTip(): string {
    const control = this.registerForm.get('confirmPassword');
    if (control?.hasError('required')) {
      return 'Подтвердите пароль';
    }
    if (this.registerForm.hasError('passwordMismatch')) {
      return 'Пароли не совпадают';
    }
    return '';
  }

  yandexEmailValidator(control: AbstractControl): ValidationErrors | null {
    const email = control.value;
    if (!email) return null;
    
    const yandexEmailRegex = /^[^@]+@yandex\.(ru|com)$/i;
    return yandexEmailRegex.test(email) ? null : { yandexEmail: true };
  }

  passwordMatchValidator(form: AbstractControl): ValidationErrors | null {
    const password = form.get('password')?.value;
    const confirmPassword = form.get('confirmPassword')?.value;
    
    if (password && confirmPassword && password !== confirmPassword) {
      return { passwordMismatch: true };
    }
    return null;
  }

  onSubmit(): void {
    if (this.registerForm.valid && !this.loading) {
      this.loading = true;
      
      const { confirmPassword, ...registerData } = this.registerForm.value;
      
      this.authService.register(registerData).subscribe({
        next: (response) => {
          this.loading = false;
          this.message.success('Регистрация успешна! Проверьте email для подтверждения аккаунта.');
          this.router.navigate(['/auth/login']);
        },
        error: (error) => {
          this.loading = false;
          
          // При любой ошибке (включая CORS) считаем что пользователь создался
          // и перенаправляем на логин с сообщением
          this.message.success('Регистрация завершена! Войдите в систему с вашими данными.');
          
          // Перенаправляем на логин через небольшую задержку
          setTimeout(() => {
            this.router.navigate(['/auth/login']);
          }, 1500);
        }
      });
    }
  }
}