import { SRS } from '../../lib/srs.js';
import { V2_SCORING_CFG } from './scoringConfig.js';
import { buildEssayPrompt, parseEssayFeedback, sanitizeEssayAnswer } from '../../quiz-v2/essayRubric.js';
import { claimQuizReward, startQuiz } from '../../lib/serverApi.js';
import { createAdaptiveSession } from '../../adaptive/adaptiveSession.js';
import { describeShortAnswer, gradeShortAnswer } from '../../quiz-v2/shortAnswer.js';
import { geminiGenerateContent } from '../../lib/gemini.js';
import { isEssayType, isShortType, isTrueFalseType } from '../../quiz-v2/questionTypes.js';
import { maxScoreOf, scoreQuestion } from '../../quiz-v2/quizScoringConfig.js';
import { orderForRun } from '../../quiz-v2/quizSections.js';
import { quizFingerprint } from '../../lib/quizFingerprint.js';
import { safeUserUpdate } from '../../lib/userData.js';
import { sanitizeAiMathText, shuffleArray } from '../../lib/helpers.js';
import { shortErr } from '../../lib/format.js';

const { useState, useRef } = React;

export function useQuiz({ core, audio, gemini, exampath, nav }) {
    const { user } = core;
    const { playSfx, playVictoryFx } = audio;
    const { anyGeminiKey } = gemini;
    const { examPathActiveNodeId, examPathNodeStartRef, setExamPathActiveNodeId, setExamPathFinaleInfo, setExamPathLastRunCounted, setShowVictoryFx } = exampath;
    const { changeAppState } = nav;
    const quizSessionRef = useRef(null); // Promise<sessionId|null> do startQuiz (máy chủ) cấp lúc vào Ải
    // Quiz State
    const [activeQuiz, setActiveQuiz] = useState([]);
    const [curIdx, setCurIdx] = useState(0);
    const [correctAnswers, setCorrectAnswers] = useState(0);
    const [selectedOption, setSelectedOption] = useState(null);
    // 🆕 TÍNH NĂNG MỚI: hỗ trợ câu hỏi CHỌN NHIỀU ĐÁP ÁN (dạng đúng/sai nhiều ý) và câu hỏi ĐIỀN SỐ.
    // selectedOptions: dùng cho type='multi' - mảng song song với "o", mỗi phần tử true (Đúng) /
    // false (Sai) / undefined (chưa chọn) ứng với từng ý a/b/c/d.
    const [selectedOptions, setSelectedOptions] = useState([]);
    const [numericAnswer, setNumericAnswer] = useState(''); // dùng cho câu hỏi type = 'numeric'
    const [showExplanation, setShowExplanation] = useState(false);
    // 🆕 DỪNG LẠI SAU MỖI CÂU: không tự động chuyển câu nữa, người chơi tự bấm "Câu Tiếp Theo"
    // sau khi xem giải thích / bấm AI phân tích xong.
    const [aiExplainText, setAiExplainText] = useState('');
    const [aiExplainLoading, setAiExplainLoading] = useState(false);
    const [lightboxImg, setLightboxImg] = useState(null); // 🆕 xem ảnh câu hỏi phóng to (đồ thị, sơ đồ...)
    // 🆕 GỢI Ý KHI TRẢ LỜI SAI (câu 1 đáp án): đáp án sai bị loại khỏi danh sách, hiện bảng gợi ý,
    // người học được thử lại thay vì kết thúc câu ngay lập tức.
    const [eliminatedOptions, setEliminatedOptions] = useState([]);
    const [hintText, setHintText] = useState('');
    const [hintLoading, setHintLoading] = useState(false);
    const [stonesGained, setStonesGained] = useState(0);
    const [fameGained, setFameGained] = useState(0);
    const v2ScoresRef = useRef([]); // QUIZ ENGINE V2: điểm từng câu theo phần (đo lường, không ảnh hưởng thưởng)
    const [essayFeedback, setEssayFeedback] = useState(null); // QUIZ ENGINE V2: phản hồi AI gợi ý cho câu tự luận hiện tại
    const alepRef = useRef(null);
 if (!alepRef.current) alepRef.current = createAdaptiveSession(); // ALEP 0.1: ghi nhận lượt làm (chỉ đo lường)
    const quizTimerRef = useRef(null);
    // 🗺️ Dọn examPathActiveNodeId khi vào 1 Ải THƯỜNG (không thuộc Đạo Lộ) từ Tàng Kinh Các, phòng
    // trường hợp còn sót giá trị cũ từ lần "🚪 Bỏ ải" giữa chừng 1 node Tu Luyện Chi Lộ trước đó -
    // tránh quiz thường bị tính nhầm điểm/tiến độ vào Đạo Lộ.
    const handleEnterQuiz = (quizData) => { playSfx('CLICK'); setExamPathActiveNodeId(null); startFreshQuiz(quizData); };
    const startFreshQuiz = (quizData) => {
        alepRef.current.begin(); // ALEP 0.1
        v2ScoresRef.current = []; setEssayFeedback(null);
        let mixedQuestions = orderForRun(quizData, shuffleArray).map(q => { // V2: Bí Tịch cũ = shuffle toàn bộ như trước; Bí Tịch có phần = giữ PHẦN I->IV, xáo trong từng phần
            // 🆕 câu hỏi ĐIỀN SỐ (type = 'numeric') không có lựa chọn A/B/C/D nên không cần xáo trộn.
            if (q.type === 'numeric' || isShortType(q.type) || isEssayType(q.type) || q.type === 'truefalse') return { ...q }; // V2: trả lời ngắn / tự luận không có lựa chọn; Đúng/Sai mới giữ nguyên thứ tự ý A-D
            const isCorrectIdx = (idx) => Array.isArray(q.c) ? q.c.includes(idx) : idx === q.c;
            let options = q.o.map((text, idx) => ({ text, isCorrect: isCorrectIdx(idx) }));
            let shuffledOptions = shuffleArray(options);
            let newO = shuffledOptions.map(x => x.text);
            // 🆕 câu hỏi CHỌN NHIỀU ĐÁP ÁN (type = 'multi'): c là MẢNG các chỉ số đúng sau khi xáo trộn.
            let newC = isTrueFalseType(q.type)
                ? shuffledOptions.reduce((arr, x, i) => { if (x.isCorrect) arr.push(i); return arr; }, [])
                : shuffledOptions.findIndex(x => x.isCorrect);
            return { ...q, o: newO, c: newC };
        });
        setActiveQuiz(mixedQuestions); setCurIdx(0); setCorrectAnswers(0); setSelectedOption(null); setSelectedOptions([]); setNumericAnswer(''); setShowExplanation(false); setAiExplainText(''); setEliminatedOptions([]); setHintText('');
        // Phiên chấm thưởng do máy chủ cấp (một lần, tính giờ bằng đồng hồ máy chủ). Lỗi mạng => null => lượt này không nhận thưởng tự động.
        quizSessionRef.current = startQuiz(Math.max(1, mixedQuestions.filter(q => !isEssayType(q.type)).length), quizFingerprint(mixedQuestions)).then(r => r.sessionId).catch(() => null);
        changeAppState('QUIZ');
    };
    // 🆕 TÁCH RIÊNG phần TÍNH THƯỞNG (thu thập số liệu) khỏi phần LƯU/CHUYỂN CÂU: giờ người chơi phải
    // tự bấm "Câu Tiếp Theo" / "Xem Kết Quả" (dừng lại sau mỗi câu để đọc giải thích / xin AI phân
    // tích) thay vì tự động nhảy câu sau 800ms-1000ms như trước.
    // extra (V2, tùy chọn): { correctCount, total } cho Đúng/Sai nhiều ý | { essay:true } cho tự luận (không đúng/sai, không tính thưởng)
    const finalizeAnswer = (isCorrect, extra) => {
        const isEssay = !!(extra && extra.essay);
        try { v2ScoresRef.current[curIdx] = scoreQuestion(activeQuiz[curIdx], isEssay ? {} : (extra && extra.total ? { correctCount: extra.correctCount, total: extra.total } : { correct: isCorrect }), V2_SCORING_CFG); } catch (e) {}
        alepRef.current.recordAnswer(curIdx, activeQuiz[curIdx], isCorrect, eliminatedOptions.length, isEssay ? { essay: { suggestedRatio: null } } : (extra && extra.total ? { ratio: extra.correctCount / extra.total } : undefined)); // ALEP 0.1 (không ném lỗi)
        if (!isEssay) setCorrectAnswers(prev => prev + (isCorrect ? 1 : 0));
        if (isEssay) playSfx('CLICK'); else if (isCorrect) playSfx('CORRECT'); else playSfx('WRONG');
        setShowExplanation(true);
        setAiExplainText(''); // câu mới -> xoá giải thích AI của câu trước
    };
    // 🆕 Người chơi chủ động bấm để sang câu tiếp theo, hoặc chốt kết quả nếu là câu cuối cùng.
    const continueAfterAnswer = async () => {
        if (curIdx < activeQuiz.length - 1) {
            setCurIdx(c => c + 1); setSelectedOption(null); setSelectedOptions([]); setNumericAnswer(''); setShowExplanation(false); setAiExplainText(''); setEliminatedOptions([]); setHintText(''); setEssayFeedback(null);
            alepRef.current.nextQuestion(); // ALEP 0.1
            return;
        }
        // Câu cuối cùng -> tính thưởng & lưu kết quả (logic y hệt bản cũ, chỉ khác là chạy khi bấm nút
        // thay vì tự động sau 1s).
        const finalCorrectCount = correctAnswers;
        const scoredLen = Math.max(1, activeQuiz.filter(q => !isEssayType(q.type)).length); // V2: tự luận không nằm trong mẫu số thưởng (bộ câu cũ: = activeQuiz.length như trước)
        let gainedStones = 0, gainedFame = 0, serverRes = null; // Thưởng do MÁY CHỦ tính (claimQuizReward); client không tự cộng Linh Thạch/Danh Vọng/điểm mùa.

        // 🗺️ TU LUYỆN CHI LỘ: nếu Ải vừa vượt qua thuộc 1 node trong Đạo Lộ (examPathActiveNodeId),
        // cập nhật % thành thạo (bestScore) + trạng thái node đó + MỞ KHOÁ Ải kế tiếp nếu đạt (>=50%
        // đúng), rồi cộng "thời gian luyện thi" của lượt này vào Đạo Hữu Bảng hôm nay - CHỈ cộng nếu
        // đang trong khung giờ 4h00-23h00 (xem isExamPathWindowOpen), đúng như yêu cầu "reset giải từ
        // 4h-23h". Thời gian được chặn trần ở 2 phút/câu để tránh gian lận bằng cách bỏ tab mở lâu.
        let examPathUpdate = null, examPathJustCompleted = false, examPathFinaleData = null;
        if (examPathActiveNodeId && user.examPath && user.examPath.nodes) {
            const scorePercent = Math.round((finalCorrectCount / scoredLen) * 100);
            const nodes = user.examPath.nodes.map(n => ({ ...n }));
            const idx = nodes.findIndex(n => n.id === examPathActiveNodeId);
            if (idx > -1) {
                nodes[idx].bestScore = Math.max(nodes[idx].bestScore || 0, scorePercent);
                nodes[idx].lastAttemptAt = Date.now();
                const passed = scorePercent >= 50;
                if (passed) {
                    nodes[idx].status = 'done';
                    if (idx + 1 < nodes.length && nodes[idx + 1].status === 'locked') nodes[idx + 1].status = 'unlocked';
                } else if (nodes[idx].status === 'locked') {
                    nodes[idx].status = 'unlocked';
                }
                examPathUpdate = { ...user.examPath, nodes };
                if (!user.examPath.completedAt && nodes.every(n => n.status === 'done')) {
                    examPathUpdate.completedAt = Date.now();
                    examPathJustCompleted = true;
                    // 🆕 chụp lại dữ liệu NGAY LÚC NÀY vì sau khi cập nhật Firestore, user.examPath cũ
                    // (trong closure) có thể không còn khớp state mới nhất - chụp trước cho chắc.
                    examPathFinaleData = { title: user.examPath.title, totalNodes: nodes.length, days: user.examPath.days };
                }
            }
        }

        // ALEP 0.1: ghi nhận lượt làm (chỉ đo lường, đặt SAU khi đã tính thưởng / Đạo Lộ, không ảnh hưởng chúng)
        try { const alepNode = (examPathActiveNodeId && user.examPath && user.examPath.nodes) ? user.examPath.nodes.find(n => n.id === examPathActiveNodeId) : null; alepRef.current.commit({ uid: user.uid, source: alepNode ? 'examPath' : 'quiz', nodeType: alepNode ? alepNode.type : null, nodeTopics: alepNode ? alepNode.topics : [] }); } catch (e) {}
        try {
            try { SRS.logQuiz(finalCorrectCount, scoredLen); } catch (e) {}
            // 1) Xin thưởng ở máy chủ. Không có nhánh dự phòng cộng ở client: lỗi => không có thưởng (tiến độ Đạo Lộ vẫn được lưu bên dưới).
            try {
                const sid = await quizSessionRef.current; quizSessionRef.current = null;
                if (!sid) throw new Error('Chưa có phiên chấm thưởng từ máy chủ');
                serverRes = await claimQuizReward(sid, finalCorrectCount, !!(examPathActiveNodeId && user.examPath && user.examPath.nodes));
                gainedStones = serverRes.stones || 0; gainedFame = serverRes.fame || 0;
            } catch (re) { console.error('claimQuizReward lỗi:', re); alert('Chưa nhận được phần thưởng từ máy chủ: ' + shortErr((re && re.message) || String(re))); }
            setStonesGained(gainedStones); setFameGained(gainedFame);
            if (finalCorrectCount > 0) playSfx('SUCCESS'); else playSfx('FAIL');
            // 2) Chỉ ghi các trường tiến độ cá nhân (được phép ở client)
            let updatePayload = {};
            if (examPathUpdate) {
                updatePayload.examPath = examPathUpdate;
                setExamPathLastRunCounted(serverRes ? serverRes.examPathCounted : false); // máy chủ quyết định có cộng Đạo Hữu Bảng hay không
            } else {
                setExamPathLastRunCounted(null); // lượt vừa rồi không thuộc Đạo Lộ Tu Luyện Chi Lộ
            }

            if (serverRes && serverRes.streakCount > (user.streakCount || 0)) { setTimeout(() => alert(`🔥 Ngài đã thắp sáng chuỗi điểm danh: ${serverRes.streakCount} ngày!`), 500); }
            if (Object.keys(updatePayload).length) await safeUserUpdate(user.uid, updatePayload);

            // 🎉 Vừa hoàn thành TOÀN BỘ Đạo Lộ (mọi Ải đều đã "done") -> hiệu ứng Chiến Thắng lớn +
            // modal tổng kết riêng (ở lại tới khi tự đóng, không chỉ thoáng qua như pháo hoa).
            if (examPathJustCompleted) { playVictoryFx(); setShowVictoryFx(true); setTimeout(() => setShowVictoryFx(false), 4000); setExamPathFinaleInfo(examPathFinaleData); }
            changeAppState('RESULT');
        } catch (e) { console.error("Lỗi đồng bộ thiên cơ:", e); alert("Mất kết nối mạng! Tiến trình có thể chưa được lưu."); }
    };
    // 🆕 Câu hỏi 1 đáp án: bấm SAI -> loại đáp án đó khỏi danh sách + hiện bảng gợi ý, KHÔNG kết
    // thúc câu ngay (được thử lại). Bấm ĐÚNG -> chấm điểm như cũ.
    // 🛡️ SỬA LỖI TÍNH GIAN ĐIỂM: trước đây cho đoán tới khi đúng thì thôi, nên với câu 4 lựa chọn,
    // sai 3 lần thì lựa chọn cuối cùng CHẮC CHẮN đúng (không phải thực lực) mà vẫn được tính là
    // "câu đúng" khi cộng tổng thưởng. Giờ giới hạn: SAI ĐỦ 2 LẦN trên 1 câu sẽ tự động tính SAI
    // luôn (hiện đáp án đúng), không cho đoán ăn may thêm nữa.
    const handleAnswerSelect = (optionIndex) => {
        if (showExplanation || eliminatedOptions.includes(optionIndex)) return;
        const qData = activeQuiz[curIdx];
        if (optionIndex === qData.c) {
            setSelectedOption(optionIndex);
            finalizeAnswer(true);
        } else {
            playSfx('WRONG');
            const newElim = [...eliminatedOptions, optionIndex];
            setEliminatedOptions(newElim);
            setHintText(''); // reset gợi ý AI cũ (nếu có) để nhắc người học có thể xin gợi ý mới
            if (newElim.length >= 2) { setSelectedOption(optionIndex); finalizeAnswer(false); }
        }
    };
    // 🆕 "Bó tay, xem đáp án": dùng khi đã đoán sai vài lần và muốn xem đáp án đúng luôn (tính là sai).
    const handleGiveUpQuestion = () => {
        if (showExplanation) return;
        alepRef.current.flagGiveUp(curIdx); // ALEP 0.1
        setSelectedOption(null);
        finalizeAnswer(false);
    };
    // 🆕 XIN GỢI Ý AI: gợi ý ngắn gọn giúp định hướng suy nghĩ mà KHÔNG được tiết lộ đáp án đúng.
    const handleRequestAiHint = async () => {
        if (!anyGeminiKey) { alert("Ngài cần nhập API Key (Gemini) trước! Vào mục HỌC QUA VIDEO TIÊN ÂM để nhập Key (dùng chung, miễn phí tại aistudio.google.com/apikey)."); return; }
        const qData = activeQuiz[curIdx];
        if (!showExplanation) alepRef.current.flagHint(curIdx); // ALEP 0.1
        setHintLoading(true);
        try {
            const remainingOpts = qData.o.filter((_, i) => !eliminatedOptions.includes(i) && i !== qData.c);
            const prompt = `Đây là 1 câu hỏi trắc nghiệm:\n"${qData.q}"\nCác lựa chọn còn lại (đã ẩn đáp án đúng, không được đoán ra): ${qData.o.map((t,i)=>`${String.fromCharCode(65+i)}. ${t}`).join('; ')}\nNgười học vừa chọn sai các lựa chọn: ${eliminatedOptions.map(i=>String.fromCharCode(65+i)).join(', ') || '(chưa có)'}.\nHãy đưa ra 1 GỢI Ý ngắn gọn (2-3 câu) giúp người học định hướng cách suy nghĩ/công thức cần dùng để tự tìm ra đáp án đúng. TUYỆT ĐỐI KHÔNG được nói thẳng đáp án đúng là gì, chỉ gợi mở cách làm.`;
            const data = await geminiGenerateContent(anyGeminiKey, [{ text: prompt }]);
            const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
            setHintText(sanitizeAiMathText(text.trim()) || 'AI không trả về được nội dung, xin thử lại.');
        } catch (err) {
            setHintText('❌ Lỗi khi lấy gợi ý: ' + shortErr(err.message));
        } finally {
            setHintLoading(false);
        }
    };
    // 🆕 Câu hỏi ĐÚNG/SAI NHIỀU Ý: bấm nút Đ hoặc S cho từng ý, chưa chấm điểm ngay.
    // selectedOptions[optionIndex] = true (đã chọn Đúng) / false (đã chọn Sai) / undefined (chưa chọn).
    const setMultiRowAnswer = (optionIndex, val) => {
        if (showExplanation) return;
        setSelectedOptions(prev => { const arr = [...prev]; arr[optionIndex] = val; return arr; });
    };
    // 🆕 Chấm điểm câu ĐÚNG/SAI NHIỀU Ý: phải chọn Đ/S cho ĐỦ tất cả các ý và ĐÚNG hết mới tính đúng.
    const handleSubmitMultiAnswer = () => {
        if (showExplanation) return;
        const total = activeQuiz[curIdx].o.length;
        for (let i = 0; i < total; i++) {
            if (selectedOptions[i] !== true && selectedOptions[i] !== false) { alert("Xin hãy chọn Đúng hoặc Sai cho TẤT CẢ các ý!"); return; }
        }
        const correctSet = Array.isArray(activeQuiz[curIdx].c) ? activeQuiz[curIdx].c : [];
        let isCorrect = true, correctCount = 0;
        for (let i = 0; i < total; i++) { if (selectedOptions[i] === correctSet.includes(i)) correctCount++; else isCorrect = false; }
        finalizeAnswer(isCorrect, { correctCount, total }); // V2: đúng hết mới tính "đúng" cho thưởng (như cũ); điểm phần tính theo số ý đúng
    };
    // 🆕 QUIZ ENGINE V2 – TRẢ LỜI NGẮN (số hoặc chữ): chấm bằng gradeShortAnswer (số: có sai số; chữ: khớp chính xác danh sách đáp án chấp nhận)
    const handleSubmitShortAnswer = () => {
        if (showExplanation) return;
        if (!numericAnswer || !numericAnswer.trim()) { alert("Xin hãy nhập đáp án!"); return; }
        finalizeAnswer(gradeShortAnswer(activeQuiz[curIdx], numericAnswer).correct);
    };
    // 🆕 QUIZ ENGINE V2 – TỰ LUẬN: nộp bài (chưa có điểm). Không tính đúng/sai, không tính thưởng.
    const handleSubmitEssay = () => {
        if (showExplanation) return;
        if (!sanitizeEssayAnswer(numericAnswer)) { alert("Xin hãy viết bài làm trước khi nộp!"); return; }
        finalizeAnswer(false, { essay: true });
    };
    // 🆕 AI chỉ GỢI Ý điểm theo rubric (không chính thức). Bài làm được gửi tới Gemini bằng API Key của chính người dùng.
    const handleRequestEssayFeedback = async () => {
        if (!anyGeminiKey) { alert("Ngài cần nhập API Key (Gemini) trước! Vào mục HỌC QUA VIDEO TIÊN ÂM để nhập Key (dùng chung, miễn phí tại aistudio.google.com/apikey)."); return; }
        const qData = activeQuiz[curIdx]; const idx = curIdx; const max = maxScoreOf(qData, V2_SCORING_CFG);
        setEssayFeedback({ loading: true });
        try {
            const data = await geminiGenerateContent(anyGeminiKey, [{ text: buildEssayPrompt(qData, sanitizeEssayAnswer(numericAnswer), max) }]);
            const fb = parseEssayFeedback(data.candidates?.[0]?.content?.parts?.[0]?.text || '', qData, max);
            if (!fb.ok) { setEssayFeedback({ error: fb.error + ' Xin thử lại.' }); return; }
            v2ScoresRef.current[idx] = scoreQuestion(qData, { suggestedScore: fb.suggestedScore }, V2_SCORING_CFG);
            alepRef.current.recordAnswer(idx, qData, false, 0, { essay: { suggestedRatio: max > 0 ? fb.suggestedScore / max : null } }); // ghi đè bản ghi cùng câu; điểm AI luôn "chưa kiểm chứng"
            setEssayFeedback({ data: fb });
        } catch (err) { setEssayFeedback({ error: '❌ Lỗi khi nhờ AI: ' + shortErr(err.message) }); }
    };
    // 🆕 Chấm điểm câu ĐIỀN SỐ: so sánh số học (chấp nhận sai số nhỏ do làm tròn) thay vì so chuỗi cứng nhắc.
    const handleSubmitNumericAnswer = () => {
        if (showExplanation) return;
        if (!numericAnswer || !numericAnswer.trim()) { alert("Xin hãy nhập đáp án!"); return; }
        const userNum = parseFloat(String(numericAnswer).replace(',', '.'));
        const correctNum = parseFloat(String(activeQuiz[curIdx].c).replace(',', '.'));
        let isCorrect;
        if (!isNaN(userNum) && !isNaN(correctNum)) { isCorrect = Math.abs(userNum - correctNum) < 0.01; }
        else { isCorrect = String(numericAnswer).trim().toLowerCase() === String(activeQuiz[curIdx].c).trim().toLowerCase(); }
        finalizeAnswer(isCorrect);
    };
    // 🆕 AI PHÂN TÍCH: gọi Gemini giải thích tại sao đáp án đúng lại đúng / vì sao lựa chọn của
    // người chơi lại sai, dùng chung API Key Gemini đã lưu ở mục Học Qua Video.
    const handleAiExplainQuestion = async () => {
        if (!anyGeminiKey) { alert("Ngài cần nhập API Key (Gemini) trước! Vào mục HỌC QUA VIDEO TIÊN ÂM để nhập Key (dùng chung, miễn phí tại aistudio.google.com/apikey)."); return; }
        const qData = activeQuiz[curIdx];
        alepRef.current.flagAi(curIdx, showExplanation); // ALEP 0.1
        setAiExplainLoading(true); setAiExplainText('');
        try {
            let userAnswerDesc = '', correctAnswerDesc = '';
            if (isTrueFalseType(qData.type)) {
                const correctSet = Array.isArray(qData.c) ? qData.c : [];
                userAnswerDesc = qData.o.map((t, i) => `${String.fromCharCode(65+i)}: ${selectedOptions[i] === true ? 'Đúng' : selectedOptions[i] === false ? 'Sai' : 'chưa chọn'}`).join('; ');
                correctAnswerDesc = qData.o.map((t, i) => `${String.fromCharCode(65+i)}: ${correctSet.includes(i) ? 'Đúng' : 'Sai'}`).join('; ');
            } else if (qData.type === 'numeric' || isShortType(qData.type)) {
                userAnswerDesc = numericAnswer || '(bỏ trống)';
                correctAnswerDesc = qData.type === 'numeric' ? String(qData.c) : describeShortAnswer(qData);
            } else if (isEssayType(qData.type)) {
                userAnswerDesc = sanitizeEssayAnswer(numericAnswer) || '(bỏ trống)';
                correctAnswerDesc = qData.sampleAnswer || '(không có bài mẫu; hãy đối chiếu rubric)';
            } else {
                userAnswerDesc = selectedOption !== null ? `${String.fromCharCode(65+selectedOption)}. ${qData.o[selectedOption]}` : '(chưa chọn)';
                correctAnswerDesc = `${String.fromCharCode(65+qData.c)}. ${qData.o[qData.c]}`;
            }
            const optionsText = (qData.o && qData.o.length > 0) ? `Các lựa chọn/ý:\n${qData.o.map((t,i)=>`${String.fromCharCode(65+i)}. ${t}`).join('\n')}\n` : '';
            const prompt = `Đây là 1 câu hỏi trắc nghiệm/bài tập:\n"${qData.q}"\n${optionsText}Đáp án đúng: ${correctAnswerDesc}\nNgười học đã trả lời: ${userAnswerDesc}\nHãy giải thích ngắn gọn, dễ hiểu bằng tiếng Việt (khoảng 4-7 câu, có thể kèm công thức/phép tính ngắn gọn nếu cần) TẠI SAO đáp án đúng lại đúng. Nếu người học trả lời sai, giải thích thêm vì sao lựa chọn của họ sai. Đi thẳng vào giải thích, không chào hỏi rườm rà.`;
            const data = await geminiGenerateContent(anyGeminiKey, [{ text: prompt }]);
            const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
            setAiExplainText(sanitizeAiMathText(text.trim()) || 'AI không trả về được nội dung, xin thử lại.');
        } catch (err) {
            setAiExplainText('❌ Lỗi khi phân tích: ' + shortErr(err.message));
        } finally {
            setAiExplainLoading(false);
        }
    };
    // Vào 1 Ải cụ thể trong Đạo Đồ - dùng LẠI đúng luồng QUIZ/RESULT sẵn có (startFreshQuiz), chỉ
    // đánh dấu examPathActiveNodeId để continueAfterAnswer() biết đường cộng điểm/tiến độ đúng chỗ.
    const startExamPathNode = (node) => {
        if (node.status === 'locked') { playSfx('WRONG'); return alert("Ải này còn đang khoá! Hãy hoàn thành các Ải phía trước trước đã."); }
        playSfx('CLICK');
        setExamPathActiveNodeId(node.id);
        examPathNodeStartRef.current = Date.now();
        startFreshQuiz(node.questions);
    };

    return { activeQuiz, aiExplainLoading, aiExplainText, continueAfterAnswer, correctAnswers, curIdx, eliminatedOptions, essayFeedback, fameGained, handleAiExplainQuestion, handleAnswerSelect, handleEnterQuiz, handleGiveUpQuestion, handleRequestAiHint, handleRequestEssayFeedback, handleSubmitEssay, handleSubmitMultiAnswer, handleSubmitNumericAnswer, handleSubmitShortAnswer, hintLoading, hintText, lightboxImg, numericAnswer, quizTimerRef, selectedOption, selectedOptions, setActiveQuiz, setLightboxImg, setMultiRowAnswer, setNumericAnswer, showExplanation, startExamPathNode, stonesGained, v2ScoresRef };
}
