// AI SƯ PHỤ - NHẬP TÀI LIỆU TỪ VỰNG.  THUẦN HÀM (không chạm DOM/Firestore) -> dễ test (vocabImport.test.mjs).
//
// Luồng: văn bản/tệp  ->  parseDirectives (cấu trúc lệnh @...)  ->  parseVocabText (nhận diện cột từ gốc/nghĩa, KHÔNG cần mạng)
//        hoặc  buildAiPrompt + parseAiVocabJson (nhờ Gemini khi tài liệu lộn xộn)  ->  danh sách { original, translated, pinyin, example, pos }
//
// CẤU TRÚC LỆNH (mỗi lệnh 1 dòng, đặt ở đầu hoặc bất kỳ đâu trong tài liệu; chữ hoa/thường không quan trọng):
//   @ten: Từ vựng bài 1        tên bộ từ                        (cũng nhận: @title, @de)
//   @ngonngu: Tiếng Anh        ngôn ngữ đang học                (cũng nhận: @lang)  anh|trung|nhat|han|nga|phap|duc|tbn|y|thai
//   @huong: auto               auto | goc-nghia | nghia-goc      (cũng nhận: @dir)   cột 1 là TỪ GỐC hay là NGHĨA
//   @tach: =                   ký tự tách cột; "tab" = phím Tab  (cũng nhận: @sep)   bỏ trống = tự nhận
//   @luyen: BOTH               WORD | MEANING | BOTH             (cũng nhận: @mode)
//        WORD    = thấy NGHĨA tiếng Việt  -> gõ TỪ GỐC   (vd thấy "in"    -> gõ "print")
//        MEANING = thấy TỪ GỐC            -> gõ NGHĨA    (vd thấy "print" -> gõ "in")
//        BOTH    = hai chiều xen kẽ
//   @chude: Công nghệ          chủ đề (chỉ để gợi ý cho AI)      (cũng nhận: @topic)

export const DEFAULT_LANG = 'Tiếng Anh / Latinh';
export const MAX_ITEMS = 500, MAX_ORIG = 80, MAX_TRANS = 160;
export const DECK_MODES = Object.freeze([
    { k: 'BOTH', n: 'Hai chiều', d: 'Xen kẽ: thấy nghĩa gõ từ, thấy từ gõ nghĩa' },
    { k: 'WORD', n: 'Thấy nghĩa → gõ từ', d: 'Thấy "in" → gõ "print"' },
    { k: 'MEANING', n: 'Thấy từ → gõ nghĩa', d: 'Thấy "print" → gõ "in"' }
]);
export const SYNTAX_TEMPLATE = '@ten: Từ vựng bài 1\n@ngonngu: Tiếng Anh\n@huong: auto\n@luyen: BOTH\nprint = in\nhello = xin chào\nbook = quyển sách\n';

const VI_RE = /[àáảãạăằắẳẵặâầấẩẫậèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵđ]/i;
const NONLATIN_RE = /[\u3040-\u30ff\u4e00-\u9fff\u3400-\u4dbf\uac00-\ud7af\u0400-\u04ff\u0600-\u06ff]/;
const INVISIBLE = /[\u200b-\u200f\u202a-\u202e\u2060\ufeff]/g;
const norm = (s) => String(s || '').normalize('NFC').trim().toLowerCase();
export const hasVi = (s) => VI_RE.test(s || '');
export const hasNonLatin = (s) => NONLATIN_RE.test(s || '');

export const detectLang = (t) => { t = t || '';
    if (/[\u3040-\u30ff]/.test(t)) return 'Tiếng Nhật'; if (/[\uac00-\ud7af]/.test(t)) return 'Tiếng Hàn'; if (/[\u4e00-\u9fff]/.test(t)) return 'Tiếng Trung';
    if (/[\u0400-\u04ff]/.test(t)) return 'Tiếng Nga'; if (/[\u0600-\u06ff]/.test(t)) return 'Tiếng Ả Rập'; return DEFAULT_LANG; };

const LANG_ALIAS = [[/^(anh|english|en|eng|tieng anh|tiếng anh)$/i, DEFAULT_LANG], [/^(trung|hoa|chinese|zh|cn|hsk|tieng trung|tiếng trung)$/i, 'Tiếng Trung'], [/^(nhat|nhật|japanese|ja|jp|jlpt|tieng nhat|tiếng nhật)$/i, 'Tiếng Nhật'],
    [/^(han|hàn|korean|ko|kr|topik|tieng han|tiếng hàn)$/i, 'Tiếng Hàn'], [/^(nga|russian|ru|tieng nga|tiếng nga)$/i, 'Tiếng Nga'], [/^(phap|pháp|french|fr|tieng phap|tiếng pháp)$/i, 'Tiếng Pháp'],
    [/^(duc|đức|german|de|tieng duc|tiếng đức)$/i, 'Tiếng Đức'], [/^(tbn|tay ban nha|tây ban nha|spanish|es|tieng tay ban nha|tiếng tây ban nha)$/i, 'Tiếng Tây Ban Nha'], [/^(y|ý|italian|it|tieng y|tiếng ý)$/i, 'Tiếng Ý'], [/^(thai|thái|th|tieng thai|tiếng thái)$/i, 'Tiếng Thái']];
export const normLang = (v) => { v = String(v || '').trim(); if (!v) return ''; for (const [re, name] of LANG_ALIAS) if (re.test(v)) return name;
    if (/^ti[eế]ng\s/i.test(v)) return v.replace(/\s+/g, ' ').slice(0, 30); return ('Tiếng ' + v.charAt(0).toUpperCase() + v.slice(1)).replace(/\s+/g, ' ').slice(0, 30); };

// ---------- cấu trúc lệnh ----------
const DKEY = { ten: 'title', title: 'title', de: 'title', name: 'title', ngonngu: 'lang', ngon_ngu: 'lang', lang: 'lang', language: 'lang', huong: 'dir', dir: 'dir', direction: 'dir',
    tach: 'sep', sep: 'sep', separator: 'sep', luyen: 'mode', mode: 'mode', chude: 'topic', topic: 'topic' };
const stripAcc = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/[\s_]+/g, '');
export const parseDirectives = (text) => {
    const d = { title: '', lang: '', dir: 'auto', sep: '', mode: 'BOTH', topic: '' }, body = [], unknown = [];
    String(text || '').replace(INVISIBLE, '').split(/\r?\n/).forEach(line => {
        const m = line.match(/^\s*(?:@|#!)\s*([A-Za-zÀ-ỹ_]+)\s*[:=]\s*(.*?)\s*$/);
        if (!m) { body.push(line); return; }
        const k = DKEY[stripAcc(m[1])], v = m[2];
        if (!k) { unknown.push(m[1]); return; }
        if (k === 'title' || k === 'topic') d[k] = v.slice(0, 60);
        else if (k === 'lang') d.lang = normLang(v);
        else if (k === 'sep') d.sep = /^(tab|\\t)$/i.test(v) ? '\t' : v.slice(0, 3);
        else if (k === 'dir') { const x = stripAcc(v).replace(/-/g, ''); d.dir = /^(nghiagoc|vien|vietanh|2|cot2)/.test(x) ? 'nghia-goc' : /^(gocnghia|envi|anhviet|1|cot1)/.test(x) ? 'goc-nghia' : 'auto'; }
        else if (k === 'mode') { const x = String(v).trim().toUpperCase(); d.mode = ['WORD', 'MEANING', 'BOTH'].includes(x) ? x : 'BOTH'; }
    });
    return { ...d, body: body.join('\n'), unknown };
};

// ---------- tách dòng thành cột ----------
const SEPS = [
    { id: 'tab', n: 'Tab', re: /\t+/ }, { id: 'pipe', n: '|', re: /\s*\|\s*/ }, { id: 'dash', n: ' - ', re: /\s+[-–—]\s+/ },
    { id: 'eq', n: '= / →', re: /\s*(?:=>|->|→|⇒|=)\s*/ }, { id: 'colon', n: ':', re: /\s*[:：]\s+|\s*：\s*|\s*:(?=\S)/ }, { id: 'semi', n: ';', re: /\s*;\s*/ }, { id: 'comma', n: ',', re: null }
];
const csvSplit = (line) => { const out = []; let cur = '', q = false;
    for (let i = 0; i < line.length; i++) { const ch = line[i];
        if (q) { if (ch === '"') { if (line[i + 1] === '"') { cur += '"'; i++; } else q = false; } else cur += ch; }
        else if (ch === '"') q = true; else if (ch === ',') { out.push(cur); cur = ''; } else cur += ch; }
    out.push(cur); return out; };
const splitBy = (line, sep) => { let p = sep.id === 'comma' ? csvSplit(line) : line.split(sep.re); p = p.map(x => x.trim()).filter(x => x !== ''); if (p.length > 4) p = [...p.slice(0, 3), p.slice(3).join(' ')]; return p; };
const customSep = (s) => ({ id: 'custom', n: s === '\t' ? 'Tab' : s, re: new RegExp('\\s*' + s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\s*') });
const LEAD = /^\s*(?:\d{1,3}\s*[\.\)]\s+|[-*•·▪►]\s+)/;
const isRuler = (l) => /^[\s|:\-=_*~+]+$/.test(l);

const POS_RE = /^(n|v|adj|adv|prep|conj|pron|det|noun|verb|adjective|adverb|danh từ|động từ|tính từ|trạng từ|giới từ|liên từ|đại từ)\.?$/i;
const POS_TAIL = /\s*[\(\[（]\s*(n|v|adj|adv|prep|conj|pron|det|noun|verb|adjective|adverb)\.?\s*[\)\]）]\s*$/i;
const PHON_TAIL = /\s*(\/[^\/\n]{1,40}\/|\[[^\]\n]{1,40}\]|[\(（][^\)）\n]{1,40}[\)）])\s*$/;
const isPhonetic = (s, nonLatinOrig) => /^[\/\[].+[\/\]]$/.test(s) || /[ˈˌəɪʊæɔʃʒθðŋɑɛ]/.test(s) || (nonLatinOrig && /^[a-zāáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜüê\s'’\-]+$/i.test(s) && s.length <= 40) || (nonLatinOrig && /^[\u3040-\u309f\u30a0-\u30ff\s・ー]+$/.test(s));

const VI_ONLY = /[ăâđêôơưạảãấầẩẫậắằẳẵặẹẻẽếềểễệịỉĩọỏõốồổỗộớờởỡợụủũứừửữựỳỵỷỹ]/i;
const HEADER_RE = /^(stt|no\.?|#|word|words|từ|từ vựng|tu vung|vocabulary|vocab|meaning|nghĩa|nghia|tiếng việt|tieng viet|vietnamese|english|tiếng anh|original|translation|dịch|pinyin|kanji|hán tự|hiragana|reading)$/i;
// Điểm "giống phiên âm" (pinyin/kana): dấu thanh macron/caron, chỉ chữ a-z..., hoặc toàn kana; trừ điểm nếu có chữ đặc trưng tiếng Việt.
const pinyinScore = (x) => { x = String(x || ''); let n = 0; if (/[āēīōūǖǎěǐǒǔǚǜǘü]/.test(x)) n += 2; if (/^[\u3040-\u309f\u30a0-\u30ff\s・ー]+$/.test(x)) n += 3; if (VI_ONLY.test(x)) n -= 3; if (/^[a-zü\s'’]+$/i.test(x)) n += 1; return n; };
const orient = (a, b) => { // 'ab' = cột 1 là TỪ GỐC; 'ba' = cột 2 là TỪ GỐC; null = chưa rõ
    const an = hasNonLatin(a), bn = hasNonLatin(b), av = hasVi(a), bv = hasVi(b);
    if (an && !bn) return 'ab'; if (bn && !an) return 'ba';
    if (av && !bv) return 'ba'; if (bv && !av) return 'ab'; return null; };

const cleanSide = (s) => String(s || '').replace(/\s+/g, ' ').replace(/^["'“”‘’]+|["'“”‘’]+$/g, '').trim();

// Nhận diện từ vựng bằng quy tắc (offline, tức thì). opts: { dir, sep, lang }  (mặc định lấy từ cấu trúc lệnh trong text)
export const parseVocabText = (rawText, opts = {}) => {
    const d = parseDirectives(rawText), dir = opts.dir || d.dir, sepWant = opts.sep != null ? opts.sep : d.sep;
    const lines = d.body.split(/\r?\n/).map((l, i) => ({ n: i + 1, t: l.replace(LEAD, '').trim() })).filter(x => x.t && !isRuler(x.t));
    const info = { lines: lines.length, sep: '', orient: 'ab', directives: d };
    if (!lines.length) return { items: [], skipped: [], lang: d.lang || DEFAULT_LANG, title: d.title, mode: d.mode, info };
    // chọn ký tự tách phổ biến nhất
    let sep = sepWant ? customSep(sepWant) : null;
    if (!sep) {
        const sc = SEPS.map(s => ({ s, c: lines.filter(l => splitBy(l.t, s).length >= 2).length / lines.length })), best = Math.max(...sc.map(x => x.c));
        const pick = sc.find(x => x.c >= best - 0.1 && x.c >= 0.25); sep = pick ? pick.s : null;
    }
    if (!sep) return { items: [], skipped: lines.slice(0, 50).map(l => l.t), lang: d.lang || DEFAULT_LANG, title: d.title, mode: d.mode, info };
    info.sep = sep.n;
    // bỏ dòng tiêu đề/ghi chú (không đủ 2 cột), gom cột
    const rows = [], skipped = [];
    lines.forEach(l => { let p = splitBy(l.t, sep);
        if (p.length < 2) for (const s2 of SEPS) { if (s2 === sep || s2.id === 'colon' || s2.id === 'comma') continue; const q = splitBy(l.t, s2); if (q.length >= 2) { p = q; break; } } // dòng lẻ dùng ký tự tách khác
        if (p.length >= 2) rows.push({ n: l.n, p }); else skipped.push(l.t); });
    // Ghi chú cột phiên âm: [chữ Hán/Nhật, pinyin, nghĩa] hoặc [chữ Hán, nghĩa, pinyin] -> chuẩn hoá thành [từ, nghĩa, phiên âm]
    rows.forEach(r => { if (r.p.length >= 3 && hasNonLatin(r.p[0]) && !hasNonLatin(r.p[1]) && !hasNonLatin(r.p[2]) && pinyinScore(r.p[1]) >= pinyinScore(r.p[2])) r.p = [r.p[0], r.p[2], r.p[1], ...r.p.slice(3)]; });
    if (rows.length && rows[0].p.length >= 2 && HEADER_RE.test(rows[0].p[0]) && HEADER_RE.test(rows[0].p[1])) rows.shift();
    // hướng cả tài liệu
    let ab = 0, ba = 0; rows.forEach(r => { const o = orient(r.p[0], r.p[1]); if (o === 'ab') ab++; else if (o === 'ba') ba++; });
    const doc = dir === 'goc-nghia' ? 'ab' : dir === 'nghia-goc' ? 'ba' : (ba > ab ? 'ba' : 'ab'); info.orient = doc;
    const items = [], seen = new Map();
    rows.forEach(r => {
        const o = dir === 'auto' ? (orient(r.p[0], r.p[1]) || doc) : doc;
        let orig = cleanSide(o === 'ab' ? r.p[0] : r.p[1]), trans = cleanSide(o === 'ab' ? r.p[1] : r.p[0]); const extra = r.p.slice(2);
        let pos = '', pin = '', ex = '';
        let m = orig.match(POS_TAIL); if (m) { pos = m[1].toLowerCase(); orig = orig.replace(POS_TAIL, '').trim(); }
        m = trans.match(POS_TAIL); if (m) { pos = pos || m[1].toLowerCase(); trans = trans.replace(POS_TAIL, '').trim(); }
        m = orig.match(PHON_TAIL); if (m && (/^[\/\[]/.test(m[1]) || hasNonLatin(orig.replace(PHON_TAIL, '')))) { pin = m[1].replace(/^[\(（\[]|[\)）\]]$/g, '').trim(); orig = orig.replace(PHON_TAIL, '').trim(); }
        m = orig.match(POS_TAIL); if (m) { pos = pos || m[1].toLowerCase(); orig = orig.replace(POS_TAIL, '').trim(); } // "print (v) /prɪnt/": loại từ đứng trước phiên âm
        extra.forEach(x => { x = cleanSide(x);
            if (POS_RE.test(x)) pos = pos || x.toLowerCase().replace(/\.$/, '');
            else if (isPhonetic(x, hasNonLatin(orig))) pin = pin || x.replace(/^[\(（\[]|[\)）\]]$/g, '');
            else if (x.length >= 12 && /\s\S+\s/.test(x)) ex = ex || x;
            else if (x.length <= 40 && !hasNonLatin(x)) trans = trans + '; ' + x; });
        if (hasNonLatin(orig) && !hasNonLatin(trans) && !hasVi(trans) && pinyinScore(trans) >= 2 && !extra.length) { skipped.push(r.p.join(' | ') + ' (thiếu nghĩa tiếng Việt)'); return; }
        if (!orig || !trans || orig.length > MAX_ORIG || trans.length > MAX_TRANS || norm(orig) === norm(trans)) { skipped.push(r.p.join(' | ')); return; }
        const k = norm(orig);
        if (seen.has(k)) { const it = seen.get(k); if (!norm(it.translated).split(/;\s*/).includes(norm(trans))) it.translated += '; ' + trans; return; }
        const it = { original: orig, translated: trans, pinyin: pin, example: ex, pos }; seen.set(k, it); items.push(it);
    });
    const capped = items.slice(0, MAX_ITEMS); if (items.length > MAX_ITEMS) skipped.push('(' + (items.length - MAX_ITEMS) + ' mục vượt giới hạn ' + MAX_ITEMS + ' từ/lần nhập)');
    return { items: capped, skipped: skipped.slice(0, 60), lang: d.lang || detectLang(capped.map(i => i.original).join(' ')), title: d.title, mode: d.mode, info };
};

// Tài liệu có vẻ "lộn xộn" (nhận diện được ít) -> gợi ý nhờ AI.
export const looksMessy = (res) => !res || res.items.length === 0 || (res.info.lines >= 6 && res.items.length / res.info.lines < 0.4);

// Đảo cột (từ gốc <-> nghĩa) khi nhận diện nhầm chiều.
export const swapColumns = (items) => (items || []).map(i => ({ ...i, original: i.translated, translated: i.original, pinyin: '', example: '' }));

// ---------- nhờ AI nhận diện (Gemini) ----------
export const buildAiPrompt = (rawText, d = {}) => {
    const dd = parseDirectives(rawText), lang = d.lang || dd.lang, dir = d.dir || dd.dir, topic = d.topic || dd.topic;
    const body = dd.body.replace(INVISIBLE, '').slice(0, 12000);
    return `Bạn là trợ lý nhận diện từ vựng cho ứng dụng học ngoại ngữ của người Việt. Dưới đây là văn bản thô lấy từ tài liệu của người học (định dạng có thể lộn xộn: bảng, danh sách, đoạn văn, ghi chú...).
LỆNH CỦA NGƯỜI DÙNG: ngôn_ngữ_đang_học="${lang || 'tự nhận biết'}"; hướng_cột="${dir === 'goc-nghia' ? 'cột 1 là từ gốc, cột 2 là nghĩa' : dir === 'nghia-goc' ? 'cột 1 là nghĩa tiếng Việt, cột 2 là từ gốc' : 'tự nhận biết'}"; chủ_đề="${topic || 'không rõ'}".
NHIỆM VỤ: trích xuất danh sách từ vựng. Với mỗi mục:
- "original": từ/cụm từ trong NGÔN NGỮ ĐANG HỌC (không phải tiếng Việt), giữ nguyên chính tả, bỏ số thứ tự.
- "translated": nghĩa TIẾNG VIỆT ngắn gọn. Nếu tài liệu chỉ có từ gốc mà không có nghĩa thì tự dịch sang tiếng Việt.
- "pinyin": phiên âm/cách đọc nếu tài liệu có (pinyin, romaji, IPA), nếu không có thì "".
- "pos": loại từ viết tắt (n, v, adj, adv...) nếu có, không thì "".
- "example": câu ví dụ nếu tài liệu có, không thì "".
QUY TẮC: bỏ qua tiêu đề, số trang, hướng dẫn, câu hội thoại dài; không bịa thêm từ không có trong tài liệu; tối đa 300 mục; không lặp từ.
Trả lời DUY NHẤT bằng JSON hợp lệ, không giải thích, không markdown: {"title":"tên bộ từ ngắn","lang":"Tiếng Anh","items":[{"original":"print","translated":"in","pinyin":"","pos":"v","example":""}]}
VĂN BẢN:
"""
${body}
"""`;
};
export const parseAiVocabJson = (resp) => {
    let s = String(resp || '').replace(/```(?:json)?/gi, '').trim(); const a = s.indexOf('{'), b = s.lastIndexOf('}');
    if (a < 0 || b <= a) return { items: [], title: '', lang: '' };
    let j; try { j = JSON.parse(s.slice(a, b + 1)); } catch (e) { return { items: [], title: '', lang: '' }; }
    const seen = new Set(), items = [];
    (Array.isArray(j.items) ? j.items : []).forEach(x => {
        if (!x || typeof x !== 'object') return;
        const orig = cleanSide(x.original), trans = cleanSide(x.translated), k = norm(orig);
        if (!orig || !trans || orig.length > MAX_ORIG || trans.length > MAX_TRANS || norm(trans) === k || seen.has(k)) return;
        seen.add(k); items.push({ original: orig, translated: trans, pinyin: cleanSide(x.pinyin).slice(0, 60), example: cleanSide(x.example).slice(0, 200), pos: cleanSide(x.pos).toLowerCase().slice(0, 12) });
    });
    return { items: items.slice(0, 300), title: String(j.title || '').slice(0, 60), lang: normLang(j.lang) };
};
