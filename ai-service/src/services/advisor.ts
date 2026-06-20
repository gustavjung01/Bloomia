import type { FloristChatRequest, FloristChatResponse } from '../types.js';

export function advise(input: FloristChatRequest): FloristChatResponse {
  const answer = answerFor(input.tabKey);
  return {
    answer,
    source: 'local',
    suggestions: [
      { title: 'Gợi ý nhanh', body: answer },
      { title: 'Bước tiếp theo', body: nextFor(input.tabKey) },
    ],
  };
}

function answerFor(tab: string) {
  if (tab === 'sales') return 'Kiểm tra phí giao, thiệp, công cắm và tồn hoa chính trước khi chốt hóa đơn.';
  if (tab === 'inventory') return 'Ưu tiên xử lý hoa có ngày héo gần, tồn còn nhiều hoặc vừa phát sinh hao hụt.';
  if (tab === 'flowerOrders') return 'Xếp đơn theo giờ giao gần nhất, sau đó theo trạng thái mới nhận hoặc đã xác nhận.';
  if (tab === 'purchase') return 'Nhìn tồn thấp và đơn đặt trước để nhập vừa đủ, tránh ôm hoa nhanh héo.';
  if (tab === 'reports') return 'So doanh thu, lời tạm và hao hụt để tìm ngày bán tốt và loại hoa mất nhiều vốn.';
  if (tab === 'recipes') return 'Rà công thức có giá bán gợi ý thấp so với vốn tạm, rồi chỉnh giá hoặc thành phần.';
  if (tab === 'customers') return 'Gửi tin cảm ơn sau mua và lưu tone màu khách thích cho lần đặt sau.';
  if (tab === 'settings') return 'Kiểm tra đơn vị tính, nhóm hàng, nhà cung cấp, giá bán gợi ý và theo dõi tồn.';
  return 'Ưu tiên việc ảnh hưởng doanh thu, tồn kho và giao hàng hôm nay.';
}

function nextFor(tab: string) {
  if (tab === 'inventory') return 'Mở Kho, xem lô gần héo và tạo kế hoạch đẩy hàng.';
  if (tab === 'flowerOrders') return 'Cập nhật trạng thái đơn giao hôm nay.';
  if (tab === 'purchase') return 'Hỏi giá nhà cung cấp cho các món tồn thấp.';
  return 'Mở báo cáo ngày và xử lý điểm lệch lớn nhất.';
}
