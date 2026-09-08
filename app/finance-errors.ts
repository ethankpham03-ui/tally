import type { Locale } from './i18n';

/** Domain errors remain diagnostic in code; the interface supplies actionable local copy. */
export function financeError(error: unknown, locale: Locale): string {
  const message = error instanceof Error ? error.message : String(error);
  if (locale === 'en') return message;
  if (/[À-ỹ]/u.test(message)) return message;
  const text = message.toLowerCase();
  if (/another tab|ledger.*changed|revision/.test(text)) return 'Dữ liệu đã thay đổi ở tab khác. Kiểm tra bản mới rồi lưu lại.';
  if (/refund/.test(text)) return 'Kiểm tra khoản hoàn tiền: cần liên kết với khoản chi đúng nguồn, cùng tiền tệ và không vượt số tiền đã mua.';
  if (/archiv/.test(text)) return 'Nguồn này đã lưu trữ hoặc còn số dư/liên kết. Mở lại nguồn hoặc xử lý số dư và nguồn thanh toán trước.';
  if (/opening|before.*date|historical|legacy|setup/.test(text)) return 'Giao dịch liên quan đến số dư mở đầu hoặc dữ liệu cũ. Hãy vào Nguồn tiền để đối chiếu mốc và số dư trước khi sửa.';
  if (/same-currency|different accounts|transfer/.test(text)) return 'Chọn hai nguồn khác nhau. Chuyển cùng tiền tệ cần số gửi bằng số nhận; hãy sửa cả lần chuyển và phí cùng nhau.';
  if (/statement|minimum/.test(text)) return 'Kiểm tra kỳ sao kê, nguồn thẻ, hạn thanh toán và số tiền. Khoản trả cần thuộc đúng thẻ của kỳ sao kê.';
  if (/currency|exchange|rate|decimal|minor|amount|integer|money|overflow/.test(text)) return 'Kiểm tra số tiền và tỷ giá: dùng số hợp lệ, đúng số chữ số thập phân của tiền tệ và trong giới hạn cho phép.';
  if (/posted/.test(text)) return 'Chọn ngày đã phát sinh hợp lệ, không sau hôm nay.';
  if (/date/.test(text)) return 'Chọn ngày giao dịch hợp lệ.';
  if (/account|source/.test(text)) return 'Chọn nguồn tiền hợp lệ. Nguồn đang có giao dịch hoặc khoản định kỳ cần được xử lý trước khi xóa.';
  if (/payment|subscription|occurrence/.test(text)) return 'Kỳ thanh toán đã thay đổi hoặc liên kết chưa hợp lệ. Kiểm tra lịch sử và chọn lại kỳ cần ghi nhận.';
  if (/category/.test(text)) return 'Chọn danh mục hợp lệ cho giao dịch hoặc ngân sách.';
  if (/not found|missing/.test(text)) return 'Mục này không còn trong dữ liệu hiện tại. Đóng biểu mẫu rồi mở lại từ danh sách.';
  return 'Không thể lưu thay đổi. Kiểm tra nguồn tiền, số tiền và ngày; dữ liệu trước đó vẫn được giữ.';
}
