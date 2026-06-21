import { Badge, Button, Dialog, PillTabs, SelectField, SoftCard, TextArea, TextField } from '../../components/ui';
import type { PaymentMethod } from '../../db/repositories/salesRepository';
import { lineTotal } from '../../services/pos/cart';
import { formatCurrency } from '../../utils/format';
import { usePosP0 } from './usePosP0';

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

export function POSPageP0() {
  const pos = usePosP0();

  return (
    <>
      <div className="page-title-row pos-page-heading">
        <div>
          <span className="eyebrow">POS</span>
          <h2>{pos.view === 'sale' ? 'Bán hàng tại quầy' : 'Tra cứu hóa đơn'}</h2>
          <p className="setup-muted">{pos.view === 'sale' ? 'Thanh toán, QR và máy in dùng cấu hình trong Thiết bị & thanh toán.' : 'Tìm theo mã hóa đơn, tên khách hoặc số điện thoại.'}</p>
        </div>
        <PillTabs value={pos.view} onChange={pos.setView} options={[...posViews]} />
      </div>

      {(pos.status || pos.error) && <div className="setup-status-row">{pos.status && <Badge tone="sage">{pos.status}</Badge>}{pos.error && <Badge tone="peach">{pos.error}</Badge>}</div>}

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
                    {pos.itemPhotoUrls[item.id] ? <img className="pos-product-image" src={pos.itemPhotoUrls[item.id]} alt={item.name} /> : <div className="pos-product-image pos-product-image-placeholder">✦</div>}
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
              <SoftCard className="pos-completed-panel" title="Thanh toán thành công" description="Hóa đơn đã lưu vào SQLite local.">
                <div className="pos-success-mark">✓</div>
                <strong className="pos-completed-code">{pos.completedSale.sale.invoice_code}</strong>
                <div className="pos-completed-summary">
                  <div><span>Khách hàng</span><strong>{pos.completedSale.sale.customer_name ?? 'Khách lẻ'}</strong></div>
                  <div><span>Tổng thanh toán</span><strong>{formatCurrency(pos.completedSale.sale.total)}</strong></div>
                  <div><span>Trạng thái</span><strong>{paymentLabel(pos.completedSale.sale.payment_status)}</strong></div>
                </div>
                <div className="pos-completed-actions">
                  <Button variant="soft" onClick={() => pos.preview(pos.completedSale!)}>Xem hóa đơn</Button>
                  <Button onClick={() => pos.printSale(pos.completedSale!)}>In hóa đơn</Button>
                  <Button variant="ghost" onClick={pos.newSale}>Đơn mới</Button>
                  <Button variant="ghost" onClick={() => { pos.setInvoiceQuery(pos.completedSale!.sale.invoice_code); pos.setView('invoices'); }}>Mở trong Hóa đơn</Button>
                </div>
              </SoftCard>
            ) : (
              <SoftCard className="pos-checkout-panel" title="Đơn đang bán" description={`${pos.cart.length} dòng • ${pos.cartQuantity} sản phẩm`}>
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
                    <div className="pos-two-fields"><TextField label="Tên khách" value={pos.customerName} onChange={(event) => pos.setCustomerName(event.target.value)} /><TextField label="SĐT" value={pos.customerPhone} onChange={(event) => pos.setCustomerPhone(event.target.value)} /></div>
                    <TextArea label="Ghi chú" value={pos.note} onChange={(event) => pos.setNote(event.target.value)} />
                  </div>

                  <div className="pos-checkout-section">
                    <h3>Tính tiền</h3>
                    <div className="pos-two-fields"><TextField label="Chiết khấu (%)" type="number" min={0} max={100} value={pos.discountPercent} onChange={(event) => pos.setDiscountPercent(event.target.value)} /><TextField label="Phí giao" type="number" min={0} value={pos.shippingFee} onChange={(event) => pos.setShippingFee(event.target.value)} /></div>
                    <SelectField label="Phương thức" value={pos.paymentMethod} options={paymentOptions} onChange={(event) => pos.changeMethod(event.target.value as PaymentMethod)} />
                    {pos.paymentMethod === 'cash' && <TextField label="Khách đưa" type="number" min={0} value={pos.cashReceived === '' ? pos.totals.total : pos.cashReceived} onChange={(event) => pos.setCashReceived(event.target.value)} />}
                    {pos.paymentMethod === 'debt' && <TextField label="Đã thu trước" type="number" min={0} max={pos.totals.total} value={pos.debtDeposit} onChange={(event) => pos.setDebtDeposit(event.target.value)} />}
                  </div>

                  {pos.paymentMethod === 'bank_transfer' && pos.deviceSettings.showQrAtCheckout && (
                    <div className="pos-bank-transfer-card">
                      {pos.transferImage ? <><img src={pos.transferImage.imageUrl} alt="Mã chuyển khoản" /><div className="pos-bank-transfer-meta"><strong>{pos.transferImage.accountName}</strong><span>{pos.transferImage.bankName || pos.transferImage.bankCode} • {pos.transferImage.accountNumber}</span><span>{formatCurrency(pos.transferImage.amount)} • {pos.transferImage.transferReference}</span></div><label className="setup-checkbox pos-transfer-confirm"><input type="checkbox" checked={pos.transferConfirmed} onChange={(event) => pos.setTransferConfirmed(event.target.checked)} />Đã kiểm tra và nhận đúng chuyển khoản</label></> : <p className="setup-muted">Chưa cấu hình tài khoản trong Cài đặt → Thiết bị & thanh toán.</p>}
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
                  <Button className="pos-primary-checkout" onClick={pos.saveCurrentSale} disabled={pos.saving}>{pos.saving ? 'ĐANG LƯU...' : pos.paymentMethod === 'bank_transfer' ? `XÁC NHẬN CHUYỂN KHOẢN • ${formatCurrency(pos.totals.total)}` : pos.paymentMethod === 'debt' ? `LƯU CÔNG NỢ • ${formatCurrency(pos.totals.total)}` : `THANH TOÁN & LƯU • ${formatCurrency(pos.totals.total)}`}</Button>
                </div>
              </SoftCard>
            )}
          </aside>
        </div>
      ) : (
        <SoftCard className="pos-invoice-history" title="Hóa đơn đã lưu" description="Hóa đơn mới nhất nằm trên cùng.">
          <div className="pos-invoice-search"><TextField value={pos.invoiceQuery} placeholder="Tìm mã hóa đơn, tên khách hoặc SĐT..." onChange={(event) => pos.setInvoiceQuery(event.target.value)} /><Badge tone="lavender">{pos.savedSales.length} kết quả</Badge></div>
          <div className="pos-invoice-list">{pos.savedSales.map((sale) => <div className="pos-invoice-row" key={sale.id}><div><strong>{sale.invoice_code}</strong><span>{new Date(sale.sale_date).toLocaleString('vi-VN')}</span></div><div><strong>{sale.customer_name ?? 'Khách lẻ'}</strong><span>{sale.customer_phone ?? 'Không có SĐT'}</span></div><div className="pos-invoice-amount"><span>{paymentLabel(sale.payment_status)}</span><strong>{formatCurrency(sale.total)}</strong></div><Button variant="soft" onClick={() => pos.previewById(sale.id)}>Xem</Button><Button onClick={() => pos.printById(sale.id)}>In lại</Button></div>)}</div>
        </SoftCard>
      )}

      <Dialog open={pos.previewOpen} title={`Xem trước hóa đơn${pos.previewSale ? ` — ${pos.previewSale.sale.invoice_code}` : ''}`} onClose={() => pos.setPreviewOpen(false)}><div className="pos-preview-dialog"><iframe title="Xem trước hóa đơn" className="pos-invoice-preview-frame" srcDoc={pos.previewMarkup} /><div className="pos-dialog-actions"><Button variant="ghost" onClick={() => pos.setPreviewOpen(false)}>Đóng</Button>{pos.previewSale && <Button onClick={() => pos.printSale(pos.previewSale!)}>In hóa đơn này</Button>}</div></div></Dialog>
    </>
  );
}

function paymentLabel(status: string) {
  if (status === 'paid') return 'Đã thanh toán';
  if (status === 'partial') return 'Thanh toán một phần';
  return 'Công nợ';
}
