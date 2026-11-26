import { computeTopicMastery } from '../../lib/progress.js';
import { geminiGenerateContent } from '../../lib/gemini.js';
import { safeUserUpdate } from '../../lib/userData.js';
import { shortErr } from '../../lib/format.js';
import { buildNodesFromQuestions, tagNodeTopicsWithAI, generateSubjectPathWithAI, buildSaveEntry, EXAM_PATH_SAVE_MAX, upsertSave } from './examPathHelpers.js';

const { useState, useRef, useMemo } = React;

export function useExamPath({ core, audio, gemini }) {
    const { allUsers, syncUserData, user } = core;
    const { playSfx } = audio;
    const { anyGeminiKey } = gemini;
    // ============================================================
    // 🗺️ TU LUYỆN CHI LỘ (LUYỆN THI): toàn bộ state riêng cho tính năng lộ trình luyện thi có
    // sơ đồ cây (Đạo Đồ) kiểu Duolingo + Bát Quái Đồ (biểu đồ mạng nhện phân tích thực lực) +
    // Đạo Hữu Bảng (BXH thời gian luyện thi trong ngày, 4h00-23h00) + Bảng Phong Thưởng.
    // ============================================================
    const [examPathTab, setExamPathTab] = useState('TREE'); // 'TREE' | 'RADAR' | 'BOARD' | 'REWARDS'
    const [examPathWizMode, setExamPathWizMode] = useState('library'); // 'library' = từ Bí Tịch đã tải lên | 'subjects' = theo môn học cụ thể
    const [examPathWizDays, setExamPathWizDays] = useState(7);
    const [examPathWizDifficulty, setExamPathWizDifficulty] = useState('normal');
    const [examPathWizLibId, setExamPathWizLibId] = useState('');
    const [examPathWizSubjects, setExamPathWizSubjects] = useState([]); // mảng tên môn đã chọn/gõ
    const [examPathWizSubjectInput, setExamPathWizSubjectInput] = useState('');
    const [examPathGenerating, setExamPathGenerating] = useState(false);
    const [examPathActiveNodeId, setExamPathActiveNodeId] = useState(null); // node đang luyện (để trả điểm/tiến độ đúng chỗ khi vượt Ải)
    const [examPathViewNode, setExamPathViewNode] = useState(null); // node đang xem trước khi bấm "VÀO ẢI"
    const [examPathRadarAdvice, setExamPathRadarAdvice] = useState('');
    const [examPathRadarLoading, setExamPathRadarLoading] = useState(false);
    const [examPathRewardModal, setExamPathRewardModal] = useState(null); // { rank, titleName } - hiện sau khi Đạo Hữu Bảng chốt ngày
    const [examPathTimeLeftStr, setExamPathTimeLeftStr] = useState('Đang tính toán...');
    const [examPathWindowOpen, setExamPathWindowOpen] = useState(true); // có đang trong khung giờ 4h00-23h00 để tính điểm hay không
    // 🆕 SỬA HIỂU LẦM "BXH KHÔNG LÊN DÙ ĐÃ HỌC": true/false = lượt luyện thi Đạo Lộ vừa xong CÓ/
    // KHÔNG được cộng vào Đạo Hữu Bảng hôm nay (do ngoài khung giờ 4h-23h), null = lượt vừa rồi
    // không thuộc Đạo Lộ nên không liên quan. Hiện rõ ở màn RESULT thay vì im lặng khiến người
    // dùng tưởng bảng xếp hạng bị lỗi.
    const [examPathLastRunCounted, setExamPathLastRunCounted] = useState(null);
    // 🆕 BÙA NHÂN ĐÔI (x2_card) BẢN MỚI: chuỗi đếm ngược hiệu lực còn lại của lượt kích hoạt x2
    // hiện tại (rỗng nếu không có hiệu lực) - tính trong cùng vòng lặp 1 giây với các đếm ngược
    // mùa giải khác ở dưới, xem chỗ setX2BoostTimeLeftStr.
    const [x2BoostTimeLeftStr, setX2BoostTimeLeftStr] = useState('');
    const [showVictoryFx, setShowVictoryFx] = useState(false); // bật/tắt hiệu ứng pháo hoa CSS khi Chiến Thắng lớn
    // 🆕 SỬA "ĐOẠN KẾT CHƯA HOÀN THIỆN": trước đây hoàn thành TOÀN BỘ Đạo Lộ chỉ có 4 giây pháo hoa
    // rồi về thẳng màn RESULT bình thường của Ải cuối - không khác gì hoàn thành 1 Ải lẻ, không có
    // cảm giác "đã xong cả hành trình". Nay thêm hẳn 1 modal tổng kết riêng, ở lại tới khi người
    // dùng tự bấm đóng, thay vì chỉ thoáng qua rồi mất.
    const [examPathFinaleInfo, setExamPathFinaleInfo] = useState(null); // { title, totalNodes, days } hoặc null
    const examPathDailyMetaRef = useRef({ nextReset: null });
    const examPathNodeStartRef = useRef(null); // mốc thời gian bắt đầu luyện 1 Ải trong Đạo Lộ - dùng tính "thời gian luyện thi" cho Đạo Hữu Bảng
    // Điều phối chính: đọc lựa chọn từ Nghi Thức Khai Mở (wizard state), gọi đúng hàm sinh Đạo Đồ
    // rồi lưu thẳng vào user.examPath trên Firestore.
    const startExamPathAction = async () => {
        if (examPathWizMode === 'library' && !examPathWizLibId) { playSfx('FAIL'); return alert("Xin chọn 1 Bí Tịch đã có trong Tàng Kinh Các làm nguồn đề!"); }
        if (examPathWizMode === 'subjects' && examPathWizSubjects.length === 0) { playSfx('FAIL'); return alert("Xin chọn hoặc nhập ít nhất 1 môn học!"); }
        if (examPathWizMode === 'subjects' && !anyGeminiKey) { playSfx('FAIL'); return alert("Chế độ 'Theo Môn Học' cần AI soạn câu hỏi mới nên bắt buộc có API Key (Gemini)! Vào mục HỌC QUA VIDEO TIÊN ÂM để nhập Key (miễn phí), hoặc chọn chế độ 'Từ Bí Tịch Có Sẵn' nếu chưa có Key."); }
        playSfx('CLICK');
        setExamPathGenerating(true);
        try {
            let nodes, title;
            if (examPathWizMode === 'library') {
                const libItem = (user.library || []).find(l => String(l.id) === String(examPathWizLibId));
                if (!libItem) throw new Error('Không tìm thấy Bí Tịch đã chọn.');
                nodes = buildNodesFromQuestions(libItem.data, examPathWizDays, examPathWizDifficulty);
                nodes = await tagNodeTopicsWithAI(nodes, anyGeminiKey);
                title = `${libItem.title}`;
            } else {
                nodes = await generateSubjectPathWithAI(examPathWizSubjects, examPathWizDays, examPathWizDifficulty, anyGeminiKey);
                title = examPathWizSubjects.join(' + ');
            }
            const examPath = { active: true, title, source: examPathWizMode, days: Number(examPathWizDays), difficulty: examPathWizDifficulty, createdAt: Date.now(), nodes };
            await safeUserUpdate(user.uid, { examPath });
            playSfx('SUCCESS');
            setExamPathTab('TREE');
            alert(`Đã khai mở Đạo Lộ "${title}" - ${nodes.length} Ải chờ Ngài chinh phục!`);
        } catch (e) {
            playSfx('FAIL');
            alert("Khai mở Đạo Lộ thất bại! Chi tiết: " + shortErr(e.message));
        } finally {
            setExamPathGenerating(false);
        }
    };
    const saveExamPathAction = async () => {
        if (!user.examPath?.active) return;
        const saves = user.examPathSaves || [];
        const entry = buildSaveEntry(user.examPath);
        if (!saves.some(s => s.id === entry.id) && saves.length >= EXAM_PATH_SAVE_MAX) { playSfx('FAIL'); return alert(`Kho Đạo Lộ đã đầy (${EXAM_PATH_SAVE_MAX}). Hãy xoá bớt 1 Đạo Lộ đã lưu.`); }
        try { await safeUserUpdate(user.uid, { examPathSaves: upsertSave(saves, entry) }); playSfx('SUCCESS'); alert(`Đã lưu Đạo Lộ "${entry.title}" vào Kho (${upsertSave(saves, entry).length}/${EXAM_PATH_SAVE_MAX}).`); }
        catch (e) { playSfx('FAIL'); alert('Lưu thất bại: ' + shortErr(e.message)); }
    };
    const newExamPathAction = async () => {
        const saves = user.examPathSaves || [];
        const entry = buildSaveEntry(user.examPath);
        if (!saves.some(s => s.id === entry.id) && saves.length >= EXAM_PATH_SAVE_MAX) { playSfx('FAIL'); return alert(`Kho Đạo Lộ đã đầy (${EXAM_PATH_SAVE_MAX}). Hãy xoá bớt 1 Đạo Lộ đã lưu trước.`); }
        if (!(await askConfirm("Cất Đạo Lộ hiện tại vào Kho (giữ nguyên tiến độ) để tạo Đạo Lộ MỚI?"))) return;
        try { await safeUserUpdate(user.uid, { examPathSaves: upsertSave(saves, entry), examPath: firebase.firestore.FieldValue.delete() }); playSfx('CLICK'); setExamPathTab('TREE'); }
        catch (e) { playSfx('FAIL'); alert('Thất bại: ' + shortErr(e.message)); }
    };
    const loadSavedExamPathAction = async (sv) => {
        const saves = user.examPathSaves || [];
        let next = saves.filter(s => s.id !== sv.id);
        if (user.examPath?.active) {
            const cur = buildSaveEntry(user.examPath);
            if (next.length >= EXAM_PATH_SAVE_MAX) { playSfx('FAIL'); return alert('Kho đã đầy, hãy xoá bớt 1 Đạo Lộ trước khi chuyển.'); }
            if (!(await askConfirm(`Chuyển sang "${sv.title}"? Đạo Lộ hiện tại "${cur.title}" sẽ được cất vào Kho với đầy đủ tiến độ.`))) return;
            next = upsertSave(next, cur);
        }
        try { await safeUserUpdate(user.uid, { examPath: sv.path, examPathSaves: next }); playSfx('SUCCESS'); setExamPathTab('TREE'); }
        catch (e) { playSfx('FAIL'); alert('Chuyển thất bại: ' + shortErr(e.message)); }
    };
    const deleteSavedExamPathAction = async (sv) => {
        if (!(await askConfirm(`Xoá hẳn Đạo Lộ đã lưu "${sv.title}"? Không thể khôi phục.`))) return;
        try { await safeUserUpdate(user.uid, { examPathSaves: (user.examPathSaves || []).filter(s => s.id !== sv.id) }); playSfx('FAIL'); }
        catch (e) { alert('Xoá thất bại: ' + shortErr(e.message)); }
    };
    const resetExamPathAction = async () => {
        if (!(await askConfirm("XOÁ HẲN Đạo Lộ hiện tại? Toàn bộ tiến độ sẽ mất (muốn giữ lại hãy bấm 'Lưu' hoặc '+ Mới')."))) return;
        playSfx('FAIL');
        await safeUserUpdate(user.uid, { examPath: firebase.firestore.FieldValue.delete() });
        setExamPathTab('TREE');
    };
    // Bát Quái Đồ: xin AI viết 1 đoạn nhận xét ngắn dựa trên % thành thạo THUẦN CLIENT đã tính sẵn
    // (computeTopicMastery) - AI chỉ viết LỜI KHUYÊN, không tính lại điểm, nên luôn nhất quán.
    const getExamPathAiAdvice = async () => {
        if (!anyGeminiKey) { playSfx('FAIL'); return alert("Cần API Key (Gemini) để AI viết nhận xét! Vào mục HỌC QUA VIDEO TIÊN ÂM để nhập Key miễn phí."); }
        const mastery = computeTopicMastery(user.examPath);
        if (Object.keys(mastery).length === 0) { playSfx('FAIL'); return alert("Chưa có dữ liệu! Hãy hoàn thành ít nhất 1 Ải trước đã."); }
        playSfx('CLICK');
        setExamPathRadarLoading(true);
        try {
            const prompt = `Đây là % thành thạo của 1 học sinh theo từng chủ đề (0-100): ${JSON.stringify(mastery)}. Hãy viết 1 đoạn NHẬN XÉT NGẮN (khoảng 3-4 câu, tiếng Việt, giọng khích lệ như một vị Sư Phụ trong truyện tu tiên) chỉ ra chủ đề đang YẾU NHẤT cần ôn thêm và chủ đề đã VỮNG nhất, kèm 1 lời khuyên hành động cụ thể tiếp theo. KHÔNG dùng markdown, chỉ trả về đoạn văn thuần.`;
            const data = await geminiGenerateContent(anyGeminiKey, [{ text: prompt }]);
            const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
            setExamPathRadarAdvice(text.trim() || 'Chưa nhận được nhận xét, thử lại sau nhé.');
        } catch (e) {
            alert("Lỗi xin nhận xét AI: " + shortErr(e.message));
        } finally {
            setExamPathRadarLoading(false);
        }
    };
    // 🏅 Chọn/gỡ danh hiệu Phong Thái Đạo Hữu đã nhận được (giống hệt cơ chế Khung Tên ở SHOP)
    const setExamPathActiveTitle = (titleId) => { playSfx('CLICK'); syncUserData({ examPathActiveTitle: titleId }); };
    // 🗺️ Đạo Hữu Bảng (Tu Luyện Chi Lộ): xếp theo "thời gian luyện thi" tích luỹ hôm nay (phút),
    // chỉ tính người có điểm > 0 để bảng không rợp toàn số 0.
    const examPathBoardList = useMemo(() => [...allUsers].filter(u => (u.examPathDailyScore || 0) > 0).sort((a, b) => (b.examPathDailyScore || 0) - (a.examPathDailyScore || 0)), [allUsers]);
    const examPathTopicMastery = useMemo(() => computeTopicMastery(user?.examPath), [user?.examPath]);

    return { deleteSavedExamPathAction, examPathActiveNodeId, examPathBoardList, examPathDailyMetaRef, examPathFinaleInfo, examPathGenerating, examPathLastRunCounted, examPathNodeStartRef, examPathRadarAdvice, examPathRadarLoading, examPathRewardModal, examPathTab, examPathTimeLeftStr, examPathTopicMastery, examPathViewNode, examPathWindowOpen, examPathWizDays, examPathWizDifficulty, examPathWizLibId, examPathWizMode, examPathWizSubjectInput, examPathWizSubjects, getExamPathAiAdvice, loadSavedExamPathAction, newExamPathAction, resetExamPathAction, saveExamPathAction, setExamPathActiveNodeId, setExamPathActiveTitle, setExamPathFinaleInfo, setExamPathLastRunCounted, setExamPathRewardModal, setExamPathTab, setExamPathTimeLeftStr, setExamPathViewNode, setExamPathWindowOpen, setExamPathWizDays, setExamPathWizDifficulty, setExamPathWizLibId, setExamPathWizMode, setExamPathWizSubjectInput, setExamPathWizSubjects, setShowVictoryFx, setX2BoostTimeLeftStr, showVictoryFx, startExamPathAction, x2BoostTimeLeftStr };
}
