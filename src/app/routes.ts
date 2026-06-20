import type { ReactElement } from 'react';

import { CustomersPage } from '../features/customers/CustomersPage';
import { DashboardPage } from '../features/dashboard/DashboardPage';
import { FlowerOrdersPage } from '../features/flower-orders/FlowerOrdersPage';
import { InventoryPage } from '../features/inventory/InventoryPage';
import { POSPage } from '../features/pos/POSPage';
import { PurchasePage } from '../features/purchase/PurchasePage';
import { RecipesPage } from '../features/recipes/RecipesPage';
import { ReportsPage } from '../features/reports/ReportsPage';
import { SettingsPage } from '../features/settings/SettingsPage';
import { SystemPage } from '../features/system/SystemPage';
import { UpdatePage } from '../features/update/UpdatePage';

export type RouteKey = 'dashboard' | 'sales' | 'flowerOrders' | 'inventory' | 'purchase' | 'recipes' | 'customers' | 'reports' | 'settings' | 'system' | 'update';

export interface AppRoute {
  key: RouteKey;
  label: string;
  icon: string;
  description: string;
  component: () => ReactElement;
}

export const routes: AppRoute[] = [
  { key: 'dashboard', label: 'Tổng quan', icon: '⌂', description: 'Sức khỏe kinh doanh hôm nay', component: DashboardPage },
  { key: 'sales', label: 'Bán hàng', icon: '✦', description: 'Tạo hóa đơn, thêm dịch vụ và thanh toán', component: POSPage },
  { key: 'flowerOrders', label: 'Đơn hoa', icon: '☷', description: 'Đơn đặt trước, giao hoa và trạng thái cắm', component: FlowerOrdersPage },
  { key: 'inventory', label: 'Kho', icon: '✿', description: 'Tồn kho, lô nhập và cảnh báo hoa sắp héo', component: InventoryPage },
  { key: 'purchase', label: 'Nhập hàng', icon: '↥', description: 'Nhập hoa theo lô và giá nhập từng lần', component: PurchasePage },
  { key: 'recipes', label: 'Mẫu hoa', icon: '❀', description: 'Công thức bó/giỏ/lẵng hoa', component: RecipesPage },
  { key: 'customers', label: 'Khách hàng', icon: '♡', description: 'Hồ sơ khách và lịch sử mua', component: CustomersPage },
  { key: 'reports', label: 'Báo cáo', icon: '◌', description: 'Doanh thu, tồn kho, hao hụt và lợi nhuận', component: ReportsPage },
  { key: 'settings', label: 'Cài đặt', icon: '⚙', description: 'Thông tin shop, máy in và dữ liệu nền', component: SettingsPage },
  { key: 'system', label: 'Hệ thống', icon: '◈', description: 'DB local, media, backup và release', component: SystemPage },
  { key: 'update', label: 'Cập nhật', icon: '⇪', description: 'Kiểm tra và cài update tại chỗ', component: UpdatePage },
];
