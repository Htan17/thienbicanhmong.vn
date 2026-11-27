// Mã chia sẻ Bí Tịch NGẮN (8 ký tự) lưu ở Firestore 'quizShares' - dùng chung cho Tàng Kinh Các và AI Sư Phụ.
// Không đổi cấu trúc dữ liệu cũ: { t: tiêu đề, d: danh sách câu hỏi, owner: uid, createdAt }.
import { makeShortCode } from './shareCode.js';

export async function publishQuizShare(fs, uid, title, data) {
    let code, exists = true, tries = 0;
    do { code = makeShortCode(8); try { exists = (await fs.collection('quizShares').doc(code).get()).exists; } catch (e) { exists = false; } tries++; } while (exists && tries < 5);
    await fs.collection('quizShares').doc(code).set({ t: title, d: data, owner: uid, createdAt: Date.now() });
    return code;
}
export const normalizeShareCode = (s) => String(s || '').trim().toUpperCase().replace(/[\s-]/g, '');
export const isShortQuizCode = (s) => /^[A-Z2-9]{8}$/.test(normalizeShareCode(s));
// Đọc Bí Tịch theo mã ngắn. Trả { t, d } hoặc ném Error có .code = 'not-found' | 'bad-code'.
export async function fetchQuizShare(fs, raw) {
    const code = normalizeShareCode(raw);
    if (!isShortQuizCode(code)) { const e = new Error('Mã Bí Tịch gồm 8 ký tự chữ và số.'); e.code = 'bad-code'; throw e; }
    const sd = await fs.collection('quizShares').doc(code).get();
    if (!sd.exists) { const e = new Error('Không tìm thấy Bí Tịch với mã ' + code); e.code = 'not-found'; throw e; }
    const v = sd.data() || {}; if (!v.t || !Array.isArray(v.d)) { const e = new Error('Bí Tịch hỏng dữ liệu.'); e.code = 'bad-code'; throw e; }
    return { t: v.t, d: v.d, code };
}
