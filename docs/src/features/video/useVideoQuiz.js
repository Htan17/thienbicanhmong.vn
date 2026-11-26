import { buffMult, getRankBonusPercent } from '../../config/gameData.js';
import { claimVideoQuizRound } from '../../lib/serverApi.js';
import { geminiGenerateContent } from '../../lib/gemini.js';
import { sanitizeAiMathText } from '../../lib/helpers.js';
import { shortErr } from '../../lib/format.js';
import { buildVideoVocabQuiz } from './videoHelpers.js';

const { useState, useRef } = React;

export function useVideoQuiz({ core, audio, gemini, videoplayer }) {
    const { user } = core;
    const { playSfx } = audio;
    const { anyGeminiKey } = gemini;
    const { videoResult } = videoplayer;
    // 🎓 ÔN TẬP TỪ VỰNG SAU KHI HỌC VIDEO: học xong không có gì để "luyện tập lại" ngay nên rất dễ quên.
    // Từ các cặp Câu gốc/Dịch nghĩa (videoResult.translations) tự sinh ra 1-2 "ải" trắc nghiệm ngắn
    // (tối đa 5 câu/ải) để ôn lại ngay từ vựng vừa học, không cần soạn quiz thủ công.
    const [videoQuizRounds, setVideoQuizRounds] = useState([]); // [[{term, options, correctIndex}], ...]
    const [videoQuizActive, setVideoQuizActive] = useState(false);
    const [videoQuizRoundIdx, setVideoQuizRoundIdx] = useState(0);
    const [videoQuizQIdx, setVideoQuizQIdx] = useState(0);
    const [videoQuizScore, setVideoQuizScore] = useState(0);
    const [videoQuizSelected, setVideoQuizSelected] = useState(null);
    const [videoQuizShowResult, setVideoQuizShowResult] = useState(false);
    const [videoQuizRoundReward, setVideoQuizRoundReward] = useState(null); // { stones, fame } - thưởng vừa nhận khi vượt xong 1 ải ôn tập video
    // 🏁 TỔNG KẾT ẢI ÔN TẬP VIDEO: gom kết quả từng ải để cuối cùng hiện bảng tổng kết (trước đây
    // vượt xong ải cuối là modal đóng ngay, không thấy tổng điểm/tổng thưởng).
    const [videoQuizRoundResults, setVideoQuizRoundResults] = useState([]); // [{ round, score, total, stones, fame }]
    const [videoQuizFinished, setVideoQuizFinished] = useState(false);
    const videoQuizPayingRef = useRef(false); // chặn bấm đúp nút nhận thưởng -> cộng thưởng 2 lần
    // 🆕 BÊ NGUYÊN CẤU TRÚC TỪ ẢI BÍ TỊCH VĂN BẢN sang Ải Ôn Tập Từ Vựng: gợi ý khi chọn sai (đáp án
    // sai biến mất + bảng gợi ý AI) và AI phân tích sau khi trả lời.
    const [videoQuizEliminated, setVideoQuizEliminated] = useState([]);
    const [videoHintText, setVideoHintText] = useState('');
    const [videoHintLoading, setVideoHintLoading] = useState(false);
    const [videoAiExplainText, setVideoAiExplainText] = useState('');
    const [videoAiExplainLoading, setVideoAiExplainLoading] = useState(false);
    const startVideoVocabReview = () => {
        playSfx('CLICK');
        const rounds = buildVideoVocabQuiz(videoResult?.translations);
        if (rounds.length === 0) return alert("Chưa đủ từ vựng để tạo ải ôn tập! Cần ít nhất 2 mục Dịch Thuật.");
        setVideoQuizRounds(rounds); setVideoQuizRoundIdx(0); setVideoQuizQIdx(0);
        setVideoQuizScore(0); setVideoQuizSelected(null); setVideoQuizShowResult(false); setVideoQuizActive(true);
        setVideoQuizRoundReward(null); setVideoQuizEliminated([]); setVideoHintText(''); setVideoAiExplainText('');
        setVideoQuizRoundResults([]); setVideoQuizFinished(false); videoQuizPayingRef.current = false;
    };
    // 🆕 Bấm SAI -> loại đáp án đó + hiện bảng gợi ý (KHÔNG kết thúc câu ngay), giống hệt Ải Bí Tịch.
    // Bấm ĐÚNG -> chấm điểm và dừng lại chờ bấm "Câu Tiếp" (như cũ).
    // 🛡️ SỬA LỖI TÍNH GIAN ĐIỂM (đồng bộ với Ải Bí Tịch): sai đủ 2 lần trên 1 câu -> tự động tính
    // SAI luôn, không cho đoán ăn may đáp án cuối cùng còn lại.
    const selectVideoQuizAnswer = (optIdx) => {
        if (videoQuizSelected !== null || videoQuizEliminated.includes(optIdx)) return;
        const q = videoQuizRounds[videoQuizRoundIdx][videoQuizQIdx];
        if (optIdx === q.correctIndex) {
            setVideoQuizSelected(optIdx); setVideoQuizScore(s => s + 1); playSfx('CORRECT');
        } else {
            playSfx('WRONG');
            const newElim = [...videoQuizEliminated, optIdx];
            setVideoQuizEliminated(newElim);
            setVideoHintText('');
            if (newElim.length >= 2) { setVideoQuizSelected(optIdx); }
        }
    };
    // 🆕 "Bó tay, xem đáp án": tính là chưa trả lời đúng nhưng vẫn cho xem đáp án & đi tiếp.
    const handleVideoGiveUp = () => { setVideoQuizSelected(-1); playSfx('WRONG'); };
    // 🆕 XIN GỢI Ý AI cho từ vựng đang ôn (không được lộ nghĩa đúng)
    const handleVideoRequestHint = async () => {
        if (!anyGeminiKey) { alert("Ngài cần nhập API Key (Gemini) trước ở khung bên dưới!"); return; }
        const q = videoQuizRounds[videoQuizRoundIdx][videoQuizQIdx];
        setVideoHintLoading(true);
        try {
            const prompt = `Đây là 1 câu hỏi ôn từ vựng: "${q.term}"\nCác lựa chọn nghĩa: ${q.options.map((o,i)=>`${String.fromCharCode(65+i)}. ${o}`).join('; ')}\nNgười học vừa chọn sai: ${videoQuizEliminated.map(i=>String.fromCharCode(65+i)).join(', ') || '(chưa có)'}.\nHãy đưa ra 1 GỢI Ý ngắn gọn (1-2 câu) giúp người học liên tưởng/nhớ lại nghĩa đúng của từ này. TUYỆT ĐỐI KHÔNG được nói thẳng đáp án đúng.`;
            const data = await geminiGenerateContent(anyGeminiKey, [{ text: prompt }]);
            const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
            setVideoHintText(sanitizeAiMathText(text.trim()) || 'AI không trả về được nội dung, xin thử lại.');
        } catch (err) {
            setVideoHintText('❌ Lỗi khi lấy gợi ý: ' + shortErr(err.message));
        } finally {
            setVideoHintLoading(false);
        }
    };
    // 🆕 AI PHÂN TÍCH sau khi trả lời xong 1 câu ôn từ vựng
    const handleVideoAiExplain = async () => {
        if (!anyGeminiKey) { alert("Ngài cần nhập API Key (Gemini) trước ở khung bên dưới!"); return; }
        const q = videoQuizRounds[videoQuizRoundIdx][videoQuizQIdx];
        setVideoAiExplainLoading(true); setVideoAiExplainText('');
        try {
            const userAnswerDesc = videoQuizSelected === -1 ? '(đã bỏ cuộc, xem đáp án)' : `${String.fromCharCode(65+videoQuizSelected)}. ${q.options[videoQuizSelected]}`;
            const prompt = `Đây là 1 câu hỏi ôn từ vựng:\n"${q.term}"\nCác lựa chọn nghĩa: ${q.options.map((o,i)=>`${String.fromCharCode(65+i)}. ${o}`).join('; ')}\nĐáp án đúng: ${String.fromCharCode(65+q.correctIndex)}. ${q.options[q.correctIndex]}\nNgười học đã trả lời: ${userAnswerDesc}\nHãy giải thích ngắn gọn (2-4 câu) bằng tiếng Việt lý do nghĩa đúng là như vậy, có thể kèm ví dụ hoặc mẹo ghi nhớ. Đi thẳng vào giải thích, không chào hỏi rườm rà.`;
            const data = await geminiGenerateContent(anyGeminiKey, [{ text: prompt }]);
            const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
            setVideoAiExplainText(sanitizeAiMathText(text.trim()) || 'AI không trả về được nội dung, xin thử lại.');
        } catch (err) {
            setVideoAiExplainText('❌ Lỗi khi phân tích: ' + shortErr(err.message));
        } finally {
            setVideoAiExplainLoading(false);
        }
    };
    const nextVideoQuizQuestion = () => {
        playSfx('CLICK');
        const round = videoQuizRounds[videoQuizRoundIdx];
        if (videoQuizQIdx + 1 < round.length) { setVideoQuizQIdx(i => i + 1); setVideoQuizSelected(null); setVideoQuizEliminated([]); setVideoHintText(''); setVideoAiExplainText(''); }
        else { setVideoQuizShowResult(true); }
    };
    // 🎁 SỬA LỖI: trước đây vượt xong ải ôn tập video KHÔNG được thưởng gì cả (khác hẳn Ải Bí Tịch
    // văn bản, hễ đúng câu là +50 Linh Thạch/câu, đúng hết ải +50 Danh Vọng). Giờ đồng bộ đúng công
    // thức thưởng với Ải Bí Tịch: mỗi câu đúng +50 Linh Thạch, làm đúng hết cả ải +50 Danh Vọng,
    // có cộng thêm % thưởng Đột Phá Cảnh Giới và nhân đôi nếu đang có Bùa Nhân Đôi, y hệt Ải Bí Tịch.
    // 🧮 Công thức thưởng 1 ải ôn tập video (dùng CHUNG cho màn kết quả ải để xem trước VÀ lúc phát thưởng thật,
    // đảm bảo con số người chơi thấy = con số thực nhận).
    const calcVideoQuizRoundReward = (score, total) => {
        let stones = score * 50;
        const fame = (total > 0 && score === total) ? 50 : 0;
        if (stones > 0 && user) {
            const rankBonus = getRankBonusPercent(user.rank);
            if (rankBonus > 0) stones = Math.round(stones * (1 + rankBonus / 100));
            // 🆕 BÙA NHÂN ĐÔI BẢN MỚI: kiểm tra hiệu lực theo thời gian, không tiêu thẻ tại đây nữa.
            if (user.x2BoostExpiresAt && Date.now() < user.x2BoostExpiresAt) stones *= 2;
            stones = Math.round(stones * buffMult(user, 'spirit'));
        }
        return { stones, fame: user ? Math.round(fame * buffMult(user, 'fame')) : fame };
    };
    // 🎁 Bấm nút ở màn kết quả ải: phát thưởng ải vừa xong, ghi vào bảng tổng kết, rồi sang ải kế tiếp.
    // Nếu là ải CUỐI -> chuyển sang màn TỔNG KẾT (videoQuizFinished) thay vì đóng modal đột ngột.
    const nextVideoQuizRound = async () => {
        if (videoQuizPayingRef.current) return; // đang xử lý, bỏ qua bấm đúp
        videoQuizPayingRef.current = true;
        playSfx('CLICK');
        try {
            const round = videoQuizRounds[videoQuizRoundIdx];
            let { stones, fame } = calcVideoQuizRoundReward(videoQuizScore, round.length); // chỉ để xem trước; thưởng thật do máy chủ tính
            if (videoQuizScore > 0) {
                try { const r = await claimVideoQuizRound(videoQuizScore, round.length); stones = r.stones || 0; fame = r.fame || 0; }
                catch (e) { console.error("Lỗi phát thưởng ải ôn tập video:", e); stones = 0; fame = 0; }
            } else { stones = 0; fame = 0; }
            setVideoQuizRoundReward({ stones, fame });
            setVideoQuizRoundResults(prev => [...prev, { round: videoQuizRoundIdx + 1, score: videoQuizScore, total: round.length, stones, fame }]);
            if (videoQuizRoundIdx + 1 < videoQuizRounds.length) {
                setVideoQuizRoundIdx(i => i + 1); setVideoQuizQIdx(0); setVideoQuizScore(0);
                setVideoQuizSelected(null); setVideoQuizShowResult(false);
                setVideoQuizEliminated([]); setVideoHintText(''); setVideoAiExplainText('');
            } else {
                setVideoQuizShowResult(false);
                setVideoQuizFinished(true);
                playSfx('SUCCESS');
            }
        } finally { videoQuizPayingRef.current = false; }
    };
    // Đóng bảng tổng kết ôn tập video
    const closeVideoQuizSummary = () => {
        playSfx('CLICK');
        setVideoQuizActive(false); setVideoQuizFinished(false);
        setVideoQuizRoundResults([]); setVideoQuizRoundReward(null);
    };

    return { calcVideoQuizRoundReward, closeVideoQuizSummary, handleVideoAiExplain, handleVideoGiveUp, handleVideoRequestHint, nextVideoQuizQuestion, nextVideoQuizRound, selectVideoQuizAnswer, setVideoQuizActive, setVideoQuizRounds, startVideoVocabReview, videoAiExplainLoading, videoAiExplainText, videoHintLoading, videoHintText, videoQuizActive, videoQuizEliminated, videoQuizFinished, videoQuizQIdx, videoQuizRoundIdx, videoQuizRoundResults, videoQuizRounds, videoQuizScore, videoQuizSelected, videoQuizShowResult };
}
