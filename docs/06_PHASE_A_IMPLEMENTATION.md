# Phase A Implementation

Phase A tạo nền kỹ thuật đầu tiên cho Bloomia.

## Scope đã implement

- Tauri desktop shell.
- React + TypeScript + Vite.
- Internal routing cho các module chính.
- App layout gồm Sidebar, Topbar và content area.
- Design tokens Bloomia.
- Base UI components.
- SQLite client wrapper.
- Migration runner.
- Core database schema.
- Inventory database schema.
- Seed data mẫu cho shop hoa.

## Chạy local

```bash
npm install
npm run tauri:dev
```

Nếu chỉ muốn xem UI bằng Vite browser:

```bash
npm run dev
```

Lưu ý: SQLite plugin chạy trong Tauri runtime. Khi chạy bằng Vite browser thuần, trạng thái DB có thể báo lỗi vì không có Tauri runtime.

## Scripts

```bash
npm run dev          # chạy Vite UI
npm run build        # TypeScript + Vite build
npm run tauri:dev    # chạy desktop app dev
npm run tauri:build  # build desktop app
npm run lint         # type-check
```

## Database

Database URL hiện tại:

```txt
sqlite:bloomia.db
```

Migration chính:

- `0001_core_schema`
- `0002_inventory_schema`

Bảng core:

- shops
- users
- settings
- item_categories
- units
- items
- suppliers
- customers
- sales
- sale_items
- payments
- orders
- printer_settings

Bảng inventory:

- purchase_batches
- stock_movements

## Seed data

Seed data gồm:

- Hoa hồng pastel
- Baby trắng
- Lá bạc hà
- Giấy gói Hàn Quốc
- Ruy băng
- Công cắm hoa
- Phí giao hàng
- Thiệp chúc mừng

## Ghi chú kỹ thuật

- Không hard delete dữ liệu phát sinh giao dịch ở các phase sau.
- Dịch vụ dùng `is_stock_tracked = 0`.
- Giá nhập không lưu cố định trên item; giá nhập lưu theo `purchase_batches`.
- `stock_movements` là nền cho xuất nhập tồn và báo cáo.

## Issue coverage

Phase này cover các issue:

- #10 Initialize desktop app project
- #11 Setup lint, format, routing and app shell
- #12 Create Bloomia design tokens
- #13 Build base UI components
- #14 Setup SQLite migrations and database layer
- #15 Create core database schema
- #16 Create inventory database schema
