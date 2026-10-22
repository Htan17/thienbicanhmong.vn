/*
 * BỘ LỌC NỘI DUNG CÔNG KHAI v2 (Lộ trình #2: mở rộng danh sách từ khoá).
 * Mục tiêu: chặn từ tục tĩu / khiêu dâm / thù ghét / cờ bạc / lừa đảo / thông tin liên lạc ở các ô nhập CÔNG KHAI
 * (đạo hiệu, tên tông môn, cáo thị, di ngôn, tên Bí Tịch) mà KHÔNG chặn nhầm từ vựng bình thường của người học
 * (vd: "du lịch", "buổi sáng", "các bạn", "con chó", "HSK4").
 *
 * Nguyên tắc chống chặn nhầm:
 *  - Từ gốc có dấu (địt, đụ, cặc, lồn, buồi, đĩ...) chỉ khớp khi GIỮ NGUYÊN dấu + đứng riêng thành 1 từ.
 *  - Bản bỏ dấu chỉ dùng cho cụm từ dài / từ viết tắt không mơ hồ (dit me, vcl, dmm...). KHÔNG đưa "cac", "buoi", "du" đơn lẻ.
 *  - Chống né lọc: bỏ ký tự vô hình/bidi, đổi leetspeak (d1t, l0n), gộp chữ cách nhau ("f u c k"), nén chữ lặp ("fuuuck").
 * Giới hạn: bộ lọc từ khoá KHÔNG thể bắt hết; luôn cần thêm báo cáo của người dùng + quản trị viên (xem lib/moderation.js).
 */

// ---------- 1) Chuẩn hoá ----------
const INVISIBLE_RE = /[\u00AD\u200B-\u200F\u202A-\u202E\u2060-\u2064\u2066-\u2069\uFEFF]/g; // ký tự vô hình + điều khiển chiều chữ (spoof)
const LEET = { '0': 'o', '1': 'i', '3': 'e', '4': 'a', '5': 's', '7': 't', '8': 'b', '@': 'a', '$': 's', '!': 'i', '|': 'i', '+': 't' };

export const stripInvisible = (s) => String(s == null ? '' : s).replace(INVISIBLE_RE, '');
const baseNorm = (s) => stripInvisible(s).normalize('NFKC').toLowerCase().normalize('NFC');
const fold = (s) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd');
// leetspeak chỉ đổi trong chuỗi có chứa chữ cái (giữ nguyên số thuần như "2024", "0912...")
// Ký hiệu (@ $ ! | +) chỉ đổi khi nằm GIỮA chữ/số ("d!t") để "vcl!!!" không bị biến thành "vclill"; "@" đứng trước chữ cái cũng đổi thành "a".
const deLeet = (s) => s
    .replace(/@(?=[a-z])/g, 'a')
    .replace(/(?<=[a-z0-9])[@$!|+](?=[a-z0-9])/g, c => LEET[c])
    .replace(/[a-z0-9]+/g, (tok) => /[a-z]/.test(tok) ? tok.replace(/[0134578]/g, c => LEET[c]) : tok);

// Danh sách điều kiện: mỗi danh mục có thể kèm level: 'body' = áp dụng cả cho nội dung dài (đề, bài); mặc định chỉ áp dụng cho tên/tiêu đề công khai.
// A) Cụm CÓ DẤU (khớp trên văn bản đã NFC + lowercase, ranh giới từ theo Unicode)
const DIACRITIC_TERMS = {
    profanity: ['địt', 'đụ', 'đéo', 'cặc', 'lồn', 'buồi', 'đĩ', 'đm', 'đmm', 'đcm', 'đkm', 'đù', 'đ.m', 'đụ má', 'đụ mẹ', 'địt mẹ', 'địt cụ', 'con đĩ', 'thằng chó', 'đồ chó', 'mẹ mày', 'óc chó', 'ngu như chó', 'đồ khốn'],
    hate: ['khựa', 'đồ mọi rợ'],
    violence: ['giết mày', 'giết hết', 'đâm chết', 'chém chết', 'đi chết đi', 'tao giết'],
    drugs: ['thuốc lắc', 'bay lắc', 'bán ma túy', 'bán ma tuý', 'mua ma túy', 'mua ma tuý', 'cỏ mỹ'],
    gambling: ['cá độ', 'nhà cái', 'lô đề', 'đánh đề', 'tài xỉu', 'nổ hũ', 'xóc đĩa', 'cá cược', 'cờ bạc online'],
    scam: ['tín dụng đen', 'vay tiền nhanh', 'kiếm tiền online', 'việc nhẹ lương cao', 'làm giàu nhanh', 'nhận tiền thưởng', 'trúng thưởng', 'rút tiền ngay'],
    sexual: ['khiêu dâm', 'phim sex', 'phim heo', 'gọi gái', 'bán dâm', 'mại dâm', 'ảnh nóng', 'clip nóng', 'sex tour'],
};
// B) Từ/cụm đã BỎ DẤU, khớp theo TỪ nguyên (token) hoặc CỤM (sau khi gộp chữ cách nhau, nén chữ lặp, đổi leetspeak)
const FOLDED_WORDS = {
    profanity: ['dmm', 'dcm', 'dkm', 'dcmm', 'vcl', 'vkl', 'clgt', 'cmm', 'clmm', 'vlol', 'dit', 'ditme', 'dume', 'duma', 'loncon', 'concac', 'fuck', 'fck', 'fuk', 'shit', 'bitch', 'cunt', 'asshole', 'motherfucker', 'wtf'],
    hate: ['nigger', 'nigga', 'faggot', 'tranny', 'kike', 'spic'],
    violence: ['kys', 'killyourself', 'giet', 'giethet', 'giet nguoi', 'dam chet', 'chem chet'],
    drugs: ['thuoc lac', 'bay lac', 'ban ma tuy', 'mua ma tuy', 'ban cocaine', 'ban heroin'],
    gambling: ['ca do', 'nha cai', 'lo de', 'danh de', 'tai xiu', 'no hu', 'xoc dia', 'casino', 'sbobet', 'w88', 'fb88', 'kubet', 'jun88', 'hitclub', 'sunwin', 'go88', 'm88', 'bet365', '789bet'],
    scam: ['tin dung den', 'vay tien nhanh', 'kiem tien online', 'viec nhe luong cao', 'lam giau nhanh', 'tang tien', 'airdrop', 'forex', 'binary option'],
    sexual: ['sex', 'sexy', 'phim sex', 'phim heo', 'khieu dam', 'goi gai', 'ban dam', 'mai dam', 'nude', 'nsfw', 'nsfw', 'porn', 'porno', 'hentai', 'xvideos', 'xnxx', 'onlyfans', 'pornhub', 'dildo', 'blowjob', 'handjob', 'cumshot', 'bukkake', 'pussy', 'xxx', 'camgirl'],
};
// C) Chuỗi con (≥5 ký tự) trong 1 từ: bắt được "xxxporn", "pornhub123", "fuuuuck"
const SUBSTRINGS = { sexual: ['porn', 'hentai', 'xvideo', 'xnxx', 'onlyfans', 'blowjob', 'bukkake'], profanity: ['fuck', 'motherf', 'asshole'], hate: ['nigger', 'faggot'] };
// D) Chữ CJK (không có khái niệm "từ", khớp chuỗi con)
const CJK_TERMS = ['傻逼', '傻屄', '操你妈', '草泥马', '艹你妈', '死全家', '씨발', '개새끼', '병신', '좆', 'ファック', '死ね', 'クソ野郎'];

// Danh mục nào áp dụng cho "nội dung dài" (đề trắc nghiệm, văn bản học): chỉ nhóm nặng, tránh chặn nhầm học liệu (sinh học, lịch sử, ma túy trong bài giáo dục...).
const BODY_CATEGORIES = new Set(['profanity', 'hate', 'sexual_explicit']);
// Trong nhóm 'sexual', chỉ các từ này mới coi là "nặng" cho nội dung dài
const SEXUAL_EXPLICIT = new Set(['porn', 'porno', 'hentai', 'xvideos', 'xnxx', 'onlyfans', 'pornhub', 'xxx', 'phim sex', 'phim heo', 'blowjob', 'handjob', 'cumshot', 'bukkake', 'dildo', 'pussy', 'khieu dam']);

const CATEGORY_LABEL = {
    profanity: 'từ ngữ thô tục', hate: 'ngôn từ thù ghét', violence: 'ngôn từ bạo lực / đe doạ', drugs: 'nội dung ma tuý',
    gambling: 'nội dung cờ bạc / cá độ', scam: 'nội dung lừa đảo / quảng cáo', sexual: 'nội dung nhạy cảm', contact: 'thông tin liên lạc / liên kết',
    reserved: 'tên giả mạo quản trị', cjk: 'từ ngữ thô tục',
};

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const BOUNDARY_L = '(^|[^\\p{L}\\p{N}])', BOUNDARY_R = '(?=$|[^\\p{L}\\p{N}])';
const DIACRITIC_RES = Object.entries(DIACRITIC_TERMS).map(([cat, words]) => ({
    cat, re: new RegExp(BOUNDARY_L + '(' + words.map(escapeRe).join('|') + ')' + BOUNDARY_R, 'iu'),
}));
const foldedSets = Object.fromEntries(Object.entries(FOLDED_WORDS).map(([c, w]) => [c, new Set(w.filter(x => !x.includes(' ')))]));
const foldedPhrases = Object.entries(FOLDED_WORDS).flatMap(([cat, w]) => w.filter(x => x.includes(' ')).map(x => ({ cat, phrase: x })));

// Gộp chuỗi các token 1 ký tự liên tiếp: "f u c k" -> "fuck"; trả về danh sách token (gốc + đã gộp)
const mergeSingles = (tokens) => {
    const out = []; let run = [];
    const flush = () => { if (run.length >= 2) out.push(run.join('')); run = []; };
    for (const t of tokens) { if (t.length === 1) run.push(t); else { flush(); out.push(t); } }
    flush();
    return out;
};
const squeezes = (t) => { const a = t.replace(/(.)\1{2,}/g, '$1'), b = t.replace(/(.)\1+/g, '$1'); return a === b ? [t, a] : [t, a, b]; };

// ---------- 2) Phát hiện thông tin liên lạc / liên kết ----------
const URL_RE = /(https?:\/\/|www\.|\b[a-z0-9-]{2,}\.(com|vn|net|org|xyz|top|club|info|me|io|cc|tk|ml|ga|cf|gq|bet|vip|site|online|link|ly)\b|\bt\.me\/|\bzalo\.me\/|\bfb\.com\/)/i;
const EMAIL_RE = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i;
const hasPhone = (s) => /(?:\+?\d[\s.\-()]*){9,}/.test(s) && (s.match(/\d/g) || []).length >= 9;

// ---------- 3) Tên dành riêng (chống giả mạo quản trị viên) ----------
const RESERVED = ['admin', 'administrator', 'moderator', 'mod', 'quantri', 'quantrivien', 'qtv', 'quanly', 'support', 'system', 'hethong', 'thienkieu', 'thienkieubicanh', 'bicanh', 'tongchu', 'staff', 'official', 'gm', 'root'];
export const isReservedName = (name) => {
    const n = fold(baseNorm(name)).replace(/[^a-z0-9]/g, '');
    if (!n) return false;
    return RESERVED.some(r => n === r || (r.length >= 5 && n.startsWith(r)) || (r.length >= 5 && n.endsWith(r)));
};

// ---------- 4) API chính ----------
/**
 * checkContent(text, { level: 'name' | 'body', contact: boolean })
 *  - level 'name' (mặc định): tên / tiêu đề / di ngôn / cáo thị công khai -> áp dụng MỌI danh mục.
 *  - level 'body': nội dung dài (đề, bài học) -> chỉ nhóm nặng (thô tục, thù ghét, khiêu dâm rõ ràng).
 *  - contact: chặn URL / email / số điện thoại (mặc định bật khi level 'name').
 * Trả về { ok, category, label, term } - KHÔNG chứa nội dung gốc của người dùng ngoài từ khớp.
 */
export const checkContent = (text, opts = {}) => {
    const level = opts.level === 'body' ? 'body' : 'name';
    const contact = opts.contact !== undefined ? !!opts.contact : level === 'name';
    const raw = stripInvisible(text);
    if (!raw.trim()) return { ok: true };
    const allowed = (cat, term) => level === 'name' || (cat === 'sexual' ? SEXUAL_EXPLICIT.has(term) : BODY_CATEGORIES.has(cat));
    const block = (category, term) => ({ ok: false, category, label: CATEGORY_LABEL[category] || 'nội dung không phù hợp', term });

    const base = baseNorm(raw);
    // CJK
    for (const t of CJK_TERMS) if (base.includes(t)) return block('cjk', t);
    // A) có dấu
    for (const { cat, re } of DIACRITIC_RES) { const m = base.match(re); if (m && allowed(cat, m[2])) return block(cat, m[2]); }
    // B) + C) bỏ dấu
    const folded = deLeet(fold(base));
    const tokens = mergeSingles(folded.split(/[^a-z0-9]+/).filter(Boolean));
    for (const tok of tokens) {
        for (const v of squeezes(tok)) {
            for (const [cat, set] of Object.entries(foldedSets)) if (set.has(v) && allowed(cat, v)) return block(cat, v);
            for (const [cat, subs] of Object.entries(SUBSTRINGS)) for (const sub of subs) if (v.length >= sub.length && v.includes(sub) && allowed(cat, sub)) return block(cat, sub);
        }
    }
    const spaced = ' ' + folded.replace(/[^a-z0-9]+/g, ' ').trim() + ' ';
    for (const { cat, phrase } of foldedPhrases) if (spaced.includes(' ' + phrase + ' ') && allowed(cat, phrase)) return block(cat, phrase);
    // D) liên lạc / liên kết
    if (contact && (URL_RE.test(base) || EMAIL_RE.test(base) || hasPhone(base))) return block('contact', '');
    return { ok: true };
};

// Tương thích ngược: giữ nguyên tên + kiểu trả về boolean của hàm cũ (đang được gọi ở app).
export const isContentBlocked = (text) => !checkContent(text, { level: 'name', contact: false }).ok;
export const isContentBlockedBody = (text) => !checkContent(text, { level: 'body', contact: false }).ok;
export const isPublicTextBlocked = (text) => !checkContent(text, { level: 'name', contact: true }).ok;
export const blockMessage = (res, fieldName = 'Nội dung') => res && res.ok === false
    ? `${fieldName} chứa ${res.label || 'nội dung không phù hợp'}. Vui lòng chỉnh sửa lại.` : '';

/** Làm sạch văn bản công khai: bỏ ký tự vô hình/điều khiển, gộp khoảng trắng, cắt độ dài (đếm theo ký tự Unicode, không cắt đôi cặp thay thế). */
export const sanitizePublicText = (text, maxLen = 200) => {
    const s = stripInvisible(text).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '').replace(/\s+/g, ' ').trim();
    return Array.from(s).slice(0, maxLen).join('');
};
