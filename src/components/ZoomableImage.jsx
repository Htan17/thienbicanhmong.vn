// 🆕 ẢNH THU PHÓNG / VUỐT TAY (pinch-zoom + kéo để xem rõ chữ trong ảnh sơ đồ, đồ thị...)
// Hỗ trợ: chụm 2 ngón để zoom (điện thoại), lăn chuột để zoom (máy tính), kéo để di chuyển khi
// đã phóng to, chạm/nháy đúp để reset về ban đầu, cộng thêm nút +/-/reset dự phòng cho ai không quen thao tác.
export const ZoomableImage = ({ src, onClose }) => {
    const { useState, useRef } = React;
    const [scale, setScale] = useState(1);
    const [pos, setPos] = useState({ x: 0, y: 0 });
    const [isGesturing, setIsGesturing] = useState(false);
    const gesture = useRef({ mode: null, startDist: 0, startScale: 1, startPos: { x: 0, y: 0 }, startTouch: { x: 0, y: 0 } });
    const lastTapRef = useRef(0);

    const clampScale = (s) => Math.min(5, Math.max(1, s));

    const resetZoom = () => { setScale(1); setPos({ x: 0, y: 0 }); };

    const dist = (t1, t2) => Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);

    const onTouchStart = (e) => {
        if (e.touches.length === 2) {
            setIsGesturing(true);
            gesture.current = { mode: 'pinch', startDist: dist(e.touches[0], e.touches[1]), startScale: scale, startPos: pos, startTouch: { x: 0, y: 0 } };
        } else if (e.touches.length === 1) {
            setIsGesturing(true);
            gesture.current = { mode: 'drag', startDist: 0, startScale: scale, startPos: pos, startTouch: { x: e.touches[0].clientX, y: e.touches[0].clientY } };
        }
    };
    const onTouchMove = (e) => {
        if (gesture.current.mode === 'pinch' && e.touches.length === 2) {
            e.preventDefault();
            const newDist = dist(e.touches[0], e.touches[1]);
            const newScale = clampScale(gesture.current.startScale * (newDist / (gesture.current.startDist || 1)));
            setScale(newScale);
        } else if (gesture.current.mode === 'drag' && e.touches.length === 1 && scale > 1) {
            e.preventDefault();
            const dx = e.touches[0].clientX - gesture.current.startTouch.x;
            const dy = e.touches[0].clientY - gesture.current.startTouch.y;
            setPos({ x: gesture.current.startPos.x + dx, y: gesture.current.startPos.y + dy });
        }
    };
    const onTouchEnd = (e) => {
        if (e.touches.length === 0) {
            setIsGesturing(false);
            gesture.current.mode = null;
            // Chạm đúp (2 lần trong 300ms) để reset nhanh về ban đầu
            const now = Date.now();
            if (now - lastTapRef.current < 300) resetZoom();
            lastTapRef.current = now;
            if (scale < 1.02) resetZoom();
        }
    };
    const onWheel = (e) => {
        e.preventDefault();
        setScale(s => { const ns = clampScale(s - e.deltaY * 0.0025); if (ns <= 1) setPos({ x: 0, y: 0 }); return ns; });
    };
    const onMouseDown = (e) => {
        if (scale <= 1) return;
        gesture.current = { mode: 'drag', startDist: 0, startScale: scale, startPos: pos, startTouch: { x: e.clientX, y: e.clientY } };
        setIsGesturing(true);
    };
    const onMouseMove = (e) => {
        if (gesture.current.mode !== 'drag' || !isGesturing) return;
        const dx = e.clientX - gesture.current.startTouch.x, dy = e.clientY - gesture.current.startTouch.y;
        setPos({ x: gesture.current.startPos.x + dx, y: gesture.current.startPos.y + dy });
    };
    const stopMouseDrag = () => { setIsGesturing(false); gesture.current.mode = null; };

    return (
        <div className="fixed inset-0 bg-black/95 z-[9998] flex items-center justify-center p-2 select-none" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
            <div
                className="w-full h-full flex items-center justify-center overflow-hidden touch-none"
                onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}
                onWheel={onWheel} onMouseDown={onMouseDown} onMouseMove={onMouseMove} onMouseUp={stopMouseDrag} onMouseLeave={stopMouseDrag}
            >
                <img
                    src={src} alt="Xem ảnh phóng to" draggable={false}
                    onDoubleClick={() => (scale > 1 ? resetZoom() : setScale(2.2))}
                    style={{ transform: `translate(${pos.x}px, ${pos.y}px) scale(${scale})`, transition: isGesturing ? 'none' : 'transform 0.15s ease-out', cursor: scale > 1 ? 'grab' : 'zoom-in', touchAction: 'none' }}
                    className="max-w-full max-h-full object-contain"
                />
            </div>
            <div className="absolute bottom-5 left-1/2 -translate-x-1/2 flex gap-2 bg-black/60 border border-zinc-700 rounded-full px-2 py-1.5">
                <button onClick={() => setScale(s => clampScale(s - 0.5))} className="w-9 h-9 flex items-center justify-center text-white text-lg">➖</button>
                <button onClick={resetZoom} className="px-3 h-9 flex items-center justify-center text-white text-[10px] font-black uppercase">Gốc</button>
                <button onClick={() => setScale(s => clampScale(s + 0.5))} className="w-9 h-9 flex items-center justify-center text-white text-lg">➕</button>
            </div>
            <button onClick={onClose} className="absolute top-4 right-4 w-9 h-9 flex items-center justify-center bg-black/70 border border-zinc-600 text-white text-lg">✕</button>
            <p className="absolute top-4 left-4 text-[9px] text-zinc-500 font-bold uppercase tracking-widest hidden sm:block">Chụm/lăn chuột để phóng to • Kéo để di chuyển • Nháy đúp để reset</p>
        </div>
    );
};
