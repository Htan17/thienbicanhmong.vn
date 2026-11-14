// Chọn câu hỏi để gắn / chuyển 1 ảnh. Hiển thị trên bản xem trước (z thấp hơn lightbox phóng to).
export const ImageAssignmentModal = ({ src, questions, currentIndex, onPick, onClose }) => (
    <div className="fixed inset-0 z-[9100] bg-black/80 flex items-center justify-center p-3" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
        <div className="w-full max-w-md max-h-[85vh] bg-zinc-900 border border-sky-700 p-3 flex flex-col gap-2" role="dialog" aria-label="Chọn câu hỏi cho ảnh">
            <p className="text-[11px] font-black text-sky-300 uppercase">Gắn ảnh vào câu nào?</p>
            {src && <img src={src} alt="" className="max-h-28 object-contain bg-black border border-zinc-700" />}
            <div className="overflow-y-auto custom-scrollbar space-y-1">
                {questions.map((q, i) => (
                    <button key={q.id} type="button" disabled={i === currentIndex} onClick={() => onPick(i)} className={`w-full text-left text-[11px] border px-2 py-1.5 ${i === currentIndex ? 'border-zinc-800 text-zinc-600' : 'border-zinc-700 text-zinc-200 hover:border-sky-500'}`}>
                        <b>Câu {i + 1}</b>{i === currentIndex ? ' (hiện tại)' : ''}: {q.q.length > 70 ? q.q.slice(0, 70) + '…' : q.q}
                    </button>
                ))}
            </div>
            <button type="button" onClick={onClose} className="text-[10px] border border-zinc-600 text-zinc-300 py-1.5 uppercase font-bold">Đóng</button>
        </div>
    </div>
);
