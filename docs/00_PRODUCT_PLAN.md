# Bloomia Product Plan

## 1. Định vị

**Bloomia** là phần mềm desktop local cho shop hoa, tập trung vào 4 việc:

1. Bán hàng nhanh và đẹp tại quầy.
2. Quản lý đơn hoa, giao hoa và đặt trước.
3. Quản lý nhập - xuất - tồn theo đặc thù ngành hoa.
4. AI cố vấn cho chủ shop về trend, kinh doanh, cách cắm hoa và nội dung bán hàng.

Bloomia không nên thiết kế như một POS bán lẻ phổ thông, vì ngành hoa có 3 đặc thù lớn:

- Giá nhập thay đổi liên tục.
- Một sản phẩm bán ra thường là tổ hợp nguyên liệu + phụ liệu + dịch vụ.
- Chủ shop cần linh hoạt sửa giá, thay nguyên liệu, bán theo ngân sách và xử lý hoa sắp héo.

## 2. Người dùng chính

### Chủ shop hoa

Nhu cầu:

- Xem doanh thu, lời lỗ, tồn kho, hoa sắp héo.
- Tự cấu hình danh mục, giá, dịch vụ, mẫu hóa đơn.
- Nhận gợi ý từ AI để bán tốt hơn.

### Nhân viên bán hàng

Nhu cầu:

- Tạo đơn nhanh.
- Thêm sản phẩm, dịch vụ, phí giao.
- Sửa giá linh hoạt.
- In hóa đơn.
- Theo dõi đơn cần giao.

### Nhân viên cắm hoa / vận hành

Nhu cầu:

- Xem đơn cần làm.
- Xem tone màu, ngân sách, lời nhắn thiệp, ảnh mẫu.
- Xem công thức gợi ý.
- Cập nhật trạng thái đơn.

## 3. Module sản phẩm

### 3.1. Tổng quan

Dashboard cho chủ shop xem nhanh:

- Doanh thu hôm nay.
- Đơn đang xử lý.
- Hoa sắp héo.
- Lợi nhuận tạm tính.
- Đơn cần giao hôm nay.
- Cảnh báo tồn kho.
- Top mẫu hoa bán chạy.
- Hóa đơn gần đây.

### 3.2. Bán hàng / POS

Chức năng:

- Tạo hóa đơn bán lẻ.
- Thêm sản phẩm mẫu.
- Thêm dòng tùy chỉnh.
- Thêm dịch vụ: công cắm, thiệp, giao hàng, gói quà, phụ thu gấp.
- Sửa số lượng.
- Sửa giá bán từng dòng.
- Chiết khấu.
- Thanh toán.
- In hóa đơn.
- Lưu đơn.

Điểm bắt buộc:

- Không ép mọi thứ phải là sản phẩm cố định.
- Phải có nút **Đơn tùy chỉnh** cho khách đặt theo ngân sách.
- Giá bán phải sửa được tại quầy.

### 3.3. Đơn hoa / đặt trước / giao hàng

Thông tin đơn:

- Khách hàng.
- SĐT.
- Người nhận.
- SĐT người nhận.
- Ngày giờ giao.
- Địa chỉ giao.
- Dịp tặng.
- Tone màu.
- Ngân sách.
- Ảnh mẫu.
- Lời nhắn thiệp.
- Ghi chú nội bộ.
- Trạng thái thanh toán.

Trạng thái đơn:

```txt
Mới nhận
Đã xác nhận
Đang chuẩn bị
Đã cắm xong
Đang giao
Hoàn thành
Hủy
```

### 3.4. Danh mục

Chủ shop tự cấu hình:

- Nhóm hàng.
- Hoa tươi.
- Lá phụ.
- Phụ liệu.
- Bao bì.
- Vật tư cắm hoa.
- Dịch vụ.
- Sản phẩm mẫu.
- Đơn vị tính.
- Nhà cung cấp.
- Tone màu.
- Dịp tặng.

### 3.5. Nhập hàng

Mỗi lần nhập lưu theo lô:

- Ngày nhập.
- Nhà cung cấp.
- Mặt hàng.
- Số lượng.
- Đơn vị tính.
- Giá nhập.
- Tổng tiền.
- Ngày dự kiến héo.
- Ghi chú chất lượng.

Nguyên tắc:

- Giá nhập không cố định trên sản phẩm.
- Giá nhập lưu theo từng lô nhập.
- Tồn kho nên theo dõi theo lô để tính FIFO.

### 3.6. Xuất kho / hao hụt

Loại xuất:

- Xuất bán.
- Xuất hủy vì héo/hỏng.
- Xuất mẫu trưng bày.
- Xuất sự kiện.
- Xuất nội bộ.
- Điều chỉnh kho.

### 3.7. Báo cáo

MVP:

- Doanh thu ngày.
- Doanh thu tháng.
- Số đơn.
- Giá trị đơn trung bình.
- Lợi nhuận tạm tính.
- Tiền mặt / chuyển khoản.
- Nhập hàng trong ngày.
- Xuất hàng trong ngày.
- Tồn kho cuối ngày.
- Hoa sắp héo.
- Hoa hủy / hao hụt.

Nâng cao:

- Top mẫu hoa bán chạy.
- Top tone màu bán chạy.
- Top dịp tặng.
- Nhà cung cấp giá tốt.
- Hoa hao hụt cao.
- Gợi ý nhập hàng ngày mai.
- Biên lợi nhuận theo loại đơn.

### 3.8. Cài đặt

- Thông tin shop.
- Logo.
- Mẫu hóa đơn.
- Máy in.
- Khổ giấy 58mm / 80mm / A4.
- Nhân viên.
- Phân quyền.
- Backup dữ liệu.
- Cài đặt AI.
- Cài đặt Telegram.

## 4. AI Dialog

Tên chức năng:

> Bloomia AI

Vai trò:

- Tư vấn trend bán hoa.
- Tư vấn kinh doanh.
- Gợi ý cách cắm hoa.
- Gợi ý combo theo tồn kho.
- Viết caption Facebook/Zalo.
- Viết lời nhắn thiệp.
- Gợi ý giá bán theo giá vốn và margin.

AI không tự động sửa dữ liệu. AI chỉ đưa gợi ý và chủ shop xác nhận.

## 5. Nguyên tắc UI/UX

Bloomia cần cảm giác:

- Mềm.
- Đẹp.
- Sang.
- Dễ thao tác.
- Không thô cứng.
- Không giống phần mềm kế toán cũ.

Thiết kế:

- Card bo góc mềm.
- Pill tab thay cho tab vuông.
- Icon line mềm.
- Floral accent nhẹ.
- Không dùng bảng quá dày đặc ở màn POS.
- Dữ liệu báo cáo rõ nhưng vẫn thanh lịch.

## 6. MVP Scope

MVP cần hoàn thành:

1. Desktop shell.
2. SQLite local database.
3. Danh mục thủ công.
4. POS bán hàng.
5. In hóa đơn.
6. Nhập kho theo lô.
7. Xuất kho.
8. Tồn kho.
9. Báo cáo ngày.
10. Backup dữ liệu.

AI để Phase 3, sau khi dữ liệu thật đã có.
