import { REASON_LABEL, TARGET_TYPES, dismissReports, fetchOpenReports, groupReports, hideTarget, subscribeHidden, unhideTarget } from '../lib/moderation.js';

/** Bảng quản trị: duyệt báo cáo, ẩn / khôi phục nội dung. Chỉ hiện với tài khoản có admins/{uid}. */
export const ModerationPanel = ({ adminUid, onBack, playSfx }) => {
    const { useState, useEffect, useCallback } = React;
    const [tab, setTab] = useState('OPEN');
    const [groups, setGroups] = useState([]);
    const [hiddenDocs, setHiddenDocs] = useState({});
    const [loading, setLoading] = useState(true);
    const [busyKey, setBusyKey] = useState('');
    const [err, setErr] = useState('');

    const load = useCallback(async () => {
        setLoading(true); setErr('');
        try { setGroups(groupReports(await fetchOpenReports())); }
        catch (e) { setErr('Không tải được báo cáo: ' + ((e && e.message) || 'lỗi không rõ') + ' (kiểm tra Firestore Rules và quyền admins/{uid}).'); }
        setLoading(false);
    }, []);
    useEffect(() => { load(); }, [load]);
    useEffect(() => subscribeHidden((_, docs) => setHiddenDocs(docs)), []);

    const run = async (key, fn, okMsg) => {
        if (busyKey) return;
        setBusyKey(key);
        try { await fn(); if (playSfx) playSfx('SUCCESS'); if (okMsg) alert(okMsg); await load(); }
        catch (e) { if (playSfx) playSfx('WRONG'); alert('Thao tác thất bại: ' + ((e && e.message) || 'lỗi không rõ')); }
        setBusyKey('');
    };
    const onHide = async (g) => { if (await askConfirm(`ẨN ${TARGET_TYPES[g.type]} "${g.label || g.id}"?\nNội dung sẽ bị che với mọi người dùng.`)) run(g.key, () => hideTarget(adminUid, g, Object.keys(g.reasons).sort((a, b) => g.reasons[b] - g.reasons[a])[0]), 'Đã ẩn nội dung.'); };
    const onDismiss = async (g) => { if (await askConfirm(`Bỏ qua ${g.count} báo cáo về "${g.label || g.id}"?`)) run(g.key, () => dismissReports(adminUid, g)); };
    const onUnhide = async (key) => { if (await askConfirm('Khôi phục hiển thị nội dung này?')) run(key, () => unhideTarget(key), 'Đã khôi phục.'); };

    const hiddenList = Object.entries(hiddenDocs);
    return (
        <div className="w-full max-w-md bg-zinc-900 border border-red-900/60 p-4 text-left animate-fadeIn">
            <h2 className="text-base font-black text-red-400 uppercase tracking-widest text-center mb-3">🛡️ Bảng Quản Trị</h2>
            <div className="grid grid-cols-2 gap-2 mb-3">
                <button onClick={() => setTab('OPEN')} className={`py-2 text-[10px] font-black uppercase border ${tab === 'OPEN' ? 'bg-red-800 text-white border-red-500' : 'bg-black text-zinc-400 border-zinc-700'}`}>Báo cáo chờ ({groups.length})</button>
                <button onClick={() => setTab('HIDDEN')} className={`py-2 text-[10px] font-black uppercase border ${tab === 'HIDDEN' ? 'bg-red-800 text-white border-red-500' : 'bg-black text-zinc-400 border-zinc-700'}`}>Đã ẩn ({hiddenList.length})</button>
            </div>
            {err && <p className="text-[11px] text-red-400 mb-2">{err}</p>}
            {tab === 'OPEN' && (loading ? <p className="text-center text-zinc-500 text-[11px] py-6">Đang tải...</p> : groups.length === 0 ? <p className="text-center text-zinc-500 text-[11px] py-6">Không có báo cáo nào đang chờ. 🎉</p> : (
                <div className="space-y-3 max-h-[60vh] overflow-y-auto custom-scrollbar">
                    {groups.map(g => (
                        <div key={g.key} className="bg-black border border-zinc-700 p-3">
                            <div className="flex justify-between items-start gap-2">
                                <div className="min-w-0"><p className="text-[9px] text-zinc-500 uppercase font-black">{TARGET_TYPES[g.type] || g.type}</p><p className="text-[12px] text-white font-bold break-all">{g.label || g.id}</p><p className="text-[9px] text-zinc-500 break-all">ID: {g.id}</p></div>
                                <span className="bg-red-900/60 text-red-200 text-[10px] font-black px-2 py-1 shrink-0">{g.count} báo cáo</span>
                            </div>
                            <p className="text-[10px] text-yellow-500 mt-2">{Object.entries(g.reasons).map(([k, n]) => `${REASON_LABEL[k] || k} ×${n}`).join(' · ')}</p>
                            {g.notes.map((n, i) => <p key={i} className="text-[10px] text-zinc-400 italic mt-1 break-words">“{n}”</p>)}
                            <div className="grid grid-cols-2 gap-2 mt-3">
                                <button disabled={!!busyKey} onClick={() => onDismiss(g)} className="bg-zinc-800 text-zinc-300 py-2 text-[10px] font-black uppercase border border-zinc-700 disabled:opacity-50">Bỏ qua</button>
                                <button disabled={!!busyKey} onClick={() => onHide(g)} className="bg-red-700 text-white py-2 text-[10px] font-black uppercase disabled:opacity-50">Ẩn nội dung</button>
                            </div>
                        </div>
                    ))}
                </div>
            ))}
            {tab === 'HIDDEN' && (hiddenList.length === 0 ? <p className="text-center text-zinc-500 text-[11px] py-6">Chưa có nội dung nào bị ẩn.</p> : (
                <div className="space-y-2 max-h-[60vh] overflow-y-auto custom-scrollbar">
                    {hiddenList.map(([key, d]) => (
                        <div key={key} className="bg-black border border-zinc-700 p-3 flex justify-between items-center gap-2">
                            <div className="min-w-0"><p className="text-[9px] text-zinc-500 uppercase font-black">{TARGET_TYPES[d.targetType] || d.targetType}</p><p className="text-[12px] text-white font-bold break-all">{d.targetId}</p><p className="text-[9px] text-zinc-500">{REASON_LABEL[d.reason] || d.reason || ''}</p></div>
                            <button disabled={!!busyKey} onClick={() => onUnhide(key)} className="bg-green-800 text-white px-3 py-2 text-[10px] font-black uppercase shrink-0 disabled:opacity-50">Khôi phục</button>
                        </div>
                    ))}
                </div>
            ))}
            <div className="grid grid-cols-2 gap-2 mt-4">
                <button onClick={load} className="bg-zinc-800 text-zinc-300 py-2 text-[10px] font-black uppercase border border-zinc-700">Tải lại</button>
                <button onClick={onBack} className="bg-zinc-800 text-white py-2 text-[10px] font-black uppercase border border-zinc-700">Đóng</button>
            </div>
        </div>
    );
};
