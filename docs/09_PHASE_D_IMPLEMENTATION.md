# Phase D Implementation

Phase D triển khai nhập hàng, tồn kho, xuất kho và FIFO.

## Scope đã implement

- Phiếu nhập hàng theo lô.
- Lưu `purchase_batches` với `remaining_quantity` và `unit_cost` riêng từng lô.
- Ghi `stock_movements` khi nhập hàng.
- Màn tồn kho tổng quan theo item.
- Màn lô còn tồn theo batch.
- Lịch sử nhập/xuất từ `stock_movements`.
- Xuất kho thủ công theo FIFO cho hao hụt, mẫu trưng bày, sự kiện và nội bộ.
- Điều chỉnh kho tăng/giảm.
- FIFO allocator dùng batch cũ trước.
- POS sale tự kiểm tra tồn các item có theo dõi kho.
- Khi lưu sale, item có theo dõi kho sẽ trừ FIFO và ghi movement `sale`.
- `sale_items.cost_price` lưu giá vốn FIFO bình quân của dòng bán.

## File chính

```txt
src/db/repositories/inventoryRepository.ts
src/db/repositories/salesRepository.ts
src/features/purchase/PurchasePage.tsx
src/features/inventory/InventoryPage.tsx
src/styles/inventory.css
```

## Purchase flow

```txt
1. Chủ shop chọn nhà cung cấp.
2. Chọn ngày nhập.
3. Thêm nhiều dòng hoa/phụ liệu.
4. Nhập số lượng, giá nhập, ngày dự kiến héo.
5. Lưu phiếu nhập.
6. App tạo purchase batch cho từng dòng.
7. App ghi stock movement loại purchase.
```

## Inventory flow

```txt
1. Màn kho đọc tổng tồn từ purchase_batches.remaining_quantity.
2. Chủ shop xem lô còn tồn, giá nhập và ngày dự kiến héo.
3. Chủ shop ghi nhận hao hụt/mẫu/sự kiện/nội bộ.
4. App trừ tồn theo FIFO.
5. App ghi stock movement tương ứng.
```

## POS + FIFO flow

```txt
1. POS lưu hóa đơn.
2. App gom số lượng cần bán theo item.
3. Với item có theo dõi kho, app kiểm tra tồn trước.
4. Nếu đủ tồn, app lưu sale.
5. App allocate FIFO theo batch cũ nhất.
6. App ghi stock movement loại sale.
7. App lưu cost_price vào sale_items.
```

## Quy tắc nghiệp vụ

- Dịch vụ không trừ kho.
- Dòng tùy chỉnh không có `item_id` thì không trừ kho.
- Giá nhập không nằm cố định trên item, mà nằm ở từng batch.
- FIFO dùng `purchase_date ASC, created_at ASC`.
- Nếu tồn không đủ, sale sẽ bị chặn trước khi lưu.
- Điều chỉnh tăng kho sẽ tạo batch điều chỉnh riêng.
- Điều chỉnh giảm kho sẽ trừ FIFO.

## Lưu ý kỹ thuật

- Phase này chưa có transaction wrapper toàn cục cho sale + FIFO. Repository đã kiểm tra tồn trước khi lưu sale để giảm lỗi giữa chừng.
- Sau này nên bổ sung transaction helper để đảm bảo atomic hoàn toàn.
- Báo cáo Phase E sẽ đọc trực tiếp từ `sales`, `payments`, `purchase_batches` và `stock_movements`.

## Cách chạy

```bash
npm install
npm run tauri:dev
```

## Issue coverage

Phase này cover các issue:

- #25 Build purchase entry form
- #26 Persist purchase batches and stock movements
- #27 Build inventory overview and batch stock view
- #28 Implement stock out, waste and adjustment flows
- #29 Implement FIFO cost calculation
