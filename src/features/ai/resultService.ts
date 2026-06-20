import type { RouteKey } from '../../app/routes';
import { formatCurrency } from '../../utils/format';
import type { AssistantResult } from './types';

export function buildAssistantResult(tabKey: RouteKey, intentId: string, contextText: string): AssistantResult {
  const data = safeParse(contextText);

  if (tabKey === 'dashboard') {
    const summary = data.summary ?? {};
    return {
      title: intentId === 'watchlist' ? 'Việc nên xử lý trước' : 'Sức khỏe hôm nay',
      body: `Doanh thu hôm nay ${formatCurrency(summary.todayRevenue ?? 0)}, ${summary.todayOrders ?? 0} hóa đơn, ${summary.openFlowerOrders ?? 0} đơn hoa đang mở, ${summary.deliveryToday ?? 0} đơn cần giao.`,
    };
  }

  if (tabKey === 'sales') return { title: 'Gợi ý bán tại quầy', body: 'Kiểm tra phí giao, thiệp, công cắm và gợi ý nâng size nếu khách có ngân sách cao. Với đơn theo mẫu, dùng Mẫu hoa rồi sửa thành phần.' };
  if (tabKey === 'flowerOrders') return { title: 'Ưu tiên đơn hoa', body: `Có ${(data.today ?? []).length} đơn cần giao hôm nay. Ưu tiên đơn gần giờ giao, sau đó đơn đang ở trạng thái mới/xác nhận.` };
  if (tabKey === 'inventory') return { title: 'Gợi ý xử lý kho', body: `Đang theo dõi ${(data.inventory ?? []).length} mặt hàng tồn kho. Ưu tiên đẩy hàng có ngày héo gần và tồn còn nhiều.` };
  if (tabKey === 'purchase') return { title: 'Gợi ý nhập hàng', body: 'Xem các mặt hàng tồn thấp, rồi hỏi nhà cung cấp giá hôm nay trước khi nhập lô mới.' };
  if (tabKey === 'recipes') return { title: 'Tối ưu mẫu hoa', body: `Đang có ${(data.recipes ?? []).length} mẫu hoa. Rà mẫu có giá bán thấp so với vốn tạm để tránh lời mỏng.` };
  if (tabKey === 'reports') return { title: 'Insight báo cáo', body: `Báo cáo có ${(data.sales ?? []).length} dòng doanh thu và ${(data.waste ?? []).length} dòng hao hụt. So ngày bán cao với tồn để chuẩn bị nhập hợp lý.` };
  if (tabKey === 'settings') return { title: 'Checklist setup', body: `Có ${(data.items ?? []).length} item/dịch vụ và ${(data.suppliers ?? []).length} nhà cung cấp. Kiểm tra giá bán, đơn vị tính và theo dõi tồn.` };
  if (tabKey === 'system') return { title: 'Checklist release', body: 'Kiểm tra DB local đã tồn tại, tạo backup trước khi update, và chỉ dùng upload ảnh qua media local thay vì dán đường dẫn.' };

  return { title: 'Gợi ý chăm khách', body: 'Sau khi khách mua, gửi lời cảm ơn ngắn và nhắc shop có thể tùy chỉnh tone/giờ giao cho lần sau.', actionLabel: 'Copy gợi ý', actionText: 'Bloomia cảm ơn mình đã đặt hoa ạ. Khi cần đổi tone hoặc đặt trước dịp sau, cứ nhắn shop nhé.' };
}

function safeParse(text: string) {
  try { return JSON.parse(text); } catch { return {}; }
}
