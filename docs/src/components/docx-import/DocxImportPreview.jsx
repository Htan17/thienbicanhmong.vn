import { assignImage, computeWarnings, finalizeQuestions, imageStatus, removeImage, setPrimary } from '../../docx-import/imageQuestionMatcher.js';
import { checkLimits, compressDataUri } from '../../docx-import/imageCompressor.js';
import { ImageAssignmentModal } from './ImageAssignmentModal.jsx';
import { QuestionImagePreview } from './QuestionImagePreview.jsx';
import { UnresolvedImagesPanel } from './UnresolvedImagesPanel.jsx';

const STATUS = { none: 'Không có ảnh', matched: 'Đã ghép 1 ảnh', multiple: 'Nhiều ảnh' };
const kb = (b) => `${Math.max(1, Math.round(b / 1024))} KB`;

// Màn xem trước nhập DOCX có ảnh. KHÔNG lưu gì cho tới khi bấm "Xác nhận và lưu" (onConfirm do App.jsx xử lý).
export const DocxImportPreview = ({ result, defaultTitle, existingLibraryBytes, onConfirm, onCancel, onZoom, playSfx }) => {
    const { useState, useEffect, useMemo } = React;
    const [st, setSt] = useState(result.state);
    const [title, setTitle] = useState(defaultTitle || '');
    const [comp, setComp] = useState({});      // id -> { dataUri, bytes, compressed } (bản nén; ảnh gốc giữ nguyên trong result.images)
    const [busy, setBusy] = useState(true);
    const [assignFor, setAssignFor] = useState(null); // { id, from }
    const byId = useMemo(() => { const m = {}; result.images.forEach(i => { m[i.id] = i; }); return m; }, [result]);

    // Nén từng ảnh đọc được (ảnh gốc không bị thay đổi). Hiển thị dung lượng sau nén ngay trên bản xem trước.
    useEffect(() => {
        let alive = true;
        (async () => {
            const out = {};
            for (const im of result.images) { if (!im.readable) continue; out[im.id] = await compressDataUri(im.dataUri); if (!alive) return; }
            if (alive) { setComp(out); setBusy(false); }
        })();
        return () => { alive = false; };
    }, [result]);

    const dataOf = (id) => (comp[id] ? comp[id].dataUri : (byId[id] && byId[id].dataUri) || '');
    const sizeOf = (id) => { const im = byId[id]; if (!im) return ''; const c = comp[id]; return c && c.compressed ? `${kb(im.bytes)} → ${kb(c.bytes)}` : kb(c ? c.bytes : im.bytes); };
    const final = useMemo(() => finalizeQuestions(st, dataOf), [st, comp]);
    const limits = useMemo(() => checkLimits(final, existingLibraryBytes || 0), [final, existingLibraryBytes]);
    const warnings = useMemo(() => computeWarnings(st, result.images, result.parsedWarnings || []), [st, result]);
    const canSave = !busy && title.trim() && st.questions.length > 0 && limits.errors.length === 0;
    const click = () => { if (playSfx) playSfx('CLICK'); };
    const doAssign = (qi) => { setSt(s => assignImage(s, assignFor.id, qi)); setAssignFor(null); click(); };

    return (
        <div className="fixed inset-0 z-[9000] bg-black/90 flex items-center justify-center p-2 sm:p-4" data-testid="docx-preview">
            <div className="w-full max-w-3xl max-h-full bg-zinc-950 border border-yellow-500/50 flex flex-col">
                <div className="p-3 border-b border-zinc-800 space-y-2">
                    <p className="text-[12px] font-black text-yellow-400 uppercase tracking-widest">Xem trước nhập DOCX có ảnh</p>
                    <p className="text-[10px] text-zinc-400">{st.questions.length} câu · {limits.imageCount} ảnh đã ghép · {st.unresolved.length} ảnh chưa gắn. Chưa có gì được lưu cho tới khi bạn xác nhận.</p>
                    <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Tên Bí Tịch..." className="w-full bg-black border border-zinc-700 p-2 text-sm text-white outline-none focus:border-yellow-500" />
                </div>
                <div className="p-3 overflow-y-auto custom-scrollbar space-y-3 flex-1">
                    {busy && <p className="text-[11px] text-sky-300">Đang nén ảnh để kiểm tra dung lượng…</p>}
                    {warnings.length > 0 && (
                        <ul className="border border-amber-700/60 bg-amber-950/20 p-2 text-[10px] text-amber-200 space-y-0.5 list-disc pl-5" data-testid="docx-warnings">{warnings.map((w, i) => <li key={i}>{w}</li>)}</ul>
                    )}
                    <UnresolvedImagesPanel items={st.unresolved} dataOf={dataOf} sizeOf={sizeOf} byId={byId} onZoom={onZoom} onAssign={(id) => setAssignFor({ id, from: -1 })} />
                    {st.questions.map((q, qi) => (
                        <div key={q.id} className="border border-zinc-700 bg-zinc-900/60 p-3 space-y-2" data-testid="docx-q">
                            <div className="flex items-start justify-between gap-2">
                                <p className="text-[12px] font-bold text-zinc-100 break-words min-w-0">Câu {qi + 1}: {q.q}</p>
                                <span className={`text-[9px] border px-1.5 py-0.5 whitespace-nowrap ${q.imageIds.length ? 'border-emerald-700 text-emerald-300' : 'border-zinc-700 text-zinc-500'}`}>{STATUS[imageStatus(q)]}{q.imageIds.length ? ` (${q.imageIds.length})` : ''}</span>
                            </div>
                            {q.type !== 'numeric' && (
                                <ul className="text-[11px] space-y-0.5">
                                    {q.o.map((o, oi) => { const right = Array.isArray(q.c) ? q.c.includes(oi) : q.c === oi; return <li key={oi} className={right ? 'text-emerald-300 font-bold' : 'text-zinc-300'}>{String.fromCharCode(65 + oi)}. {o}{right ? ' ✓' : ''}</li>; })}
                                </ul>
                            )}
                            <p className="text-[10px] text-zinc-400">Loại: {q.type === 'multi' ? 'nhiều đáp án' : q.type === 'numeric' ? 'điền số' : '1 đáp án'} · Đáp án đúng: <b className="text-emerald-300">{q.type === 'numeric' ? q.c : Array.isArray(q.c) ? q.c.map(i => String.fromCharCode(65 + i)).join(', ') : String.fromCharCode(65 + q.c)}</b></p>
                            <QuestionImagePreview imageIds={q.imageIds} dataOf={dataOf} sizeOf={sizeOf} onZoom={onZoom}
                                onMove={(id) => setAssignFor({ id, from: qi })} onRemove={(id) => { setSt(s => removeImage(s, id)); click(); }} onPrimary={(id) => { setSt(s => setPrimary(s, qi, id)); click(); }} />
                        </div>
                    ))}
                </div>
                <div className="p-3 border-t border-zinc-800 space-y-2">
                    {limits.errors.map((e, i) => <p key={i} className="text-[10px] text-red-300 font-bold" data-testid="docx-error">⛔ {e}</p>)}
                    {limits.warnings.map((e, i) => <p key={i} className="text-[10px] text-amber-300">⚠️ {e}</p>)}
                    {st.unresolved.length > 0 && <p className="text-[10px] text-orange-300">Còn {st.unresolved.length} ảnh chưa gắn: sẽ không được lưu.</p>}
                    <div className="flex gap-2">
                        <button type="button" onClick={() => { click(); onCancel(); }} className="flex-1 border border-zinc-600 text-zinc-300 py-2.5 text-[11px] font-black uppercase">Hủy, không lưu</button>
                        <button type="button" disabled={!canSave} onClick={() => { click(); onConfirm(title.trim(), final); }} className={`flex-1 py-2.5 text-[11px] font-black uppercase border ${canSave ? 'bg-yellow-600 border-yellow-300 text-black' : 'bg-zinc-900 border-zinc-700 text-zinc-600 cursor-not-allowed'}`} data-testid="docx-confirm">Xác nhận và lưu</button>
                    </div>
                </div>
            </div>
            {assignFor && <ImageAssignmentModal src={dataOf(assignFor.id)} questions={st.questions} currentIndex={assignFor.from} onPick={doAssign} onClose={() => setAssignFor(null)} />}
        </div>
    );
};
