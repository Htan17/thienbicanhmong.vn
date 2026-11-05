// ⚠️ Nhạc nền tạm thời trên là 1 bản demo của Mixkit (chỉ để đảm bảo link không bị chặn hotlink).
// Nhạc này KHÔNG hợp tông cổ trang - vào Cài Đặt > "Tải nhạc nền lên" để tự chọn 1 bài nhạc cổ phong .mp3 bạn thích, sẽ thay thế ngay lập tức và lưu tốt hơn link ngoài.
export const GIFT_CODES = { 'TRIEUQUOCDOANVIP': {s:999999999, f:999999999}, 'DAODUCMATHAN': {s:2000, f:0}, 'COCHANNHAN666': {s:1500, f:0}, 'THIENKIEU2026': {s:1000, f:0}, 'SAOBANG2000': {s:0, f:2000}, 'TONGCHUQUANLAM': {s:999999, f:99999} };

// CẢNH GIỚI MỚI
// 🎁 CÔNG DỤNG ĐỘT PHÁ: mỗi cảnh giới cho +5%/bậc Linh Thạch kiếm được vĩnh viễn từ việc phá Ải
// (bonusPercent), thay vì Đột Phá chỉ đổi màu/tên suông như trước.
export const RANKS = [
    { id: 'refining', name: 'Luyện Khí', color: '#94a3b8', price: 0, reqFame: 0, level: 1, bonusPercent: 0 },
    { id: 'foundation', name: 'Trúc Cơ', color: '#22c55e', price: 500, reqFame: 0, level: 2, bonusPercent: 5 },
    { id: 'goldencore', name: 'Kim Đan', color: '#eab308', price: 2000, reqFame: 0, level: 3, bonusPercent: 10 },
    { id: 'nascent', name: 'Nguyên Anh', color: '#a855f7', price: 5000, reqFame: 0, level: 4, bonusPercent: 15 },
    { id: 'divine', name: 'Hóa Thần', color: '#ec4899', price: 10000, reqFame: 1000, level: 5, bonusPercent: 20 },
    { id: 'greatsage', name: 'Đại Thánh', color: '#ff4500', price: 25000, reqFame: 3000, level: 6, bonusPercent: 25 },
    { id: 'immortal', name: 'Tiên Tôn', color: '#00ffff', price: 50000, reqFame: 10000, level: 7, bonusPercent: 30 },
    { id: 'tiende', name: 'Tiên Đế', color: '#ff00ff', price: 100000, reqFame: 25000, level: 8, bonusPercent: 35 },
    { id: 'daoto', name: 'Đạo Tổ', color: '#00ff00', price: 250000, reqFame: 50000, level: 9, bonusPercent: 40 },
    { id: 'sangthe', name: 'Sáng Thế Thần', color: '#ffffff', price: 500000, reqFame: 100000, level: 10, bonusPercent: 45 }
];
export const getRankBonusPercent = (rankId) => (RANKS.find(r => r.id === rankId)?.bonusPercent) || 0;

// ============================================================
// 🗺️ TU LUYỆN CHI LỘ (LUYỆN THI): hằng số dùng riêng cho tính năng lộ trình luyện thi có sơ đồ
// cây (Đạo Đồ) kiểu Duolingo. Xem thêm state/logic ở khu vực "TU LUYỆN CHI LỘ" bên trong App().
// ============================================================
// 4 mức độ khó người học tự chọn khi khai mở Đạo Lộ - quyết định số câu/ngày, tần suất ải ôn
// tập xen kẽ (reviewEvery) và có Ải Boss tổng kết cuối mỗi chặng hay không (bossEvery).
export const EXAM_DIFFICULTY = [
    { id: 'ez', name: 'Nhập Môn', icon: '🌱', color: '#4ade80', qPerDay: 6, reviewEvery: 5, bossEvery: 0, desc: 'Học nhẹ nhàng, ít câu mỗi ngày, không có Ải Boss.' },
    { id: 'normal', name: 'Tu Luyện', icon: '⚔️', color: '#22d3ee', qPerDay: 10, reviewEvery: 4, bossEvery: 7, desc: 'Nhịp độ vừa phải, có ải ôn tập xen kẽ.' },
    { id: 'hard', name: 'Khổ Luyện', icon: '🔥', color: '#f97316', qPerDay: 14, reviewEvery: 3, bossEvery: 5, desc: 'Câu hỏi dày đặc, ôn tập liên tục.' },
    { id: 'hardcore', name: 'Luyện Ngục', icon: '💀', color: '#ef4444', qPerDay: 20, reviewEvery: 2, bossEvery: 3, desc: 'Cường độ tối đa - chỉ dành cho bậc quyết tâm cao nhất.' }
];
export const getExamDifficulty = (id) => EXAM_DIFFICULTY.find(d => d.id === id) || EXAM_DIFFICULTY[1];
// Gợi ý nhanh (chip bấm chọn) khi khai mở Đạo Lộ theo "Môn Học Cụ Thể" - người học vẫn có thể tự
// gõ thêm môn khác không có trong danh sách này.
export const EXAM_SUBJECT_SUGGESTIONS = ['Toán', 'Ngữ Văn', 'Tiếng Anh', 'Vật Lý', 'Hoá Học', 'Sinh Học', 'Lịch Sử', 'Địa Lý', 'GDCD/KTPL', 'Tin Học'];
// 🏅 PHONG THÁI ĐẠO HỮU: danh hiệu nhỏ (KHÔNG bán, KHÔNG mua được bằng Linh Thạch/Danh Vọng) chỉ
// thưởng riêng cho Top 3 Đạo Hữu Bảng mỗi ngày (xem finalizeExamPathDailyReset). Người nhận có
// thể chọn hiển thị cạnh tên (examPathActiveTitle) hoặc gỡ bất kỳ lúc nào, y hệt cơ chế Khung Tên.
export const EXAM_PATH_TITLES = [
    { id: 'ept_1', name: 'Đạo Hữu Đứng Đầu Hôm Nay', class: 'ept-gold' },
    { id: 'ept_2', name: 'Đạo Hữu Nhị Vị Hôm Nay', class: 'ept-silver' },
    { id: 'ept_3', name: 'Đạo Hữu Tam Vị Hôm Nay', class: 'ept-bronze' }
];

export const FRAMES = [
    { id: 'luctruc', name: 'Lục Trúc', price: 50, color: '#22c55e' },
    { id: 'huyetma', name: 'Huyết Ma', price: 100, color: '#dc2626' },
    { id: 'cuuu', name: 'Cửu U', price: 200, color: '#a855f7' },
    { id: 'chanlong', name: 'Chân Long', price: 500, color: '#ffdf00' },
    { id: 'viemde', name: 'Viêm Đế', price: 1000, color: '#ff4500' },
    { id: 'banghan', name: 'Băng Hàn', price: 2000, color: '#00ffff' },
    { id: 'mathan', name: 'Ma Thần', price: 5000, color: '#8b0000' }
];

export const NAME_FRAMES = [
    { id: 'nf_vip', name: 'VIP', price: 150, class: 'nf-vip' },
    { id: 'nf_maton', name: 'Ma Tôn', price: 300, class: 'nf-maton' },
    { id: 'nf_kiemthan', name: 'Kiếm Thần', price: 500, class: 'nf-kiemthan' },
    { id: 'nf_daoton', name: 'Đạo Tôn', price: 800, class: 'nf-daoton' },
    { id: 'nf_viemde', name: 'Viêm Đế', price: 1000, class: 'nf-viemde' },
    { id: 'nf_tiende', name: 'Tiên Đế', price: 2000, class: 'nf-tiende' },
    { id: 'nf_thanthoai', name: 'Thần Thoại', price: 5000, class: 'nf-thanthoai' },
    { id: 'nf_tongsu', name: 'Tông Sư', price: 99999, class: 'nf-tongsu' } 
];

export const NAME_COLORS = [
    { id: 'nc_cyan', name: 'Lam Băng', price: 1000, color: '#00ffff' },
    { id: 'nc_pink', name: 'Hồng Liên', price: 1500, color: '#ff00ff' },
    { id: 'nc_green', name: 'Lục Nguyệt', price: 2000, color: '#22c55e' },
    { id: 'nc_purple', name: 'Tử Sát', price: 2500, color: '#a855f7' },
    { id: 'nc_gold', name: 'Kim Tôn', price: 3000, color: '#ffdf00' },
    { id: 'nc_blood', name: 'Huyết Nguyệt', price: 4000, color: '#dc2626' },
    { id: 'nc_darkgold', name: 'Hắc Kim', price: 5000, color: '#b8860b' }
];

export const PERSONAL_AURAS = [
    { id: 'pa_sacred', name: 'Thánh Quang', price: 5000, class: 'aura-sacred' },
    { id: 'pa_blood', name: 'Huyết Sát', price: 5000, class: 'aura-blood' },
    { id: 'pa_gold', name: 'Hoàng Kim', price: 8000, class: 'aura-gold' },
    { id: 'pa_rainbow', name: 'Cầu Vồng', price: 10000, class: 'aura-rainbow' },
    { id: 'pa_starlight', name: 'Tinh Tú', price: 15000, class: 'aura-starlight' },
    { id: 'pa_chaos', name: 'Hỗn Độn', price: 99999, class: 'aura-chaos' } 
];

// ĐỒ TRANG TRÍ APP (SHOP THEME & BOARD FRAME)
export const APP_THEMES = [
    { id: 'theme-blood', name: 'Huyết Quỷ (Màu Nền)', price: 3000 },
    { id: 'theme-abyss', name: 'Vực Sâu (Màu Nền)', price: 3000 },
    { id: 'theme-gold', name: 'Hoàng Kim (Màu Nền)', price: 8000 }
];

export const ITEMS = [
    { id: 'linh_tu_phu', name: 'Tụ Linh Phù', price: 1500, icon: '💎' },
    { id: 'danh_vong_phu', name: 'Danh Vọng Phù', price: 1200, icon: '⭐' },
    { id: 'thien_dao_lenh', name: 'Thiên Đạo Lệnh', price: 2000, icon: '📜' },
    { id: 'tay_tuy_dan', name: 'Tẩy Tủy Đan', price: 1000, icon: '🛡️' },
    { id: 'x2_card', name: 'Bùa Nhân Đôi', price: 3000, icon: '🧧', desc: 'Kích hoạt để NHÂN ĐÔI Linh Thạch nhận được từ MỌI lượt Vượt Ải & Lưu Bài Học Video trong 2 giờ kế tiếp (tối đa 2 lượt mua/ngày)' },
    { id: 'aura_laoma', name: 'Hào Quang Lão Ma', price: 5000, icon: '🔥' }
];

export const GUILD_BEASTS = [
    { id: 'gb_dragon', name: 'Thanh Long', icon: '🐉', price: 1500 },
    { id: 'gb_tiger', name: 'Bạch Hổ', icon: '🐅', price: 1500 },
    { id: 'gb_bird', name: 'Chu Tước', icon: '🦅', price: 1500 },
    { id: 'gb_turtle', name: 'Huyền Vũ', icon: '🐢', price: 1500 }
];
// ===== VẬT PHẨM CÓ HẠN SỬ DỤNG (kích hoạt từ túi đồ, lưu ở user.buffs = { id: thời điểm hết hạn }) =====
export const BUFF_DEFS = {
    linh_tu_phu:   { name: 'Tụ Linh Phù',    icon: '💎', price: 1500, hours: 24, kind: 'spirit', mult: 1.5, desc: '+50% Linh Thạch từ mọi lượt học trong 24 giờ.' },
    danh_vong_phu: { name: 'Danh Vọng Phù',  icon: '⭐', price: 1200, hours: 24, kind: 'fame',   mult: 2,   desc: 'x2 Danh Vọng nhận được trong 24 giờ.' },
    thien_dao_lenh:{ name: 'Thiên Đạo Lệnh', icon: '📜', price: 2000, hours: 24, kind: 'season', mult: 1.3, desc: '+30% điểm Phong Thần Bảng mỗi lượt học trong 24 giờ.' },
    tay_tuy_dan:   { name: 'Tẩy Tủy Đan',    icon: '🛡️', price: 1000, hours: 48, kind: 'shield', mult: 1,   desc: 'Hộ chuỗi: trong 48 giờ, nếu chuỗi điểm danh sắp đứt sẽ tự được cứu 1 lần.' }
};
export const BUFF_DAILY_LIMIT = 3; // tối đa mua 3 mỗi loại mỗi ngày
export const BUFF_MAX_STACK_MS = 48 * 3600 * 1000; // cộng dồn thời gian tối đa 48 giờ
export const buffActive = (u, id) => !!(u && u.buffs && u.buffs[id] > Date.now());
export const buffMult = (u, kind) => { let m = 1; Object.keys(BUFF_DEFS).forEach(id => { const d = BUFF_DEFS[id]; if (d.kind === kind && buffActive(u, id)) m *= d.mult; }); return m; };
export const SFX_PACKS = [
    { id: 'default', name: 'Tiên Âm Mặc Định', icon: '🔔', price: 0, desc: 'Âm thanh gốc của Bí Cảnh.' },
    { id: 'chime', name: 'Cổ Phong Linh', icon: '🎐', price: 800, desc: 'Chuông gió ngân dài, nhẹ nhàng.' },
    { id: 'retro', name: 'Trò Chơi Cổ', icon: '👾', price: 600, desc: 'Âm 8-bit hoài niệm.' },
    { id: 'crystal', name: 'Thủy Tinh', icon: '💠', price: 1000, desc: 'Trong trẻo, cao vút như pha lê.' },
    { id: 'thunder', name: 'Lôi Âm', icon: '⚡', price: 1500, desc: 'Trầm hùng, mạnh mẽ.' }
];
// Phần thưởng cuối mùa theo hạng (chỉ người đủ điều kiện): Top 3 + Top 10 + tham gia
export const seasonRewardFor = (i) => i === 0 ? { s: 3000, f: 80 } : i === 1 ? { s: 2000, f: 50 } : i === 2 ? { s: 1200, f: 30 } : i < 10 ? { s: 400, f: 10 } : { s: 150, f: 0 };
export const LB_TITLES = ['👑 Thiên Kiêu', '⚔️ Á Kiêu', '🛡️ Tam Kiêu'];
export const SCREEN_TITLES = { MODERATION: 'Quản Trị', LEADERBOARD: 'Phong Thần Bảng', SHOP: 'Cửa Hàng', PROFILE: 'Hồ Sơ', VIEW_PROFILE: 'Đạo Hữu', VIDEO_LEARN: 'Học Qua Video', GUILD: 'Tông Môn', EXAM_PATH: 'Tu Luyện Chi Lộ', SUPHU: 'Sư Phụ AI', QUIZ_EDIT: 'Chỉnh Bí Tịch', RESULT: 'Kết Quả' };
export const LB_MIN_LESSONS = 3; // phải hoàn thành tối thiểu 3 bài trong mùa mới được lên Phong Thần Bảng & nhận thưởng
export const isLbRanked = (u) => (u.seasonLessons || 0) >= LB_MIN_LESSONS && (u.seasonScore || 0) > 0;
