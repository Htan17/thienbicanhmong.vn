import { SRS } from '../../lib/srs.js';
import { claimVideoReward } from '../../lib/serverApi.js';
import { firestore } from '../../config/firebase.js';
import { geminiGenerateContent } from '../../lib/gemini.js';
import { isContentBlocked } from '../../lib/contentFilter.js';
import { safeUserUpdate } from '../../lib/userData.js';
import { sanitizeAiMathText } from '../../lib/helpers.js';
import { shortErr } from '../../lib/format.js';
import { normalizeAcademicQuestions, generateAndStoreVideoShareCode } from './videoHelpers.js';
import { isShortVideoCode } from '../../lib/shareCode.js';
import { parseAiQuizJson } from '../library/quizImportHelpers.js';

const { useState } = React;

export function useVideoNotes({ core, audio, gemini, videoplayer, videoquiz, quiz }) {
    const { user } = core;
    const { playSfx } = audio;
    const { anyGeminiKey } = gemini;
    const { forceReplayRef, setVideoLink, setVideoPlayNonce, setVideoResult, setWordLookupCache, videoLink, videoResult, videoStudyMode, videoStudySeconds, wordLookupCache } = videoplayer;
    const { setVideoQuizActive, setVideoQuizRounds } = videoquiz;
    const { handleEnterQuiz } = quiz;
    const [videoShareCode, setVideoShareCode] = useState('');
    const [videoImportCode, setVideoImportCode] = useState('');
    const [videoAnalyzing, setVideoAnalyzing] = useState(false);
    const [vocabFileAnalyzing, setVocabFileAnalyzing] = useState(false); // 🆕 AI phân tích file .txt/.docx từ vựng (đồng bộ với Tải Ngọc Giản bên Ải Bí Tịch)
    const [academicQuizTitle, setAcademicQuizTitle] = useState('');
    const [videoSaveReward, setVideoSaveReward] = useState(null); // { stones, alreadySaved } - bảng THU HOẠCH hiện lên sau khi Lưu Bài Học Video (thay cho alert() cũ)
    // ▶️ DANH SÁCH PHÁT: bấm vào 1 Bí Tịch Video đã lưu để nạp lại link đó vào khung xem +
    // hiện lại luôn Tóm Tắt/Dịch Thuật đã lưu, khỏi phải phân tích lại AI tốn API.
    const loadSavedVideoNote = (n) => {
        playSfx('CLICK');
        forceReplayRef.current = true; // luôn phát lại từ đầu, kể cả khi bấm lại đúng video đang mở
        setVideoLink(n.link);
        // SỬA LỖI: nạp lại đúng "transcript" đã lưu (trước đây luôn để rỗng -> mất Văn Bản khi mở lại)
        // và nạp lại "wordCache" đã tra trước đó -> bấm lại từ cũ hiện NGAY, không cần tra lại.
        setVideoResult({ summary: n.summary, translations: n.translations || [], transcript: n.transcript || [], isCjk: n.isCjk || false, transcriptPinyin: n.transcriptPinyin || [], transcriptTranslation: n.transcriptTranslation || [], transcriptTime: n.transcriptTime || [] });
        setWordLookupCache(n.wordCache || {});
        setVideoQuizActive(false); setVideoQuizRounds([]); setVideoShareCode(n.code || '');
        setVideoPlayNonce(k => k + 1); // ép effect gắn lại player dù currentYoutubeId không đổi
    };
    const saveAcademicQuizAction = async (startAfter) => {
        if (!videoResult || videoResult.mode !== 'academic' || !user) return;
        const qs = normalizeAcademicQuestions(videoResult.quiz);
        if (!qs.length) { playSfx('ERROR'); return alert('AI chưa tạo được câu hỏi hợp lệ cho video này. Hãy phân tích lại.'); }
        const title = (academicQuizTitle || '').trim().slice(0, 80);
        if (!title) return alert('Hãy đặt tên cho Bí Tịch.');
        if (isContentBlocked(title)) { playSfx('ERROR'); return alert('Tên Bí Tịch chứa nội dung không phù hợp. Vui lòng đổi tên.'); }
        const fullTitle = '📚 ' + title;
        try {
            const dup = (user.library || []).find(x => x.title === fullTitle && (x.data || []).length === qs.length);
            if (!dup) {
                const compressedCode = LZString.compressToEncodedURIComponent(JSON.stringify({ t: fullTitle, d: qs }));
                await safeUserUpdate(user.uid, { library: firebase.firestore.FieldValue.arrayUnion({ id: Date.now(), title: fullTitle, data: qs, code: compressedCode, subject: videoResult.subject || '', srcVideo: videoLink.trim() }) });
                playSfx('SUCCESS');
            }
            if (startAfter) handleEnterQuiz(qs);
            else alert(dup ? 'Bí Tịch này đã có sẵn trong Tàng Kinh Các (Trang chủ).' : `Đã lưu ${qs.length} câu vào Tàng Kinh Các (Trang chủ) với tên "${fullTitle}"!`);
        } catch (e) { playSfx('ERROR'); alert('Lưu Bí Tịch thất bại: ' + shortErr(e.message)); }
    };
    const analyzeVideoAction = async () => {
        if (!anyGeminiKey) return alert("Ngài cần nhập API Key (Gemini) trước! Lấy miễn phí tại aistudio.google.com/apikey");
        if (!videoLink.trim()) return alert("Ngài cần dán Link Video (YouTube) vào trước đã!");
        playSfx('CLICK');
        setVideoAnalyzing(true);
        setVideoResult(null); setVideoShareCode('');
        setWordLookupCache({}); // video mới -> xoá bộ nhớ tra từ của video cũ
        setVideoQuizActive(false); setVideoQuizRounds([]); // xoá ải ôn tập cũ khi phân tích video mới
        try {
            // 📏 SỬA LỖI "ẢI QUÁ NGẮN": trước đây chỉ xin 8-15 từ vựng nên nhiều video học được rất ít
            // từ mới. Giờ xin ÍT NHẤT 20 từ vựng/video (nhiều hơn nếu video dài/nhiều nội dung) để
            // các ải ôn tập sinh ra sau đó có đủ nội dung, không còn qua loa.
            // 拼 THÊM PINYIN: nếu video dùng chữ tượng hình (Hán/Kana), Gemini trả kèm mảng
            // "transcriptPinyin" - phiên âm Latinh song song từng câu với "transcript", để bật/tắt
            // hiện phía dưới câu chữ Hán trong Văn Bản (không có ở ngôn ngữ khác thì để mảng rỗng).
            // 🇻🇳 THÊM DỊCH NGHĨA TỪNG CÂU TRONG VĂN BẢN: trước đây "Văn Bản" chỉ hiện 100% nguyên văn
            // ngôn ngữ gốc (kèm Pinyin nếu là chữ Hán) mà KHÔNG có nghĩa tiếng Việt đi kèm -> rất khó
            // nhớ vì phải bấm tra từng từ một mới hiểu được cả câu. Giờ xin thêm mảng "transcriptTranslation"
            // dịch nghĩa tiếng Việt song song từng câu, áp dụng cho MỌI ngôn ngữ (không chỉ tiếng có chữ tượng hình).
            const promptA = `Bạn là trợ lý học ngoại ngữ, có thể xử lý bất kỳ ngôn ngữ nói nào trong video (Trung, Nhật, Hàn, Anh, Nga, Ả Rập, v.v). Hãy xem và nghe kỹ TOÀN BỘ video được cung cấp bên dưới TỪ ĐẦU ĐẾN CUỐI, sau đó trả lời DUY NHẤT bằng JSON hợp lệ (không markdown, không bọc trong \`\`\`json, không giải thích thêm), theo đúng cấu trúc:\n{"summary": "Tóm tắt ý chính của video bằng tiếng Việt, khoảng 4-6 câu", "language": "tên ngôn ngữ gốc của video (VD: Tiếng Trung, Tiếng Nhật, Tiếng Hàn, Tiếng Nga, Tiếng Ả Rập, Tiếng Anh...)", "isCjk": true/false (true nếu ngôn ngữ gốc dùng chữ tượng hình Hán/Kana, cần Pinyin/Romaji), "transcript": ["câu 1 bằng ngôn ngữ gốc của video", "câu 2...", "BẮT BUỘC chép LIÊN TỤC theo đúng trình tự thời gian TỪ ĐẦU ĐẾN CUỐI video, KHÔNG được bỏ đoạn giữa hay chỉ chọn lọc rời rạc - phải phủ kín toàn bộ nội dung nói trong video (có thể gộp các câu quá ngắn/lặp/đệm lại cho gọn, trung bình khoảng 1 câu mỗi 4-10 giây tuỳ mật độ nói của video, video càng dài thì transcript càng nhiều câu, không giới hạn số câu)"], "transcriptTime": [số giây (number, tính từ đầu video) ước lượng ĐÚNG thời điểm câu đó BẮT ĐẦU vang lên trong video, tương ứng theo thứ tự với từng câu trong "transcript", PHẢI tăng dần đều theo đúng thứ tự], "transcriptPinyin": ["phiên âm Latinh (Pinyin có dấu thanh cho tiếng Trung, Romaji cho tiếng Nhật [Romaji Hepburn của tiếng Nhật (nihongo rōmaji, VD: watashi wa gakusei desu) - TUYỆT ĐỐI KHÔNG dùng Pinyin hay âm Hán Việt cho chữ Nhật; kanji phải đọc theo âm Nhật (On/Kun)], Romaja cho tiếng Hàn) của ĐÚNG từng câu tương ứng trong \\"transcript\\" theo thứ tự, chỉ điền nếu isCjk=true, ngược lại để mảng rỗng []"], "transcriptTranslation": ["nghĩa tiếng Việt (dịch sát nghĩa, dễ hiểu) của ĐÚNG từng câu tương ứng trong \\"transcript\\" theo thứ tự, LUÔN điền đủ cho mọi ngôn ngữ để người học không phải đọc chay ngôn ngữ gốc mà không hiểu nghĩa"], "translations": [{"original": "câu/cụm từ/khái niệm gốc bằng ngôn ngữ của video", "translated": "nghĩa tiếng Việt, giải thích ngắn nếu là khái niệm", \"importance\": số 3, 2 hoặc 1 (3 = từ then chốt/rất quan trọng với nội dung video, 2 = quan trọng, 1 = ít quan trọng hơn; chỉ điền SỐ, không để trong ngoặc kép), "level": "trình độ của từ này (VD: HSK1-HSK6 cho tiếng Trung, N5-N1 cho tiếng Nhật, TOPIK1-TOPIK6 cho tiếng Hàn, A1-C2 cho tiếng Anh/Âu/Nga; để 'Không rõ' nếu không xác định được)"}, ... ÍT NHẤT 20 từ vựng/khái niệm quan trọng và hay nhất trong video để học (nhiều hơn nếu video có nhiều nội dung đáng học), không cần liệt kê hết cả bài]}\nNếu video KHÔNG có tiếng nói rõ ràng để phân tích ngôn ngữ, vẫn cố gắng phân tích tối đa nội dung nghe/thấy được, đừng bỏ trống.`;

            // ===== CHẾ ĐỘ MÔN HỌC (Toán/Lý/Hóa/...): thay Pinyin/từ vựng bằng Mục lục theo mốc thời gian + Công thức + Ải Bí Tịch =====
            const promptB = `Bạn là gia sư giỏi, phân tích video BÀI GIẢNG/KIẾN THỨC MÔN HỌC (Toán, Vật lý, Hóa học, Sinh học, Lịch sử, Địa lý, Ngữ văn, Tin học, Kinh tế, kỹ năng...). Hãy xem và nghe kỹ TOÀN BỘ video từ đầu đến cuối, sau đó trả lời DUY NHẤT bằng JSON hợp lệ (không markdown, không bọc trong ba dấu huyền, không giải thích thêm) theo đúng cấu trúc:
{"mode": "academic", "subject": "tên môn học (VD: Toán, Vật lý, Hóa học, Sinh học, Lịch sử, Địa lý, Ngữ văn, Tin học, Kinh tế, Khác)", "topic": "tên bài/chủ đề chính của video", "summary": "tóm tắt nội dung bằng tiếng Việt, 4-6 câu", "sections": [{"start": số giây (number) bắt đầu mục này trong video, "title": "tên mục/đề mục ngắn gọn", "summary": "1-2 câu nội dung mục"}, ...], "formulas": [{"name": "tên công thức/định lý/phương trình", "formula": "công thức viết bằng KÝ TỰ UNICODE dễ đọc (VD: x² + y² = z², Δ = b² − 4ac, v = s/t, ∫ f(x)dx, √(a²+b²), π, α, →). TUYỆT ĐỐI KHÔNG dùng LaTeX hay ký hiệu dollar", "explain": "giải thích ý nghĩa từng ký hiệu và điều kiện áp dụng", "time": số giây công thức xuất hiện}, ...], "keyPoints": [{"point": "khái niệm/ý chính", "detail": "giải thích ngắn gọn dễ hiểu", "time": số giây}, ...], "examples": [{"problem": "đề bài ví dụ được giải trong video", "solution": "các bước giải ngắn gọn và đáp số", "time": số giây}, ...], "quiz": [{"type": "single", "q": "câu hỏi trắc nghiệm TỰ ĐỨNG ĐƯỢC (không nhắc 'trong video')", "options": ["đáp án A", "đáp án B", "đáp án C", "đáp án D"], "answer": chỉ số đáp án đúng 0-3, "explain": "giải thích ngắn vì sao đúng"}, {"type": "numeric", "q": "bài toán có đáp số là MỘT số", "answer": "số (dùng dấu chấm thập phân)", "explain": "cách giải ngắn"}, ...]}
Yêu cầu: "sections" PHẢI phủ toàn bộ video theo thứ tự thời gian tăng dần (video càng dài càng nhiều mục, tối thiểu 4 mục); "formulas" liệt kê ĐẦY ĐỦ mọi công thức/định lý xuất hiện (mảng rỗng nếu môn không có công thức); "quiz" gồm 10-15 câu bám sát nội dung, từ dễ đến khó, ưu tiên dạng single, chỉ dùng numeric khi đáp số là một số rõ ràng. Mọi thời gian là số GIÂY tính từ đầu video.`;
            const modeHint = videoStudyMode === 'language' ? 'Video này là học NGOẠI NGỮ: chỉ làm theo HƯỚNG DẪN A.' : videoStudyMode === 'academic' ? 'Video này là bài học MÔN HỌC: chỉ làm theo HƯỚNG DẪN B.' : 'Hãy TỰ NHẬN BIẾT loại video.';
            const prompt = videoStudyMode === 'language' ? promptA : videoStudyMode === 'academic' ? promptB
                : `Trước tiên hãy xác định loại video: (A) video dạy/phân tích NGOẠI NGỮ (người nói/viết một ngôn ngữ để học từ vựng, ngữ pháp, giao tiếp) hay (B) video bài giảng/kiến thức MÔN HỌC khác (Toán, Lý, Hóa, Sinh, Sử, Địa, Văn, Tin, Kinh tế...). ${modeHint} Nếu là (A) làm đúng theo HƯỚNG DẪN A; nếu là (B) làm đúng theo HƯỚNG DẪN B. Chỉ trả về MỘT JSON theo cấu trúc của hướng dẫn tương ứng.\n\n===== HƯỚNG DẪN A =====\n${promptA}\n\n===== HƯỚNG DẪN B =====\n${promptB}`;
            if (!/(youtube\.com|youtu\.be)/i.test(videoLink.trim())) { setVideoAnalyzing(false); playSfx('ERROR'); return alert('Hiện chỉ hỗ trợ link YouTube (nhúng bằng trình phát chính thức). TikTok và các nền tảng khác chưa được hỗ trợ vì không cho phép phân tích/nhúng theo quy định bản quyền của dự án.'); }
            const data = await geminiGenerateContent(anyGeminiKey, [
                { file_data: { file_uri: videoLink.trim() } },
                { text: prompt }
            ]);

            let raw = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

            // Thanh tẩy mọi tà khí Markdown để lấy đúng lõi JSON
            raw = raw.replace(/```json/gi, '').replace(/```/g, '').trim();
            const startIndex = raw.indexOf('{');
            const endIndex = raw.lastIndexOf('}');
            if (startIndex !== -1 && endIndex !== -1) {
                raw = raw.substring(startIndex, endIndex + 1);
            }

            const parsed = JSON.parse(raw);
            if (parsed && parsed.mode === 'academic') {
                // Chuẩn hoá dữ liệu môn học: sắp xếp mục theo thời gian, bỏ phần tử rỗng
                const num = (v) => { const n = Number(v); return isFinite(n) && n >= 0 ? n : 0; };
                parsed.sections = (Array.isArray(parsed.sections) ? parsed.sections : []).filter(s => s && s.title).map(s => ({ ...s, start: num(s.start) })).sort((a, b) => a.start - b.start);
                parsed.formulas = (Array.isArray(parsed.formulas) ? parsed.formulas : []).filter(f => f && (f.formula || f.name)).map(f => ({ ...f, time: num(f.time) }));
                parsed.keyPoints = (Array.isArray(parsed.keyPoints) ? parsed.keyPoints : []).filter(k => k && k.point).map(k => ({ ...k, time: num(k.time) }));
                parsed.examples = (Array.isArray(parsed.examples) ? parsed.examples : []).filter(x => x && x.problem).map(x => ({ ...x, time: num(x.time) }));
                parsed.quiz = Array.isArray(parsed.quiz) ? parsed.quiz : [];
                setAcademicQuizTitle(`${parsed.subject || 'Môn học'}: ${parsed.topic || 'Bài học'}`.slice(0, 80));
            }
            setVideoResult(parsed);
            playSfx('SUCCESS');
        } catch (e) {
            alert("Phân tích thất bại! Chi tiết: " + shortErr(e.message));
        } finally {
            setVideoAnalyzing(false);
        }
    };
    // Nhận Linh Thạch khi lưu bài học video (chỉ tính lần đầu lưu 1 link video, tránh spam nút để
    // farm vô hạn). Bùa Nhân Đôi (x2_card) cũng được áp dụng ở đây, giống hệt lúc thắng 1 ải.
    const saveVideoNoteAction = async () => {
        if (!videoResult || !user) return;
        const alreadySaved = (user.videoNotes || []).some(n => n.link === videoLink.trim());
        let gainedSpirit = 0;
        // Thưởng lưu bài học video do MÁY CHỦ quyết định (chỉ lần đầu mỗi link, đã áp dụng cảnh giới/x2/bùa) — xem claimVideoReward.
        const noteCode = await generateAndStoreVideoShareCode({ link: videoLink.trim(), summary: videoResult.summary, translations: videoResult.translations || [], transcript: videoResult.transcript || [], isCjk: videoResult.isCjk || false, transcriptPinyin: videoResult.transcriptPinyin || [], transcriptTranslation: videoResult.transcriptTranslation || [], transcriptTime: videoResult.transcriptTime || [] });
        const updatePayload = {
            videoNotes: firebase.firestore.FieldValue.arrayUnion({
                id: Date.now(), link: videoLink.trim(), summary: videoResult.summary,
                translations: videoResult.translations || [], savedAt: Date.now(), code: noteCode,
                // SỬA LỖI MẤT DỮ LIỆU: trước đây không lưu "transcript" (Văn Bản bấm từ) và bộ nhớ
                // tra từ (wordLookupCache) -> mở lại Bí Tịch đã lưu là mất trắng phần Văn Bản + phải
                // tra lại từ đầu. Giờ lưu kèm cả 2 để mở lại là thấy nguyên như lúc học.
                // Đồng thời lưu kèm isCjk/transcriptPinyin/transcriptTranslation (trước đây bị rớt
                // khi lưu -> mở lại mất luôn Pinyin + nút Luyện Viết Chữ), để mở lại thấy đủ y như lúc học.
                transcript: videoResult.transcript || [],
                isCjk: videoResult.isCjk || false,
                transcriptPinyin: videoResult.transcriptPinyin || [],
                transcriptTranslation: videoResult.transcriptTranslation || [],
                transcriptTime: videoResult.transcriptTime || [],
                wordCache: wordLookupCache
            }),
            studySeconds: firebase.firestore.FieldValue.increment(videoStudySeconds)
        };
        await safeUserUpdate(user.uid, updatePayload).catch(()=>{});
        if (!alreadySaved) { try { const vr = await claimVideoReward(videoLink.trim()); gainedSpirit = vr.spirit || 0; } catch (e) { console.warn('claimVideoReward:', (e && e.message) || e); } }
        try { SRS.addMany(videoResult.translations || [], (videoResult.transcript || []).join('')); } catch (e) {}
        setVideoShareCode(noteCode);
        playSfx('SUCCESS');
        // 🏆 Thay cho alert() cũ: hiện bảng THU HOẠCH + Phong Thần Bảng TOP 5 giống hệt lúc Vượt Ải,
        // để việc Học Qua Video cũng có cảm giác "nhận thưởng" rõ ràng và biết ngay mình đang xếp hạng bao nhiêu.
        setVideoSaveReward({ stones: gainedSpirit, alreadySaved });
    };
    const shareVideoNoteAction = async (note) => {
        playSfx('CLICK');
        let code = note.code;
        // Mã cũ (định dạng nén LZString dài, lưu từ trước khi cập nhật) hoặc chưa có mã sẵn
        // -> sinh mã số ngắn mới rồi cập nhật luôn lại vào Tàng Kinh Các để lần sau dùng lại mã ngắn này.
        if (!isShortVideoCode(code)) {
            code = await generateAndStoreVideoShareCode({ link: note.link, summary: note.summary, translations: note.translations || [], transcript: note.transcript || [], isCjk: note.isCjk || false, transcriptPinyin: note.transcriptPinyin || [], transcriptTranslation: note.transcriptTranslation || [], transcriptTime: note.transcriptTime || [] });
            if (user) {
                const updatedNotes = (user.videoNotes || []).map(x => x.id === note.id ? { ...x, code } : x);
                safeUserUpdate(user.uid, { videoNotes: updatedNotes }).catch(()=>{});
            }
        }
        navigator.clipboard.writeText(code);
        alert(`Đã chép Mã Bí Tịch Video: ${code}`);
    };
    const importVideoCodeAction = async () => {
        playSfx('CLICK');
        const code = videoImportCode.trim();
        if (!code) return alert("Xin dán Mã Bí Tịch Video vào trước!");
        try {
            let parsed;
            if (isShortVideoCode(code)) {
                // Mã ngắn: tra thẳng trên Tàng Kinh Các (Firestore) theo mã làm khoá.
                const doc = await firestore.collection('videoShares').doc(/^\d+$/.test(code) ? code : code.toUpperCase()).get();
                if (!doc.exists) throw new Error('không tìm thấy mã');
                parsed = doc.data();
            } else {
                // Mã cũ (định dạng nén dài) - vẫn hỗ trợ đọc để không hỏng các mã đã chia sẻ trước khi cập nhật.
                parsed = JSON.parse(LZString.decompressFromEncodedURIComponent(code));
                if (parsed.ty !== 'video') throw new Error('sai định dạng');
            }
            if (!parsed.link) throw new Error('sai định dạng');
            setVideoLink(parsed.link);
            setVideoResult({ summary: parsed.summary, translations: parsed.translations || [], transcript: parsed.transcript || [], isCjk: parsed.isCjk || false, transcriptPinyin: parsed.transcriptPinyin || [], transcriptTranslation: parsed.transcriptTranslation || [], transcriptTime: parsed.transcriptTime || [] });
            setWordLookupCache({});
            setVideoQuizActive(false); setVideoQuizRounds([]); setVideoImportCode('');
            playSfx('SUCCESS');
            alert("Đã nạp Bí Tịch Video từ Mã chia sẻ!");
        } catch (e) {
            alert("Mã Bí Tịch Video không hợp lệ hoặc đã bị hỏng!");
            playSfx('WRONG');
        }
    };
    // 🆕 ĐỒNG BỘ TÍNH NĂNG "TẢI NGỌC GIẢN" (.TXT/.DOCX) SANG HỌC QUA VIDEO: trước đây mục này chỉ
    // tạo được từ vựng bằng cách phân tích video, không có cách nào tải file danh sách từ vựng có
    // sẵn lên như bên Ải Bí Tịch. Dùng lại đúng cơ chế AI đọc hiểu văn bản (parseAiQuizJson,
    // sanitizeAiMathText) để tách cặp "từ - nghĩa" rồi gộp thẳng vào Từ Vựng của video đang xem.
    const analyzeVocabTextWithAI = async (rawText) => {
        const prompt = `Đây là văn bản thô trích xuất từ 1 file danh sách từ vựng (.txt hoặc .docx), có thể trình bày dưới nhiều kiểu khác nhau (gạch đầu dòng, đánh số, bảng, dấu hai chấm, dấu gạch ngang, tab...). Hãy đọc hiểu và tách thành các cặp "từ/cụm từ gốc - nghĩa/bản dịch". Trả lời DUY NHẤT bằng JSON hợp lệ, không markdown, theo đúng cấu trúc:\n{"translations": [{"original": "từ hoặc cụm từ gốc", "translated": "nghĩa/bản dịch tương ứng"}]}\nBỏ qua phần không phải từ vựng (tiêu đề, hướng dẫn, số trang...). Tối đa 60 cặp.\n\nVĂN BẢN:\n"""${rawText.slice(0, 15000)}"""`;
        const data = await geminiGenerateContent(anyGeminiKey, [{ text: prompt }]);
        const rawResp = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
        const parsed = parseAiQuizJson(rawResp);
        const list = (parsed.translations || []).map(t => ({ original: sanitizeAiMathText(t.original || '').trim(), translated: sanitizeAiMathText(t.translated || '').trim() })).filter(t => t.original && t.translated);
        if (list.length < 2) throw new Error('AI không tách được đủ từ vựng (cần tối thiểu 2 cặp) từ file này.');
        return list;
    };
    const handleVocabFileUpload = (e) => {
        const file = e.target.files[0]; if (!file) return;
        if (!anyGeminiKey) { alert("Ngài cần nhập API Key (Gemini) trước ở khung phía trên để AI đọc file từ vựng!"); e.target.value = ''; return; }
        const ext = file.name.split('.').pop().toLowerCase();
        const process = async (rawText) => {
            if (!rawText || !rawText.trim()) { alert("File từ vựng trống rỗng!"); return; }
            playSfx('CLICK');
            setVocabFileAnalyzing(true);
            try {
                const added = await analyzeVocabTextWithAI(rawText);
                setVideoResult(prev => ({
                    summary: prev?.summary || 'Bộ từ vựng nhập từ Ngọc Giản (.txt/.docx).',
                    translations: [...(prev?.translations || []), ...added],
                    transcript: prev?.transcript || [], isCjk: prev?.isCjk || false,
                    transcriptPinyin: prev?.transcriptPinyin || [], transcriptTranslation: prev?.transcriptTranslation || [], transcriptTime: prev?.transcriptTime || []
                }));
                playSfx('SUCCESS');
                alert(`AI đã thêm ${added.length} cặp từ vựng từ file! Kéo xuống bấm "🧠 ÔN TẬP TỪ VỰNG" để vào ải ngay.`);
            } catch (err) {
                alert("AI phân tích file từ vựng thất bại! Chi tiết: " + shortErr(err.message));
            } finally {
                setVocabFileAnalyzing(false); e.target.value = '';
            }
        };
        if (ext === 'docx') {
            if (typeof mammoth === 'undefined') { alert("Thần thú Mammoth chưa tỉnh giấc, xin chờ lát nữa!"); e.target.value = ''; return; }
            const reader = new FileReader();
            reader.onload = (ev) => { mammoth.extractRawText({ arrayBuffer: ev.target.result }).then(res => process(res.value)).catch(() => alert("Lỗi dịch ngọc giản Docx!")); };
            reader.readAsArrayBuffer(file);
        } else {
            const reader = new FileReader();
            reader.onload = (ev) => { process(ev.target.result); };
            reader.readAsText(file);
        }
    };

    return { academicQuizTitle, analyzeVideoAction, handleVocabFileUpload, importVideoCodeAction, loadSavedVideoNote, saveAcademicQuizAction, saveVideoNoteAction, setAcademicQuizTitle, setVideoImportCode, setVideoSaveReward, shareVideoNoteAction, videoAnalyzing, videoImportCode, videoSaveReward, videoShareCode, vocabFileAnalyzing };
}
