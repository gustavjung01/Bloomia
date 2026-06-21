import { SoftCard } from '../../components/ui';

const checks = [
  ['Cấu hình còn sau khi mở lại', 'Lưu máy in/ngân hàng, đóng app, mở lại và kiểm tra dữ liệu không mất.'],
  ['Tiền mặt', 'Kiểm tra tổng, chiết khấu %, khách đưa và tiền thừa.'],
  ['Chuyển khoản', 'Quét QR, đối chiếu số tiền/nội dung rồi xác nhận thủ công.'],
  ['Công nợ', 'Thu trước một phần và kiểm tra số còn nợ trên hóa đơn.'],
  ['Bán vượt tồn', 'Cảnh báo xuất hiện nhưng hóa đơn vẫn được lưu.'],
  ['Hóa đơn cũ', 'Đổi tài khoản ngân hàng rồi mở lại hóa đơn cũ; snapshot phải giữ nguyên.'],
  ['Khổ giấy', 'In thử lần lượt 58 mm, 80 mm và A4 trên thiết bị thực tế.'],
  ['Backup trước phát hành', 'Tạo backup DB và mở lại app trước khi build installer.'],
];

export function P0AcceptanceChecklist() {
  return (
    <SoftCard className="span-12" title="Checklist nghiệm thu P0" description="Chạy một lần trên máy bán hàng thật trước khi đóng gói installer.">
      <div className="acceptance-grid">
        {checks.map(([title, detail]) => (
          <div className="acceptance-item" key={title}>
            <span>□</span>
            <div><strong>{title}</strong><p>{detail}</p></div>
          </div>
        ))}
      </div>
    </SoftCard>
  );
}
