# Bloomia Implementation Task Board

File này gom các task issue theo thứ tự nên làm. Dùng như checklist triển khai cho team.

## Phase A — Foundation

| Order | Issue | Task |
|---:|---|---|
| 1 | #10 | Initialize desktop app project |
| 2 | #11 | Setup lint, format, routing and app shell |
| 3 | #12 | Create Bloomia design tokens |
| 4 | #13 | Build base UI components |
| 5 | #14 | Setup SQLite migrations and database layer |
| 6 | #15 | Create core database schema |
| 7 | #16 | Create inventory database schema |

## Phase B — Manual Setup

| Order | Issue | Task |
|---:|---|---|
| 8 | #17 | Build catalog category/unit/supplier CRUD |
| 9 | #18 | Build item and service CRUD |
| 10 | #19 | Build shop settings screen |

## Phase C — POS & Printing

| Order | Issue | Task |
|---:|---|---|
| 11 | #20 | Build POS layout and order builder UI |
| 12 | #21 | Implement POS cart calculations |
| 13 | #22 | Persist sales, sale items and payments |
| 14 | #23 | Build printer settings and local printer discovery |
| 15 | #24 | Build invoice templates and print preview |

## Phase D — Purchasing & Inventory

| Order | Issue | Task |
|---:|---|---|
| 16 | #25 | Build purchase entry form |
| 17 | #26 | Persist purchase batches and stock movements |
| 18 | #27 | Build inventory overview and batch stock view |
| 19 | #28 | Implement stock out, waste and adjustment flows |
| 20 | #29 | Implement FIFO cost calculation |

## Phase E — Reports & Orders

| Order | Issue | Task |
|---:|---|---|
| 21 | #30 | Build dashboard overview widgets |
| 22 | #31 | Build sales, inventory and waste reports |
| 23 | #32 | Build flower order/preorder form |
| 24 | #33 | Build order status workflow and delivery list |

## Phase F — Recipes

| Order | Issue | Task |
|---:|---|---|
| 25 | #34 | Create product recipe schema and CRUD |
| 26 | #35 | Add recipe products into POS with editable composition |

## Phase G — Bloomia AI Per-Tab

| Order | Issue | Task |
|---:|---|---|
| 27 | #36 | Build per-tab AI popup components |
| 28 | #37 | Implement TabAIDataStore interface and intent registry |
| 29 | #38 | Implement Sales, Inventory and Report AI stores with real data |
| 30 | #39 | Store AI tab sessions, messages and suggestions |

## Phase H — AI Web Service

| Order | Issue | Task |
|---:|---|---|
| 31 | #40 | Setup AI web service skeleton |
| 32 | #41 | Implement florist AI chat and event APIs |
| 33 | #42 | Add Dialogflow CX settings and test endpoint |
| 34 | #43 | Implement Telegram notifications and hot event scoring |

## Phase I — Backup & Release

| Order | Issue | Task |
|---:|---|---|
| 35 | #44 | Implement backup, restore and export data |
| 36 | #45 | Build Windows installer and release checklist |

## MVP cut line

MVP nên chốt ở Phase E + backup cơ bản:

- Foundation hoàn chỉnh.
- Manual setup hoàn chỉnh.
- POS bán được.
- In hóa đơn được.
- Nhập kho theo lô.
- Tồn kho/FIFO cơ bản.
- Dashboard/báo cáo ngày.
- Đơn hoa/đơn giao cơ bản.
- Backup dữ liệu.

AI per-tab nên bắt đầu sau khi POS + kho + báo cáo có dữ liệu thật.

## Nguyên tắc làm task

1. Không làm task AI trước khi dữ liệu POS/kho ổn.
2. Không làm UI thô cứng; mọi tab/card/dialog phải theo design system Bloomia.
3. Không hard delete dữ liệu đã phát sinh giao dịch.
4. Không commit secret, token, credentials hoặc database thật.
5. Mỗi PR nên bám một task issue nhỏ, tránh gom quá nhiều module trong một PR.
