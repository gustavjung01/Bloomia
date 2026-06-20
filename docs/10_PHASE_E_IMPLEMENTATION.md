# Phase E Implementation

Phase E triển khai dashboard, báo cáo và đơn hoa.

## Scope đã implement

- Dashboard đọc dữ liệu thật từ SQLite.
- Báo cáo doanh thu 30 ngày.
- Báo cáo tồn kho từ batch còn lại.
- Báo cáo hao hụt từ stock movements.
- Form tạo và sửa đơn hoa.
- Danh sách đơn cần giao hôm nay.
- Danh sách toàn bộ đơn hoa.
- Cập nhật trạng thái đơn hoa.

## File chính

```txt
src/db/repositories/reportsRepository.ts
src/db/repositories/ordersRepository.ts
src/features/dashboard/DashboardPage.tsx
src/features/reports/ReportsPage.tsx
src/features/flower-orders/FlowerOrdersPage.tsx
src/styles/reports-orders.css
```

## Dashboard data

Dashboard đọc:

- Doanh thu hôm nay.
- Số hóa đơn hôm nay.
- Đơn hoa đang mở.
- Đơn cần giao hôm nay.
- Lợi nhuận tạm tính.
- Hao hụt hôm nay.

## Reports data

Reports đọc từ:

- `sales`
- `sale_items`
- `purchase_batches`
- `stock_movements`

Các báo cáo MVP:

- Doanh thu theo ngày.
- Lợi nhuận tạm tính.
- Giá trị tồn kho.
- Hao hụt 30 ngày.

## Flower order flow

```txt
1. Chủ shop tạo đơn hoa.
2. Nhập khách hàng, người nhận, lịch giao, địa chỉ.
3. Nhập dịp tặng, tone màu, ngân sách, lời nhắn thiệp.
4. Lưu đơn.
5. Theo dõi đơn cần giao hôm nay.
6. Cập nhật trạng thái: mới nhận, xác nhận, chuẩn bị, xong, đang giao, hoàn thành, hủy.
```

## Lưu ý kỹ thuật

- Đơn hoa hiện lưu ở bảng `orders`.
- Chưa gắn đơn hoa với recipe hoặc hóa đơn thanh toán. Phần này có thể làm ở Phase F/G.
- Báo cáo lợi nhuận là tạm tính, dựa trên `sale_items.cost_price` đã có từ FIFO Phase D.
- Export CSV/Excel chưa làm trong phase này.

## Cách chạy

```bash
npm install
npm run tauri:dev
```

## Issue coverage

Phase này cover các issue:

- #30 Build dashboard overview widgets
- #31 Build sales, inventory and waste reports
- #32 Build flower order/preorder form
- #33 Build order status workflow and delivery list
