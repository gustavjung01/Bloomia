import { Badge, Button, Dialog, PillTabs, SelectField, SoftCard, TextArea, TextField } from '../../components/ui';
import type { PaymentMethod, SaleRecord } from '../../db/repositories/salesRepository';
import { lineTotal } from '../../services/pos/cart';
import { formatCurrency } from '../../utils/format';
import { useSaleLifecyclePos } from './useSaleLifecyclePos';

const posViews = [
  { label: 'Bán hàng', value: 'sale' },
  { label: 'Hóa đơn', value: 'invoices' },
] as const;

const catalogViews = [
  { label: 'Sản phẩm & dịch vụ', value: 'items' },
  { label: 'Mẫu hoa', value: 'recipes' },
] as const;

const paymentOptions = [
  { label: 'Tiền mặt', value: 'cash' },
  { label: 'Chuyển khoản', value: 'bank_transfer' },
  { label: 'Thẻ', value: 'card' },
  { label: 'Công nợ', value: 'debt' },
];

export function POSPageLifecycle() {
  const pos = useSaleLifecyclePos();

  return (
    <>
      <div className="page-title-row pos-page-heading">
        <div>
          <span className="eyebrow">POS</span>
          <h2>{pos.view === 'sale' ? 'Bán hàng tại quầy' : 'Quản lý hóa đơn'}</h2>
          <p className="setup-muted">
            {pos.view === 'sale'
              ? 'Chuyển khoản: in phiếu thanh toán trước, xác nhận tiền sau, rồi chốt và in hóa đơn.'
              : 'Đơn chờ thanh toán có thể sửa/hủy; hóa đơn đã chốt được điều chỉnh bằng cách hủy và tạo đơn thay thế.'}
          </p>
        </div>
        <PillTabs value={pos.view} onChange={pos.setView} options={[...posViews]} />
      </div>

      {(pos.status || pos.error) && (
        <div className="setup-status-row">
          {pos.status && <Badge tone="sage">{pos.status}</Badge>}
          {pos.error && <Badge tone="peach">{pos.error}</Badge>}
        </div>
      )}

      {pos.view === 'sale' ? (
        <div className="pos-standard-layout">
          <SoftCard className="pos-standard-catalog" title="Danh mục bán" description="Bấm sản phẩm để thêm; bấm lại để tăng số lượng.">
            <div className="pos-catalog-toolbar">
              <PillTabs value={pos.catalogView} onChange={pos.setCatalogView} options={[...catalogViews]} />
              <TextField value={pos.catalogQuery} placeholder="Tìm tên, SKU hoặc nhóm hàng..." onChange={(event) => pos.setCatalogQuery(event.target.value)} />
            </div>

            {pos.catalogView === 'items' ? (
              <div className="pos-product-grid">
                {pos.visibleItems.length === 0 && <p className="setup-muted">Không tìm thấy sản phẩm phù hợp.</p>}
                {pos.visibleItems.map((item) => (
                  <button key={item.id} type="button" className="pos-product-card" onClick={() => pos.addItem(item)}>
                    {pos.itemPhotoUrls[item.id]
                      ? <img className="pos-product-image" src={pos.itemPhotoUrls[item.id]} alt={item.name} />
                      : <div className="pos-product-image pos-product-image-placeholder">✦</div>}
                    <Badge tone={item.item_type === 'service' ? 'sage' : 'lavender'}>{item.item_type === 'service' ? 'Dịch vụ' : item.category_name ?? 'Sản phẩm'}</Badge>
                    <strong>{item.name}</strong>
                    <span>{formatCurrency(item.default_sale_price)}</span>
                  </button>
                ))}
              </div>
            ) : (
              <div className="pos-product-grid">
                {pos.visibleRecipes.length === 0 && <p className="setup-muted">Chưa có mẫu hoa phù hợp.</p>}
                {pos.visibleRecipes.map((recipe) => (
                  <button key={recipe.id} type="button" className="pos-product-card pos-recipe-card" onClick={() => pos.addRecipe(recipe)}>
                    <Badge tone="pink">{recipe.size_label ?? 'Mẫu hoa'}</Badge>
                    <strong>{recipe.name}</strong>
                    <span>{recipe.color_tone ?? 'Chưa chọn tone'}</span>
                    <span>{formatCurrency(recipe.suggested_sale_price)}</span>
                  </button>
                ))}
              </div>
            )}

            <div className="pos-custom-line">
              <div><strong>Dòng bán tùy chỉnh</strong><span>Dùng cho bó hoa theo ngân sách riêng.</span></div>
              <TextField value={pos.customName} onChange={(event) => pos.setCustomName(event.target.value)} />
              <TextField type="number" min={0} value={pos.customPrice} onChange={(event) => pos.setCustomPrice(event.target.value)} />
              <Button variant="soft" onClick={pos.addCustom}>Thêm</Button>
            </div>
          </SoftCard>

          <aside className="pos-checkout-column">
            {pos.completedSale ? (
              <SoftCard className="pos-completed-panel" title={pos.completedSale.sale.sale_status === 'cancelled' ? 'Hóa đơn đã hủy' : 'Đã chốt thanh toán'} description="Kho và báo cáo chỉ cập nhật khi hóa đơn được chốt.">
                <div className="pos-success-mark">{pos.completedSale.sale.sale_status === 'cancelled' ? '×' : '✓'}</div>
                <strong className="pos-completed-code">{pos.completedSale.sale.invoice_code}</strong>
                <div className="pos-completed-summary">
                  <div><span>Khách hàng</span><strong>{pos.completedSale.sale.customer_name ?? 'Khách lẻ'}</strong></div>
                  <div><span>Tổng tiền</span><strong>{formatCurrency(pos.completedSale.sale.total)}</strong></div>
                  <div><span>Trạng thái</span><strong>{saleStatusLabel(pos.completedSale.sale)}</strong></div>
                </div>
                <div className="pos-completed-actions">
                  <Button variant="soft" onClick={() => pos.previewDocument(pos.completedSale!)}>Xem hóa đơn</Button>
                  {pos.completedSale.sale.sale_status !== 'cancelled' && <Button onClick={() => pos.printDocument(pos.completedSale!)}>In hóa đơn</Button>}
                  {pos.completedSale.sale.sale_status === 'completed' && <Button variant="ghost" onClick={() => pos.editSaleById(pos.completedSale!.sale.id)}>Sửa bằng đơn thay thế</Button>}
                  {pos.completedSale.sale.sale_status !== 'cancelled' && <Button variant="ghost" onClick={() => pos.cancelSaleById(pos.completedSale!.sale.id)}>Hủy hóa đơn</Button>}
                  <Button variant="ghost" onClick={pos.newSale}>Đơn mới</Button>
                </div>
              </SoftCard>
            ) : pos.pendingSale ? (
              <SoftCard className="pos-checkout-panel pos-pending-panel" title="Đơn chờ thanh toán" description="Chưa trừ kho và chưa ghi nhận doanh thu.">
                <div className="pos-lifecycle-banner">
                  <Badge tone="peach">CHƯA THANH TOÁN</Badge>
                  <strong>{pos.pendingSale.sale.invoice_code}</strong>
                  <span>{formatCurrency(pos.pendingSale.sale.total)}</span>
                </div>
                {pos.pendingSale.payments[0]?.qr_image_url && (
                  <div className="pos-bank-transfer-card">
                    <img src={pos.pendingSale.payments[0].qr_image_url ?? ''} alt="Mã chuyển khoản" />
                    <div className="pos-bank-transfer-meta">
                      <strong>{pos.pendingSale.payments[0].account_name}</strong>
                      <span>{pos.pendingSale.payments[0].bank_name || pos.pendingSale.payments[0].bank_code} • {pos.pendingSale.payments[0].account_number}</span>
                      <span>{formatCurrency(pos.pendingSale.sale.total)} • {pos.pendingSale.payments[0].transfer_reference}</span>
                    </div>
                  </div>
                )}
                {pos.paymentMethod === 'bank_transfer' && (
                  <label className="setup-checkbox pos-transfer-confirm">
                    <input type="checkbox" checked={pos.transferConfirmed} onChange={(event) => pos.setTransferConfirmed(event.target.checked)} />
                    Đã kiểm tra tài khoản và nhận đúng chuyển khoản
                  </label>
                )}
                {pos.checkoutFeedback && <div className="pos-checkout-feedback">{pos.checkoutFeedback}</div>}
                <div className="pos-pending-actions">
                  <Button variant="soft" onClick={() => pos.printDocument(pos.pendingSale!)}>In lại phiếu thanh toán</Button>
                  <Button variant="ghost" onClick={pos.editPending}>Sửa đơn</Button>
                  <Button variant="ghost" onClick={() => pos.cancelSaleById(pos.pendingSale!.sale.id)}>Hủy đơn</Button>
                  <Button className="pos-primary-checkout" onClick={pos.finalizeCurrentPayment} disabled={pos.saving}>
                    {pos.saving ? 'ĐANG CHỐT...' : pos.paymentMethod === 'bank_transfer' ? 'XÁC NHẬN ĐÃ NHẬN TIỀN & IN HÓA ĐƠN' : 'XÁC NHẬN THANH TOÁN & CHỐT'}
                  </Button>
                </div>
              </SoftCard>
            ) : (
              <SoftCard className="pos-checkout-panel" title="Đơn đang soạn" description={`${pos.cart.length} dòng • ${pos.cartQuantity} sản phẩm`}>
                <div className="pos-checkout-body">
                  <div className="pos-order-lines">
                    {pos.cart.length === 0 && <div className="pos-empty-cart"><span>Chưa có sản phẩm</span><p>Chọn sản phẩm ở cột bên trái.</p></div>}
                    {pos.cart.map((line) => (
                      <div className="pos-order-line" key={line.id}>
                        <div className="pos-order-line-name"><strong>{line.itemName}</strong><span>{formatCurrency(lineTotal(line))}</span></div>
                        <TextField label="SL" type="number" min={0.01} step={0.01} value={line.quantity} onChange={(event) => pos.updateLine(line.id, { quantity: Number(event.target.value) })} />
                        <TextField label="Giá" type="number" min={0} value={line.unitPrice} onChange={(event) => pos.updateLine(line.id, { unitPrice: Number(event.target.value) })} />
                        <Button variant="ghost" onClick={() => pos.removeLine(line.id)}>Xóa</Button>
                      </div>
                    ))}
                  </div>

                  <div className="pos-checkout-section">
                    <h3>Khách hàng</h3>
                    <SelectField label="Khách có sẵn" value={pos.selectedCustomerId} options={pos.customerOptions} onChange={(event) => pos.selectCustomer(event.target.value)} />
                    <div className="pos-two-fields">
                      <TextField label="Tên khách" value={pos.customerName} onChange={(event) => pos.setCustomerName(event.target.value)} />
                      <TextField label="SĐT" value={pos.customerPhone} onChange={(event) => pos.setCustomerPhone(event.target.value)} />
                    </div>
                    <TextArea label="Ghi chú" value={pos.note} onChange={(event) => pos.setNote(event.target.value)} />
                  </div>

                  <div className="pos-checkout-section">
                    <h3>Tính tiền</h3>
                    <div className="pos-two-fields">
                      <TextField label="Chiết khấu (%)" type="number" min={0} max={100} value={pos.discountPercent} onChange={(event) => pos.setDiscountPercent(event.target.value)} />
                      <TextField label="Phí giao" type="number" min={0} value={pos.shippingFee} onChange={(event) => pos.setShippingFee(event.target.value)} />
                    </div>
                    <SelectField label="Phương thức" value={pos.paymentMethod} options={paymentOptions} onChange={(event) => pos.changeMethod(event.target.value as PaymentMethod)} />
                    {pos.paymentMethod === 'cash' && <TextField label="Khách đưa" type="number" min={0} value={pos.cashReceived === '' ? pos.totals.total : pos.cashReceived} onChange={(event) => pos.setCashReceived(event.target.value)} />}
                    {pos.paymentMethod === 'debt' && <TextField label="Đã thu trước" type="number" min={0} max={pos.totals.total} value={pos.debtDeposit} onChange={(event) => pos.setDebtDeposit(event.target.value)} />}
                  </div>

                  {pos.paymentMethod === 'bank_transfer' && pos.deviceSettings.showQrAtCheckout && (
                    <div className="pos-bank-transfer-card">
                      {pos.transferImage
                        ? <><img src={pos.transferImage.imageUrl} alt="Mã chuyển khoản" /><div className="pos-bank-transfer-meta"><strong>{pos.transferImage.accountName}</strong><span>{pos.transferImage.bankName || pos.transferImage.bankCode} • {pos.transferImage.accountNumber}</span><span>{formatCurrency(pos.transferImage.amount)} • {pos.transferImage.transferReference}</span></div></>
                        : <p className="setup-muted">Chưa cấu hình tài khoản trong Cài đặt → Thiết bị & thanh toán.</p>}
                    </div>
                  )}
                </div>

                <div className="pos-checkout-footer">
                  <div className="pos-payment-breakdown">
                    <div><span>Tạm tính</span><strong>{formatCurrency(pos.totals.subtotal)}</strong></div>
                    <div><span>Chiết khấu ({pos.discountRate}%)</span><strong>-{formatCurrency(pos.totals.discountAmount)}</strong></div>
                    <div><span>Phí giao</span><strong>{formatCurrency(pos.totals.shippingFee)}</strong></div>
                    <div className="is-total"><span>TỔNG THANH TOÁN</span><strong>{formatCurrency(pos.totals.total)}</strong></div>
                    {pos.checkoutAmounts.returned > 0 && <div className="is-change"><span>Tiền thừa</span><strong>{formatCurrency(pos.checkoutAmounts.returned)}</strong></div>}
                    {pos.checkoutAmounts.remaining > 0 && pos.paymentMethod === 'debt' && <div className="is-debt"><span>Còn nợ</span><strong>{formatCurrency(pos.checkoutAmounts.remaining)}</strong></div>}
                  </div>
                  {pos.stockWarnings.length > 0 && <div className="pos-stock-warning"><strong>Cảnh báo tồn kho — vẫn có thể bán</strong><ul>{pos.stockWarnings.map((warning) => <li key={warning.itemId}>{warning.itemName}: thiếu {warning.shortfallQuantity}</li>)}</ul></div>}
                  {pos.checkoutFeedback && <div className={`pos-checkout-feedback${pos.saving ? ' is-progress' : ''}`}>{pos.checkoutFeedback}</div>}
                  {pos.paymentMethod === 'bank_transfer' ? (
                    <Button className="pos-primary-checkout" onClick={pos.saveAndPrintPaymentSlip} disabled={pos.saving}>
                      {pos.saving ? 'ĐANG LƯU...' : 'LƯU & IN PHIẾU THANH TOÁN'}
                    </Button>
                  ) : (
                    <Button className="pos-primary-checkout" onClick={pos.quickFinalize} disabled={pos.saving}>
                      {pos.saving ? 'ĐANG CHỐT...' : pos.paymentMethod === 'debt' ? `LƯU CÔNG NỢ • ${formatCurrency(pos.totals.total)}` : `THANH TOÁN & LƯU • ${formatCurrency(pos.totals.total)}`}
                    </Button>
                  )}
                  <p className="pos-checkout-hint">Đơn chờ thanh toán không trừ kho và không tính doanh thu. Chỉ hóa đơn đã chốt mới ảnh hưởng báo cáo.</p>
                </div>
              </SoftCard>
            )}
          </aside>
        </div>
      ) : (
        <SoftCard className="pos-invoice-history" title="Đơn và hóa đơn" description="Quản lý theo trạng thái chờ thanh toán, đã chốt và đã hủy.">
          <div className="pos-invoice-search">
            <TextField value={pos.invoiceQuery} placeholder="Tìm mã hóa đơn, tên khách, SĐT hoặc trạng thái..." onChange={(event) => pos.setInvoiceQuery(event.target.value)} />
            <Badge tone="lavender">{pos.savedSales.length} kết quả</Badge>
          </div>
          <div className="pos-invoice-list">
            {pos.savedSales.map((sale) => (
              <div className={`pos-invoice-row lifecycle-${sale.sale_status}`} key={sale.id}>
                <div><strong>{sale.invoice_code}</strong><span>{new Date(sale.sale_date).toLocaleString('vi-VN')}</span></div>
                <div><strong>{sale.customer_name ?? 'Khách lẻ'}</strong><span>{sale.customer_phone ?? 'Không có SĐT'}</span></div>
                <div className="pos-invoice-amount"><span>{saleStatusLabel(sale)}</span><strong>{formatCurrency(sale.total)}</strong></div>
                <Button variant="soft" onClick={() => pos.previewById(sale.id)}>Xem</Button>
                <Button onClick={() => pos.printById(sale.id)}>{sale.sale_status === 'pending_payment' ? 'In phiếu' : 'In lại'}</Button>
                {sale.sale_status !== 'cancelled' && <Button variant="ghost" onClick={() => pos.editSaleById(sale.id)}>Sửa</Button>}
                {sale.sale_status !== 'cancelled' && <Button variant="ghost" onClick={() => pos.cancelSaleById(sale.id)}>Hủy</Button>}
                {sale.sale_status === 'cancelled' && <Button variant="ghost" onClick={() => pos.editSaleById(sale.id)}>Tạo lại</Button>}
                {sale.refund_status === 'required' && <Button variant="soft" onClick={() => pos.markRefundedById(sale.id)}>Đã hoàn tiền</Button>}
              </div>
            ))}
          </div>
        </SoftCard>
      )}

      <Dialog open={pos.previewOpen} title={`Xem trước${pos.previewSale ? ` — ${pos.previewSale.sale.invoice_code}` : ''}`} onClose={() => pos.setPreviewOpen(false)}>
        <div className="pos-preview-dialog">
          <iframe title="Xem trước hóa đơn" className="pos-invoice-preview-frame" srcDoc={pos.previewMarkup} />
          <div className="pos-dialog-actions">
            <Button variant="ghost" onClick={() => pos.setPreviewOpen(false)}>Đóng</Button>
            {pos.previewSale && <Button onClick={() => pos.printDocument(pos.previewSale!)}>{pos.previewSale.sale.sale_status === 'pending_payment' ? 'In phiếu thanh toán' : 'In hóa đơn này'}</Button>}
          </div>
        </div>
      </Dialog>
    </>
  );
}

function saleStatusLabel(sale: SaleRecord) {
  if (sale.sale_status === 'pending_payment') return 'Chờ thanh toán';
  if (sale.sale_status === 'cancelled') {
    if (sale.refund_status === 'required') return 'Đã hủy • cần hoàn tiền';
    if (sale.refund_status === 'refunded') return 'Đã hủy • đã hoàn tiền';
    return 'Đã hủy';
  }
  if (sale.payment_status === 'paid') return 'Đã thanh toán';
  if (sale.payment_status === 'partial') return 'Thanh toán một phần';
  return 'Công nợ';
}
