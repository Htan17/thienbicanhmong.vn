// QUIZ ENGINE V2 – Giao diện cho câu TRẢ LỜI NGẮN, TỰ LUẬN và bảng TỔNG KẾT THEO PHẦN. Chỉ hiển thị; logic chấm nằm ở src/quiz-v2/*.
import { shortAnswerType } from '../../quiz-v2/questionTypes.js';
import { describeShortAnswer } from '../../quiz-v2/shortAnswer.js';

const fmt = (n) => (Math.round(n * 100) / 100).toString().replace('.', ',');

// Câu trả lời ngắn (số hoặc chữ). Nhận/ghi qua value/onChange của App (dùng chung ô nhập với điền số cũ).
export const ShortAnswerPanel = ({ q, value, onChange, onSubmit, showExplanation, wasCorrect }) => {
    const isNum = shortAnswerType(q) === 'number';
    return (
        <div className="space-y-3">
            <input type="text" inputMode={isNum ? 'decimal' : 'text'} disabled={showExplanation} value={value} onChange={e => onChange(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') onSubmit(); }} placeholder={isNum ? 'Nhập đáp án số...' : 'Nhập câu trả lời ngắn...'}
                className={`math-text w-full text-center p-4 text-lg font-black bg-black/60 border outline-none tracking-wide ${showExplanation ? (wasCorrect ? 'border-green-400 text-green-300' : 'border-red-500 text-red-300') : 'border-indigo-500/40 text-indigo-100 focus:border-indigo-300'}`} />
            {!showExplanation && <button onClick={onSubmit} className="w-full bg-yellow-500 text-black py-3 font-black text-[11px] uppercase tracking-widest">Xác Nhận Đáp Án</button>}
            {showExplanation && !wasCorrect && <p className="math-text text-center text-[12px] text-green-400 font-black">Đáp án đúng: {describeShortAnswer(q)}</p>}
        </div>
    );
};

// Câu tự luận: nhập bài làm, nộp, rồi (tuỳ chọn) xin AI gợi ý điểm theo rubric. Điểm AI KHÔNG chính thức.
export const EssayPanel = ({ q, value, onChange, onSubmit, showExplanation, maxScore, feedback, onRequestFeedback }) => {
    const fb = feedback && feedback.data;
    return (
        <div className="space-y-3">
            <textarea disabled={showExplanation} value={value} onChange={e => onChange(e.target.value)} placeholder="Viết bài làm của ngài ở đây..." maxLength={6000}
                className="math-text w-full h-48 p-3 text-[13px] bg-black/60 border border-indigo-500/40 text-indigo-100 outline-none focus:border-indigo-300 custom-scrollbar" />
            <p className="text-[10px] text-zinc-500">Điểm tối đa: {fmt(maxScore)} · {String(value || '').length}/6000 ký tự</p>
            {!showExplanation && <button onClick={onSubmit} className="w-full bg-yellow-500 text-black py-3 font-black text-[11px] uppercase tracking-widest">Nộp Bài</button>}
            {showExplanation && (
                <div className="space-y-2">
                    {!fb && <button onClick={onRequestFeedback} disabled={feedback && feedback.loading} className="w-full bg-purple-900/50 border border-purple-500 text-purple-300 py-2.5 text-[10px] font-black uppercase disabled:opacity-50">{feedback && feedback.loading ? '⏳ AI đang đọc bài...' : '🤖 AI gợi ý điểm theo rubric'}</button>}
                    {feedback && feedback.error && <p className="text-[11px] text-red-400">{feedback.error}</p>}
                    {fb && (
                        <div className="bg-black/70 border border-purple-500/40 p-3 space-y-2 text-left" data-testid="essay-feedback">
                            <p className="text-[11px] font-black text-purple-300 uppercase">Điểm GỢI Ý: {fmt(fb.suggestedScore)} / {fmt(fb.maxScore)}</p>
                            <p className="text-[10px] text-orange-300">Đây chỉ là gợi ý tham khảo của AI, chưa phải điểm chính thức.</p>
                            {fb.criteria.map((c, i) => <p key={i} className="math-text text-[11px] text-zinc-300">{c.met ? '✅' : '⬜'} {c.text} — {fmt(c.awarded)}/{fmt(c.maxPoints)}{c.comment ? ` · ${c.comment}` : ''}</p>)}
                            {fb.feedback && <p className="math-text text-[12px] text-purple-100 whitespace-pre-wrap leading-relaxed">{fb.feedback}</p>}
                        </div>
                    )}
                    {q.sampleAnswer && <details className="bg-black/50 border border-zinc-700 p-2"><summary className="text-[10px] text-zinc-400 font-black uppercase cursor-pointer">Xem bài mẫu</summary><p className="math-text text-[12px] text-zinc-200 whitespace-pre-wrap mt-2">{q.sampleAnswer}</p></details>}
                </div>
            )}
        </div>
    );
};

// Tổng kết theo phần ở màn kết quả (chỉ hiện khi bộ câu có phần/loại V2)
export const SectionSummary = ({ summary }) => {
    if (!summary || !summary.parts.length) return null;
    return (
        <div className="bg-black border border-zinc-800 p-4 mb-6 text-left space-y-2" data-testid="section-summary">
            <p className="text-[10px] text-yellow-500 font-black uppercase tracking-widest text-center mb-1">Điểm theo phần</p>
            {summary.parts.map(p => (
                <div key={p.id} className="flex justify-between gap-2 text-[11px]">
                    <span className="text-zinc-300">{p.shortTitle}{p.official ? '' : ' (AI gợi ý)'}</span>
                    <span className={p.official ? 'text-green-400 font-black' : 'text-purple-300 font-black'}>{p.pendingCount === p.count ? 'chưa chấm' : `${fmt(p.score)}/${fmt(p.max)}`}{p.pendingCount > 0 && p.pendingCount < p.count ? ` (+${p.pendingCount} chưa chấm)` : ''}</span>
                </div>
            ))}
            {summary.parts.some(p => p.official) && <div className="flex justify-between text-[11px] border-t border-zinc-800 pt-2"><span className="text-zinc-400 font-black">Tổng chính thức</span><span className="text-white font-black">{fmt(summary.totalOfficial.score)}/{fmt(summary.totalOfficial.max)}</span></div>}
            {summary.parts.some(p => !p.official) && <p className="text-[9px] text-zinc-500">Phần tự luận do AI gợi ý, không tính vào tổng chính thức.</p>}
        </div>
    );
};
