# Bloomia AI Per-Tab Popup & Data Store Plan

## 1. Mục tiêu

Bloomia AI không chỉ là một chatbot chung toàn app. Mỗi tab/module chính của Bloomia cần có AI riêng theo ngữ cảnh nghiệp vụ.

Khi chủ shop đang ở tab nào, bấm **AI tư vấn** trong tab đó thì Bloomia sẽ mở một popup riêng cho tab đó, hiển thị các card nhỏ, sinh động, dễ chọn.

Ví dụ:

- Đang ở tab **Bán hàng** → AI tư vấn giá bán, combo, upsell, nội dung thiệp.
- Đang ở tab **Kho** → AI tư vấn hoa sắp héo, xử lý tồn, nhập hàng ngày mai.
- Đang ở tab **Đơn hoa** → AI tư vấn cách cắm, lộ trình giao, ưu tiên đơn gấp.
- Đang ở tab **Báo cáo** → AI tư vấn tình hình kinh doanh, nguyên nhân lời/lỗ.
- Đang ở tab **Sản phẩm mẫu/Công thức** → AI tư vấn phối hoa, công thức, thay thế nguyên liệu.

## 2. Nguyên tắc UX

Không dùng một chatbox trống bắt chủ shop tự nghĩ câu hỏi.

AI popup phải mở ra với các card gợi ý sẵn:

- Card nhỏ.
- Bo góc mềm.
- Có icon/illustration nhỏ.
- Có màu theo nhóm nghiệp vụ.
- Có mô tả ngắn.
- Bấm vào là AI bắt đầu tư vấn theo đúng mục đó.

Ví dụ card:

```txt
🌸 Đẩy hoa sắp héo
Tìm hoa cần bán nhanh hôm nay và gợi ý combo xử lý tồn.

[Chọn]
```

## 3. Kiến trúc mỗi tab có data store riêng

Mỗi tab/module có một **AI data store/context store** riêng. Store này chịu trách nhiệm lấy dữ liệu đúng nghiệp vụ và tạo context ngắn, sạch cho AI.

```txt
Tab UI
  -> AI tư vấn button
  -> AI popup theo tab
  -> Tab AI cards
  -> Tab AI data store
  -> aiContextService
  -> AI provider / local mock / web service
```

Không nên gửi toàn bộ database cho AI. Mỗi tab chỉ gửi context cần thiết.

## 4. Data store đề xuất theo tab

### 4.1. Sales AI Store — tab Bán hàng

Dữ liệu cần đọc:

- Giỏ hàng hiện tại.
- Khách hàng hiện tại nếu có.
- Sản phẩm đang chọn.
- Dịch vụ đã thêm.
- Giá vốn dự kiến.
- Tồn kho liên quan.
- Lịch sử mua của khách nếu có.

Card gợi ý:

- Tính giá bán để lời 40%.
- Gợi ý upsell thêm thiệp/giao hàng/gói quà.
- Gợi ý combo theo ngân sách khách.
- Viết lời nhắn thiệp.
- Gợi ý thay hoa nếu hết hàng.

Payload mẫu:

```json
{
  "tab": "sales",
  "cart": [
    {
      "name": "Bó Hồng Romance",
      "quantity": 1,
      "sale_price": 1250000,
      "estimated_cost": 720000
    }
  ],
  "customer_budget": 1500000,
  "selected_services": ["Phí giao hàng", "Thiệp"],
  "inventory_related": [
    {
      "item_name": "Hoa hồng pastel",
      "available": 35,
      "unit": "cành",
      "latest_unit_cost": 10000
    }
  ]
}
```

### 4.2. Order AI Store — tab Đơn hoa

Dữ liệu cần đọc:

- Đơn đang mở.
- Ngày giờ giao.
- Địa chỉ.
- Tone màu.
- Ngân sách.
- Lời nhắn thiệp.
- Ảnh mẫu metadata nếu có.
- Trạng thái đơn.
- Danh sách đơn trong ngày.

Card gợi ý:

- Gợi ý cách cắm theo tone/ngân sách.
- Kiểm tra đơn gấp cần ưu tiên.
- Viết lời nhắn thiệp hay hơn.
- Tạo checklist chuẩn bị đơn.
- Gợi ý phiếu giao hàng ngắn gọn.

### 4.3. Inventory AI Store — tab Kho

Dữ liệu cần đọc:

- Tồn kho hiện tại.
- Tồn theo lô.
- Ngày nhập.
- Ngày dự kiến héo.
- Giá nhập gần nhất.
- Hàng bán chậm.
- Hàng hủy/hao hụt.

Card gợi ý:

- Hoa nào cần xử lý hôm nay?
- Gợi ý combo xả tồn đẹp.
- Nên nhập gì ngày mai?
- Hoa nào hao hụt nhiều?
- Định giá lại theo giá nhập mới.

Payload mẫu:

```json
{
  "tab": "inventory",
  "inventory_alerts": [
    {
      "item_name": "Hoa hồng pastel",
      "quantity": 35,
      "unit": "cành",
      "days_left": 1,
      "latest_unit_cost": 10000
    }
  ],
  "slow_moving_items": [
    {
      "item_name": "Tulip tím",
      "quantity": 12,
      "days_in_stock": 3
    }
  ],
  "waste_recent": [
    {
      "item_name": "Baby trắng",
      "quantity": 2,
      "unit": "bó",
      "reason": "héo"
    }
  ]
}
```

### 4.4. Purchase AI Store — tab Nhập hàng

Dữ liệu cần đọc:

- Lịch sử nhập gần đây.
- Giá nhập theo nhà cung cấp.
- Tốc độ bán của từng loại hoa.
- Tồn hiện tại.
- Hoa hao hụt cao.
- Dịp/lịch sắp tới nếu có.

Card gợi ý:

- Gợi ý số lượng nhập ngày mai.
- So sánh giá nhà cung cấp.
- Cảnh báo nhập quá nhiều.
- Tính giá bán mới theo giá nhập.
- Gợi ý hoa thay thế khi giá tăng.

### 4.5. Report AI Store — tab Báo cáo

Dữ liệu cần đọc:

- Doanh thu.
- Lợi nhuận tạm tính.
- Giá vốn.
- Hoa hủy.
- Top sản phẩm.
- Phương thức thanh toán.
- Số đơn theo ngày.
- Giá trị đơn trung bình.

Card gợi ý:

- Hôm nay kinh doanh ổn không?
- Vì sao lợi nhuận giảm?
- Mẫu nào nên đẩy mạnh?
- Mẫu nào nên bỏ?
- Tóm tắt cuối ngày cho chủ shop.

### 4.6. Recipe AI Store — tab Công thức/Mẫu hoa

Dữ liệu cần đọc:

- Mẫu hoa đang mở.
- Nguyên liệu trong công thức.
- Giá vốn dự kiến.
- Giá bán gợi ý.
- Tồn kho liên quan.
- Tone màu.
- Dịp tặng.

Card gợi ý:

- Tối ưu công thức để lời hơn.
- Thay nguyên liệu đang đắt.
- Gợi ý phối màu đẹp hơn.
- Tạo 3 phiên bản size S/M/L.
- Viết mô tả sản phẩm.

### 4.7. Customer AI Store — tab Khách hàng

Dữ liệu cần đọc:

- Hồ sơ khách.
- Lịch sử mua.
- Dịp từng đặt.
- Ngân sách quen thuộc.
- Tone màu hay chọn.
- Ngày kỷ niệm nếu có.

Card gợi ý:

- Gợi ý chăm sóc khách cũ.
- Viết tin nhắn nhắc dịp kỷ niệm.
- Gợi ý mẫu hợp khách này.
- Tóm tắt lịch sử mua.

## 5. Component UX đề xuất

### 5.1. AI button trong từng tab

Mỗi tab có nút:

```txt
AI tư vấn
```

Vị trí:

- Góc phải header của tab.
- Hoặc trong action bar cạnh filter/search.

Button style:

- Pill shape.
- Icon sparkle/flower.
- Màu blush/lavender nhẹ.
- Hover có glow nhẹ.

### 5.2. AI popup theo tab

Tên component:

```txt
TabAIPopup
```

Props:

```ts
interface TabAIPopupProps {
  tab: 'sales' | 'orders' | 'inventory' | 'purchase' | 'reports' | 'recipes' | 'customers';
  entityId?: string;
  initialContext?: Record<string, unknown>;
  onAction?: (action: AISuggestionAction) => void;
}
```

Layout:

```txt
┌──────────────────────────────┐
│ Bloomia AI                   │
│ Đang tư vấn cho: Kho          │
├──────────────────────────────┤
│ [Card] [Card]                │
│ [Card] [Card]                │
├──────────────────────────────┤
│ Kết quả tư vấn / chat        │
├──────────────────────────────┤
│ Nhập câu hỏi khác...   Gửi   │
└──────────────────────────────┘
```

### 5.3. AI advice card

Tên component:

```txt
AIAdviceCard
```

Props:

```ts
interface AIAdviceCardProps {
  id: string;
  title: string;
  description: string;
  icon: string;
  intent: string;
  accent: 'pink' | 'sage' | 'lavender' | 'peach' | 'gold';
}
```

Card không được quá to. Ưu tiên 2 cột trong popup desktop.

## 6. Intent registry

Mỗi card tương ứng một intent rõ ràng.

Ví dụ:

```ts
const inventoryAIIntents = [
  {
    id: 'push_expiring_flowers',
    title: 'Đẩy hoa sắp héo',
    description: 'Tìm hoa cần bán nhanh và gợi ý combo xử lý tồn.',
    requiredContext: ['inventory_alerts', 'latest_unit_cost', 'sales_velocity'],
  },
  {
    id: 'suggest_tomorrow_purchase',
    title: 'Gợi ý nhập ngày mai',
    description: 'Dựa trên tồn kho, tốc độ bán và hao hụt để đề xuất nhập hàng.',
    requiredContext: ['current_stock', 'sales_velocity', 'waste_recent'],
  },
];
```

## 7. Data store interface

Mỗi tab implement chung interface:

```ts
interface TabAIDataStore<TContext> {
  tab: string;
  getContext(input: {
    entityId?: string;
    intentId?: string;
  }): Promise<TContext>;
  getCards(input?: {
    entityId?: string;
  }): Promise<AIAdviceCardConfig[]>;
}
```

Ví dụ:

```ts
class InventoryAIStore implements TabAIDataStore<InventoryAIContext> {
  tab = 'inventory';

  async getContext({ intentId }: { intentId?: string }) {
    return {
      inventory_alerts: await inventoryService.getExpiringItems(),
      slow_moving_items: await inventoryService.getSlowMovingItems(),
      waste_recent: await inventoryService.getRecentWaste(),
    };
  }

  async getCards() {
    return inventoryAIIntents;
  }
}
```

## 8. Luồng click card

```txt
1. Chủ shop đang ở tab Kho.
2. Bấm AI tư vấn.
3. App mở TabAIPopup(tab='inventory').
4. Popup gọi InventoryAIStore.getCards().
5. Hiện các card nhỏ.
6. Chủ shop chọn “Đẩy hoa sắp héo”.
7. Popup gọi InventoryAIStore.getContext(intentId='push_expiring_flowers').
8. Gửi context + intent sang AI.
9. AI trả kết quả.
10. Popup hiển thị suggestion card + action.
```

## 9. Action sau tư vấn

AI có thể trả action dạng draft, không tự thực thi.

Ví dụ action:

```txt
create_combo_draft
create_caption_draft
create_order_note_draft
create_purchase_suggestion
create_discount_suggestion
create_recipe_variant
```

Chủ shop phải bấm xác nhận mới tạo dữ liệu thật.

## 10. Lưu lịch sử theo tab

Cần lưu tab và entity liên quan để sau này mở lại đúng ngữ cảnh.

Bảng local đề xuất:

```txt
ai_tab_sessions
ai_tab_messages
ai_tab_suggestions
```

### ai_tab_sessions

```txt
id
tab
entity_id
intent_id
title
status
created_at
updated_at
```

### ai_tab_messages

```txt
id
session_id
role
message
context_snapshot_json
created_at
```

### ai_tab_suggestions

```txt
id
session_id
suggestion_type
title
content
action_type
action_payload_json
status
created_at
```

## 11. Quy tắc quan trọng

- Mỗi tab có data store riêng.
- Popup chỉ lấy context đúng tab, không lấy toàn bộ app.
- Card phải là lựa chọn trực quan, không bắt người dùng tự prompt.
- AI chỉ tạo draft action, không tự ghi dữ liệu thật.
- Lịch sử AI cần lưu theo tab/entity để kiểm tra lại.
- UI phải mềm, sống động, đúng chất Bloomia.

## 12. Thứ tự triển khai

```txt
1. Tạo TabAIPopup component.
2. Tạo AIAdviceCard component.
3. Tạo intent registry cho từng tab.
4. Tạo TabAIDataStore interface.
5. Implement mock store cho Sales/Inventory/Reports.
6. Kết nối popup với mock AI response.
7. Implement context thật từ local DB.
8. Lưu ai_tab_sessions/messages/suggestions.
9. Kết nối AI provider/web service.
10. Thêm action draft sau tư vấn.
```

## 13. Scope MVP cho AI theo tab

Làm trước 3 tab:

1. **Bán hàng**
   - Tính giá bán/margin.
   - Gợi ý upsell.
   - Viết lời nhắn thiệp.

2. **Kho**
   - Hoa sắp héo.
   - Combo xử lý tồn.
   - Gợi ý nhập ngày mai.

3. **Báo cáo**
   - Tóm tắt cuối ngày.
   - Vì sao lợi nhuận giảm.
   - Mẫu nên đẩy mạnh.

Các tab còn lại làm sau khi core AI ổn.
