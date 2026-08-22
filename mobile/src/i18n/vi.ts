import type { TranslationKey } from '@/i18n/en';

/**
 * `Record<TranslationKey, string>` rather than `typeof en` is what makes this
 * drift-proof the same way LOCALES/SUPPORTED_CURRENCIES are: omit a key here
 * and this fails to compile, the same way a missing Locale or currency does.
 * Tab labels and the Expenses subtitle/period strings are copied verbatim
 * from the design's Vietnamese screens (mobile/CONTEXT.md's design source of
 * truth) rather than re-translated.
 */
export const vi: Record<TranslationKey, string> = {
  'common.close': 'Đóng',
  'common.done': 'Xong',
  'common.cancel': 'Hủy',
  'common.back': 'Quay lại',

  'like.like': 'Thích',
  'like.unlike': 'Bỏ thích',

  'block.action': 'Chặn',
  'block.confirmTitle': 'Chặn {name}?',
  'block.confirmMessage':
    'Cả hai sẽ không còn thấy nội dung của nhau ở bất kỳ đâu, và tình bạn giữa hai người (nếu có) sẽ kết thúc. Họ sẽ không nhận được thông báo nào.',
  'block.confirm': 'Chặn',

  'tab.expenses': 'Chi tiêu',
  'tab.leaderboard': 'Xếp hạng',
  'tab.feed': 'Bảng tin',
  'tab.profile': 'Hồ sơ',

  'logButton.accessibilityLabel': 'Ghi chi tiêu',

  'expenses.subtitle': 'Nhật ký của bạn · mọi chế độ hiển thị',
  'statistics.periodToggle.week': 'Tuần này',
  'statistics.periodToggle.month': 'Tháng này',
  'statistics.overline.total': 'TỔNG',
  'statistics.delta.lessThanWeek': 'ít hơn tuần trước',
  'statistics.delta.lessThanMonth': 'ít hơn tháng trước',
  'statistics.delta.moreThanWeek': 'nhiều hơn tuần trước',
  'statistics.delta.moreThanMonth': 'nhiều hơn tháng trước',
  'expenses.recent': 'Gần đây',
  'expenses.empty.title': 'Chưa có khoản chi nào',
  'expenses.empty.note':
    'Nhấn nút ghi chi tiêu bên dưới để thêm khoản đầu tiên.',
  'expenses.retry': 'Thử lại',
  'leaderboard.subtitle': 'Chi tiêu có thể chia sẻ của bạn bè',
  'leaderboard.retry': 'Thử lại',
  'leaderboard.addFriend.title': 'Thêm bạn bè',
  'leaderboard.addFriend.label': 'Tên người dùng',
  'leaderboard.addFriend.placeholder': 'minhtran',
  'leaderboard.addFriend.submit': 'Gửi lời mời kết bạn',
  'leaderboard.addFriend.sent': 'Đã gửi lời mời kết bạn.',
  'leaderboard.requests.incomingOverline': 'LỜI MỜI KẾT BẠN · {count}',
  'leaderboard.requests.outgoingOverline': 'ĐÃ GỬI · {count}',
  'leaderboard.request.incomingSubtitle': '@{username} muốn so sánh chi tiêu',
  'leaderboard.request.outgoingSubtitle': 'Đang chờ @{username} chấp nhận',
  'leaderboard.request.accept': 'Chấp nhận',
  'leaderboard.request.decline': 'Từ chối',
  'leaderboard.request.cancel': 'Hủy lời mời',
  'leaderboard.friends.unfriend': 'Hủy kết bạn',
  'leaderboard.friends.unfriendConfirmTitle': 'Hủy kết bạn với {name}?',
  'leaderboard.friends.unfriendConfirmMessage':
    'Họ sẽ không còn thấy khoản chi Chỉ bạn bè của bạn, và bạn cũng không còn thấy khoản chi của họ.',
  'leaderboard.friends.unfriendConfirm': 'Hủy kết bạn',
  'leaderboard.friends.empty.title': 'Chưa có bạn bè nào',
  'leaderboard.friends.empty.note':
    'Thêm bạn bè bằng đúng @tên người dùng của họ ở trên.',

  'leaderboard.periodBrowser.currentWeek': 'tuần này',
  // "đã qua", not "trước" — the label covers any browsed past period, and
  // "tuần trước"/"tháng trước" would read as specifically last week/month.
  'leaderboard.periodBrowser.pastWeek': 'tuần đã qua',
  'leaderboard.periodBrowser.currentMonth': 'tháng này',
  'leaderboard.periodBrowser.pastMonth': 'tháng đã qua',
  'leaderboard.periodBrowser.previous': 'Kỳ trước',
  'leaderboard.periodBrowser.next': 'Kỳ sau',

  'leaderboard.ranking.overlineCurrentWeek': 'TUẦN NÀY · {count} BẠN BÈ',
  'leaderboard.ranking.overlinePastWeek': 'TUẦN ĐÃ QUA · {count} BẠN BÈ',
  'leaderboard.ranking.overlineCurrentMonth': 'THÁNG NÀY · {count} BẠN BÈ',
  'leaderboard.ranking.overlinePastMonth': 'THÁNG ĐÃ QUA · {count} BẠN BÈ',

  'leaderboard.rankRow.viewerMarker': '(bạn)',
  'leaderboard.rankRow.shareableCaption': 'có thể chia sẻ',
  'leaderboard.rankRow.privacyNote':
    'Chi tiêu riêng tư không bao giờ được tính ở đây',
  'leaderboard.rankRow.viewExpenses': 'Xem khoản chi',

  'feed.subtitle': 'Chi tiêu công khai từ mọi người',
  'feed.retry': 'Thử lại',
  'feed.loadingMore': 'Đang tải thêm',
  'feed.empty.title': 'Bạn đã xem hết bảng tin',
  'feed.empty.note':
    'Các khoản chi công khai mới sẽ xuất hiện ở đây khi mọi người ghi lại.',

  'friendExpenses.subtitle': 'Chi tiêu có thể chia sẻ',
  'friendExpenses.retry': 'Thử lại',
  'friendExpenses.empty.title': 'Chưa có khoản chi nào có thể chia sẻ',
  'friendExpenses.empty.note':
    'Không có khoản chi Chỉ bạn bè hoặc Công khai nào trong khoảng thời gian này.',
  'friendExpenses.notFriends':
    'Bạn không còn là bạn bè với tài khoản này, nên không thể thấy khoản chi của họ.',
  'friendExpenses.notFound': 'Tài khoản này không còn tồn tại.',

  'category.housing': 'Nhà ở',
  'category.food': 'Ăn uống',
  'category.leisure': 'Giải trí',
  'category.investment': 'Đầu tư',
  'category.other': 'Khác',

  'visibility.private': 'Riêng tư',
  'visibility.friendOnly': 'Chỉ bạn bè',
  'visibility.public': 'Công khai',
  'visibility.private.helper':
    'Chỉ mình bạn thấy — không bao giờ rời khỏi nhật ký của bạn.',
  'visibility.friendOnly.helper':
    'Bạn bè có thể thấy khoản này trên Bảng xếp hạng với @{username} của bạn.',
  'visibility.public.helper':
    'Mọi người có thể thấy khoản này trên Bảng tin với @{username} của bạn.',

  'expenseForm.title': 'Khoản chi mới',
  'expenseForm.close': 'Đóng',
  'expenseForm.descriptionLabel': 'Mô tả',
  'expenseForm.descriptionPlaceholder': 'Cà phê với bạn',
  'expenseForm.amountLabel': 'Số tiền',
  'expenseForm.amountHint':
    'Được quy đổi sang {currency} theo tỷ giá hôm nay và giữ nguyên khi lưu',
  'expenseForm.amountLockedHint':
    'Không thể thay đổi số tiền và tiền tệ — hãy xóa và ghi lại để sửa',
  'expenseForm.categoryLabel': 'Danh mục',
  'expenseForm.visibilityLabel': 'Chế độ hiển thị',
  'expenseForm.dateLabel': 'Ngày chi tiêu',
  'expenseForm.submit': 'Lưu khoản chi',

  'expenseForm.editTitle': 'Sửa khoản chi',
  'expenseForm.saveChanges': 'Lưu thay đổi',
  'expenseForm.delete': 'Xóa khoản chi',
  'expenseForm.deleteConfirmTitle': 'Xóa khoản chi này?',
  'expenseForm.deleteConfirmMessage':
    'Khoản chi sẽ biến mất khỏi mọi danh sách và tổng. Không thể hoàn tác.',
  'expenseForm.deleteConfirm': 'Xóa',

  'profile.preferences': 'Tùy chọn',
  'profile.account': 'Tài khoản',
  'profile.preferredCurrency': 'Tiền tệ ưa thích',
  'profile.language': 'Ngôn ngữ',
  'profile.displayName': 'Tên hiển thị',
  'profile.username': 'Tên người dùng',
  'profile.email': 'Email',
  'profile.emailVerification': 'Xác minh email',
  'profile.verified': 'Đã xác minh',
  'profile.unverified': 'Chưa xác minh',
  'profile.safety': 'An toàn',
  'profile.blockedAccounts': 'Tài khoản đã chặn',
  'profile.signOut': 'Đăng xuất',

  'blockedAccounts.title': 'Tài khoản đã chặn',
  'blockedAccounts.count': '{count} tài khoản',
  'blockedAccounts.info':
    'Người bị chặn sẽ biến mất khỏi Bảng tin và Bảng xếp hạng của bạn, và bạn cũng biến mất khỏi Bảng tin và Bảng xếp hạng của họ.',
  'blockedAccounts.retry': 'Thử lại',
  'blockedAccounts.unblock': 'Bỏ chặn',
  'blockedAccounts.empty.title': 'Chưa chặn tài khoản nào',
  'blockedAccounts.empty.note': 'Các tài khoản bạn chặn sẽ xuất hiện ở đây.',

  'verifyEmail.title': 'Xác minh email của bạn',
  'verifyEmail.subtitle':
    'Chúng tôi đã gửi mã 6 chữ số đến {email} khi bạn đăng ký, nên có thể mã đã có sẵn trong hộp thư của bạn. Nhập mã bên dưới để xác minh địa chỉ này.',
  'verifyEmail.codeLabel': 'Mã xác minh',
  'verifyEmail.confirm': 'Xác nhận',
  'verifyEmail.resend': 'Gửi lại mã',
  'verifyEmail.resendCountdown': 'Gửi lại sau {seconds}s',
  'verifyEmail.verifiedTitle': 'Email đã được xác minh',
  'verifyEmail.verifiedNote': 'Địa chỉ email của bạn đã được xác nhận.',

  'auth.or': 'hoặc',

  'auth.signIn.title': 'Chào mừng trở lại',
  'auth.signIn.subtitle':
    'Ghi lại chi tiêu, chỉ so sánh những gì bạn chọn chia sẻ.',
  'auth.signIn.emailLabel': 'Email',
  'auth.signIn.passwordLabel': 'Mật khẩu',
  'auth.signIn.submit': 'Đăng nhập',
  'auth.signIn.missingFields': 'Nhập email và mật khẩu của bạn.',
  'auth.signIn.createAccount': 'Tạo tài khoản',

  'auth.signUp.title': 'Tạo tài khoản của bạn',
  'auth.signUp.subtitle':
    'Chọn một @username — đây là cách bạn bè tìm thấy bạn. Mọi chi tiêu bạn ghi đều bắt đầu ở chế độ Riêng tư.',
  'auth.signUp.displayNameLabel': 'Tên hiển thị',
  'auth.signUp.usernameLabel': 'Tên người dùng',
  'auth.signUp.emailLabel': 'Email',
  'auth.signUp.passwordLabel': 'Mật khẩu',
  'auth.signUp.currencyLabel': 'Tiền tệ ưa thích',
  'auth.signUp.privacyNote':
    'Chi tiêu mới mặc định ở chế độ Riêng tư. Bạn quyết định, với từng khoản chi, những gì bạn bè và bảng tin có thể thấy.',
  'auth.signUp.submit': 'Tạo tài khoản',
  'auth.signUp.signInInstead': 'Đăng nhập thay vào đó',

  'validation.displayName': 'Nhập tên hiển thị tối đa 50 ký tự.',
  'validation.username': '3–30 ký tự: chỉ chữ thường, số và dấu gạch dưới.',
  'validation.email': 'Nhập một địa chỉ email hợp lệ.',
  'validation.password': 'Mật khẩu phải có từ 8–128 ký tự.',
  'validation.expenseDescription': 'Nhập mô tả tối đa 500 ký tự.',
  'validation.expenseAmount': 'Nhập số tiền lớn hơn 0.',

  'apiError.generic': 'Đã xảy ra lỗi. Vui lòng thử lại.',
  'apiError.network':
    'Không thể kết nối đến máy chủ. Kiểm tra kết nối và thử lại.',
  'apiError.rateUnavailable':
    'Chúng tôi chưa có tỷ giá cho loại tiền này. Vui lòng thử lại sau, hoặc ghi khoản này bằng tiền tệ ưa thích của bạn.',
};
