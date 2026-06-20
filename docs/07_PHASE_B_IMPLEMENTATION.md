# Phase B Implementation

Phase B triển khai phần setup thủ công cho chủ shop.

## Scope đã implement

- Shop settings form.
- Invoice information preview.
- Catalog CRUD cho:
  - Nhóm hàng.
  - Đơn vị tính.
  - Nhà cung cấp.
- Item/service CRUD cho:
  - Hoa tươi.
  - Nguyên liệu/phụ liệu.
  - Dịch vụ.
  - Sản phẩm mẫu.
- Soft archive cho danh mục và hàng hóa/dịch vụ.
- Repository layer cho manual setup.

## Màn hình

Phase này tập trung trong tab **Cài đặt**.

Các tab con:

1. **Thông tin shop**
   - Tên shop.
   - SĐT.
   - Địa chỉ.
   - Logo path local.
   - Footer hóa đơn.
   - Preview hóa đơn.

2. **Danh mục nền**
   - Nhóm hàng.
   - Đơn vị tính.
   - Nhà cung cấp.

3. **Hàng hóa & dịch vụ**
   - Tạo/sửa/ẩn hàng hóa.
   - Tạo/sửa/ẩn dịch vụ.
   - Dịch vụ tự tắt theo dõi tồn kho.
   - Hàng hóa có thể bật/tắt theo dõi tồn kho.

## Repository functions

File chính:

```txt
src/db/repositories/manualSetupRepository.ts
```

Functions:

- `listCategories`
- `saveCategory`
- `archiveCategory`
- `listUnits`
- `saveUnit`
- `archiveUnit`
- `listSuppliers`
- `saveSupplier`
- `archiveSupplier`
- `listItems`
- `saveItem`
- `archiveItem`
- `getShopSettings`
- `saveShopSettings`

## Quy tắc nghiệp vụ

- Không hard delete dữ liệu setup; dùng `is_active = 0` để ẩn mềm.
- Dịch vụ dùng `is_stock_tracked = 0`.
- Giá nhập không chỉnh ở màn item. Giá nhập sẽ đi theo `purchase_batches` ở Phase D.
- `default_sale_price` chỉ là giá bán gợi ý, POS vẫn được sửa giá theo từng đơn.

## Cách chạy

```bash
npm install
npm run tauri:dev
```

SQLite plugin cần Tauri runtime. Nếu chạy bằng `npm run dev` trong browser, màn setup có thể báo lỗi DB.

## Issue coverage

Phase này cover các issue:

- #17 Build catalog category/unit/supplier CRUD
- #18 Build item and service CRUD
- #19 Build shop settings screen
