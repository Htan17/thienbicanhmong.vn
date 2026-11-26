import { REPORT_REASONS, TARGET_TYPES, submitReport } from '../lib/moderation.js';

/** Hộp thoại báo cáo nội dung vi phạm. target = { type, id, label } */
export const ReportModal = ({ target, reporterUid, onClose, playSfx }) => {
    const { useState } = React;
    const [reason, setReason] = useState('');
    const [note, setNote] = useState('');
    const [busy, setBusy] = useState(false);
    const send = async () => {
        if (busy) return;
        if (!reason) return alert('Hãy chọn lý do báo cáo.');
        setBusy(true);
        const res = await submitReport({ reporterUid, type: target.type, id: target.id, label: target.label, reason, note });
        setBusy(false);
        if (res.ok) { if (playSfx) playSfx('SUCCESS'); alert('Đã gửi báo cáo. Cảm ơn Ngài đã giữ gìn Bí Cảnh trong sạch!'); onClose(); }
        else { if (playSfx) playSfx('WRONG'); alert(res.message); if (res.code === 'already' || res.code === 'rate') onClose(); }
    };
    return (
        <div className="fixed inset-0 bg-black/90 z-[300] flex items-center justify-center p-4 animate-fadeIn" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
            <div className="bg-zinc-900 border border-red-800 p-5 w-full max-w-sm shadow-2xl">
                <h3 className="text-sm font-black text-red-400 uppercase tracking-widest mb-1">🚩 Báo cáo vi phạm</h3>
                <p className="text-[10px] text-zinc-400 mb-3">{TARGET_TYPES[target.type]}: <span className="text-white font-bold break-all">{target.label || target.id}</span></p>
                <div className="space-y-1 mb-3">
                    {REPORT_REASONS.map(r => (
                        <label key={r.id} className={`flex items-center gap-2 p-2 border text-[11px] cursor-pointer ${reason === r.id ? 'border-red-500 bg-red-950/40 text-white' : 'border-zinc-700 text-zinc-300'}`}>
                            <input type="radio" name="report-reason" checked={reason === r.id} onChange={() => setReason(r.id)} /> {r.label}
                        </label>
                    ))}
                </div>
                <textarea value={note} onChange={e => setNote(e.target.value)} maxLength={200} rows={2} placeholder="Ghi chú thêm cho quản trị viên (không bắt buộc)" className="w-full bg-black border border-zinc-700 p-2 text-[11px] text-white outline-none mb-3" />
                <div className="grid grid-cols-2 gap-2">
                    <button onClick={onClose} className="bg-zinc-800 text-zinc-300 py-2 text-[10px] font-black uppercase border border-zinc-700">Huỷ</button>
                    <button onClick={send} disabled={busy} className="bg-red-700 text-white py-2 text-[10px] font-black uppercase disabled:opacity-50">{busy ? 'Đang gửi...' : 'Gửi báo cáo'}</button>
                </div>
            </div>
        </div>
    );
};
