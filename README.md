# Bloomia

**Bloomia** là desktop app quản lý bán hàng, đơn hoa, kho và AI cố vấn dành riêng cho shop hoa.

Tagline đề xuất:

> Bán hoa đẹp hơn. Quản tiệm nhẹ hơn.

## Mục tiêu sản phẩm

Bloomia không phải phần mềm POS phổ thông. Sản phẩm được thiết kế riêng cho ngành hoa, nơi một đơn bán thường bao gồm cả hàng hóa, nguyên liệu, phụ liệu và dịch vụ.

Ví dụ một đơn hoa có thể gồm:

- Hoa chính
- Hoa phụ
- Lá phụ
- Giấy gói
- Ruy băng
- Công cắm
- Thiệp
- Phí giao hàng
- Phụ thu gấp

Vì vậy Bloomia cần hỗ trợ:

- Xuất hóa đơn bán lẻ có giá.
- Kết nối máy in local.
- Quản lý nhập hàng với giá nhập thay đổi theo từng lô.
- Báo cáo xuất nhập tồn.
- Ghi nhận hoa héo, hao hụt, xuất hủy.
- Bán sản phẩm mẫu hoặc đơn tùy chỉnh theo ngân sách khách.
- Cấu hình thủ công cho chủ tiệm.
- AI dialog tư vấn trend, kinh doanh, cách cắm hoa và nội dung bán hàng.
- AI theo từng tab/module, mỗi tab có data store riêng và popup card tư vấn riêng.

## Tài liệu chính

- [Product Plan](docs/00_PRODUCT_PLAN.md)
- [Execution Plan](docs/01_EXECUTION_PLAN.md)
- [AI Dialog & Web Config](docs/02_AI_DIALOG_AND_WEB_CONFIG.md)
- [Backlog Module Lớn](docs/03_BACKLOG.md)
- [AI Per-Tab Popup & Data Store Plan](docs/04_AI_TAB_DATA_STORES.md)
- [Implementation Task Board](docs/05_TASK_BOARD.md)

## Công nghệ đề xuất

### Desktop app

Ưu tiên:

- Tauri
- React
- TypeScript
- SQLite

Phương án thay thế nếu cần làm nhanh hơn:

- Electron
- React
- TypeScript
- SQLite

### AI/Web service

- Node.js
- Express
- Dialogflow CX hoặc AI provider tương đương
- Telegram notification
- PostgreSQL hoặc SQLite tùy môi trường deploy

## Nguyên tắc thiết kế UI

Chủ shop hoa thích cái đẹp, nên UI phải mềm, sang và không thô cứng.

Không dùng card/tab vuông cứng. Ưu tiên:

- Bo góc lớn
- Pill tab mềm
- Màu blush pink, ivory, sage green, lavender, peach
- Shadow nhẹ
- Khoảng trắng thoáng
- Floral accent tinh tế
- UX đơn giản, thao tác nhanh tại quầy

## MVP ưu tiên

MVP đầu tiên cần làm thật chắc:

1. Setup desktop app + database local.
2. Danh mục hàng hóa, dịch vụ, đơn vị tính, nhà cung cấp.
3. POS bán hàng.
4. In hóa đơn local.
5. Nhập kho theo lô và giá nhập từng lần.
6. Xuất kho, tồn kho, hoa hủy.
7. Báo cáo ngày.
8. Backup dữ liệu.

AI nên làm sau khi dữ liệu bán hàng/kho đã ổn, vì AI cần dữ liệu thực để tư vấn hay.
