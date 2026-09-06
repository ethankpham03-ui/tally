# Tally V4 — Nguồn tiền, thẻ và tiền tệ

Cập nhật: 06/09/2026. Tài liệu mô tả phần đã triển khai trong repository sau [nghiên cứu ban đầu](./multi-account-research.vi.md). Việc triển khai code và việc phát hành lên website là hai bước riêng; tài liệu này không xác nhận đã deploy.

## Phạm vi

Người dùng quản lý tiền mặt, tài khoản ngân hàng, ví điện tử và thẻ tín dụng ngay trong trình duyệt. Mỗi nguồn có tiền tệ, số dư mở đầu và lịch sử riêng; tổng quan tách tiền đang có, dư nợ, số dư có trên thẻ và tài sản ròng. Có chuyển tiền/phí, hoàn tiền, đối chiếu, lưu trữ nguồn, sao kê thẻ và nguồn thanh toán subscription.

Hỗ trợ **VND, USD, EUR, GBP, JPY, KRW, SGD, THB, AUD, CAD**. Báo cáo tổng hợp dùng VND; tỷ giá được nhập thủ công. Không có kết nối ngân hàng, lấy tỷ giá tự động, đồng bộ thiết bị, chuyển tiền thật hoặc tự tính lãi theo hợp đồng thẻ.

## Quy tắc phải giữ

| Thao tác | Số dư và báo cáo |
| --- | --- |
| Thu/chi | Tăng/giảm nguồn đã chọn; thu nhập và chi tiêu được tính theo ngày giao dịch. |
| Chuyển nội bộ | Một giao dịch chứa nguồn gửi, nguồn nhận và hai số tiền gốc. Không tính là thu nhập hoặc chi tiêu. Phí là khoản chi liên kết riêng, trừ thêm từ nguồn gửi. |
| Mua bằng thẻ | Ghi chi ngay khi mua; số dư thẻ giảm, dư nợ tăng. Tiền ngân hàng chưa giảm. |
| Trả nợ thẻ | Chuyển từ nguồn trả sang thẻ. Giảm tiền đang có và giảm nợ; không tính chi lần hai. |
| Hoàn tiền | Ghi số dương vào nguồn nhận, giảm chi của danh mục tương ứng. Hoàn sau khi trả hết thẻ có thể tạo số dư có. |
| Sao kê | Là thông tin nghĩa vụ thanh toán, không tạo giao dịch chi. Chỉ khoản trả được gắn với kỳ mới giảm số còn phải trả của kỳ đó. |
| Hạn mức | Thông tin tham chiếu, không phải tài sản. Hạn mức còn lại theo sổ chỉ là ước tính. |
| Đối chiếu | Ghi điều chỉnh có ngày và lý do; không sửa số dư mở đầu của nguồn đã có lịch sử, không giả thành thu/chi. |
| Lưu trữ | Giữ số dư và lịch sử trong phép tính; chặn giao dịch mới. Cần đưa số dư về 0 và đổi nguồn cho subscription trước khi lưu trữ. Chỉ xóa nguồn trống, không tham chiếu. |

**Chi tiêu khác biến động tiền.** Biểu đồ thu/chi ghi khoản mua bằng thẻ; biểu đồ biến động tiền ghi khoản trả thẻ khi tiền ngân hàng thực rời đi. Chuyển giữa các nguồn tiền mặt/ngân hàng/ví điện tử không làm tăng tổng dòng vào/ra. Số dư mở đầu và kết chuyển thiết lập không phải dòng tiền; điều chỉnh đối chiếu thật được tách riêng. Giao dịch tương lai có sẵn trong backup được giữ nhưng chưa vào số dư, ngân sách hay biểu đồ hiện tại; form chỉ ghi ngày đã phát sinh.

Ví dụ: ngân hàng 10 triệu và dư nợ thẻ 3 triệu tương ứng tài sản ròng 7 triệu. Mua thêm 1 triệu bằng thẻ làm nợ thành 4 triệu, chi tăng 1 triệu. Trả thẻ 2 triệu làm ngân hàng còn 8 triệu, nợ còn 2 triệu; tổng chi vẫn chỉ tăng 1 triệu.

## Tiền tệ và lịch sử

- Số tiền trong sổ giao dịch và số dư nguồn dùng số nguyên theo đơn vị nhỏ nhất: USD 12,34 lưu `1234`; VND, JPY, KRW không có phần thập phân. Giá subscription vẫn là giá dịch vụ theo đơn vị hiển thị và được đổi sang đơn vị nhỏ nhất khi ghi thanh toán.
- Phép cộng và quy đổi dùng số nguyên/ tỷ lệ thập phân; từ chối tràn giới hạn số nguyên an toàn, kể cả tổng lịch sử và số dư tương lai. Nhập số không có dấu phân nhóm, dùng dấu chấm cho phần thập phân.
- Mỗi nguồn giữ một currency. Khi đã có lịch sử, không đổi nhãn currency để biến toàn bộ số tiền sang đơn vị khác.
- Chuyển 100 USD → 2.500.000 VND lưu cả `10000` và `2500000`; không ép hai phía bằng nhau. Phí dùng currency của nguồn gửi. Không suy đoán chênh lệch với tỷ giá thị trường là phí.
- Giao dịch giữ số thực ghi nợ/có vào nguồn, giá gốc của người bán nếu có và giá trị VND lịch sử. Khi dùng tỷ giá, snapshot giữ ngày, tỷ giá và ghi chú nguồn; khi biết số VND thực tế có thể lưu trực tiếp số đó.
- Thay tỷ giá hiện tại hoặc chỉ sửa mô tả không đổi giá trị lịch sử. Số dư hiện tại quy đổi bằng tỷ giá có ngày thích hợp và có nhãn ước tính. Thiếu tỷ giá được hiển thị là chưa quy đổi/tổng chưa đầy đủ, không mặc định 1:1; thêm tỷ giá sau không âm thầm tính lại giao dịch chưa quy đổi trước đó.

Subscription USD 20 trả bằng thẻ VND thực trừ 530.000đ được ghi thành chi thẻ 530.000đ và giữ giá gốc USD 20. Khóa `subscriptionId + occurrenceDate` ngăn ghi trùng kỳ đang xác nhận. Đổi nguồn mặc định chỉ ảnh hưởng lần thanh toán sau; xóa khoản đã trả chỉ lùi lịch gia hạn khi đó là kỳ phù hợp cuối cùng.

## Thiết lập và nâng cấp dữ liệu

Nhập **tất cả nguồn và dư nợ tại cùng một ngày**. Số dư mở đầu là số đầu ngày, trước các giao dịch sẽ ghi vào nguồn mới từ ngày đó; không nhập số cuối ngày rồi ghi lại các khoản đã nằm trong số đó. Màn thiết lập cho xem tổng trước đây, tài sản ròng mới và chênh lệch, yêu cầu tỷ giá cho số dư ngoại tệ cần quy đổi.

Backup v1–v3 được chuyển thành V4, giữ giao dịch cũ trong “Dữ liệu trước đây” vì chưa biết nguồn thực tế. Thiết lập đóng số dư nguồn cũ bằng điều chỉnh riêng và tạo các nguồn mới; không ghi lại dư nợ mở đầu thành chi phí. Vì vậy số cũ 7 triệu, ngân hàng mới 10 triệu và thẻ −3 triệu vẫn cho tài sản ròng 7 triệu. Nguồn subscription cũ không được tự đoán; người dùng chọn khi thiết lập thanh toán.

Nếu sửa giao dịch cũ sau thiết lập, phần số dư phát sinh lại ở nguồn lịch sử được hiển thị để đối chiếu; không âm thầm đổi số dư mở đầu ngân hàng/thẻ mới. Các bút toán thiết lập không đi vào thu/chi hoặc biểu đồ biến động tiền.

## Lưu trữ và xung đột

| Khóa localStorage | Vai trò |
| --- | --- |
| `tally-finance-v4` | Sổ V4 đang dùng, có revision. |
| `tally-finance-v1` | Bản gốc của schema v1–v3; V4 không ghi đè. |
| `tally-finance-v1-backup-before-v4` | Bản sao nguyên văn được ghi và kiểm tra trước lần lưu migration đầu tiên. |

Đọc dữ liệu không tự ghi. Dữ liệu hỏng, rỗng bất thường hoặc phiên bản mới hơn chặn ghi; không thay bằng demo. Nếu không ghi được backup hoặc sổ mới thì báo lỗi và giữ dữ liệu gốc. Nếu khóa V4 đã có dữ liệu thì không quay lại lấy khóa cũ, kể cả tab cũ tiếp tục thay đổi khóa đó.

Commit kiểm tra revision cùng snapshot đã đọc dưới Web Locks khi có. Hai tab cùng sửa không được âm thầm đè lên nhau; UI chỉ nhận trạng thái đã lưu sau commit thành công. Khi thiếu Web Locks, localStorage chỉ cho kiểm tra xung đột theo khả năng tốt nhất, không bảo đảm khóa nguyên tử giữa các tab. Undo cũng phải từ chối snapshot cũ sau thay đổi khác.

Đặt lại dữ liệu trong ứng dụng chỉ thay sổ hiện tại, vẫn giữ bản gốc và backup migration. Muốn xóa toàn bộ bản lưu trên trình duyệt phải xóa dữ liệu trang; các file JSON đã xuất là bản riêng. Chi tiết tại [PRIVACY.md](../PRIVACY.md).

## Kiểm tra trước phát hành

Các kiểm thử nghiệp vụ ở [finance-v4.test.ts](../tests/finance-v4.test.ts), tranh chấp/lỗi lưu ở [finance-storage.test.ts](../tests/finance-storage.test.ts). Chạy kiểm tra repository:

```sh
npm run typecheck
npm run lint
npm test
npm run build
```

Checklist dưới đây là kịch bản QA, không phải tuyên bố mọi bước đã được kiểm tra trên website công khai. Dùng profile trình duyệt/dữ liệu thử riêng, không ghi đè dữ liệu cá nhân.

| Kịch bản | Kết quả cần kiểm tra |
| --- | --- |
| Thiết lập tiền mặt và ba ngân hàng | Tổng bằng tổng các nguồn; thêm chi từ chi tiết nguồn chọn đúng nguồn. |
| Nâng cấp số dư 7 triệu → ngân hàng 10 triệu/thẻ −3 triệu | Tài sản ròng 7 triệu, giữ báo cáo cũ; reload giữ dữ liệu và backup nguyên văn. |
| Chuyển 2 triệu, phí 5.000đ; sửa/xóa/Undo | Nguồn gửi giảm 2.005.000đ, nguồn nhận tăng 2 triệu; chi chỉ tăng 5.000đ; cả nhóm thay đổi cùng nhau. |
| Mua bằng thẻ, trả một phần, hoàn tiền | Chi không tính hai lần; số dư có hợp lệ; refund giảm danh mục đúng ngày. |
| Sao kê 2 triệu, trả gắn kỳ 500.000đ | Kỳ còn 1,5 triệu; khoản trả không gắn kỳ không tự giảm con số này. |
| USD ↔ VND, thay tỷ giá và sửa mô tả | Hai số gốc giữ đúng; số dư hiện tại có thể đổi, lịch sử thu/chi và dòng tiền đã chốt giữ nguyên. |
| Ngoại tệ chưa có tỷ giá | Thấy khoản chưa quy đổi/tổng chưa đầy đủ; ghi giá trị VND lịch sử có chủ ý nếu cần bổ sung. |
| Subscription USD qua thẻ VND, nhấp xác nhận hai lần | Một khoản chi theo số thực trả, một kỳ gia hạn; nguồn cũ của khoản đã trả không đổi khi sửa default. |
| Hai tab sửa cùng dữ liệu; Undo sau cập nhật từ tab kia | Báo xung đột, không phục hồi snapshot cũ đè dữ liệu mới. |
| Dữ liệu hỏng/phiên bản mới, lỗi quota, import sai tham chiếu | Không ghi đè sổ đang có; lỗi hiển thị và form chưa coi là đã lưu. |
| EN/VI, sáng/tối, màn 360–430px và bàn phím | Đọc được tiền tệ/số dư, dialog không tràn ngang, focus/Escape đúng, lưu thất bại không đóng form. |

## Bằng chứng QA ngày 06/09/2026

Đã kiểm tra bằng trình duyệt trong môi trường phát triển local, với dữ liệu tổng hợp:

| Kiểm tra đã thực hiện | Kết quả quan sát |
| --- | --- |
| Giao diện tiếng Việt, desktop rộng 1440px và mobile 390px; chế độ sáng/tối | Đã xem các bề mặt nguồn tiền và dialog ở các kích thước/chế độ này. |
| Ngân hàng → thẻ 1.000.000đ, phí 5.000đ | Tiền ngân hàng giảm 1.005.000đ; dư nợ giảm 1.000.000đ; tài sản ròng giảm 5.000đ và chi tiêu tăng 5.000đ. |
| Nguồn USD 100,25, ghi chi USD 1,25 khi chưa có tỷ giá | Số dư gốc còn USD 99,00; thiếu tỷ giá được hiển thị, không giả định quy đổi VND. |
| Reload sau khi ghi dữ liệu | Các thay đổi đã lưu vẫn còn. |
| Tab thứ hai ghi chi 2.000đ trong khi tab đầu đang mở form | Form cũ bị từ chối lưu do dữ liệu đã thay đổi; không ghi đè khoản chi mới. |

Dữ liệu tổng hợp của lượt kiểm tra đã được đặt lại về demo. Lượt chốt `npm run check` đạt: TypeScript, ESLint, **76/76 kiểm thử** và production build, bao gồm các ca số dư mở đầu và nguồn mở giữa kỳ. Build còn cảnh báo kích thước chunk lớn hơn 500 kB; chưa thực hiện đo hiệu năng trên thiết bị thật. Nhật ký local ở `outputs/v4-validation.log` (không đưa vào Git).

Rà soát giao diện độc lập đã xác nhận sửa xong lỗi ngày giao dịch bị ẩn trên mobile và chốt `ship` cho phạm vi ảnh được kiểm tra. Ảnh QA nằm trong `.impeccable/review/`. Đây là bằng chứng local; chưa triển khai lên website.

## Điểm vào code

[money.ts](../app/money.ts) xử lý đơn vị tiền và tỷ lệ; [finance-v4.ts](../app/finance-v4.ts) giữ schema, nghiệp vụ và phép tính; [finance-storage.ts](../app/finance-storage.ts) giữ migration lưu trữ và commit. [accounts-ui.tsx](../app/accounts-ui.tsx) chứa luồng nguồn tiền; [finance-app.tsx](../app/finance-app.tsx) tích hợp sổ, subscription và báo cáo. [finance-domain.ts](../app/finance-domain.ts) tiếp tục phục vụ tương thích dữ liệu cũ.
