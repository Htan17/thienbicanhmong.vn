// Kiểm tra trước "Xác nhận và lưu". Trả DANH SÁCH lỗi cụ thể (không chỉ một thông báo chung). Chỉ đọc state preview; không sửa gì.
// GĐ2: dùng chung bộ kiểm tra V2 (single | truefalse | short | essay; vẫn nhận multi/numeric cũ) – cùng một luật với editor và lớp lưu.
import { validateQuestionV2 } from '../quiz-v2/validateQuestion.js';
export const validatePreview = (state, { ackUnresolved = false } = {}) => {
    const errs = [];
    (state.questions || []).forEach((q, i) => { validateQuestionV2(q, `Câu ${i + 1}: `).forEach(e => errs.push(e)); });
    const un = (state.unresolved || []).length;
    if (un > 0 && !ackUnresolved) errs.push(`Còn ${un} ảnh chưa gán (tick xác nhận bỏ qua, hoặc gán ảnh vào câu).`);
    return errs;
};
