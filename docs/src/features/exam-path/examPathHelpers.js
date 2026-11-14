import { geminiGenerateContent } from '../../lib/gemini.js';
import { getExamDifficulty } from '../../config/gameData.js';
import { shuffleArray } from '../../lib/helpers.js';
import { parseAiQuizJson } from '../library/quizImportHelpers.js';

// ============================================================
// 🗺️ TU LUYỆN CHI LỘ (LUYỆN THI): sinh Đạo Đồ (sơ đồ cây các Ải theo ngày) từ 1 trong 2
// nguồn - (A) "library": chia nhỏ 1 Bí Tịch ĐÃ CÓ SẴN trong Tàng Kinh Các ra nhiều ngày, hoặc
// (B) "subjects": nhờ AI soạn HẲN bộ câu hỏi mới theo từng môn học, từ cơ bản tới nâng cao.
// ============================================================
// (A) Chia đều 1 danh sách câu hỏi có sẵn thành các Ải theo ngày - THUẦN CLIENT, không cần
// API Key vẫn dùng được (chỉ riêng phần ĐẶT TÊN/GẮN CHỦ ĐỀ mới cần AI, xem tagNodeTopicsWithAI).
// Hết câu hỏi trước khi đủ số ngày yêu cầu -> tự XÁO LẠI VÀ LẶP VÒNG 2 (ôn tập có chọn lọc)
// thay vì cắt cụt lộ trình, rất hợp lý cho việc ôn thi (lặp lại giãn cách giúp nhớ lâu hơn).
export const buildNodesFromQuestions = (questions, days, difficultyId) => {
    const diff = getExamDifficulty(difficultyId);
    const total = questions.length;
    const perDay = Math.min(total, Math.max(3, diff.qPerDay));
    let pool = shuffleArray(questions); let idx = 0;
    const nextChunk = (n) => {
        const out = [];
        while (out.length < n) {
            if (idx >= pool.length) { pool = shuffleArray(questions); idx = 0; }
            out.push(pool[idx]); idx++;
        }
        return out;
    };
    const nodes = []; let seenSoFar = [];
    for (let day = 1; day <= days; day++) {
        const chunk = nextChunk(Math.min(perDay, total));
        seenSoFar = seenSoFar.concat(chunk);
        nodes.push({ id: `d${day}-lesson`, day, title: `Ngày ${day}`, type: 'lesson', topics: [], questions: chunk, status: day === 1 ? 'unlocked' : 'locked', bestScore: null, lastAttemptAt: null });
        if (diff.reviewEvery > 0 && day % diff.reviewEvery === 0 && day < days) {
            nodes.push({ id: `d${day}-review`, day, title: `Ôn Tập - Ngày ${day}`, type: 'review', topics: [], questions: shuffleArray(seenSoFar).slice(0, Math.min(8, seenSoFar.length)), status: 'locked', bestScore: null, lastAttemptAt: null });
        }
        if (diff.bossEvery > 0 && day % diff.bossEvery === 0) {
            nodes.push({ id: `d${day}-boss`, day, title: `Ải Boss - Chặng ${Math.ceil(day / diff.bossEvery)}`, type: 'boss', topics: [], questions: shuffleArray(seenSoFar).slice(0, Math.min(12, seenSoFar.length)), status: 'locked', bestScore: null, lastAttemptAt: null });
        }
    }
    return nodes;
};

// Gắn tiêu đề hấp dẫn + 1-3 nhãn chủ đề (dùng để vẽ Bát Quái Đồ) cho từng Ải bằng AI, gộp
// TẤT CẢ node vào 1 LẦN GỌI DUY NHẤT để tiết kiệm lượt. Không có API Key -> vẫn hoạt động,
// chỉ là dùng nhãn "Tổng Quát" chung chung thay vì nhãn chi tiết theo từng chủ đề thật.
export const tagNodeTopicsWithAI = async (nodes, apiKey) => {
    if (!apiKey) return nodes.map(n => ({ ...n, topics: [n.type === 'boss' ? 'Tổng Ôn' : 'Chủ Đề Chung'] }));
    const brief = nodes.map((n, i) => `#${i} (${n.type}): ` + n.questions.slice(0, 6).map(q => q.q).join(' | ')).join('\n');
    const prompt = `Dưới đây là danh sách các "Ải" luyện thi, mỗi dòng là 1 ải kèm vài câu hỏi mẫu bên trong. Với MỖI ải, hãy đặt 1 tiêu đề ngắn gọn hấp dẫn (dưới 6 từ, tiếng Việt) mô tả đúng nội dung chính, và gắn 1-3 nhãn chủ đề ngắn (1-3 từ, VD "Đại Số", "Ngữ Pháp Thì", "Cách Mạng Pháp"...) dùng để vẽ biểu đồ mạng nhện thực lực. Trả lời DUY NHẤT bằng JSON hợp lệ, không markdown:\n{"items":[{"i":0,"title":"...","topics":["..."]}]}\n\nDANH SÁCH:\n${brief.slice(0, 12000)}`;
    try {
        const data = await geminiGenerateContent(apiKey, [{ text: prompt }]);
        const rawResp = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
        const parsed = parseAiQuizJson(rawResp);
        const map = {}; (parsed.items || []).forEach(it => map[it.i] = it);
        return nodes.map((n, i) => map[i] ? { ...n, title: map[i].title || n.title, topics: (map[i].topics && map[i].topics.length) ? map[i].topics : ['Tổng Quát'] } : { ...n, topics: ['Tổng Quát'] });
    } catch (e) {
        return nodes.map(n => ({ ...n, topics: ['Tổng Quát'] })); // AI lỗi -> Đạo Lộ vẫn tạo được bình thường, chỉ thiếu nhãn chủ đề đẹp
    }
};

// (B) Nhờ AI soạn HẲN bộ câu hỏi mới theo từng môn học được chọn, đi từ CƠ BẢN (lấy gốc) tới
// NÂNG CAO qua từng ngày. Giới hạn 14 ngày/lượt gọi AI để tránh phản hồi quá dài bị cắt - nếu
// người học chọn nhiều ngày hơn, các ngày còn lại tự LẶP LẠI CÓ XÁO TRỘN làm ngày ôn tập bổ
// sung thay vì gọi AI thêm nhiều lần (tốn quota + dễ lỗi).
export const generateSubjectPathWithAI = async (subjects, days, difficultyId, apiKey) => {
    const diff = getExamDifficulty(difficultyId);
    const aiDays = Math.min(days, 14);
    const prompt = `Hãy soạn 1 lộ trình ôn luyện thi kéo dài ${aiDays} ngày cho các môn: ${subjects.join(', ')}. Mức độ khó: "${diff.name}" (khoảng ${diff.qPerDay} câu hỏi mỗi ngày, đi từ CƠ BẢN/LẤY GỐC ở các ngày đầu tới NÂNG CAO ở các ngày cuối). Bám sát chương trình phổ thông Việt Nam, đúng thứ tự độ khó tăng dần qua các ngày. Trả lời DUY NHẤT bằng JSON hợp lệ, không markdown, theo cấu trúc:\n{"days":[{"day":1,"title":"tên ngắn gọn nội dung ngày 1","topics":["chủ đề 1","chủ đề 2"],"questions":[{"q":"...","type":"single","o":["A","B","C","D"],"c":0}]}]}\nMỗi ngày cần khoảng ${diff.qPerDay} câu (loại "single" 1 đáp án đúng là chủ yếu; có thể dùng "numeric" - "o":[] và "c" là chuỗi số - cho câu tính toán Toán/Lý/Hoá; dùng "multi" - "c" là MẢNG chỉ số đúng - cho câu đúng/sai nhiều ý).`;
    const data = await geminiGenerateContent(apiKey, [{ text: prompt }]);
    const rawResp = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    const parsed = parseAiQuizJson(rawResp);
    if (!parsed.days || parsed.days.length === 0) throw new Error('AI không tạo được lộ trình nào.');
    const rawNodes = parsed.days.map(d => ({
        day: d.day, title: d.title || `Ngày ${d.day}`, topics: (d.topics && d.topics.length) ? d.topics : ['Tổng Quát'],
        questions: (d.questions || []).map(q => ({ q: q.q, type: q.type || 'single', o: q.o || [], c: q.c }))
    })).filter(d => d.questions.length > 0);
    if (rawNodes.length === 0) throw new Error('AI không tạo được câu hỏi nào.');
    const nodes = [];
    for (let day = 1; day <= days; day++) {
        const src = rawNodes[(day - 1) % rawNodes.length];
        const isRepeatPass = day > rawNodes.length;
        nodes.push({
            id: `sd${day}-lesson`, day, title: isRepeatPass ? `Ôn Lại - ${src.title}` : src.title, type: isRepeatPass ? 'review' : 'lesson',
            topics: src.topics, questions: isRepeatPass ? shuffleArray(src.questions) : src.questions,
            status: day === 1 ? 'unlocked' : 'locked', bestScore: null, lastAttemptAt: null
        });
        if (diff.bossEvery > 0 && day % diff.bossEvery === 0) {
            const bossQs = shuffleArray(nodes.flatMap(n => n.questions)).slice(0, 12);
            nodes.push({ id: `sd${day}-boss`, day, title: `Ải Boss - Chặng ${Math.ceil(day / diff.bossEvery)}`, type: 'boss', topics: [...new Set(nodes.flatMap(n => n.topics))].slice(0, 4), questions: bossQs, status: 'locked', bestScore: null, lastAttemptAt: null });
        }
    }
    return nodes;
};

// ===== KHO ĐẠO LỘ: lưu nhiều Đạo Lộ cùng lúc (tối đa 5), chuyển qua lại mà không mất tiến độ =====
export const EXAM_PATH_SAVE_MAX = 5;

export const buildSaveEntry = (path) => ({ id: String(path.createdAt || Date.now()), title: path.title || 'Đạo Lộ', savedAt: Date.now(), done: (path.nodes || []).filter(n => n.status === 'completed' || n.status === 'done').length, total: (path.nodes || []).length, path });

export const upsertSave = (saves, entry) => [entry, ...(saves || []).filter(s => s.id !== entry.id)].slice(0, EXAM_PATH_SAVE_MAX);
