import { Button } from '../../components/ui';
import { P0AcceptanceChecklist } from './P0AcceptanceChecklist';
import { P0ReadinessPanel } from './P0ReadinessPanel';
import { PrinterDiagnosticsPanel } from './PrinterDiagnosticsPanel';
import { SystemPage } from './SystemPage';

export function SystemPageP1() {
  return (
    <>
      <div className="page-title-row">
        <div>
          <span className="eyebrow">Hệ thống</span>
          <h2>Kiểm tra phát hành & thiết bị</h2>
          <p className="setup-muted">Audit P0, máy in, VietQR, database, backup và media local.</p>
        </div>
        <Button variant="soft" onClick={() => window.location.reload()}>Tải lại trạng thái</Button>
      </div>

      <div className="page-grid system-diagnostics-grid">
        <P0ReadinessPanel />
        <PrinterDiagnosticsPanel />
        <P0AcceptanceChecklist />
      </div>

      <div className="legacy-system-section">
        <SystemPage />
      </div>
    </>
  );
}
