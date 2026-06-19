# Bloomia Backlog Module Lớn

Tài liệu này dùng để chia việc cho team. Mỗi phần lớn có mục tiêu, output và tiêu chí hoàn thành.

## Epic 1 — Project Foundation

### Mục tiêu

Khởi tạo nền app desktop, database, theme và cấu trúc code.

### Tasks

- [ ] Chọn stack: Tauri hoặc Electron.
- [ ] Setup React + TypeScript.
- [ ] Setup SQLite local.
- [ ] Setup migration system.
- [ ] Setup routing.
- [ ] Setup lint/format.
- [ ] Setup design tokens.
- [ ] Tạo seed data mẫu.
- [ ] Tạo README dev setup.

### Output

- App chạy được local.
- Có database local.
- Có theme Bloomia.

## Epic 2 — Bloomia Design System

### Mục tiêu

Xây hệ UI mềm, đẹp, không thô cứng.

### Tasks

- [ ] Tạo bảng màu.
- [ ] Tạo typography scale.
- [ ] Tạo SoftCard.
- [ ] Tạo PillTab.
- [ ] Tạo Button variants.
- [ ] Tạo Input/Select/Textarea.
- [ ] Tạo Badge/StatusPill.
- [ ] Tạo Modal/Dialog.
- [ ] Tạo Sidebar.
- [ ] Tạo Topbar.
- [ ] Tạo DataTable mềm.
- [ ] Tạo EmptyState.

### Output

- Bộ component dùng lại cho toàn app.

## Epic 3 — Catalog & Manual Setup

### Mục tiêu

Chủ shop tự setup dữ liệu ban đầu.

### Tasks

- [ ] CRUD nhóm hàng.
- [ ] CRUD hàng hóa/nguyên liệu.
- [ ] CRUD dịch vụ.
- [ ] CRUD đơn vị tính.
- [ ] CRUD nhà cung cấp.
- [ ] CRUD tone màu.
- [ ] CRUD dịp tặng.
- [ ] Cài đặt thông tin shop.
- [ ] Cài đặt nhân viên cơ bản.

### Output

- Chủ shop tự tạo dữ liệu vận hành được.

## Epic 4 — POS / Sales

### Mục tiêu

Tạo hóa đơn bán lẻ nhanh, đẹp, linh hoạt.

### Tasks

- [ ] Màn bán hàng.
- [ ] Tab Đơn tại quầy / Đơn giao / Đặt trước.
- [ ] Tìm kiếm sản phẩm.
- [ ] Thêm sản phẩm vào đơn.
- [ ] Thêm dòng tùy chỉnh.
- [ ] Thêm dịch vụ/phụ phí.
- [ ] Sửa số lượng.
- [ ] Sửa giá bán.
- [ ] Chiết khấu.
- [ ] Ghi chú đơn.
- [ ] Thanh toán.
- [ ] Lưu hóa đơn.
- [ ] Hủy/hoàn đơn cơ bản.

### Output

- Tạo và lưu hóa đơn được.

## Epic 5 — Local Printing

### Mục tiêu

In hóa đơn tại máy local.

### Tasks

- [ ] Liệt kê máy in local.
- [ ] Chọn máy in mặc định.
- [ ] Cài khổ giấy 58mm/80mm/A4.
- [ ] In thử.
- [ ] Template hóa đơn nhiệt.
- [ ] Template phiếu giao hàng.
- [ ] Fallback xuất PDF.
- [ ] Lưu printer settings.

### Output

- In hóa đơn local được.

## Epic 6 — Purchasing / Batch Import

### Mục tiêu

Nhập hàng theo lô, giá nhập thay đổi từng lần.

### Tasks

- [ ] Tạo phiếu nhập.
- [ ] Chọn nhà cung cấp.
- [ ] Thêm nhiều dòng hàng.
- [ ] Nhập giá nhập từng dòng.
- [ ] Nhập ngày dự kiến héo.
- [ ] Lưu purchase_batches.
- [ ] Ghi stock_movements loại purchase.
- [ ] Xem lịch sử nhập.

### Output

- Một mặt hàng có nhiều lô nhập khác giá.

## Epic 7 — Inventory / Stock Movement / FIFO

### Mục tiêu

Quản lý tồn kho, xuất kho và giá vốn.

### Tasks

- [ ] Tạo stock movement model.
- [ ] Xuất bán.
- [ ] Xuất hủy.
- [ ] Xuất mẫu.
- [ ] Xuất sự kiện.
- [ ] Điều chỉnh kho.
- [ ] Tính tồn theo item.
- [ ] Tính tồn theo lô.
- [ ] FIFO cost calculation.
- [ ] Manual cost override.
- [ ] Cảnh báo hoa sắp héo.

### Output

- Tồn kho và giá vốn hoạt động đúng.

## Epic 8 — Reports / Dashboard

### Mục tiêu

Chủ shop xem tình hình kinh doanh.

### Tasks

- [ ] Dashboard tổng quan.
- [ ] Doanh thu ngày.
- [ ] Doanh thu tháng.
- [ ] Số đơn.
- [ ] Giá trị đơn trung bình.
- [ ] Lợi nhuận tạm tính.
- [ ] Báo cáo nhập hàng.
- [ ] Báo cáo xuất kho.
- [ ] Báo cáo tồn kho.
- [ ] Báo cáo hoa hủy.
- [ ] Top sản phẩm bán chạy.
- [ ] Export CSV/Excel.

### Output

- Báo cáo đủ dùng cho MVP.

## Epic 9 — Flower Orders / Delivery

### Mục tiêu

Quản lý đơn đặt trước và giao hoa.

### Tasks

- [ ] Tạo đơn đặt hoa.
- [ ] Thông tin người nhận.
- [ ] Ngày giờ giao.
- [ ] Địa chỉ giao.
- [ ] Lời nhắn thiệp.
- [ ] Tone màu.
- [ ] Ngân sách.
- [ ] Ảnh mẫu.
- [ ] Trạng thái đơn.
- [ ] Danh sách đơn cần giao hôm nay.
- [ ] Phiếu giao hàng.
- [ ] Cảnh báo đơn sắp giao.

### Output

- Quản lý được đơn hoa chưa giao ngay.

## Epic 10 — Product Recipes

### Mục tiêu

Tạo mẫu hoa có công thức nguyên liệu.

### Tasks

- [ ] Tạo sản phẩm mẫu.
- [ ] Gắn nguyên liệu.
- [ ] Gắn dịch vụ mặc định.
- [ ] Tính giá vốn dự kiến.
- [ ] Cho sửa công thức khi bán.
- [ ] Trừ kho theo công thức sau khi xác nhận.

### Output

- Sản phẩm mẫu có công thức nhưng vẫn linh hoạt.

## Epic 11 — Bloomia AI Dialog UI

### Mục tiêu

Tạo dialog AI đẹp trong desktop app.

### Tasks

- [ ] Floating AI button.
- [ ] AI panel.
- [ ] Tab Trend / Kinh doanh / Cách cắm / Nội dung / Hỏi AI.
- [ ] Quick prompt chips.
- [ ] Chat message UI.
- [ ] Suggestion card.
- [ ] Loading state mềm.
- [ ] Action button từ AI suggestion.
- [ ] Lưu lịch sử hội thoại local.

### Output

- Chủ shop có thể mở Bloomia AI và chat.

## Epic 12 — AI Context Engine

### Mục tiêu

AI đọc dữ liệu shop để tư vấn chính xác.

### Tasks

- [ ] Build aiContextService.
- [ ] Context doanh thu.
- [ ] Context tồn kho.
- [ ] Context hoa sắp héo.
- [ ] Context giá nhập.
- [ ] Context top sản phẩm.
- [ ] Context hao hụt.
- [ ] Context đơn sắp giao.
- [ ] Chuẩn hóa JSON payload cho AI.

### Output

- AI trả lời dựa trên dữ liệu thật.

## Epic 13 — AI Web Service / Dialogflow / Telegram

### Mục tiêu

Có backend AI/web để cấu hình provider, Dialogflow CX và Telegram.

### Tasks

- [ ] Setup Node/Express service.
- [ ] Tạo `.env.example`.
- [ ] API `/api/florist-ai/chat`.
- [ ] API `/api/florist-ai/events`.
- [ ] Admin settings API.
- [ ] Dialogflow CX client.
- [ ] Test Dialogflow endpoint.
- [ ] Telegram client.
- [ ] Test Telegram endpoint.
- [ ] Hot event scoring.
- [ ] Telegram notify rules.
- [ ] Không log secret.

### Output

- AI web service chạy được và gửi notify được.

## Epic 14 — Security / Backup / Release

### Mục tiêu

App đủ an toàn để dùng thật.

### Tasks

- [ ] Backup SQLite.
- [ ] Restore SQLite.
- [ ] Export dữ liệu.
- [ ] Không commit secret.
- [ ] Encrypt credential local.
- [ ] App installer Windows.
- [ ] Versioning.
- [ ] Release checklist.
- [ ] Manual QA checklist.

### Output

- Có bản cài thử nghiệm cho shop thật.
