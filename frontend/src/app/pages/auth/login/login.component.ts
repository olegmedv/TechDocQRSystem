import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterModule, ActivatedRoute } from '@angular/router';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzAlertModule } from 'ng-zorro-antd/alert';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzMessageService } from 'ng-zorro-antd/message';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-login',
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
        <h2 class="auth-title">Вход в систему</h2>
        
        <form nz-form [formGroup]="loginForm" (ngSubmit)="onSubmit()" class="auth-form">
          <nz-form-item>
            <nz-form-label nzRequired>Имя пользователя</nz-form-label>
            <nz-form-control nzErrorTip="Введите имя пользователя">
              <input
                nz-input
                formControlName="username"
                placeholder="Введите имя пользователя"
                [nzSize]="'large'"
              />
            </nz-form-control>
          </nz-form-item>

          <nz-form-item>
            <nz-form-label nzRequired>Пароль</nz-form-label>
            <nz-form-control nzErrorTip="Введите пароль">
              <input
                nz-input
                type="password"
                formControlName="password"
                placeholder="Введите пароль"
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
              [disabled]="!loginForm.valid"
              class="login-button"
            >
              Войти
            </button>
          </nz-form-item>
        </form>

        <div class="auth-links">
          <p>Нет аккаунта? <a routerLink="/auth/register">Зарегистрироваться</a></p>
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

    .login-button {
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
export class LoginComponent implements OnInit {
  loginForm!: FormGroup;
  loading = false;
  returnUrl = '/main';

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute,
    private message: NzMessageService
  ) {}

  ngOnInit(): void {
    this.loginForm = this.fb.group({
      username: ['', [Validators.required]],
      password: ['', [Validators.required]]
    });

    // Get return url from route parameters or default to '/main'
    this.returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/main';

    // Redirect to main if already authenticated
    if (this.authService.isAuthenticated) {
      this.router.navigate([this.returnUrl]);
    }
  }

  onSubmit(): void {
    if (this.loginForm.valid && !this.loading) {
      this.loading = true;
      
      this.authService.login(this.loginForm.value).subscribe({
        next: (response) => {
          this.message.success('Вход выполнен успешно!');
          this.router.navigate([this.returnUrl]);
        },
        error: (error) => {
          this.loading = false;
          let errorMessage = 'Произошла ошибка при входе';
          
          if (error.error?.message) {
            errorMessage = error.error.message;
          } else if (error.status === 401) {
            errorMessage = 'Неверное имя пользователя или пароль';
          }
          
          this.message.error(errorMessage);
        }
      });
    }
  }
}