import { compressImageFile, parseRawQuizText } from '../../lib/helpers.js';
import { safeUserUpdate } from '../../lib/userData.js';

const { useState } = React;

export function useQuizEditor({ core, audio, nav }) {
    const { user } = core;
    const { playSfx } = audio;
    const { changeAppState } = nav;
    // 🆕 CHỈNH SỬA ẢI: chỉnh sửa lại 1 Bí Tịch đã tạo (sửa câu hỏi, đính kèm ảnh, xoá/thêm câu)
    const [editingLibItem, setEditingLibItem] = useState(null); // { id, title, data, code } gốc đang sửa
    const [editDraftTitle, setEditDraftTitle] = useState('');
    const [editDraftQuestions, setEditDraftQuestions] = useState([]);
    const [editQIndex, setEditQIndex] = useState(null); // số thứ tự câu đang mở form sửa, hoặc 'new'
    const [editQDraft, setEditQDraft] = useState(null); // bản nháp câu hỏi đang sửa trong form con
    const [editQuizSaving, setEditQuizSaving] = useState(false);
    const [editAppendText, setEditAppendText] = useState(''); // dán thêm văn bản câu hỏi mới vào ải đang sửa
    const [editQImgUploading, setEditQImgUploading] = useState(false);
    // ============================================================
    // 🆕 CHỈNH SỬA ẢI: mở/sửa/lưu 1 Bí Tịch đã có trong Tàng Kinh Các.
    // Lý do thêm: trước đây nếu 1 câu hỏi bị lỗi (thiếu ảnh sơ đồ, sai đáp án, nhập nhầm...) thì
    // không có cách nào sửa lại ngoài xoá cả bộ và tạo lại từ đầu.
    // ============================================================

    // Mở màn hình sửa cho 1 Bí Tịch trong thư viện
    const openLibraryEditor = (item) => {
        playSfx('CLICK');
        setEditingLibItem(item);
        setEditDraftTitle(item.title);
        // deep-clone để không sửa trực tiếp lên state gốc trước khi bấm Lưu
        setEditDraftQuestions(JSON.parse(JSON.stringify(item.data || [])));
        setEditQIndex(null); setEditQDraft(null); setEditAppendText('');
        changeAppState('QUIZ_EDIT');
    };
    // Mở form sửa 1 câu hỏi cụ thể (index số hoặc 'new' để thêm câu mới)
    const startEditQuestion = (index) => {
        playSfx('CLICK');
        if (index === 'new') {
            setEditQDraft({ q: '', type: 'single', o: ['', '', '', ''], c: 0, img: '' });
        } else {
            const src = editDraftQuestions[index];
            setEditQDraft(JSON.parse(JSON.stringify(src)));
        }
        setEditQIndex(index);
    };
    const cancelEditQuestion = () => { setEditQIndex(null); setEditQDraft(null); };
    // 🆕 Đổi kiểu câu hỏi trong form sửa (chuẩn hoá lại o/c cho phù hợp kiểu mới)
    const switchEditQType = (newType) => {
        setEditQDraft(prev => {
            if (!prev) return prev;
            if (newType === 'single') {
                let o = (prev.o || []).slice(0, 4); while (o.length < 4) o.push('');
                return { ...prev, type: 'single', sectionId: 'multiple_choice', o, c: typeof prev.c === 'number' ? prev.c : 0 };
            }
            if (newType === 'multi' || newType === 'truefalse') {
                let o = (prev.o || []).slice(0, 6); while (o.length < 4) o.push('');
                return { ...prev, type: 'truefalse', sectionId: 'true_false', o, c: Array.isArray(prev.c) ? prev.c : [] }; // V2: dữ liệu mới dùng tên truefalse (c = mảng chỉ số ý ĐÚNG, như multi cũ)
            }
            if (newType === 'essay') return { ...prev, type: 'essay', sectionId: 'essay', o: [], c: '' };
            // numeric/short: V2 ghi 'short' (answerType number mặc định)
            return { ...prev, type: 'short', sectionId: 'short_answer', answerType: prev.type === 'short' ? (prev.answerType || 'number') : 'number', o: [], c: typeof prev.c === 'string' ? prev.c : '' };
        });
    };
    // Lưu câu hỏi đang sửa trong form con vào mảng nháp editDraftQuestions (chưa ghi lên Firestore)
    const saveEditQuestionDraft = () => {
        if (!editQDraft) return;
        const q = { ...editQDraft, q: (editQDraft.q || '').trim() };
        if (!q.q) return alert("Xin hãy nhập nội dung câu hỏi!");
        if (q.type === 'single') {
            q.o = (q.o || []).map(x => (x || '').trim()).filter(Boolean);
            if (q.o.length < 2) return alert("Câu 1 đáp án cần ít nhất 2 lựa chọn!");
            if (q.c >= q.o.length) q.c = 0;
        } else if (q.type === 'multi' || q.type === 'truefalse') {
            const trimmed = (q.o || []).map(x => (x || '').trim());
            const keepIdx = trimmed.map((x,i)=>x?i:-1).filter(i=>i!==-1);
            if (keepIdx.length < 2) return alert("Câu Đúng/Sai nhiều ý cần ít nhất 2 ý!");
            const oldCorrect = Array.isArray(q.c) ? q.c : [];
            q.o = keepIdx.map(i => trimmed[i]);
            q.c = keepIdx.map((oldI, newI) => oldCorrect.includes(oldI) ? newI : -1).filter(i => i !== -1);
        } else if (q.type === 'numeric') {
            q.o = [];
            if (q.c === '' || q.c === null || q.c === undefined || isNaN(parseFloat(String(q.c).replace(',', '.')))) return alert("Xin hãy nhập đáp án số hợp lệ!");
            q.c = String(q.c).trim();
        } else if (q.type === 'short') { // V2: trả lời ngắn (số hoặc chữ)
            q.o = [];
            if ((q.answerType || 'number') === 'text') {
                const list = String(q.acceptedText != null ? q.acceptedText : [q.c, ...(q.acceptedAnswers || [])].join('\n')).split(/\n|;/).map(x => x.trim()).filter(Boolean);
                if (!list.length) return alert("Xin hãy nhập ít nhất 1 đáp án được chấp nhận!");
                q.answerType = 'text'; q.c = list[0]; if (list.length > 1) q.acceptedAnswers = list; else delete q.acceptedAnswers;
            } else {
                if (q.c === '' || q.c == null || isNaN(parseFloat(String(q.c).replace(',', '.')))) return alert("Xin hãy nhập đáp án số hợp lệ!");
                q.answerType = 'number'; q.c = String(q.c).trim().replace(',', '.'); delete q.acceptedAnswers;
                if (q.tolerance === '' || q.tolerance == null || isNaN(parseFloat(q.tolerance)) || parseFloat(q.tolerance) < 0) delete q.tolerance; else q.tolerance = parseFloat(q.tolerance);
            }
            delete q.acceptedText; delete q.rubric; delete q.maxScore; delete q.sampleAnswer;
        } else if (q.type === 'essay') { // V2: tự luận
            q.o = []; q.c = '';
            const ms = String(q.maxScore == null ? '' : q.maxScore).trim().replace(',', '.');
            if (ms !== '' && !(parseFloat(ms) > 0)) return alert("Điểm tối đa phải là số lớn hơn 0!");
            if (ms === '') delete q.maxScore; else q.maxScore = parseFloat(ms);
            if (!String(q.rubric || '').trim()) delete q.rubric; if (!String(q.sampleAnswer || '').trim()) delete q.sampleAnswer;
            delete q.answerType; delete q.acceptedAnswers; delete q.acceptedText; delete q.tolerance;
        }
        setEditDraftQuestions(prev => {
            const arr = [...prev];
            if (editQIndex === 'new') arr.push(q); else arr[editQIndex] = q;
            return arr;
        });
        setEditQIndex(null); setEditQDraft(null);
    };
    const deleteEditQuestionAt = async (index) => {
        if (!(await askConfirm("Bạn xóa câu hỏi này?"))) return;
        setEditDraftQuestions(prev => prev.filter((_, i) => i !== index));
    };
    // 🆕 Dán thêm văn bản câu hỏi mới (định dạng "Câu.../A./Đáp án:") để nối thêm vào ải đang sửa
    const appendTextToEditAction = () => {
        const added = parseRawQuizText(editAppendText);
        if (added.length === 0) return alert("Không tìm thấy câu hỏi hợp lệ nào trong đoạn văn bản vừa dán!");
        setEditDraftQuestions(prev => [...prev, ...added]);
        setEditAppendText('');
        playSfx('SUCCESS');
        alert(`Đã thêm ${added.length} câu hỏi mới! Đừng quên bấm LƯU THAY ĐỔI ở cuối trang.`);
    };
    // 🆕 Tải ảnh minh hoạ (sơ đồ, đồ thị...) lên cho câu hỏi đang sửa trong form con
    const handleEditQImageUpload = async (e) => {
        const file = e.target.files[0]; if (!file) return;
        if (!/^image\//.test(file.type)) { alert("Chỉ nhận file ảnh!"); e.target.value = ''; return; }
        setEditQImgUploading(true);
        try {
            const dataUrl = await compressImageFile(file);
            setEditQDraft(prev => ({ ...prev, img: dataUrl }));
        } catch (err) {
            alert("Tải ảnh thất bại: " + (err.message || 'lỗi không rõ'));
        } finally {
            setEditQImgUploading(false); e.target.value = '';
        }
    };
    // Lưu toàn bộ thay đổi (tên + danh sách câu hỏi) của Bí Tịch đang sửa vào Firestore
    const saveLibraryEditAction = async () => {
        if (!editDraftTitle.trim()) return alert("Xin hãy nhập tên Bí Tịch!");
        if (editDraftQuestions.length === 0) return alert("Bí Tịch cần ít nhất 1 câu hỏi!");
        setEditQuizSaving(true);
        try {
            const compressedCode = LZString.compressToEncodedURIComponent(JSON.stringify({ t: editDraftTitle.trim(), d: editDraftQuestions }));
            const newItem = { id: editingLibItem.id, title: editDraftTitle.trim(), data: editDraftQuestions, code: compressedCode };
            const newLibrary = (user.library || []).map(x => x.id === editingLibItem.id ? newItem : x);
            await safeUserUpdate(user.uid, { library: newLibrary });
            playSfx('SUCCESS'); alert("Đã lưu thay đổi cho Bí Tịch!");
            setEditingLibItem(null); changeAppState('DASHBOARD');
        } catch (err) {
            alert("Lưu thất bại! " + (err.message || 'Lỗi không rõ'));
        } finally {
            setEditQuizSaving(false);
        }
    };
    // 🆕 THOÁT CHỈNH SỬA: nếu có thay đổi chưa lưu -> hỏi LƯU / HỦY thay đổi (hủy = giữ nguyên như lúc chưa sửa)
    const exitLibraryEditor = async () => {
        if (editQDraft) {
            if (!(await askConfirm("Câu hỏi đang sửa chưa lưu. Bỏ thay đổi của câu này và thoát?"))) return;
            cancelEditQuestion();
        }
        const orig = editingLibItem || {};
        const dirty = editDraftTitle !== orig.title || JSON.stringify(editDraftQuestions) !== JSON.stringify(orig.data || []);
        if (dirty) {
            const choice = await window.askChoice("Bạn có thay đổi chưa lưu. Muốn lưu hay hủy thay đổi?\n(Hủy: các câu hỏi trở về như lúc chưa chỉnh sửa)");
            if (choice === 'stay') return;
            if (choice === 'save') { await saveLibraryEditAction(); return; }
            setEditDraftTitle(orig.title || ''); setEditDraftQuestions(JSON.parse(JSON.stringify(orig.data || [])));
        }
        setEditingLibItem(null); changeAppState('DASHBOARD');
    };

    return { appendTextToEditAction, cancelEditQuestion, deleteEditQuestionAt, editAppendText, editDraftQuestions, editDraftTitle, editQDraft, editQImgUploading, editQuizSaving, editingLibItem, exitLibraryEditor, handleEditQImageUpload, openLibraryEditor, saveEditQuestionDraft, saveLibraryEditAction, setEditAppendText, setEditDraftTitle, setEditQDraft, startEditQuestion, switchEditQType };
}
