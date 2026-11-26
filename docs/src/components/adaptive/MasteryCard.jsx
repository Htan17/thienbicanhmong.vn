import { explainProfile } from '../../adaptive/adaptiveExplain.js';

// Thẻ "Mức nắm vững" (ALEP 0.1) - CHỈ HIỂN THỊ, không thay đổi lộ trình / thưởng.
// uiMode: 'study' = từ ngữ học đường; 'thienkieu' = từ ngữ tu tiên. Cùng một dữ liệu, chỉ khác nhãn.
const TERMS = {
    study: {
        title: 'Mức nắm vững theo chủ đề', mastery: 'Mức nắm vững', effective: 'Mức hiện tại (có tính quên)', confidence: 'Độ tin cậy', attempts: 'Số lượt làm',
        last: 'Luyện lần cuối', review: 'Nên ôn lại từ', why: 'Vì sao hệ thống đánh giá như vậy?', empty: 'Chưa có dữ liệu làm bài. Hoàn thành một bài quiz hoặc một Ải để bắt đầu.',
        status: { unassessed: 'Chưa đủ dữ liệu', foundation: 'Cần củng cố nền tảng', developing: 'Đang tiến bộ', near_mastery: 'Gần nắm vững', temporarily_mastered: 'Đã nắm (tạm thời)', review_due: 'Đến lúc ôn lại' }
    },
    thienkieu: {
        title: 'Cảnh giới theo chủ đề', mastery: 'Công lực', effective: 'Công lực hiện tại (có hao tổn)', confidence: 'Độ vững chắc', attempts: 'Số lần luyện',
        last: 'Lần luyện cuối', review: 'Nên ôn lại từ', why: 'Vì sao hệ thống đánh giá như vậy?', empty: 'Chưa có dữ liệu tu luyện. Hãy vượt một Ải hoặc làm một bài quiz.',
        status: { unassessed: 'Chưa đủ dữ liệu', foundation: 'Cần củng cố căn cơ', developing: 'Đang tiến bộ', near_mastery: 'Sắp đại thành', temporarily_mastered: 'Đại thành (tạm thời)', review_due: 'Đến lúc ôn luyện' }
    }
};
const STATUS_COLOR = { unassessed: 'text-zinc-400 border-zinc-600', foundation: 'text-red-300 border-red-700', developing: 'text-amber-300 border-amber-700', near_mastery: 'text-sky-300 border-sky-700', temporarily_mastered: 'text-emerald-300 border-emerald-700', review_due: 'text-orange-300 border-orange-600' };
const fmtDate = (ms) => (ms ? new Date(ms).toLocaleDateString('vi-VN') : '—');

const TopicRow = ({ p, t, now }) => {
    const { useState } = React;
    const [open, setOpen] = useState(false);
    const ex = open ? explainProfile(p, now) : null;
    const unassessed = p.status === 'unassessed';
    return (
        <div className="border border-zinc-700/60 bg-black/30 p-3 space-y-2" data-testid="alep-topic">
            <div className="flex items-start justify-between gap-2">
                <p className="text-[12px] font-bold text-zinc-100 break-words min-w-0">{p.topicLabel}</p>
                <span className={`text-[10px] border px-2 py-0.5 whitespace-nowrap ${STATUS_COLOR[p.status] || ''}`}>{t.status[p.status]}</span>
            </div>
            {unassessed ? (
                <p className="text-[11px] text-zinc-400 italic">Chưa đủ dữ liệu để thống kê ({p.attempts} lượt, độ tin cậy {Math.round(p.confidence * 100)}%).</p>
            ) : (
                <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[11px] text-zinc-300">
                    <span>{t.mastery}: <b className="text-zinc-100">{Math.round(p.mastery)}%</b></span>
                    <span>{t.effective}: <b className="text-zinc-100">{Math.round(p.effectiveMastery)}%</b></span>
                    <span>{t.confidence}: <b className="text-zinc-100">{Math.round(p.confidence * 100)}%</b></span>
                    <span>{t.attempts}: <b className="text-zinc-100">{p.attempts}</b></span>
                    <span>{t.last}: <b className="text-zinc-100">{fmtDate(p.lastPracticedAt)}</b></span>
                    <span>{t.review}: <b className="text-zinc-100">{fmtDate(p.nextReviewAt)}</b></span>
                </div>
            )}
            <button type="button" onClick={() => setOpen(o => !o)} aria-expanded={open} className="text-[11px] text-indigo-300 underline underline-offset-2">{open ? '▾' : '▸'} {t.why}</button>
            {open && ex && (
                <ul className="text-[11px] text-zinc-300 leading-relaxed space-y-1 list-disc pl-4" data-testid="alep-explain">
                    {ex.lines.map((l, i) => <li key={i}>{l}</li>)}
                </ul>
            )}
        </div>
    );
};

export const MasteryCard = ({ profiles, uiMode, now }) => {
    const t = TERMS[uiMode === 'study' ? 'study' : 'thienkieu'];
    const n = now || Date.now();
    const list = Object.values(profiles || {}).sort((a, b) => (b.lastPracticedAt || 0) - (a.lastPracticedAt || 0));
    return (
        <div className="border border-indigo-500/30 bg-indigo-950/20 p-3 space-y-3" data-testid="alep-card">
            <p className="text-[12px] font-bold text-indigo-200">{t.title}</p>
            <p className="text-[10px] text-amber-300/80 leading-snug">Bản thử nghiệm ALEP 0.1 — dữ liệu lưu trên thiết bị này, chưa phải dữ liệu nghiên cứu chính thức.</p>
            {list.length === 0
                ? <p className="text-[11px] text-zinc-500 italic text-center py-3">{t.empty}</p>
                : list.map(p => <TopicRow key={p.topicId} p={p} t={t} now={n} />)}
        </div>
    );
};
