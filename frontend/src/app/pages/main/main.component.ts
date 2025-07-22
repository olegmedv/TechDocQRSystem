import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzStatisticModule } from 'ng-zorro-antd/statistic';
import { NzGridModule } from 'ng-zorro-antd/grid';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { AuthService } from '../../services/auth.service';
import { LogsService } from '../../services/logs.service';

@Component({
  selector: 'app-main',
  standalone: true,
  imports: [
    CommonModule,
    NzCardModule,
    NzStatisticModule,
    NzGridModule,
    NzIconModule
  ],
  template: `
    <div class="main-container">
      <div class="page-header">
        <h1>Главная страница</h1>
        <p>Добро пожаловать в систему учета технических документов</p>
      </div>

      <nz-row [nzGutter]="16">
        <nz-col [nzSpan]="6">
          <nz-card>
            <nz-statistic
              nzTitle="Загруженных документов"
              [nzValue]="stats?.total_documents || 0"
              [nzValueStyle]="{ color: '#1890ff' }"
            >
              <i nz-icon nzType="upload" nz-statistic-prefix></i>
            </nz-statistic>
          </nz-card>
        </nz-col>
        <nz-col [nzSpan]="6">
          <nz-card>
            <nz-statistic
              nzTitle="Скачиваний"
              [nzValue]="stats?.download || 0"
              [nzValueStyle]="{ color: '#52c41a' }"
            >
              <i nz-icon nzType="download" nz-statistic-prefix></i>
            </nz-statistic>
          </nz-card>
        </nz-col>
        <nz-col [nzSpan]="6">
          <nz-card>
            <nz-statistic
              nzTitle="QR кодов сгенерировано"
              [nzValue]="stats?.qr_generate || 0"
              [nzValueStyle]="{ color: '#722ed1' }"
            >
              <i nz-icon nzType="qrcode" nz-statistic-prefix></i>
            </nz-statistic>
          </nz-card>
        </nz-col>
        <nz-col [nzSpan]="6">
          <nz-card>
            <nz-statistic
              nzTitle="Поисковых запросов"
              [nzValue]="stats?.search || 0"
              [nzValueStyle]="{ color: '#fa8c16' }"
            >
              <i nz-icon nzType="search" nz-statistic-prefix></i>
            </nz-statistic>
          </nz-card>
        </nz-col>
      </nz-row>

      <div class="welcome-card">
        <nz-card nzTitle="Возможности системы">
          <ul>
            <li><strong>Загрузка документов:</strong> Загружайте изображения документов для обработки OCR</li>
            <li><strong>Автоматическая обработка:</strong> ИИ создает краткое описание и теги для каждого документа</li>
            <li><strong>QR коды:</strong> Генерация QR кодов для быстрого доступа к документам</li>
            <li><strong>Поиск:</strong> Поиск документов по содержимому, тегам и описанию</li>
            <li><strong>Безопасность:</strong> Защищенные ссылки без прямого доступа к файлам</li>
            <li><strong>Журнал активности:</strong> Полный учет всех действий пользователей</li>
          </ul>
        </nz-card>
      </div>
    </div>
  `,
  styles: [`
    .main-container {
      padding: 0;
    }

    .page-header {
      margin-bottom: 24px;
    }

    .page-header h1 {
      margin: 0 0 8px 0;
      font-size: 24px;
      font-weight: 600;
      color: #262626;
    }

    .page-header p {
      margin: 0;
      color: #8c8c8c;
    }

    .welcome-card {
      margin-top: 24px;
    }

    .welcome-card ul {
      margin: 0;
      padding-left: 20px;
    }

    .welcome-card li {
      margin-bottom: 8px;
      line-height: 1.6;
    }

    :host ::ng-deep .ant-statistic-title {
      font-weight: 500;
    }

    :host ::ng-deep .ant-statistic-content {
      font-size: 24px;
    }
  `]
})
export class MainComponent implements OnInit {
  stats: any = {};

  constructor(
    private authService: AuthService,
    private logsService: LogsService
  ) {}

  ngOnInit(): void {
    this.loadStats();
  }

  private loadStats(): void {
    this.logsService.getMyStats().subscribe({
      next: (stats) => {
        this.stats = stats;
      },
      error: (error) => {
        console.error('Failed to load stats:', error);
      }
    });
  }
}