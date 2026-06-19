# Bloomia Execution Plan

Tài liệu này chia các phần lớn cần thực thi thành milestone, module, đầu việc và tiêu chí hoàn thành.

## 1. Nguyên tắc triển khai

Ưu tiên làm theo thứ tự:

```txt
1. Nền app + database
2. Danh mục thủ công
3. POS bán hàng
4. In hóa đơn local
5. Nhập kho
6. Xuất kho / tồn kho
7. Báo cáo ngày
8. Đơn hoa / đặt trước / giao hàng
9. Công thức mẫu
10. AI Dialog UI
11. AI đọc context dữ liệu shop
12. AI web service / Dialogflow / Telegram
```

Lý do: AI chỉ tư vấn tốt khi app đã có dữ liệu bán hàng, tồn kho và giá vốn.

## 2. Milestone 0 — Khởi tạo dự án

### Mục tiêu

Có nền kỹ thuật sạch để dev triển khai lâu dài.

### Việc cần làm

- Chọn stack chính: Tauri + React + TypeScript + SQLite.
- Tạo monorepo hoặc single repo structure.
- Setup lint, format, TypeScript strict.
- Setup routing cho desktop UI.
- Setup design tokens.
- Setup SQLite migration.
- Setup seed data mẫu cho shop hoa.

### Cấu trúc thư mục đề xuất

```txt
/apps
  /desktop
    /src
      /app
      /components
      /features
      /db
      /services
      /styles
      /types
/packages
  /ui
  /core
  /database
  /printer
  /ai-shared
/docs
```

Nếu muốn đơn giản hơn giai đoạn đầu:

```txt
/src
  /components
  /features
  /db
  /services
  /styles
  /types
/docs
```

### Done khi

- App chạy được màn trống.
- Có SQLite local.
- Có migration đầu tiên.
- Có theme màu Bloomia.
- Có navigation cơ bản.

## 3. Milestone 1 — Design system & layout

### Mục tiêu

Tạo UI nền đẹp, mềm, không thô cứng.

### Việc cần làm

- Tạo theme màu:
  - blush pink
  - warm ivory
  - sage green
  - muted lavender
  - soft peach
  - gold accent
- Tạo component base:
  - Button
  - PillTab
  - SoftCard
  - Input
  - Select
  - Textarea
  - Badge
  - Modal/Dialog
  - Drawer
  - DataTable mềm
  - EmptyState
- Tạo layout:
  - Sidebar
  - Topbar
  - Page shell
  - Dashboard grid
- Tạo icon style đồng nhất.

### Done khi

- Có dashboard shell giống concept UI.
- Sidebar có các mục chính.
- Button/card/tab không bị cứng.
- Có Storybook hoặc demo component nội bộ nếu cần.

## 4. Milestone 2 — Database local & domain model

### Mục tiêu

Xây lõi dữ liệu cho POS, kho, đơn hoa, AI.

### Bảng cần có trong MVP

```txt
shops
users
settings
item_categories
items
units
suppliers
purchase_batches
stock_movements
customers
sales
sale_items
payments
orders
printer_settings
```

### Bảng AI để chuẩn bị Phase sau

```txt
ai_conversations
ai_messages
ai_suggestions
ai_events
ai_settings
telegram_logs
```

### Việc cần làm

- Tạo migration.
- Tạo repository/service layer.
- Tạo seed data:
  - Hoa hồng pastel
  - Baby trắng
  - Lá bạc hà
  - Giấy gói
  - Ruy băng
  - Công cắm
  - Phí giao hàng
  - Thiệp
- Tạo backup/restore SQLite.

### Done khi

- CRUD local hoạt động.
- Có seed data mẫu.
- Có backup database ra file.
- Có restore từ file backup.

## 5. Milestone 3 — Danh mục thủ công

### Mục tiêu

Chủ shop tự setup được nền vận hành.

### Màn hình cần làm

- Danh mục hàng hóa/nguyên liệu.
- Danh mục dịch vụ.
- Đơn vị tính.
- Nhà cung cấp.
- Tone màu.
- Dịp tặng.
- Cài đặt shop.

### Field item đề xuất

```txt
id
name
sku
category_id
type: flower | material | service | product
unit_id
default_sale_price
is_stock_tracked
is_active
note
created_at
updated_at
```

### Done khi

- Tạo/sửa/xóa/ẩn hàng hóa được.
- Tạo/sửa/xóa dịch vụ được.
- Dịch vụ không trừ kho.
- Hàng hóa có thể bật/tắt theo dõi tồn.

## 6. Milestone 4 — POS bán hàng

### Mục tiêu

Nhân viên bán hàng nhanh tại quầy.

### Màn hình

- Tab mềm:
  - Đơn tại quầy
  - Đơn giao
  - Đặt trước
- Thông tin khách.
- Chọn sản phẩm.
- Thêm dịch vụ/phụ phí.
- Giỏ hàng / chi tiết đơn bên phải.
- Thanh toán.
- In hóa đơn.

### Chức năng

- Thêm sản phẩm mẫu.
- Thêm dòng tùy chỉnh.
- Sửa tên dòng bán.
- Sửa số lượng.
- Sửa giá bán.
- Thêm chiết khấu.
- Thêm phí giao.
- Ghi chú đơn.
- Chọn phương thức thanh toán.
- Lưu hóa đơn.

### Done khi

- Tạo hóa đơn hoàn chỉnh.
- Tính tổng đúng.
- Có payment record.
- Có sale_items.
- Có thể in hóa đơn từ hóa đơn đã lưu.

## 7. Milestone 5 — In hóa đơn local

### Mục tiêu

Kết nối máy in local cho shop.

### Loại in

- Hóa đơn nhiệt 58mm.
- Hóa đơn nhiệt 80mm.
- Phiếu A4 nếu cần.

### Việc cần làm

- Liệt kê máy in local.
- Chọn máy in mặc định.
- In thử.
- Template hóa đơn bán lẻ.
- Template phiếu giao hàng.
- Lưu printer_settings.

### Done khi

- Chọn được máy in.
- In thử thành công.
- Hóa đơn có logo/tên shop/SĐT/địa chỉ/tổng tiền.
- Có fallback xuất PDF nếu chưa kết nối máy in.

## 8. Milestone 6 — Nhập kho theo lô

### Mục tiêu

Ghi nhận giá nhập thay đổi từng lần.

### Chức năng

- Tạo phiếu nhập.
- Chọn nhà cung cấp.
- Thêm nhiều dòng hàng.
- Nhập số lượng.
- Nhập giá nhập.
- Nhập ngày dự kiến héo.
- Lưu purchase_batches.
- Tạo stock_movements loại purchase.

### Done khi

- Một mặt hàng có nhiều lô nhập khác giá.
- Tồn kho tăng đúng.
- Báo cáo nhập hàng đọc được từ movement.

## 9. Milestone 7 — Xuất kho, tồn kho, FIFO

### Mục tiêu

Theo dõi tồn chính xác và tính giá vốn.

### Logic giá vốn

- Mặc định: FIFO.
- Cho phép override thủ công nếu chủ shop sửa giá vốn.

### Loại xuất

```txt
sale
waste
sample
event
internal
adjustment
```

### Việc cần làm

- Xuất bán từ hóa đơn.
- Xuất hủy vì héo.
- Xuất mẫu.
- Điều chỉnh kho.
- Tồn theo item.
- Tồn theo lô.
- Cảnh báo hoa sắp héo.

### Done khi

- Bán hàng có thể trừ kho.
- Xuất hủy ghi nhận hao hụt.
- Tồn kho hiện tại đúng.
- Giá vốn FIFO tính được.

## 10. Milestone 8 — Báo cáo

### Mục tiêu

Chủ shop xem được sức khỏe kinh doanh.

### Báo cáo MVP

- Doanh thu ngày.
- Số đơn.
- Giá trị đơn trung bình.
- Tổng nhập hàng.
- Tổng xuất hủy.
- Lợi nhuận tạm tính.
- Tồn kho.
- Hoa sắp héo.
- Top sản phẩm bán chạy.

### Done khi

- Dashboard dùng dữ liệu thật.
- Có filter hôm nay / 7 ngày / tháng này.
- Có export CSV/Excel nếu làm kịp.

## 11. Milestone 9 — Đơn hoa / đặt trước / giao hàng

### Mục tiêu

Quản lý đơn không giao ngay.

### Chức năng

- Tạo đơn đặt trước.
- Ngày giờ giao.
- Người nhận.
- Địa chỉ.
- Lời nhắn thiệp.
- Ảnh mẫu.
- Tone màu.
- Ngân sách.
- Trạng thái đơn.
- Phiếu giao hàng.

### Done khi

- Có danh sách đơn hôm nay.
- Có trạng thái đơn.
- Có cảnh báo đơn sắp giao.
- Có thể chuyển từ đơn đặt trước sang hóa đơn thanh toán.

## 12. Milestone 10 — Công thức mẫu

### Mục tiêu

Tạo sản phẩm mẫu có cấu thành nguyên liệu nhưng vẫn linh hoạt.

### Chức năng

- Tạo mẫu hoa.
- Gắn công thức nguyên liệu.
- Gắn dịch vụ mặc định.
- Khi bán có thể sửa công thức.
- Tính giá vốn dự kiến.

### Done khi

- Bó hoa mẫu có recipe.
- Thêm vào POS tự gợi ý nguyên liệu.
- Người bán có thể chỉnh trước khi lưu.

## 13. Milestone 11 — AI Dialog UI

### Mục tiêu

Có Bloomia AI trong desktop app.

### Chức năng

- Floating AI button.
- Dialog/panel mềm.
- Quick prompts.
- Chat area.
- Suggestion cards.
- Tab:
  - Trend hôm nay
  - Kinh doanh
  - Cách cắm hoa
  - Nội dung bán hàng
  - Hỏi AI

### Done khi

- Người dùng chat được với AI mock/local.
- AI card hiển thị đẹp.
- Có nút hành động: tạo combo, viết caption, tạo đơn từ gợi ý.

## 14. Milestone 12 — AI context từ dữ liệu shop

### Mục tiêu

AI đọc context thật từ local database.

### Context cần gửi

- Doanh thu hôm nay.
- Đơn hôm nay.
- Tồn kho.
- Hoa sắp héo.
- Giá nhập gần nhất.
- Top sản phẩm.
- Hoa hủy.
- Mẫu bán chậm.

### Done khi

- Bấm “Hôm nay nên bán gì?” AI dùng dữ liệu thật.
- Bấm “Hoa nào cần xử lý?” AI trả lời theo tồn kho thật.
- Bấm “Tính giá bán” AI dùng giá vốn thật.

## 15. Milestone 13 — AI Web Service / Dialogflow / Telegram

### Mục tiêu

Tách AI service ra backend có thể cấu hình web, Dialogflow CX và Telegram notify.

### Chức năng

- API chat.
- API event.
- Admin settings.
- Test Dialogflow.
- Test Telegram.
- Hot event scoring.
- Telegram notify cho tín hiệu nóng.

### Done khi

- Cấu hình được Project ID, Location, Agent ID, Credentials JSON.
- Test Dialogflow thành công.
- Test Telegram thành công.
- AI event nóng gửi Telegram cho chủ shop.

## 16. Checklist release MVP

- [ ] Cài app được trên Windows.
- [ ] App chạy offline.
- [ ] Tạo danh mục được.
- [ ] Tạo hóa đơn được.
- [ ] In hóa đơn được.
- [ ] Nhập kho được.
- [ ] Xuất hủy được.
- [ ] Xem tồn kho được.
- [ ] Xem báo cáo ngày được.
- [ ] Backup database được.
- [ ] UI đạt style Bloomia, không thô cứng.
