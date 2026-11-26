// Danh sách ảnh CHƯA gắn câu nào (không tự đoán). Người dùng chọn câu cho từng ảnh.
export const UnresolvedImagesPanel = ({ items, dataOf, sizeOf, byId, onZoom, onAssign }) => {
    if (!items.length) return null;
    return (
        <div className="border border-orange-600/60 bg-orange-950/20 p-3 space-y-2" data-testid="docx-unresolved">
            <p className="text-[11px] font-black text-orange-300 uppercase">Ảnh chưa gắn ({items.length})</p>
            <p className="text-[10px] text-orange-200/80">Các ảnh này chưa được gắn với câu hỏi. Nếu không gán, chúng sẽ KHÔNG được lưu.</p>
            <div className="flex flex-wrap gap-2">
                {items.map(u => {
                    const im = byId[u.id]; const ok = im && im.readable;
                    return (
                        <div key={u.id} className="border border-zinc-700 bg-black/50 p-1.5 w-[148px]">
                            {ok ? <img src={dataOf(u.id)} alt={u.id} className="w-full h-20 object-contain bg-black cursor-zoom-in" onClick={() => onZoom(dataOf(u.id))} />
                                : <div className="w-full h-20 flex items-center justify-center text-[9px] text-red-300 bg-black text-center px-1">Không đọc được ảnh</div>}
                            <p className="text-[9px] text-zinc-400 mt-1 leading-snug">{u.reason}{ok ? ` · ${sizeOf(u.id)}` : ''}</p>
                            {ok && <button type="button" onClick={() => onAssign(u.id)} className="mt-1 text-[9px] border border-sky-700 text-sky-300 px-1.5 py-0.5">Gán vào câu…</button>}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
