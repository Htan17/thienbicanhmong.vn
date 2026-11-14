import { firestore } from '../../config/firebase.js';
import { shuffleArray } from '../../lib/helpers.js';
import { makeShortCode } from '../../lib/shareCode.js';

export const formatStudyTime = (secs) => { const m = Math.floor(secs / 60), s = secs % 60; return `${m} phút ${s} giây`; };

export const fmtVideoTime = (s) => { s = Math.max(0, Math.floor(s || 0)); const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), ss = s % 60; return (h ? h + ':' : '') + String(m).padStart(h ? 2 : 1, '0') + ':' + String(ss).padStart(2, '0'); };

// Chuyển câu hỏi AI sang ĐÚNG cấu trúc câu hỏi Bí Tịch trong Tàng Kinh Các: { q, o, c, type }
export const normalizeAcademicQuestions = (list) => (list || []).map(x => {
    if (!x || !String(x.q || '').trim()) return null;
    if (x.type === 'numeric') { const n = String(x.answer == null ? '' : x.answer).replace(/,/g, '.').match(/-?\d+(\.\d+)?/); return n ? { q: String(x.q).trim(), o: [], c: n[0], type: 'numeric', e: x.explain || '' } : null; }
    const o = (Array.isArray(x.options) ? x.options : []).map(v => String(v).replace(/^[A-D][\.\:\)]\s*/i, '').trim()).filter(Boolean).slice(0, 4);
    const c = Number(x.answer);
    if (o.length < 2 || !Number.isInteger(c) || c < 0 || c >= o.length) return null;
    return { q: String(x.q).trim(), o, c, type: 'single', e: x.explain || '' };
}).filter(Boolean);

export const generateAndStoreVideoShareCode = async (payload) => {
    let code, exists = true, attempts = 0;
    do {
        code = makeShortCode(8); // mã ngắn 8 ký tự (trước đây 12 chữ số)
        try { exists = (await firestore.collection('videoShares').doc(code).get()).exists; }
        catch (e) { exists = false; }
        attempts++;
    } while (exists && attempts < 5);
    await firestore.collection('videoShares').doc(code).set({ ...payload, createdAt: Date.now() }).catch(()=>{});
    return code;
};

// Tự sinh nhiều "ải" trắc nghiệm ôn từ vựng từ danh sách dịch thuật của video vừa học.
// Mỗi câu hỏi: cho "Câu gốc", chọn đúng "Dịch nghĩa" trong 4 lựa chọn (nếu đủ dữ liệu).
// SỬA LỖI NỘI DUNG ẢI QUÁ NGẮN: trước đây cứng 5 câu/ải và TỐI ĐA 2 ải -> nếu video có > 10
// từ vựng thì phần dư bị ÂM THẦM VỨT BỎ, không được ôn tới (VD video có 15-20 từ chỉ ôn được 10).
// Giờ dùng HẾT toàn bộ từ vựng đã phân tích, chia thành các ải đều nhau ~6 câu/ải, không giới hạn số ải.
export const VOCAB_QUESTIONS_PER_ROUND = 6;

export const buildVideoVocabQuiz = (translations) => {
    const pool = (translations || []).filter(t => t?.original && t?.translated);
    if (pool.length < 2) return [];
    const shuffledPool = shuffleArray(pool);
    const questions = shuffledPool.map((t) => {
        const distractors = shuffleArray(pool.filter(x => x !== t)).slice(0, 3).map(x => x.translated);
        const options = shuffleArray([t.translated, ...distractors]);
        return { term: t.original, options, correctIndex: options.indexOf(t.translated) };
    });
    const rounds = [];
    for (let i = 0; i < questions.length; i += VOCAB_QUESTIONS_PER_ROUND) rounds.push(questions.slice(i, i + VOCAB_QUESTIONS_PER_ROUND));
    return rounds; // dùng HẾT, không còn giới hạn 2 ải/5 câu như trước
};
