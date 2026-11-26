// GIAI ĐOẠN 1 – Nhận diện loại câu cho DOCX Import Preview. THUẦN HÀM, không gọi AI, không chạm Firestore.
// KHÔNG thay thế parseRawQuizText: parser cũ vẫn chia câu và ghép ảnh như cũ; module này chỉ "đọc lại" các dòng của
// CHÍNH câu đó để quyết định loại câu + đáp án, và đánh dấu mức chắc chắn (parseConfidence / parseReason / requiresReview).
// Loại câu dùng đúng tên mà Quiz Engine hiện tại hiểu: 'single' | 'multi' (Đúng/Sai nhiều ý) | 'numeric'; thêm 'unknown' (chỉ trong preview).
// 'multi': c = mảng chỉ số các ý ĐÚNG (ý không có trong c là Sai) – đúng như handleSubmitMultiAnswer() đang dùng.

const VERDICT = '(đúng|dung|đ|true|t|sai|s|false|f)';
// "A Đúng", "A-Đ", "A: true", "A) S", "A. Sai"... đứng sau đầu dòng hoặc dấu ngăn , ; |
const TF_TOKEN = new RegExp(`(?:^|[\\s,;|/])([A-F])\\s*[-:=).]?\\s*${VERDICT}(?=$|[\\s,;.|/)])`, 'giu');
const LETTER_LINE = /^([A-F])\s*[.:)]\s*(.*)$/iu;
const ANSWER_LINE = /^(Đáp án|DA)[\s:.]*/iu;
const TF_CUE = /(đúng hay sai|đúng\/sai|đúng sai|mỗi (phát biểu|nhận định|ý|mệnh đề)|xét tính đúng)/iu;
const COUNT_CUE = /(có bao nhiêu|bao nhiêu (phát biểu|nhận định|mệnh đề|trường hợp|tình huống|ý))/iu;
const letterIdx = (l) => l.toUpperCase().charCodeAt(0) - 65;
const norm = (s) => String(s || '').normalize('NFC').trim().toLowerCase();
const isTrueWord = (w) => ['đúng', 'dung', 'đ', 'true', 't'].includes(norm(w));

// Tách các dòng của MỘT câu thành: câu dẫn, các lựa chọn/ý (theo thứ tự A,B,C...), phần đáp án.
export const extractStructure = (lines) => {
    const stem = []; const options = []; const answerLines = []; let answerMode = false; let seenAnswerMarker = false;
    (lines || []).forEach((raw, i) => {
        const line = String(raw || '').trim(); if (!line) return;
        if (i === 0) { stem.push(line); return; }
        if (!answerMode && ANSWER_LINE.test(line)) { answerMode = true; seenAnswerMarker = true; answerLines.push(line.replace(ANSWER_LINE, '').trim()); return; }
        const m = line.match(LETTER_LINE);
        if (!answerMode && m) {
            const idx = letterIdx(m[1]);
            if (idx === options.length && options.length < 6) { options.push(m[2].trim()); return; }
            if (idx < options.length) { answerMode = true; answerLines.push(line); return; } // chữ cái lặp lại -> khối đáp án không có tiêu đề
            return;
        }
        if (answerMode) answerLines.push(line); else stem.push(line);
    });
    return { stem: stem.join(' '), options, answerLines, seenAnswerMarker };
};

// Đọc các cặp (chữ cái -> Đúng/Sai). Trả { map:{idx:boolean}, found:number }.
export const readTrueFalseTokens = (text) => {
    const map = {}; let found = 0; let conflict = false;
    const s = String(text || '');
    for (const m of s.matchAll(TF_TOKEN)) {
        const idx = letterIdx(m[1]); const val = isTrueWord(m[2]); found++;
        if (idx in map && map[idx] !== val) conflict = true; map[idx] = val;
    }
    return { map, found, conflict };
};

const isPlainNumber = (s) => /^[=\s]*-?\d+(?:[.,]\d+)?\s*$/.test(String(s || ''));
const toNumStr = (s) => String(s).replace(/[=\s]/g, '').replace(',', '.');
const unknown = (base, reason, extra = {}) => ({ ...base, type: 'unknown', c: null, parseConfidence: 0.4, parseReason: reason, requiresReview: true, ...extra });

// parsed: câu do parseRawQuizText trả về ({q,o,c,type}); lines: các dòng của đúng câu đó.
// Trả về câu đã "tinh chỉnh": giữ q (và o, trừ khi là Đúng/Sai), thêm parseConfidence/parseReason/requiresReview.
export const refineQuestion = (parsed, lines) => {
    const st = extractStructure(lines);
    const base = { q: parsed.q, o: parsed.o, c: parsed.c, type: parsed.type };
    const answerText = st.answerLines.join(' ; ');
    const stemTf = TF_CUE.test(st.stem); const stemCount = COUNT_CUE.test(st.stem);

    if (!st.seenAnswerMarker && st.answerLines.length === 0) return unknown(base, 'Không tìm thấy dòng "Đáp án".');

    // 1) ĐÚNG/SAI NHIỀU Ý có ghi rõ Đúng/Sai (Đúng/Đ/true/T ; Sai/S/false/F)
    const tf = readTrueFalseTokens(answerText);
    const n = st.options.length;
    if (tf.found > 0 && n >= 2) {
        if (tf.conflict) return unknown({ ...base, o: st.options }, 'Cùng một ý được ghi cả Đúng lẫn Sai.', { tfPartial: st.options.map((_, i) => (i in tf.map ? tf.map[i] : null)) });
        const missing = st.options.map((_, i) => i).filter(i => !(i in tf.map));
        const beyond = Object.keys(tf.map).map(Number).filter(i => i >= n);
        if (!missing.length && !beyond.length) {
            return { ...base, o: st.options, type: 'multi', c: st.options.map((_, i) => i).filter(i => tf.map[i] === true), parseConfidence: 0.95, parseReason: 'Nhận diện Đúng/Sai từng ý từ dòng đáp án.', requiresReview: false };
        }
        const why = [missing.length ? `ý ${missing.map(i => String.fromCharCode(65 + i)).join(', ')} chưa có Đúng/Sai` : '', beyond.length ? `đáp án nhắc tới ý ${beyond.map(i => String.fromCharCode(65 + i)).join(', ')} không có trong đề` : ''].filter(Boolean).join('; ');
        return unknown({ ...base, o: st.options }, 'Đáp án Đúng/Sai chưa đầy đủ: ' + why + '.', { tfPartial: st.options.map((_, i) => (i in tf.map ? tf.map[i] : null)) });
    }

    // 2) ĐIỀN SỐ: đáp án chỉ là một con số (kể cả âm / thập phân). Không đổi sang multi chỉ vì có A/B/C/D hay (1),(2)...
    const first = (st.answerLines.find(x => x) || '').trim();
    if (isPlainNumber(first) && st.answerLines.filter(x => x).length === 1) {
        const hasFourOpts = n >= 2;
        return { ...base, type: 'numeric', c: toNumStr(first), parseConfidence: stemCount || !hasFourOpts ? 0.95 : 0.75, parseReason: hasFourOpts && !stemCount ? 'Đáp án là một số nhưng đề có lựa chọn A/B/C/D: giữ là câu điền số, cần xác nhận.' : 'Đáp án là một con số.', requiresReview: hasFourOpts && !stemCount };
    }

    // 3) Danh sách chữ cái: "B" -> single; "A,C" -> multi KIỂU CŨ (giữ tương thích nhưng bắt buộc kiểm tra)
    const tokens = first.split(/[\s,;&]+|\bvà\b/iu).filter(Boolean);
    const allLetters = tokens.length > 0 && tokens.every(t => /^[A-F]\.?$/i.test(t));
    if (allLetters) {
        const letters = [...new Set(tokens.map(t => letterIdx(t[0])))].sort((a, b) => a - b);
        if (letters.some(i => i >= n)) return unknown({ ...base, o: n ? st.options : base.o }, 'Đáp án vượt quá số lựa chọn trong đề.');
        if (letters.length === 1) {
            return { ...base, type: 'single', c: letters[0], parseConfidence: stemTf ? 0.6 : 0.95, parseReason: stemTf ? 'Một đáp án, nhưng câu dẫn giống dạng Đúng/Sai: cần xác nhận.' : 'Một đáp án.', requiresReview: stemTf };
        }
        return { ...base, o: st.options, type: 'multi', c: letters, parseConfidence: 0.6, parseReason: 'Đáp án dạng liệt kê (vd "A,C"): chương trình hiểu là các ý A, C ĐÚNG và còn lại SAI. Cần xác nhận đây là câu Đúng/Sai.', requiresReview: true };
    }
    // "B. giải thích..." -> chữ đầu là đáp án
    const lead = first.match(/^([A-F])(?![\p{L}\d])/iu);
    if (lead && !stemTf) {
        const i = letterIdx(lead[1]);
        if (i < n) return { ...base, type: 'single', c: i, parseConfidence: 0.8, parseReason: 'Một đáp án (kèm chữ giải thích sau đáp án).', requiresReview: false };
    }
    return unknown({ ...base, o: n ? st.options : base.o }, 'Không nhận diện được định dạng đáp án.');
};
