# Bloomia Product Gap Audit

This audit tracks gaps found while running the local desktop app.

## Immediate UX fixes in this branch

- Main sidebar/topbar must stay fixed while the active tab scrolls.
- Native black titlebar is replaced by a Bloomia custom titlebar.
- POS no longer shows temporary profit. Profit belongs in Reports.

## Current backend/frontend alignment

### Desktop local app

- Frontend uses React/Tauri.
- Local database uses Tauri SQL plugin with `sqlite:bloomia.db`.
- The app data should live on the local machine through Tauri app data storage.
- Current desktop screens call local repositories directly.

### AI service

- `ai-service/` exists as a separate Node/Express service.
- The desktop UI is not connected to the AI service yet.
- Current in-app Bloomia AI is local rule-based advice.
- Missing: client config, API adapter, retry/error UI, event dispatch from desktop to AI service.

## Business logic gaps

### Catalog and supplier flow

- Supplier CRUD exists in Settings, but Purchase does not offer a fast add supplier flow.
- Item/service CRUD exists in Settings, but Purchase and POS do not offer quick add item/service.
- Need clearer empty states and shortcuts from Purchase/POS to Settings.

### Purchase price and sale price

- Purchase price is stored per batch as `unit_cost`.
- Sale price exists as `default_sale_price` on item.
- Missing: margin helper when setting sale price.
- Missing: latest cost preview when editing item sale price.
- Missing: suggested sale price from cost plus margin.

### Discounts and promotions

- POS supports one invoice-level discount amount.
- Missing: percentage discount.
- Missing: item-level discount.
- Missing: promotion rules such as bundle, event campaign, holiday campaign.
- Missing: discount reason and staff permission.

### POS checkout

- POS saves sale and payments.
- POS can print/preview invoice.
- Missing: draft/hold bill.
- Missing: return/refund/void sale.
- Missing: customer debt tracking beyond basic payment status.
- Missing: cashier-safe UI separation from owner-only reports.

### Inventory and FIFO

- Purchase batches and stock movements exist.
- POS deducts stock through FIFO for tracked items.
- Missing: full transaction wrapper around sale plus inventory movements.
- Missing: manual batch override at checkout.
- Missing: low-stock threshold per item.
- Missing: waste reason presets.

### Orders and delivery

- Flower orders and statuses exist.
- Missing: convert order to POS invoice.
- Missing: delivery fee rules by area/distance.
- Missing: delivery assignment and proof of delivery.
- Missing: calendar/list view for delivery schedule.

### Recipes

- Recipe templates exist.
- POS can add recipe into cart.
- Missing: cost should use latest batch cost/FIFO preview, not item sale price.
- Missing: recipe to production checklist.
- Missing: recipe variants by size.

### Reports

- Dashboard and report pages exist.
- Profit should remain in Reports, not POS.
- Missing: export CSV/PDF.
- Missing: date range picker in all report panels.
- Missing: promotion performance.
- Missing: supplier purchase report.

### Local data and backup

- Database is local SQLite.
- Missing: visible database path in Settings.
- Missing: backup/export database file.
- Missing: restore database file.
- Missing: reset demo data.

## Recommended next implementation order

1. Fix build/runtime polish and UI shell.
2. Add Settings shortcuts and quick-add flows for supplier/item from Purchase/POS.
3. Add pricing helper: latest cost, margin, suggested sale price.
4. Add discount model: amount, percent, item-level, reason.
5. Add local DB path display, backup and restore.
6. Add transaction wrapper for sale plus FIFO.
7. Connect desktop Bloomia AI to `ai-service/`.
8. Add order-to-invoice flow.
9. Add report exports.
10. Package Windows installer.
