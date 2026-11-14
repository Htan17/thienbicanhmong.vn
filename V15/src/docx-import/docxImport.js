import { docxHasMedia, extractDocx, htmlToLines } from './docxImageExtractor.js';
import { parseDocxLines } from './docxQuestionParser.js';
import { detectSectionHeader } from './docxSectionParser.js';
import { buildState, computeWarnings } from './imageQuestionMatcher.js';

export { docxHasMedia };

// GĐ2 (Quiz Engine V2): văn bản có tiêu đề PHẦN I–IV không? (App dùng để đưa DOCX chỉ-chữ vào màn xem trước thay vì luồng cũ)
export const hasSectionHeaders = (rawText) => String(rawText || '').split(/\r?\n/).some(l => !!detectSectionHeader(l));

// Điểm vào duy nhất cho App.jsx. THUẦN ĐỌC + PHÂN TÍCH: không lưu gì, không gọi AI, không chạm Firestore.
// Trả về { hasImages, questions, images, state, warnings } hoặc ném lỗi (App sẽ quay về luồng cũ).
// opts.allowTextOnly (GĐ2): vẫn phân tích khi DOCX KHÔNG có ảnh (dùng cho đề có tiêu đề PHẦN I–IV). Mặc định giữ nguyên hành vi cũ.
export const importDocxWithImages = async (arrayBuffer, mammothLib, opts = {}) => {
    const { html, images } = await extractDocx(arrayBuffer, mammothLib);
    if (!images.length && !opts.allowTextOnly) return { hasImages: false, questions: [], images: [], state: null, warnings: [] };
    const parsed = parseDocxLines(htmlToLines(html), images);
    const state = buildState(parsed);
    return { hasImages: images.length > 0, hasSections: !!parsed.hasSections, questions: parsed.questions, images, state, warnings: computeWarnings(state, images, parsed.warnings), parsedWarnings: parsed.warnings };
};
