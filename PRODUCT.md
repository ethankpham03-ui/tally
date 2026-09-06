# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- Người dùng cá nhân muốn theo dõi thu nhập, chi tiêu và các khoản phí ứng dụng định kỳ trong cùng một nơi.
- Người xem portfolio, đặc biệt là recruiter và kỹ sư phần mềm, cần thấy một sản phẩm có chiều sâu nghiệp vụ thay vì một CRUD tutorial.

## Product Purpose

Giúp người dùng biết tiền nằm ở đâu, đang nợ bao nhiêu, kiểm soát ngân sách và không bỏ quên các khoản đăng ký sắp gia hạn. Thành công nghĩa là người dùng phân biệt được tiền đang có, dư nợ thẻ, chi tiêu thực và nguồn sẽ thanh toán khoản phí tiếp theo trong một lượt xem.

## Positioning

Kết nối quản lý thu chi với quản lý subscription: một kỳ gia hạn không đứng riêng mà trở thành chi phí định kỳ trong tổng ngân sách và dự báo dòng tiền.

## Operating Context

- Người dùng kiểm tra tổng quan tài chính nhiều lần trong tháng.
- Người dùng ghi giao dịch khi phát sinh hoặc bổ sung sau.
- Người dùng theo dõi ngày gia hạn, chu kỳ thanh toán, giá và trạng thái của các dịch vụ trả phí.
- Tally là ứng dụng local-first: không đăng nhập, không hồ sơ tài khoản và không đồng bộ cloud. Dữ liệu tài chính được lưu có phiên bản trong chính trình duyệt trên thiết bị; người dùng có thể xuất hoặc nhập file sao lưu.

## Capabilities and Constraints

- Người mới đi qua chào mừng và thiết lập các nguồn tiền, số dư hoặc dư nợ thực tế. Có thể bỏ qua để bắt đầu với tiền mặt 0 ₫, hoặc nhập bản sao lưu cá nhân. Lựa chọn hoàn tất/bỏ qua được lưu trên thiết bị; người đã có dữ liệu không bị yêu cầu thiết lập lại.
- Không tự tạo giao dịch, đăng ký hoặc ngân sách mẫu. Sổ cũ còn nguyên chế độ demo được đặt lại qua cơ chế lưu có kiểm tra xung đột; sổ đã được người dùng chỉnh sửa là dữ liệu cá nhân và luôn được giữ nguyên.
- Tổng quan tiền đang có, dư nợ thẻ, số dư có trên thẻ, tài sản ròng, thu nhập và chi tiêu.
- Nguồn tiền nhập thủ công gồm tiền mặt, tài khoản ngân hàng, ví điện tử và thẻ tín dụng; có lịch sử từng nguồn, đối chiếu số dư và lưu trữ nguồn ngưng dùng.
- Quản lý giao dịch và danh mục; mỗi giao dịch gắn với nguồn thanh toán hoặc nguồn nhận tiền.
- Chuyển tiền cùng hoặc khác tiền tệ giữ cả hai số gốc; phí được ghi riêng. Trả nợ thẻ là chuyển tiền, không cộng chi tiêu lần hai. Hoàn tiền giảm chi của danh mục tương ứng.
- Sao kê thẻ có ngày chốt, hạn trả, số tiền và mức tối thiểu tùy chọn; khoản trả chỉ giảm số phải trả của kỳ khi được gắn với kỳ đó. Hạn mức không được cộng vào tài sản.
- Ngân sách theo danh mục.
- Quản lý gói đăng ký, ngày gia hạn, chu kỳ, trạng thái và chi phí quy đổi theo tháng.
- Cảnh báo khoản sắp gia hạn và cho phép người dùng chủ động ghi nhận kỳ phí thành giao dịch; Tally không tự trừ tiền chỉ vì ngày gia hạn đã đến.
- Số dư được suy ra từ số dư mở đầu từng nguồn và cùng một sổ giao dịch. Báo cáo thu/chi phân biệt với biến động tiền có thể sử dụng: mua bằng thẻ ghi chi khi mua, trả thẻ ghi dòng tiền ra khi trả.
- Hỗ trợ VND, USD, EUR, GBP, JPY, KRW, SGD, THB, AUD và CAD; mỗi nguồn có một tiền tệ, báo cáo tổng hợp dùng VND. Tỷ giá nhập thủ công có ngày và nguồn ghi chú; giá trị quy đổi lịch sử được giữ nguyên, phần thiếu tỷ giá phải hiện rõ.
- Subscription có nguồn thanh toán; khi xác nhận đã trả có thể nhập số thực bị trừ khác tiền tệ giá dịch vụ. Không tự chọn nguồn cho lịch sử chưa xác định.
- Thêm, sửa và xóa giao dịch, gói đăng ký và hạn mức ngân sách; các thao tác xóa có thể hoàn tác.
- Thiết lập tất cả nguồn và dư nợ tại cùng ngày, xem chênh lệch trước khi lưu; số dư mở đầu được nhập trước các giao dịch mới của ngày đó. Lịch sử cũ giữ trong “Dữ liệu trước đây”, không tự gán vào tiền mặt hoặc ngân hàng.
- Cài đặt dữ liệu local cho phép xuất/nhập bản sao lưu cá nhân và đặt lại sổ hiện tại có xác nhận để bắt đầu onboarding mới. Không có nút khôi phục mẫu. Bản gốc và bản sao migration cũ được giữ lại; xóa dữ liệu trang trong trình duyệt mới xóa toàn bộ các bản lưu trên thiết bị.
- V4 dùng khóa lưu riêng và giữ bản gốc v1–v3. Dữ liệu lỗi hoặc phiên bản mới hơn chặn ghi; revision và khóa giữa các tab giúp tránh ghi đè, với kiểm tra theo khả năng localStorage khi trình duyệt không có Web Locks.
- Chưa có kết nối ngân hàng, lấy tỷ giá tự động, đồng bộ giữa thiết bị hoặc tự tính lãi/phí thẻ; người dùng ghi số thực tế từ đơn vị cung cấp.
- Hỗ trợ đầy đủ tiếng Anh và tiếng Việt; tiếng Anh là ngôn ngữ mặc định.
- Giao diện responsive cho desktop và mobile web.
- Mobile web là bề mặt sử dụng chính: luồng xem số dư, thêm giao dịch và kiểm tra kỳ gia hạn phải tối ưu cho chiều rộng 360-430px và thao tác một tay.
- App shell không hiển thị avatar hoặc entry point đăng nhập/hồ sơ vì sản phẩm không có identity layer; “Nguồn tiền” là dữ liệu tài chính local.

## Brand Commitments

- Tên folder `BudgetApp` không phải tên sản phẩm.
- Tên sản phẩm đã được chốt là `Tally`: một tên tiếng Anh gồm một từ và không được dịch theo locale.
- Tài sản biểu tượng chuẩn là `public/tally-icon.png` (URL `/tally-icon.png`); cùng một biểu tượng phải xuất hiện nhất quán trong app shell, metadata và các bề mặt cài đặt ứng dụng.
- Tally hỗ trợ tiếng Anh và tiếng Việt. Tiếng Anh là mặc định; chuyển sang tiếng Việt phải thay toàn bộ copy giao diện liên quan thay vì trộn hai ngôn ngữ trên cùng một bề mặt.
- Hướng hình ảnh đã chốt: Reference-led Premium Neumorphism UI, không áp tỷ lệ Minimalism/Neumorphism cố định. Panel chính, control, tab và subscription row dùng đường viền nổi có hướng rõ ràng để bám sát ảnh tham khảo đã duyệt.
- Giao diện phải có cảm giác hiện đại, vật lý và cao cấp; hiệu ứng nổi luôn phục vụ thứ bậc, khoảng thở và khả năng đọc dữ liệu tài chính.

## Evidence on Hand

- Đã có biểu tượng thương hiệu chuẩn tại `public/tally-icon.png`; chưa có dữ liệu người dùng, testimonial hoặc benchmark thật.
- Số dư ban đầu là dữ liệu người dùng nhập, không phải khoản thu. Khi chưa ghi giao dịch, thu chi và ngân sách giữ trạng thái trống hoặc bằng 0.

## Product Principles

1. Một lượt xem phải trả lời được: còn bao nhiêu, đã chi bao nhiêu và sắp bị trừ khoản nào.
2. Subscription là một phần của dòng tiền, không phải một danh sách tách rời.
3. Chiều sâu thị giác không được làm mờ trạng thái, số tiền hoặc hành động chính.
4. Giao diện mặc định bằng tiếng Anh và có bản dịch tiếng Việt đầy đủ; người dùng bắt đầu từ dữ liệu thực của mình.
5. Tính năng portfolio phải hoạt động và có trạng thái thật, không chỉ là màn hình tĩnh.
6. Dữ liệu người dùng không rời thiết bị; mọi giới hạn của local storage phải được nói rõ và có luồng sao lưu chủ động.

## Implementation Reference

[Nghiệp vụ V4, migration và kịch bản kiểm tra](./docs/multi-account-implementation.vi.md). [Bản nghiên cứu ban đầu](./docs/multi-account-research.vi.md) được giữ làm tài liệu quyết định, không phải danh sách trạng thái phát hành.
