import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzUploadModule } from 'ng-zorro-antd/upload';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzTableModule } from 'ng-zorro-antd/table';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzQRCodeModule } from 'ng-zorro-antd/qr-code';
import { NzDividerModule } from 'ng-zorro-antd/divider';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { DocumentService } from '../../services/document.service';
import { Document } from '../../models/document.models';
import { AuthService } from '../../services/auth.service';
import { SignalRService, DocumentProcessingNotification } from '../../services/signalr.service';
import { Subscription } from 'rxjs';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-upload',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    NzCardModule,
    NzUploadModule,
    NzButtonModule,
    NzIconModule,
    NzTableModule,
    NzTagModule,
    NzQRCodeModule,
    NzDividerModule,
    NzSpinModule
  ],
  template: `
    <div class="page-header">
      <h1>Загрузка документов</h1>
      <p>Загружайте изображения документов для обработки OCR и анализа ИИ</p>
      <div style="display: flex; gap: 8px; margin-top: 8px;">
        <button nz-button nzType="dashed" (click)="testSignalR()">🧪 Тест SignalR</button>
        <button nz-button nzType="default" (click)="reconnectSignalR()">🔄 Переподключить SignalR</button>
        <button nz-button nzType="default" (click)="checkSignalRStatus()">📊 Статус SignalR</button>
      </div>
    </div>

    <nz-card nzTitle="Загрузить документ" class="upload-card">
      <nz-upload
        nzType="drag"
        [nzMultiple]="false"
        nzAccept=".jpg,.jpeg,.png,.pdf,.tiff"
        [nzBeforeUpload]="beforeUpload"
        [nzFileList]="fileList"
        (nzChange)="handleChange($event)"
        [nzShowUploadList]="false"
      >
        <p class="ant-upload-drag-icon">
          <i nz-icon nzType="inbox"></i>
        </p>
        <p class="ant-upload-text">Нажмите или перетащите файл в эту область</p>
        <p class="ant-upload-hint">
          Поддерживаются форматы: JPG, PNG, PDF, TIFF<br>
          Максимальный размер: 50 МБ
        </p>
      </nz-upload>
      
      <div *ngIf="uploading" class="upload-progress">
        <nz-spin nzSimple [nzSpinning]="true"></nz-spin>
        <p>Загружаем файл и обрабатываем OCR...</p>
      </div>
    </nz-card>

    <nz-divider></nz-divider>

    <nz-card nzTitle="Мои документы" class="documents-card">
      <nz-table #documentsTable [nzData]="documents" [nzLoading]="loading" nzSize="middle">
        <thead>
          <tr>
            <th>Файл</th>
            <th>Пользователь</th>
            <th>Размер</th>
            <th>Краткое описание</th>
            <th>Теги</th>
            <th>QR код</th>
            <th>Статистика</th>
            <th>Дата загрузки</th>
            <th>Действия</th>
          </tr>
        </thead>
        <tbody>
          <tr *ngFor="let doc of documentsTable.data">
            <td>{{ doc.filename }}</td>
            <td>
              <div class="user-cell">
                {{ doc.user?.username || 'Неизвестный' }}
                <div style="font-size: 11px; color: #999;">{{ doc.user?.email }}</div>
              </div>
            </td>
            <td>{{ formatFileSize(doc.fileSize) }}</td>
            <td>
              <div class="summary-cell">
                {{ doc.summary || 'Обрабатывается...' }}
              </div>
            </td>
            <td>
              <nz-tag *ngFor="let tag of doc.tags" nzColor="blue">{{ tag }}</nz-tag>
            </td>
            <td>
              <nz-qrcode [nzValue]="doc.accessLink" [nzSize]="80"></nz-qrcode>
            </td>
            <td>
              <div class="stats">
                <div>Скачиваний: {{ doc.downloadCount }}</div>
                <div>QR генераций: {{ doc.qrGenerationCount }}</div>
              </div>
            </td>
            <td>{{ formatDate(doc.createdAt) }}</td>
            <td>
              <button nz-button nzType="primary" nzSize="small" (click)="downloadDocument(doc.id)">
                <i nz-icon nzType="download"></i>
                Скачать
              </button>
              <button nz-button nzType="default" nzSize="small" (click)="generateQR(doc.id)" style="margin-left: 8px;">
                <i nz-icon nzType="qrcode"></i>
                QR
              </button>
            </td>
          </tr>
        </tbody>
      </nz-table>
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

    .upload-card {
      margin-bottom: 24px;
    }

    .upload-progress {
      text-align: center;
      margin-top: 16px;
      padding: 16px;
      background: #f5f5f5;
      border-radius: 4px;
    }

    .upload-progress p {
      margin-top: 8px;
      color: #666;
    }

    .summary-cell {
      max-width: 200px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .user-cell {
      max-width: 120px;
    }

    .stats div {
      font-size: 12px;
      color: #666;
    }

    :host ::ng-deep .ant-upload.ant-upload-drag {
      border-radius: 6px;
    }

    :host ::ng-deep .ant-upload-drag-icon i {
      font-size: 48px;
      color: #40a9ff;
    }

    :host ::ng-deep .ant-upload-text {
      margin: 16px 0 8px 0;
      font-size: 16px;
    }

    :host ::ng-deep .ant-upload-hint {
      color: #999;
    }
  `]
})
export class UploadComponent implements OnInit, OnDestroy {
  documents: Document[] = [];
  loading = false;
  uploading = false;
  fileList: any[] = [];
  private signalRSubscription?: Subscription;

  constructor(
    private documentService: DocumentService,
    private authService: AuthService,
    private message: NzMessageService,
    private signalRService: SignalRService
  ) {}

  ngOnInit(): void {
    this.loadDocuments();
    this.subscribeToSignalR();
    
    // Force SignalR connection attempt after component init
    setTimeout(() => {
      const connectionState = this.signalRService.getConnectionState();
      console.log('🔌 Initial SignalR Connection State:', connectionState);
      if (connectionState === 'Disconnected' || connectionState == null) {
        console.log('🔄 SignalR not connected, attempting to start...');
        this.signalRService.startConnection();
      }
    }, 2000);
    
    // Check SignalR connection status periodically
    setInterval(() => {
      const connectionState = this.signalRService.getConnectionState();
      console.log('🔌 SignalR Connection State:', connectionState);
    }, 10000); // Every 10 seconds
  }

  ngOnDestroy(): void {
    if (this.signalRSubscription) {
      this.signalRSubscription.unsubscribe();
    }
  }

  private subscribeToSignalR(): void {
    console.log('🎧 UploadComponent: Subscribing to SignalR updates');
    this.signalRSubscription = this.signalRService.documentUpdates$.subscribe(
      (notification: DocumentProcessingNotification | null) => {
        if (notification) {
          console.log('🔔 UploadComponent: Received SignalR notification:', notification);
          this.handleDocumentUpdate(notification);
        }
      }
    );
  }

  private handleDocumentUpdate(notification: DocumentProcessingNotification): void {
    console.log('🔄 UploadComponent: Handling document update for ID:', notification.documentId);
    
    // Find and update the document in the list
    const documentIndex = this.documents.findIndex(doc => doc.id === notification.documentId);
    console.log('🔍 UploadComponent: Document index found:', documentIndex, 'out of', this.documents.length, 'documents');
    
    if (documentIndex !== -1) {
      const document = this.documents[documentIndex];
      console.log('📄 UploadComponent: Updating document:', document.filename);
      
      if (notification.status === 'completed') {
        document.summary = notification.summary || document.summary;
        document.tags = notification.tags || document.tags;
        console.log('✅ UploadComponent: Document processing completed - Summary:', document.summary?.substring(0, 50), 'Tags:', document.tags);
      } else if (notification.status === 'failed') {
        document.summary = 'Ошибка обработки: ' + (notification.error || 'Неизвестная ошибка');
        document.tags = ['Ошибка'];
        console.log('❌ UploadComponent: Document processing failed:', document.summary);
      }
      
      // Trigger change detection
      this.documents = [...this.documents];
      console.log('🔄 UploadComponent: Document list updated, triggering change detection');
    } else {
      console.warn('⚠️ UploadComponent: Document not found in list for ID:', notification.documentId);
    }
  }

  beforeUpload = (file: any): boolean => {
    // Проверяем размер файла (50 МБ)
    const isLt50M = file.size / 1024 / 1024 < 50;
    if (!isLt50M) {
      this.message.error('Файл должен быть меньше 50 МБ!');
      return false;
    }

    // Проверяем тип файла
    const isValidType = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf', 'image/tiff'].includes(file.type);
    if (!isValidType) {
      this.message.error('Поддерживаются только файлы JPG, PNG, PDF, TIFF!');
      return false;
    }

    this.uploadFile(file);
    return false; // Предотвращаем автоматическую загрузку
  };

  handleChange(info: any): void {
    // Обновляем список файлов для отображения
    this.fileList = info.fileList;
  }

  private uploadFile(file: any): void {
    this.uploading = true;
    
    this.documentService.uploadDocument(file).subscribe({
      next: (response) => {
        this.uploading = false;
        this.message.success('Файл успешно загружен и обработан!');
        this.loadDocuments(); // Перезагружаем список
        this.fileList = []; // Очищаем список загрузки
      },
      error: (error) => {
        this.uploading = false;
        this.message.error('Ошибка при загрузке файла');
        console.error('Upload error:', error);
      }
    });
  }

  private loadDocuments(): void {
    this.loading = true;
    
    this.documentService.getMyDocuments().subscribe({
      next: (documents) => {
        this.documents = documents;
        this.loading = false;
      },
      error: (error) => {
        this.loading = false;
        this.message.error('Ошибка при загрузке документов');
        console.error('Load documents error:', error);
      }
    });
  }

  downloadDocument(documentId: string): void {
    this.documentService.downloadDocument(documentId).subscribe({
      next: (blob) => {
        // Создаем ссылку для скачивания
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'document';
        link.click();
        window.URL.revokeObjectURL(url);
        
        // Обновляем статистику
        this.loadDocuments();
      },
      error: (error) => {
        this.message.error('Ошибка при скачивании файла');
        console.error('Download error:', error);
      }
    });
  }

  generateQR(documentId: string): void {
    this.documentService.generateQR(documentId).subscribe({
      next: () => {
        this.message.success('QR код сгенерирован!');
        this.loadDocuments(); // Обновляем статистику
      },
      error: (error) => {
        this.message.error('Ошибка при генерации QR кода');
        console.error('QR generation error:', error);
      }
    });
  }

  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('ru-RU', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  testSignalR(): void {
    console.log('🧪 Testing SignalR connection...');
    const connectionState = this.signalRService.getConnectionState();
    console.log('🔌 Current SignalR state:', connectionState);
    
    // If disconnected, try to connect first
    if (connectionState !== 'Connected') {
      console.log('🔗 SignalR not connected, attempting connection first...');
      this.signalRService.forceReconnect();
      
      // Wait a bit and try again
      setTimeout(() => {
        this.executeSignalRTest();
      }, 3000);
    } else {
      this.executeSignalRTest();
    }
  }

  private executeSignalRTest(): void {
    this.documentService.testSignalR().subscribe({
      next: (response) => {
        console.log('✅ SignalR test response:', response);
        this.message.success('SignalR тест запущен! Проверьте консоль и уведомления.');
      },
      error: (error) => {
        console.error('❌ SignalR test failed:', error);
        this.message.error('Ошибка теста SignalR');
      }
    });
  }

  reconnectSignalR(): void {
    console.log('🔄 Reconnecting SignalR...');
    console.log('🔍 Before reconnect - localStorage check:');
    console.log('- authToken:', localStorage.getItem('authToken')?.substring(0, 50) + '...');
    console.log('- Environment API URL:', environment.apiUrl);
    
    this.signalRService.stopConnection();
    setTimeout(() => {
      console.log('🚀 Starting SignalR connection manually...');
      this.signalRService.startConnection();
    }, 1000);
    this.message.info('SignalR переподключается...');
  }

  checkSignalRStatus(): void {
    const connectionState = this.signalRService.getConnectionState();
    const token = localStorage.getItem('authToken');
    
    console.log('📊 SignalR Status Check:');
    console.log('- Connection State:', connectionState);
    console.log('- Has Auth Token:', !!token);
    console.log('- Token Preview:', token ? token.substring(0, 50) + '...' : 'None');
    console.log('- localStorage keys:', Object.keys(localStorage));
    
    this.message.info(`SignalR: ${connectionState}, Token: ${token ? 'Present' : 'Missing'}`);
  }
}