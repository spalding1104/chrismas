import { Routes } from '@angular/router';

import { authGuard, guestGuard } from './core/auth';
import { AccountingPage } from './features/accounting/accounting-page';
import { LoginPage } from './features/auth/login-page';
import { DashboardPage } from './features/dashboard/dashboard-page';
import { SpendingLayout } from './features/spending/spending-layout';
import { YearReportPage } from './features/year-report/year-report-page';

export const routes: Routes = [
    {
        path: 'dang-nhap',
        component: LoginPage,
        canActivate: [guestGuard],
        title: 'Đăng nhập · Sổ Thu Chi',
    },
    {
        path: 'ke-toan',
        component: AccountingPage,
        canActivate: [authGuard],
        title: 'Kế toán quản trị · Sổ Thu Chi',
    },
    {
        // Phân hệ Chi tiêu: layout có thanh Tháng/Năm dùng chung.
        path: '',
        component: SpendingLayout,
        canActivate: [authGuard],
        children: [
            { path: '', component: DashboardPage, title: 'Sổ Thu Chi' },
            {
                path: 'nam',
                component: YearReportPage,
                title: 'Thống kê năm · Sổ Thu Chi',
            },
        ],
    },
    { path: '**', redirectTo: '' },
];
