import { addQuestion, assignImage, computeWarnings, deleteQuestion, finalizeQuestions, groupBySection, imageStatus, moveQuestionToSection, removeImage, setPrimary, updateQuestion } from '../../docx-import/imageQuestionMatcher.js';
import { SECTION_DEFS } from '../../quiz-v2/questionTypes.js';
import { describeShortAnswer } from '../../quiz-v2/shortAnswer.js';
import { validatePreview } from '../../docx-import/previewValidation.js';
import { TYPE_LABEL } from '../../docx-import/questionEditLogic.js';
import { QuestionEditModal } from './QuestionEditModal.jsx';
import { DeleteQuestionModal } from './DeleteQuestionModal.jsx';
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
    const [editFor, setEditFor] = useState(null);     // GĐ1: chỉ số câu đang sửa (chỉ trong preview)
    const [deleteFor, setDeleteFor] = useState(null); // GĐ1: chỉ số câu đang xác nhận xóa
    const [ackUnresolved, setAckUnresolved] = useState(false); // GĐ1: xác nhận bỏ qua ảnh chưa gắn
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
    const blockers = useMemo(() => validatePreview(st, { ackUnresolved }), [st, ackUnresolved]);
    const canSave = !busy && title.trim() && st.questions.length > 0 && limits.errors.length === 0 && blockers.length === 0;
    const click = () => { if (playSfx) playSfx('CLICK'); };
    const groups = useMemo(() => groupBySection(st.questions), [st]);
    const doAdd = (sectionId) => { const r = addQuestion(st, sectionId); if (r.index >= 0) { setSt(r.state); setEditFor(r.index); click(); } }; // GĐ2: thêm câu vào phần, mở form sửa ngay
    const doAssign = (qi) => { setSt(s => assignImage(s, assignFor.id, qi)); setAssignFor(null); click(); };

    return (
        <div className="fixed inset-0 z-[9000] bg-black/90 flex items-center justify-center p-2 sm:p-4" data-testid="docx-preview">
            <div className="w-full max-w-3xl max-h-full bg-zinc-950 border border-yellow-500/50 flex flex-col">
                <div className="p-3 border-b border-zinc-800 space-y-2">
                    <p className="text-[12px] font-black text-yellow-400 uppercase tracking-widest">Xem trước nhập DOCX</p>
                    <p className="text-[10px] text-zinc-400">{st.questions.length} câu · {limits.imageCount} ảnh đã ghép · {st.unresolved.length} ảnh chưa gắn. Chưa có gì được lưu cho tới khi bạn xác nhận.</p>
                    <p className="text-[10px] text-zinc-500">Câu được nhóm theo PHẦN I (trắc nghiệm) · II (Đúng/Sai) · III (trả lời ngắn) · IV (tự luận). Đổi loại hoặc chuyển phần thì câu tự chuyển nhóm và số thứ tự được đánh lại.</p>
                    <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Tên Bí Tịch..." className="w-full bg-black border border-zinc-700 p-2 text-sm text-white outline-none focus:border-yellow-500" />
                </div>
                <div className="p-3 overflow-y-auto custom-scrollbar space-y-3 flex-1">
                    {busy && <p className="text-[11px] text-sky-300">Đang nén ảnh để kiểm tra dung lượng…</p>}
                    {warnings.length > 0 && (
                        <ul className="border border-amber-700/60 bg-amber-950/20 p-2 text-[10px] text-amber-200 space-y-0.5 list-disc pl-5" data-testid="docx-warnings">{warnings.map((w, i) => <li key={i}>{w}</li>)}</ul>
                    )}
                    <UnresolvedImagesPanel items={st.unresolved} dataOf={dataOf} sizeOf={sizeOf} byId={byId} onZoom={onZoom} onAssign={(id) => setAssignFor({ id, from: -1 })} />
                    {groups.map(g => (
                        <div key={g.id} className="space-y-3" data-testid={`docx-sec-${g.id}`}>
                            <div className="flex items-center justify-between gap-2 border-b border-yellow-700/50 pb-1">
                                <p className="text-[11px] font-black text-yellow-300 uppercase tracking-widest">{g.title} <span className="text-zinc-500 font-bold normal-case">({g.items.length} câu)</span></p>
                                {g.id !== 'unknown' && <button type="button" onClick={() => doAdd(g.id)} className="text-[9px] border border-emerald-700 text-emerald-300 px-2 py-1 font-black uppercase" data-testid={`docx-add-${g.id}`}>+ Thêm câu</button>}
                            </div>
                    {g.items.map((qi) => { const q = st.questions[qi]; return (
                        <div key={q.id} className="border border-zinc-700 bg-zinc-900/60 p-3 space-y-2" data-testid="docx-q">
                            <div className="flex items-start justify-between gap-2">
                                <p className="text-[12px] font-bold text-zinc-100 break-words min-w-0">Câu {qi + 1}: {q.q}</p>
                                <span className={`text-[9px] border px-1.5 py-0.5 whitespace-nowrap ${q.imageIds.length ? 'border-emerald-700 text-emerald-300' : 'border-zinc-700 text-zinc-500'}`}>{STATUS[imageStatus(q)]}{q.imageIds.length ? ` (${q.imageIds.length})` : ''}</span>
                            </div>
                            {q.type === 'unknown' && <p className="text-[11px] font-black text-orange-300 border border-orange-700 bg-orange-950/30 p-1.5" data-testid="docx-unknown">⚠️ Loại câu chưa xác định — CẦN KIỂM TRA TRƯỚC KHI LƯU</p>}
                            {(q.requiresReview || (typeof q.parseConfidence === 'number' && q.parseConfidence < 0.9)) && q.type !== 'unknown' && q.parseReason && <p className="text-[10px] text-amber-300" data-testid="docx-review">⚠️ {q.parseReason} (độ tin cậy {Math.round((q.parseConfidence || 0) * 100)}%)</p>}
                            {q.type === 'unknown' && q.parseReason && <p className="text-[10px] text-orange-200">{q.parseReason}</p>}
                            {q.type === 'truefalse' || q.type === 'multi' ? (
                                <ul className="text-[11px] space-y-0.5">
                                    {q.o.map((o, oi) => { const right = Array.isArray(q.c) && q.c.includes(oi); return <li key={oi} className={right ? 'text-emerald-300 font-bold' : 'text-zinc-300'}>{String.fromCharCode(65 + oi)}. {o} → {right ? 'Đúng' : 'Sai'}</li>; })}
                                </ul>
                            ) : q.type === 'essay' ? (
                                <div className="text-[11px] space-y-0.5 text-zinc-300">
                                    <p>Điểm tối đa: <b className="text-emerald-300">{typeof q.maxScore === 'number' ? q.maxScore : 'mặc định theo cấu hình'}</b></p>
                                    <p>Rubric: {Array.isArray(q.rubric) && q.rubric.length ? `${q.rubric.length} tiêu chí` : 'chưa có (AI tự đề xuất tiêu chí)'}{q.sampleAnswer ? ' · có bài mẫu' : ''}</p>
                                </div>
                            ) : (q.o || []).length > 0 && (
                                <ul className="text-[11px] space-y-0.5">
                                    {q.o.map((o, oi) => { const right = q.type === 'single' && q.c === oi; return <li key={oi} className={right ? 'text-emerald-300 font-bold' : 'text-zinc-300'}>{String.fromCharCode(65 + oi)}. {o}{right ? ' ✓' : ''}</li>; })}
                                </ul>
                            )}
                            <p className="text-[10px] text-zinc-400">Loại: {TYPE_LABEL[q.type] || q.type}{q.type === 'single' && Number.isInteger(q.c) ? <> · Đáp án đúng: <b className="text-emerald-300">{String.fromCharCode(65 + q.c)}</b></> : null}{(q.type === 'short' || q.type === 'numeric') && q.c != null && q.c !== '' ? <> · {q.answerType === 'text' ? 'Đáp án (chữ)' : 'Đáp án (số)'}: <b className="text-emerald-300">{describeShortAnswer(q)}</b></> : null}</p>
                            <QuestionImagePreview imageIds={q.imageIds} dataOf={dataOf} sizeOf={sizeOf} onZoom={onZoom}
                                onMove={(id) => setAssignFor({ id, from: qi })} onRemove={(id) => { setSt(s => removeImage(s, id)); click(); }} onPrimary={(id) => { setSt(s => setPrimary(s, qi, id)); click(); }} />
                            <div className="flex gap-2 pt-1">
                                <button type="button" onClick={() => { click(); setEditFor(qi); }} className="flex-1 border border-cyan-600 text-cyan-300 py-1.5 text-[10px] font-black uppercase" data-testid="docx-edit-btn">✏️ Sửa câu</button>
                                <button type="button" onClick={() => { click(); setDeleteFor(qi); }} className="flex-1 border border-red-700 text-red-300 py-1.5 text-[10px] font-black uppercase" data-testid="docx-delete-btn">🗑️ Xóa câu</button>
                            </div>
                            <select value="" onChange={e => { if (e.target.value) { setSt(s0 => moveQuestionToSection(s0, qi, e.target.value)); click(); } }} className="w-full bg-black border border-zinc-700 text-zinc-400 text-[10px] p-1.5" data-testid="docx-move-sec">
                                <option value="">↪ Chuyển câu sang phần khác…</option>
                                {SECTION_DEFS.map(sd => <option key={sd.id} value={sd.id}>{sd.title}</option>)}
                            </select>
                        </div>
                    ); })}
                        </div>
                    ))}
                </div>
                <div className="p-3 border-t border-zinc-800 space-y-2">
                    {limits.errors.map((e, i) => <p key={i} className="text-[10px] text-red-300 font-bold" data-testid="docx-error">⛔ {e}</p>)}
                    {limits.warnings.map((e, i) => <p key={i} className="text-[10px] text-amber-300">⚠️ {e}</p>)}
                    {st.unresolved.length > 0 && (
                        <label className="flex items-start gap-2 text-[10px] text-orange-300"><input type="checkbox" checked={ackUnresolved} onChange={e => setAckUnresolved(e.target.checked)} className="mt-0.5" data-testid="docx-ack" />Còn {st.unresolved.length} ảnh chưa gắn: tôi xác nhận bỏ qua, các ảnh này sẽ không được lưu.</label>
                    )}
                    {blockers.length > 0 && (
                        <ul className="border border-red-800 bg-red-950/30 p-2 text-[10px] text-red-300 list-disc pl-5 max-h-28 overflow-y-auto" data-testid="docx-blockers"><li className="list-none -ml-5 font-black">Chưa thể lưu:</li>{blockers.map((b, i) => <li key={i}>{b}</li>)}</ul>
                    )}
                    <div className="flex gap-2">
                        <button type="button" onClick={() => { click(); onCancel(); }} className="flex-1 border border-zinc-600 text-zinc-300 py-2.5 text-[11px] font-black uppercase">Hủy, không lưu</button>
                        <button type="button" disabled={!canSave} onClick={() => { click(); onConfirm(title.trim(), final); }} className={`flex-1 py-2.5 text-[11px] font-black uppercase border ${canSave ? 'bg-yellow-600 border-yellow-300 text-black' : 'bg-zinc-900 border-zinc-700 text-zinc-600 cursor-not-allowed'}`} data-testid="docx-confirm">Xác nhận và lưu</button>
                    </div>
                </div>
            </div>
            {editFor !== null && st.questions[editFor] && <QuestionEditModal question={st.questions[editFor]} index={editFor} onCancel={() => setEditFor(null)} onSave={(f) => { setSt(s0 => updateQuestion(s0, editFor, f)); setEditFor(null); click(); }} />}
            {deleteFor !== null && st.questions[deleteFor] && <DeleteQuestionModal question={st.questions[deleteFor]} index={deleteFor} onCancel={() => setDeleteFor(null)} onDelete={(action) => { setSt(s0 => deleteQuestion(s0, deleteFor, action)); setDeleteFor(null); setEditFor(null); setAssignFor(null); click(); }} />}
            {assignFor && <ImageAssignmentModal src={dataOf(assignFor.id)} questions={st.questions} currentIndex={assignFor.from} onPick={doAssign} onClose={() => setAssignFor(null)} />}
        </div>
    );
};
