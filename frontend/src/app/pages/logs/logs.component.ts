import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup } from '@angular/forms';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzTableModule } from 'ng-zorro-antd/table';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzDatePickerModule } from 'ng-zorro-antd/date-picker';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { NzEmptyModule } from 'ng-zorro-antd/empty';
import { NzStatisticModule } from 'ng-zorro-antd/statistic';
import { NzGridModule } from 'ng-zorro-antd/grid';
import { LogsService } from '../../services/logs.service';
import { AuthService } from '../../services/auth.service';
import { ActivityLog, ActivityLogFilter } from '../../models/document.models';

@Component({
  selector: 'app-logs',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    NzCardModule,
    NzTableModule,
    NzInputModule,
    NzSelectModule,
    NzDatePickerModule,
    NzButtonModule,
    NzIconModule,
    NzTagModule,
    NzSpinModule,
    NzEmptyModule,
    NzStatisticModule,
    NzGridModule
  ],
  template: `
    <div class="page-header">
      <h1>Журнал активности</h1>
      <p>Отслеживание действий пользователей в системе</p>
    </div>

    <!-- Статистика -->
    <nz-card *ngIf="!isAdmin" nzTitle="Моя статистика" class="stats-card">
      <nz-row [nzGutter]="16">
        <nz-col [nzSpan]="6">
          <nz-statistic 
            nzTitle="Всего действий"
            [nzValue]="userStats?.totalActions || 0"
            [nzValueStyle]="{ color: '#1890ff' }"
            nzPrefix="activity"
          ></nz-statistic>
        </nz-col>
        <nz-col [nzSpan]="6">
          <nz-statistic 
            nzTitle="Загрузок файлов"
            [nzValue]="userStats?.uploadsCount || 0"
            [nzValueStyle]="{ color: '#52c41a' }"
            nzPrefix="cloud-upload"
          ></nz-statistic>
        </nz-col>
        <nz-col [nzSpan]="6">
          <nz-statistic 
            nzTitle="Скачиваний"
            [nzValue]="userStats?.downloadsCount || 0"
            [nzValueStyle]="{ color: '#fa8c16' }"
            nzPrefix="download"
          ></nz-statistic>
        </nz-col>
        <nz-col [nzSpan]="6">
          <nz-statistic 
            nzTitle="QR генераций"
            [nzValue]="userStats?.qrGenerationsCount || 0"
            [nzValueStyle]="{ color: '#722ed1' }"
            nzPrefix="qrcode"
          ></nz-statistic>
        </nz-col>
      </nz-row>
    </nz-card>

    <!-- Фильтры -->
    <nz-card nzTitle="Фильтры" class="filters-card">
      <form nz-form [formGroup]="filterForm" (ngSubmit)="applyFilters()">
        <nz-row [nzGutter]="16">
          <nz-col [nzSpan]="6" *ngIf="isAdmin">
            <nz-form-item>
              <nz-form-label>Пользователь</nz-form-label>
              <nz-form-control>
                <input nz-input formControlName="username" placeholder="Имя пользователя" />
              </nz-form-control>
            </nz-form-item>
          </nz-col>
          <nz-col [nzSpan]="6">
            <nz-form-item>
              <nz-form-label>Тип действия</nz-form-label>
              <nz-form-control>
                <nz-select formControlName="actionType" nzPlaceHolder="Все действия" nzAllowClear>
                  <nz-option *ngFor="let type of actionTypes" [nzValue]="type" [nzLabel]="getActionTypeLabel(type)"></nz-option>
                </nz-select>
              </nz-form-control>
            </nz-form-item>
          </nz-col>
          <nz-col [nzSpan]="6">
            <nz-form-item>
              <nz-form-label>Дата с</nz-form-label>
              <nz-form-control>
                <nz-date-picker formControlName="fromDate" nzPlaceHolder="Выберите дату"></nz-date-picker>
              </nz-form-control>
            </nz-form-item>
          </nz-col>
          <nz-col [nzSpan]="6">
            <nz-form-item>
              <nz-form-label>Дата до</nz-form-label>
              <nz-form-control>
                <nz-date-picker formControlName="toDate" nzPlaceHolder="Выберите дату"></nz-date-picker>
              </nz-form-control>
            </nz-form-item>
          </nz-col>
        </nz-row>
        <nz-form-item>
          <button nz-button nzType="primary" [nzLoading]="loading">
            <i nz-icon nzType="search"></i>
            Применить фильтры
          </button>
          <button nz-button type="button" (click)="resetFilters()" style="margin-left: 8px;">
            <i nz-icon nzType="clear"></i>
            Сбросить
          </button>
        </nz-form-item>
      </form>
    </nz-card>

    <!-- Таблица логов -->
    <nz-card [nzTitle]="getLogsTitle()" class="logs-table-card">
      <nz-table 
        #logsTable 
        [nzData]="logs" 
        [nzLoading]="loading" 
        [nzTotal]="totalCount"
        [nzPageSize]="pageSize"
        [nzPageIndex]="currentPage"
        [nzShowSizeChanger]="true"
        [nzPageSizeOptions]="[10, 20, 50, 100]"
        (nzQueryParams)="onTableChange($event)"
        nzSize="middle"
      >
        <thead>
          <tr>
            <th *ngIf="isAdmin">Пользователь</th>
            <th>Действие</th>
            <th>Документ</th>
            <th>Дата и время</th>
            <th>IP адрес</th>
            <th>Детали</th>
          </tr>
        </thead>
        <tbody>
          <tr *ngFor="let log of logsTable.data">
            <td *ngIf="isAdmin">
              <nz-tag nzColor="blue">{{ log.username }}</nz-tag>
            </td>
            <td>
              <nz-tag [nzColor]="getActionColor(log.actionType)">
                <i nz-icon [nzType]="getActionIcon(log.actionType)"></i>
                {{ getActionTypeLabel(log.actionType) }}
              </nz-tag>
            </td>
            <td>
              <span *ngIf="log.documentName; else noDocument" class="document-name">
                <i nz-icon nzType="file-text"></i>
                {{ log.documentName }}
              </span>
              <ng-template #noDocument>
                <span class="no-document">-</span>
              </ng-template>
            </td>
            <td>{{ formatDate(log.createdAt) }}</td>
            <td>
              <code class="ip-address">{{ log.details?.ipAddress || 'N/A' }}</code>
            </td>
            <td>
              <button 
                *ngIf="log.details && hasDetails(log.details)" 
                nz-button 
                nzType="link" 
                nzSize="small"
                (click)="showDetails(log)"
              >
                <i nz-icon nzType="info-circle"></i>
                Подробнее
              </button>
              <span *ngIf="!log.details || !hasDetails(log.details)" class="no-details">-</span>
            </td>
          </tr>
        </tbody>
      </nz-table>

      <nz-empty 
        *ngIf="logs.length === 0 && !loading"
        nzNotFoundImage="simple"
        nzNotFoundContent="Логи не найдены"
      >
        <span nz-empty-footer>
          Попробуйте изменить параметры фильтрации
        </span>
      </nz-empty>
    </nz-card>
  `,
  styles: [`
    .page-header {
      margin-bottom: 24px;
    }

    .page-header h1 {
      margin: 0 0 8px 0;
      font-size: 24px;
      font-weight: 600;
    }

    .page-header p {
      margin: 0;
      color: #8c8c8c;
    }

    .stats-card {
      margin-bottom: 24px;
    }

    .filters-card {
      margin-bottom: 24px;
    }

    .logs-table-card {
      margin-bottom: 24px;
    }

    .document-name {
      display: flex;
      align-items: center;
      gap: 4px;
      font-weight: 500;
    }

    .no-document {
      color: #bfbfbf;
      font-style: italic;
    }

    .ip-address {
      font-family: 'Courier New', monospace;
      background: #f5f5f5;
      padding: 2px 4px;
      border-radius: 3px;
      font-size: 12px;
    }

    .no-details {
      color: #bfbfbf;
      font-style: italic;
    }

    :host ::ng-deep .ant-statistic-content-prefix {
      margin-right: 8px;
    }

    :host ::ng-deep .ant-table-tbody > tr > td {
      vertical-align: middle;
    }

    :host ::ng-deep .ant-form-item {
      margin-bottom: 16px;
    }
  `]
})
export class LogsComponent implements OnInit {
  filterForm!: FormGroup;
  logs: ActivityLog[] = [];
  loading = false;
  currentPage = 1;
  pageSize = 20;
  totalCount = 0;
  actionTypes: string[] = [];
  userStats: any = null;
  isAdmin = false;

  constructor(
    private fb: FormBuilder,
    private logsService: LogsService,
    private authService: AuthService,
    private message: NzMessageService
  ) {}

  ngOnInit(): void {
    this.isAdmin = this.authService.isAdmin();
    
    this.filterForm = this.fb.group({
      username: [''],
      actionType: [null],
      fromDate: [null],
      toDate: [null]
    });

    this.loadActionTypes();
    this.loadLogs();
    
    if (!this.isAdmin) {
      this.loadUserStats();
    }
  }

  private loadActionTypes(): void {
    this.logsService.getActionTypes().subscribe({
      next: (types) => {
        this.actionTypes = types;
      },
      error: (error) => {
        console.error('Error loading action types:', error);
      }
    });
  }

  private loadUserStats(): void {
    this.logsService.getMyStats().subscribe({
      next: (stats) => {
        this.userStats = stats;
      },
      error: (error) => {
        console.error('Error loading user stats:', error);
      }
    });
  }

  private loadLogs(): void {
    this.loading = true;
    
    const filter: ActivityLogFilter = {
      page: this.currentPage,
      pageSize: this.pageSize,
      ...this.getFilterValues()
    };

    this.logsService.getActivityLogs(filter).subscribe({
      next: (response) => {
        this.logs = response.logs;
        this.totalCount = response.totalCount;
        this.loading = false;
      },
      error: (error) => {
        this.loading = false;
        this.message.error('Ошибка при загрузке логов');
        console.error('Load logs error:', error);
      }
    });
  }

  private getFilterValues(): any {
    const values = this.filterForm.value;
    const filter: any = {};

    if (values.username?.trim()) {
      filter.username = values.username.trim();
    }
    if (values.actionType) {
      filter.actionType = values.actionType;
    }
    if (values.fromDate) {
      filter.fromDate = values.fromDate.toISOString().split('T')[0];
    }
    if (values.toDate) {
      filter.toDate = values.toDate.toISOString().split('T')[0];
    }

    return filter;
  }

  applyFilters(): void {
    this.currentPage = 1;
    this.loadLogs();
  }

  resetFilters(): void {
    this.filterForm.reset();
    this.currentPage = 1;
    this.loadLogs();
  }

  onTableChange(params: any): void {
    this.currentPage = params.pageIndex;
    this.pageSize = params.pageSize;
    this.loadLogs();
  }

  getLogsTitle(): string {
    if (this.totalCount === 0) {
      return 'Журнал активности';
    }
    return `Журнал активности (${this.totalCount})`;
  }

  getActionTypeLabel(actionType: string): string {
    const labels: { [key: string]: string } = {
      'Upload': 'Загрузка',
      'Download': 'Скачивание',
      'View': 'Просмотр',
      'Delete': 'Удаление',
      'QrGeneration': 'Генерация QR',
      'Search': 'Поиск',
      'Login': 'Вход',
      'Logout': 'Выход',
      'Register': 'Регистрация'
    };
    return labels[actionType] || actionType;
  }

  getActionColor(actionType: string): string {
    const colors: { [key: string]: string } = {
      'Upload': 'green',
      'Download': 'blue',
      'View': 'cyan',
      'Delete': 'red',
      'QrGeneration': 'purple',
      'Search': 'orange',
      'Login': 'geekblue',
      'Logout': 'volcano',
      'Register': 'lime'
    };
    return colors[actionType] || 'default';
  }

  getActionIcon(actionType: string): string {
    const icons: { [key: string]: string } = {
      'Upload': 'cloud-upload',
      'Download': 'download',
      'View': 'eye',
      'Delete': 'delete',
      'QrGeneration': 'qrcode',
      'Search': 'search',
      'Login': 'login',
      'Logout': 'logout',
      'Register': 'user-add'
    };
    return icons[actionType] || 'file';
  }

  hasDetails(details: any): boolean {
    if (!details) return false;
    return Object.keys(details).length > 1; // Больше чем просто ipAddress
  }

  showDetails(log: ActivityLog): void {
    // Показываем детали в модальном окне или уведомлении
    const detailsText = JSON.stringify(log.details, null, 2);
    this.message.info(`Детали: ${detailsText}`);
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('ru-RU', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  }
}