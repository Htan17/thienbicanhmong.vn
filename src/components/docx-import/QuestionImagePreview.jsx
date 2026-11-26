// Hiển thị ảnh đã ghép của 1 câu + nút thao tác. Chỉ trình bày, không giữ dữ liệu.
export const QuestionImagePreview = ({ imageIds, dataOf, sizeOf, onZoom, onMove, onRemove, onPrimary }) => {
    if (!imageIds.length) return <p className="text-[10px] text-zinc-500 italic">Không có ảnh.</p>;
    return (
        <div className="flex flex-wrap gap-2">
            {imageIds.map((id, i) => (
                <div key={id} className="border border-zinc-700 bg-black/50 p-1.5 w-[132px]" data-testid="docx-img">
                    <img src={dataOf(id)} alt={id} className="w-full h-20 object-contain bg-black cursor-zoom-in" onClick={() => onZoom(dataOf(id))} />
                    <p className="text-[9px] text-zinc-400 mt-1 truncate">{i === 0 ? '★ Ảnh chính · ' : ''}{sizeOf(id)}</p>
                    <div className="flex flex-wrap gap-1 mt-1">
                        <button type="button" onClick={() => onMove(id)} className="text-[9px] border border-sky-700 text-sky-300 px-1.5 py-0.5">Chuyển câu</button>
                        {imageIds.length > 1 && i !== 0 && <button type="button" onClick={() => onPrimary(id)} className="text-[9px] border border-amber-700 text-amber-300 px-1.5 py-0.5">Đặt chính</button>}
                        <button type="button" onClick={() => onRemove(id)} className="text-[9px] border border-red-800 text-red-300 px-1.5 py-0.5">Gỡ</button>
                    </div>
                </div>
            ))}
        </div>
    );
};
