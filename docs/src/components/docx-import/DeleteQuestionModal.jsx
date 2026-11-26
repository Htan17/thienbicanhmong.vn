// GIAI ĐOẠN 1 – Xác nhận xóa câu khỏi BẢN XEM TRƯỚC (không xóa DOCX nguồn, không chạm Firestore).
// Câu có ảnh: hỏi rõ phải làm gì với ảnh (về "Ảnh chưa gắn" / bỏ khỏi phiên import / hủy).
export const DeleteQuestionModal = ({ question, index, onDelete, onCancel }) => {
    const n = question.imageIds.length;
    const btn = 'w-full py-2.5 text-[11px] font-black uppercase border';
    return (
        <div className="fixed inset-0 z-[9100] bg-black/90 flex items-center justify-center p-3" data-testid="docx-delete-modal">
            <div className="w-full max-w-sm bg-zinc-950 border border-red-700/70 p-3 space-y-2">
                <p className="text-[12px] font-black text-red-300 uppercase">Xóa câu {index + 1}?</p>
                <p className="text-[11px] text-zinc-300 break-words">{question.q}</p>
                <p className="text-[10px] text-zinc-500">Chỉ xóa khỏi bản xem trước. File DOCX gốc và dữ liệu đã lưu không bị ảnh hưởng.</p>
                {n > 0 ? (<>
                    <p className="text-[10px] text-amber-300">Câu này đang có {n} ảnh. Xử lý ảnh thế nào?</p>
                    <button type="button" onClick={() => onDelete('unassign')} className={`${btn} border-sky-600 text-sky-300`} data-testid="docx-del-unassign">Xóa câu, chuyển ảnh về "Ảnh chưa gắn"</button>
                    <button type="button" onClick={() => onDelete('drop')} className={`${btn} border-red-700 text-red-300`} data-testid="docx-del-drop">Xóa câu và xóa ảnh khỏi phiên import</button>
                </>) : (
                    <button type="button" onClick={() => onDelete('unassign')} className={`${btn} border-red-700 text-red-300`} data-testid="docx-del-ok">Xóa câu</button>
                )}
                <button type="button" onClick={onCancel} className={`${btn} border-zinc-600 text-zinc-300`}>Hủy</button>
            </div>
        </div>
    );
};
