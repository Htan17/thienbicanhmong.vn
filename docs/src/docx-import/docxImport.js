import { docxHasMedia, extractDocx, htmlToLines } from './docxImageExtractor.js';
import { parseDocxLines } from './docxQuestionParser.js';
import { buildState, computeWarnings } from './imageQuestionMatcher.js';

export { docxHasMedia };

// Điểm vào duy nhất cho App.jsx. THUẦN ĐỌC + PHÂN TÍCH: không lưu gì, không gọi AI, không chạm Firestore.
// Trả về { hasImages, questions, images, state, warnings } hoặc ném lỗi (App sẽ quay về luồng cũ).
export const importDocxWithImages = async (arrayBuffer, mammothLib) => {
    const { html, images } = await extractDocx(arrayBuffer, mammothLib);
    if (!images.length) return { hasImages: false, questions: [], images: [], state: null, warnings: [] };
    const parsed = parseDocxLines(htmlToLines(html), images);
    const state = buildState(parsed);
    return { hasImages: true, questions: parsed.questions, images, state, warnings: computeWarnings(state, images, parsed.warnings), parsedWarnings: parsed.warnings };
};
