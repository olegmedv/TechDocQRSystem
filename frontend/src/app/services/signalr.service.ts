import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import * as signalR from '@microsoft/signalr';
import { environment } from '../../environments/environment';
import { NzMessageService } from 'ng-zorro-antd/message';

export interface DocumentProcessingNotification {
  documentId: string;
  filename: string;
  status: 'processing' | 'completed' | 'failed';
  summary?: string;
  tags?: string[];
  error?: string;
  timestamp: string;
}

@Injectable({
  providedIn: 'root'
})
export class SignalRService {
  private hubConnection: signalR.HubConnection | null = null;
  private documentUpdatesSubject = new BehaviorSubject<DocumentProcessingNotification | null>(null);
  
  public documentUpdates$: Observable<DocumentProcessingNotification | null> = this.documentUpdatesSubject.asObservable();

  constructor(private message: NzMessageService) {}

  public startConnection(): void {
    if (this.hubConnection?.state === signalR.HubConnectionState.Connected) {
      return;
    }

    const token = localStorage.getItem('authToken');
    if (!token) {
      console.warn('No auth token found, cannot connect to SignalR hub');
      return;
    }

    this.hubConnection = new signalR.HubConnectionBuilder()
      .withUrl(`${environment.apiUrl}/documentHub?access_token=${token}`, {
        withCredentials: true
      })
      .withAutomaticReconnect([0, 2000, 10000, 30000])
      .build();

    this.hubConnection
      .start()
      .then(() => {
        console.log('SignalR connection established');
        this.joinUserGroup();
        this.registerEventHandlers();
      })
      .catch(err => {
        console.error('Error starting SignalR connection:', err);
      });

    this.hubConnection.onreconnected(() => {
      console.log('SignalR reconnected');
      this.joinUserGroup();
    });

    this.hubConnection.onclose(() => {
      console.log('SignalR connection closed');
    });
  }

  public stopConnection(): void {
    if (this.hubConnection) {
      this.hubConnection.stop();
      this.hubConnection = null;
    }
  }

  private joinUserGroup(): void {
    if (this.hubConnection?.state === signalR.HubConnectionState.Connected) {
      this.hubConnection.invoke('JoinUserGroup').catch(err => {
        console.error('Error joining user group:', err);
      });
    }
  }

  private registerEventHandlers(): void {
    if (!this.hubConnection) return;

    // Handle document processing started
    this.hubConnection.on('DocumentProcessingStarted', (data: DocumentProcessingNotification) => {
      console.log('Document processing started:', data);
      this.message.info(`Началась обработка документа: ${data.filename}`);
      this.documentUpdatesSubject.next(data);
    });

    // Handle document processing completed
    this.hubConnection.on('DocumentProcessingCompleted', (data: DocumentProcessingNotification) => {
      console.log('Document processing completed:', data);
      this.message.success(`Документ обработан: ${data.filename}`);
      this.documentUpdatesSubject.next(data);
    });

    // Handle document processing failed
    this.hubConnection.on('DocumentProcessingFailed', (data: DocumentProcessingNotification) => {
      console.log('Document processing failed:', data);
      this.message.error(`Ошибка обработки документа: ${data.filename}`);
      this.documentUpdatesSubject.next(data);
    });
  }

  public getConnectionState(): signalR.HubConnectionState | null {
    return this.hubConnection?.state || null;
  }
}