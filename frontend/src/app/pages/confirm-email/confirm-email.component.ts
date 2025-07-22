import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { NzResultModule } from 'ng-zorro-antd/result';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-confirm-email',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    NzResultModule,
    NzButtonModule,
    NzSpinModule
  ],
  template: `
    <div class="confirm-container">
      <div class="confirm-content" *ngIf="!loading">
        <!-- Success state -->
        <nz-result
          *ngIf="confirmed"
          nzStatus="success"
          nzTitle="Email подтвержден!"
          nzSubTitle="Ваш аккаунт успешно активирован. Теперь вы можете войти в систему."
        >
          <div nz-result-extra>
            <button nz-button nzType="primary" routerLink="/auth/login">
              Войти в систему
            </button>
          </div>
        </nz-result>

        <!-- Error state -->
        <nz-result
          *ngIf="!confirmed && !loading"
          nzStatus="error"
          nzTitle="Ошибка подтверждения"
          [nzSubTitle]="errorMessage"
        >
          <div nz-result-extra>
            <button nz-button nzType="primary" routerLink="/auth/register">
              Зарегистрироваться заново
            </button>
            <button nz-button routerLink="/auth/login">
              Войти
            </button>
          </div>
        </nz-result>
      </div>

      <!-- Loading state -->
      <div class="loading-state" *ngIf="loading">
        <nz-spin nzSize="large">
          <div class="loading-text">Подтверждение email...</div>
        </nz-spin>
      </div>
    </div>
  `,
  styles: [`
    .confirm-container {
      min-height: 100vh;
      display: flex;
      justify-content: center;
      align-items: center;
      background: #f0f2f5;
      padding: 20px;
    }

    .confirm-content {
      background: white;
      padding: 40px;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
      max-width: 600px;
      width: 100%;
    }

    .loading-state {
      text-align: center;
    }

    .loading-text {
      margin-top: 16px;
      font-size: 16px;
      color: #666;
    }

    .ant-result-extra button {
      margin: 0 8px;
    }
  `]
})
export class ConfirmEmailComponent implements OnInit {
  loading = true;
  confirmed = false;
  errorMessage = 'Недействительная или просроченная ссылка подтверждения.';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    const token = this.route.snapshot.queryParamMap.get('token');
    
    if (!token) {
      this.loading = false;
      this.errorMessage = 'Отсутствует токен подтверждения.';
      return;
    }

    this.confirmEmail(token);
  }

  private confirmEmail(token: string): void {
    this.authService.confirmEmail(token).subscribe({
      next: (response) => {
        this.loading = false;
        this.confirmed = true;
      },
      error: (error) => {
        this.loading = false;
        this.confirmed = false;
        
        if (error.error?.message) {
          this.errorMessage = error.error.message;
        }
      }
    });
  }
}