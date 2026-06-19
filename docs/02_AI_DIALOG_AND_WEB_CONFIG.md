# Bloomia AI Dialog & Web Config Plan

## 1. Mục tiêu

Bloomia AI là dialog cố vấn cho chủ shop hoa.

Không làm chatbot thô cứng. Bloomia AI cần giống một cố vấn nhỏ trong app:

- Mềm.
- Đẹp.
- Có gợi ý nhanh.
- Đọc được dữ liệu shop.
- Tư vấn được trend, kinh doanh, cách cắm hoa, nội dung bán hàng.

Tên module:

> Bloomia AI

Subtitle:

> Cố vấn tiệm hoa

## 2. Vị trí UI

### Desktop app

- Floating button ở góc phải dưới.
- Icon dạng bông hoa / sparkle.
- Khi mở ra là panel bo góc mềm.
- Có tab dạng pill.
- Có suggestion card.
- Có input chat.

### Các tab chính

```txt
Trend hôm nay
Kinh doanh
Cách cắm hoa
Nội dung bán hàng
Hỏi AI
```

## 3. Quick prompt cần có

### Trend

- Hôm nay nên đẩy mẫu nào?
- Hoa nào sắp héo cần bán nhanh?
- Gợi ý combo hôm nay.
- Tone màu nào nên đăng Facebook?

### Kinh doanh

- Đơn 500k nên dùng nguyên liệu gì để vẫn lời?
- Hôm nay doanh thu ổn không?
- Giá nhập tăng thì chỉnh giá bán sao?
- Hoa nào hao hụt nhiều?
- Nên giảm nhập loại hoa nào?

### Cách cắm hoa

- Cắm bó 500k tone hồng pastel.
- Cắm bó 700k tone trắng xanh.
- Gợi ý lẵng khai trương 1 triệu.
- Thay thế hoa hồng bằng hoa nào nếu giá nhập cao?

### Nội dung bán hàng

- Viết caption Facebook cho bó hoa mới.
- Viết lời nhắn thiệp sinh nhật.
- Viết mô tả sản phẩm sang hơn.
- Đặt tên mẫu hoa mới.

## 4. AI context cần đọc từ desktop local

Bloomia AI nên nhận context ngắn, sạch, có cấu trúc.

Payload ví dụ:

```json
{
  "shop_id": "local-shop-001",
  "date": "2026-06-20",
  "sales_today": 24850000,
  "orders_today": 36,
  "average_order_value": 690278,
  "inventory_alerts": [
    {
      "item_name": "Hoa hồng pastel",
      "quantity": 35,
      "unit": "cành",
      "days_left": 1,
      "latest_unit_cost": 10000
    }
  ],
  "top_products": [
    {
      "name": "Bó Hồng Romance",
      "sold": 18,
      "revenue": 22500000
    }
  ],
  "waste_today": [
    {
      "item_name": "Baby trắng",
      "quantity": 2,
      "unit": "bó",
      "reason": "héo"
    }
  ]
}
```

## 5. AI không được tự ý làm gì

AI không được tự động:

- Sửa giá bán.
- Sửa tồn kho.
- Xóa đơn.
- Tạo hóa đơn thật.
- Gửi tin nhắn cho khách.
- Gửi Telegram khi chưa có rule rõ.

AI chỉ được:

- Gợi ý.
- Soạn nháp.
- Tạo draft action.
- Chờ chủ shop xác nhận.

## 6. Suggestion card format

Ví dụ:

```txt
🌸 Gợi ý hôm nay

Hoa hồng pastel còn 35 cành và nên xử lý trong 1 ngày.
Nên tạo combo “Bó Pastel Dịu Dàng” giá 399k - 499k.

Vì sao:
- Hợp khách sinh nhật / kỷ niệm.
- Dễ kết hợp baby trắng đang còn tồn.
- Giá bán vẫn giữ biên lợi nhuận tốt nếu dùng 12-15 cành/bó.

Hành động:
[ Tạo mẫu combo ] [ Viết caption ] [ Tạo khuyến mãi ]
```

## 7. Web AI service

Bloomia có thể tách một backend AI riêng để xử lý:

- Chat AI.
- Dialogflow CX.
- Telegram notify.
- Event scoring.
- Admin settings.
- Test kết nối.

Backend này có thể kế thừa pattern từ repo `trust-finance`, nhưng đổi domain từ finance sang florist.

## 8. API đề xuất

### Chat

```txt
POST /api/florist-ai/chat
```

Payload:

```json
{
  "shop_id": "local-shop-001",
  "session_id": "session-001",
  "message": "Hôm nay nên bán gì?",
  "context": {}
}
```

Response:

```json
{
  "reply": "Hôm nay nên đẩy combo pastel 399k vì hoa hồng pastel còn nhiều...",
  "suggestions": [
    {
      "type": "combo",
      "title": "Bó Pastel Dịu Dàng",
      "action": "create_combo_draft"
    }
  ]
}
```

### Event

```txt
POST /api/florist-ai/events
```

Dùng để ghi nhận tín hiệu:

- Khách hỏi đặt hoa gấp.
- AI phát hiện tồn sắp héo.
- Doanh thu thấp bất thường.
- Có đơn lớn chưa thanh toán.

### Admin

```txt
GET   /api/admin/florist-ai/settings
PATCH /api/admin/florist-ai/settings
POST  /api/admin/florist-ai/test-dialogflow
POST  /api/admin/florist-ai/test-telegram
GET   /api/admin/florist-ai/events
PATCH /api/admin/florist-ai/events/:id/status
```

## 9. Cấu hình Dialogflow CX

Màn hình admin cần có:

```txt
Provider
Base URL
Project ID
Location
Language Code
Agent ID
Google Cloud Credentials JSON
```

Giá trị thường gặp:

```txt
Base URL: https://dialogflow.googleapis.com/v3
Location: global hoặc location của agent
Language Code: vi
```

Agent ID lấy từ URL Dialogflow CX dạng:

```txt
/projects/{project_id}/locations/{location}/agents/{agent_id}
```

## 10. Kiểm tra kết nối Dialogflow

Nút:

```txt
Kiểm tra kết nối AI
```

Test cần kiểm tra:

- Credentials JSON có parse được không.
- Project ID đúng không.
- Location đúng không.
- Agent ID đúng không.
- Service account có quyền gọi Dialogflow API không.
- API có trả response không.

Lỗi cần hiển thị thân thiện:

- Sai Project ID.
- Sai Location.
- Sai Agent ID.
- Credentials không hợp lệ.
- Thiếu quyền.
- Dialogflow API chưa bật.

## 11. Telegram notify

### Cài đặt

```txt
Telegram Bot Token
Default Chat ID
Notify normal event: on/off
Notify hot event: on/off
```

### Event thường

- AI có cuộc tư vấn mới.
- Có khách để lại nhu cầu.
- Có yêu cầu báo giá.

### Event nóng

- Đơn gấp trong ngày.
- Khách có ngân sách cao.
- Khách hỏi hoa cưới/sự kiện.
- Hoa sắp héo nhiều.
- Doanh thu thấp bất thường.
- Đơn lớn chưa thanh toán.

Ví dụ message:

```txt
[SHOP HOA - TÍN HIỆU NÓNG]

Loại: Đơn hoa gấp
Khách: Chị Minh Anh
SĐT: 09xx xxx xxx
Nhu cầu: Bó hoa sinh nhật tone trắng xanh
Ngân sách: 700.000đ
Thời gian giao: Hôm nay 17:00
Lý do nóng: giao gấp, có SĐT, ngân sách rõ
Gợi ý AI: Ưu tiên gọi xác nhận trong 5 phút.
```

## 12. Hot event scoring

Rule gợi ý:

```txt
+30 nếu có SĐT
+30 nếu giao trong ngày
+25 nếu ngân sách >= 1.000.000đ
+25 nếu là hoa cưới / sự kiện / khai trương
+20 nếu tồn sắp héo > ngưỡng
+20 nếu đơn chưa thanh toán > ngưỡng
+15 nếu khách quay lại
```

Nếu score >= 60 thì `is_hot = true`.

## 13. Database AI/Web

Nếu backend deploy riêng, dùng bảng:

```txt
florist_ai_events
florist_ai_conversations
florist_ai_messages
florist_ai_settings
telegram_logs
```

### florist_ai_events

```txt
id
event_type
title
content
payload_json
score
is_hot
hot_reasons
telegram_sent
status
created_at
updated_at
```

### florist_ai_settings

```txt
id
provider
base_url
project_id
location
language_code
agent_id
credentials_json_encrypted
telegram_bot_token_encrypted
telegram_default_chat_id
notify_normal_event
notify_hot_event
created_at
updated_at
```

## 14. Bảo mật

Không commit:

- `.env`
- Telegram bot token
- Google credentials JSON
- API key
- Database thật của shop

Cần có:

- `.env.example`
- Mã hóa credential nếu lưu trong DB.
- Không in token ra log.
- Không đưa dữ liệu khách hàng vào log debug.

## 15. Prompt hệ thống cho AI

File đề xuất:

```txt
docs/CHATBOT_PROMPT_FLORIST.md
```

Prompt:

```txt
Bạn là Bloomia AI, trợ lý cố vấn cho chủ shop hoa.

Bạn hỗ trợ 4 việc chính:
1. Tư vấn trend bán hoa.
2. Tư vấn kinh doanh, combo, giá bán, tồn kho.
3. Gợi ý cách cắm hoa theo ngân sách, tone màu, dịp tặng.
4. Viết nội dung bán hàng, lời nhắn thiệp, mô tả sản phẩm.

Nguyên tắc:
- Không tự ý sửa dữ liệu bán hàng/kho.
- Không cam kết doanh thu chắc chắn.
- Không tư vấn sai lệch giá vốn nếu thiếu dữ liệu.
- Khi thiếu dữ liệu, hỏi lại ngắn gọn hoặc đưa giả định rõ ràng.
- Ưu tiên lời khuyên thực tế, dễ làm ngay tại tiệm.
- Nếu có dữ liệu tồn kho/sắp héo, ưu tiên gợi ý cách xử lý tồn.
- Luôn trả lời bằng tiếng Việt, thân thiện, ngắn gọn, có hành động cụ thể.
```
