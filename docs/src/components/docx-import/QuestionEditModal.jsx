import { TYPE_LABEL, initDraft, switchDraftType, validateDraft, draftToFields, removeDraftOption, addDraftOption, MAX_OPTS } from '../../docx-import/questionEditLogic.js';

// GIAI ĐOẠN 1+2 – Form sửa 1 câu trong DOCX Preview (4 loại V2: 1 đáp án | Đúng/Sai nhiều ý | Trả lời ngắn | Tự luận). Chỉ sửa bản nháp trong bộ nhớ; "Lưu" -> onSave(fields) (q/o/c/type), KHÔNG ghi Firestore.
// Ảnh không nằm trong form này: vẫn dùng các nút Chuyển câu / Gỡ / Đặt chính trên thẻ câu, nên sửa nội dung/loại câu không làm mất ảnh.
export const QuestionEditModal = ({ question, index, onSave, onCancel }) => {
    const { useState } = React;
    const [d, setD] = useState(() => initDraft(question));
    const [showErr, setShowErr] = useState(false);
    const errs = validateDraft(d);
    const L = (i) => String.fromCharCode(65 + i);
    const inp = 'w-full bg-black border border-zinc-700 p-2 text-xs text-white outline-none focus:border-cyan-500';
    const setOpt = (i, v) => setD(p => { const o = [...p.o]; o[i] = v; return { ...p, o }; });
    return (
        <div className="fixed inset-0 z-[9100] bg-black/90 flex items-center justify-center p-2" data-testid="docx-edit-modal">
            <div className="w-full max-w-xl max-h-full bg-zinc-950 border border-cyan-500/60 flex flex-col">
                <div className="p-3 border-b border-zinc-800"><p className="text-[12px] font-black text-cyan-400 uppercase tracking-widest">Sửa câu {index + 1}</p>
                    <p className="text-[10px] text-zinc-500">Chỉ sửa trong bản xem trước; chưa lưu gì lên hệ thống. Ảnh giữ nguyên.</p></div>
                <div className="p-3 overflow-y-auto custom-scrollbar space-y-3 flex-1">
                    <textarea className={`${inp} h-24 text-sm`} placeholder="Nội dung câu hỏi..." value={d.q} onChange={e => setD(p => ({ ...p, q: e.target.value }))} />
                    <div className="flex gap-1">
                        {[['single', 'I. 1 đáp án'], ['truefalse', 'II. Đúng/Sai'], ['short', 'III. Trả lời ngắn'], ['essay', 'IV. Tự luận']].map(([tv, tl]) => (
                            <button key={tv} type="button" onClick={() => setD(p => switchDraftType(p, tv))} className={`flex-1 py-2 text-[9px] font-black uppercase border ${d.type === tv ? 'bg-cyan-600 border-cyan-400 text-black' : (d.hint === tv && d.type === 'unknown' ? 'border-orange-500 text-orange-300' : 'border-zinc-700 text-zinc-400')}`}>{tl}</button>
                        ))}
                    </div>
                    {d.type === 'unknown' && <p className="text-[10px] text-orange-300 font-bold">⚠️ Loại câu chưa xác định: hãy chọn một loại ở trên.{d.hint ? ` Theo tiêu đề phần, câu này có thể là: ${TYPE_LABEL[d.hint] || d.hint}.` : ''}</p>}
                    {d.type === 'single' && d.o.map((t, i) => (
                        <div key={i} className="flex items-center gap-2">
                            <button type="button" onClick={() => setD(p => ({ ...p, c: i }))} className={`w-8 h-8 flex-shrink-0 border text-[10px] font-black ${d.c === i ? 'bg-green-600 border-green-400 text-black' : 'border-zinc-700 text-zinc-500'}`}>{L(i)}</button>
                            <input className={inp} placeholder={`Lựa chọn ${L(i)}...`} value={t} onChange={e => setOpt(i, e.target.value)} />
                            {d.o.length > 2 && <button type="button" onClick={() => setD(p => removeDraftOption(p, i))} className="text-red-700 text-lg px-1">✕</button>}
                        </div>
                    ))}
                    {d.type === 'truefalse' && d.o.map((t, i) => (
                        <div key={i} className="flex items-center gap-1">
                            <span className="w-6 text-center text-[10px] font-black text-zinc-400">{L(i)}</span>
                            <input className={inp} placeholder={`Ý ${L(i)}...`} value={t} onChange={e => setOpt(i, e.target.value)} />
                            <button type="button" onClick={() => setD(p => { const tf = [...p.tf]; tf[i] = true; return { ...p, tf }; })} className={`px-2 py-2 text-[10px] font-black border ${d.tf[i] === true ? 'bg-green-600 border-green-400 text-black' : 'border-zinc-700 text-zinc-500'}`}>Đúng</button>
                            <button type="button" onClick={() => setD(p => { const tf = [...p.tf]; tf[i] = false; return { ...p, tf }; })} className={`px-2 py-2 text-[10px] font-black border ${d.tf[i] === false ? 'bg-red-600 border-red-400 text-white' : 'border-zinc-700 text-zinc-500'}`}>Sai</button>
                            {d.o.length > 2 && <button type="button" onClick={() => setD(p => removeDraftOption(p, i))} className="text-red-700 text-lg px-1">✕</button>}
                        </div>
                    ))}
                    {(d.type === 'single' || d.type === 'truefalse') && d.o.length < MAX_OPTS && <button type="button" onClick={() => setD(p => addDraftOption(p))} className="text-[9px] text-cyan-500 font-black uppercase">+ Thêm {d.type === 'truefalse' ? 'ý' : 'lựa chọn'}</button>}
                    {d.type === 'short' && (<>
                        <div className="flex gap-1">
                            {[['number', 'Đáp án là SỐ'], ['text', 'Đáp án là CHỮ']].map(([av, al]) => (
                                <button key={av} type="button" onClick={() => setD(p => ({ ...p, answerType: av }))} className={`flex-1 py-1.5 text-[9px] font-black uppercase border ${d.answerType === av ? 'bg-sky-600 border-sky-400 text-black' : 'border-zinc-700 text-zinc-400'}`}>{al}</button>
                            ))}
                        </div>
                        {d.answerType === 'number' ? (<>
                            <input className={`${inp} text-center text-sm`} placeholder="Đáp án số (VD: 3, 12.5, -2.75)..." value={d.c == null ? '' : d.c} onChange={e => setD(p => ({ ...p, c: e.target.value }))} />
                            <input className={`${inp} text-center`} placeholder="Sai số cho phép (tùy chọn, mặc định 0.01)" value={d.tolerance} onChange={e => setD(p => ({ ...p, tolerance: e.target.value }))} />
                        </>) : (<>
                            <textarea className={`${inp} h-20`} placeholder={'Các đáp án được chấp nhận (mỗi dòng một đáp án).\nDòng đầu là đáp án chính.'} value={d.accepted} onChange={e => setD(p => ({ ...p, accepted: e.target.value }))} />
                            <label className="flex items-center gap-2 text-[10px] text-zinc-400"><input type="checkbox" checked={d.caseSensitive} onChange={e => setD(p => ({ ...p, caseSensitive: e.target.checked }))} />Phân biệt chữ hoa/thường</label>
                            <p className="text-[10px] text-zinc-500">So khớp chính xác (chuẩn hóa khoảng trắng + Unicode), KHÔNG bỏ dấu tiếng Việt. Muốn chấp nhận "Ha Noi" hãy thêm riêng một dòng.</p>
                        </>)}
                        {d.o.some(x => String(x || '').trim()) && <p className="text-[10px] text-zinc-500">Các lựa chọn/ý hiện có được giữ lại làm nội dung kèm theo câu trả lời ngắn.</p>}
                    </>)}
                    {d.type === 'essay' && (<>
                        <textarea className={`${inp} h-24`} placeholder={'Rubric (tùy chọn): mỗi dòng một tiêu chí, có thể ghi điểm, VD:\nNêu đúng khái niệm (2 điểm)\nCó ví dụ minh họa (1 điểm)'} value={d.rubricText} onChange={e => setD(p => ({ ...p, rubricText: e.target.value }))} />
                        <input className={`${inp} text-center`} placeholder="Điểm tối đa (để trống = mặc định theo cấu hình chấm điểm)" value={d.maxScore} onChange={e => setD(p => ({ ...p, maxScore: e.target.value }))} />
                        <textarea className={`${inp} h-20`} placeholder="Đáp án / bài mẫu (tùy chọn)" value={d.sampleAnswer} onChange={e => setD(p => ({ ...p, sampleAnswer: e.target.value }))} />
                        <p className="text-[10px] text-zinc-500">AI chỉ đưa điểm GỢI Ý theo rubric; điểm này không phải điểm chính thức.</p>
                    </>)}
                    {showErr && errs.length > 0 && <ul className="border border-red-800 bg-red-950/30 p-2 text-[10px] text-red-300 list-disc pl-5" data-testid="docx-edit-errors">{errs.map((e, i) => <li key={i}>{e}</li>)}</ul>}
                </div>
                <div className="p-3 border-t border-zinc-800 flex gap-2">
                    <button type="button" onClick={onCancel} className="flex-1 border border-zinc-600 text-zinc-300 py-2.5 text-[11px] font-black uppercase">Hủy thay đổi</button>
                    <button type="button" onClick={() => { if (errs.length) { setShowErr(true); return; } onSave(draftToFields(d)); }} className="flex-1 py-2.5 text-[11px] font-black uppercase border bg-cyan-600 border-cyan-300 text-black" data-testid="docx-edit-save">Lưu câu này</button>
                </div>
            </div>
        </div>
    );
};
export { TYPE_LABEL };
