// AI SƯ PHỤ - LUYỆN GÕ VĂN BẢN + SINH BÍ TỊCH TỪ THẺ.  THUẦN HÀM: không chạm Firestore/DOM, dễ test (xem srsTyping.test.mjs).
//
// 3 chế độ gõ (mỗi thẻ SRS = { original, translated, pinyin?, example?, lang?, reviewLevel, ... }):
//   MEANING  : thấy TỪ GỐC  -> gõ NGHĨA tiếng Việt          (nhận diện)
//   WORD     : thấy NGHĨA   -> gõ TỪ GỐC bằng ngôn ngữ đang học (nhớ chủ động)
//   SENTENCE : thấy CÂU VÍ DỤ bị khuyết từ -> gõ TỪ còn thiếu  (dùng trong ngữ cảnh)
//   LISTEN   : NGHE phát âm từ -> gõ lại TỪ GỐC (nghe chép; cần trình duyệt có đọc văn bản thành tiếng)
//   MIXED    : tự chọn theo cấp ghi nhớ của từng thẻ (thẻ mới -> MEANING, thẻ quen -> WORD/SENTENCE)

export const TYPING_MODES = Object.freeze([
    { k: 'MEANING', n: 'Gõ nghĩa', d: 'Thấy từ gốc, gõ nghĩa tiếng Việt' },
    { k: 'WORD', n: 'Gõ từ', d: 'Thấy nghĩa, gõ từ gốc (đúng ngôn ngữ đang học)' },
    { k: 'SENTENCE', n: 'Điền câu', d: 'Câu ví dụ bị khuyết từ, gõ từ còn thiếu' },
    { k: 'LISTEN', n: 'Nghe chép', d: 'Nghe phát âm của từ, gõ lại từ đã nghe' },
    { k: 'MIXED', n: 'Hỗn hợp', d: 'Tự tăng độ khó theo cấp ghi nhớ của từng thẻ' }
]);
export const MODE_LABEL = Object.freeze({ MEANING: 'Gõ nghĩa', WORD: 'Gõ từ', SENTENCE: 'Điền câu', LISTEN: 'Nghe chép', COPY: 'Chép từ' });
export const LANG_CODES = Object.freeze({ 'Tiếng Nhật': 'ja-JP', 'Tiếng Trung': 'zh-CN', 'Tiếng Hàn': 'ko-KR', 'Tiếng Nga': 'ru-RU', 'Tiếng Ả Rập': 'ar-SA', 'Tiếng Pháp': 'fr-FR', 'Tiếng Đức': 'de-DE', 'Tiếng Tây Ban Nha': 'es-ES', 'Tiếng Ý': 'it-IT', 'Tiếng Thái': 'th-TH' });
export const langCodeOf = (langName) => LANG_CODES[langName] || 'en-US';

// ---------- chuẩn hoá & so khớp ----------
// Bỏ dấu tiếng Việt/Latin, chỉ giữ a-z0-9 (dùng cho NGHĨA tiếng Việt và pinyin).
export const strip = (t) => (t || '').toString().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
// Giữ nguyên chữ của ngôn ngữ đích (Hán/Nhật/Hàn/Nga/Ả Rập...), chỉ bỏ dấu câu/ký hiệu và gom khoảng trắng.
export const normOrig = (t) => (t || '').toString().normalize('NFC').toLowerCase().replace(/[\p{P}\p{S}]/gu, ' ').replace(/\s+/g, ' ').trim();
const noSpace = (s) => s.replace(/\s+/g, '');

export const lev = (a, b) => {
    const d = Array.from({ length: a.length + 1 }, (_, i) => [i]);
    for (let j = 1; j <= b.length; j++) d[0][j] = j;
    for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    return d[a.length][b.length];
};

// Chấm NGHĨA tiếng Việt (giữ nguyên hành vi cũ của Sư Phụ).
export const judgeMeaning = (inp, ans) => {
    const a = strip(inp); if (!a) return false;
    const alts = String(ans).split(/[;,\/()]|\bhoặc\b/).map(strip).filter(x => x.length > 0); alts.push(strip(ans));
    return alts.some(x => {
        if (x === a) return true;
        if (x.length > 3 && 1 - lev(a, x) / Math.max(a.length, x.length) >= 0.8) return true;
        const A2 = a.split(' '), X = x.split(' ');
        if (X.length > 1) { const inter = X.filter(w => A2.includes(w)).length; if (2 * inter / (A2.length + X.length) >= 0.7) return true; }
        return false;
    });
};

// Chấm TỪ GỐC người dùng gõ. Chấp nhận:
//  - đúng chữ (bỏ qua hoa/thường, dấu câu, khoảng trắng thừa; với chữ Hán/Nhật bỏ cả khoảng trắng)
//  - từng dạng trong "A (B)" / "A; B" / "A / B"
//  - chữ Latin: sai không dấu (vd "cafe" cho "café") hoặc sai 1 ký tự với từ >= 6 ký tự
//  - phiên âm (pinyin/romaji) đã lưu trong thẻ, không cần dấu thanh -> để người chưa có bộ gõ vẫn luyện được
export const judgeOriginal = (inp, card) => {
    const a = normOrig(inp); if (!a || !card) return false;
    const full = String(card.original || '');
    const alts = [full, ...full.split(/[;,\/()（）、，]/)].map(normOrig).filter(Boolean);
    const isLatin = (s) => /[a-z]/i.test(s) && !/[^\u0000-\u024f\s]/.test(s);
    const ok = alts.some(x => {
        if (x === a || noSpace(x) === noSpace(a)) return true;
        if (isLatin(x)) {
            const sa = strip(a), sx = strip(x);
            if (sa && sa === sx) return true;
            if (sx.length >= 6 && lev(sa, sx) <= 1) return true;
        }
        return false;
    });
    if (ok) return true;
    const py = strip(card.pinyin || '');
    return !!(py && noSpace(strip(a)) === noSpace(py));
};

export const checkAnswer = (mode, typed, card) => mode === 'MEANING' ? judgeMeaning(typed, card.translated) : judgeOriginal(typed, card);

// ---------- câu khuyết từ ----------
const esc = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
export const BLANK = '＿＿＿';
// Thay từ gốc trong câu ví dụ bằng chỗ trống. found=false nếu câu không chứa từ (khi đó không dùng được chế độ Điền câu).
export const blankSentence = (example, original) => {
    const ex = String(example || '').trim(), w = String(original || '').trim();
    if (!ex || !w) return { text: ex, found: false };
    const re = new RegExp(esc(w), 'giu');
    return re.test(ex) ? { text: ex.replace(new RegExp(esc(w), 'giu'), BLANK), found: true } : { text: ex, found: false };
};
export const canCloze = (card) => !!(card && card.example && blankSentence(card.example, card.original).found);

// Chọn chế độ cho 1 thẻ theo lựa chọn của người học.
export const pickMode = (card, pref, opts = {}) => {
    const tts = opts.tts !== false; // false = trình duyệt không đọc được -> Nghe chép tự chuyển thành Gõ từ
    if (pref === 'MEANING') return 'MEANING';
    if (pref === 'LISTEN') return tts ? 'LISTEN' : 'WORD';
    if (pref === 'WORD') return 'WORD';
    if (pref === 'BOTH') return (card.reps || 0) % 2 === 0 ? 'WORD' : 'MEANING'; // bộ từ nhập từ tài liệu: xen kẽ hai chiều (lần đầu: thấy nghĩa, gõ từ)
    if (pref === 'SENTENCE') return canCloze(card) ? 'SENTENCE' : 'WORD'; // không có câu ví dụ -> gõ từ
    const lv = card.reviewLevel || 0;                                       // MIXED
    if (lv <= 2) return 'MEANING';
    if (lv <= 4) return 'WORD';
    return canCloze(card) ? 'SENTENCE' : 'WORD';
};

// Gợi ý theo chế độ: n=1 chữ cái đầu mỗi từ; n=2 phiên âm hoặc câu ví dụ.
export const maskWords = (t) => String(t || '').split(/\s+/).map(w => { const ch = [...w]; return ch[0] + '·'.repeat(Math.max(0, ch.length - 1)); }).join('  ');

// ---------- ẢI HỌC THUỘC (tiến trình học thuộc 1 bộ từ) ----------
// Mỗi từ đi qua 4 ải gõ chữ. card.ls = số ải ĐÃ QUA (0..4); ls=4 là "Thuộc lòng" rồi mới giao cho lịch ôn cách quãng (SRS).
export const PATH_STAGES = Object.freeze([
    { k: 1, n: 'Khai Nhãn', d: 'Chép lại từ để khắc ghi', ic: '👁️' },
    { k: 2, n: 'Ngộ Nghĩa', d: 'Thấy từ, gõ nghĩa tiếng Việt', ic: '🧠' },
    { k: 3, n: 'Hồi Ức', d: 'Thấy nghĩa, gõ lại từ', ic: '⌨️' },
    { k: 4, n: 'Thử Luyện', d: 'Nghe chép (hoặc điền câu)', ic: '⚔️' }
]);
export const PATH_DONE = 4, PATH_BATCH = 8, PATH_MAX_WRONG = 5;
export const clampLs = (n) => Math.max(0, Math.min(PATH_DONE, Math.floor(+n || 0)));
// Chế độ gõ của từng ải. Ải 4: nghe chép nếu máy đọc được tiếng; không thì điền câu (nếu có câu ví dụ); không thì gõ từ.
export const stageMode = (card, stage, opts = {}) => stage <= 1 ? 'COPY' : stage === 2 ? 'MEANING' : stage === 3 ? 'WORD' : (opts.tts !== false ? 'LISTEN' : canCloze(card) ? 'SENTENCE' : 'WORD');
// Chọn lô từ cho 1 phiên: ưu tiên từ đang học dở (ls cao) để sớm thuộc, rồi tới từ mới; tối đa `size` từ.
export const pathBatch = (cards, size = PATH_BATCH) => (cards || []).filter(c => c && c.translated && clampLs(c.ls) < PATH_DONE)
    .sort((a, b) => (clampLs(b.ls) - clampLs(a.ls)) || ((a.createdAt || 0) - (b.createdAt || 0)) || String(a.original).localeCompare(String(b.original))).slice(0, size);
// Tổng hợp tiến trình 1 bộ: st[k] = số từ có ls=k; pct = % tiến trình; next = ải của từ đang chờ sớm nhất (null nếu đã thuộc hết)
export const pathSummary = (cards) => { const st = [0, 0, 0, 0, 0]; let sum = 0, n = 0; (cards || []).forEach(c => { const l = clampLs(c.ls); st[l]++; sum += l; n++; });
    const first = st.findIndex((v, i) => i < PATH_DONE && v > 0); return { st, total: n, done: st[PATH_DONE], pct: n ? Math.round(sum / (n * PATH_DONE) * 100) : 0, next: first < 0 ? null : first + 1 }; };
// Tiến trình 1 phiên (0..100): tổng số ải đã qua thêm trong phiên / tổng số ải cần qua của cả lô.
export const sessionPathPct = (start, cur) => { let need = 0, got = 0; Object.keys(start || {}).forEach(id => { need += PATH_DONE - start[id]; got += Math.max(0, (cur && cur[id] != null ? cur[id] : start[id]) - start[id]); }); return need ? Math.max(0, Math.min(100, Math.round(got / need * 100))) : 0; };

// ---------- tiến độ ----------
export const pct = (a, b) => b > 0 ? Math.max(0, Math.min(100, Math.round(a / b * 100))) : 0;
export const MILESTONES = [0, 3, 7, 30, 100, 365];
// Tiến độ tới mốc chuỗi ngày kế tiếp: { prev, next, pct } (next=null khi đã đạt mốc cao nhất)
export const streakProgress = (streak) => {
    const next = MILESTONES.find(d => d > streak); if (next == null) return { prev: 365, next: null, pct: 100 };
    const prev = [...MILESTONES].reverse().find(d => d <= streak) || 0;
    return { prev, next, pct: pct(streak - prev, next - prev) };
};

// ---------- sinh Bí Tịch (quiz) từ thẻ ----------
const shuffle = (a, rng) => { const r = [...a]; for (let i = r.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [r[i], r[j]] = [r[j], r[i]]; } return r; };
const clip = (s, n) => { s = String(s || '').trim().replace(/\s+/g, ' '); return s.length > n ? s.slice(0, n - 1) + '…' : s; };
export const QUIZ_KINDS = Object.freeze(['meaning', 'reverse', 'cloze']);

// targets: thẻ cần ra đề. pool: kho thẻ để lấy đáp án nhiễu (mặc định = targets). opts.langOf(card) để ưu tiên nhiễu cùng ngôn ngữ.
// Trả về mảng câu hỏi đúng định dạng Bí Tịch cũ: { q, o:[2-4], c:chỉ số đúng, type:'single' } -> chạy ngay trong Quiz Engine hiện có.
export const buildQuizFromCards = (targets, opts = {}) => {
    const { count = 10, kinds = QUIZ_KINDS, rng = Math.random, langOf = () => '' } = opts;
    const ok = (c) => c && String(c.original || '').trim() && String(c.translated || '').trim();
    const tg = (targets || []).filter(ok), pool = (opts.pool || targets || []).filter(ok);
    if (pool.length < 4) return [];
    const out = [], seen = new Set();
    shuffle(tg, rng).slice(0, Math.max(1, count)).forEach((c, i) => {
        const avail = kinds.filter(k => k !== 'cloze' || canCloze(c));
        if (!avail.length) return;
        const kind = avail[i % avail.length], lang = langOf(c);
        const same = pool.filter(x => x.id !== c.id && langOf(x) === lang), others = same.length >= 3 ? same : pool.filter(x => x.id !== c.id);
        const field = kind === 'meaning' ? 'translated' : 'original', right = clip(c[field], 80), rk = strip(right) || right.toLowerCase();
        const used = new Set([rk]), wrong = [];
        for (const x of shuffle(others, rng)) { const v = clip(x[field], 80), k = strip(v) || v.toLowerCase(); if (!v || used.has(k)) continue; used.add(k); wrong.push(v); if (wrong.length === 3) break; }
        if (wrong.length < 2) return;
        const o = shuffle([right, ...wrong], rng), py = c.pinyin ? ` (${c.pinyin})` : '';
        const q = kind === 'meaning' ? `Nghĩa của "${clip(c.original, 60)}"${py} là gì?`
            : kind === 'reverse' ? `Từ nào có nghĩa là "${clip(c.translated, 60)}"?`
            : `Điền từ còn thiếu: ${clip(blankSentence(c.example, c.original).text, 160)} (nghĩa: ${clip(c.translated, 40)})`;
        if (seen.has(q)) return; seen.add(q);
        out.push({ q, o, c: o.indexOf(right), type: 'single' });
    });
    return out;
};
