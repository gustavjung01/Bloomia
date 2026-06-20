import type { RouteKey } from '../../app/routes';
import type { AssistantCard } from './types';

const cards: Record<RouteKey, AssistantCard[]> = {
  dashboard: [
    { id: 'daily_health', title: 'Sức khỏe hôm nay', description: 'Đọc nhanh doanh thu, đơn mở và giao hàng.', tone: 'pink', intentId: 'daily_health' },
    { id: 'watchlist', title: 'Việc cần chú ý', description: 'Gợi ý việc nên xử lý trước.', tone: 'lavender', intentId: 'watchlist' },
  ],
  sales: [
    { id: 'upsell', title: 'Bán thêm', description: 'Gợi ý upsell tại quầy.', tone: 'sage', intentId: 'upsell' },
    { id: 'price_check', title: 'Kiểm tra giá', description: 'Nhắc phí giao, thiệp, công cắm.', tone: 'peach', intentId: 'price_check' },
  ],
  flowerOrders: [
    { id: 'delivery', title: 'Ưu tiên giao', description: 'Xếp đơn theo lịch và trạng thái.', tone: 'lavender', intentId: 'delivery' },
    { id: 'message', title: 'Tin nhắn khách', description: 'Soạn tin xác nhận/giao hàng.', tone: 'pink', intentId: 'message' },
  ],
  inventory: [
    { id: 'push_stock', title: 'Đẩy hoa tồn', description: 'Tìm hoa cần bán nhanh.', tone: 'peach', intentId: 'push_stock' },
    { id: 'waste', title: 'Hao hụt', description: 'Đọc movement hao hụt gần đây.', tone: 'sage', intentId: 'waste' },
  ],
  purchase: [
    { id: 'buy_list', title: 'Gợi ý nhập', description: 'Xem tồn thấp để nhập thêm.', tone: 'sage', intentId: 'buy_list' },
    { id: 'supplier_text', title: 'Tin hỏi NCC', description: 'Soạn tin hỏi giá/đặt hàng.', tone: 'lavender', intentId: 'supplier_text' },
  ],
  recipes: [
    { id: 'margin', title: 'Biên lợi nhuận', description: 'Rà giá bán gợi ý và vốn tạm.', tone: 'pink', intentId: 'margin' },
    { id: 'caption', title: 'Caption mẫu hoa', description: 'Viết mô tả bán hàng ngắn.', tone: 'lavender', intentId: 'caption' },
  ],
  customers: [
    { id: 'care_text', title: 'Chăm khách', description: 'Soạn tin cảm ơn sau mua.', tone: 'pink', intentId: 'care_text' },
  ],
  reports: [
    { id: 'sales_insight', title: 'Insight doanh thu', description: 'Đọc doanh thu và lời tạm.', tone: 'sage', intentId: 'sales_insight' },
    { id: 'loss_insight', title: 'Hao hụt', description: 'Đọc hao hụt và tồn kho.', tone: 'peach', intentId: 'loss_insight' },
  ],
  settings: [
    { id: 'setup_check', title: 'Kiểm tra setup', description: 'Nhắc dữ liệu nền cần đủ.', tone: 'lavender', intentId: 'setup_check' },
  ],
};

export function getAssistantCards(tabKey: RouteKey) {
  return cards[tabKey] ?? cards.dashboard;
}
