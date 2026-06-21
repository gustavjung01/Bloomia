import { useState } from 'react';

import { Badge, Button, Dialog } from '../../components/ui';
import { P0AcceptanceChecklist } from './P0AcceptanceChecklist';
import { P0ReadinessPanel } from './P0ReadinessPanel';
import { PrinterDiagnosticsPanel } from './PrinterDiagnosticsPanel';
import { SystemPage } from './SystemPage';

type SystemPanel = 'readiness' | 'printer' | 'acceptance' | 'runtime' | null;

const panels = [
  {
    id: 'readiness' as const,
    eyebrow: 'P0 audit',
    title: 'Sẵn sàng phát hành',
    description: 'Migration, SQLite, VietQR, payment snapshot và các lỗi đang chặn phát hành.',
    meta: 'Kiểm tra tự động',
    tone: 'sage' as const,
  },
  {
    id: 'printer' as const,
    eyebrow: 'Thiết bị',
    title: 'Máy in & thanh toán',
    description: 'Máy in đang chọn, khổ giấy, lần test gần nhất và trạng thái cấu hình QR.',
    meta: 'Thiết bị tại quầy',
    tone: 'lavender' as const,
  },
  {
    id: 'acceptance' as const,
    eyebrow: 'Nghiệm thu',
    title: 'Checklist P0',
    description: 'Các ca kiểm thử thật trước khi đóng gói và bàn giao cho cửa hàng.',
    meta: '8 bước thực tế',
    tone: 'pink' as const,
  },
  {
    id: 'runtime' as const,
    eyebrow: 'Dữ liệu',
    title: 'Runtime, backup & media',
    description: 'Database, restore, AppData, AI runtime và ảnh sản phẩm local.',
    meta: 'Cấu hình nâng cao',
    tone: 'peach' as const,
  },
];

export function SystemPageP1() {
  const [activePanel, setActivePanel] = useState<SystemPanel>(null);

  return (
    <>
      <div className="page-title-row system-page-heading">
        <div>
          <span className="eyebrow">Hệ thống</span>
          <h2>Trung tâm kiểm tra & cấu hình</h2>
          <p className="setup-muted">Chọn một khu vực để xem trạng thái hoặc mở cấu hình chi tiết.</p>
        </div>
        <Button variant="soft" onClick={() => window.location.reload()}>Tải lại trạng thái</Button>
      </div>

      <div className="system-preview-grid">
        {panels.map((panel) => (
          <button className="system-preview-card" type="button" key={panel.id} onClick={() => setActivePanel(panel.id)}>
            <div className="system-preview-topline">
              <span className="system-preview-eyebrow">{panel.eyebrow}</span>
              <Badge tone={panel.tone}>{panel.meta}</Badge>
            </div>
            <div className="system-preview-copy">
              <h3>{panel.title}</h3>
              <p>{panel.description}</p>
            </div>
            <div className="system-preview-action">
              <span>Mở chi tiết</span>
              <strong>→</strong>
            </div>
          </button>
        ))}
      </div>

      <Dialog open={activePanel === 'readiness'} title="Sẵn sàng phát hành" onClose={() => setActivePanel(null)}>
        <div className="system-modal-content"><P0ReadinessPanel /></div>
      </Dialog>

      <Dialog open={activePanel === 'printer'} title="Máy in & thanh toán" onClose={() => setActivePanel(null)}>
        <div className="system-modal-content"><PrinterDiagnosticsPanel /></div>
      </Dialog>

      <Dialog open={activePanel === 'acceptance'} title="Checklist nghiệm thu P0" onClose={() => setActivePanel(null)}>
        <div className="system-modal-content"><P0AcceptanceChecklist /></div>
      </Dialog>

      <Dialog open={activePanel === 'runtime'} title="Runtime, backup & media" onClose={() => setActivePanel(null)}>
        <div className="system-modal-content system-runtime-modal"><SystemPage /></div>
      </Dialog>
    </>
  );
}
