# Sắp xếp nguồn tiền, nguồn mặc định và icon ứng dụng

## Cách sử dụng

- Kéo nút chấm ở cuối nguồn tiền để đổi thứ tự, ngay trong Tổng quan hoặc Quản lý nguồn tiền. Thứ tự được lưu sau khi thả. Tiền mặt/tài khoản và thẻ tín dụng giữ nhóm riêng; nguồn đã lưu trữ không tham gia sắp xếp.
- Khi dùng bàn phím, chọn nút sắp xếp rồi dùng phím mũi tên hoặc Home/End. Thao tác bị hủy không lưu thứ tự xem trước.
- Giao dịch mới chọn nguồn mặc định đã lưu. Nếu chọn nguồn khác rồi lưu một khoản thu/chi mới, nguồn đó trở thành mặc định cho các lần sau, kể cả khi tải lại trang. Hủy biểu mẫu, sửa giao dịch cũ và hoàn tiền không đổi nguồn mặc định.
- Trong chi tiết nguồn tiền, chọn **Đặt làm nguồn mặc định** để thay đổi trực tiếp. Kéo thả, thêm nguồn hay đổi tên không đổi mặc định hiện có; nếu xóa/lưu trữ nguồn mặc định, ứng dụng chọn nguồn đang hoạt động còn lại.
- Đổi giữa hai nguồn cùng tiền tệ giữ số tiền đang nhập. Đổi sang tiền tệ khác xóa số tiền và giá trị quy đổi để nhập đúng đơn vị.
- Các nguồn ngân hàng được tự nhận diện theo tên, ví dụ BIDV, MB Bank, VCB. Trong Thêm/Sửa nguồn tiền có thể chọn quốc gia và **Icon ứng dụng ngân hàng**, hoặc dùng biểu tượng chung. Lựa chọn này không thay đổi tiền tệ của nguồn.
- Icon ngân hàng là ảnh ứng dụng chính thức từ App Store. Tiền mặt dùng ảnh Apple Wallet. Tất cả ảnh được lưu cùng ứng dụng; việc nhận diện tên và hiển thị icon không gọi dịch vụ logo bên ngoài. Xem [nguồn ảnh](bank-icon-sources.md).

## Dữ liệu và kiểm tra

Thứ tự dùng mảng `accounts` hiện có. Các trường `defaultAccountId` và `bankId` là tùy chọn trong dữ liệu V4 nên bản sao lưu cũ vẫn đọc được. Thứ tự, lựa chọn mặc định và ngân hàng được lưu/xuất cùng dữ liệu bằng cơ chế kiểm tra phiên bản hiện có. Sắp xếp không sửa số dư hoặc lịch sử giao dịch.

Ô ngày giữ bộ chọn ngày gốc của trình duyệt, có giới hạn chiều rộng và phần hiển thị riêng của WebKit để không tràn biểu mẫu. Đã kiểm tra trên WebKit ở 320px và 390px bằng cả tiếng Việt và tiếng Anh: nhập/lưu ngày, giữ mặc định khi tải lại, hủy thay đổi nguồn, đổi tiền tệ và chiều rộng biểu mẫu. Đây là kiểm tra bằng engine WebKit trên Windows, chưa phải kiểm tra trên iPhone thật.

Chromium đã kiểm tra kéo bằng chuột, bàn phím trên hai màn hình, kéo và hủy bằng sự kiện cảm ứng thật qua CDP, lưu thứ tự sau tải lại, chọn mặc định và chọn icon. Dữ liệu kiểm tra là dữ liệu giả trong phiên trình duyệt riêng.

Kết quả chi tiết ở `.impeccable/review/account-update-chromium-results.json` và `.impeccable/review/account-update-webkit-results.json`.
