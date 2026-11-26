

export function MathKeyboard({ library }) {
    const { insertMathSymbol, setShowMathKeyboard } = library;
    return ReactDOM.createPortal(
                    <div className="fixed inset-0 z-[9990] flex items-end sm:items-center justify-center" onClick={() => setShowMathKeyboard(false)}>
                        <div className="absolute inset-0 bg-black/70"></div>
                        <div className="relative w-full sm:max-w-md bg-zinc-950 border-t-2 sm:border-2 border-cyan-600 p-4 shadow-[0_0_30px_rgba(6,182,212,0.3)] safe-bottom" onClick={e => e.stopPropagation()}>
                            <div className="flex justify-between items-center mb-3">
                                <p className="text-[10px] font-black text-cyan-400 uppercase tracking-widest">🔣 Bàn Phím Ký Hiệu Toán/Lý</p>
                                <button onClick={() => setShowMathKeyboard(false)} className="text-zinc-500 hover:text-white text-lg px-1">✕</button>
                            </div>
                            <div className="grid grid-cols-7 gap-1.5 max-h-48 overflow-y-auto custom-scrollbar">
                                {['π','ω','θ','Δ','α','β','γ','λ','μ','φ','Ω','Σ','√','∞','±','×','÷','≤','≥','≈','≠','°','→','∫','²','³','⁰','¹','ₓ','₀','₁','₂'].map(sym => (
                                    <button key={sym} onClick={() => insertMathSymbol(sym)} className="aspect-square bg-black border border-zinc-700 hover:border-cyan-500 hover:bg-cyan-950 text-white text-base font-bold rounded">{sym}</button>
                                ))}
                            </div>
                            <p className="text-[9px] text-zinc-600 italic mt-2 text-center">Bấm vào 1 ô nhập trước, rồi chọn ký hiệu để chèn vào đúng vị trí con trỏ.</p>
                        </div>
                    </div>, document.body
                );
}
