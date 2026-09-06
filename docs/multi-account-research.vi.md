# Tally — Đề xuất nhiều nguồn tiền, thẻ tín dụng và đa tiền tệ

Ngày nghiên cứu: 06/09/2026. Đây là bản đề xuất tại thời điểm nghiên cứu, được giữ để đối chiếu quyết định; các nhận xét “hiện có” và số dòng bên dưới mô tả code trước V4. Phần triển khai sau khi được phê duyệt được ghi riêng tại [V4: nghiệp vụ, migration và kiểm tra](./multi-account-implementation.vi.md). Bản nghiên cứu này không xác nhận trạng thái triển khai lên website.

Phạm vi đã tiếp nhận: tiền mặt và nhiều tài khoản ngân hàng; bổ sung ví điện tử, thẻ tín dụng/dư nợ thẻ và một nhóm tiền tệ phổ biến. Tally tiếp tục ưu tiên mobile, nhập thủ công, lưu trên thiết bị và giao diện EN/VI.

**1. Nhận định sản phẩm**

Nên phát triển tính năng này. Nó giúp người dùng trả lời ba câu hỏi hiện bị gộp: tiền nằm ở đâu; thực sự đã kiếm/tiêu bao nhiêu; tài khoản nào cần có tiền cho khoản thanh toán sắp tới. Giá trị lớn nhất là kết nối nguồn thanh toán với sổ giao dịch và subscription hiện có.

Tên khu vực đề xuất: “Nguồn tiền” / “Accounts”. Trong form dùng “Thanh toán bằng”, “Nhận vào”, “Từ nguồn”, “Đến nguồn”. “Danh mục” vẫn trả lời tiền dùng cho việc gì. Thẻ ghi nợ dùng số dư của tài khoản ngân hàng liên kết, không tạo thêm một nguồn có cùng số tiền.

Thiết kế dữ liệu phải bao gồm thẻ và tiền tệ ngay từ đầu. Giao diện chỉ mở thêm trường khi cần: người dùng chỉ có VND không phải nhập tỷ giá; người không dùng thẻ không thấy phần sao kê.

**2. Bằng chứng từ sản phẩm đang hoạt động**

| Sản phẩm | Hành vi được tài liệu chính thức mô tả | Bài học áp dụng |
| --- | --- | --- |
| Actual Budget | Chuyển tiền có hai phía liên kết; sửa số tiền đồng bộ và xóa cả cặp. | Một thao tác chuyển tiền phải cập nhật cả hai tài khoản. [Transfers](https://actualbudget.org/docs/transactions/transfers/) |
| YNAB | Thanh toán thẻ từ tài khoản được theo dõi là chuyển tiền; hoàn hàng được đưa về danh mục chi ban đầu. | Không tính trả thẻ thành chi tiêu lần hai; hoàn tiền cần loại nghiệp vụ riêng. [Payments](https://support.ynab.com/en_us/credit-card-payments-a-guide-r1_506Q1j), [Refunds](https://support.ynab.com/en_us/credit-card-refunds-and-returns-H1J7qDWkj) |
| Wallet | Có dư nợ, hạn mức, tiền tệ và hạn thanh toán của thẻ; mỗi tài khoản dùng một tiền tệ. | Phân biệt nợ với hạn mức và tiền đang có. [Credit cards](https://support.budgetbakers.com/hc/en-us/articles/6950259945362-Adding-a-Credit-Card), [Currencies](https://support.budgetbakers.com/hc/en-us/articles/7149418777746-Multiple-Currencies-Exchange-Rates) |
| Spendee | Có tổng quan nhiều ví, tiền tệ báo cáo và tiền tệ ví; có thể chọn tỷ giá cho giao dịch. | Xem tổng bằng tiền tệ chính nhưng giữ nguyên số gốc. [All wallets](https://help.spendee.com/article/169-all-wallets-overview), [Currencies](https://help.spendee.com/article/231-how-to-setchange-the-currency-and-exchange-rate) |
| Lunch Money | Lưu tỷ giá lịch sử theo giao dịch. | Tỷ giá mới không được âm thầm thay chi tiêu quá khứ. [Multicurrency](https://lunchmoney.app/features/multicurrency/) |

Các ứng dụng còn khác nhau về nghĩa “Cash Flow”: Spendee mô tả chuyển tiền được tính trong Cash Flow, trong khi Wallet loại chuyển tiền khỏi chỉ số đó. Tally cần định nghĩa chỉ số rõ ràng thay vì sao chép tên. [Spendee transfers](https://help.spendee.com/article/234-transfers), [Wallet statistics](https://support.budgetbakers.com/hc/en-us/articles/36544649033618-How-to-exclude-an-account-records-or-transfers-from-your-statistics)

Những phần tiếp theo là thiết kế đề xuất cho Tally, không phải khẳng định mọi ứng dụng trên đều hoạt động giống nhau.

**3. Tally hiện tại và tác động kỹ thuật**

Đã đọc PRODUCT.md, DESIGN.md, app/finance-domain.ts, app/finance-app.tsx, app/i18n.tsx, app/navigation.ts và kiểm thử domain. Các vị trí dưới đây được kiểm tra tại thời điểm nghiên cứu.

| Hiện trạng | Vị trí | Hệ quả |
| --- | --- | --- |
| Dữ liệu hiện là V3; khóa lưu vẫn tên `tally-finance-v1`. | app/finance-domain.ts:1 | Cần migration có phiên bản, không suy phiên bản từ tên khóa. |
| Transaction chưa có tài khoản; amount có dấu, category quyết định thu/chi. | app/finance-domain.ts:177 | Bộ lọc giao diện đơn thuần không đủ. |
| Một openingBalance dùng chung. | app/finance-domain.ts:249 | Cần số dư mở đầu riêng và mốc bắt đầu của từng nguồn. |
| Tổng quan và cashflow suy loại giao dịch từ dấu amount. | app/finance-domain.ts:607, 654 | Chuyển khoản, trả thẻ và hoàn tiền sẽ làm sai số nếu giữ logic này. |
| Subscription hỗ trợ 10 tiền tệ nhưng ghi thanh toán chỉ cho VND. | app/finance-domain.ts:148, 990 | Phải đưa số tiền thực thanh toán vào nguồn tương ứng. |
| Form và định dạng giao dịch hiện dùng VND. | app/finance-app.tsx:1185; app/i18n.tsx:1116 | Currency cần xuyên suốt form, danh sách, tổng quan, ngân sách và backup. |
| Có bốn khu vực chính và nút thêm ở mobile. | app/navigation.ts:1 | Nên mở quản lý nguồn từ khối số dư thay vì nhét thêm mục vào thanh điều hướng hiện tại. |

Không cần tài khoản đăng nhập hay đồng bộ ngân hàng để thực hiện phạm vi này. “Accounts” ở đây là nguồn tài chính người dùng ghi lại.

**4. Cấu trúc trải nghiệm đề xuất**

Trang tổng quan có “Tiền đang có” là số chính: tiền mặt + ngân hàng + ví điện tử đang theo dõi. Khi có thẻ, hiện thêm “Dư nợ thẻ” và “Tài sản ròng đang theo dõi”. Số dư có trên thẻ do trả dư/hoàn tiền được thể hiện riêng, không gọi là tiền mặt dùng được ngay. Nếu có ngoại tệ, tổng quy đổi ghi rõ “Ước tính” và thời điểm tỷ giá.

Danh sách nguồn đặt gần số dư. Trường hợp bốn nguồn nên đọc được cả bốn số dư mà không phải vuốt carousel. Chạm một nguồn mở chi tiết: số dư, thu/chi, chuyển vào/ra, lịch sử và các khoản định kỳ dùng nguồn đó. Nợ thẻ nằm trong nhóm riêng với nhãn “Đang nợ”.

Luồng tạo nguồn: chọn loại → tên → tiền tệ → số dư/dư nợ và mốc bắt đầu. Biểu tượng/màu là tùy chọn. Form thẻ có thêm hạn mức, thông tin sao kê tùy chọn. Không cần số thẻ đầy đủ, CVV hoặc thông tin đăng nhập ngân hàng.

Luồng ghi giao dịch vẫn ngắn. Mở từ một nguồn thì chọn sẵn nguồn đó; sửa giao dịch giữ nguồn cũ; mở từ tổng quan dùng nguồn mặc định/gần nhất theo loại thao tác và luôn hiển thị trước khi lưu. Nguồn lưu trữ và nguồn lịch sử không tự được chọn cho giao dịch mới.

Ba thao tác chính: Thu, Chi, Chuyển tiền. “Trả nợ thẻ” là lối tắt của chuyển tiền. “Hoàn tiền” mở từ giao dịch mua hoặc hành động phụ; “Đối chiếu số dư” ở chi tiết nguồn. Không bắt người dùng hiểu thuật ngữ sổ cái.

Bộ lọc nguồn phải hiện rõ phạm vi trên lịch sử và báo cáo. Ngân sách theo danh mục vẫn tính toàn bộ khoản chi thực, bao gồm mua bằng thẻ và hoàn tiền, mặc định trên tất cả nguồn. Chọn một nguồn không được khiến người dùng tưởng hạn mức ngân sách toàn cục đã thay đổi.

Tất cả trạng thái phải tương đương EN/VI, dùng được ở 320px, thao tác chính từ 44px, có nhãn ngoài màu sắc và điều khiển bằng bàn phím.

**5. Quy tắc tiền và báo cáo**

Ví dụ dưới đây là số minh họa, không phải tỷ giá hoặc dữ liệu người dùng.

| Sự kiện | Tiền đang có | Dư nợ thẻ | Chi tiêu |
| --- | --- | --- | --- |
| Rút 1.000.000đ từ ngân hàng về tiền mặt | Tổng không đổi; chuyển vị trí | Không đổi | Không đổi |
| Mua hàng bằng tiền mặt 200.000đ | Giảm 200.000đ | Không đổi | Tăng 200.000đ |
| Mua hàng bằng thẻ tín dụng 1.000.000đ | Không đổi | Tăng 1.000.000đ | Tăng 1.000.000đ |
| Trả thẻ 1.000.000đ từ ngân hàng | Giảm 1.000.000đ | Giảm 1.000.000đ | Không đổi |
| Hoàn hàng 200.000đ về thẻ đang nợ | Không đổi | Giảm 200.000đ | Giảm 200.000đ ở danh mục mua |
| Ngân hàng ghi phí/lãi 30.000đ vào thẻ | Không đổi | Tăng 30.000đ | Tăng 30.000đ |

Cần tách hai báo cáo vốn dễ bị gọi chung là “dòng tiền”:

- **Thu nhập và chi tiêu:** ghi chi khi mua hàng, kể cả mua bằng thẻ. Loại chuyển nội bộ, trả gốc nợ thẻ, số dư mở đầu và điều chỉnh thiết lập. Hoàn tiền giảm chi theo ngày hoàn, không sửa ngầm tháng mua hàng.
- **Biến động tiền đang có:** giải thích thay đổi tiền mặt/ngân hàng/ví điện tử. Trả thẻ làm tiền này giảm dù không có chi tiêu mới; chuyển ngân hàng → tiền mặt không làm tổng này giảm. Chi tiết từng nguồn vẫn hiện các khoản chuyển vào/ra.

Một tài khoản có: số dư cuối kỳ = số dư đầu kỳ + tổng tác động có dấu của các sự kiện trong kỳ. Tổng tài sản ròng dùng cả tài sản và số dư thẻ có dấu sau khi quy đổi. Nếu có ngoại tệ, biến động định giá được tách khỏi thu/chi; không gọi mọi thay đổi của tài sản ròng là tiền kiếm được.

Chuyển 1.000.000đ với phí 5.000đ: nguồn gửi giảm 1.005.000đ, nguồn nhận tăng 1.000.000đ, chi tiêu tăng 5.000đ. Phí là khoản chi liên kết với lần chuyển; nhập cùng form, lưu/sửa/hoàn tác như một nhóm nhất quán.

Chuyển giữa những tài khoản thuộc chính người dùng mới là chuyển nội bộ. Trả tiền người bán là chi; chuyển cho người khác có thể là chi hoặc nghiệp vụ khác theo mục đích, không tự coi mọi giao dịch ngân hàng là chuyển nội bộ.

**6. Thẻ tín dụng và dư nợ**

Trong dữ liệu, số dư thẻ có dấu: nợ 3 triệu là −3 triệu. Mua hàng làm giảm số dư thẻ; trả thẻ làm tăng số dư thẻ về 0. Giao diện diễn đạt “Đang nợ 3.000.000đ”, tránh buộc người dùng tự giải nghĩa dấu âm.

Hạn mức là thông tin riêng, không cộng vào tài sản. Hạn mức còn lại theo Tally chỉ là ước tính dựa trên giao dịch đã ghi. Cảnh báo số dư âm/vượt hạn mức nhưng vẫn cho ghi nhận giao dịch thực tế vì dữ liệu có thể chưa đầy đủ. Cho phép trả dư và số dư có trên thẻ.

Dư nợ hiện tại khác dư nợ sao kê. Cần lưu từng kỳ: ngày chốt, hạn trả thực tế, số tiền sao kê, số tối thiểu nếu người dùng nhập, và các khoản trả đã gắn vào kỳ. Chỉ có ngày trong tháng chưa đủ vì hạn thực tế có thể được điều chỉnh. Trả một phần phải giảm phần còn phải thanh toán; sửa/xóa khoản trả cập nhật kỳ liên quan. Không tự coi hoàn tiền là khoản trả tối thiểu khi chưa có thông tin sao kê.

Ghi lãi/phí thực tế thành chi. Không tự tính lãi và nghĩa vụ sao kê từ một công thức chung cho mọi ngân hàng. Rút tiền mặt từ thẻ là chuyển thẻ → tiền mặt; phí rút là chi riêng.

Phạm vi “dư nợ” trong đề xuất này là dư nợ thẻ. Khoản vay trả góp, thế chấp và lịch khấu hao khoản vay là một mô hình khác, chưa được đưa vào phạm vi triển khai này.

**7. Tiền tệ phổ biến và tỷ giá**

Danh sách khởi đầu đề xuất: **VND, USD, EUR, GBP, JPY, KRW, SGD, THB, AUD, CAD**. Đây là lựa chọn phạm vi, không phải bảng xếp hạng mức phổ biến; nó tái sử dụng đúng tập tiền tệ subscription hiện có. Danh mục tiền tệ phải tập trung để bổ sung CNY hoặc đồng khác mà không đổi cấu trúc sổ giao dịch.

Mỗi nguồn giữ một tiền tệ. Một tài khoản thực có nhiều số dư ngoại tệ được biểu diễn bằng các nguồn con như “Wise USD”, “Wise EUR”. Không đổi currency của nguồn đã có lịch sử. VND là tiền tệ báo cáo mặc định. Nếu về sau cho đổi tiền tệ báo cáo, cần giữ nguyên số gốc và tính lại có chủ ý với tỷ giá theo ngày; không đổi nhãn đơn vị trên số đã lưu.

Phân biệt ba lớp số tiền:

1. Giá gốc người bán, ví dụ subscription 20 USD.
2. Số tiền thực ghi vào tài khoản, ví dụ 530.000 VND trên thẻ.
3. Giá trị quy đổi dùng trong báo cáo, cùng tỷ giá/ngày/nguồn quy đổi.

Khi thanh toán subscription ngoại tệ qua thẻ VND, 530.000 VND thực tế mới là tác động lên dư nợ. Giá 20 USD giữ để tham chiếu. Phí chỉ tách riêng nếu có thông tin thực tế; tránh vừa dùng tổng tiền đã gồm phí vừa cộng phí thêm lần nữa.

Đổi ngoại tệ nhập cả số gửi và số nhận: 100 USD → 2.500.000 VND. App suy ra tỷ giá thực hiện, không đòi hai số bằng nhau. Phần chênh với tỷ giá tham khảo không tự bị gán là phí hoặc thu nhập; phí phải có bằng chứng người dùng nhập.

Thu/chi quá khứ dùng giá trị quy đổi đã chốt theo giao dịch. Tổng tài sản hiện tại có thể dùng tỷ giá cập nhật riêng. Cập nhật tỷ giá định giá không thay số tiền gốc hay chi tiêu tháng trước. Biểu đồ tài sản lịch sử, nếu xây, cần tỷ giá theo thời điểm và tách chênh lệch định giá.

Bản đầu cho nhập/xác nhận tỷ giá thủ công và lưu lại để dùng khi offline. Nếu thiếu tỷ giá, ghi được giao dịch gốc nhưng phải đánh dấu “Chưa quy đổi”; tổng chỉ là phần đã quy đổi, không mặc định 1:1 hoặc âm thầm bỏ số dư. Tỷ giá tự động là cải tiến tiếp theo cần chọn nguồn, điều kiện dùng, cache và mức cập nhật trước khi cam kết.

**8. Mô hình dữ liệu đề xuất**

Nâng lên FinanceDataV4 với một sổ sự kiện có loại rõ ràng. Đây là phác thảo kiến trúc, chưa phải schema cuối cùng.

| Thành phần | Trường/ràng buộc chính |
| --- | --- |
| Account | id, tên, kind: cash/bank/e-wallet/credit-card/legacy, currency, số dư mở đầu có dấu, mốc mở đầu, archivedAt; metadata thẻ nếu có |
| Money | amountMinor nguyên an toàn, currency; quy tắc số chữ số thập phân theo tiền tệ |
| Income / Expense | accountId, số tiền, ngày ghi nhận, danh mục phù hợp, số gốc người bán tùy chọn, giá trị quy đổi lịch sử |
| Refund | nguồn nhận, số tiền, ngày hoàn, danh mục và liên kết giao dịch mua nếu có; giảm chi chứ không mặc định tăng thu |
| Transfer | một id, fromAccountId, toAccountId, số gửi và số nhận, ngày; metadata mục đích trả thẻ/đổi tiền; liên kết phí |
| Balance adjustment / Setup | tác động có dấu, ngày, lý do, nhóm thiết lập; không đi vào thu/chi |
| Subscription | nguồn thanh toán mặc định; mỗi lần thanh toán giữ nguồn và số thực tế riêng |
| Card statement | kỳ sao kê, hạn trả, dư nợ sao kê, tối thiểu tùy chọn, liên kết các lần trả |
| FX snapshot / Valuation quote | cặp tiền tệ, tỷ giá dạng thập phân chính xác, ngày, nguồn; tách tỷ giá giao dịch khỏi tỷ giá định giá |

Không lưu một currentBalance để sửa độc lập với lịch sử. Số dư được suy từ số mở đầu và tác động của sổ sự kiện. Transfer là một thực thể; hai tác động tài khoản được suy ra khi tính và hiển thị. Cách này tránh mất một nửa cặp giao dịch. Nếu về sau ngân hàng cần hai ngày hạch toán khác nhau, mở rộng thêm trạng thái đang chuyển và ngày từng phía.

VND/JPY/KRW sử dụng số nguyên đơn vị tiền; các đồng còn lại trong tập hiện tại dùng đơn vị nhỏ nhất như cent. Dùng phép toán thập phân chính xác hoặc tỷ lệ nguyên cho FX, với quy tắc làm tròn duy nhất. Kiểm tra cả giới hạn của tổng và phép quy đổi, không chỉ từng số nhập.

Tách rõ hàm lấy tác động số dư và hàm phân loại báo cáo; không dùng dấu số tiền để suy mọi nghiệp vụ. Sổ chung vẫn cung cấp dữ liệu cho nguồn, ngân sách, thu/chi và subscription.

**9. Chuyển dữ liệu cũ: phần cần làm cẩn thận nhất**

Không thể biết giao dịch cũ dùng ngân hàng hay tiền mặt vì Tally chưa lưu thông tin đó. Không tự đoán từ tên giao dịch.

Migration kỹ thuật v1/v2 → v3 chuẩn hóa → v4 trước tiên tạo “Dữ liệu trước đây”, giữ số dư ban đầu cũ, toàn bộ giao dịch, ID, danh mục, liên kết subscription và thu/chi lịch sử. Mốc đầu kỳ cũ không được bịa thành hôm nay. Người dùng vẫn mở app được khi chưa thiết lập nguồn.

Luồng thiết lập sau migration cần thu thập **tất cả số dư có dấu tại cùng mốc**, bao gồm tiền mặt/ngân hàng/ngoại tệ và dư nợ thẻ. Xem trước tổng quy đổi S, tổng cũ C và chênh lệch S−C.

Sau khi người dùng lưu thiết lập, một nhóm thao tác duy nhất đưa số dư nguồn lịch sử tại mốc đó về 0 và ghi số mở đầu của các nguồn thực tế. Chênh lệch là “Chênh lệch thiết lập”, không phải thu nhập/chi tiêu. Nếu S=C thì đây chỉ là phân nguồn; nếu khác thì app giải thích khoản điều chỉnh trước khi lưu. Giữ bản sao trước chuyển đổi.

Ví dụ cũ Tally còn 7 triệu vì đã ghi mua bằng thẻ 3 triệu; thực tế ngân hàng có 10 triệu và đang nợ thẻ 3 triệu. Thiết lập đúng cho tài sản ròng 7 triệu. Chia 7 triệu vào ngân hàng rồi thêm nợ 3 triệu sẽ tạo kết quả sai 4 triệu. Cũng không được giữ 7 triệu cũ và cộng thêm toàn bộ nguồn mới.

Lịch sử trước mốc vẫn xem được toàn bộ, nhưng không tuyên bố biết nguồn thật. Việc gán lại lịch sử cũ cần một luồng xem trước tác động đến số mở đầu và số dư hiện tại; không bật bulk reassignment tùy tiện ở bản đầu.

Nếu sửa số tiền của giao dịch cũ sau thiết lập, phần chênh lệch có thể xuất hiện lại ở “Dữ liệu trước đây”. Luôn hiện phần dư này để người dùng đối chiếu; không tự đẩy nó sang một ngân hàng hoặc tự sửa số mở đầu. Nguồn được lưu trữ không bị loại khỏi tổng lịch sử; phần dư khác 0 phải được nhìn thấy.

Với nguồn mới bắt đầu ở số dư hiện tại, giao dịch trước mốc không được tự cộng thêm vào snapshot. Cần luồng điều chỉnh mốc và số mở đầu có xem trước. Định nghĩa mốc đầu ngày và các giao dịch trong ngày phải rõ; không suy thứ tự theo ID ngẫu nhiên.

**10. Subscription, tính toàn vẹn và lưu trữ**

Subscription có nguồn thanh toán mặc định. Đổi mặc định chỉ áp dụng các kỳ sau; giao dịch đã ghi giữ nguồn và số tiền thực tế. Bấm “Đã thanh toán” mở form ngắn có nguồn, số thực trả và ngày. Đến hạn chỉ là dự kiến, không tự trừ tiền hoặc tăng nợ.

Khóa ghi trùng phải gắn với kỳ mà người dùng đang xác nhận: subscriptionId + occurrenceDate. Code hiện kiểm tra cặp này, nhưng nếu gọi hai lần liên tiếp sau khi nextRenewal đã tăng thì có thể ghi cả kỳ kế tiếp. Cần truyền kỳ dự kiến vào thao tác, đọc trạng thái mới nhất khi commit và không để nhấp đôi tự trả trước kỳ sau.

Các điểm hiện có cần xử lý trong cùng phần nền tảng:

- Parser chưa kiểm tra đầy đủ hai chiều liên kết payment/transaction và sự nhất quán số tiền. Thay số tiền hoặc nguồn của khoản trả phải cập nhật cả dữ liệu liên quan.
- Undo hiện khôi phục toàn bộ snapshot ở app/finance-app.tsx:486. Khi dữ liệu đã cập nhật từ tab khác mà thông báo Undo vẫn còn, Undo cũ có thể làm mất cập nhật đó. Dùng thao tác đảo cho đúng nhóm bị sửa; nếu xung đột thì yêu cầu xử lý cụ thể.
- Dữ liệu tương lai có thể qua import dù form không cho nhập, và phép tính tổng hiện cộng chúng. V4 cần quy tắc as-of thống nhất; migration phải hiển thị tác động nếu dữ liệu cũ thuộc trường hợp này.
- Tab cũ đang mở có thể ghi đè vì storage event hiện không xử lý future-version. Nên dùng khóa V4 riêng, nhập từ khóa cũ một lần và giữ nguyên bản gốc; không tạo cầu nối hai chiều giữa hai định dạng.
- Một lần ghi JSON giữ nguyên khối transfer, nhưng không giải quyết hai tab cùng sửa. Cần cơ chế commit có khóa và kiểm tra revision/đọc trạng thái mới nhất; không chỉ thêm trường revision rồi vẫn ghi last-writer-wins. Có thể dùng kho IndexedDB với transaction nếu triển khai cả lớp lưu trữ.

Ẩn nguồn khỏi trang chủ, lưu trữ nguồn và loại dữ liệu khỏi báo cáo là ba ý nghĩa khác nhau. Bản đầu không cần tùy chọn loại nguồn khỏi tài sản ròng. Chỉ xóa hẳn nguồn trống, không liên kết; nguồn có lịch sử dùng lưu trữ. Trước khi đóng nguồn có số dư hoặc subscription đang dùng, giải quyết số dư và đổi nguồn thanh toán. Số dư nguồn lưu trữ vẫn có giá trị trong các phép tính thích hợp.

**11. Trình tự triển khai đề xuất**

| Bước | Kết quả cần có trước khi sang bước tiếp |
| --- | --- |
| 1. Nền tảng domain | Account, Money, loại sự kiện, FX lịch sử, thẻ có dấu, quy tắc báo cáo và bộ kiểm thử số học; đã bao gồm yêu cầu thẻ/ngoại tệ trong schema. |
| 2. Migration và persistence | Nhập được backup v1–v3, thiết lập số dư có xem trước, bảo toàn lịch sử, không nhân đôi tiền, ghi nhóm nguyên tử và xử lý Undo/xung đột. |
| 3. Nguồn và giao dịch | Tạo/sửa/lưu trữ nguồn, nguồn thanh toán trên giao dịch, chuyển tiền cùng/khác currency, phí, hoàn tiền, đối chiếu số dư. |
| 4. Thẻ và subscription | Mua/trả thẻ, dư nợ/sao kê, thanh toán một phần, phí/lãi thực, nguồn thanh toán và số thực trả của subscription. |
| 5. Tổng quan và báo cáo | Tiền đang có/nợ/tài sản ròng, bộ lọc nguồn, thu/chi khác biến động tiền, FX thiếu/cũ, EN/VI, mobile và backup hoàn chỉnh. |

Đây là thứ tự xây một phạm vi thống nhất, không phải loại thẻ và ngoại tệ khỏi yêu cầu. Có thể thử luồng với dữ liệu mẫu theo từng bước; phát hành cho dữ liệu thật sau khi migration và kiểm thử toàn chuỗi đã đạt.

Tỷ giá tự động, kết nối ngân hàng, đồng bộ thiết bị và mô hình vay trả góp chưa cần để hoàn thành phạm vi này. Chưa nên cam kết thời gian cụ thể trước khi chốt thiết kế migration, sao kê và lớp lưu trữ.

**12. Tiêu chí kiểm chứng trước phát hành**

1. Tiền mặt + ba ngân hàng: tổng bằng tổng thành phần; mở từng nguồn cho đúng lịch sử.
2. Chuyển cùng currency giữ tổng tài sản/thu chi; phí chỉ tính một lần. Sửa, xóa và Undo cập nhật toàn nhóm.
3. Mua bằng thẻ rồi trả thẻ: chỉ một lần chi; trả một phần và trả dư hoạt động; hạn mức không vào tiền đang có.
4. Hoàn tiền toàn bộ/một phần trả về đúng danh mục, đúng ngày, giảm nợ hoặc tạo số dư có hợp lệ.
5. Sao kê và dư nợ hiện tại khác nhau; trả một phần cập nhật đúng kỳ, Undo không mất khoản chi mới.
6. Chuyển USD ↔ VND giữ đúng hai số gốc và phí; phép làm tròn ổn định qua lưu/đọc lại.
7. Tỷ giá mới thay định giá hiện tại, không đổi chi tiêu đã chốt; tỷ giá thiếu không biến thành 0 hoặc 1:1.
8. Subscription ngoại tệ qua ngân hàng/thẻ VND ghi đúng số thực trả; nhấp đôi chỉ ghi một kỳ; đổi nguồn không sửa lịch sử.
9. Backup v1/v2/v3 → v4 giữ ID, danh mục và thu/chi cũ; thiết lập có nợ không nhân đôi hoặc trừ nợ hai lần.
10. Sửa lịch sử trước mốc làm phần dư có thể giải thích được; nguồn lưu trữ không làm biến mất tiền hoặc lịch sử.
11. Nhập bản sao sai tham chiếu, currency hoặc số tiền bị từ chối có thông báo; không ghi đè dữ liệu tốt.
12. Nhiều tab, hết dung lượng lưu và reload giữa thao tác không để mất một phía chuyển tiền hoặc ghi đè thay đổi mà người dùng không biết.

Kiểm tra UX bằng kịch bản: người dùng xác định được nguồn nào thiếu tiền cho kỳ gia hạn; ghi chi không phải chọn lại nguồn liên tục; phân biệt mua bằng thẻ với trả thẻ; đọc được số gốc và số quy đổi. Đây là tiêu chí đánh giá, chưa phải kết quả thử nghiệm với người dùng thật.

**Khuyến nghị quyết định:** phát triển “Nguồn tiền” thành lớp trung tâm của Tally, giữ thao tác hàng ngày gọn, đồng thời làm đúng nghiệp vụ thẻ và ngoại tệ từ nền tảng. Điểm khác biệt đáng đầu tư nhất là biết khoản định kỳ sắp tới sẽ dùng nguồn nào và nguồn đó hiện có tiền hay đang mang dư nợ.
