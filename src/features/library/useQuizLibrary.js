import { collectQuestionText } from '../../quiz-v2/validateQuestion.js';
import { docxHasMedia, hasSectionHeaders, importDocxWithImages } from '../../docx-import/docxImport.js';
import { firestore } from '../../config/firebase.js';
import { geminiGenerateContent } from '../../lib/gemini.js';
import { isContentBlocked, isContentBlockedBody } from '../../lib/contentFilter.js';
import { parseRawQuizText } from '../../lib/helpers.js';
import { redeemGiftCode } from '../../lib/serverApi.js';
import { safeUserUpdate } from '../../lib/userData.js';
import { shortErr } from '../../lib/format.js';
import { parseAiQuizJson, quizJsonToLines } from './quizImportHelpers.js';
import { makeShortCode } from '../../lib/shareCode.js';

const { useState } = React;

export function useQuizLibrary({ core, audio, gemini }) {
    const { user } = core;
    const { playSfx } = audio;
    const { anyGeminiKey } = gemini;
    // 🆕 BÀN PHÍM KÝ HIỆU TOÁN/LÝ: chèn ký hiệu (ω, π, √, Δ...) vào đúng ô đang gõ + đúng vị trí con trỏ
    const [showMathKeyboard, setShowMathKeyboard] = useState(false);
    const [activeMathTarget, setActiveMathTarget] = useState(null); // { node, get, set }
    // App State
    const [isAddingQuiz, setIsAddingQuiz] = useState(false);
    const [quizTitle, setQuizTitle] = useState('');
    const [rawQuizText, setRawQuizText] = useState('');
    const [importCode, setImportCode] = useState('');
    const [redeemMsg, setRedeemMsg] = useState(null);
    const [redeemingCode, setRedeemingCode] = useState(false); // 🛡️ chặn bấm liên tiếp nút THU khi đang xử lý mã
    const [quizImageAnalyzing, setQuizImageAnalyzing] = useState(false); // AI quét ảnh đề thi (OCR) khi tạo Bí Tịch
    const [quizTextAnalyzing, setQuizTextAnalyzing] = useState(false); // 🆕 AI phân tích Ngọc Giản (.txt/.docx) để tự tách câu nhiều đáp án đúng
    const [docxPreview, setDocxPreview] = useState(null); // DOCX có ảnh: bản xem trước, CHƯA lưu cho tới khi người dùng xác nhận
    // 🆕 PHÂN TÍCH NGỌC GIẢN (FILE .TXT/.DOCX) BẰNG AI: trước đây chỉ đổ thẳng chữ thô vào ô văn
    // bản rồi dò bằng regex cứng nhắc, nên KHÔNG tự nhận ra câu hỏi dạng "đúng/sai nhiều ý" nếu
    // file gốc không gõ đúng y hệt cú pháp "Đáp án: A,C". Giờ dùng AI đọc hiểu ngữ nghĩa để tự
    // tách đúng loại câu hỏi (1 đáp án / nhiều đáp án đúng-sai / điền số), y hệt tính năng quét ảnh.
    const analyzeQuizTextWithAI = async (rawText) => {
        const prompt = `Đây là văn bản thô trích xuất từ 1 file đề thi/bài tập (.txt hoặc .docx), định dạng có thể lộn xộn. Hãy đọc hiểu và tách thành các câu hỏi. Trả lời DUY NHẤT bằng JSON hợp lệ, không markdown, theo đúng cấu trúc:\n{"title": "tên gợi ý ngắn gọn cho bộ câu hỏi này", "questions": [{"q": "nội dung câu hỏi", "type": "single", "o": ["đáp án A", "đáp án B", "đáp án C", "đáp án D"], "c": 0}]}\nTrong đó "type" là một trong 3 giá trị:\n- "single": trắc nghiệm chỉ có 1 đáp án đúng (mặc định) -> "o" là mảng 2-4 lựa chọn, "c" là chỉ số đáp án đúng (0=A,1=B,2=C,3=D).\n- "multi": câu hỏi dạng liệt kê nhiều mệnh đề con a/b/c/d mà MỖI Ý CÓ THỂ ĐÚNG HOẶC SAI ĐỘC LẬP (dạng "đúng/sai" 4 ý của đề Vật Lý/Hoá/Sinh chương trình mới) -> RẤT QUAN TRỌNG: phải tự nhận ra dạng này dựa vào Ý NGHĨA từng mệnh đề, dù văn bản gốc không hề ghi chữ "đúng/sai" hay không theo đúng cú pháp mẫu. "o" là mảng các mệnh đề, "c" là MẢNG chỉ số các mệnh đề ĐÚNG (VD [0,2]).\n- "numeric": câu hỏi yêu cầu tính ra một con số cụ thể, không có lựa chọn để chọn -> "o" là mảng RỖNG [], "c" là đáp án số dạng chuỗi.\nNếu văn bản có sẵn đáp án (in đậm, ghi chú, để ở cuối bài, có gạch chân...) thì dùng đúng đáp án đó; nếu không thấy thì tự suy luận theo kiến thức. Bỏ qua phần không phải câu hỏi (tiêu đề, hướng dẫn làm bài, tên trường...). Tối đa 40 câu.\n\nVĂN BẢN:\n"""${rawText.slice(0, 15000)}"""`;
        const data = await geminiGenerateContent(anyGeminiKey, [{ text: prompt }]);
        const rawResp = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
        const parsed = parseAiQuizJson(rawResp);
        if (!parsed.questions || parsed.questions.length === 0) throw new Error('AI không tách được câu hỏi nào từ file này.');
        return parsed;
    };
    const handleFileUpload = (e) => {
        const file = e.target.files[0]; if(!file) return;
        const ext = file.name.split('.').pop().toLowerCase();

        // 🆕 Xử lý chung sau khi đã có văn bản thô (từ .txt hoặc đã dịch từ .docx): ưu tiên nhờ AI
        // phân tích để tự tách đúng câu nhiều đáp án đúng; nếu chưa có API Key thì dán thô như cũ.
        const processRawText = async (rawText, defaultTitle) => {
            if (!rawText || !rawText.trim()) { alert("Ngọc giản trống rỗng!"); return; }
            if (anyGeminiKey) {
                playSfx('CLICK');
                setQuizTextAnalyzing(true);
                try {
                    const parsed = await analyzeQuizTextWithAI(rawText);
                    if (!quizTitle.trim()) setQuizTitle(parsed.title || defaultTitle);
                    const lines = quizJsonToLines(parsed.questions);
                    setRawQuizText(prev => prev.trim() ? prev.trim() + '\n' + lines.join('\n') : lines.join('\n'));
                    playSfx('SUCCESS');
                    alert(`AI đã đọc và tự nhận diện được ${parsed.questions.length} câu hỏi (kể cả câu nhiều đáp án đúng)! Xin rà soát lại nội dung bên dưới rồi bấm LƯU TRỮ VÀ CHÉP MÃ.`);
                } catch (err) {
                    setRawQuizText(prev => prev.trim() ? prev.trim() + '\n' + rawText : rawText);
                    alert("AI phân tích thất bại nên đã dán thô văn bản để ngài tự chỉnh sửa. Chi tiết: " + shortErr(err.message));
                } finally {
                    setQuizTextAnalyzing(false);
                }
            } else {
                setRawQuizText(prev => prev.trim() ? prev.trim() + '\n' + rawText : rawText);
                playSfx('CLICK');
                alert("Đã đọc được thiên cơ từ file! Lưu ý: chưa nhập API Key (Gemini) nên KHÔNG tự tách được câu nhiều đáp án đúng — vào mục HỌC QUA VIDEO TIÊN ÂM để nhập Key (miễn phí) rồi tải lại file để AI tự phân tích chính xác hơn. Ngài cũng có thể tự chỉnh sửa văn bản bên dưới rồi bấm LƯU TRỮ VÀ CHÉP MÃ.");
            }
        };

        if (ext === 'docx') {
            if (typeof mammoth === 'undefined') return alert("Thần thú Mammoth chưa tỉnh giấc, xin chờ lát nữa!");
            const reader = new FileReader();
            reader.onload = (ev) => {
                // 🆕 DOCX CÓ ẢNH NHÚNG: đọc bằng convertToHtml, ghép ảnh theo cấu trúc tài liệu, mở màn xem trước. Lỗi/không có câu -> quay về luồng cũ bên dưới.
                const docxBuf = ev.target.result;
                if (docxHasMedia(docxBuf)) {
                    const legacyDocx = () => mammoth.extractRawText({ arrayBuffer: docxBuf }).then(res => processRawText(res.value, file.name.replace(/\.docx$/i, ''))).catch(() => alert("Lỗi dịch ngọc giản Docx!"));
                    importDocxWithImages(docxBuf, mammoth).then(r => { if (r.hasImages && r.questions.length) { playSfx('CLICK'); setDocxPreview({ result: r, title: file.name.replace(/\.docx$/i, '') }); } else legacyDocx(); }).catch(() => legacyDocx());
                    return;
                }
                mammoth.extractRawText({ arrayBuffer: ev.target.result }).then(res => {
                    // 🆕 QUIZ ENGINE V2: DOCX chỉ chữ nhưng có tiêu đề PHẦN I–IV -> màn xem trước có nhóm phần; lỗi/không ra câu -> luồng cũ
                    if (hasSectionHeaders(res.value)) {
                        importDocxWithImages(docxBuf, mammoth, { allowTextOnly: true }).then(r => { if (r.hasSections && r.questions.length) { playSfx('CLICK'); setDocxPreview({ result: r, title: file.name.replace(/\.docx$/i, '') }); } else processRawText(res.value, file.name.replace(/\.docx$/i, '')); }).catch(() => processRawText(res.value, file.name.replace(/\.docx$/i, '')));
                        return;
                    }
                    processRawText(res.value, file.name.replace(/\.docx$/i, ''));
                }).catch(() => alert("Lỗi dịch ngọc giản Docx!"));
            };
            reader.readAsArrayBuffer(file);
        } else {
            const reader = new FileReader();
            reader.onload = (ev) => { processRawText(ev.target.result, file.name.replace(/\.[^.]+$/, '')); };
            reader.readAsText(file);
        }
    };
    // Mã Bí Tịch NGẮN (8 ký tự) lưu trên Firestore 'quizShares' thay cho chuỗi nén rất dài.
    const createQuizShortCode = async (title, data) => {
        let code, exists = true, tries = 0;
        do { code = makeShortCode(8); try { exists = (await firestore.collection('quizShares').doc(code).get()).exists; } catch (e) { exists = false; } tries++; } while (exists && tries < 5);
        await firestore.collection('quizShares').doc(code).set({ t: title, d: data, owner: user.uid, createdAt: Date.now() });
        return code;
    };
    const shareLibraryItemAction = async (s) => {
        playSfx('CLICK');
        try {
            let code = s.shortCode;
            if (!code) {
                code = await createQuizShortCode(s.title, s.data);
                const newLib = (user.library || []).map(x => x.id === s.id ? { ...x, shortCode: code } : x);
                await safeUserUpdate(user.uid, { library: newLib });
            }
            try { await navigator.clipboard.writeText(code); } catch (e) {}
            setRedeemMsg({ ok: true, text: `Đã chép Mã Bí Tịch: ${code} (gửi mã này cho bạn bè)` });
        } catch (e) { setRedeemMsg({ ok: false, text: 'Không tạo được mã chia sẻ: ' + shortErr(e.message) }); playSfx('WRONG'); }
    };
    const importQuizCodeAction = async () => {
        if (redeemingCode) return; // 🛡️ đang xử lý rồi, bấm thêm cũng bỏ qua (chống nhập trùng khi mạng chậm)
        const trimmedCode = importCode.trim();
        if (!trimmedCode) { setRedeemMsg({ ok: false, text: 'Xin nhập Mã Bí Tịch / Code quà trước đã!' }); return; }
        setRedeemingCode(true); setRedeemMsg(null);
        playSfx('CLICK');
        try {
            const upperCode = trimmedCode.toUpperCase();
            // MÃ QUÀ: kiểm tra hoàn toàn ở máy chủ (không còn danh sách mã trong bundle). Không phải mã quà / máy chủ chưa sẵn sàng -> thử nhập Bí Tịch.
            let gift = null;
            if (/^[A-Za-z0-9]{4,40}$/.test(trimmedCode)) {
                try { gift = await redeemGiftCode(upperCode); }
                catch (ge) {
                    const gc = String((ge && ge.code) || '').replace('functions/', '');
                    if (gc === 'already-exists' || gc === 'failed-precondition' || gc === 'resource-exhausted' || gc === 'unauthenticated') {
                        setRedeemMsg({ ok: false, text: gc === 'already-exists' ? 'Mã quà tặng này Ngài đã sử dụng rồi!' : (ge.message || 'Không nhận được mã quà.') }); playSfx('WRONG'); return;
                    }
                    // not-found / unavailable / internal ... => không phải mã quà, rơi xuống nhánh Bí Tịch
                }
            }
            if (gift) {
                setRedeemMsg({ ok: true, text: `Thu hoạch thành công: +${gift.s} 💎, +${gift.f} ⭐` }); playSfx('SUCCESS');
            } else {
                try {
                    let parsedData;
                    if (/^[A-Z2-9]{8}$/.test(upperCode)) {
                        const sd = await firestore.collection('quizShares').doc(upperCode).get();
                        if (!sd.exists) { setRedeemMsg({ ok: false, text: `Không tìm thấy Bí Tịch với mã ${upperCode}. Hãy kiểm tra lại mã.` }); playSfx('WRONG'); return; }
                        parsedData = sd.data();
                    } else {
                        parsedData = JSON.parse(LZString.decompressFromEncodedURIComponent(trimmedCode));
                    }
                    if (!parsedData || !parsedData.t || !Array.isArray(parsedData.d)) throw new Error('sai định dạng');
                    if (isContentBlocked(parsedData.t)) { setRedeemMsg({ ok: false, text: 'Bí Tịch này có tên chứa nội dung không phù hợp nên không thể thu nạp.' }); playSfx('WRONG'); return; }
                    if ((user.library || []).some(x => x.title === parsedData.t && (x.data || []).length === parsedData.d.length)) { setRedeemMsg({ ok: false, text: `Bí Tịch "${parsedData.t}" đã có trong Tàng Kinh Các rồi.` }); playSfx('WRONG'); return; }
                    await safeUserUpdate(user.uid, { library: firebase.firestore.FieldValue.arrayUnion({ id: Date.now(), title: parsedData.t, data: parsedData.d, code: (/^[A-Z2-9]{8}$/.test(upperCode) ? upperCode : trimmedCode) }) });
                    setRedeemMsg({ ok: true, text: `Đã thu nạp Bí Tịch "${parsedData.t}" (${parsedData.d.length} câu)!` }); playSfx('SUCCESS');
                } catch(e) { setRedeemMsg({ ok: false, text: (e && e.code === 'permission-denied') ? 'Bí Tịch này đã bị quản trị viên gỡ ẩn hoặc Ngài chưa đăng nhập.' : 'Mã Bí Tịch không hợp lệ hoặc đã bị hỏng!' }); playSfx('WRONG'); return; }
            }
            setImportCode('');
        } catch (e) {
            setRedeemMsg({ ok: false, text: 'Có lỗi khi kết nối máy chủ, xin thử lại! ' + shortErr(e.message) });
            playSfx('WRONG');
        } finally {
            setRedeemingCode(false);
        }
    };
    // 📷 QUÉT ẢNH ĐỀ THI BẰNG AI: dùng chung Gemini API Key với mục Học Qua Video (đã có sẵn),
    // gửi ảnh (jpg/png...) cho Gemini Vision đọc chữ (OCR) + tự tách câu hỏi/đáp án, rồi đổ thẳng
    // vào ô văn bản theo đúng định dạng "Câu... / A. / Đáp án:" mà createQuizAction() đang hiểu,
    // để người chế tác chỉ cần rà soát lại rồi bấm LƯU TRỮ, khỏi phải gõ tay từng câu.
    const handleQuizImageUpload = async (e) => {
        const file = e.target.files[0]; if (!file) return;
        if (!anyGeminiKey) { alert("Ngài cần nhập API Key (Gemini) trước! Vào mục HỌC QUA VIDEO TIÊN ÂM để nhập Key (dùng chung, miễn phí tại aistudio.google.com/apikey)."); e.target.value = ''; return; }
        playSfx('CLICK');
        setQuizImageAnalyzing(true);
        try {
            const base64Data = await new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result.split(',')[1]);
                reader.onerror = () => reject(new Error('Không đọc được ảnh'));
                reader.readAsDataURL(file);
            });
            const mimeType = file.type || 'image/jpeg';
            const prompt = `Đây là ảnh chụp một đề thi/bài tập (có thể viết tay hoặc in, gồm trắc nghiệm 1 đáp án, dạng đúng/sai nhiều ý, hoặc câu hỏi điền số/tính toán). Hãy đọc kỹ toàn bộ chữ và ký hiệu Toán/Lý/Hoá trong ảnh (OCR, giữ nguyên đúng ký hiệu như ω, π, Δ, √, số mũ, chỉ số dưới...) rồi trích xuất thành các câu hỏi. Trả lời DUY NHẤT bằng JSON hợp lệ, không markdown, không giải thích thêm, theo đúng cấu trúc:\n{"title": "tên gợi ý ngắn gọn cho bộ câu hỏi này", "questions": [{"q": "nội dung câu hỏi", "type": "single", "o": ["đáp án A", "đáp án B", "đáp án C", "đáp án D"], "c": 0}]}\nTrong đó "type" là một trong 3 giá trị:\n- "single": trắc nghiệm chỉ có 1 đáp án đúng (mặc định) -> "o" là mảng 2-4 lựa chọn, "c" là chỉ số đáp án đúng (0=A,1=B,2=C,3=D).\n- "multi": câu hỏi dạng liệt kê nhiều ý a/b/c/d và có TỪ 2 Ý ĐÚNG TRỞ LÊN (VD dạng "đúng/sai" của đề Vật Lý/Hoá có 4 ý) -> "o" là mảng các ý, "c" là MẢNG các chỉ số ý đúng (VD [0,2]).\n- "numeric": câu hỏi yêu cầu tính toán ra một con số cụ thể (không có lựa chọn A/B/C/D để chọn) -> "o" là mảng RỖNG [], "c" là đáp án số dạng chuỗi (VD "12.5").\nNếu ảnh không đánh dấu rõ đáp án đúng, hãy tự suy luận đáp án hợp lý nhất theo kiến thức. Chỉ lấy tối đa 30 câu, bỏ qua chữ không liên quan tới câu hỏi.`;
            const data = await geminiGenerateContent(anyGeminiKey, [
                { inline_data: { mime_type: mimeType, data: base64Data } },
                { text: prompt }
            ]);
            const rawResp = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
            const parsed = parseAiQuizJson(rawResp);
            if (!parsed.questions || parsed.questions.length === 0) throw new Error('Không đọc được câu hỏi nào trong ảnh, ảnh có thể mờ hoặc không đúng định dạng đề thi.');
            if (!quizTitle.trim()) setQuizTitle(parsed.title || 'Bí Tịch Từ Ảnh');
            const lines = quizJsonToLines(parsed.questions);
            setRawQuizText(prev => prev.trim() ? prev.trim() + '\n' + lines.join('\n') : lines.join('\n'));
            playSfx('SUCCESS');
            alert(`AI đã đọc được ${parsed.questions.length} câu hỏi từ ảnh! Xin rà soát lại nội dung bên dưới rồi bấm LƯU TRỮ VÀ CHÉP MÃ.`);
        } catch (err) {
            alert("Đọc ảnh thất bại! Chi tiết: " + shortErr(err.message));
        } finally {
            setQuizImageAnalyzing(false);
            e.target.value = '';
        }
    };
    // 🆕 Đánh dấu ô nhập đang được focus để bàn phím ký hiệu biết chèn vào đâu
    const bindMathFocus = (getter, setter) => (e) => setActiveMathTarget({ node: e.target, get: getter, set: setter });
    // 🆕 Chèn 1 ký hiệu Toán/Lý vào đúng vị trí con trỏ của ô đang gõ dở
    const insertMathSymbol = (sym) => {
        if (!activeMathTarget) { alert("Xin bấm vào 1 ô nhập câu hỏi/đáp án trước, rồi chọn ký hiệu để chèn vào nhé!"); return; }
        const { node, get, set } = activeMathTarget;
        const val = get() || '';
        const start = node.selectionStart ?? val.length;
        const end = node.selectionEnd ?? start;
        const newVal = val.slice(0, start) + sym + val.slice(end);
        set(newVal);
        requestAnimationFrame(() => { try { node.focus(); node.selectionStart = node.selectionEnd = start + sym.length; } catch (e) {} });
    };
    const createQuizAction = async () => {
        if (!quizTitle || !rawQuizText) return alert("Xin hãy điền đầy đủ Tên và Nội dung!");
        if (isContentBlocked(quizTitle) || isContentBlockedBody(rawQuizText)) { playSfx('ERROR'); return alert("Nội dung chứa từ ngữ không phù hợp. Vui lòng chỉnh sửa để tuân thủ quy định."); }
        const questionList = parseRawQuizText(rawQuizText);
        if (questionList.length === 0) return alert("Sai định dạng! Không tìm thấy câu hỏi nào.");
        const compressedCode = LZString.compressToEncodedURIComponent(JSON.stringify({ t: quizTitle, d: questionList }));
        await safeUserUpdate(user.uid, { library: firebase.firestore.FieldValue.arrayUnion({ id: Date.now(), title: quizTitle, data: questionList, code: compressedCode }) });
        setIsAddingQuiz(false); setRawQuizText(''); setQuizTitle('');
        alert("Đã khắc ghi Bí Tịch! Bấm biểu tượng 📤 cạnh Bí Tịch để lấy Mã chia sẻ ngắn."); playSfx('SUCCESS');
    };
    // 🆕 LƯU Bí Tịch nhập từ DOCX có ảnh SAU KHI người dùng đã xác nhận ở màn xem trước (cùng cách lưu như createQuizAction).
    const saveDocxImportedQuiz = async (title, questions) => {
        if (!title || !questions || !questions.length) return;
        if (isContentBlocked(title) || isContentBlockedBody(questions.map(q => collectQuestionText(q)).join('\n'))) { playSfx('ERROR'); return alert("Nội dung chứa từ ngữ không phù hợp. Vui lòng chỉnh sửa file."); }
        try {
            const compressedCode = LZString.compressToEncodedURIComponent(JSON.stringify({ t: title, d: questions }));
            await safeUserUpdate(user.uid, { library: firebase.firestore.FieldValue.arrayUnion({ id: Date.now(), title, data: questions, code: compressedCode }) });
            setDocxPreview(null); setIsAddingQuiz(false);
            alert("Đã khắc ghi Bí Tịch có ảnh!"); playSfx('SUCCESS');
        } catch (err) { alert("Không lưu được Bí Tịch: " + shortErr(err.message)); playSfx('WRONG'); }
    };

    return { bindMathFocus, createQuizAction, docxPreview, handleFileUpload, handleQuizImageUpload, importCode, importQuizCodeAction, insertMathSymbol, isAddingQuiz, quizImageAnalyzing, quizTextAnalyzing, quizTitle, rawQuizText, redeemMsg, redeemingCode, saveDocxImportedQuiz, setDocxPreview, setImportCode, setIsAddingQuiz, setQuizTitle, setRawQuizText, setShowMathKeyboard, shareLibraryItemAction, showMathKeyboard };
}
