import { Component, OnInit, inject } from "@angular/core";
import { CommonModule } from "@angular/common";
import {
  RouterOutlet,
  Router,
  NavigationEnd,
  RouterModule,
} from "@angular/router";
import { NzLayoutModule } from "ng-zorro-antd/layout";
import { NzMenuModule } from "ng-zorro-antd/menu";
import { NzIconModule } from "ng-zorro-antd/icon";
import { NzButtonModule } from "ng-zorro-antd/button";
import { NzDropDownModule } from "ng-zorro-antd/dropdown";
import { NzAvatarModule } from "ng-zorro-antd/avatar";
import { filter, map } from "rxjs/operators";
import { AuthService } from "./services/auth.service";

@Component({
  selector: "app-root",
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet,
    RouterModule,
    NzLayoutModule,
    NzMenuModule,
    NzIconModule,
    NzButtonModule,
    NzDropDownModule,
    NzAvatarModule,
  ],
  template: `
    <nz-layout class="app-layout" *ngIf="showLayout$ | async">
      <nz-sider nzCollapsible [(nzCollapsed)]="isCollapsed" nzWidth="200px">
        <div class="logo">
          <h3>TechDoc QR</h3>
        </div>
        <ul
          nz-menu
          nzTheme="dark"
          nzMode="inline"
          [nzInlineCollapsed]="isCollapsed"
        >
          <li nz-menu-item nzMatchRouter>
            <a routerLink="/main">
              <i nz-icon nzType="home"></i>
              <span>Главная</span>
            </a>
          </li>
          <li nz-menu-item nzMatchRouter>
            <a routerLink="/upload">
              <i nz-icon nzType="upload"></i>
              <span>Загрузка</span>
            </a>
          </li>
          <li nz-menu-item nzMatchRouter>
            <a routerLink="/search">
              <i nz-icon nzType="search"></i>
              <span>Поиск</span>
            </a>
          </li>
          <li nz-menu-item nzMatchRouter>
            <a routerLink="/download">
              <i nz-icon nzType="download"></i>
              <span>Загрузки</span>
            </a>
          </li>
          <li nz-menu-item nzMatchRouter>
            <a routerLink="/logs">
              <i nz-icon nzType="file-text"></i>
              <span>Журнал</span>
            </a>
          </li>
        </ul>
      </nz-sider>

      <nz-layout class="inner-layout">
        <nz-header class="header">
          <div class="header-content">
            <div class="trigger" (click)="isCollapsed = !isCollapsed">
              <i
                class="trigger-icon"
                nz-icon
                [nzType]="isCollapsed ? 'menu-unfold' : 'menu-fold'"
              ></i>
            </div>

            <div class="user-menu">
              <div nz-dropdown [nzDropdownMenu]="userMenu" nzTrigger="click" nzPlacement="bottomRight">
                <div class="user-info">
                  <nz-avatar nzIcon="user"></nz-avatar>
                  <span class="username">{{
                    (currentUser$ | async)?.username || 'Гость'
                  }}</span>
                  <i nz-icon nzType="down"></i>
                </div>
              </div>
              <nz-dropdown-menu #userMenu="nzDropdownMenu">
                <ul nz-menu>
                  <li nz-menu-item>
                    <i nz-icon nzType="setting"></i>
                    Настройки
                  </li>
                  <li nz-menu-divider></li>
                  <li nz-menu-item (click)="logout()">
                    <i nz-icon nzType="logout"></i>
                    Выйти
                  </li>
                </ul>
              </nz-dropdown-menu>
            </div>
          </div>
        </nz-header>

        <nz-content class="content">
          <router-outlet></router-outlet>
        </nz-content>
      </nz-layout>
    </nz-layout>

    <div class="auth-layout" *ngIf="!(showLayout$ | async)">
      <router-outlet></router-outlet>
    </div>
  `,
  styles: [
    `
      .app-layout {
        min-height: 100vh;
      }

      .logo {
        height: 32px;
        margin: 16px;
        color: white;
        text-align: center;
      }

      .logo h3 {
        color: white;
        margin: 0;
        font-size: 16px;
        font-weight: 600;
      }

      .inner-layout {
        margin-left: 200px;
      }

      .header {
        background: #fff;
        padding: 0 16px;
        box-shadow: 0 1px 4px rgba(0, 21, 41, 0.08);
      }

      .header-content {
        display: flex;
        justify-content: space-between;
        align-items: center;
        height: 100%;
      }

      .trigger {
        font-size: 18px;
        line-height: 64px;
        padding: 0 24px;
        cursor: pointer;
        transition: color 0.3s;
      }

      .trigger:hover {
        color: #1890ff;
      }

      .trigger-icon {
        font-size: 16px;
      }

      .user-menu {
        display: flex;
        align-items: center;
      }

      .user-info {
        display: flex;
        align-items: center;
        cursor: pointer;
        padding: 8px 12px;
        border-radius: 4px;
        transition: background-color 0.3s;
      }

      .user-info:hover {
        background-color: #f5f5f5;
      }

      .username {
        margin: 0 8px;
        font-weight: 500;
      }

      .content {
        margin: 24px 16px;
        padding: 24px;
        background: #fff;
        min-height: calc(100vh - 112px);
        border-radius: 4px;
      }

      .auth-layout {
        min-height: 100vh;
      }

      @media (max-width: 768px) {
        .inner-layout {
          margin-left: 0;
        }
      }
    `,
  ],
})
export class AppComponent implements OnInit {
  private router = inject(Router);
  private authService = inject(AuthService);
  
  isCollapsed = false;
  showLayout$ = this.router.events.pipe(
    filter((event) => event instanceof NavigationEnd),
    map(() => !this.router.url.startsWith("/auth"))
  );
  currentUser$ = this.authService.currentUser$;

  constructor() {}

  ngOnInit() {
    // Initial check for showing layout
    this.showLayout$ = this.router.events.pipe(
      filter((event) => event instanceof NavigationEnd),
      map(() => !this.router.url.startsWith("/auth"))
    );
    
  }

  logout() {
    this.authService.logout().subscribe();
  }
}
