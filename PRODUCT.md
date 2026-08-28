# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- Người dùng cá nhân muốn theo dõi thu nhập, chi tiêu và các khoản phí ứng dụng định kỳ trong cùng một nơi.
- Người xem portfolio, đặc biệt là recruiter và kỹ sư phần mềm, cần thấy một sản phẩm có chiều sâu nghiệp vụ thay vì một CRUD tutorial.

## Product Purpose

Giúp người dùng hiểu dòng tiền hiện tại, kiểm soát ngân sách và không bỏ quên các khoản đăng ký sắp gia hạn. Thành công nghĩa là người dùng biết mình còn bao nhiêu, đang chi vào đâu và khoản phí cố định nào sẽ đến tiếp theo chỉ trong một lượt xem.

## Positioning

Kết nối quản lý thu chi với quản lý subscription: một kỳ gia hạn không đứng riêng mà trở thành chi phí định kỳ trong tổng ngân sách và dự báo dòng tiền.

## Operating Context

- Người dùng kiểm tra tổng quan tài chính nhiều lần trong tháng.
- Người dùng ghi giao dịch khi phát sinh hoặc bổ sung sau.
- Người dùng theo dõi ngày gia hạn, chu kỳ thanh toán, giá và trạng thái của các dịch vụ trả phí.
- Dữ liệu thật, đăng nhập và lưu trữ cloud chưa được quyết định; bản đầu dùng dữ liệu minh họa rõ ràng để chứng minh trải nghiệm.

## Capabilities and Constraints

- Tổng quan số dư, thu nhập, chi tiêu và xu hướng dòng tiền.
- Quản lý giao dịch và danh mục.
- Ngân sách theo danh mục.
- Quản lý gói đăng ký, ngày gia hạn, chu kỳ, trạng thái và chi phí quy đổi theo tháng.
- Cảnh báo khoản sắp gia hạn và tự liên kết phí định kỳ với giao dịch là hướng chức năng cốt lõi.
- Hỗ trợ đầy đủ tiếng Anh và tiếng Việt; tiếng Anh là ngôn ngữ mặc định.
- Giao diện responsive cho desktop và mobile web.
- Mobile web là bề mặt sử dụng chính: luồng xem số dư, thêm giao dịch và kiểm tra kỳ gia hạn phải tối ưu cho chiều rộng 360-430px và thao tác một tay.

## Brand Commitments

- Tên folder `BudgetApp` không phải tên sản phẩm.
- Tên sản phẩm đã được chốt là `Tally`: một tên tiếng Anh gồm một từ và không được dịch theo locale.
- Tài sản biểu tượng chuẩn là `public/tally-icon.png` (URL `/tally-icon.png`); cùng một biểu tượng phải xuất hiện nhất quán trong app shell, metadata và các bề mặt cài đặt ứng dụng.
- Tally hỗ trợ tiếng Anh và tiếng Việt. Tiếng Anh là mặc định; chuyển sang tiếng Việt phải thay toàn bộ copy giao diện liên quan thay vì trộn hai ngôn ngữ trên cùng một bề mặt.
- Hướng hình ảnh đã chốt: Reference-led Premium Neumorphism UI, không áp tỷ lệ Minimalism/Neumorphism cố định. Panel chính, control, tab và subscription row dùng đường viền nổi có hướng rõ ràng để bám sát ảnh tham khảo đã duyệt.
- Giao diện phải có cảm giác hiện đại, vật lý và cao cấp; hiệu ứng nổi luôn phục vụ thứ bậc, khoảng thở và khả năng đọc dữ liệu tài chính.

## Evidence on Hand

- Đã có biểu tượng thương hiệu chuẩn tại `public/tally-icon.png`; chưa có dữ liệu người dùng, testimonial hoặc benchmark thật.
- Mọi số liệu xuất hiện trong bản demo phải được nhận diện là dữ liệu minh họa, không được trình bày như tuyên bố thương mại.

## Product Principles

1. Một lượt xem phải trả lời được: còn bao nhiêu, đã chi bao nhiêu và sắp bị trừ khoản nào.
2. Subscription là một phần của dòng tiền, không phải một danh sách tách rời.
3. Chiều sâu thị giác không được làm mờ trạng thái, số tiền hoặc hành động chính.
4. Dữ liệu demo giữ ngữ cảnh Việt Nam; giao diện mặc định bằng tiếng Anh và có bản dịch tiếng Việt đầy đủ để recruiter tự khám phá sản phẩm ở cả hai locale.
5. Tính năng portfolio phải hoạt động và có trạng thái thật, không chỉ là màn hình tĩnh.
