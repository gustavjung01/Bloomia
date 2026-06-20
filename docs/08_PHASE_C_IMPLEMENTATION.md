# Phase C Implementation

Phase C triển khai POS bán hàng và in hóa đơn.

## Scope đã implement

- POS chọn sản phẩm/dịch vụ từ danh mục đã setup.
- Thêm dòng tùy chỉnh cho đơn theo ngân sách.
- Sửa số lượng và giá bán từng dòng.
- Tính tạm tính, chiết khấu, phí giao, tổng cộng và lời tạm tính.
- Lưu hóa đơn vào SQLite.
- Lưu sale items và payment records.
- Tạo khách hàng mới nếu POS có nhập tên/SĐT.
- Invoice code tự sinh theo ngày giờ.
- Template hóa đơn 58mm, 80mm và A4.
- Preview/in hóa đơn bằng system print window.
- Printer settings gồm tên máy in và khổ giấy.
- Native Tauri command thử lấy danh sách máy in local.

## File chính

```txt
src/features/pos/POSPage.tsx
src/db/repositories/salesRepository.ts
src/db/repositories/printerRepository.ts
src/services/pos/cart.ts
src/services/printing/invoiceTemplate.ts
src/services/printing/printerService.ts
src/features/settings/PrinterSettingsCard.tsx
src-tauri/src/main.rs
```

## POS flow

```txt
1. Nhân viên chọn sản phẩm/dịch vụ.
2. Có thể thêm dòng tùy chỉnh.
3. Sửa số lượng/giá từng dòng.
4. Nhập khách hàng, SĐT, ghi chú.
5. Nhập chiết khấu/phí giao.
6. Chọn phương thức thanh toán.
7. Lưu hóa đơn.
8. Preview/in hóa đơn cuối.
```

## Printer flow

```txt
1. App gọi native command `list_local_printers`.
2. Chủ shop chọn hoặc nhập tên máy in.
3. Chủ shop chọn khổ 58mm/80mm/A4.
4. Lưu vào `printer_settings`.
5. Khi in, template dùng paper size đã lưu.
6. App mở print preview/system print window.
```

## Lưu ý kỹ thuật

- Phase này chưa trừ kho khi bán. Trừ kho/FIFO sẽ làm ở Phase D.
- `cost_price` hiện lưu 0 hoặc giá tạm, FIFO cost sẽ cập nhật sau.
- Native printer discovery phụ thuộc OS:
  - Windows dùng PowerShell `Get-Printer`.
  - macOS/Linux dùng `lpstat`.
- In hiện dùng system print dialog, chưa silent print trực tiếp tới printer name.
- SQLite và native printer command cần chạy trong Tauri runtime.

## Cách chạy

```bash
npm install
npm run tauri:dev
```

## Issue coverage

Phase này cover các issue:

- #20 Build POS layout and order builder UI
- #21 Implement POS cart calculations
- #22 Persist sales, sale items and payments
- #23 Build printer settings and local printer discovery
- #24 Build invoice templates and print preview
